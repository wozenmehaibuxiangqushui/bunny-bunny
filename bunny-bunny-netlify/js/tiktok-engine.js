import { sendToModel } from './integrations/ai-client.js';
import { compileWorldbook } from './apps/prompt-library.js';
import { accountFriends, friendWorldGroup } from './account-system.js';
import { currentSchedule } from './schedule-engine.js';
import { knownWorldEvents } from './world-engine.js';
import { ensureTikTok,tikActor,tikVisible,tikPost,tikComment,tikCreateNpc,tikToggle,tikDm,tikLiveMessage } from './tiktok-model.js';

const running=new Set();
const cut=(value,max)=>String(value??'').trim().slice(0,max);
const count=(value,min,max,fallback)=>Math.max(min,Math.min(max,Number.isFinite(Number(value))?Number(value):fallback));
function parse(raw){
  const match=String(raw||'').match(/\{[\s\S]*\}/);
  if(!match)throw Error('模型未返回 JSON，请重试');
  try{return JSON.parse(match[0])}catch{throw Error('模型返回内容无法解析，请重试')}
}
export function tikModel(state){
  const setting=ensureTikTok(state).settings,profile=setting.modelMode==='dedicated'?setting.api:
    state.modelProfiles.find(row=>row.id===state.activeModelProfileId);
  if(!profile?.apiKey||!profile?.model)throw Error(setting.modelMode==='dedicated'?
    '请在 TikTok 设置中配置专用 API':'请先在“模型与 API”设置主 API');
  return profile;
}
function context(store,groupId){
  const state=store.getState(),t=ensureTikTok(state),setting=t.settings,group=state.chatGroups.find(g=>g.id===groupId),
    worldId=group?.worldId||state.currentWorldId;
  const actors=state.people.filter(p=>['char','npc'].includes(p.type)&&friendWorldGroup(state,p.id)===groupId)
    .map(person=>{const profile=t.profiles[person.id],schedule=currentSchedule(store,person.id);
      return {id:person.id,name:profile.name,handle:profile.handle,bio:profile.bio,
        persona:cut(person.persona||person.personality||person.note,300),
        fameTier:profile.fameTier,verified:profile.verified,canPost:schedule?.canReply!==false,
        knownEvents:knownWorldEvents(state,person.id,worldId,3)
          .map(row=>row.payload?.summary||row.payload?.text).filter(Boolean)}});
  const network=Object.values(t.profiles).filter(p=>p.kind==='network-npc'&&p.groupId===groupId).slice(-12)
    .map(p=>({id:p.id,name:p.name,handle:p.handle,bio:p.bio,fameTier:p.fameTier,canPost:true}));
  const library=t.mediaLibrary.filter(a=>!a.deleted&&(!a.groupId||a.groupId===groupId)).slice(-18)
    .map(a=>({id:a.id,kind:a.kind,name:a.name,note:a.note||''}));
  const recent=t.posts.filter(p=>p.groupId===groupId&&!p.deleted&&p.visibility==='public').slice(-18)
    .map(p=>({id:p.id,authorId:p.authorId,title:p.title,caption:cut(p.caption,160),kind:p.kind}));
  const book=state.worldbooks.find(b=>b.id===setting.worldbookId);
  return {group:{id:groupId,name:group?.name,description:cut(group?.description,900)},
    worldIntro:cut(setting.worldIntro,2200),worldbook:book?compileWorldbook(book,recent.map(p=>p.caption).join(' ')):'',
    customRules:cut(setting.rules,2400),actors:[...actors,...network],library,recent};
}
function batchPrompt(posts,comments){
  return [
    '你在虚构 TikTok 短视频社区里为当前世界写一批自然的内容。只写角色知道的公共事实，USER 的行动和台词由 USER 自己决定。',
    `严格生成 ${posts} 条作品和 ${comments} 条评论。作品可以是用户素材视频/照片，也可以是明确标注的图文卡；没有素材时不能假装有真实视频画面。`,
    '每条作品有短标题、具体画面或卡片文字、随手写的 caption、一个音频名。语气允许停顿、吐槽、错字、松弛感；别轮流写同一种鸡汤。',
    '可新建 0—2 个网友。作者必须来自 actors 且 canPost=true，或本次 newCreators 的 new:1/new:2。',
    'assetId 只能从 library 中选，选视频填 kind=video，照片填 kind=photo；没选素材则 kind=story、assetId 为空。绝不编造本地素材 ID。',
    '评论必须接住视频标题、字幕或具体细节；有不同意见和普通路人，别清一色夸赞。评论可指向本批作品 key 或 recent 公开作品 id。',
    'shares 可选 0—1 条，只有确实想分享给 USER 的 CHAR/NPC 才写；note 像熟人私聊，别复述整条作品。',
    '不透露私聊、心声、未公开身份或别的世界的事。只返回 JSON：',
    '{"newCreators":[{"key":"new:1","name":"网名","handle":"latin","bio":"简介","occupation":"身份"}],',
    '"posts":[{"key":"p1","authorId":"允许的 id","kind":"story","assetId":"","title":"短标题","body":"图文卡内容","caption":"文案 #话题","sound":"原声","coverColor":"#334455"}],',
    '"comments":[{"postKey":"p1","authorId":"允许的 id","text":"具体评论"}],',
    '"shares":[{"postKey":"p1","senderId":"CHAR/NPC id","note":"一句私聊"}]}'
  ].join('\n');
}
export async function refreshTikTok(store,{manual=true,groupId}={}){
  const state=store.getState(),t=ensureTikTok(state);groupId ||= t.groupId;
  if(running.has('refresh:'+groupId))throw Error('正在刷新，请稍等');
  const model=tikModel(state),setting=t.settings,postsWanted=count(setting.batchPosts,1,8,4),
    commentsWanted=count(setting.batchComments,0,24,8),ctx=context(store,groupId);
  if(!ctx.actors.some(a=>a.canPost))throw Error('当前世界还没有可发作品的角色');
  running.add('refresh:'+groupId);
  try{
    const answer=parse(await sendToModel(model,[{role:'user',text:JSON.stringify({
      counts:{posts:postsWanted,comments:commentsWanted},context:ctx})}],batchPrompt(postsWanted,commentsWanted)));
    const newcomers=(Array.isArray(answer.newCreators)?answer.newCreators:[]).slice(0,2)
      .filter(row=>/^new:[12]$/.test(row?.key)&&cut(row.name,36)&&cut(row.handle,24));
    const allowed=new Set(ctx.actors.filter(a=>a.canPost).map(a=>a.id));for(const row of newcomers)allowed.add(row.key);
    const candidates=(Array.isArray(answer.posts)?answer.posts:[]).slice(0,postsWanted)
      .filter(row=>allowed.has(row?.authorId)&&cut(row?.title,100)&&cut(row?.caption,2200));
    if(!candidates.length)throw Error('模型没有生成当前世界可用的作品');
    let result;
    store.update(s=>{
      const db=ensureTikTok(s),authors=new Map(),postIds=new Map(),created=[],replies=[];
      for(const row of newcomers)authors.set(row.key,tikCreateNpc(s,row,groupId).id);
      for(const row of candidates){
        const authorId=authors.get(row.authorId)||row.authorId;
        if(!tikActor(s,authorId,groupId))continue;
        const asset=db.mediaLibrary.find(a=>a.id===row.assetId&&!a.deleted&&(!a.groupId||a.groupId===groupId)),media=asset?
          {kind:asset.kind,mediaId:asset.mediaId||'',url:asset.url||'',name:asset.name}:null;
        const kind=media?.kind||'story',title=cut(row.title,100),caption=cut(row.caption,2200);
        if(db.posts.some(p=>p.groupId===groupId&&p.authorId===authorId&&p.title===title&&p.caption===caption))continue;
        const post=tikPost(s,{authorId,groupId,kind,media,title,body:cut(row.body,420),
          caption,sound:cut(row.sound,80),coverColor:row.coverColor,source:'model'});
        created.push(post);if(row.key)postIds.set(row.key,post.id);
      }
      for(const row of (Array.isArray(answer.comments)?answer.comments:[]).slice(0,commentsWanted)){
        const postId=postIds.get(row?.postKey)||row?.postKey,post=db.posts.find(p=>p.id===postId&&p.groupId===groupId);
        const authorId=authors.get(row?.authorId)||row?.authorId;
        if(!post||!tikActor(s,authorId,groupId)||authorId===post.authorId||!cut(row.text,180))continue;
        replies.push(tikComment(s,{postId,authorId,text:cut(row.text,180)}));
      }
      let shares=0;const friends=new Set(accountFriends(s,s.activeUserAccountId));
      for(const row of (Array.isArray(answer.shares)?answer.shares:[]).slice(0,1)){
        const postId=postIds.get(row?.postKey),sender=s.people.find(p=>p.id===row?.senderId);
        const conv=s.conversations.find(c=>c.personId===sender?.id&&c.userAccountId===s.activeUserAccountId);
        if(!postId||!sender||!conv||sender.type==='npc'&&!friends.has(sender.id)||
          Date.now()-(db.shareHistory[sender.id]||0)<4*3600_000)continue;
        const note=cut(row.note,140);if(!note)continue;
        const message={id:crypto.randomUUID(),role:'char',type:'text',text:note,
          sourceTikTokPostId:postId,createdAt:Date.now(),time:new Date().toLocaleTimeString('zh-CN',
            {hour:'2-digit',minute:'2-digit',hour12:false})};
        (s.messages[conv.id]||=[]).push(message);conv.preview=note;conv.time=message.time;
        conv.unread=(conv.unread||0)+1;db.shareHistory[sender.id]=Date.now();shares++;
      }
      db.settings.lastRefreshAt[groupId]=Date.now();
      db.settings.lastActivityCount[groupId]=db.posts.filter(p=>p.groupId===groupId&&p.authorId===s.activeUserAccountId).length;
      db.generationHistory.push({id:crypto.randomUUID(),groupId,createdAt:Date.now(),manual,
        requested:{posts:postsWanted,comments:commentsWanted},created:{posts:created.length,comments:replies.length,shares}});
      db.generationHistory=db.generationHistory.slice(-80);
      result={posts:created.length,comments:replies.length,shares};
    });
    return result;
  }finally{running.delete('refresh:'+groupId)}
}
export async function respondToTikTokPost(store,postId){
  const state=store.getState(),t=ensureTikTok(state),post=t.posts.find(p=>p.id===postId),key='post:'+postId;
  if(!post||post.authorId!==state.activeUserAccountId||!t.settings.respondToUserPosts||running.has(key))return [];
  const model=tikModel(state),ctx=context(store,post.groupId),actors=ctx.actors.filter(a=>
    a.canPost&&tikVisible(state,post,a.id)).slice(0,12);
  if(!actors.length)return [];
  running.add(key);
  try{
    const prompt='你是刷到 USER 作品的虚构 TikTok 账号。最多写 3 条具体评论和 4 个点赞，也可以不互动。评论要接作品中的一个具体细节，不要全员捧场；只从 actors 中选 id。不要泄露私聊、隐藏身份或其他世界。只返回 JSON：{"comments":[{"authorId":"id","text":"评论"}],"likes":["id"]}';
    const data=parse(await sendToModel(model,[{role:'user',text:JSON.stringify({post:{
      title:post.title,body:post.body,caption:post.caption,kind:post.kind},actors,world:ctx.group})}],prompt));
    const results=[];store.update(s=>{
      for(const row of (Array.isArray(data.comments)?data.comments:[]).slice(0,3))
        if(actors.some(a=>a.id===row?.authorId)&&cut(row.text,180))
          results.push(tikComment(s,{postId,authorId:row.authorId,text:cut(row.text,180)}));
      for(const id of (Array.isArray(data.likes)?data.likes:[]).slice(0,4))
        if(actors.some(a=>a.id===id))tikToggle(s,'likes',postId,id);
    });return results;
  }finally{running.delete(key)}
}
export async function replyToTikTokComment(store,commentId){
  const state=store.getState(),t=ensureTikTok(state),comment=t.comments.find(c=>c.id===commentId),
    post=t.posts.find(p=>p.id===comment?.postId),key='comment:'+commentId;
  if(!post||!comment||comment.authorId!==state.activeUserAccountId||post.authorId===state.activeUserAccountId||
    running.has(key))return null;
  const model=tikModel(state),profile=t.profiles[post.authorId];running.add(key);
  try{
    const prompt='你是此 TikTok 作品的作者 @'+profile.handle+'。给 USER 的这条评论写一条自然回复，8—90 字。接具体内容，允许不完全同意；不要泄露未公开身份或私聊。只返回 JSON：{"text":"回复"}。';
    const data=parse(await sendToModel(model,[{role:'user',text:JSON.stringify({
      post:{title:post.title,caption:post.caption},comment:comment.text,persona:profile.bio})}],prompt));
    let result;store.update(s=>{if(s.activeUserAccountId===comment.authorId)
      result=tikComment(s,{postId:post.id,authorId:post.authorId,text:cut(data.text,90),parentId:commentId})});return result;
  }finally{running.delete(key)}
}
export async function replyToTikTokDm(store,peerId){
  const state=store.getState(),t=ensureTikTok(state),accountId=state.activeUserAccountId,groupId=t.groupId,
    profile=t.profiles[peerId],key='dm:'+accountId+':'+peerId;
  if(!profile||profile.kind==='user'||!tikActor(state,peerId,groupId)||running.has(key))return null;
  const model=tikModel(state),person=state.people.find(p=>p.id===peerId);
  const history=t.dm.filter(m=>m.groupId===groupId&&(m.from===accountId&&m.to===peerId||m.from===peerId&&m.to===accountId)).slice(-12);
  if(!history.length)return null;
  running.add(key);
  try{
    const prompt='你是虚构 TikTok 账号 @'+profile.handle+'。按性格、职业和近期私信给 USER 回一条 8—120 字的消息。可以只回一个具体问题，不要写客服话术。只有 identityPublic=true 才能自然提及真实身份；不泄露隐藏账号和其他世界。只返回 JSON：{"text":"正文"}。';
    const data=parse(await sendToModel(model,[{role:'user',text:JSON.stringify({
      history,profile:{name:profile.name,bio:profile.bio,identityPublic:profile.identityPublic,
        persona:cut(person?.persona||person?.personality,300)}})}],prompt));
    let row;store.update(s=>{if(s.activeUserAccountId===accountId&&ensureTikTok(s).groupId===groupId)
      row=tikDm(s,{from:peerId,to:accountId,text:cut(data.text,120)})});return row;
  }finally{running.delete(key)}
}
export async function generateTikTokLiveMoment(store,hostId){
  const state=store.getState(),t=ensureTikTok(state),groupId=t.groupId,key='live:'+groupId+':'+hostId;
  if(!tikActor(state,hostId,groupId)||hostId===state.activeUserAccountId)throw Error('请选择当前世界的创作者');
  if(running.has(key))throw Error('现场正在继续，请稍等');
  const model=tikModel(state),host=t.profiles[hostId],ctx=context(store,groupId),
    room=t.live[key.slice(5)]||{messages:[]},recent=room.messages.slice(-10);
  running.add(key);
  try{
    const prompt='你在虚构短视频社区的图文直播间里，扮演主播和现场观众。主播说一句具体、自然的话，随后 0—3 位观众跟上现场细节。若 USER 刚发言，主播可以接话但不要每次都刻意回应。不能声称正在播放不存在的真实视频，也不泄露私聊和隐藏身份。观众 authorId 只能从 audience 中选。只返回 JSON：{"hostLine":"一句主播现场话","audience":[{"authorId":"id","text":"弹幕"}]}。';
    const audience=ctx.actors.filter(a=>a.id!==hostId).slice(0,12);
    const data=parse(await sendToModel(model,[{role:'user',text:JSON.stringify({
      host:{name:host.name,bio:host.bio,persona:ctx.actors.find(a=>a.id===hostId)?.persona},
      world:ctx.group,worldIntro:ctx.worldIntro,recent,audience})}],prompt));
    let added=0;store.update(s=>{
      if(ensureTikTok(s).groupId!==groupId)return;
      if(cut(data.hostLine,240)){tikLiveMessage(s,{hostId,authorId:hostId,text:cut(data.hostLine,240)});added++}
      for(const row of (Array.isArray(data.audience)?data.audience:[]).slice(0,3))
        if(audience.some(a=>a.id===row.authorId)&&cut(row.text,120)){
          tikLiveMessage(s,{hostId,authorId:row.authorId,text:cut(row.text,120)});added++
        }
    });return added;
  }finally{running.delete(key)}
}
export function tikAutoDue(state,trigger='timer',now=Date.now()){
  const t=ensureTikTok(state),setting=t.settings,last=Number(setting.lastRefreshAt[t.groupId]||0);
  if(setting.autoMode==='off'||now-last<10*60_000)return false;
  if(trigger==='open')return setting.autoMode==='on-open';
  if(setting.autoMode==='interval')return now-last>=count(setting.autoMinutes,15,1440,180)*60_000;
  if(setting.autoMode==='activity')return t.posts.filter(p=>p.groupId===t.groupId&&p.authorId===state.activeUserAccountId).length-
    Number(setting.lastActivityCount[t.groupId]||0)>=count(setting.activityThreshold,1,20,3);
  return false;
}
export function setupTikTokAutomation({store}){
  const check=()=>{if(document.hidden||!tikAutoDue(store.getState()))return;
    void refreshTikTok(store,{manual:false}).catch(error=>console.warn('TikTok 自动刷新暂缓',error))};
  setInterval(check,60_000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
}
