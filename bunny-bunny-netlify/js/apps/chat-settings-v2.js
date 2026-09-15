import { personById } from "../core/store.js";
import { escapeHtml, initialsAvatar, showToast, openSheet, closeSheet } from "../core/ui.js";
const langs=["自动","中文","English","한국어","日本語","Français","Deutsch","Español"];
const moods=["自动","平静","开心","温柔","害羞","悲伤","生气","激动","疲惫","低语"];
const bubbleThemes={
imessage:".message .bubble{border-radius:1.15rem}.message.user .bubble{background:#111;color:#fff}",
pop:".message .bubble{border:2px solid #111;border-radius:.3rem;box-shadow:3px 3px 0 #111}.message.user .bubble{background:#fff;color:#111}",
line:".message .bubble{border:0;border-radius:1rem}.message.user .bubble{background:#b8e986;color:#111}",
kakaotalk:".message .bubble{border:0;border-radius:.55rem}.message.user .bubble{background:#fee500;color:#111}",
cloud:".message .bubble{border:0;border-radius:1.5rem;background:rgba(255,255,255,.72);backdrop-filter:blur(18px)}"
};
const interfaceSample=".chat-layout {\n  background: transparent;\n}\n.chat-stream {\n  padding-inline: .15rem;\n}\n.chat-person {\n  backdrop-filter: blur(16px);\n}";
const bubbleSample=".message .bubble {\n  border-radius: 18px;\n  padding: 10px 13px;\n}\n.message.user .bubble {\n  background: #111111;\n  color: #ffffff;\n}";

export function createChatSettingsRenderer({store,navigate}){
return (container,params={})=>{
 const personId=params.personId||"char-jun",state=store.getState(),person=personById(state,personId),user=personById(state,state.currentUserId),p=state.chatProfiles[personId],a=state.chatAppearance;
 container.innerHTML=`<form class="stack" data-form>
 <section class="card">
  ${avatarRow("char",person,p.avatarUrl)}
  ${avatarRow("user",user,user.avatarUrl)}
 </section>
 <div class="section-title"><h3>身份、城市与天气</h3><span>CHAR / USER 独立</span></div>
 <section class="card stack">
  <label class="field"><span>聊天备注</span><input name="remark" value="${escapeHtml(p.remark||person.name)}"></label>
  ${cityRow("char","CHAR",person.city||p.charCity,person.cityPrototype||p.cityPrototype,p.weather)}
  ${cityRow("user","USER",user.city||p.userCity,user.cityPrototype||"",user.weather)}
 </section>
 <div class="section-title"><h3>语音配置</h3><span>角色级</span></div>
 <section class="card stack">
  <label class="field"><span>语音提供方</span><input name="voiceProvider" value="${escapeHtml(p.voiceProvider||"")}"></label>
  <label class="field"><span>音色 ID</span><input name="voiceId" value="${escapeHtml(p.voiceId||"")}" placeholder="voice_kr_01"></label>
  <label class="field"><span>语速 <output data-speed-out>${Number(p.voiceSpeed||1).toFixed(1)}×</output></span><input name="voiceSpeed" data-speed type="range" min=".5" max="2" step=".1" value="${p.voiceSpeed||1}"></label>
  ${toggle("llmTone","根据 LLM 提供语气","关闭时由语音 API 自动判断语气",p.llmTone)}
  <label class="field"><span>语言</span><select name="language">${opts(langs,p.language)}</select></label>
  <label class="field"><span>情绪</span><select name="emotion">${opts(moods,p.emotion)}</select></label>
  ${toggle("autoPlayVoice","自动播放语音","收到 CHAR 回复后朗读",p.autoPlayVoice)}
 </section>
 <div class="section-title"><h3>模型、记忆与互动</h3><span>原版功能保留</span></div>
 <section class="card stack">
  ${toggle("visionEnabled","角色识图","关闭后只读取文字与图片说明",p.visionEnabled)}
  ${toggle("proactive","主动联系","遵守安静时段与每日额度",p.proactive)}
  ${toggle("stickerSteal","根据人设偷表情包","仅收藏可见对话中的表情",p.stickerSteal)}
  <label class="field"><span>记忆系统</span><input name="memoryMode" value="${escapeHtml(p.memoryMode||"")}"></label>
  <label class="field"><span>记忆召回条数</span><input name="memoryDepth" type="number" min="4" max="80" value="${p.memoryDepth||24}"></label>
  <label class="field"><span>安静时段</span><input name="quietHours" value="${escapeHtml(p.quietHours||"")}"></label>\n  <div class="pat-copy-settings"><label class="field"><span>我拍 CHAR 时的文案</span><input name="patText" value="${escapeHtml(p.patText||`你拍了拍${person.name}`)}" placeholder="你拍了拍 CHAR"></label><label class="field"><span>CHAR 拍我时的文案</span><input name="patUserText" value="${escapeHtml(p.patUserText||`${person.name}拍了拍你`)}" placeholder="CHAR 拍了拍你"></label><small>双击聊天头像触发；两条文案分别保存到当前角色。</small></div>
  <div class="row"><label class="button secondary file-button">上传表情<input data-sticker type="file" accept="image/*" multiple hidden></label><button class="button secondary" type="button" data-batch>批量图床</button></div>
 </section>
 <div class="section-title"><h3>提示词绑定</h3><span>预设优先于世界书</span></div>
 <section class="card stack">
  <label class="field"><span>预设（一次仅绑定一个）</span><select name="presetId">${state.presets.map(x=>`<option value="${x.id}" ${p.presetId===x.id||p.preset===x.name?"selected":""}>${escapeHtml(x.name)}</option>`).join("")}</select></label>
  <div><span class="label">世界书（可同时绑定多本）</span>${state.worldbooks.map(w=>`<label class="setting-row"><span>${escapeHtml(w.name)}</span><input type="checkbox" name="worldbookIds" value="${w.id}" ${(p.worldbookIds||[]).includes(w.id)||p.worldbook===w.name?"checked":""}></label>`).join("")}</div>
  <button type="button" class="button secondary" data-worldbook>管理世界书</button>
 </section>
 <div class="section-title"><h3>界面 CSS</h3><span>可保存 / 切换预设</span></div>
 <section class="card stack">
  <label class="field"><span>完整聊天界面 CSS</span><textarea class="css-editor" name="interfaceCss">${escapeHtml(a.interfaceCss||interfaceSample)}</textarea></label>
  <div class="row"><button type="button" class="button secondary" data-preview>预览</button><button type="button" class="button secondary" data-save-ui>保存预设</button><select data-ui-list><option value="">切换…</option>${a.interfacePresets.map((x,i)=>`<option value="${i}">${escapeHtml(x.name)}</option>`).join("")}</select></div>
 </section>
 <div class="section-title"><h3>气泡编辑器</h3><span>气泡 CSS 优先</span></div>
 <section class="bubble-presets">${[["imessage","iMessage"],["pop","POP"],["line","LINE"],["kakaotalk","KakaoTalk"],["cloud","Bunny Cloud"],["custom","自定义"]].map(x=>`<button type="button" class="bubble-choice ${a.bubblePreset===x[0]?"selected":""}" data-bubble="${x[0]}">${x[1]}</button>`).join("")}</section>
 <section class="card stack">
  <label class="field color-row"><span>用户气泡颜色</span><input name="bubbleColor" type="color" value="${a.bubbleColor||"#111111"}"></label>
  <label class="field"><span>气泡大小 <output data-scale-out>${Math.round((a.bubbleScale||1)*100)}%</output></span><input name="bubbleScale" data-scale type="range" min=".75" max="1.35" step=".05" value="${a.bubbleScale||1}"></label>
  <label class="field"><span>字体大小</span><input name="fontSize" type="range" min="11" max="21" value="${a.fontSize||14}"></label>
  <label class="field"><span>字体 URL</span><input name="fontUrl" value="${escapeHtml(a.fontUrl||"")}" placeholder="https://…/font.woff2"></label>
  <div class="row"><button type="button" class="button secondary" data-save-font>保存字体预设</button><select data-font-list><option value="">切换…</option>${a.fontPresets.map((x,i)=>`<option value="${i}">${escapeHtml(x.name)}</option>`).join("")}</select></div>
  <label class="field"><span>自定义气泡 CSS</span><textarea class="css-editor" name="bubbleCss">${escapeHtml(a.bubbleCss||bubbleSample)}</textarea></label>
 </section>
 <div class="section-title"><h3>聊天背景</h3><span>自动保留历史，可删除</span></div>
 <section class="card stack">
  <div class="row"><label class="button secondary file-button">选择图片<input data-bg type="file" accept="image/*" hidden></label><label class="button secondary file-button">拍摄<input data-camera type="file" accept="image/*" capture="environment" hidden></label><button type="button" class="button secondary" data-bg-url>图床</button></div>
  <div class="background-history">${a.backgroundHistory.length?a.backgroundHistory.map((bg,i)=>`<div class="background-tile" data-use-bg="${i}" style="background-image:url('${escapeHtml(bg)}')"><button type="button" data-delete-bg="${i}">×</button></div>`).join(""):'<p class="sub">上传后会显示在这里。</p>'}</div>
 </section>
 <section class="card">${toggle("hideUserAvatar","隐藏 USER 头像","连续消息的第二条起始终隐藏头像并与首条气泡对齐",a.hideUserAvatar)}</section>
 <button class="button" type="submit">保存全部聊天设置</button>
 </form>`;
 const form=container.querySelector("[data-form]");
 form.elements.voiceSpeed.oninput=e=>container.querySelector("[data-speed-out]").value=Number(e.target.value).toFixed(1)+"×";
 form.elements.bubbleScale.oninput=e=>container.querySelector("[data-scale-out]").value=Math.round(e.target.value*100)+"%";
 container.querySelectorAll("[data-weather]").forEach(b=>b.onclick=()=>weather(b.dataset.weather,form));
 container.querySelectorAll("[data-avatar]").forEach(b=>b.onclick=()=>chooseAvatar(b.dataset.avatar,personId,user.id,container,params));
 container.querySelectorAll("[data-avatar-url]").forEach(b=>b.onclick=()=>urlAvatar(b.dataset.avatarUrl,personId,user.id,container,params));
 container.querySelector("[data-worldbook]").onclick=()=>navigate("worldbook");
 container.querySelectorAll("[data-bubble]").forEach(b=>b.onclick=()=>{store.update(s=>s.chatAppearance.bubblePreset=b.dataset.bubble);createChatSettingsRenderer({store,navigate})(container,params)});
 container.querySelector("[data-preview]").onclick=()=>{applyChatAppearance(formAppearance(form,a));showToast("聊天 CSS 已预览")};
 container.querySelector("[data-save-ui]").onclick=()=>{const name=prompt("界面 CSS 预设名","我的主题");if(name)store.update(s=>s.chatAppearance.interfacePresets.push({name,css:form.elements.interfaceCss.value}));createChatSettingsRenderer({store,navigate})(container,params)};
 container.querySelector("[data-ui-list]").onchange=e=>{const x=a.interfacePresets[Number(e.target.value)];if(x)form.elements.interfaceCss.value=x.css};
 container.querySelector("[data-save-font]").onclick=()=>{const name=prompt("字体预设名","我的字体");if(name)store.update(s=>s.chatAppearance.fontPresets.push({name,url:form.elements.fontUrl.value,size:Number(form.elements.fontSize.value)}));createChatSettingsRenderer({store,navigate})(container,params)};
 container.querySelector("[data-font-list]").onchange=e=>{const x=a.fontPresets[Number(e.target.value)];if(x){form.elements.fontUrl.value=x.url;form.elements.fontSize.value=x.size}};
 bindBg(container.querySelector("[data-bg]"),container,params);bindBg(container.querySelector("[data-camera]"),container,params);
 container.querySelector("[data-bg-url]").onclick=()=>{const url=prompt("聊天背景图床 URL","https://");if(/^https?:\/\//.test(url||""))saveBg(url,container,params)};
 container.querySelectorAll("[data-use-bg]").forEach(x=>x.onclick=e=>{if(e.target.closest("[data-delete-bg]"))return;store.update(s=>s.chatAppearance.background=a.backgroundHistory[Number(x.dataset.useBg)]);showToast("聊天背景已切换")});
 container.querySelectorAll("[data-delete-bg]").forEach(x=>x.onclick=e=>{e.stopPropagation();store.update(s=>{const i=Number(x.dataset.deleteBg),old=s.chatAppearance.backgroundHistory.splice(i,1)[0];if(s.chatAppearance.background===old)s.chatAppearance.background=""});createChatSettingsRenderer({store,navigate})(container,params)});
 container.querySelector("[data-batch]").onclick=()=>batchStickers(personId);
 container.querySelector("[data-sticker]").onchange=e=>localStickers([...e.target.files],personId);
 form.onsubmit=e=>{e.preventDefault();const d=new FormData(form),worldbookIds=d.getAll("worldbookIds");store.update(s=>{Object.assign(s.chatProfiles[personId],Object.fromEntries(d),{voiceSpeed:Number(d.get("voiceSpeed")),memoryDepth:Number(d.get("memoryDepth")),worldbookIds,llmTone:form.llmTone.checked,autoPlayVoice:form.autoPlayVoice.checked,visionEnabled:form.visionEnabled.checked,proactive:form.proactive.checked,stickerSteal:form.stickerSteal.checked});Object.assign(person,{city:d.get("charCity"),cityPrototype:d.get("charPrototype")});s.chatProfiles[personId].weather=form.querySelector('[data-weather-result="char"]').textContent;Object.assign(user,{city:d.get("userCity"),cityPrototype:d.get("userPrototype"),weather:form.querySelector('[data-weather-result="user"]').textContent});Object.assign(s.chatAppearance,formAppearance(form,a),{hideUserAvatar:form.hideUserAvatar.checked})});applyChatAppearance(store.getState().chatAppearance);showToast("全部聊天设置已保存")};
 function chooseAvatar(type,pid,uid,c,pa){const input=document.createElement("input");input.type="file";input.accept="image/*";input.onchange=e=>readImage(e.target.files[0],url=>{store.update(s=>{if(type==="char")s.chatProfiles[pid].avatarUrl=url;else personById(s,uid).avatarUrl=url});createChatSettingsRenderer({store,navigate})(c,pa)});input.click()}
 function urlAvatar(type,pid,uid,c,pa){const url=prompt("头像图床 URL","https://");if(!/^https?:\/\//.test(url||""))return;store.update(s=>{if(type==="char")s.chatProfiles[pid].avatarUrl=url;else personById(s,uid).avatarUrl=url});createChatSettingsRenderer({store,navigate})(c,pa)}
 function bindBg(input,c,pa){input.onchange=e=>readImage(e.target.files[0],url=>saveBg(url,c,pa))}
 function saveBg(url,c,pa){store.update(s=>{s.chatAppearance.background=url;s.chatAppearance.backgroundHistory=[url,...s.chatAppearance.backgroundHistory.filter(x=>x!==url)].slice(0,12)});createChatSettingsRenderer({store,navigate})(c,pa);showToast("背景已保存到历史")}
 function batchStickers(pid){const text=prompt("每行输入：名称 | URL | 标签");if(!text)return;const items=text.split(/\r?\n/).map(line=>{const p=line.split("|").map(x=>x.trim()),url=p.length>1?p[1]:p[0];return/^https?:\/\//.test(url)?{name:p[0],url,tags:(p[2]||"").split(",")}:null}).filter(Boolean);store.update(s=>s.stickerLibraries.characters[pid].push(...items));showToast(`已导入 ${items.length} 个图床表情`)}
 function localStickers(files,pid){files.slice(0,20).forEach(file=>readImage(file,url=>store.update(s=>s.stickerLibraries.characters[pid].push({name:file.name,url,tags:["本地"]}))));showToast("本地表情正在导入")}
 };
}
function avatarRow(type,person,url){return`<div class="setting-row"><div class="row"><button type="button" class="avatar-edit" data-avatar="${type}">${initialsAvatar(person,{avatarUrl:url||""})}</button><div><strong>${escapeHtml(person.name)}</strong><small>点击头像选择图片 / 文件</small></div></div><button type="button" class="button secondary" data-avatar-url="${type}">图床</button></div>`}
function cityRow(key,label,city,proto,result){return`<div class="row"><label class="field"><span>${label} 城市名称</span><input name="${key}City" value="${escapeHtml(city||"")}"></label><label class="field"><span>对应原型城市</span><input name="${key}Prototype" value="${escapeHtml(proto||"")}"></label><button type="button" class="button secondary" data-weather="${key}">获取</button></div><small data-weather-result="${key}">${escapeHtml(result||"未获取天气")}</small>`}
function toggle(name,label,small,on){return`<div class="setting-row"><div><span class="label">${label}</span><small>${small}</small></div><input class="switch" name="${name}" type="checkbox" ${on?"checked":""}></div>`}
function opts(items,value){return items.map(x=>`<option ${x===value?"selected":""}>${x}</option>`).join("")}
function formAppearance(form,a){return{...a,interfaceCss:form.elements.interfaceCss.value,bubbleCss:form.elements.bubbleCss.value,bubbleColor:form.elements.bubbleColor.value,bubbleScale:Number(form.elements.bubbleScale.value),fontSize:Number(form.elements.fontSize.value),fontUrl:form.elements.fontUrl.value}}
function readImage(file,done){if(!file)return;if(file.size>3*1024*1024)return showToast("请选择 3MB 以内图片");const r=new FileReader();r.onload=()=>done(r.result);r.readAsDataURL(file)}
async function weather(type,form){const city=form.elements[`${type}Prototype`].value.trim()||form.elements[`${type}City`].value.trim(),out=form.querySelector(`[data-weather-result="${type}"]`);if(!city)return showToast("请先填写原型城市");out.textContent="正在获取真实天气…";try{const g=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh`).then(r=>r.json()),p=g.results?.[0];if(!p)throw Error("未找到城市");const d=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m,weather_code&timezone=auto`).then(r=>r.json());out.textContent=`${p.name} · ${weatherName(d.current.weather_code)} · ${Math.round(d.current.temperature_2m)}°C`}catch(e){out.textContent=e.message;showToast("天气获取失败")}}
function weatherName(c){if(c===0)return"晴";if(c<4)return"多云";if(c<50)return"雾";if(c<70)return"雨";if(c<80)return"雪";if(c<90)return"阵雨";return"雷雨"}
export function applyChatAppearance(a){let style=document.querySelector("#bunny-chat-style");if(!style){style=document.createElement("style");style.id="bunny-chat-style";document.head.appendChild(style)}const theme=a.bubblePreset==="custom"?"":bubbleThemes[a.bubblePreset]||"",font=a.fontUrl?`@font-face{font-family:BunnyCustom;src:url("${a.fontUrl}")}.chat-layout{font-family:BunnyCustom,sans-serif}`:"";style.textContent=font+"\n"+(a.interfaceCss||"")+"\n"+theme+`\n.message .bubble{font-size:${a.fontSize||14}px;transform:scale(${a.bubbleScale||1});transform-origin:left bottom}.message.user .bubble{background:${a.bubbleColor||"#111"}}\n`+(a.bubbleCss||"")}
