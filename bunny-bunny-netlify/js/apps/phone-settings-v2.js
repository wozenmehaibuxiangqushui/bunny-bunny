import { escapeHtml, showToast, setPhoneAppearance, openSheet, closeSheet } from "../core/ui.js";

const bunnyIcons=[
  ["classic","经典兔"],["ribbon","缎带兔"],["orbit","月环兔"],["lop","垂耳兔"],
  ["stamp","邮票兔"],["cloud","云朵兔"],["mono","黑曜兔"],["glass","玻璃兔"]
];

export function applyAppIdentity(a){document.title=a.appName||"bunny bunny";const mark=a.appIcon||makeIcon(a.bunnyIcon||"classic");let icon=document.querySelector('link[rel="icon"]');if(icon)icon.href=mark;const manifest={name:a.appName||"bunny bunny",short_name:a.appName||"bunny",start_url:"./",display:"standalone",background_color:"#f4f4f2",theme_color:"#f4f4f2",icons:a.appIcon?[{src:a.appIcon,sizes:"any",type:"image/png"}]:[]};let link=document.querySelector('link[rel="manifest"]');if(link){if(link.dataset.dynamic)URL.revokeObjectURL(link.href);link.href=URL.createObjectURL(new Blob([JSON.stringify(manifest)],{type:"application/manifest+json"}));link.dataset.dynamic="1"}}
function bunnySvg(kind="classic"){
  const accents={classic:"#f1eee7",ribbon:"#e8d9d5",orbit:"#dbe1e4",lop:"#ede5d6",stamp:"#e6ded0",cloud:"#dfe6e5",mono:"#161616",glass:"#cbdadd"},bg=accents[kind]||accents.classic,ink=kind==="mono"?"#fff":"#151515";
  const ears=kind==="lop"?'<path d="M36 28C25 11 25 5 30 4c6-1 9 13 10 22M61 28C72 11 72 5 67 4c-6-1-9 13-10 22"/>':'<path d="M38 28C30 13 31 4 37 4c6 0 8 13 9 22M55 27c1-11 4-23 10-22 6 1 5 11-3 25"/>';
  const accent=kind==="ribbon"?'<path d="m68 62 12-7-2 13 8 9-14 1-7 11-4-15Z"/>':kind==="orbit"?'<circle cx="51" cy="51" r="39"/><path d="M12 58c22 11 52 8 77-8"/>':kind==="stamp"?'<rect x="14" y="14" width="74" height="74" rx="8"/><path d="M14 24H8m6 13H8m6 13H8m6 13H8m6 13H8m80-52h-6m6 13h-6m6 13h-6m6 13h-6m6 13h-6"/>':kind==="cloud"?'<path d="M17 74c-9 0-12-12-5-17-2-10 10-17 18-11 5-12 23-11 27 2 11-4 21 7 16 17 7 8-1 18-11 16"/>':'';
  return`<svg viewBox="0 0 102 102" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="1" y="1" width="100" height="100" rx="25" fill="${bg}"/><g fill="none" stroke="${ink}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${accent}${ears}<path d="M29 53c0-17 10-27 22-27s23 11 23 27c0 20-10 34-23 34S29 73 29 53Z"/><circle cx="43" cy="54" r="1.7" fill="${ink}"/><circle cx="60" cy="54" r="1.7" fill="${ink}"/><path d="M48 63c2 2 5 2 7 0M51.5 63v4"/></g></svg>`
}
function makeIcon(kind){return"data:image/svg+xml,"+encodeURIComponent(bunnySvg(kind))}

export function createPhoneSettingsRenderer({store,navigate}){
  return container=>{
    container.className="app-view phone-settings-view";
    const state=store.getState(),a=state.appearance,iconMarkup=a.appIcon?`<img src="${escapeHtml(a.appIcon)}" alt="">`:bunnySvg(a.bunnyIcon||"classic");
    container.innerHTML=`
      <div class="section-title"><h3>应用身份</h3><span>同步桌面与书签</span></div>
      <section class="card stack identity-card-v4">
        <label class="field"><span>应用名称</span><input data-app-name maxlength="24" value="${escapeHtml(a.appName||"bunny bunny")}"></label>
        <button class="identity-icon-row" data-app-icon><span class="identity-icon-preview">${iconMarkup}</span><span><strong>应用图标</strong><small>轻点后从相册或图床更换</small></span><i>›</i></button>
      </section>
      <div class="section-title"><h3>兔子图标设计</h3><span>标准图标可随时切换</span></div>
      <section class="bunny-icon-grid">${bunnyIcons.map(([id,name])=>`<button class="bunny-choice ${a.bunnyIcon===id&&!a.appIcon?"selected":""}" data-bunny="${id}"><strong>${bunnySvg(id)}</strong><span>${name}</span></button>`).join("")}</section>
      <div class="section-title"><h3>外观</h3><span>全系统自动跟随</span></div>
      <section class="theme-preview-grid">
        <button class="theme-preview mono ${a.theme==="mono"?"selected":""}" data-theme="mono"><span>MONO</span><strong>黑白简约</strong></button>
        <button class="theme-preview glass ${a.theme==="glass"?"selected":""}" data-theme="glass"><span>LIQUID</span><strong>水玻璃</strong></button>
      </section>
      <div class="section-title"><h3>系统壁纸</h3><span>图片保存在本机</span></div>
      <section class="card stack"><button class="wallpaper-upload-card ${a.wallpaper?"has-image":""}" data-wallpaper style="background-image:url('${escapeHtml(a.wallpaper||"")}')"><span>${a.wallpaper?"更换壁纸":"选择壁纸"}</span><small>相册 / 图床</small></button>${a.wallpaper?'<button class="button ghost" data-clear-wallpaper>恢复默认壁纸</button>':""}</section>
      <div class="section-title"><h3>系统与数据</h3><span>统一从设置进入</span></div>
      <section class="card">
        ${setting("模型与 API","文本、TTS 与生图接口","api")}
        ${setting("聊天全局设置","世界书、CSS、气泡、字体与背景","chat-settings")}
        ${setting("数据管理","云备份、导出、查看、清理与压缩","data-settings")}
        ${setting("现实桥","现实设备能力与授权边界","bridge")}
        ${setting("MCP 中心","工具连接和执行权限","mcp")}
      </section>
      <div class="section-title"><h3>恢复</h3><span>仅恢复外观</span></div>
      <section class="card"><div class="setting-row"><div><span class="label">恢复默认外观</span><small>不会清空聊天、人物、小组件与 API 数据</small></div><button class="button secondary" data-reset>恢复</button></div></section>`;
    container.querySelector("[data-app-name]").onchange=e=>{store.update(s=>s.appearance.appName=e.target.value.trim()||"bunny bunny");applyAppIdentity(store.getState().appearance);showToast("应用名称已保存")};
    container.querySelectorAll("[data-theme]").forEach(b=>b.onclick=()=>{store.update(s=>s.appearance.theme=b.dataset.theme);setPhoneAppearance(store.getState().appearance);createPhoneSettingsRenderer({store,navigate})(container)});
    container.querySelectorAll("[data-bunny]").forEach(b=>b.onclick=()=>{store.update(s=>{s.appearance.bunnyIcon=b.dataset.bunny;s.appearance.appIcon=""});applyAppIdentity(store.getState().appearance);createPhoneSettingsRenderer({store,navigate})(container);showToast("兔子图标已应用")});
    container.querySelectorAll("[data-jump]").forEach(b=>b.onclick=()=>navigate(b.dataset.jump,b.dataset.jump==="chat-settings"?{personId:"char-jun"}:{}));
    container.querySelector("[data-app-icon]").onclick=()=>openImageSourcePicker(value=>{store.update(s=>s.appearance.appIcon=value);applyAppIdentity(store.getState().appearance);createPhoneSettingsRenderer({store,navigate})(container);showToast("应用图标已保存")});
    container.querySelector("[data-wallpaper]").onclick=()=>openImageSourcePicker(value=>{store.update(s=>s.appearance.wallpaper=value);setPhoneAppearance(store.getState().appearance);createPhoneSettingsRenderer({store,navigate})(container);showToast("壁纸已保存")});
    container.querySelector("[data-clear-wallpaper]")?.addEventListener("click",()=>{store.update(s=>s.appearance.wallpaper="");setPhoneAppearance(store.getState().appearance);createPhoneSettingsRenderer({store,navigate})(container)});
    container.querySelector("[data-reset]").onclick=()=>{store.update(s=>s.appearance={...s.appearance,theme:"mono",wallpaperType:"gradient",wallpaper:"",appName:"bunny bunny",appIcon:"",bunnyIcon:"classic"});setPhoneAppearance(store.getState().appearance);applyAppIdentity(store.getState().appearance);createPhoneSettingsRenderer({store,navigate})(container);showToast("已恢复默认外观")};
  };
}
function setting(label,small,route){return`<div class="setting-row"><div><span class="label">${label}</span><small>${small}</small></div><button class="button secondary" data-jump="${route}">管理</button></div>`}
function openImageSourcePicker(done){openSheet(`<section class="identity-source-sheet"><div class="sheet-title"><div><small>IMAGE SOURCE</small><h3>选择图片</h3></div><button class="button ghost" data-sheet-close>取消</button></div><div class="identity-source-options"><label><span>${sourceIcon("image")}</span><strong>从相册选择</strong><small>自动压缩并保存在本机</small><input type="file" accept="image/*" hidden data-source-file></label><button data-source-url><span>${sourceIcon("link")}</span><strong>使用图床</strong><small>粘贴 HTTP(S) 图片地址</small></button></div><form class="identity-url-form" hidden><label class="field"><span>图片地址</span><input name="url" type="url" placeholder="https://…"></label><div class="sheet-split-actions"><button type="button" class="button ghost" data-url-back>返回</button><button class="button">使用图片</button></div></form></section>`,{onReady(sheet){const options=sheet.querySelector(".identity-source-options"),form=sheet.querySelector(".identity-url-form");sheet.querySelector("[data-source-url]").onclick=()=>{options.hidden=true;form.hidden=false;form.elements.url.focus()};sheet.querySelector("[data-url-back]").onclick=()=>{form.hidden=true;options.hidden=false};form.onsubmit=e=>{e.preventDefault();const url=form.elements.url.value.trim();if(!/^https?:\/\//i.test(url))return showToast("请输入有效图片地址");closeSheet();done(url)};sheet.querySelector("[data-source-file]").onchange=async e=>{try{const value=await readImage(e.target.files?.[0]);closeSheet();done(value)}catch(error){showToast(error.message)}}}})}
async function readImage(file){if(!file)throw Error("没有选择图片");if(!file.type.startsWith("image/"))throw Error("请选择图片文件");if(file.size>18*1024*1024)throw Error("请选择 18MB 以内图片");const bitmap=globalThis.createImageBitmap?await createImageBitmap(file):await htmlImage(file),scale=Math.min(1,1200/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext("2d").drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();if(bitmap.dataset?.url)URL.revokeObjectURL(bitmap.dataset.url);return canvas.toDataURL("image/webp",.84)}
function htmlImage(file){return new Promise((resolve,reject)=>{const image=new Image(),url=URL.createObjectURL(file);image.dataset.url=url;image.onload=()=>resolve(image);image.onerror=()=>{URL.revokeObjectURL(url);reject(Error("图片无法读取"))};image.src=url})}
function sourceIcon(type){const d=type==="image"?'M4 5h16v14H4V5Zm2 12 5-5 3 3 2-2 2 2':'M9 15 15 9m-7 1-2 2a3 3 0 0 0 4 4l2-2m4 0 2-2a3 3 0 0 0-4-4l-2 2';return`<svg viewBox="0 0 24 24"><path d="${d}"/></svg>`}
