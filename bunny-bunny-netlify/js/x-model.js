import { ensureAccountState, friendWorldGroup } from './account-system.js';

const defaults = {
  modelMode:'main', api:null, worldbookId:'', worldIntro:'', rules:'', extensionRules:'',
  batchPosts:5, batchComments:9, autoMode:'off', autoMinutes:180, activityThreshold:4, respondToUserPosts:true,
  lastRefreshAt:{}, lastActivityCount:{}
};
const fameRules = [
  { test:/明星|演员|歌手|偶像|idol|艺人|影帝|影后|名模|顶流/i, tier:'celebrity', base:380000, verified:true },
  { test:/网红|网黄|博主|主播|up主|creator|influencer|模特|情色博主/i, tier:'creator', base:38000, verified:false },
  { test:/作家|画家|摄影师|设计师|记者|导演|运动员|教授|医生/i, tier:'niche', base:2600, verified:false }
];
export function inferXFame(person={}) {
  const text=[person.occupation,person.persona,person.personality,person.note].filter(Boolean).join(' ');
  return fameRules.find(rule=>rule.test.test(text)) || {tier:'ordinary',base:128,verified:false};
}
function seedProfile(s,person) {
  const fame=inferXFame(person),name=person.chatName||person.name||'匿名用户';
  return {id:person.id,name,handle:person.id.replace(/[^a-zA-Z0-9_]/g,'_').slice(0,30),
    bio:person.signature||'',signature:person.signature||'',avatar:person.avatarUrl||s.chatProfiles?.[person.id]?.avatarUrl||'',
    banner:'',location:person.city||'',website:'',birthday:'',pronouns:'',occupation:person.occupation||'',
    interests:'',pinnedPostId:'',verified:fame.verified,verifiedType:fame.verified?'public-figure':'none',
    fameTier:fame.tier,baseFollowers:fame.base,identityPublic:person.type!=='npc',
    linkedIdentityId:person.id,groupId:friendWorldGroup(s,person.id),joinedAt:Date.now(),kind:person.type};
}
export function ensureX(s) {
  ensureAccountState(s);
  s.xSocial ||= {};
  const x=s.xSocial;
  x.version=2;x.theme ||= 'dark';x.posts ||= [];x.profiles ||= {};x.follows ||= {};x.dm ||= [];
  x.events ||= [];x.drafts ||= {};x.muted ||= {};x.avatarPool ||= [];x.generationHistory ||= [];
  x.settings={...defaults,...(x.settings||{}),lastRefreshAt:{...(x.settings?.lastRefreshAt||{})},lastActivityCount:{...(x.settings?.lastActivityCount||{})}};
  x.groupId ||= friendWorldGroup(s,s.people.find(p=>p.type==='char')?.id);
  for(const person of s.people){
    const prior=x.profiles[person.id],fresh=seedProfile(s,person);
    x.profiles[person.id]={...fresh,...prior,id:person.id,kind:person.type};
    if(prior?.celebrity && prior.verified===undefined)x.profiles[person.id].verified=true;
  }
  return x;
}
export function xActor(s,id,groupId=ensureX(s).groupId) {
  const x=ensureX(s),person=s.people.find(p=>p.id===id),profile=x.profiles[id];
  if(person?.type==='user')return true;
  return !!profile && (person?friendWorldGroup(s,id)===groupId:profile.kind==='network-npc'&&profile.groupId===groupId);
}
export function xVisible(s,post,viewer=s.activeUserAccountId) {
  const x=ensureX(s),person=s.people.find(p=>p.id===viewer),network=x.profiles[viewer]?.kind==='network-npc';
  return (!!person||network)&&!post.deleted&&post.groupId===x.groupId
    &&(person?.type==='user'||(network?x.profiles[viewer].groupId:friendWorldGroup(s,viewer))===post.groupId)
    &&!(x.muted[viewer]||[]).includes(post.authorId)
    &&(post.audience!=='followers'||post.authorId===viewer||(x.follows[viewer]||[]).includes(post.authorId));
}
export function xEvent(s,kind,post,actor) {
  const x=ensureX(s),target=kind==='reply'?x.posts.find(p=>p.id===post.parentId):post;
  x.events.push({id:crypto.randomUUID(),kind,postId:post.id,actorId:actor,authorId:target?.authorId||post.authorId,
    groupId:post.groupId,createdAt:Date.now(),visibility:post.audience||'public'});
  x.events=x.events.slice(-1000);
}
export function xPost(s,{authorId,text,images=[],parentId='',quoteId='',audience='public',groupId=''}) {
  const x=ensureX(s);groupId ||= x.groupId;
  if(!xActor(s,authorId,groupId))throw Error('账号不存在或不属于当前世界');
  if(quoteId&&!x.posts.some(p=>p.id===quoteId&&!p.deleted&&p.groupId===groupId))throw Error('引用内容不可见');
  text=String(text||'').trim();if(!text&&!images.length)throw Error('写点内容或添加图片');
  const parent=parentId?x.posts.find(p=>p.id===parentId&&!p.deleted&&p.groupId===groupId):null;
  if(parentId&&!parent)throw Error('无法回复这条贴文');
  const post={id:crypto.randomUUID(),authorId,text:text.slice(0,4000),images:images.slice(0,4),parentId,quoteId,
    audience:parent?.audience||audience,groupId:parent?.groupId||groupId,createdAt:Date.now(),
    likes:[],reposts:[],bookmarks:[],views:[]};
  x.posts.push(post);xEvent(s,parentId?'reply':'post',post,authorId);return post;
}
export function xToggle(s,id,key,actor) {
  const p=ensureX(s).posts.find(row=>row.id===id);
  if(!p||!xVisible(s,p,actor)||!['likes','reposts','bookmarks'].includes(key))return;
  p[key]||=[];const index=p[key].indexOf(actor);
  if(index>=0)p[key].splice(index,1);else p[key].push(actor);
  if(key!=='bookmarks')xEvent(s,key,p,actor);
}
export function xFollowers(s,id) {
  const x=ensureX(s),profile=x.profiles[id],organic=Object.values(x.follows).filter(ids=>ids.includes(id)).length;
  return Math.max(0,Math.round(Number(profile?.baseFollowers)||0)+organic);
}
export function xReputation(s,id) {
  const x=ensureX(s),posts=x.posts.filter(p=>p.authorId===id&&!p.deleted&&p.groupId===x.groupId),
    readers=new Set(posts.flatMap(p=>p.views||[]));
  return {posts:posts.filter(p=>!p.parentId).length,likes:posts.reduce((n,p)=>n+(p.likes?.length||0),0),
    reposts:posts.reduce((n,p)=>n+(p.reposts?.length||0),0),reach:readers.size,followers:xFollowers(s,id)};
}
export function xAssignAvatar(x,profile) {
  const pool=x.avatarPool||[];if(!pool.length)return profile;
  const use=pool.filter(item=>!item.assignedTo);
  const candidates=use.length?use:pool,chosen=candidates[Math.floor(Math.random()*candidates.length)];
  if(chosen){profile.avatarAssetId=chosen.id;chosen.assignedTo=profile.id}
  return profile;
}
export function xCreateNetworkNpc(s,{name,handle,bio='',occupation='',interests=''},groupId=ensureX(s).groupId) {
  const x=ensureX(s),id='x-npc-'+crypto.randomUUID(),cleanHandle=String(handle||name||'person').replace(/[^a-zA-Z0-9_]/g,'').slice(0,24)||'person',
    fame=inferXFame({occupation,persona:bio+' '+interests});
  const profile={id,name:String(name||'路过的人').slice(0,32),handle:cleanHandle+'_'+id.slice(-4),bio:String(bio).slice(0,160),
    occupation:String(occupation).slice(0,80),interests:String(interests).slice(0,120),signature:'',location:'',website:'',
    birthday:'',pronouns:'',banner:'',avatar:'',kind:'network-npc',groupId,verified:fame.verified,verifiedType:fame.verified?'public-figure':'none',
    fameTier:fame.tier,baseFollowers:fame.tier==='ordinary'?24+(x.generationHistory.length*31)%980:fame.base,
    linkedIdentityId:'',identityPublic:false,joinedAt:Date.now()};
  x.profiles[id]=xAssignAvatar(x,profile);return profile;
}
export function xDmSend(s,{from,to,text,sourcePostId=''}) {
  const x=ensureX(s);if(!x.profiles[from]||!x.profiles[to]||!String(text||'').trim())throw Error('私信对象或内容无效');
  if(from!==s.activeUserAccountId&&to!==s.activeUserAccountId)throw Error('私信必须由当前账号参与');
  const peer=from===s.activeUserAccountId?to:from;
  if(!xActor(s,peer,x.groupId))throw Error('对方不属于当前世界');
  const row={id:crypto.randomUUID(),from,to,text:String(text).trim().slice(0,4000),sourcePostId,groupId:x.groupId,createdAt:Date.now()};
  x.dm.push(row);return row;
}
// Only public facts and explicitly disclosed identities may enter generated public content.
export function buildXRoleContext(s,actorId,accountId=s.activeUserAccountId) {
  const x=ensureX(s),actor=s.people.find(p=>p.id===actorId),profile=x.profiles[actorId],
    relation=s.accountRelations?.[accountId],known=relation?.type==='alt'&&!!relation.disclosedTo?.[actorId];
  return {actor:{id:actorId,name:profile?.name,persona:actor?.personality||actor?.persona||'',
      occupation:profile?.occupation||actor?.occupation,interests:profile?.interests,
      fameTier:profile?.fameTier,verified:profile?.verified},
    viewerAccount:{id:accountId,name:x.profiles[accountId]?.name,...(known?{knownMainAccount:relation.relatedTo}:{})},
    visiblePosts:x.posts.filter(p=>xVisible(s,p,actorId)).slice(-30).map(p=>({id:p.id,authorId:p.authorId,text:p.text,parentId:p.parentId})),
    rules:['公开贴文不是私聊；不公开私人记忆或隐藏身份。','只回应可见帖子，不跨世界互动。','未披露身份时不推断大小号关联。',
      '网友猜测不写成事实；语气随职业、年龄、关系和名气变化。']};
}
