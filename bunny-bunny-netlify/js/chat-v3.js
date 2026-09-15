import { conversationById, personById } from "./core/store.js";
import { escapeHtml, initialsAvatar, showToast, updateIsland, openSheet, closeSheet } from "./core/ui.js";
import { sendToModel } from "./integrations/ai-client.js";

const DEFAULT_REACTIONS = ["❤️", "👍", "👎", "😂", "‼️", "❓"];
const EMOJI_GROUPS = {
  "常用": ["😀","😃","😄","😁","😆","🥹","😂","🤣","😊","🥰","😍","😘","😋","😎","🤩","🥳","🙂","🙃","🥲","🥺","😭","😤","😡","🤯","😳","🥶","🫠"],
  "手势": ["👍","👎","👌","✌️","🤞","🫶","👏","🙌","🙏","🤝","💪","👀","💅","👉","👈","☝️","✋","🤚","🖐️","👋"],
  "爱心": ["❤️","🩷","🧡","💛","💚","🩵","💙","💜","🖤","🩶","🤍","🤎","💔","❤️‍🔥","❤️‍🩹","💕","💞","💓","💗","💖","💘","💝"],
  "动物": ["🐰","🐱","🐶","🐻","🐼","🐨","🦊","🐯","🦁","🐸","🐵","🐧","🐦","🦋","🐝","🐬","🐳","🦭","🦦","🦔"],
  "食物": ["🍎","🍓","🍒","🍑","🍋","🥐","🍞","🍰","🧁","🍫","🍬","🍭","☕️","🧋","🍵","🍺","🍷","🍜","🍣","🍙"],
  "符号": ["✨","⭐️","🌙","☀️","☁️","🌧️","🔥","💫","🎀","🎵","🎧","📍","💌","💬","✅","❌","⭕️","‼️","⁉️","❓"]
};
const TYPE_META = {
  text:["文字","Aa"], image:["图片","▧"], transfer:["转账","¥"], redpacket:["红包","礼"],
  location:["位置","⌖"], voice:["语音","◖"]
};

export function createConversationV3Renderer({ store, navigate }) {
  const ui = { conversationId: "", quoteId: "", selectMode: false, selected: new Set() };

  function conversation(container, params = {}) {
    const state = store.getState();
    const conv = conversationById(state, params.id || "conv-jun");
    if (!conv) return navigate("chat");
    const person = personById(state, conv.personId);
    const user = personById(state, state.currentUserId);
    const profile = state.chatProfiles[person.id];
    const appearance = state.chatAppearance;
    conv.unread = 0;
    configureHeader();
    const messages = state.messages[conv.id] || [];
    const quoted = messages.find(message => message.id === ui.quoteId);
    container.className = `app-view conversation-v3 ${ui.selectMode ? "select-mode" : ""}`;
    container.innerHTML = `<section class="chat-layout-v3" style="${backgroundStyle(appearance.background)}">
      <header class="chat-contact-bar">
        <button class="chat-contact-avatar" data-profile-card aria-label="查看 ${escapeHtml(person.name)} 的资料">${initialsAvatar(person, profile)}</button>
        <div><strong>${escapeHtml(profile.remark || person.name)}</strong><span>${person.online ? "在线" : escapeHtml(person.note)}</span></div>
        <button class="chat-more" data-chat-settings aria-label="聊天设置">•••</button>
      </header>
      <div class="chat-stream-v3" data-stream>${messages.map((message,index,list)=>messageView(message,index>0&&list[index-1].role===message.role,person,user,profile,appearance,messages,ui)).join("")}</div>
      ${ui.selectMode ? selectionBar(ui.selected.size) : composerView(quoted)}
    </section>`;
    bind(container, params, conv, person, user, profile, messages);
    requestAnimationFrame(() => { const stream=container.querySelector("[data-stream]"); if(stream)stream.scrollTop=stream.scrollHeight; });

    function configureHeader() {
      const back=document.querySelector("#back-button");
      document.querySelector("#header-title").textContent=profile.remark || person.name;
      document.querySelector("#header-kicker").textContent="BUNNY CHAT";
      back.classList.remove("hidden");
      back.classList.toggle("selection-cancel",ui.selectMode);
      back.textContent=ui.selectMode ? "取消" : "‹";
      back.setAttribute("aria-label",ui.selectMode ? "取消多选" : "返回聊天列表");
      back.onclick=()=>{if(ui.selectMode){ui.selectMode=false;ui.selected.clear();conversation(container,params)}else navigate("chat")};
    }
  };

  function bind(container, params, conv, person, user, profile, messages) {
    container.querySelector("[data-chat-settings]").onclick=()=>navigate("chat-settings",{personId:person.id,conversationId:conv.id});
    const topAvatar=container.querySelector("[data-profile-card]");
    let singleTimer;
    topAvatar.onclick=()=>{clearTimeout(singleTimer);singleTimer=setTimeout(()=>showProfile(person,profile),260)};
    topAvatar.ondblclick=()=>{clearTimeout(singleTimer);pat(person,profile,conv,container,params)};
    container.querySelectorAll("[data-pat-avatar]").forEach(avatar=>avatar.ondblclick=e=>{e.preventDefault();pat(person,profile,conv,container,params)});
    container.querySelectorAll(".message.char .bubble-v3").forEach(bubble=>bindLongPress(bubble,()=>openMessageMenu(bubble.closest(".message").dataset.messageId,conv,person,container,params)));
    container.querySelectorAll("[data-select-message]").forEach(button=>button.onclick=()=>{const id=button.dataset.selectMessage;if(ui.selected.has(id))ui.selected.delete(id);else ui.selected.add(id);renderAgain(container,params)});
    container.querySelector("[data-selection-delete]")?.addEventListener("click",()=>deleteSelected(conv,container,params));
    container.querySelector("[data-selection-forward]")?.addEventListener("click",()=>forwardSelected(conv,person,container,params));
    const form=container.querySelector("[data-composer]");
    if(form){
      form.onsubmit=e=>{e.preventDefault();submitMessage(true,form,conv,person,profile,container,params)};
      form.querySelector("[data-send-only]").onclick=()=>submitMessage(false,form,conv,person,profile,container,params);
      form.querySelector("[data-plus]").onclick=()=>openAttachmentMenu(conv,container,params);
      form.querySelector("[data-cancel-quote]")?.addEventListener("click",()=>{ui.quoteId="";renderAgain(container,params)});
    }
  }

  function renderAgain(container,params){createConversationV3RendererRenderHack(container,params)}
  let activeRender=null;
  function createConversationV3RendererRenderHack(container,params){activeRender?.(container,params)}

  async function submitMessage(sendAi,form,conv,person,profile,container,params){
    const input=form.elements.message,text=input.value.trim();if(!text)return;
    const replyTo=ui.quoteId||"",now=timeNow();
    store.update(s=>{s.messages[conv.id].push({id:id(),role:"user",type:"text",text,time:now,replyTo});const c=conversationById(s,conv.id);c.preview=text;c.time=now});
    ui.quoteId=""; input.value=""; activeRender(container,params);
    if(!sendAi)return;
    const current=store.getState(),model=current.modelProfiles.find(x=>x.id===current.activeModelProfileId);
    updateIsland(`${person.name} 正在回复…`,true);
    try{
      const p=current.presets.find(x=>x.id===profile.presetId)||current.presets.find(x=>x.name===profile.preset);
      const books=current.worldbooks.filter(x=>(profile.worldbookIds||[]).includes(x.id)||x.name===profile.worldbook);
      const prompt=[p?.prompt,...books.map(x=>x.prompt)].filter(Boolean).join("\n\n");
      const reply=await sendToModel(model,current.messages[conv.id],prompt);
      store.update(s=>s.messages[conv.id].push({id:id(),role:"char",type:"text",text:reply,time:timeNow()}));activeRender(container,params);
    }catch(error){showToast(error.message)}finally{updateIsland("bunny 正在陪你",false)}
  }

  function openMessageMenu(messageId,conv,person,container,params){
    const state=store.getState(),message=state.messages[conv.id].find(x=>x.id===messageId);
    const recent=(state.chatAppearance.recentReactions||DEFAULT_REACTIONS).slice(0,6);
    openSheet(`<div class="message-action-menu"><div class="tapback-row">${recent.map(emoji=>`<button data-reaction="${emoji}" aria-label="${emoji}">${emoji}</button>`).join("")}<button class="tapback-more" data-more-emoji aria-label="更多表情">＋</button></div>
      <div class="message-menu-preview">${escapeHtml(message.text)}</div>
      <div class="message-action-list">
        <button data-quote>${menuIcon("quote")}<span><strong>引用回复</strong><small>在输入框上方显示这条消息</small></span></button>
        <button data-edit>${menuIcon("edit")}<span><strong>编辑</strong><small>修改文字或消息类型</small></span></button>
        <button data-multi>${menuIcon("multi")}<span><strong>多选</strong><small>删除或合并转发消息</small></span></button>
      </div></div>`,{onReady(sheet){
        sheet.querySelectorAll("[data-reaction]").forEach(b=>b.onclick=()=>applyReaction(b.dataset.reaction,messageId,conv,container,params));
        sheet.querySelector("[data-more-emoji]").onclick=()=>openEmojiPicker(emoji=>applyReaction(emoji,messageId,conv,container,params));
        sheet.querySelector("[data-quote]").onclick=()=>{ui.quoteId=messageId;closeSheet();activeRender(container,params);requestAnimationFrame(()=>container.querySelector("textarea")?.focus())};
        sheet.querySelector("[data-edit]").onclick=()=>openEditor(messageId,conv,container,params);
        sheet.querySelector("[data-multi]").onclick=()=>{ui.selectMode=true;ui.selected=new Set([messageId]);closeSheet();activeRender(container,params)};
      }});
  }

  function applyReaction(emoji,messageId,conv,container,params){store.update(s=>{const m=s.messages[conv.id].find(x=>x.id===messageId);m.reaction=m.reaction===emoji?"":emoji;s.chatAppearance.recentReactions=[emoji,...(s.chatAppearance.recentReactions||DEFAULT_REACTIONS).filter(x=>x!==emoji)].slice(0,6)});closeSheet();activeRender(container,params)}
  function openEmojiPicker(select){const names=Object.keys(EMOJI_GROUPS);openSheet(`<div class="emoji-picker"><div class="sheet-title"><h3>选择表情</h3><button class="button ghost" data-sheet-close>关闭</button></div><div class="emoji-tabs">${names.map((x,i)=>`<button class="${i===0?"active":""}" data-emoji-tab="${x}">${x}</button>`).join("")}</div><div class="emoji-grid" data-emoji-grid>${EMOJI_GROUPS[names[0]].map(x=>`<button data-emoji="${x}">${x}</button>`).join("")}</div></div>`,{onReady(sheet){const grid=sheet.querySelector("[data-emoji-grid]");const bind=()=>grid.querySelectorAll("[data-emoji]").forEach(b=>b.onclick=()=>select(b.dataset.emoji));bind();sheet.querySelectorAll("[data-emoji-tab]").forEach(tab=>tab.onclick=()=>{sheet.querySelectorAll("[data-emoji-tab]").forEach(x=>x.classList.toggle("active",x===tab));grid.innerHTML=EMOJI_GROUPS[tab.dataset.emojiTab].map(x=>`<button data-emoji="${x}">${x}</button>`).join("");bind()})}})}

  function openEditor(messageId,conv,container,params){const m=store.getState().messages[conv.id].find(x=>x.id===messageId);let type=m.type||"text";openSheet(`<div class="message-editor"><div class="sheet-title"><h3>编辑 CHAR 消息</h3><button class="button ghost" data-sheet-close>取消</button></div><div class="message-type-row">${Object.entries(TYPE_META).map(([key,val])=>`<button class="${type===key?"active":""}" data-message-type="${key}"><span>${val[1]}</span>${val[0]}</button>`).join("")}</div><label class="field"><span>消息内容</span><textarea data-edit-text rows="5">${escapeHtml(m.text)}</textarea></label><button class="button" data-save-edit>保存修改</button></div>`,{onReady(sheet){sheet.querySelectorAll("[data-message-type]").forEach(b=>b.onclick=()=>{type=b.dataset.messageType;sheet.querySelectorAll("[data-message-type]").forEach(x=>x.classList.toggle("active",x===b))});sheet.querySelector("[data-save-edit]").onclick=()=>{const text=sheet.querySelector("[data-edit-text]").value.trim();if(!text)return showToast("消息内容不能为空");store.update(s=>Object.assign(s.messages[conv.id].find(x=>x.id===messageId),{text,type,edited:true}));closeSheet();activeRender(container,params);showToast("消息已编辑")}}})}

  function deleteSelected(conv,container,params){if(!ui.selected.size)return;confirmDialog("删除消息",`确定删除选中的 ${ui.selected.size} 条消息吗？此操作无法撤销。`,"删除",()=>{store.update(s=>s.messages[conv.id]=s.messages[conv.id].filter(x=>!ui.selected.has(x.id)));ui.selected.clear();ui.selectMode=false;activeRender(container,params);showToast("消息已删除")})}
  function forwardSelected(conv,person,container,params){if(!ui.selected.size)return;const state=store.getState(),targets=state.conversations.filter(x=>x.id!==conv.id);openSheet(`<div class="forward-confirm"><div class="sheet-title"><h3>合并转发</h3><button class="button ghost" data-sheet-close>取消</button></div><p class="callout">将 ${ui.selected.size} 条消息合并成一份聊天记录。请选择接收人，确认后发送。</p><div class="forward-targets">${targets.map(c=>{const p=personById(state,c.personId);return`<label><input type="radio" name="forwardTarget" value="${c.id}">${initialsAvatar(p,state.chatProfiles[p.id]||{})}<span>${escapeHtml(p.name)}</span></label>`}).join("")||"<p>暂无其他联系人</p>"}</div><button class="button" data-confirm-forward>确认转发</button></div>`,{onReady(sheet){sheet.querySelector("[data-confirm-forward]").onclick=()=>{const target=sheet.querySelector('input[name="forwardTarget"]:checked');if(!target)return showToast("请选择接收人");const bundle=store.getState().messages[conv.id].filter(x=>ui.selected.has(x.id)).map(x=>({role:x.role,text:x.text,type:x.type||"text",time:x.time}));store.update(s=>s.messages[target.value].push({id:id(),role:"user",type:"chat-record",text:`与${person.name}的聊天记录`,time:timeNow(),bundle}));closeSheet();ui.selected.clear();ui.selectMode=false;activeRender(container,params);showToast("聊天记录已合并转发")}}})}

  function confirmDialog(title,text,action,done){openSheet(`<div class="confirm-dialog"><div class="confirm-symbol">!</div><h3>${title}</h3><p>${text}</p><div class="row"><button class="button secondary" data-sheet-close>取消</button><button class="button danger-button" data-confirm>${action}</button></div></div>`,{onReady(sheet){sheet.querySelector("[data-confirm]").onclick=()=>{closeSheet();done()}}})}
  function pat(person,profile,conv,container,params){const text=profile.patText||`你拍了拍${person.name}`;store.update(s=>s.messages[conv.id].push({id:id(),role:"system",type:"pat",text,time:timeNow()}));navigator.vibrate?.(18);showToast(text);activeRender(container,params)}
  function showProfile(person,profile){openSheet(`<div class="sheet-handle"></div><section class="profile-card">${initialsAvatar(person,profile)}<div><span class="eyebrow">BUNNY CHAT CARD</span><h3>${escapeHtml(person.name)}</h3><p>${escapeHtml(person.signature||person.note)}</p></div></section><button class="button" data-sheet-close>完成</button>`)}
  function openAttachmentMenu(conv,container,params){
    openSheet(`<div class="attachment-grid">${[["image","▧","图片"],["camera","◉","拍摄"],["voice","◖","语音"],["location","⌖","位置"],["redpacket","礼","红包"],["transfer","¥","转账"],["file","□","文件"]].map(x=>`<button data-attachment="${x[0]}"><span>${x[1]}</span>${x[2]}</button>`).join("")}</div>`,{onReady(sheet){sheet.querySelectorAll("[data-attachment]").forEach(b=>b.onclick=()=>handleAttachment(b.dataset.attachment))}});
    const add=(type,text)=>{store.update(s=>s.messages[conv.id].push({id:id(),role:"user",type,text,time:timeNow()}));closeSheet();activeRender(container,params)};
    function handleAttachment(type){
      if(["image","camera","file"].includes(type)){const input=document.createElement("input");input.type="file";input.accept=type==="file"?"*/*":"image/*";if(type==="camera")input.capture="environment";input.onchange=()=>{const file=input.files?.[0];if(file)add(type==="file"?"text":"image",`[${type==="file"?"文件":"图片"}] ${file.name}`)};input.click();return}
      if(type==="voice"){navigator.mediaDevices?.getUserMedia({audio:true}).then(stream=>{stream.getTracks().forEach(t=>t.stop());add("voice","[语音] 00:03")}).catch(()=>showToast("未获得麦克风权限"));return}
      if(type==="location"){if(!navigator.geolocation)return showToast("当前浏览器不支持定位");navigator.geolocation.getCurrentPosition(pos=>add("location",`[位置] ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`),()=>showToast("未获得定位权限"));return}
      if(type==="redpacket"||type==="transfer"){const amount=prompt(`${TYPE_META[type][0]}金额`,"52.00");if(amount)add(type,`[${TYPE_META[type][0]}] ¥${amount}`)}
    }
  }

  activeRender=conversation;
  return conversation;
}

function messageView(message,continuation,person,user,profile,appearance,messages,ui){
  if(message.role==="system")return `<article class="system-message-v3">${escapeHtml(message.text)}</article>`;
  const isUser=message.role==="user",owner=isUser?user:person,avatarProfile=isUser?{avatarUrl:user.avatarUrl||""}:profile,hide=isUser&&appearance.hideUserAvatar;
  const quote=message.replyTo?messages.find(x=>x.id===message.replyTo):null;
  const select=ui.selectMode&&!isUser?`<button class="select-circle ${ui.selected.has(message.id)?"checked":""}" data-select-message="${message.id}" aria-label="选择消息"></button>`:"";
  const avatar=hide?"":`<div class="message-avatar-v3 ${continuation?"invisible":""}" ${isUser?"":"data-pat-avatar"}>${initialsAvatar(owner,avatarProfile)}</div>`;
  return `<article class="message ${message.role} ${continuation?"continuation":""}" data-message-id="${message.id}">${select}${avatar}<div class="message-body-v3"><div class="bubble-v3">${quote?`<div class="inline-quote"><strong>${quote.role==="user"?escapeHtml(user.name):escapeHtml(person.name)}</strong><span>${escapeHtml(quote.text)}</span></div>`:""}${messageContent(message)}</div>${message.reaction?`<button class="message-reaction-v3">${message.reaction}</button>`:""}<time>${message.time}${message.edited?" · 已编辑":""}</time></div></article>`;
}
function messageContent(message){if(message.type==="chat-record")return`<div class="chat-record-card"><strong>💬 ${escapeHtml(message.text)}</strong><span>${message.bundle?.length||0} 条消息</span><small>${(message.bundle||[]).slice(0,3).map(x=>escapeHtml(x.text)).join(" · ")}</small></div>`;if(message.type&&message.type!=="text")return`<div class="typed-message"><span>${TYPE_META[message.type]?.[1]||"□"}</span><div><small>${TYPE_META[message.type]?.[0]||"消息"}</small><strong>${escapeHtml(message.text)}</strong></div></div>`;return escapeHtml(message.text)}
function composerView(quote){return `<div class="composer-shell-v3">${quote?`<div class="composer-quote"><div><strong>回复</strong><span>${escapeHtml(quote.text)}</span></div><button data-cancel-quote aria-label="取消引用">×</button></div>`:""}<form class="composer-v3" data-composer><button type="button" data-plus aria-label="更多">＋</button><textarea name="message" rows="1" placeholder="iMessage" aria-label="消息"></textarea><button type="button" data-send-only aria-label="仅发送">↑</button><button class="ai-send-v3" aria-label="发送并让 AI 回复">AI</button></form></div>`}
function selectionBar(count){return`<nav class="selection-toolbar"><button data-selection-delete ${count?"":"disabled"}>⌫<span>删除</span></button><strong>${count?`已选择 ${count} 条`:"选择消息"}</strong><button data-selection-forward ${count?"":"disabled"}>↗<span>转发</span></button></nav>`}
function backgroundStyle(url){return url?`background-image:linear-gradient(rgba(246,246,244,.72),rgba(246,246,244,.72)),url('${escapeHtml(url)}');background-size:cover;background-position:center`:""}
function bindLongPress(element,callback){let timer,x=0,y=0;element.onpointerdown=e=>{x=e.clientX;y=e.clientY;timer=setTimeout(()=>{navigator.vibrate?.(12);callback()},460)};element.onpointermove=e=>{if(Math.abs(e.clientX-x)>8||Math.abs(e.clientY-y)>8)clearTimeout(timer)};element.onpointerup=element.onpointercancel=()=>clearTimeout(timer)}
function menuIcon(type){const d={quote:'M7 11h11a5 5 0 0 1 5 5v3M7 11l4-4m-4 4 4 4',edit:'M5 21l4-.8L21 6.2 17.8 3 4 16.2 5 21Z',multi:'M8 7h14v14H8zM3 3h14v4M3 3v14h5'}[type];return`<svg viewBox="0 0 26 26" aria-hidden="true"><path d="${d}"/></svg>`}
function timeNow(){return new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit",hour12:false})}
function id(){return crypto.randomUUID?.()||`m-${Date.now()}-${Math.random().toString(16).slice(2)}`}
