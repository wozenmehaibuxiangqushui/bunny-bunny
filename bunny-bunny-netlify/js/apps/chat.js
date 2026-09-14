import { conversationById, personById } from "../core/store.js";
import { escapeHtml, initialsAvatar, showToast, updateIsland, openSheet, closeSheet } from "../core/ui.js";
import { sendToModel } from "../integrations/ai-client.js";

export function createChatRenderers({ store, navigate }) {
  function list(container) {
    const state = store.getState();
    container.innerHTML = `
      <div class="row between"><span class="pill"><span class="dot"></span> Bunny Chat</span><button class="icon-button" data-list-plus aria-label="聊天功能">＋</button></div>
      <div class="section-title"><h3>联系人与会话</h3><span>${state.conversations.length} 个</span></div>
      <section>${state.conversations.map(item => {
        const person = personById(state, item.personId); const profile = state.chatProfiles[person.id];
        return `<article class="conversation row" data-conversation="${item.id}"><button class="avatar-button" data-open-conversation="${item.id}">${initialsAvatar(person, profile)}</button><div class="meta"><strong>${escapeHtml(profile.remark || person.name)}</strong><span>${escapeHtml(item.preview)}</span></div><div class="stack" style="justify-items:end;gap:.35rem"><span class="eyebrow">${item.time}</span>${item.unread ? `<span class="unread">${item.unread}</span>` : ""}</div></article>`;
      }).join("")}</section>
      ${chatTabs("chats")}`;
    container.querySelectorAll("[data-open-conversation]").forEach(button => button.addEventListener("click", () => navigate("conversation", { id: button.dataset.openConversation })));
    container.querySelectorAll("[data-conversation]").forEach(row => row.addEventListener("click", event => { if (!event.target.closest(".avatar-button")) navigate("conversation", { id: row.dataset.conversation }); }));
    container.querySelector("[data-list-plus]").addEventListener("click", () => openChatMenu());
    bindChatTabs(container, navigate);
  }

  function conversation(container, params) {
    const state = store.getState(); const conv = conversationById(state, params.id || "conv-jun"); const person = personById(state, conv.personId); const profile = state.chatProfiles[person.id];
    conv.unread = 0;
    container.innerHTML = `<section class="chat-layout">
      <div class="chat-person row between"><button class="avatar-button" data-profile-card>${initialsAvatar(person, profile)}</button><div class="meta"><strong>${escapeHtml(profile.remark || person.name)}</strong><span>${escapeHtml(person.note)}</span></div><button class="icon-button" data-chat-settings aria-label="聊天设置">•••</button></div>
      <div class="chat-stream" data-stream>${state.messages[conv.id].map(message => messageBubble(message)).join("")}</div>
      <div><div class="plus-tray hidden" data-plus-tray>${["图片","拍摄","语音","位置","红包","转账","文件","一起刷","表情包"].map((label,index)=>`<button data-extra="${label}"><span>${["▧","◉","♫","⌖","礼","¥","□","▷","☺"][index]}</span>${label}</button>`).join("")}</div>
      <form class="composer"><button type="button" class="icon-button" data-plus aria-label="更多功能">＋</button><textarea name="message" rows="1" placeholder="说点什么…" aria-label="消息"></textarea><button type="button" class="send secondary-send" data-send-only aria-label="仅发送">↑</button><button class="send ai-send" aria-label="发送给 AI">AI</button></form></div>
    </section>`;
    const form = container.querySelector("form");
    container.querySelector("[data-plus]").addEventListener("click", () => container.querySelector("[data-plus-tray]").classList.toggle("hidden"));
    container.querySelectorAll("[data-extra]").forEach(button => button.addEventListener("click", () => showToast(`${button.dataset.extra}功能已预留业务入口`)));
    container.querySelector("[data-send-only]").addEventListener("click", () => submitMessage(false));
    form.addEventListener("submit", event => { event.preventDefault(); submitMessage(true); });
    container.querySelector("[data-chat-settings]").addEventListener("click", () => navigate("chat-settings", { personId: person.id }));
    const avatar = container.querySelector("[data-profile-card]");
    let clickTimer; avatar.addEventListener("click", () => { clearTimeout(clickTimer); clickTimer = setTimeout(() => showProfileCard(person, profile), 250); });
    avatar.addEventListener("dblclick", () => { clearTimeout(clickTimer); addSystemMessage(profile.patText || `拍了拍${person.name}`); showToast(profile.patText || "拍一拍"); });
    bindMessageMenus(container, conv, person);

    async function submitMessage(sendAi) {
      const input = form.elements.message; const text = input.value.trim(); if (!text) return;
      const now = timeNow(); store.update(s => { s.messages[conv.id].push({ id: crypto.randomUUID(), role: "user", text, time: now }); conv.preview = text; conv.time = now; }); input.value = ""; conversation(container, params);
      if (!sendAi) return;
      const current = store.getState(); const modelProfile = current.modelProfiles.find(item => item.id === current.activeModelProfileId);
      updateIsland(`${person.name} 正在通过 AI 回复…`, true);
      try { const reply = await sendToModel(modelProfile, current.messages[conv.id]); store.update(s => s.messages[conv.id].push({ id: crypto.randomUUID(), role: "char", text: reply, time: timeNow() })); conversation(container, params); }
      catch (error) { showToast(error.message); }
      finally { updateIsland("bunny 正在陪你", false); }
    }

    function addSystemMessage(text) { store.update(s => s.messages[conv.id].push({ id: crypto.randomUUID(), role: "system", text, time: timeNow() })); conversation(container, params); }
  }

  function moments(container) {
    const state = store.getState();
    container.innerHTML = `<section class="moments-cover"><div><span>我的朋友圈</span><strong>把日常留在世界里。</strong></div><button class="button secondary" data-cover>更换背景</button></section><section class="feed">${state.moments.map(post => { const person = personById(state, post.personId); return `<article class="moment-card">${initialsAvatar(person, state.chatProfiles[person.id] || {})}<div><strong>${escapeHtml(person.name)}</strong><p>${escapeHtml(post.text)}</p><small>${post.time}</small><div class="moment-actions"><button data-like="${post.id}">♡ ${post.likes.length}</button><button data-comment="${post.id}">评论</button></div><div class="moment-social"><span>♥ ${post.likes.join("、")}</span>${post.comments.map(comment => `<p><b>${escapeHtml(comment.name)}：</b>${escapeHtml(comment.text)}</p>`).join("")}</div></div></article>`; }).join("")}</section>${chatTabs("moments")}`;
    container.querySelector("[data-cover]").addEventListener("click", () => showToast("朋友圈背景可从相册或图床链接设置"));
    container.querySelectorAll("[data-like]").forEach(button => button.addEventListener("click", () => { store.update(s => { const post=s.moments.find(p=>p.id===button.dataset.like); if(!post.likes.includes("小满"))post.likes.push("小满"); }); moments(container); }));
    container.querySelectorAll("[data-comment]").forEach(button => button.addEventListener("click", () => showToast("评论输入框将在消息组件中复用")));
    bindChatTabs(container, navigate);
  }

  function me(container) {
    const state=store.getState(); const user=personById(state,state.currentUserId);
    container.innerHTML=`<section class="card row">${initialsAvatar(user)}<div class="meta"><strong>${escapeHtml(user.chatName)}</strong><span>本名：${escapeHtml(user.name)} · 两者独立保存</span></div></section><form class="stack user-profile"><label class="field"><span>聊天软件名字</span><input name="chatName" value="${escapeHtml(user.chatName)}"></label><label class="field"><span>人物本名</span><input name="name" value="${escapeHtml(user.name)}"></label><label class="field"><span>个人人设</span><textarea name="note">${escapeHtml(user.note)}</textarea></label><button class="button">保存个人资料</button></form><div class="section-title"><h3>账号身份</h3><span>${user.accounts.length} 个</span></div><section class="card"><div class="setting-row"><div><span class="label">当前主号</span><small>${escapeHtml(user.accounts[0].name)}</small></div><span class="pill">使用中</span></div><div class="setting-row"><div><span class="label">新建小号</span><small>与人物本名、角色识别状态分开</small></div><button class="button secondary" data-alt>＋ 添加</button></div></section>${chatTabs("me")}`;
    container.querySelector("form").addEventListener("submit",event=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget));store.update(s=>{const u=personById(s,s.currentUserId);Object.assign(u,data);});showToast("个人资料已保存");});
    container.querySelector("[data-alt]").addEventListener("click",()=>showToast("创建小号流程已预留独立身份识别规则"));
    bindChatTabs(container,navigate);
  }

  function openChatMenu() { openSheet(`<div class="sheet-handle"></div><div class="sheet-title"><h3>发起</h3><button class="button ghost" data-sheet-close>关闭</button></div><div class="action-grid"><button class="action-card" data-menu="拉群聊"><span class="action-icon">群</span>拉群聊</button><button class="action-card" data-menu="加好友"><span class="action-icon">＋</span>加好友</button><button class="action-card" data-menu="摇一摇"><span class="action-icon">⌁</span>摇一摇</button></div>`,{onReady(sheet){sheet.querySelectorAll("[data-menu]").forEach(button=>button.addEventListener("click",()=>{showToast(`${button.dataset.menu}流程已打开`);closeSheet();}));}}); }
  function showProfileCard(person, profile) { openSheet(`<div class="sheet-handle"></div><section class="profile-card">${initialsAvatar(person,profile)}<div><span class="eyebrow">BUNNY CHAT CARD</span><h3>${escapeHtml(person.name)}</h3><p>@${escapeHtml(profile.remark || person.name).toLowerCase().replace(/\s/g,"_")}</p></div></section><blockquote class="signature">“${escapeHtml(person.signature || person.note)}”</blockquote><div class="row"><button class="button" data-sheet-close>发消息</button><button class="button secondary" data-sheet-close>语音通话</button></div>`); }
  function bindMessageMenus(container,conv,person){container.querySelectorAll(".message.char .bubble").forEach(bubble=>{let timer;bubble.addEventListener("pointerdown",()=>timer=setTimeout(()=>showMessageMenu(bubble.closest(".message").dataset.messageId,conv,person),500));bubble.addEventListener("pointerup",()=>clearTimeout(timer));bubble.addEventListener("pointercancel",()=>clearTimeout(timer));});}
  function showMessageMenu(messageId,conv,person){const message=store.getState().messages[conv.id].find(item=>item.id===messageId);openSheet(`<div class="reaction-row">${["♥","😂","🥺","👍","…"].map(emoji=>`<button data-reaction="${emoji}">${emoji}</button>`).join("")}</div><div class="section-title"><h3>消息操作</h3><span>${escapeHtml(person.name)}</span></div><div class="action-grid"><button class="action-card" data-copy>复制</button><button class="action-card" data-edit>编辑</button><button class="action-card" data-select>多选</button></div>`,{onReady(sheet){sheet.querySelector("[data-copy]").addEventListener("click",async()=>{await navigator.clipboard?.writeText(message.text);showToast("已复制");closeSheet();});sheet.querySelector("[data-edit]").addEventListener("click",()=>{const next=prompt("编辑消息",message.text);if(next!==null)store.update(s=>{const m=s.messages[conv.id].find(item=>item.id===messageId);m.text=next;});closeSheet();});sheet.querySelector("[data-select]").addEventListener("click",()=>{showToast("已进入多选模式");closeSheet();});sheet.querySelectorAll("[data-reaction]").forEach(button=>button.addEventListener("click",()=>{store.update(s=>{const m=s.messages[conv.id].find(item=>item.id===messageId);m.reaction=button.dataset.reaction;});showToast("已添加 reaction");closeSheet();}));}});}
  return { list, conversation, moments, me };
}

function messageBubble(message){if(message.role==="system")return `<article class="system-message">${escapeHtml(message.text)}</article>`;return `<article class="message ${message.role}" data-message-id="${message.id}" data-message-role="${message.role}"><div class="bubble">${escapeHtml(message.text)}</div>${message.reaction? `<span class="message-reaction">${message.reaction}</span>`:""}<time>${message.time}</time></article>`;}
function chatTabs(active){return `<nav class="chat-tabs"><button data-chat-tab="chat" class="${active==="chats"?"active":""}">聊天</button><button data-chat-tab="moments" class="${active==="moments"?"active":""}">朋友圈</button><button data-chat-tab="chat-me" class="${active==="me"?"active":""}">我</button></nav>`;}
function bindChatTabs(container,navigate){container.querySelectorAll("[data-chat-tab]").forEach(button=>button.addEventListener("click",()=>navigate(button.dataset.chatTab)));}
function timeNow(){return new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit",hour12:false});}
