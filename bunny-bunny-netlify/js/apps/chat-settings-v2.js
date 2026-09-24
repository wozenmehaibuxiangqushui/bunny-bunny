import { applyConversationSkin, normalizeSkin } from "../chat-skins.js";
import { mountChatPresetManager } from "../appearance-controls.js";
import { personById } from "../core/store.js";
import { escapeHtml, initialsAvatar, showToast, openSheet, closeSheet } from "../core/ui.js";
import { ttsLanguageOptions } from "../tts-providers.js";
import { saveMediaBlob } from "../media-store.js";
import { memoryProfile, clearCharacterMemory } from "../memory-engine.js";
import { ensureAccountState, accountContext } from "../account-system.js";
import { ROUTINE_CHOICES, ensureDailySchedule, saveSchedulePlan } from '../schedule-engine.js';
const moods=["自动","平静","开心","温柔","害羞","悲伤","生气","激动","疲惫","低语"];
const interfaceSample=".chat-layout {\n  background: transparent;\n}\n.chat-stream {\n  padding-inline: .15rem;\n}\n.chat-person {\n  backdrop-filter: blur(16px);\n}";
const bubbleSample=".message .bubble {\n  border-radius: 18px;\n  padding: 10px 13px;\n}\n.message.user .bubble {\n  background: #111111;\n  color: #ffffff;\n}";

export function createChatSettingsRenderer({store,navigate}){
return (container,params={})=>{
 container.className='app-view chat-settings-view';
 const personId=params.personId||"char-jun",state=ensureAccountState(store.getState()),person=personById(state,personId),user=personById(state,state.currentUserId),p=state.chatProfiles[personId],a=state.chatAppearance,langs=ttsLanguageOptions(state),memoryOwnerId=accountContext(state,personId,user.id).memoryOwnerId,mem=memoryProfile(state,memoryOwnerId),plan=state.schedulePlans?.[personId]||{routine:'worker',fixed:[],temporary:[]};
 container.innerHTML=`<form class="stack organized-chat-settings" data-form><nav class="settings-jump"><button type="button" data-jump="identity">身份</button><button type="button" data-jump="voice">语音</button><button type="button" data-jump="interaction">互动</button><button type="button" data-jump="appearance">外观</button><button type="button" data-jump="data">数据</button></nav>
 <section class="card">
  ${avatarRow("char",person,p.avatarUrl)}
  ${avatarRow("user",user,user.avatarUrl)}
 </section>
 <div class="section-title" id="settings-identity"><h3>身份、城市与天气</h3><span>CHAR / USER 独立</span></div>
 <section class="card stack">
  <label class="field"><span>聊天备注</span><input name="remark" value="${escapeHtml(p.remark||person.name)}"></label>
  ${cityRow("char","CHAR",person.city||p.charCity,person.cityPrototype||p.cityPrototype,p.weather)}
  ${cityRow("user","USER",user.city||p.userCity,user.cityPrototype||"",user.weather)}
 </section>
 <div class="section-title" id="settings-voice"><h3>TTS 角色朗读</h3><span>当前 CHAR 独立</span></div>
 <section class="card stack">
  <p class="callout">厂商、Key 和模型在“模型与 API → TTS 语音”连接；下面只调整当前角色的表现。</p>
  <label class="field"><span>音色 ID / Voice Name（留空使用模型默认）</span><input name="voiceId" value="${escapeHtml(p.voiceId||"")}" placeholder="Voice ID / Voice Name"></label>
  <label class="field"><span>朗读语言</span><select name="language">${opts(langs,p.language||"中文")}</select></label>
  <label class="field"><span>默认情绪</span><select name="emotion">${opts(moods,p.emotion||"自动")}</select></label>
  <label class="field"><span>角色语速 <output data-speed-out>${Number(p.voiceSpeed||1).toFixed(2)}×</output></span><input name="voiceSpeed" data-speed type="range" min=".5" max="2" step=".05" value="${p.voiceSpeed||1}"></label>
  ${toggle("llmTone","由 LLM 提供语气","开启：模型给出语气；关闭：语音引擎根据正文自行决定",p.llmTone!==false)}
  ${toggle("autoPlayVoice","自动朗读 CHAR 回复","使用当前启用的 TTS 厂商合成",p.autoPlayVoice)}
  <label class="field"><span>语音消息生成方式</span><select name="voiceGenerationMode"><option value="manual" ${p.voiceGenerationMode!=="auto"?"selected":""}>点播放时生成并缓存</option><option value="auto" ${p.voiceGenerationMode==="auto"?"selected":""}>文字回复后自动生成并缓存</option></select></label>
  ${toggle("translationEnabled","显示中文翻译","外语回复会在原文气泡下显示同次生成的中文翻译",p.translationEnabled)}
  <button class="button secondary" type="button" data-open-tts-center>连接或切换 TTS 厂商</button>
 </section>
 <div class="section-title" id="settings-interaction"><h3>模型与互动</h3><span>按当前角色独立保存</span></div>
 <section class="card stack">
  ${toggle("visionEnabled","角色识图","关闭后只读取文字与图片说明",p.visionEnabled)}
  ${toggle("proactive","主动联系","遵守安静时段与每日额度",p.proactive)}
  ${toggle("readReceipts","消息已读","进入聊天后显示已读；符合人设的 CHAR 可能在久未回复时追问",p.readReceipts!==false)}
  ${toggle("stickerSteal","根据人设偷表情包","仅收藏可见对话中的表情",p.stickerSteal)}
  <label class="field"><span>安静时段</span><input name="quietHours" value="${escapeHtml(p.quietHours||"")}"></label>
  <div class="pat-copy-settings"><label class="field"><span>我拍 CHAR 时的文案</span><input name="patText" value="${escapeHtml(p.patText||`你拍了拍${person.name}`)}" placeholder="你拍了拍 CHAR"></label><label class="field"><span>CHAR 拍我时的文案</span><input name="patUserText" value="${escapeHtml(p.patUserText||`${person.name}拍了拍你`)}" placeholder="CHAR 拍了拍你"></label><small>双击聊天头像触发；两条文案分别保存到当前角色。</small></div>
  <div class="sticker-library-settings"><button class="button secondary" type="button" data-char-sticker-import="global"><span>CHAR 通用库</span><small>${state.stickerLibraries.global?.length||0} 张 · 所有角色可用</small></button><button class="button secondary" type="button" data-char-sticker-import="exclusive"><span>${escapeHtml(person.name)} 专属库</span><small>${state.stickerLibraries.characters?.[personId]?.length||0} 张 · 仅当前角色可用</small></button></div>
 </section>
 <div class="section-title"><h3>日常行程</h3><span>只公开当前状态</span></div>
 <section class="card stack schedule-settings"><p class="callout">每天首次互动生成并缓存一份行程。聊天、来电、主动消息和朋友圈共用它；设置只修改作息规则与约定，完整日程不会展示给角色。</p>
   <label class="field"><span>作息模板</span><select name="scheduleRoutine">${ROUTINE_CHOICES.map(([id,label])=>`<option value="${id}" ${plan.routine===id?'selected':''}>${label}</option>`).join('')}</select></label>
   <label class="field"><span>每周固定日程</span><textarea name="scheduleFixed" rows="4" placeholder="每行：星期三 19:00-21:00 加班 @唱片店">${escapeHtml((plan.fixed||[]).map(x=>`星期${'日一二三四五六'[x.weekdays?.[0]??0]} ${x.start}-${x.end} ${x.title}${x.place?` @${x.place}`:''}`).join('\n'))}</textarea></label>
   <label class="field"><span>临时约定</span><textarea name="scheduleTemporary" rows="4" placeholder="每行：2026-09-25 20:00-21:00 一起吃晚饭 @街角餐厅">${escapeHtml((plan.temporary||[]).filter(x=>x.source==='user').map(x=>`${x.date} ${x.start}-${x.end} ${x.title}${x.place?` @${x.place}`:''}`).join('\n'))}</textarea></label>
   <button type="button" class="button secondary" data-schedule-save>保存日程规则</button><small>聊天中提到具体日期与时间的约定，也会写入该日的临时日程；未设模型时按模板确定状态。</small>
 </section>
 <div class="section-title"><h3>记忆与关系成长</h3><span>本机分层记忆库</span></div>
 <section class="card stack memory-settings-card">
  <p class="callout">系统自动区分永久记忆、检索记忆和临时记忆，并整理 USER 小事、计划、承诺、事件、印象、关系与 CHAR 自我认知。</p>
  <div class="row"><label class="field"><span>每 N 轮阶段总结</span><input name="summaryEveryN" type="number" min="2" max="50" value="${mem.summaryEveryN}"></label><label class="field"><span>每 M 轮大总结</span><input name="grandEveryM" type="number" min="10" max="300" value="${mem.grandEveryM}"></label></div>
  <details class="memory-prompt-details"><summary>高级：自定义记忆整理规则</summary><label class="field"><span>阶段整理补充要求</span><textarea name="regularMemoryPrompt" rows="4">${escapeHtml(mem.regularPrompt)}</textarea></label><label class="field"><span>长期大总结补充要求</span><textarea name="grandMemoryPrompt" rows="4">${escapeHtml(mem.grandPrompt)}</textarea></label></details>
  ${toggle("memoryDebugEnabled","提示词测试模式","保存每轮实际发送给对话 API 的完整隐藏提示词与记忆命中结果",mem.memoryDebugEnabled)}
  <button type="button" class="button secondary" data-memory-debug>打开角色记忆档案</button>
 </section>
 <div class="section-title"><h3>CHAR 生图</h3><span>跟随全局生图 API</span></div>
 <section class="card stack character-image-settings">
  ${toggle("imageGenerationEnabled","允许当前 CHAR 生图","关闭时继续使用 1:1 文字图片；开启时调用全局生图 API",Boolean(p.imageGenerationEnabled))}
  <div class="character-face-reference">${p.imageReferenceFace?`<img src="${escapeHtml(p.imageReferenceFace)}" alt="CHAR 生图参考脸">`:initialsAvatar(person,{avatarUrl:p.avatarUrl||person.avatarUrl||""})}<div><strong>生图参考脸</strong><small>仅一张，用于支持参考图的生图模型保持 CHAR 面部一致</small></div></div>
  <div class="row"><button type="button" class="button secondary" data-image-reference>从相册上传</button><button type="button" class="button ghost" data-image-reference-url>使用图床</button></div>
  <label class="field"><span>当前 CHAR 反向提示词补充</span><input name="imageNegativePrompt" value="${escapeHtml(p.imageNegativePrompt||"")}" placeholder="例如：不同发色、五官漂移、多人"></label>
  <button type="button" class="button secondary" data-open-image-api>配置全局生图 API 与提示词</button>
 </section>
 <div class="section-title"><h3>视频通话画面</h3><span>CHAR 背景 / USER 小窗</span></div>
 <section class="card stack call-media-settings"><div class="call-media-preview"><div style="background-image:url('${escapeHtml(p.videoBackground||p.avatarUrl||"")}')"><span>CHAR 背景</span></div><div style="background-image:url('${escapeHtml(p.userVideoPortrait||user.avatarUrl||"")}')"><span>USER 肖像</span></div></div><div class="row"><button type="button" class="button secondary" data-call-media="videoBackground">上传 CHAR 通话背景</button><button type="button" class="button secondary" data-call-media="userVideoPortrait">上传 USER 肖像</button></div><div class="row"><button type="button" class="button ghost" data-call-media-url="videoBackground">CHAR 图床</button><button type="button" class="button ghost" data-call-media-url="userVideoPortrait">USER 图床</button></div></section>
 <div class="section-title"><h3>提示词绑定</h3><span>预设优先于世界书</span></div>
 <section class="card stack">
  <label class="field"><span>预设（一次仅绑定一个）</span><select name="presetId">${state.presets.map(x=>`<option value="${x.id}" ${p.presetId===x.id||p.preset===x.name?"selected":""}>${escapeHtml(x.name)}</option>`).join("")}</select></label>
  <div><span class="label">世界书（可同时绑定多本）</span>${state.worldbooks.map(w=>`<label class="setting-row"><span>${escapeHtml(w.name)}</span><input type="checkbox" name="worldbookIds" value="${w.id}" ${(p.worldbookIds||[]).includes(w.id)||p.worldbook===w.name?"checked":""}></label>`).join("")}</div>
  <button type="button" class="button secondary" data-worldbook>管理世界书</button>
 </section>
 <div class="section-title" id="settings-appearance"><h3>界面 CSS</h3><span>可保存 / 切换预设</span></div>
 <section class="card stack">
  <label class="field"><span>完整聊天界面 CSS</span><textarea class="css-editor" name="interfaceCss" placeholder="${escapeHtml(interfaceSample)}">${escapeHtml(a.interfaceCss||"")}</textarea></label>
  <div class="row"><button type="button" class="button secondary" data-preview>预览</button><button type="button" class="button secondary" data-save-ui>保存预设</button><select data-ui-list><option value="">切换…</option>${a.interfacePresets.map((x,i)=>`<option value="${i}">${escapeHtml(x.name)}</option>`).join("")}</select></div>
 </section>
 <div class="section-title"><h3>气泡编辑器</h3><span>气泡 CSS 优先</span></div>
 <section class="bubble-presets">${[["imessage","iMessage"],["wechat","微信"],["line","LINE"],["kakaotalk","KakaoTalk"],["cloud","Bunny Cloud"],["custom","自定义"]].map(x=>`<button type="button" class="bubble-choice ${normalizeSkin(a.bubblePreset)===x[0]?"selected":""}" data-bubble="${x[0]}">${x[1]}</button>`).join("")}</section>
 <section class="card stack">
  <label class="field color-row"><span>自定义样式的用户气泡颜色</span><input name="bubbleColor" type="color" value="${a.bubbleColor||"#111111"}"></label>
  <label class="field"><span>气泡大小 <output data-scale-out>${Math.round((a.bubbleScale||1)*100)}%</output></span><input name="bubbleScale" data-scale type="range" min=".75" max="1.35" step=".05" value="${a.bubbleScale||1}"></label>
  <label class="field"><span>字体大小</span><input name="fontSize" type="range" min="11" max="21" value="${a.fontSize||14}"></label>
  <label class="field"><span>字体 URL</span><input name="fontUrl" value="${escapeHtml(a.fontUrl||"")}" placeholder="https://…/font.woff2"></label>
  <div class="row"><button type="button" class="button secondary" data-save-font>保存字体预设</button><select data-font-list><option value="">切换…</option>${a.fontPresets.map((x,i)=>`<option value="${i}">${escapeHtml(x.name)}</option>`).join("")}</select></div>
  <label class="field"><span>自定义气泡 CSS</span><textarea class="css-editor" name="bubbleCss" placeholder="${escapeHtml(bubbleSample)}">${escapeHtml(a.bubbleCss||"")}</textarea></label>
 </section>
 <div class="section-title"><h3>聊天背景</h3><span>自动保留历史，可删除</span></div>
 <section class="card stack">
  <div class="row"><label class="button secondary file-button">选择图片<input data-bg type="file" accept="image/*" hidden></label><label class="button secondary file-button">拍摄<input data-camera type="file" accept="image/*" capture="environment" hidden></label><button type="button" class="button secondary" data-bg-url>图床</button></div>
  <label class="field"><span>聊天壁纸可见度</span><input name="backgroundOpacity" type="range" min="0" max="1" step=".01" value="${a.backgroundOpacity??1}"></label><div class="background-history">${a.backgroundHistory.length?a.backgroundHistory.map((bg,i)=>`<div class="background-tile" data-use-bg="${i}" style="background-image:url('${escapeHtml(bg)}')"><button type="button" data-delete-bg="${i}">×</button></div>`).join(""):'<p class="sub">上传后会显示在这里。</p>'}</div>
 </section>
 <section class="card">${toggle("hideUserAvatar","隐藏 USER 头像","连续消息的第二条起始终隐藏头像并与首条气泡对齐",a.hideUserAvatar)}</section>
 <div class="section-title" id="settings-data"><h3>好友与聊天数据</h3><span>危险操作均需二次确认</span></div>
 <section class="card chat-danger-list">
  <button type="button" data-clear-chat><span><strong>清空聊天记录</strong><small>仅清空与当前 CHAR 的消息</small></span><b>›</b></button>
  <button type="button" data-delete-memory><span><strong>删除所有记忆</strong><small>清除与当前 CHAR 有关的内容，仅保留人物设定</small></span><b>›</b></button>
  <button type="button" data-block-char><span><strong>${person.blocked?"解除拉黑":"拉黑 CHAR"}</strong><small>${person.blocked?"恢复正常聊天状态":"保存拉黑状态，后续跨平台联系逻辑暂不启用"}</small></span><b>›</b></button>
  <button type="button" data-delete-friend><span><strong>删除好友</strong><small>从聊天列表移除，角色卡仍保留，可重新添加</small></span><b>›</b></button>
 </section>
 <button class="button" type="submit">保存全部聊天设置</button>
 </form>`;
 const form=container.querySelector("[data-form]");
 container.querySelectorAll("[data-jump]").forEach(button=>button.onclick=()=>container.querySelector(`#settings-${button.dataset.jump}`)?.scrollIntoView({behavior:"smooth",block:"start"}));
 container.querySelectorAll("[data-call-media]").forEach(button=>button.onclick=()=>{const input=document.createElement("input");input.type="file";input.accept="image/*";input.onchange=async()=>{const file=input.files?.[0];if(!file)return;try{const media=await saveMediaBlob(file);store.update(s=>{const target=s.chatProfiles[personId];target[button.dataset.callMedia]=media.src;target[`${button.dataset.callMedia}MediaId`]=media.mediaId});createChatSettingsRenderer({store,navigate})(container,params);showToast("通话画面已保存")}catch(error){showToast(error.message)}};input.click()});
 container.querySelectorAll("[data-call-media-url]").forEach(button=>button.onclick=()=>{const url=prompt("图片图床 URL","https://");if(!/^https?:\/\//.test(url||""))return;store.update(s=>s.chatProfiles[personId][button.dataset.callMediaUrl]=url);createChatSettingsRenderer({store,navigate})(container,params)});
 container.querySelector("[data-memory-debug]").onclick=()=>navigate("memory-debug",{personId,memoryOwnerId,conversationId:params.conversationId});
 container.querySelector("[data-open-image-api]").onclick=()=>navigate("api",{section:"image"});
 container.querySelector("[data-image-reference]").onclick=()=>{const input=document.createElement("input");input.type="file";input.accept="image/*";input.onchange=async()=>{const file=input.files?.[0];if(!file)return;try{const media=await saveMediaBlob(file);store.update(s=>{s.chatProfiles[personId].imageReferenceFace=media.src;s.chatProfiles[personId].imageReferenceFaceMediaId=media.mediaId});createChatSettingsRenderer({store,navigate})(container,params);showToast("参考脸已保存")}catch(error){showToast(error.message)}};input.click()};
 container.querySelector("[data-image-reference-url]").onclick=()=>{const url=prompt("参考脸图床 URL","https://");if(!/^https?:\/\//.test(url||""))return;store.update(s=>s.chatProfiles[personId].imageReferenceFace=url);createChatSettingsRenderer({store,navigate})(container,params)};
 form.elements.voiceSpeed.oninput=e=>container.querySelector("[data-speed-out]").value=Number(e.target.value).toFixed(1)+"×";
 form.elements.bubbleScale.oninput=e=>container.querySelector("[data-scale-out]").value=Math.round(e.target.value*100)+"%";
 container.querySelector('[data-schedule-save]').onclick=()=>{
   const parseLines=(source,kind)=>String(source||'').split(/\r?\n/).map(line=>{const fixed=line.match(/^星期([日一二三四五六])\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\s+(.+)$/),temporary=line.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\s+(.+)$/),found=kind==='fixed'?fixed:temporary;if(!found)return null;const [title,place='']=found[4].split(/\s+@/);return {id:crypto.randomUUID(),...(kind==='fixed'?{weekdays:['日一二三四五六'.indexOf(found[1])]}:{date:found[1]}),start:found[2],end:found[3],title:title.trim(),place:place.trim(),status:kind==='fixed'?'忙碌中':'有约定',availability:'busy',canReply:false,source:'user'}}).filter(Boolean);
   const fixed=parseLines(form.elements.scheduleFixed.value,'fixed'),temporary=parseLines(form.elements.scheduleTemporary.value,'temporary');
   if(fixed.length!==form.elements.scheduleFixed.value.split(/\r?\n/).filter(x=>x.trim()).length||temporary.length!==form.elements.scheduleTemporary.value.split(/\r?\n/).filter(x=>x.trim()).length)return showToast('日程格式有误，请按每行示例填写');
   saveSchedulePlan(store,personId,{routine:form.elements.scheduleRoutine.value,fixed,temporary:[...(store.getState().schedulePlans?.[personId]?.temporary||[]).filter(x=>x.source!=='user'),...temporary]});ensureDailySchedule(store,personId);showToast('行程规则已保存，今日状态已更新');
 };
 container.querySelectorAll("[data-weather]").forEach(b=>b.onclick=()=>weather(b.dataset.weather,form));
 container.querySelectorAll("[data-avatar]").forEach(b=>b.onclick=()=>chooseAvatar(b.dataset.avatar,personId,user.id,container,params));
 container.querySelectorAll("[data-avatar-url]").forEach(b=>b.onclick=()=>urlAvatar(b.dataset.avatarUrl,personId,user.id,container,params));
 container.querySelector("[data-worldbook]").onclick=()=>navigate("worldbook");
 container.querySelectorAll("[data-bubble]").forEach(b=>b.onclick=()=>{store.update(s=>Object.assign(s.chatAppearance,formAppearance(form,a),{bubblePreset:b.dataset.bubble}));createChatSettingsRenderer({store,navigate})(container,params)});
 mountChatPresetManager(container,store,()=>createChatSettingsRenderer({store,navigate})(container,params));
 container.querySelector("[data-preview]").onclick=()=>{applyChatAppearance(formAppearance(form,a));showToast("聊天 CSS 已预览")};
 container.querySelector("[data-save-ui]").onclick=()=>{const name=prompt("界面 CSS 预设名","我的主题");if(name)store.update(s=>s.chatAppearance.interfacePresets.push({name,css:form.elements.interfaceCss.value}));createChatSettingsRenderer({store,navigate})(container,params)};
 container.querySelector("[data-ui-list]").onchange=e=>{const x=a.interfacePresets[Number(e.target.value)];if(x)form.elements.interfaceCss.value=x.css};
 container.querySelector("[data-save-font]").onclick=()=>{const name=prompt("字体预设名","我的字体");if(name)store.update(s=>s.chatAppearance.fontPresets.push({name,url:form.elements.fontUrl.value,size:Number(form.elements.fontSize.value)}));createChatSettingsRenderer({store,navigate})(container,params)};
 container.querySelector("[data-font-list]").onchange=e=>{const x=a.fontPresets[Number(e.target.value)];if(x){form.elements.fontUrl.value=x.url;form.elements.fontSize.value=x.size}};
 bindBg(container.querySelector("[data-bg]"),container,params);bindBg(container.querySelector("[data-camera]"),container,params);
 container.querySelector("[data-bg-url]").onclick=()=>{const url=prompt("聊天背景图床 URL","https://");if(/^https?:\/\//.test(url||""))saveBg(url,container,params)};
 container.querySelectorAll("[data-use-bg]").forEach(x=>x.onclick=e=>{if(e.target.closest("[data-delete-bg]"))return;store.update(s=>s.chatAppearance.background=a.backgroundHistory[Number(x.dataset.useBg)]);showToast("聊天背景已切换")});
 container.querySelectorAll("[data-delete-bg]").forEach(x=>x.onclick=e=>{e.stopPropagation();store.update(s=>{const i=Number(x.dataset.deleteBg),old=s.chatAppearance.backgroundHistory.splice(i,1)[0];if(s.chatAppearance.background===old)s.chatAppearance.background=""});createChatSettingsRenderer({store,navigate})(container,params)});
 container.querySelector("[data-open-tts-center]").onclick=()=>navigate("api",{section:"voice"});
 container.querySelectorAll("[data-char-sticker-import]").forEach(button=>button.onclick=()=>stickerImporter(button.dataset.charStickerImport,personId));
 container.querySelector("[data-clear-chat]").onclick=()=>confirmAction("清空聊天记录","仅清空当前账号与该 CHAR 的聊天消息；人物资料、长期设定和钱包明细不会删除。","清空",()=>{store.update(s=>{for(const c of s.conversations.filter(x=>x.personId===personId&&x.userAccountId===user.id)){s.messages[c.id]=[];c.preview="暂无消息";c.time=""}});showToast("聊天记录已清空")});
 container.querySelector("[data-delete-memory]").onclick=()=>confirmAction("删除所有记忆","会清除当前账号与该角色的聊天和记忆，只保留 CHAR 人物设定和聊天配置。","全部删除",async()=>{await clearCharacterMemory(memoryOwnerId);store.update(s=>{for(const c of s.conversations.filter(x=>x.personId===personId&&x.userAccountId===user.id)){s.messages[c.id]=[];c.preview="暂无消息";c.time=""}s.moments=(s.moments||[]).filter(x=>!(x.personId===personId&&x.accountId===user.id));delete s.memoryProfiles?.[memoryOwnerId]});showToast("已删除当前身份与 CHAR 的记忆，仅保留人物设定")});
 container.querySelector("[data-block-char]").onclick=()=>confirmAction(person.blocked?"解除拉黑":"拉黑 CHAR",person.blocked?"解除后恢复正常聊天状态。":"当前版本会保存拉黑状态；通过小号、共友或其他平台联系的逻辑暂不触发。",person.blocked?"解除":"拉黑",()=>{store.update(s=>{const target=personById(s,personId);target.blocked=!target.blocked;s.blockedPersonIds=s.blockedPersonIds||[];s.blockedPersonIds=target.blocked?[...new Set([...s.blockedPersonIds,personId])]:s.blockedPersonIds.filter(x=>x!==personId)});createChatSettingsRenderer({store,navigate})(container,params);showToast(person.blocked?"已拉黑 CHAR":"已解除拉黑")});
 container.querySelector("[data-delete-friend]").onclick=()=>confirmAction("删除好友","会从当前账号聊天列表移除；角色卡与人物设定仍保留，之后可以重新添加。","删除好友",()=>{store.update(s=>{const ids=s.conversations.filter(x=>x.personId===personId&&x.userAccountId===user.id).map(x=>x.id);s.conversations=s.conversations.filter(x=>!(x.personId===personId&&x.userAccountId===user.id));for(const id of ids)delete s.messages[id];s.accountFriends[user.id]=(s.accountFriends[user.id]||[]).filter(x=>x!==personId)});showToast("好友已从当前账号移除");navigate("chat")});
 form.onsubmit=e=>{e.preventDefault();const d=new FormData(form),worldbookIds=d.getAll("worldbookIds"),chatData=Object.fromEntries(d);for(const key of ["summaryEveryN","grandEveryM","regularMemoryPrompt","grandMemoryPrompt","memoryDebugEnabled","worldbookIds"])delete chatData[key];store.update(s=>{Object.assign(s.chatProfiles[personId],chatData,{voiceSpeed:Number(d.get("voiceSpeed")),worldbookIds,llmTone:form.llmTone.checked,autoPlayVoice:form.autoPlayVoice.checked,translationEnabled:form.translationEnabled.checked,visionEnabled:form.visionEnabled.checked,proactive:form.proactive.checked,readReceipts:form.readReceipts.checked,stickerSteal:form.stickerSteal.checked,imageGenerationEnabled:form.imageGenerationEnabled.checked});s.memoryProfiles=s.memoryProfiles||{};s.memoryProfiles[memoryOwnerId]={...memoryProfile(s,memoryOwnerId),summaryEveryN:Math.max(2,Number(d.get("summaryEveryN"))||8),grandEveryM:Math.max(10,Number(d.get("grandEveryM"))||40),regularPrompt:String(d.get("regularMemoryPrompt")||mem.regularPrompt),grandPrompt:String(d.get("grandMemoryPrompt")||mem.grandPrompt),memoryDebugEnabled:form.memoryDebugEnabled.checked};Object.assign(person,{city:d.get("charCity"),cityPrototype:d.get("charPrototype")});s.chatProfiles[personId].weather=form.querySelector('[data-weather-result="char"]').textContent;Object.assign(user,{city:d.get("userCity"),cityPrototype:d.get("userPrototype"),weather:form.querySelector('[data-weather-result="user"]').textContent});Object.assign(s.chatAppearance,formAppearance(form,a),{hideUserAvatar:form.hideUserAvatar.checked})});applyChatAppearance(store.getState().chatAppearance);showToast("全部聊天设置已保存")};
 function chooseAvatar(type,pid,uid,c,pa){const input=document.createElement("input");input.type="file";input.accept="image/*";input.onchange=e=>readImage(e.target.files[0],url=>{store.update(s=>{if(type==="char")s.chatProfiles[pid].avatarUrl=url;else personById(s,uid).avatarUrl=url});createChatSettingsRenderer({store,navigate})(c,pa)});input.click()}
 function urlAvatar(type,pid,uid,c,pa){const url=prompt("头像图床 URL","https://");if(!/^https?:\/\//.test(url||""))return;store.update(s=>{if(type==="char")s.chatProfiles[pid].avatarUrl=url;else personById(s,uid).avatarUrl=url});createChatSettingsRenderer({store,navigate})(c,pa)}
 function bindBg(input,c,pa){input.onchange=e=>readImage(e.target.files[0],url=>saveBg(url,c,pa))}
 function saveBg(url,c,pa){store.update(s=>{s.chatAppearance.background=url;s.chatAppearance.backgroundHistory=[url,...s.chatAppearance.backgroundHistory.filter(x=>x!==url)].slice(0,12)});createChatSettingsRenderer({store,navigate})(c,pa);showToast("背景已保存到历史")}
 function stickerImporter(scope,pid){const label=scope==="global"?"CHAR 通用表情库":`${person.name} 专属表情库`;openSheet(`<div class="sheet-title"><h3>${escapeHtml(label)}</h3><button type="button" class="button ghost" data-sheet-close>关闭</button></div><p class="callout">相册、图床和 DOCX 都会保存到当前选中的库，不会进入 USER 表情库。</p><div class="sticker-import-actions"><label class="button secondary file-button">相册批量选择<input type="file" accept="image/*" multiple data-char-sticker-local hidden></label><label class="button secondary file-button">导入 DOCX<input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" data-char-sticker-docx hidden></label></div><label class="field"><span>图床批量导入</span><textarea rows="7" data-char-sticker-urls placeholder="每行一个：表情包文字描述 https://example.com/image.png"></textarea></label><button type="button" class="button" data-import-char-stickers>导入到${escapeHtml(label)}</button>`,{onReady(sheet){const save=items=>{if(!items.length)return showToast("没有识别到“描述 空格 URL”格式");store.update(s=>{const target=scope==="global"?s.stickerLibraries.global:(s.stickerLibraries.characters[pid]||(s.stickerLibraries.characters[pid]=[]));mergeStickers(target,items)});closeSheet();createChatSettingsRenderer({store,navigate})(container,params);showToast(`已导入 ${items.length} 张表情`)};sheet.querySelector("[data-char-sticker-local]").onchange=async e=>{try{const items=await Promise.all([...e.target.files].slice(0,60).map(async file=>{const description=file.name.replace(/\.[^.]+$/,"");return{name:description,url:await readImagePromise(file),description,tags:[description,"本地"]}}));save(items)}catch(error){showToast(error.message)}};sheet.querySelector("[data-char-sticker-docx]").onchange=async e=>{try{save(parseStickerLines(await readDocxText(e.target.files?.[0])))}catch(error){showToast(error.message)}};sheet.querySelector("[data-import-char-stickers]").onclick=()=>save(parseStickerLines(sheet.querySelector("[data-char-sticker-urls]").value))}})}
 function confirmAction(title,text,action,done){openSheet(`<div class="confirm-dialog"><div class="confirm-symbol">!</div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p><div class="row"><button type="button" class="button secondary" data-sheet-close>取消</button><button type="button" class="button danger-button" data-confirm-chat-action>${escapeHtml(action)}</button></div></div>`,{onReady(sheet){sheet.querySelector("[data-confirm-chat-action]").onclick=()=>{closeSheet();done()}}})}
 };
}
function avatarRow(type,person,url){return`<div class="setting-row"><div class="row"><button type="button" class="avatar-edit" data-avatar="${type}">${initialsAvatar(person,{avatarUrl:url||""})}</button><div><strong>${escapeHtml(person.name)}</strong><small>点击头像选择图片 / 文件</small></div></div><button type="button" class="button secondary" data-avatar-url="${type}">图床</button></div>`}
function cityRow(key,label,city,proto,result){return`<div class="row"><label class="field"><span>${label} 城市名称</span><input name="${key}City" value="${escapeHtml(city||"")}"></label><label class="field"><span>对应原型城市</span><input name="${key}Prototype" value="${escapeHtml(proto||"")}"></label><button type="button" class="button secondary" data-weather="${key}">获取</button></div><small data-weather-result="${key}">${escapeHtml(result||"未获取天气")}</small>`}
function toggle(name,label,small,on){return`<div class="setting-row"><div><span class="label">${label}</span><small>${small}</small></div><input class="switch" name="${name}" type="checkbox" ${on?"checked":""}></div>`}
function opts(items,value){return items.map(x=>`<option ${x===value?"selected":""}>${x}</option>`).join("")}
function formAppearance(form,a){return{...a,backgroundOpacity:Number(form.elements.backgroundOpacity.value),interfaceCss:form.elements.interfaceCss.value,bubbleCss:form.elements.bubbleCss.value,bubbleColor:form.elements.bubbleColor.value,bubbleScale:Number(form.elements.bubbleScale.value),fontSize:Number(form.elements.fontSize.value),fontUrl:form.elements.fontUrl.value}}
function readImage(file,done){if(!file)return;if(file.size>3*1024*1024)return showToast("请选择 3MB 以内图片");const r=new FileReader();r.onload=()=>done(r.result);r.readAsDataURL(file)}
function readImagePromise(file){return new Promise((resolve,reject)=>{if(!file)return reject(Error("请选择图片"));if(!file.type.startsWith("image/"))return reject(Error(`${file.name} 不是图片`));if(file.size>8*1024*1024)return reject(Error(`${file.name} 超过 8MB`));const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error(`${file.name} 读取失败`));r.readAsDataURL(file)})}
function parseStickerLines(text){const normalized=String(text||"").replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gi,"$2");return normalized.split(/(?:\r?\n|[|,，])+/).map(row=>{const value=row.trim(),match=value.match(/^(.*?)\s*(?:[:：]\s*|\s+)(https?:\/\/\S+)\s*$/i);if(!match)return null;const description=match[1].replace(/^[-—]+|[-—]+$/g,"").trim()||"表情包",url=match[2].replace(/^\[|\]$/g,"");return{name:description.slice(0,28),description,url,tags:[description]}}).filter(Boolean)}
function mergeStickers(target,items){for(const item of items)if(!target.some(x=>x.url===item.url))target.push(item)}
async function readDocxText(file){if(!file)throw Error("请选择 DOCX 文件");const bytes=new Uint8Array(await file.arrayBuffer()),view=new DataView(bytes.buffer);let eocd=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(view.getUint32(i,true)===0x06054b50){eocd=i;break}if(eocd<0)throw Error("DOCX 文件结构无效");const entries=view.getUint16(eocd+10,true),central=view.getUint32(eocd+16,true),decoder=new TextDecoder();let offset=central,target=null;for(let i=0;i<entries;i++){if(view.getUint32(offset,true)!==0x02014b50)break;const method=view.getUint16(offset+10,true),size=view.getUint32(offset+20,true),nameLen=view.getUint16(offset+28,true),extraLen=view.getUint16(offset+30,true),commentLen=view.getUint16(offset+32,true),local=view.getUint32(offset+42,true),name=decoder.decode(bytes.slice(offset+46,offset+46+nameLen));if(name==="word/document.xml")target={method,size,local};offset+=46+nameLen+extraLen+commentLen}if(!target)throw Error("DOCX 中没有可读取的正文");const nameLen=view.getUint16(target.local+26,true),extraLen=view.getUint16(target.local+28,true),start=target.local+30+nameLen+extraLen,compressed=bytes.slice(start,start+target.size);let raw=compressed;if(target.method===8){if(typeof DecompressionStream==="undefined")throw Error("当前浏览器不支持直接解析 DOCX");raw=new Uint8Array(await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer())}else if(target.method!==0)throw Error("不支持该 DOCX 压缩格式");const xml=new DOMParser().parseFromString(decoder.decode(raw),"application/xml");return[...xml.getElementsByTagNameNS("*","p")].map(p=>[...p.getElementsByTagNameNS("*","t")].map(x=>x.textContent).join("")).join("\n")}
async function weather(type,form){const city=form.elements[`${type}Prototype`].value.trim()||form.elements[`${type}City`].value.trim(),out=form.querySelector(`[data-weather-result="${type}"]`);if(!city)return showToast("请先填写原型城市");out.textContent="正在获取真实天气…";try{const g=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh`).then(r=>r.json()),p=g.results?.[0];if(!p)throw Error("未找到城市");const d=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m,weather_code&timezone=auto`).then(r=>r.json());out.textContent=`${p.name} · ${weatherName(d.current.weather_code)} · ${Math.round(d.current.temperature_2m)}°C`}catch(e){out.textContent=e.message;showToast("天气获取失败")}}
function weatherName(c){if(c===0)return"晴";if(c<4)return"多云";if(c<50)return"雾";if(c<70)return"雨";if(c<80)return"雪";if(c<90)return"阵雨";return"雷雨"}
export function applyChatAppearance(a){document.querySelector("#bunny-chat-style")?.remove();applyConversationSkin(a)}
