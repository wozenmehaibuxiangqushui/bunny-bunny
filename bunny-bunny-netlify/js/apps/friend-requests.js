import { personById } from "../core/store.js";
import { escapeHtml, initialsAvatar, showToast, updateIsland, openSheet, closeSheet } from "../core/ui.js";
import { sendToModel } from "../integrations/ai-client.js";
import { buildFriendRequestPrompt, parseFriendRequest } from "../friend-request-protocol.js";

export function createFriendRequestsRenderer({store,navigate}){
  return function render(container){
    const state=store.getState(),items=[...(state.friendRequests||[])].sort((a,b)=>b.createdAt-a.createdAt);
    container.className="app-view friend-request-view";
    container.innerHTML=`<div class="row between"><div><span class="eyebrow">MESSAGE RECORDS</span><h3 class="request-title">新的朋友</h3></div><button class="icon-button request-refresh" data-generate-request aria-label="让 AI 生成好友申请">↻</button></div>
      <p class="callout">点击右上角刷新，让当前文本模型根据 USER、CHAR、NPC 和世界关系生成一条真实好友申请。</p>
      <section class="friend-request-list">${items.length?items.map(item=>requestRow(item,state)).join(""):'<div class="empty"><strong>暂无好友申请</strong><span>点击右上角刷新生成第一条申请。</span></div>'}</section>`;
    container.querySelector("[data-generate-request]").onclick=()=>generateRequest(store,container,render);
    container.querySelectorAll("[data-accept-request]").forEach(b=>b.onclick=()=>acceptRequest(store,b.dataset.acceptRequest,navigate));
    container.querySelectorAll("[data-reject-request]").forEach(b=>b.onclick=()=>rejectRequest(store,b.dataset.rejectRequest,()=>render(container)));
  };
}

async function generateRequest(store,container,rerender){
  const button=container.querySelector("[data-generate-request]");button.disabled=true;updateIsland("正在生成好友申请…",true);
  try{const state=store.getState(),model=state.modelProfiles.find(x=>x.id===state.activeModelProfileId);if(!model)throw Error("请先在模型与 API 中保存并启用一个文本模型");const user=personById(state,state.currentUserId),prompt=buildFriendRequestPrompt({user,people:state.people,conversations:state.conversations}),raw=await sendToModel(model,[{role:"user",text:"生成一条新的主动好友申请"}],prompt),parsed=parseFriendRequest(raw,state);store.update(s=>{s.friendRequests||=[];s.friendRequests.push({id:`request-${Date.now()}`,...parsed,status:"pending",createdAt:Date.now()})});showToast("收到一条新的好友申请");rerender(container)}
  catch(error){showToast(error.message)}finally{button.disabled=false;updateIsland("bunny 正在陪你",false)}
}

function acceptRequest(store,id,navigate){
  const state=store.getState(),request=state.friendRequests.find(x=>x.id===id);if(!request||request.status!=="pending")return;
  const person=request.personDraft,existing=state.people.find(x=>x.id===person.id),conversation=state.conversations.find(x=>x.personId===person.id);let conversationId=conversation?.id;
  store.update(s=>{const def=ensureDefaultGroup(s),saved=s.people.find(x=>x.id===person.id);
    if(!saved){person.groupId=def.id;s.people.push(person);def.personIds.push(person.id)}
    else if(!saved.groupId){saved.groupId=def.id;if(!def.personIds.includes(saved.id))def.personIds.push(saved.id)}
    s.chatProfiles[person.id]={...profileSeed(saved||person),...(s.chatProfiles[person.id]||{})};s.stickerLibraries.characters[person.id]||=[];
    if(!conversationId){conversationId=`conv-${person.id}-${Date.now()}`;s.conversations.push({id:conversationId,personId:person.id,preview:request.requestNote,time:timeNow(),unread:0});s.messages[conversationId]=[{id:`welcome-${Date.now()}`,role:"char",type:"text",text:request.requestNote,time:timeNow()}]}
    const target=s.friendRequests.find(x=>x.id===id);target.status="accepted";target.respondedAt=Date.now();
  });showToast(`已同意 ${person.name} 的好友申请`);navigate("conversation",{id:conversationId});
}
function rejectRequest(store,id,done){openSheet(`<form class="request-reject-card"><div class="sheet-title"><h3>拒绝好友申请</h3><button type="button" class="button ghost" data-sheet-close>取消</button></div><label class="field"><span>拒绝理由（选填）</span><textarea name="reason" rows="4" placeholder="可以不填写"></textarea></label><div class="request-reject-actions"><button type="button" data-sheet-close>×</button><button aria-label="发送拒绝">✓</button></div></form>`,{onReady(sheet){sheet.querySelector("form").onsubmit=e=>{e.preventDefault();const reason=new FormData(e.currentTarget).get("reason")?.trim()||"";store.update(s=>{const r=s.friendRequests.find(x=>x.id===id);r.status="rejected";r.rejectReason=reason;r.respondedAt=Date.now()});closeSheet();showToast(reason?"已发送拒绝理由":"已拒绝好友申请");done()}}})}
function requestRow(r,state){const p=r.personDraft,profile=state.chatProfiles[p.id]||{avatarUrl:p.avatarUrl||""},status={accepted:"已同意",rejected:"已拒绝"}[r.status];return`<article class="friend-request-row ${r.status}">${initialsAvatar(p,profile)}<div><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(r.requestNote)}</small>${r.rejectReason?`<em>拒绝理由：${escapeHtml(r.rejectReason)}</em>`:""}</div>${status?`<span class="request-status">${status}</span>`:`<div class="request-actions"><button data-accept-request="${r.id}" aria-label="同意">✓</button><button data-reject-request="${r.id}" aria-label="拒绝">×</button></div>`}</article>`}
function ensureDefaultGroup(s){s.chatGroups||=[];let g=s.chatGroups.find(x=>x.id==="group-default");if(!g){g={id:"group-default",name:"默认",worldId:s.currentWorldId||"",personIds:[]};s.chatGroups.unshift(g)}return g}
function profileSeed(p){return{avatarUrl:p.avatarUrl||"",remark:p.chatName||p.name,voiceSpeed:1,voiceId:"",autoPlayVoice:false,llmTone:true,language:"自动",emotion:"自动",toneStyle:"自然",translationEnabled:false,visionEnabled:true,memoryDepth:24,quietHours:"23:00—08:00",proactiveCall:false,patText:`你拍了拍${p.name}`,patUserText:`${p.name}拍了拍你`}}
function timeNow(){return new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit",hour12:false})}
