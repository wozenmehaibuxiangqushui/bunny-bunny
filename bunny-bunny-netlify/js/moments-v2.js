import { personById } from "./core/store.js";
import { escapeHtml, initialsAvatar, showToast, updateIsland, openSheet, closeSheet } from "./core/ui.js";
import { sendToModel } from "./integrations/ai-client.js";
import { saveMediaBlob } from "./media-store.js";
import { ensureAccountState, activeAccount, accountFriends, friendWorldGroup, conversationsForAccount, accountContext } from "./account-system.js";
import { retrieveMemoryContext, memoryProfile } from "./memory-engine.js";
import { buildTimeContext } from "./time-context.js";

const AUTO_CHECK_MS=20*1000;
const AUTO_COOLDOWN_MS=2*60*60*1000;

export function createMomentsRenderer({store,navigate}){
  return function render(container){
    const state=ensureAccountState(store.getState()),account=activeAccount(state),background=state.momentsSettings.backgrounds?.[account.id]?.src||"";
    normalizeLegacyMoments(state);
    const posts=visiblePosts(state,account.id);
    container.className="app-view moments-v2-view chat-list-with-tabs";
    container.innerHTML=`<section class="moments-hero" style="${background?`--moments-cover:url(&quot;${escapeHtml(background)}&quot;)`:""}">
      <div class="moments-hero-shade"></div><div class="moments-hero-copy"><span>${escapeHtml(account.chatName||account.name)}</span><strong>把日常留在世界里。</strong><small>不同世界观的人不会看见彼此的互动</small></div>
      <div class="moments-hero-actions"><button data-refresh-moments aria-label="一键刷新朋友圈">↻</button><button data-change-cover aria-label="更换朋友圈背景">⌁</button><button data-publish-moment aria-label="发布朋友圈">＋</button></div>
    </section>
    <section class="moments-feed-v2">${posts.length?posts.map(post=>postCard(post,state,account)).join(""):`<div class="moments-empty"><span>○</span><strong>这个世界还很安静</strong><p>发一条近况，或点右上角刷新让好友们分享今天。</p></div>`}</section>${chatTabs()}`;
    container.querySelector("[data-change-cover]").onclick=()=>openCoverPicker(container,render,store,account.id);
    container.querySelector("[data-publish-moment]").onclick=()=>openPublisher(container,render,store,account);
    container.querySelector("[data-refresh-moments]").onclick=()=>forceRefresh(store,container,render,account.id);
    container.querySelectorAll("[data-moment-like]").forEach(button=>button.onclick=()=>toggleLike(store,button.dataset.momentLike,account,container,render));
    container.querySelectorAll("[data-moment-comment]").forEach(button=>button.onclick=()=>openComment(store,button.dataset.momentComment,account,container,render));
    container.querySelectorAll("[data-chat-tab]").forEach(button=>button.onclick=()=>navigate(button.dataset.chatTab));
  };
}

export function setupMomentsAutomation({store}){
  let running=false;
  const check=async()=>{
    if(running||document.hidden)return;running=true;
    try{
      const state=ensureAccountState(store.getState()),accountId=state.activeUserAccountId,now=Date.now();
      const thread=(state.moments||[]).find(post=>post.accountId===accountId&&Number(post.replyDueAt||0)>0&&Number(post.replyDueAt)<=now&&(post.comments||[]).length>Number(post.threadProcessedCommentCount||0));
      if(thread){await generateThreadReplies(store,thread.id);return}
      const pending=(state.moments||[]).find(post=>post.accountId===accountId&&post.personId===accountId&&!post.aiInteracted&&Number(post.interactionDueAt||0)<=now);
      if(pending){await generateReactions(store,pending.id);return}
      const last=Number(state.momentsSettings.lastAutoAt?.[accountId]||0);if(now-last<AUTO_COOLDOWN_MS)return;
      const candidates=friendRoster(state,accountId).filter(person=>Math.random()<postingProbability(person));
      store.update(s=>{ensureAccountState(s);s.momentsSettings.lastAutoAt[accountId]=now});
      if(candidates.length)await generatePosts(store,accountId,candidates.slice(0,1),false);
    }finally{running=false}
  };
  setInterval(check,AUTO_CHECK_MS);setTimeout(check,7000);
}

function normalizeLegacyMoments(state){
  const main=state.people.find(x=>x.type==="user")?.id||state.activeUserAccountId;
  for(const post of state.moments||[]){post.accountId=post.accountId||main;post.groupId=post.groupId||friendWorldGroup(state,post.personId);post.createdAt=post.createdAt||Date.now()-60*60*1000;post.likes=post.likes||[];post.comments=post.comments||[];for(const comment of post.comments)if(typeof comment!=="string")comment.id=comment.id||crypto.randomUUID()}
}
function visiblePosts(state,accountId){
  const friends=new Set(accountFriends(state,accountId));return(state.moments||[]).filter(post=>post.accountId===accountId&&(post.personId===accountId||friends.has(post.personId))).sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));
}
function visibleActors(state,post,items){return(items||[]).filter(item=>{const id=typeof item==="string"?state.people.find(x=>x.name===item)?.id:item.personId;return!id||id===post.accountId||friendWorldGroup(state,id)===post.groupId})}
function postCard(post,state,account){
  const author=personById(state,post.personId)||account,profile=state.chatProfiles[author.id]||{},likes=visibleActors(state,post,post.likes),comments=visibleActors(state,post,post.comments),liked=likes.some(x=>(typeof x==="string"?x:x.personId)===account.id||(typeof x==="string"&&x===account.name));
  return `<article class="moment-card-v2"><aside>${initialsAvatar(author,profile)}</aside><div class="moment-main"><header><strong>${escapeHtml(author.chatName||profile.remark||author.name)}</strong><span>${relativeTime(post.createdAt)}</span></header><p class="moment-text">${escapeHtml(post.text||"")}</p>${post.image?`<img class="moment-image" src="${escapeHtml(post.image)}" alt="朋友圈图片">`:""}<div class="moment-toolbar"><button class="${liked?"active":""}" data-moment-like="${post.id}">${liked?"♥":"♡"} ${likes.length||""}</button><button data-moment-comment="${post.id}">评论</button><span>${escapeHtml(groupName(state,post.groupId))}</span></div>${likes.length||comments.length?`<section class="moment-social-v2">${likes.length?`<div class="moment-likes">♥ ${likes.map(item=>escapeHtml(actorName(item,state))).join("、")}</div>`:""}${comments.map(item=>`<p class="${item.replyTo?"moment-reply":""}"><b>${escapeHtml(actorName(item,state))}</b>${item.replyTo?`<span> 回复 ${escapeHtml(commentAuthor(post,item.replyTo,state))}</span>`:""} ${escapeHtml(item.text||"")}</p>`).join("")}</section>`:""}</div></article>`;
}
function openCoverPicker(container,render,store,accountId){openSheet(`<div class="sheet-title"><div><small>MOMENTS COVER</small><h3>朋友圈背景</h3></div><button class="button ghost" data-sheet-close>取消</button></div><p class="callout">背景只属于当前账号。图片会压缩并保存在本机，刷新页面不会消失。</p><div class="moment-picker-actions"><label class="button secondary">从相册选择<input hidden type="file" accept="image/*" data-cover-file></label><button class="button secondary" data-cover-url>使用图床</button></div>`,{onReady(sheet){sheet.querySelector("[data-cover-file]").onchange=async event=>{const file=event.target.files?.[0];if(!file)return;try{const media=await saveMediaBlob(await compressImage(file,1440,.82));store.update(s=>{ensureAccountState(s);s.momentsSettings.backgrounds[accountId]=media});closeSheet();render(container);showToast("朋友圈背景已保存")}catch(error){showToast(error.message)}};sheet.querySelector("[data-cover-url]").onclick=()=>{const src=prompt("朋友圈背景图床 URL","https://");if(!/^https?:\/\//.test(src||""))return;store.update(s=>{ensureAccountState(s);s.momentsSettings.backgrounds[accountId]={src}});closeSheet();render(container)}}})}
function openPublisher(container,render,store,account){
  const state=store.getState(),groups=availableGroups(state,account.id);openSheet(`<form class="moment-publisher"><div class="sheet-title"><div><small>NEW MOMENT</small><h3>发布朋友圈</h3></div><button type="button" class="button ghost" data-sheet-close>取消</button></div><label class="field"><span>这一刻</span><textarea name="text" rows="6" maxlength="600" required placeholder="记录一点今天……"></textarea></label><label class="field"><span>可见世界观</span><select name="groupId">${groups.map(group=>`<option value="${group.id}">${escapeHtml(group.name)} · ${group.count} 位好友</option>`).join("")}</select></label><label class="field"><span>图片图床（可选）</span><input name="image" placeholder="https://"></label><button class="button">发布</button></form>`,{onReady(sheet){sheet.querySelector("form").onsubmit=event=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget)),id=crypto.randomUUID?.()||`moment-${Date.now()}`;store.update(s=>{s.moments.unshift({id,accountId:account.id,personId:account.id,groupId:data.groupId,text:data.text.trim(),image:/^https?:\/\//.test(data.image||"")?data.image:"",createdAt:Date.now(),likes:[],comments:[],aiInteracted:false,interactionDueAt:Date.now()+12000})});closeSheet();render(container);showToast("已发布，好友稍后会来互动")}}})
}
async function forceRefresh(store,container,render,accountId){updateIsland("正在刷新朋友圈…",true);try{const people=friendRoster(store.getState(),accountId);if(!people.length)throw Error("当前账号还没有好友");await generatePosts(store,accountId,people,true);store.update(s=>s.momentsSettings.lastRefreshAt[accountId]=Date.now());render(container);showToast("好友们分享了新的近况")}catch(error){showToast(error.message)}finally{updateIsland("bunny 正在陪你",false)}}
async function generatePosts(store,accountId,people,forced){
  const state=ensureAccountState(store.getState()),model=activeModel(state);if(!model)throw Error("请先在 API 设置中连接并启用文本模型");const account=personById(state,accountId),roster=await Promise.all(people.map(person=>momentActorContext(state,accountId,person)));
  const prompt=`生成社交软件朋友圈动态。当前 USER 账号：${account?.chatName||account?.name}。候选好友资料、此刻时间、相关记忆与最近聊天 JSON：${JSON.stringify(roster)}。${forced?"这是用户主动刷新，必须生成 1-3 条。":"判断最自然的一人是否此刻会发动态；可以不发。"}\n要求：不能只照抄人物设定，必须结合记忆、最近聊天、当前时间、职业日程和当下关系来决定发不发以及发什么；动态要像真人随手分享，允许与刚聊过的事、未完成计划或近期心情自然相关，但不要复述记忆档案。严格贴合年龄、性格和线上表达习惯，不写舞台动作，不提 AI 或设定。每条仅属于 authorId 对应的 groupId；评论与点赞者必须同一世界观。评论者可对作者或别人的评论留下可继续回复的空间。严格只返回 JSON：{"posts":[{"authorId":"候选id","text":"动态正文","comments":[{"personId":"同组候选id","text":"自然评论"}],"likes":["同组候选id"]}]}。`;
  const raw=await sendToModel(model,[{role:"user",text:prompt}],""),data=parseJson(raw),allowed=new Map(roster.map(x=>[x.id,x]));const posts=(data?.posts||[]).filter(x=>allowed.has(x.authorId)).slice(0,forced?3:1);if(!posts.length){if(forced)throw Error("模型这次没有生成可用动态");return}
  store.update(s=>{for(const item of posts){const author=allowed.get(item.authorId),sameGroup=new Set(roster.filter(x=>x.groupId===author.groupId).map(x=>x.id)),comments=(item.comments||[]).filter(x=>sameGroup.has(x.personId)).map(x=>({id:crypto.randomUUID(),personId:x.personId,text:String(x.text||"").slice(0,180),createdAt:Date.now()}));s.moments.unshift({id:crypto.randomUUID(),accountId,personId:item.authorId,groupId:author.groupId,text:String(item.text||"").slice(0,600),createdAt:Date.now(),likes:(item.likes||[]).filter(id=>sameGroup.has(id)).map(personId=>({personId})),comments,aiGenerated:true,replyDueAt:comments.length?Date.now()+15000:0,threadProcessedCommentCount:0})}})
}
async function generateReactions(store,postId){
  const state=ensureAccountState(store.getState()),post=state.moments.find(x=>x.id===postId);if(!post)return;const model=activeModel(state);if(!model)return;const account=personById(state,post.accountId),people=friendRoster(state,post.accountId).filter(x=>friendWorldGroup(state,x.id)===post.groupId);if(!people.length){store.update(s=>{const p=s.moments.find(x=>x.id===postId);if(p)p.aiInteracted=true});return}
  const contexts=await Promise.all(people.map(person=>momentActorContext(state,post.accountId,person))),prompt=`USER ${account?.chatName||account?.name} 刚发布朋友圈：“${post.text}”。只有以下同世界观好友看得见；资料包含各自相关记忆和最近聊天：${JSON.stringify(contexts)}。结合人物性格、记忆、与 USER 的近期互动决定谁点赞、谁评论，允许有人不互动。评论必须像本人，不要把记忆直接复述出来。严格只返回 JSON：{"likes":["id"],"comments":[{"personId":"id","text":"自然短评论"}]}。`;
  try{const data=parseJson(await sendToModel(model,[{role:"user",text:prompt}],"")),allowed=new Set(people.map(x=>x.id));store.update(s=>{const target=s.moments.find(x=>x.id===postId);if(!target)return;const comments=(data?.comments||[]).filter(x=>allowed.has(x.personId)).map(x=>({id:crypto.randomUUID(),personId:x.personId,text:String(x.text||"").slice(0,180),createdAt:Date.now()}));target.likes=[...(target.likes||[]),...(data?.likes||[]).filter(x=>allowed.has(x)).map(personId=>({personId}))];target.comments=[...(target.comments||[]),...comments];target.aiInteracted=true;target.replyDueAt=comments.length?Date.now()+12000:0;target.threadProcessedCommentCount=0})}catch{}
}
function toggleLike(store,id,account,container,render){store.update(s=>{const post=s.moments.find(x=>x.id===id);if(!post)return;const index=post.likes.findIndex(x=>(typeof x==="string"?x:x.personId)===account.id||(typeof x==="string"&&x===account.name));if(index>=0)post.likes.splice(index,1);else post.likes.push({personId:account.id})});render(container)}
function openComment(store,id,account,container,render){openSheet(`<form><div class="sheet-title"><h3>写评论</h3><button type="button" class="button ghost" data-sheet-close>取消</button></div><label class="field"><span>评论内容</span><textarea name="text" rows="4" maxlength="180" required autofocus></textarea></label><button class="button">发送评论</button></form>`,{onReady(sheet){sheet.querySelector("form").onsubmit=event=>{event.preventDefault();const text=new FormData(event.currentTarget).get("text").trim();store.update(s=>{const post=s.moments.find(x=>x.id===id);if(!post)return;post.comments.push({id:crypto.randomUUID(),personId:account.id,text,createdAt:Date.now()});post.replyDueAt=Date.now()+8000});closeSheet();render(container)}}})}
async function generateThreadReplies(store,postId){
  const state=ensureAccountState(store.getState()),post=state.moments.find(x=>x.id===postId);if(!post)return;const start=Number(post.threadProcessedCommentCount||0),pending=(post.comments||[]).slice(start);if(!pending.length)return;
  const userComment=pending.some(x=>x.personId===post.accountId),chance=userComment ? .84 : .62;if(Math.random()>chance){store.update(s=>{const target=s.moments.find(x=>x.id===postId);if(target){target.threadProcessedCommentCount=target.comments.length;target.replyDueAt=0}});return}
  const model=activeModel(state),people=friendRoster(state,post.accountId).filter(x=>friendWorldGroup(state,x.id)===post.groupId);if(!model||!people.length)return;
  const contexts=await Promise.all(people.map(person=>momentActorContext(state,post.accountId,person))),commentRows=(post.comments||[]).map(x=>({id:x.id,personId:x.personId,name:actorName(x,state),replyTo:x.replyTo||"",text:x.text})),prompt=`为一条朋友圈生成自然的楼中楼回复。动态作者 ${actorName({personId:post.personId},state)}，正文：“${post.text}”。同世界观人物及其记忆/最近聊天：${JSON.stringify(contexts)}。现有评论：${JSON.stringify(commentRows)}。只处理最后 ${pending.length} 条尚未处理的评论。作者本人和其他同世界观 CHAR/NPC 都可能回复别人；是否回复、谁回复、回复几条取决于各自性格、关系、记忆与评论内容，允许零条。不得让不同世界观的人互相看见；不要复述档案。严格只返回 JSON：{"replies":[{"responderId":"人物id","replyTo":"被回复评论id","text":"自然回复"}]}。`;
  try{const data=parseJson(await sendToModel(model,[{role:"user",text:prompt}],"")),allowed=new Set(people.map(x=>x.id)),commentIds=new Set((post.comments||[]).map(x=>x.id));store.update(s=>{const target=s.moments.find(x=>x.id===postId);if(!target)return;const replies=(data?.replies||[]).filter(x=>allowed.has(x.responderId)&&commentIds.has(x.replyTo)&&String(x.text||"").trim()).slice(0,6).map(x=>({id:crypto.randomUUID(),personId:x.responderId,replyTo:x.replyTo,text:String(x.text).slice(0,180),createdAt:Date.now(),aiGenerated:true}));target.comments.push(...replies);target.threadProcessedCommentCount=target.comments.length;target.replyDueAt=0})}catch{store.update(s=>{const target=s.moments.find(x=>x.id===postId);if(target){target.threadProcessedCommentCount=target.comments.length;target.replyDueAt=0}})}
}
async function momentActorContext(state,accountId,person){
  const conv=conversationsForAccount(state,accountId).find(x=>x.personId===person.id),recent=(state.messages[conv?.id]||[]).slice(-12),query=[...recent].reverse().find(x=>x.role==="user")?.text||"朋友圈近况",identity=accountContext(state,person.id,accountId),profile=memoryProfile(state,identity.memoryOwnerId);let selected=[];try{selected=(await retrieveMemoryContext(state,identity.memoryOwnerId,query)).selected.slice(0,8).map(x=>x.text||x.event).filter(Boolean)}catch{}
  return{id:person.id,name:person.name,type:person.type,age:person.age||"",occupation:person.occupation||"",persona:String(person.personality||person.persona||person.note||"").slice(0,1800),groupId:friendWorldGroup(state,person.id),time:buildTimeContext(state.chatProfiles[person.id]||{},{timezone:state.worlds.find(x=>x.id===state.currentWorldId)?.timezone,lastMessageAt:recent.at(-1)?.createdAt}),coreMemory:String(profile.coreMemory||"").slice(0,1600),dynamicState:profile.dynamicState,retrievedMemory:selected.map(x=>String(x).slice(0,220)),recentChat:recent.map(x=>`${x.role}:${x.recalled?"[已撤回]":x.text||x.description||`[${x.type}]`}`.slice(0,320))}
}
function friendRoster(state,accountId){const ids=new Set(accountFriends(state,accountId));return state.people.filter(x=>ids.has(x.id)&&(x.type==="char"||x.type==="npc")&&!x.blocked)}
function availableGroups(state,accountId){const friends=friendRoster(state,accountId),map=new Map();for(const person of friends){const id=friendWorldGroup(state,person.id),name=groupName(state,id);if(!map.has(id))map.set(id,{id,name,count:0});map.get(id).count++}return[...map.values()].length?[...map.values()]:[{id:"group-default",name:"默认",count:0}]}
function postingProbability(person){const text=`${person.age||""} ${person.occupation||""} ${person.personality||person.persona||person.note||""}`;let p=.18;if(/学生|活泼|外向|分享|博主|媒体|设计|摄影/.test(text))p+=.18;if(/沉静|克制|内向|医生|律师|科研|管理/.test(text))p-=.08;return Math.max(.05,Math.min(.55,p))}
function actorName(item,state){if(typeof item==="string")return item;return personById(state,item.personId)?.chatName||personById(state,item.personId)?.name||"好友"}
function commentAuthor(post,commentId,state){const row=(post.comments||[]).find(x=>x.id===commentId);return row?actorName(row,state):"好友"}
function groupName(state,id){return state.chatGroups.find(x=>x.id===id)?.name||"默认世界"}
function activeModel(state){return state.modelProfiles.find(x=>x.id===state.activeModelProfileId&&x.apiKey&&x.model)}
function parseJson(value){try{const match=String(value||"").match(/\{[\s\S]*\}/);return match?JSON.parse(match[0]):null}catch{return null}}
function relativeTime(value){const delta=Math.max(0,Date.now()-Number(value||Date.now()));if(delta<60000)return"刚刚";if(delta<3600000)return`${Math.floor(delta/60000)}分钟前`;if(delta<86400000)return`${Math.floor(delta/3600000)}小时前`;return new Date(value).toLocaleDateString("zh-CN",{month:"numeric",day:"numeric"})}
function chatTabs(){const icon=path=>`<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;return`<nav class="chat-tabs"><button aria-label="聊天" data-chat-tab="chat">${icon('<path d="M4 5h16v11H9l-5 4V5z"/>')}</button><button aria-label="朋友圈" data-chat-tab="moments" class="active">${icon('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/>')}</button><button aria-label="我" data-chat-tab="chat-me">${icon('<circle cx="12" cy="8" r="3"/><path d="M5 20c1-5 13-5 14 0"/>')}</button></nav>`}
async function compressImage(file,max=.0,quality=.82){if(!file?.type?.startsWith("image/"))throw Error("请选择图片文件");if(!max)return file;const bitmap=await createImageBitmap(file),scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext("2d").drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error("图片压缩失败")),"image/jpeg",quality))}
