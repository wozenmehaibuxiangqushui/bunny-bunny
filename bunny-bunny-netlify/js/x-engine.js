import { sendToModel } from './integrations/ai-client.js';
import { compileWorldbook } from './apps/prompt-library.js';
import { accountFriends, friendWorldGroup } from './account-system.js';
import { ensureX, xActor, xCreateNetworkNpc, xDmSend, xPost, xToggle } from './x-model.js';
import { knownWorldEvents } from './world-engine.js';
import { currentSchedule } from './schedule-engine.js';

const refreshRunning=new Set(),interactionRunning=new Set(),dmRunning=new Set();
const trim=(value,length)=>String(value||'').trim().slice(0,length);
const integer=(value,min,max,fallback)=>Math.max(min,Math.min(max,Number.isFinite(Number(value))?Number(value):fallback));
const parseJson=raw=>{const match=String(raw||'').match(/\{[\s\S]*\}/);if(!match)throw Error('X 生成结果不是 JSON');try{return JSON.parse(match[0])}catch{throw Error('X 生成结果无法解析，请重试')}};
export function resolveXModel(state) {
  const settings=ensureX(state).settings;
  const profile=settings.modelMode==='dedicated'?settings.api:state.modelProfiles.find(row=>row.id===state.activeModelProfileId);
  if(!profile?.apiKey||!profile?.model)throw Error(settings.modelMode==='dedicated'?'请在 X 设置里配置专用 API':'请先在“模型与 API”中配置主 API');
  return profile;
}
function xWorldContext(store,groupId) {
  const state=store.getState(),x=ensureX(state),group=state.chatGroups.find(row=>row.id===groupId),
    worldId=group?.worldId||state.currentWorldId,settings=x.settings;
  const book=state.worldbooks.find(row=>row.id===settings.worldbookId);
  const events=(state.worldLog||[]).filter(row=>row.worldId===worldId&&row.payload?.public).slice(-8)
    .map(row=>row.payload?.summary||row.payload?.text).filter(Boolean);
  const actors=state.people.filter(person=>['char','npc'].includes(person.type)&&friendWorldGroup(state,person.id)===groupId)
    .map(person=>{const profile=x.profiles[person.id],schedule=currentSchedule(store,person.id);
      return {id:person.id,name:profile.name,handle:profile.handle,occupation:profile.occupation,
        persona:trim(person.persona||person.personality||person.note,420),bio:profile.bio,signature:profile.signature,
        fameTier:profile.fameTier,verified:profile.verified,canPost:schedule?.canReply!==false,
        knownEvents:knownWorldEvents(state,person.id,worldId,4).map(row=>row.payload?.summary||row.payload?.text).filter(Boolean)}});
  const network=Object.values(x.profiles).filter(row=>row.kind==='network-npc'&&row.groupId===groupId)
    .slice(-12).map(row=>({id:row.id,name:row.name,handle:row.handle,bio:row.bio,occupation:row.occupation,
      persona:row.interests,fameTier:row.fameTier,verified:row.verified,canPost:true}));
  const recent=x.posts.filter(row=>row.groupId===groupId&&!row.deleted).slice(-24)
    .map(row=>({id:row.id,authorId:row.authorId,text:trim(row.text,260),parentId:row.parentId}));
  return {group:{id:groupId,name:group?.name||'平行世界',description:trim(group?.description,2400)},
    worldIntro:trim(settings.worldIntro,3200),worldbook:book?compileWorldbook(book,recent.map(row=>row.text).join(' ')):'',
    customRules:trim(settings.rules,3200),extensionRules:trim(settings.extensionRules,1600),
    events,actors:[...actors,...network],recent};
}
function batchPrompt(countPosts,countComments) {
  return [
    '你在虚构的 X 社交平台为当前世界写一批真实手机上会刷到的内容。公共发帖只使用提供的世界设定和说话者知道的事实。',
    '严格输出 '+countPosts+' 条主贴和 '+countComments+' 条评论，可增加 0—2 个虚构网友账号。不要为 USER 发言。',
    '作者可以是 actors 中 canPost=true 的 id；新网友用 new:1 或 new:2。每条主贴 key 唯一，例如 p1；评论的 postKey 指向本批主贴 key 或 recent 中公开贴文 id。',
    '一个人可以不发，话题可以擦肩而过。混合日常、小困扰、见闻、梗、争论与兴趣圈层；允许短句、错字、口头禅和没说完的话。不要让每个人都讲道理或轮流报到。',
    '名气与认证影响内容被看见的程度，不意味着所有角色相互认识。网友可以误会、不同意，但不能凭空知道私聊、心声或隐藏真实身份。',
    '评论要接住原帖的具体词或画面，不写“说得太好了”“哈哈哈”这类空话；每条 5—90 字。主贴 12—220 字，部分帖子可带 #话题。',
    'shares 可选 0—1 条，只有和 USER 已有私聊且确实想分享的 CHAR/NPC 才能给 USER 分享本批贴文；note 是自然私聊，不要复述整帖。',
    '只返回 JSON：{"newAccounts":[{"key":"new:1","name":"网名","handle":"latin_handle","bio":"一句简介","occupation":"职业","interests":"兴趣"}],"posts":[{"key":"p1","authorId":"允许的 id 或 new:1","text":"正文"}],"comments":[{"postKey":"p1","authorId":"允许的 id 或 new:1","text":"评论"}],"shares":[{"postKey":"p1","senderId":"CHAR 或 NPC id","note":"一句私聊"}]}。'
  ].join('\n');
}
export async function refreshXFeed(store,{manual=true,groupId}={}) {
  const state=store.getState(),x=ensureX(state);groupId ||= x.groupId;
  if(refreshRunning.has(groupId))throw Error('这一页正在刷新，请稍等');
  const model=resolveXModel(state),settings=x.settings,postsWanted=integer(settings.batchPosts,1,8,5),
    commentsWanted=integer(settings.batchComments,0,20,9),context=xWorldContext(store,groupId);
  if(!context.actors.some(actor=>actor.canPost)&&!x.avatarPool.length)throw Error('当前世界还没有可发帖的角色');
  refreshRunning.add(groupId);
  try {
    const raw=await sendToModel(model,[{role:'user',text:JSON.stringify({counts:{posts:postsWanted,comments:commentsWanted},context})}],batchPrompt(postsWanted,commentsWanted));
    const data=parseJson(raw),postRows=Array.isArray(data.posts)?data.posts.slice(0,postsWanted):[],
      commentRows=Array.isArray(data.comments)?data.comments.slice(0,commentsWanted):[];
    if(!postRows.length)throw Error('模型没有返回可用贴文，请重试');
    const allowed=new Set(context.actors.filter(row=>row.canPost).map(row=>row.id)),newAccounts=(Array.isArray(data.newAccounts)?data.newAccounts:[]).slice(0,2);
    const validNew=newAccounts.filter(row=>/^new:[12]$/.test(row?.key)&&trim(row.name,32)&&trim(row.handle,24));
    for(const row of validNew)allowed.add(row.key);
    const validPosts=postRows.filter(row=>allowed.has(row?.authorId)&&trim(row.text,220).length>=4);
    if(!validPosts.length)throw Error('模型返回的发帖人不属于当前世界');
    let result;
    store.update(s=>{
      const target=ensureX(s),authorMap=new Map(),postMap=new Map(),created=[],comments=[];
      for(const row of validNew)authorMap.set(row.key,xCreateNetworkNpc(s,row,groupId).id);
      for(const row of validPosts){
        const authorId=authorMap.get(row.authorId)||row.authorId;
        if(!xActor(s,authorId,groupId))continue;
        const duplicate=target.posts.some(old=>old.groupId===groupId&&old.authorId===authorId&&old.text===trim(row.text,220));
        if(duplicate)continue;
        const post=xPost(s,{authorId,text:trim(row.text,220),groupId});created.push(post);
        if(row.key)postMap.set(row.key,post.id);
      }
      for(const row of commentRows){
        const authorId=authorMap.get(row?.authorId)||row?.authorId,postId=postMap.get(row?.postKey)||row?.postKey;
        const parent=target.posts.find(post=>post.id===postId&&post.groupId===groupId&&!post.deleted);
        if(!parent||!xActor(s,authorId,groupId)||!trim(row.text,90)||authorId===parent.authorId)continue;
        comments.push(xPost(s,{authorId,text:trim(row.text,90),parentId:postId,groupId}));
      }
      let shares=0;const friends=new Set(accountFriends(s,s.activeUserAccountId));
      for(const row of (Array.isArray(data.shares)?data.shares:[]).slice(0,1)){
        const postId=postMap.get(row?.postKey),sender=s.people.find(person=>person.id===row?.senderId),
          conversation=s.conversations.find(item=>item.personId===sender?.id&&item.userAccountId===s.activeUserAccountId),
          lastShared=target.shareHistory?.[sender?.id]||0;
        if(!postId||!sender||!conversation||sender.type==='npc'&&!friends.has(sender.id)||Date.now()-lastShared<4*3600_000)continue;
        const text=trim(row.note,130);if(!text)continue;
        const message={id:crypto.randomUUID(),role:'char',type:'text',text,sourceXPostId:postId,createdAt:Date.now(),
          time:new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false})};
        (s.messages[conversation.id]||=[]).push(message);conversation.preview=text;conversation.time=message.time;
        conversation.unread=(conversation.unread||0)+1;(target.shareHistory||={})[sender.id]=Date.now();shares++;
      }
      target.settings.lastRefreshAt[groupId]=Date.now();
      target.settings.lastActivityCount[groupId]=target.posts.filter(row=>row.groupId===groupId&&row.authorId===s.activeUserAccountId).length;
      target.generationHistory.push({id:crypto.randomUUID(),groupId,createdAt:Date.now(),manual,
        requested:{posts:postsWanted,comments:commentsWanted},created:{posts:created.length,comments:comments.length,shares}});
      target.generationHistory=target.generationHistory.slice(-80);
      result={posts:created.length,comments:comments.length,shares};
    });
    return result;
  } finally {refreshRunning.delete(groupId)}
}
export async function generateXPostInteractions(store,postId) {
  const state=store.getState(),x=ensureX(state),post=x.posts.find(row=>row.id===postId);
  if(!post||post.authorId!==state.activeUserAccountId||interactionRunning.has(postId)||!x.settings.respondToUserPosts)return [];
  const model=resolveXModel(state),context=xWorldContext(store,post.groupId);
  const actors=context.actors.filter(row=>row.canPost&&row.id!==post.authorId).slice(0,12);
  if(!actors.length)return [];interactionRunning.add(postId);
  try {
    const system='你是虚构 X 上看见 USER 新贴文的其他账号。最多两条评论，允许 0 条；只从 actors 选 authorId。评论必须接具体内容，角色不必讨好 USER，不知道私聊和未公开身份。只返回 JSON：{"comments":[{"authorId":"id","text":"5—90 字评论"}],"likes":["可能点赞的 id"]}。';
    const data=parseJson(await sendToModel(model,[{role:'user',text:JSON.stringify({post:{id:post.id,text:post.text},actors,world:context.group,worldIntro:context.worldIntro})}],system));
    const comments=[];store.update(s=>{for(const row of (Array.isArray(data.comments)?data.comments:[]).slice(0,2)){
      if(!actors.some(actor=>actor.id===row?.authorId)||!trim(row.text,90))continue;
      comments.push(xPost(s,{authorId:row.authorId,text:trim(row.text,90),parentId:postId,groupId:post.groupId}))}
      for(const id of (Array.isArray(data.likes)?data.likes:[]).slice(0,3))if(actors.some(actor=>actor.id===id))xToggle(s,postId,'likes',id)});
    return comments;
  } finally {interactionRunning.delete(postId)}
}
export async function generateXDMReply(store,peerId) {
  const state=store.getState(),x=ensureX(state),accountId=state.activeUserAccountId,groupId=x.groupId,key=accountId+':'+peerId;
  if(dmRunning.has(key))return null;
  const profile=x.profiles[peerId];if(!profile||profile.kind==='user'||!xActor(state,peerId,x.groupId))return null;
  const model=resolveXModel(state),person=state.people.find(row=>row.id===peerId);
  dmRunning.add(key);
  try {
    const history=x.dm.filter(row=>row.groupId===x.groupId&&
      (row.from===peerId&&row.to===state.activeUserAccountId||row.to===peerId&&row.from===state.activeUserAccountId)).slice(-12);
    const prompt=[
      '你是虚构 X 账号 @'+profile.handle+'，名字 '+profile.name+'。职业和简介：'+[profile.occupation,profile.bio,person?.persona||person?.personality].filter(Boolean).join('；'),
      '写一条给 USER 的私信回复，10—140 字。接住对方上一条的具体内容；可以短、犹豫、开玩笑或不完全同意。',
      '公开网络身份与真实身份只有 identityPublic=true 时才可自然提起；不使用未披露的小号关联、私聊外的隐藏心声或别人的私人记忆。',
      '只返回 JSON：{"text":"私信正文"}。'
    ].join('\n');
    const data=parseJson(await sendToModel(model,[{role:'user',text:JSON.stringify({history,identityPublic:profile.identityPublic,
      sourcePost:x.posts.find(row=>row.id===history.at(-1)?.sourcePostId)?.text||''})}],prompt));
    const text=trim(data.text,240);if(!text)throw Error('对方暂时没有回复');
    let row;store.update(s=>{if(s.activeUserAccountId!==accountId||ensureX(s).groupId!==groupId)return;
      row=xDmSend(s,{from:peerId,to:accountId,text})});return row;
  } finally {dmRunning.delete(key)}
}
export function xAutoDue(state,trigger='interval',now=Date.now()) {
  const x=ensureX(state),settings=x.settings,groupId=x.groupId,last=Number(settings.lastRefreshAt[groupId]||0);
  if(settings.autoMode==='off'||now-last<10*60_000)return false;
  if(trigger==='open')return settings.autoMode==='on-open';
  if(settings.autoMode==='interval')return now-last>=integer(settings.autoMinutes,15,1440,180)*60_000;
  if(settings.autoMode==='activity')return x.posts.filter(row=>row.groupId===groupId&&row.authorId===state.activeUserAccountId).length-
    Number(settings.lastActivityCount[groupId]||0)>=integer(settings.activityThreshold,1,20,4);
  return false;
}
export function setupXAutomation({store}) {
  const check=()=>{if(document.hidden||!xAutoDue(store.getState()))return;
    void refreshXFeed(store,{manual:false}).catch(error=>console.warn('Bunny X 自动刷新暂缓',error))};
  setInterval(check,60_000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
}
