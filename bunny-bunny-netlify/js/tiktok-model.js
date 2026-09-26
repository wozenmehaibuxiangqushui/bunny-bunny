import { ensureAccountState, friendWorldGroup } from './account-system.js';
import { inferXFame } from './x-model.js';

const defaults={
  modelMode:'main',api:null,worldbookId:'',worldIntro:'',rules:'',
  batchPosts:4,batchComments:8,autoMode:'off',autoMinutes:180,activityThreshold:3,
  respondToUserPosts:true,autoplay:true,likedVisibility:'private',
  lastRefreshAt:{},lastActivityCount:{}
};
const id=()=>crypto.randomUUID();
const clean=(value,max=4000)=>String(value??'').trim().slice(0,max);
const groupOf=(state,person)=>person.type==='user'?'':friendWorldGroup(state,person.id);

function newProfile(state,person){
  const fame=inferXFame(person),name=person.chatName||person.name||'新朋友';
  return {id:person.id,kind:person.type,groupId:groupOf(state,person),
    name,handle:person.id.replace(/[^a-zA-Z0-9_]/g,'_').slice(0,24),bio:person.signature||'',
    avatar:person.avatarUrl||state.chatProfiles?.[person.id]?.avatarUrl||'',avatarMediaId:'',
    verified:fame.verified,verifiedType:fame.verified?'public-figure':'none',
    fameTier:fame.tier,baseFollowers:fame.base,identityPublic:person.type!=='npc',
    linkedIdentityId:person.id,privateAccount:false,joinedAt:Date.now()};
}
export function ensureTikTok(state){
  ensureAccountState(state);
  const t=state.tiktok ||= {};
  t.version=1;t.groupId ||= friendWorldGroup(state,state.people.find(p=>p.type==='char')?.id);
  t.profiles ||= {};t.posts ||= [];t.comments ||= [];t.follows ||= {};t.likes ||= {};
  t.favorites ||= {};t.reposts ||= {};t.notInterested ||= {};t.watch ||= {};
  t.dm ||= [];t.events ||= [];t.mediaLibrary ||= [];t.avatarPool ||= [];t.drafts ||= [];
  t.live ||= {};
  t.generationHistory ||= [];t.shareHistory ||= {};
  t.settings={...defaults,...(t.settings||{}),
    lastRefreshAt:{...(t.settings?.lastRefreshAt||{})},
    lastActivityCount:{...(t.settings?.lastActivityCount||{})}};
  for(const person of state.people){
    const seeded=newProfile(state,person),old=t.profiles[person.id];
    t.profiles[person.id]={...seeded,...old,id:person.id,kind:person.type};
  }
  return t;
}
export function tikActor(state,actorId,groupId=ensureTikTok(state).groupId){
  const t=ensureTikTok(state),person=state.people.find(p=>p.id===actorId),profile=t.profiles[actorId];
  if(person?.type==='user')return true;
  return !!profile&&(person?friendWorldGroup(state,actorId)===groupId:
    profile.kind==='network-npc'&&profile.groupId===groupId);
}
export function tikVisible(state,post,viewer=state.activeUserAccountId){
  const t=ensureTikTok(state),person=state.people.find(p=>p.id===viewer);
  if(!post||post.deleted||post.groupId!==t.groupId||!person&&!t.profiles[viewer])return false;
  if(person&&person.type!=='user'&&friendWorldGroup(state,viewer)!==post.groupId)return false;
  if(post.visibility==='private'&&post.authorId!==viewer)return false;
  if(post.visibility==='followers'&&post.authorId!==viewer&&!(t.follows[viewer]||[]).includes(post.authorId))return false;
  return !(t.notInterested[viewer]||[]).includes(post.id);
}
export function tikPost(state,data){
  const t=ensureTikTok(state),groupId=data.groupId||t.groupId;
  if(!tikActor(state,data.authorId,groupId))throw Error('作者不属于当前世界');
  const kind=['video','photo','story'].includes(data.kind)?data.kind:'story';
  const media=data.media||null;
  if(kind!=='story'&&!media)throw Error('请先添加视频或图片');
  if(media&&!['video','photo'].includes(media.kind))throw Error('媒体类型无效');
  const caption=clean(data.caption,2200),title=clean(data.title,100);
  if(!caption&&!title&&!media)throw Error('写点内容再发布');
  const baseline=data.source==='model'?Math.max(8,Math.round(
    (Number(t.profiles[data.authorId]?.baseFollowers)||128)*(.09+Math.random()*.18))):0;
  const row={id:id(),authorId:data.authorId,groupId,kind:media?.kind||kind,
    media,caption,title,body:clean(data.body,420),sound:clean(data.sound,80)||'原声',
    coverColor:/^#[0-9a-f]{6}$/i.test(data.coverColor||'')?data.coverColor:'#2a4355',
    visibility:['public','followers','private'].includes(data.visibility)?data.visibility:'public',
    createdAt:Date.now(),views:baseline,baseLikes:Math.floor(baseline*.065),
    baseFavorites:Math.floor(baseline*.009),viewedBy:[],deleted:false,source:data.source||'user'};
  t.posts.push(row);return row;
}
export function tikComment(state,{postId,authorId,text,parentId=''}) {
  const t=ensureTikTok(state),post=t.posts.find(p=>p.id===postId&&!p.deleted);
  if(!post||!tikActor(state,authorId,post.groupId)||!tikVisible(state,post,authorId))
    throw Error('评论对象或作者无效');
  if(parentId&&!t.comments.some(c=>c.id===parentId&&c.postId===postId))throw Error('回复的评论不存在');
  text=clean(text,500);if(!text)throw Error('评论不能为空');
  const row={id:id(),postId,authorId,text,parentId,createdAt:Date.now(),likes:[],deleted:false};
  t.comments.push(row);
  if(authorId!==post.authorId)t.events.push({id:id(),kind:'comment',postId,actorId:authorId,
    targetId:parentId?t.comments.find(c=>c.id===parentId)?.authorId:post.authorId,groupId:post.groupId,
    createdAt:Date.now(),commentId:row.id});
  return row;
}
export function tikToggle(state,key,postId,actorId=state.activeUserAccountId){
  const t=ensureTikTok(state),post=t.posts.find(p=>p.id===postId);
  if(!['likes','favorites','reposts','notInterested'].includes(key)||!tikVisible(state,post,actorId))return false;
  const list=t[key][actorId] ||= [],index=list.indexOf(postId);
  if(index>=0)list.splice(index,1);else list.push(postId);
  if(index<0&&key==='likes'&&actorId!==post.authorId)t.events.push({id:id(),kind:'like',postId,
    actorId,targetId:post.authorId,groupId:post.groupId,createdAt:Date.now()});
  return index<0;
}
export function tikFollow(state,targetId,actorId=state.activeUserAccountId){
  const t=ensureTikTok(state);
  if(targetId===actorId||!tikActor(state,targetId,t.groupId))return false;
  const list=t.follows[actorId] ||= [],index=list.indexOf(targetId);
  if(index>=0)list.splice(index,1);else list.push(targetId);
  if(index<0)t.events.push({id:id(),kind:'follow',actorId,targetId,groupId:t.groupId,createdAt:Date.now()});
  return index<0;
}
export function tikFollowers(state,actorId){
  const t=ensureTikTok(state);return Math.max(0,(Number(t.profiles[actorId]?.baseFollowers)||0)+
    Object.values(t.follows).filter(list=>list.includes(actorId)).length);
}
export function tikRecordWatch(state,postId,actorId=state.activeUserAccountId,seconds=1){
  const t=ensureTikTok(state),post=t.posts.find(p=>p.id===postId);
  if(!tikVisible(state,post,actorId))return;
  const map=t.watch[actorId] ||= {},entry=map[postId] ||= {seconds:0,lastAt:0,completions:0};
  entry.seconds=Math.min(3600,entry.seconds+Math.max(0,Number(seconds)||0));
  entry.lastAt=Date.now();entry.completions=Math.floor(entry.seconds/12);
  post.viewedBy ||= [];
  if(!post.viewedBy.includes(actorId)){post.viewedBy.push(actorId);post.views++}
}
export function tikRankFeed(state,viewer=state.activeUserAccountId,tab='for-you'){
  const t=ensureTikTok(state),followed=new Set(t.follows[viewer]||[]),watch=t.watch[viewer]||{};
  const liked=new Set(t.likes[viewer]||[]),reposted=new Set(t.reposts[viewer]||[]);
  const visible=t.posts.filter(p=>tikVisible(state,p,viewer));
  return visible.filter(post=>tab==='following'?followed.has(post.authorId):
    tab==='friends'?followed.has(post.authorId)&&((t.follows[post.authorId]||[]).includes(viewer)||post.authorId===viewer):true)
    .map(post=>{const age=Math.max(0,(Date.now()-post.createdAt)/3600_000),views=watch[post.id]?.seconds||0;
      const score=followed.has(post.authorId)?55:0;
      const engagement=(liked.has(post.id)?24:0)+(reposted.has(post.id)?18:0);
      const freshness=Math.max(0,72-age)*.7;
      return {post,score:score+engagement+freshness+Math.min(20,views/3)-Math.min(24,views/4)} })
    .sort((a,b)=>b.score-a.score||b.post.createdAt-a.post.createdAt).map(row=>row.post);
}
export function tikCreateNpc(state,data,groupId=ensureTikTok(state).groupId){
  const t=ensureTikTok(state),fame=inferXFame({occupation:data.occupation,persona:data.bio}),actorId='tik-npc-'+id();
  const handle=clean(data.handle,24).replace(/[^a-zA-Z0-9_]/g,'')||'creator';
  const profile={id:actorId,kind:'network-npc',groupId,name:clean(data.name,36)||'路过的创作者',
    handle:handle+'_'+actorId.slice(-4),bio:clean(data.bio,160),avatar:'',avatarMediaId:'',
    verified:fame.verified,verifiedType:fame.verified?'public-figure':'none',
    fameTier:fame.tier,baseFollowers:fame.base,identityPublic:false,linkedIdentityId:'',
    privateAccount:false,joinedAt:Date.now()};
  const pool=t.avatarPool.filter(asset=>!asset.assignedTo),candidates=pool.length?pool:t.avatarPool;
  if(candidates.length){const asset=candidates[Math.floor(Math.random()*candidates.length)];
    profile.avatarMediaId=asset.mediaId||'';profile.avatar=asset.url||'';asset.assignedTo=actorId}
  t.profiles[actorId]=profile;return profile;
}
export function tikDm(state,{from,to,text,postId=''}) {
  const t=ensureTikTok(state),groupId=t.groupId;
  if(!t.profiles[from]||!t.profiles[to]||!tikActor(state,from,groupId)||!tikActor(state,to,groupId))
    throw Error('私信对象不属于当前世界');
  if(from!==state.activeUserAccountId&&to!==state.activeUserAccountId)throw Error('私信需要当前账号参与');
  text=clean(text,2000);if(!text&&!postId)throw Error('私信不能为空');
  const row={id:id(),from,to,text,postId,groupId,createdAt:Date.now()};t.dm.push(row);return row;
}
export function tikLiveMessage(state,{hostId,authorId,text}){
  const t=ensureTikTok(state),groupId=t.groupId;
  if(!tikActor(state,hostId,groupId)||!tikActor(state,authorId,groupId))throw Error('直播账号不在当前世界');
  text=clean(text,240);if(!text)throw Error('先写一句话');
  const room=t.live[groupId+':'+hostId] ||= {hostId,groupId,messages:[],startedAt:Date.now()};
  const row={id:id(),authorId,text,createdAt:Date.now()};room.messages.push(row);
  room.messages=room.messages.slice(-80);return row;
}
