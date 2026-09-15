import { conversationById, personById } from "./core/store.js";
import { escapeHtml, initialsAvatar, showToast, updateIsland, openSheet, closeSheet } from "./core/ui.js";
import { sendToModel } from "./integrations/ai-client.js";
import { walletDebit, walletCredit, ensureWallet, insufficientSheet } from "./wallet-v2.js";
import { ensureCallPrompts, extractChatActions } from "./call-prompts.js";

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
  location:["位置","⌖"], voice:["语音","◖"], sticker:["表情包","☺"], file:["文件","□"], "text-image":["文字图","文"]
};

export function createConversationV3Renderer({ store, navigate }) {
  const ui = { conversationId:"", quoteId: "", selectMode: false, selected: new Set(), attachmentsOpen:false };

  function conversation(container, params = {}) {
    const state = store.getState();
    const conv = conversationById(state, params.id || "conv-jun");
    if (!conv) return navigate("chat");
    if(ui.conversationId!==conv.id){ui.conversationId=conv.id;ui.quoteId="";ui.selectMode=false;ui.selected.clear();ui.attachmentsOpen=false}
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
        <div class="chat-contact-actions"><button data-start-call="voice" aria-label="语音通话">${callIcon(false)}</button><button data-start-call="video" aria-label="视频通话">${callIcon(true)}</button><button class="chat-more" data-chat-settings aria-label="聊天设置">•••</button></div>
      </header>
      <div class="chat-stream-v3" data-stream>${messages.map((message,index,list)=>messageView(message,index>0&&list[index-1].role===message.role,person,user,profile,appearance,messages,ui)).join("")}</div>
      ${ui.selectMode ? selectionBar(ui.selected.size) : composerView(quoted,ui.attachmentsOpen)}
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
    container.querySelectorAll("[data-start-call]").forEach(button=>button.onclick=()=>navigate("call",{id:conv.id,mode:button.dataset.startCall}));
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
      form.querySelector("[data-plus]").onclick=()=>{ui.attachmentsOpen=!ui.attachmentsOpen;activeRender(container,params)};
      container.querySelectorAll("[data-fold-action]").forEach(button=>button.onclick=()=>handleFoldAction(button.dataset.foldAction,conv,person,container,params));
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
      const prompt=[p?.prompt,...books.map(x=>x.prompt),ensureCallPrompts(current).chatActions].filter(Boolean).join("\n\n");
      const modelMessages=current.messages[conv.id].map(m=>profile.visionEnabled?m:{...m,src:""});
      const raw=await sendToModel(model,modelMessages,prompt),parsed=extractChatActions(raw);
      store.update(s=>{if(parsed.clean)s.messages[conv.id].push({id:id(),role:"char",type:"text",text:parsed.clean,time:timeNow()})});
      for(const action of parsed.actions){const kind=action.kind==="redpacket"&&action.amount>520?"transfer":action.kind,messageId=id();store.update(s=>s.messages[conv.id].push({id:messageId,role:"char",type:kind,text:action.note||(kind==="redpacket"?"大吉大利":"转账给你"),amount:action.amount,time:timeNow()}));walletCredit(store,{amount:action.amount,kind,title:`收到 ${person.name} 的${kind==="redpacket"?"红包":"转账"}`,conversationId:conv.id,messageId,note:action.note})}
      activeRender(container,params);
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
  function handleFoldAction(action,conv,person,container,params){
    if(action==="call"||action==="video")return navigate("call",{id:conv.id,mode:action==="video"?"video":"voice"});
    if(action==="album"||action==="camera"){const input=document.createElement("input");input.type="file";input.accept="image/*";if(action==="camera")input.capture="environment";input.onchange=async()=>{const file=input.files?.[0];if(!file)return;const src=await readAsDataUrl(file);sendRich(conv,{type:"image",text:file.name,src,description:`用户发送的照片：${file.name}`},container,params)};input.click();return}
    if(action==="text-image")return openTextImage(conv,container,params);
    if(action==="redpacket"||action==="transfer")return openMoney(action,conv,person,container,params);
    if(action==="sticker")return openUserStickers(conv,container,params);
  }
  function sendRich(conv,data,container,params){store.update(s=>s.messages[conv.id].push({id:id(),role:"user",time:timeNow(),...data}));ui.attachmentsOpen=false;activeRender(container,params)}
  function openTextImage(conv,container,params){openSheet(`<div class="sheet-title"><h3>制作文字图</h3><button class="button ghost" data-sheet-close>取消</button></div><label class="field"><span>文字内容</span><textarea data-text-image rows="5" maxlength="120" placeholder="写一句想做成图片的话"></textarea></label><button class="button" data-create-text-image>生成并发送</button>`,{onReady(sheet){sheet.querySelector("[data-create-text-image]").onclick=()=>{const text=sheet.querySelector("[data-text-image]").value.trim();if(!text)return showToast("请输入文字");const canvas=document.createElement("canvas");canvas.width=900;canvas.height=675;const ctx=canvas.getContext("2d"),glass=document.querySelector("#phone-root").dataset.theme==="glass";const grad=ctx.createLinearGradient(0,0,900,675);grad.addColorStop(0,glass?"#dce7eb":"#f7f7f4");grad.addColorStop(1,glass?"#9eafb7":"#ddddda");ctx.fillStyle=grad;ctx.fillRect(0,0,900,675);ctx.fillStyle="#111";ctx.font='600 46px -apple-system,"PingFang SC",sans-serif';ctx.textAlign="center";wrapCanvas(ctx,text,450,300,700,70);ctx.font='24px -apple-system,"PingFang SC"';ctx.fillText("BUNNY BUNNY",450,600);const src=canvas.toDataURL("image/jpeg",.88);closeSheet();sendRich(conv,{type:"text-image",text,src,description:`文字图：${text}`},container,params)}}})}
  function openMoney(kind,conv,person,container,params){const wallet=ensureWallet(store.getState()),red=kind==="redpacket";openSheet(`<div class="money-form-head"><span>钱包余额 ¥${wallet.balance.toFixed(2)}</span><strong>${red?"发红包":"转账给"+escapeHtml(person.name)}</strong></div><label class="field"><span>金额${red?"（最高 ¥520）":""}</span><div class="money-input"><span>¥</span><input data-money type="number" min="0.01" step="0.01" ${red?'max="520"':""} inputmode="decimal" placeholder="0.00"></div></label><label class="field"><span>${red?"红包备注":"转账说明"}</span><input data-money-note maxlength="30" placeholder="${red?"大吉大利":"转账给你"}"></label><button class="button" data-send-money>确认发送</button>`,{onReady(sheet){sheet.querySelector("[data-send-money]").onclick=()=>{const amount=Math.round(Number(sheet.querySelector("[data-money]").value)*100)/100,note=sheet.querySelector("[data-money-note]").value.trim()||(red?"大吉大利":"转账给你");if(!amount||amount<=0)return showToast("请输入有效金额");if(red&&amount>520){closeSheet();openSheet(`<div class="confirm-dialog"><div class="confirm-symbol">¥</div><h3>红包限额 ¥520</h3><p>超过 ¥520 的金额只能使用转账发送。</p><div class="row"><button class="button secondary" data-sheet-close>取消</button><button class="button" data-switch-transfer>改为转账</button></div></div>`,{onReady(s){s.querySelector("[data-switch-transfer]").onclick=()=>{closeSheet();openMoney("transfer",conv,person,container,params)}}});return}const messageId=id();if(!walletDebit(store,{amount,kind,title:`发给 ${person.name} 的${red?"红包":"转账"}`,conversationId:conv.id,messageId,note})){insufficientSheet();return}store.update(s=>s.messages[conv.id].push({id:messageId,role:"user",type:kind,text:note,amount,time:timeNow()}));closeSheet();ui.attachmentsOpen=false;activeRender(container,params);showToast(red?"红包已发送":"转账已发送")}}})}
  function openUserStickers(conv,container,params){const state=store.getState();if(!state.stickerLibraries.user)store.update(s=>s.stickerLibraries.user=[]);const items=store.getState().stickerLibraries.user;openSheet(`<div class="sheet-title"><h3>我的表情包</h3><button class="button ghost" data-manage-user-stickers>管理</button></div><div class="sticker-library">${items.map((x,i)=>`<button class="sticker-tile" data-user-sticker="${i}"><img src="${escapeHtml(x.url)}" alt=""><span>${escapeHtml(x.description||x.name||"表情")}</span></button>`).join("")||'<p class="callout">先上传自己的表情包；它不会与 CHAR 表情库混用。</p>'}</div>`,{onReady(sheet){sheet.querySelector("[data-manage-user-stickers]").onclick=()=>openStickerImporter(conv,container,params);sheet.querySelectorAll("[data-user-sticker]").forEach(b=>b.onclick=()=>{const x=items[Number(b.dataset.userSticker)];closeSheet();sendRich(conv,{type:"sticker",text:x.name||"表情包",src:x.url,description:x.description||"用户发送的表情包"},container,params)})}})}
  function openStickerImporter(conv,container,params){openSheet(`<div class="sheet-title"><h3>导入 USER 表情包</h3><button class="button ghost" data-sheet-close>关闭</button></div><label class="media-upload-trigger"><span class="upload-glyph">＋</span><span><strong>从相册多选</strong><small>导入后逐张填写描述</small></span><input type="file" accept="image/*" multiple data-local-stickers hidden></label><label class="field"><span>图床批量导入</span><textarea data-sticker-urls rows="6" placeholder="每行：图片URL | 内容描述"></textarea></label><button class="button" data-import-sticker-urls>导入图床表情</button>`,{onReady(sheet){sheet.querySelector("[data-local-stickers]").onchange=async e=>{const files=[...e.target.files].slice(0,30),rows=await Promise.all(files.map(async file=>({name:file.name,url:await readAsDataUrl(file),description:file.name.replace(/\.[^.]+$/,"")})));openStickerDescriptions(rows,conv,container,params)};sheet.querySelector("[data-import-sticker-urls]").onclick=()=>{const rows=sheet.querySelector("[data-sticker-urls]").value.split(/\r?\n/).map(line=>{const [url,description]=line.split("|").map(x=>x.trim());return /^https?:\/\//.test(url)?{name:"图床表情",url,description:description||"用户上传的表情包"}:null}).filter(Boolean);if(!rows.length)return showToast("没有有效的图床地址");store.update(s=>{s.stickerLibraries.user=s.stickerLibraries.user||[];s.stickerLibraries.user.push(...rows)});closeSheet();openUserStickers(conv,container,params)}}})}
  function openStickerDescriptions(rows,conv,container,params){openSheet(`<div class="sheet-title"><h3>补充表情描述</h3><span>${rows.length} 张</span></div><div class="stack sticker-description-list">${rows.map((x,i)=>`<label class="field"><span>${escapeHtml(x.name)}</span><input data-sticker-desc="${i}" value="${escapeHtml(x.description)}" placeholder="例如：开心地挥手"></label>`).join("")}</div><button class="button" data-save-local-stickers>保存到 USER 表情库</button>`,{onReady(sheet){sheet.querySelector("[data-save-local-stickers]").onclick=()=>{rows.forEach((x,i)=>x.description=sheet.querySelector(`[data-sticker-desc="${i}"]`).value.trim()||"用户上传的表情包");store.update(s=>{s.stickerLibraries.user=s.stickerLibraries.user||[];s.stickerLibraries.user.push(...rows)});closeSheet();openUserStickers(conv,container,params)}}})}
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
function messageContent(message){
  if(message.type==="chat-record")return`<div class="chat-record-card"><strong>💬 ${escapeHtml(message.text)}</strong><span>${message.bundle?.length||0} 条消息</span><small>${(message.bundle||[]).slice(0,3).map(x=>escapeHtml(x.text)).join(" · ")}</small></div>`;
  if(message.type==="image")return`<figure class="image-message"><img src="${escapeHtml(message.src||"")}" alt="${escapeHtml(message.description||"聊天图片")}">${message.text?`<figcaption>${escapeHtml(message.text)}</figcaption>`:""}</figure>`;
  if(message.type==="text-image")return`<div class="text-image-message">${escapeHtml(message.text)}</div>`;
  if(message.type==="redpacket"||message.type==="transfer")return`<article class="money-card ${message.type}"><header><span class="money-symbol">${message.type==="redpacket"?"礼":"¥"}</span><div><strong>${escapeHtml(message.text|| (message.type==="redpacket"?"大吉大利":"转账给你"))}</strong><small>${message.role==="char"?"来自 CHAR":"发给 CHAR"}</small></div></header><div class="amount">¥${Number(message.amount||0).toFixed(2)}</div><footer>${message.type==="redpacket"?"Bunny 红包":"Bunny 转账"}</footer></article>`;
  if(message.type==="sticker")return`<div class="sticker-message"><img src="${escapeHtml(message.src||"")}" alt="${escapeHtml(message.description||"表情包")}"><small>${escapeHtml(message.description||"")}</small></div>`;
  if(message.type==="voice")return`<div class="voice-message"><span class="voice-wave"><i></i><i></i><i></i><i></i></span><strong>${escapeHtml(message.text||"语音消息")}</strong></div>`;
  if(message.type==="location")return`<div class="location-message"><strong>${escapeHtml(message.text||"共享位置")}</strong><div class="location-map"></div></div>`;
  if(message.type==="file")return`<div class="file-message"><span>DOC</span><strong>${escapeHtml(message.text||"文件")}</strong></div>`;
  if(message.type&&message.type!=="text")return`<div class="typed-message"><span>${TYPE_META[message.type]?.[1]||"□"}</span><div><small>${TYPE_META[message.type]?.[0]||"消息"}</small><strong>${escapeHtml(message.text)}</strong></div></div>`;
  return escapeHtml(message.text)
}
function composerView(quote,open){const actions=[["camera","camera","拍摄"],["album","image","照片"],["text-image","text","文字图"],["redpacket","gift","红包"],["transfer","money","转账"],["sticker","smile","表情包"],["call","phone","语音通话"],["video","video","视频通话"]];return `<div class="composer-shell-v3 ${open?"attachments-open":""}">${quote?`<div class="composer-quote"><div><strong>回复</strong><span>${escapeHtml(quote.text)}</span></div><button data-cancel-quote aria-label="取消引用">×</button></div>`:""}<div class="folded-attachments"><div>${actions.map(x=>`<button type="button" data-fold-action="${x[0]}">${foldIcon(x[1])}<span>${x[2]}</span></button>`).join("")}</div></div><form class="composer-v3" data-composer><button type="button" data-plus aria-label="展开更多功能">${open?"×":"＋"}</button><textarea name="message" rows="1" placeholder="iMessage" aria-label="消息"></textarea><button type="button" class="send-icon" data-send-only aria-label="仅发送">${sendIcon()}</button><button class="ai-send-v3" aria-label="发送并让 AI 回复">${sparkIcon()}</button></form></div>`}
function selectionBar(count){return`<nav class="selection-toolbar"><button data-selection-delete ${count?"":"disabled"}>⌫<span>删除</span></button><strong>${count?`已选择 ${count} 条`:"选择消息"}</strong><button data-selection-forward ${count?"":"disabled"}>↗<span>转发</span></button></nav>`}
function backgroundStyle(url){return url?`background-image:linear-gradient(rgba(246,246,244,.72),rgba(246,246,244,.72)),url('${escapeHtml(url)}');background-size:cover;background-position:center`:""}
function bindLongPress(element,callback){let timer,x=0,y=0;element.onpointerdown=e=>{x=e.clientX;y=e.clientY;timer=setTimeout(()=>{navigator.vibrate?.(12);callback()},460)};element.onpointermove=e=>{if(Math.abs(e.clientX-x)>8||Math.abs(e.clientY-y)>8)clearTimeout(timer)};element.onpointerup=element.onpointercancel=()=>clearTimeout(timer)}
function menuIcon(type){const d={quote:'M7 11h11a5 5 0 0 1 5 5v3M7 11l4-4m-4 4 4 4',edit:'M5 21l4-.8L21 6.2 17.8 3 4 16.2 5 21Z',multi:'M8 7h14v14H8zM3 3h14v4M3 3v14h5'}[type];return`<svg viewBox="0 0 26 26" aria-hidden="true"><path d="${d}"/></svg>`}
function foldIcon(type){const d={camera:'<path d="M4 8h4l2-3h4l2 3h4v11H4z"/><circle cx="12" cy="13" r="3"/>',image:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="m5 18 5-5 3 3 3-3 4 4"/>',text:'<path d="M5 6h14M12 6v13M8 19h8"/>',gift:'<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M12 9v11M3 9h18v-3H3zM12 6c-4 0-5-4-2-4 2 0 2 4 2 4Zm0 0c4 0 5-4 2-4-2 0-2 4-2 4Z"/>',money:'<circle cx="12" cy="12" r="9"/><path d="M8 9h8m-4-3v12m-4-3h8"/>',smile:'<circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/><path d="M8 15c2 2 6 2 8 0"/>',phone:'<path d="M7 4 4 6c1 8 6 13 14 14l2-3-5-3-2 2c-2-1-4-3-5-5l2-2-3-5Z"/>',video:'<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/>'}[type]||"";return`<svg viewBox="0 0 24 24">${d}</svg>`}
function sendIcon(){return'<svg viewBox="0 0 24 24"><path d="m5 12 14-7-4 14-3-5-7-2Z"/><path d="m12 14 7-9"/></svg>'}
function sparkIcon(){return'<svg viewBox="0 0 24 24"><path d="M12 3c.7 4.3 2.7 6.3 7 7-4.3.7-6.3 2.7-7 7-.7-4.3-2.7-6.3-7-7 4.3-.7 6.3-2.7 7-7Z"/><path d="M18 16c.3 1.7 1.3 2.7 3 3-1.7.3-2.7 1.3-3 3-.3-1.7-1.3-2.7-3-3 1.7-.3 2.7-1.3 3-3Z"/></svg>'}
function callIcon(video){return video?foldIcon("video"):foldIcon("phone")}
function readAsDataUrl(file){return new Promise((resolve,reject)=>{if(file.size>5*1024*1024)return reject(Error("请选择 5MB 以内文件"));const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error("文件读取失败"));r.readAsDataURL(file)})}
function wrapCanvas(ctx,text,x,y,maxWidth,lineHeight){const chars=[...text];let line="",lines=[];for(const char of chars){if(ctx.measureText(line+char).width>maxWidth){lines.push(line);line=char}else line+=char}if(line)lines.push(line);const start=y-(lines.length-1)*lineHeight/2;lines.slice(0,6).forEach((value,i)=>ctx.fillText(value,x,start+i*lineHeight))}
function timeNow(){return new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit",hour12:false})}
function id(){return crypto.randomUUID?.()||`m-${Date.now()}-${Math.random().toString(16).slice(2)}`}
