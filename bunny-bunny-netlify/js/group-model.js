import { sendToModel } from './integrations/ai-client.js';
import { accountFriends, accountContext } from './account-system.js';
import { addMemoryEntry } from './memory-engine.js';
import { appendWorldEvent, availableGroupSpeakers, changeRelationship, ensureWorldEngine, entityWorld, knownWorldEvents, relationEdge } from './world-engine.js';
import { currentSchedule } from './schedule-engine.js';

export function createGroupThread(store,{name,memberIds,accountId,worldId}) {
  const state=ensureWorldEngine(store.getState()); accountId ||= state.currentUserId;
  const actors=[...new Set(memberIds)].filter(id=>id!==accountId);
  if(actors.length<2)throw Error('至少选择两位同世界的角色');
  if(actors.some(id=>!state.people.some(row=>row.id===id&&['char','npc'].includes(row.type))))throw Error('群成员必须是有效的 CHAR 或 NPC');
  worldId ||= entityWorld(state,actors[0]);
  if(actors.some(id=>entityWorld(state,id)!==worldId))throw Error('群成员必须属于同一个世界');
  const id=crypto.randomUUID(),thread={id,name:String(name||'新的群聊').trim().slice(0,28),worldId,accountId,memberIds:[accountId,...actors],nicknames:{},announcement:'',muted:false,createdAt:Date.now(),lastActivityAt:Date.now(),unread:0};
  store.update(s=>{ensureWorldEngine(s);s.groupThreads.push(thread);s.groupMessages[id]=[]});
  appendWorldEvent(store,{id:`group-created:${id}`,worldId,actorIds:thread.memberIds,witnessIds:thread.memberIds,kind:'group-created',payload:{threadId:id,public:false,name:thread.name}});
  return thread;
}

export function postGroupMessage(store,threadId,{speakerId,text,type='text',amount=0,sourceId='',messageId=''}) {
  const state=ensureWorldEngine(store.getState()),thread=state.groupThreads.find(row=>row.id===threadId);
  if(!thread||!thread.memberIds.includes(speakerId)||thread.accountId!==state.currentUserId||(speakerId!==thread.accountId&&thread.mutedMemberIds?.includes(speakerId)))return null;
  const content=String(text||'').trim().slice(0,1200);if(!content)return null;
  if(messageId && state.groupMessages[threadId]?.some(row=>row.id===messageId))return state.groupMessages[threadId].find(row=>row.id===messageId);
  const message={id:messageId||crypto.randomUUID(),speakerId,text:content,type,amount,sourceId,createdAt:Date.now(),status:'sent'};
  store.update(s=>{s.groupMessages[threadId].push(message);const item=s.groupThreads.find(row=>row.id===threadId);item.lastActivityAt=message.createdAt;if(speakerId!==item.accountId){item.unread++;item.archived=false}});
  const event=appendWorldEvent(store,{id:`group-message:${message.id}`,worldId:thread.worldId,actorIds:[speakerId],witnessIds:thread.memberIds,kind:'group-message',payload:{threadId,text:content,type,public:false},source:'group-chat'});
  const speaker=state.people.find(row=>row.id===speakerId);for(const id of thread.memberIds.filter(id=>id!==thread.accountId)){const ownerId=accountContext(state,id,thread.accountId).memoryOwnerId;void addMemoryEntry(ownerId,{kind:'episodic',category:'daily_event',layer:content.includes(`@${state.people.find(row=>row.id===id)?.name}`)?'retrieval':'temporary',text:`${thread.name} 群里，${speaker?.name||'成员'}说：${content.slice(0,180)}`,importance:2,confidence:1,visibility:'group',sourceIds:[message.id],worldId:thread.worldId,accountId:thread.accountId,source:'group-chat',eventId:event.id}).catch(()=>{})}
  if(speakerId===thread.accountId)for(const id of thread.memberIds.filter(id=>id!==speakerId))changeRelationship(store,{a:speakerId,b:id,worldId:thread.worldId,deltaAffinity:1,reasonEventId:event.id});
  return message;
}

function parseGroupReply(raw,allowed) {
  const match=String(raw||'').match(/\{[\s\S]*\}/);if(!match)return [];
  try {const data=JSON.parse(match[0]);if(!Array.isArray(data.messages))return [];
    return data.messages.slice(0,6).filter(row=>allowed.has(row?.speakerId)&&typeof row.text==='string').map(row=>({speakerId:row.speakerId,text:row.text.trim().slice(0,260)})).filter(row=>row.text);
  } catch {return []}
}

export async function generateGroupReplies(store,threadId) {
  const state=ensureWorldEngine(store.getState()),thread=state.groupThreads.find(row=>row.id===threadId),model=state.modelProfiles.find(row=>row.id===state.activeModelProfileId);
  if(!thread||!model?.apiKey||!model?.model)return [];
  const lastText=(state.groupMessages[threadId]||[]).at(-1)?.text||'',available=availableGroupSpeakers(store,thread).filter(row=>!thread.mutedMemberIds?.includes(row.id)).sort((a,b)=>Number(lastText.includes(`@${b.name}`))-Number(lastText.includes(`@${a.name}`))).slice(0,4),allowed=new Set(available.map(row=>row.id));if(!allowed.size)return [];
  const recent=(state.groupMessages[threadId]||[]).slice(-16),people=available.map(row=>({id:row.id,name:row.name,persona:row.persona||row.personality||row.note||'',relation:relationEdge(state,thread.accountId,row.id,thread.worldId).label}));
  const publicFacts=knownWorldEvents(state,thread.accountId,thread.worldId,8).filter(row=>row.witnessIds.every(id=>thread.memberIds.includes(id))||row.payload.public).map(row=>row.payload.summary||row.payload.text).filter(Boolean);
  const context={group:{name:thread.name,announcement:thread.announcement},speakers:people,recent:recent.map(row=>({speaker:state.people.find(person=>person.id===row.speakerId)?.name,text:row.text})),knownFacts:publicFacts};
  const system='写一段真实手机群聊的后续。允许说话的人只来自 speakers，speakerId 必须严格匹配。角色可以接别人的话、短暂插嘴、只发一个表情，也可以不说；不要轮流报到，不要替 USER 发言，不要突然换话题。每句 2—60 字，语言习惯依人设，保留微妙关系与上条消息的具体细节。不能让没在场的人知道群内私事，不能编造已经发生的重大事件。只返回 JSON：{"messages":[{"speakerId":"允许的 ID","text":"一条消息"}]}，0—6 条。';
  const rows=parseGroupReply(await sendToModel(model,[{role:'user',text:JSON.stringify(context)}],system),allowed),created=[];
  for(const row of rows){await new Promise(resolve=>setTimeout(resolve,420+Math.min(1400,row.text.length*24)));const current=store.getState().groupThreads.find(item=>item.id===threadId);if(!current?.memberIds.includes(row.speakerId)||currentSchedule(store,row.speakerId)?.canReply===false)continue;const message=postGroupMessage(store,threadId,row);if(message)created.push(message)}
  if(created.length)queueGroupFollowup(store,thread,created.at(-1));
  return created;
}

export function queueGroupFollowup(store,thread,source) {
  const state=store.getState(),friends=new Set(accountFriends(state,thread.accountId));
  const eligible=thread.memberIds.filter(id=>id!==thread.accountId&&friends.has(id)&&state.conversations.some(c=>c.personId===id&&c.userAccountId===thread.accountId)&&currentSchedule(store,id)?.canReply!==false);
  if(!eligible.length||!source||source.speakerId===thread.accountId)return null;
  const existing=(state.deliveryJobs||[]).some(job=>job.kind==='group-followup'&&job.threadId===thread.id&&job.status==='pending'&&Date.now()-job.createdAt<60*60_000);
  if(existing)return null;
  const senderId=eligible.includes(source.speakerId)?source.speakerId:eligible[0],id=`followup:${thread.id}:${source.id}`,delay=3+(source.text.length%16);
  const job={id,kind:'group-followup',status:'pending',threadId:thread.id,senderId,accountId:thread.accountId,sourceMessageId:source.id,createdAt:Date.now(),dueAt:Date.now()+delay*60_000};
  store.update(s=>{ensureWorldEngine(s);if(!s.deliveryJobs.some(row=>row.id===id))s.deliveryJobs.push(job)});
  return job;
}

let processing=false;
export async function deliverWorldJobs(store,now=Date.now()) {
  if(processing)return;processing=true;
  try {const state=ensureWorldEngine(store.getState()),model=state.modelProfiles.find(row=>row.id===state.activeModelProfileId);if(!model?.apiKey||!model?.model)return;
    for(const job of state.deliveryJobs.filter(row=>row.status==='pending'&&row.dueAt<=now).slice(0,4)){
      const current=store.getState(),thread=current.groupThreads.find(row=>row.id===job.threadId),sender=current.people.find(row=>row.id===job.senderId),conv=current.conversations.find(row=>row.personId===job.senderId&&row.userAccountId===job.accountId),source=current.groupMessages[job.threadId]?.find(row=>row.id===job.sourceMessageId);
      if(!thread||!sender||!conv||!source||!thread.memberIds.includes(sender.id)||!accountFriends(current,job.accountId).includes(sender.id)) {store.update(s=>{const row=s.deliveryJobs.find(x=>x.id===job.id);if(row)row.status='cancelled'});continue}
      if(currentSchedule(store,sender.id,new Date(now))?.canReply===false)continue;
      try {const recent=(current.groupMessages[thread.id]||[]).slice(-8).map(row=>({speaker:current.people.find(p=>p.id===row.speakerId)?.name,text:row.text}));
        const system=`你是 ${sender.name}。人物设定：${sender.persona||sender.personality||sender.note||''}。你刚从「${thread.name}」群聊出来，私下给 USER 发一条自然短消息。必须接住刚才群里的具体话，不要重复群消息，不要突然告白或像客服追问；可以解释、打趣、提醒或分享一点私下看法。只输出消息正文，最多 80 字。`;
        const raw=String(await sendToModel(model,[{role:'user',text:JSON.stringify({recent,source:source.text})}],system)).trim().replace(/^['"“]|['"”]$/g,'').slice(0,160);
        if(!raw)throw Error('empty followup');
        store.update(s=>{const target=s.deliveryJobs.find(row=>row.id===job.id);if(!target||target.status!=='pending'||s.messages[conv.id]?.some(row=>row.deliveryJobId===job.id))return;const id=crypto.randomUUID(),at=Date.now();(s.messages[conv.id]||=[]).push({id,deliveryJobId:job.id,sourceGroupId:thread.id,role:'char',type:'text',text:raw,createdAt:at,time:new Date(at).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false})});const c=s.conversations.find(row=>row.id===conv.id);c.preview=raw;c.time=new Date(at).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false});c.unread=(c.unread||0)+1;c.hiddenFromList=false;target.status='delivered';target.deliveredAt=at});
      }catch(error){store.update(s=>{const row=s.deliveryJobs.find(x=>x.id===job.id);if(row){row.attempts=(row.attempts||0)+1;row.dueAt=Date.now()+Math.min(60,row.attempts*5)*60_000}})}
    }
  } finally {processing=false}
}
