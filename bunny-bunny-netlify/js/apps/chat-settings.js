import { personById } from "../core/store.js";
import { escapeHtml, initialsAvatar, showToast, openSheet, closeSheet } from "../core/ui.js";

const fields = [
  ["relationship", "两人关系设定"], ["userCity", "USER 所在城市"], ["charCity", "CHAR 所在城市"], ["cityPrototype", "城市原型"], ["weather", "当地天气"],
  ["memoryMode", "记忆系统"], ["voiceProvider", "CHAR 语音配置"], ["imageProfile", "CHAR 生图设置"], ["videoPortrait", "视频肖像设置"],
  ["worldbook", "绑定世界书"], ["chainOfThought", "心声／思维链展示"], ["preset", "聊天预设"], ["stickerScope", "表情包库范围"], ["patText", "拍一拍文案"], ["voiceCallMode", "语音聊天方式"]
];

export function createChatSettingsRenderer({ store, navigate }) {
  return (container, params = {}) => {
    const personId = params.personId || "char-jun";
    const state = store.getState(); const person = personById(state, personId); const profile = state.chatProfiles[personId];
    const charStickerCount = state.stickerLibraries.characters[personId]?.length || 0;
    container.innerHTML = `<form class="stack" data-chat-settings>
      <section class="card row">${initialsAvatar(person, profile)}<div class="meta"><strong>${escapeHtml(person.name)}</strong><span>此页设置只作用于你们的聊天关系</span></div></section>
      <div class="section-title"><h3>身份与关系</h3><span>人物本名不在这里修改</span></div>
      <label class="field"><span>聊天备注</span><input name="remark" value="${escapeHtml(profile.remark)}"></label>
      <label class="field"><span>CHAR 聊天头像</span><input name="avatarUrl" value="${escapeHtml(profile.avatarUrl)}" placeholder="https://…"></label>
      ${fields.slice(0,5).map(([key,label]) => `<label class="field"><span>${label}</span><input name="${key}" value="${escapeHtml(profile[key] || "")}"></label>`).join("")}
      <section class="card"><div class="setting-row"><div><span class="label">异地关系</span><small>影响约会、天气与主动联系语境</small></div><input class="switch" name="longDistance" type="checkbox" ${profile.longDistance ? "checked" : ""}></div><div class="setting-row"><div><span class="label">自动更换头像</span><small>仅从 CHAR 已授权头像库中选择</small></div><input class="switch" name="autoAvatar" type="checkbox" ${profile.autoAvatar ? "checked" : ""}></div></section>
      <div class="section-title"><h3>记忆与角色表现</h3><span>每个 CHAR 独立</span></div>
      ${fields.slice(5,12).map(([key,label]) => `<label class="field"><span>${label}</span><input name="${key}" value="${escapeHtml(profile[key] || "")}"></label>`).join("")}
      <label class="field"><span>记忆召回条数</span><input name="memoryDepth" type="number" min="4" max="80" value="${profile.memoryDepth}"></label>
      <div class="section-title"><h3>表情包与互动</h3><span>角色库 / 通用库</span></div>
      ${fields.slice(12).map(([key,label]) => `<label class="field"><span>${label}</span><input name="${key}" value="${escapeHtml(profile[key] || "")}"></label>`).join("")}
      <section class="card"><div class="setting-row"><div><span class="label">角色独立库</span><small>${charStickerCount} 个表情 · 仅 ${escapeHtml(person.name)} 使用</small></div><span class="pill">独立</span></div><div class="setting-row"><div><span class="label">所有 CHAR 通用库</span><small>${state.stickerLibraries.global.length} 个表情</small></div><span class="pill">共享</span></div><div class="setting-row"><div><span class="label">根据人设偷表情包</span><small>只收藏 CHAR 在可见对话中见过的表情</small></div><input class="switch" name="stickerSteal" type="checkbox" ${profile.stickerSteal ? "checked" : ""}></div><div class="row"><label class="button secondary file-button">上传表情<input data-sticker-upload type="file" accept="image/*" multiple hidden></label><button class="button secondary" type="button" data-batch-sticker>批量图床</button></div></section>
      <section class="card"><div class="setting-row"><div><span class="label">主动联系</span><small>遵守安静时段与每日额度</small></div><input class="switch" name="proactive" type="checkbox" ${profile.proactive ? "checked" : ""}></div><label class="field"><span>安静时段</span><input name="quietHours" value="${escapeHtml(profile.quietHours)}"></label></section>
      <button class="button" type="submit">保存聊天设置</button>
    </form>`;
    const form = container.querySelector("form");
    form.addEventListener("submit", event => { event.preventDefault(); const values = Object.fromEntries(new FormData(form)); store.update(s => { s.chatProfiles[personId] = { ...s.chatProfiles[personId], ...values, memoryDepth: Number(values.memoryDepth), longDistance: form.longDistance.checked, autoAvatar: form.autoAvatar.checked, stickerSteal: form.stickerSteal.checked, proactive: form.proactive.checked }; }); showToast(`${person.name} 的聊天设置已保存`); });
    container.querySelector("[data-batch-sticker]").addEventListener("click", () => openBatchSticker(personId, person.name, container, params));
    container.querySelector("[data-sticker-upload]").addEventListener("change", event => { const files=[...event.target.files].slice(0,10); Promise.all(files.map(file=>readSmallImage(file))).then(items=>{const valid=items.filter(Boolean);store.update(s=>s.stickerLibraries.characters[personId].push(...valid));showToast(`已加入 ${valid.length} 个本地表情`);createChatSettingsRenderer({store,navigate})(container,params);}); });
  };

  function openBatchSticker(personId, personName, container, params) {
    openSheet(`<div class="sheet-handle"></div><div class="sheet-title"><h3>批量导入图床表情</h3><button class="button ghost" data-sheet-close>取消</button></div><form class="stack"><label class="field"><span>一行一个 URL，或 名称 | URL | 标签</span><textarea name="urls" rows="8" placeholder="开心 | https://example.com/happy.gif | 开心,日常"></textarea></label><label class="field"><span>保存到</span><select name="scope"><option value="character">${escapeHtml(personName)} 独立库</option><option value="global">所有 CHAR 通用库</option></select></label><button class="button">解析并导入</button></form>`, { onReady(sheet){sheet.querySelector("form").addEventListener("submit",event=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget));const items=data.urls.split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith("#")).map(line=>{const parts=line.split("|").map(item=>item.trim());const url=parts.length>1?parts[1]:parts[0];return /^https?:\/\//.test(url)?{name:parts.length>1?parts[0]:"表情",url,tags:parts[2]?.split(",")||[]}:null;}).filter(Boolean);store.update(s=>{const target=data.scope==="global"?s.stickerLibraries.global:s.stickerLibraries.characters[personId];const known=new Set(target.map(item=>item.url));items.forEach(item=>{if(!known.has(item.url))target.push(item);});});closeSheet();showToast(`成功解析 ${items.length} 个地址`);createChatSettingsRenderer({store,navigate})(container,params);});}});
  }

  function readSmallImage(file) { return new Promise(resolve=>{if(file.size>600000)return resolve(null);const reader=new FileReader();reader.onload=()=>resolve({name:file.name,url:reader.result,tags:["本地"]});reader.onerror=()=>resolve(null);reader.readAsDataURL(file);}); }
}
