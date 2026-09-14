import { escapeHtml, showToast, setPhoneAppearance, openSheet, closeSheet } from "../core/ui.js";

const bunnyIcons=[
  ["line","线条兔","兔"],["glass","玻璃兔","♢"],["moon","月亮兔","☾"],["pixel","像素兔","▦"],
  ["lop","垂耳兔","♧"],["minimal","极简兔","○"],["ink","黑曜兔","●"],["cloud","云朵兔","☁"]
];

export function applyAppIdentity(a){document.title=a.appName||"bunny bunny";const mark=a.appIcon||makeIcon(a.bunnyIcon||"line");let icon=document.querySelector('link[rel="icon"]');if(icon)icon.href=mark;const manifest={name:a.appName||"bunny bunny",short_name:a.appName||"bunny",start_url:"./",display:"standalone",background_color:"#f4f4f2",theme_color:"#f4f4f2",icons:a.appIcon?[{src:a.appIcon,sizes:"any",type:"image/png"}]:[]};let link=document.querySelector('link[rel="manifest"]');if(link){if(link.dataset.dynamic)URL.revokeObjectURL(link.href);link.href=URL.createObjectURL(new Blob([JSON.stringify(manifest)],{type:"application/manifest+json"}));link.dataset.dynamic="1"}}
function makeIcon(kind){const marks={line:"兔",glass:"◇",moon:"☾",pixel:"▦",lop:"♧",minimal:"○",ink:"●",cloud:"☁"},svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="30" fill="${kind==="glass"?"#dfe6e7":"#111"}"/><text x="64" y="80" text-anchor="middle" font-size="54" fill="${kind==="glass"?"#111":"#fff"}">${marks[kind]||"兔"}</text></svg>`;return"data:image/svg+xml,"+encodeURIComponent(svg)}

export function createPhoneSettingsRenderer({store,navigate}){
  return container=>{
    const state=store.getState(),a=state.appearance;
    container.innerHTML=`
      <div class="section-title"><h3>应用身份</h3><span>同步主屏幕与书签</span></div>
      <section class="card stack">
        <label class="field"><span>应用名称</span><input data-app-name maxlength="24" value="${escapeHtml(a.appName||"bunny bunny")}"></label>
        <div class="setting-row"><div><span class="label">应用图标</span><small>图片 / 文件 / 拍摄，或使用图床链接</small></div><button class="avatar-edit" data-app-icon><span class="avatar">${a.appIcon?`<img src="${escapeHtml(a.appIcon)}" alt="">`:(bunnyIcons.find(x=>x[0]===a.bunnyIcon)?.[2]||"兔")}</span></button></div>
        <label class="field"><span>图床 URL</span><div class="row"><input data-icon-url placeholder="https://…"><button class="button secondary" data-use-icon-url>应用</button></div></label>
        <div class="row"><label class="button secondary file-button">选择图片 / 文件<input type="file" accept="image/*" data-icon-file hidden></label><label class="button secondary file-button">拍摄<input type="file" accept="image/*" capture="environment" data-icon-camera hidden></label></div>
      </section>
      <div class="section-title"><h3>兔子图标设计</h3><span>未上传自定义图标时使用</span></div>
      <section class="bunny-icon-grid">${bunnyIcons.map(([id,name,mark])=>`<button class="bunny-choice ${a.bunnyIcon===id&&!a.appIcon?"selected":""}" data-bunny="${id}"><strong>${mark}</strong>${name}</button>`).join("")}</section>
      <div class="section-title"><h3>外观</h3><span>保留原版水玻璃</span></div>
      <section class="theme-preview-grid">
        <button class="theme-preview mono ${a.theme==="mono"?"selected":""}" data-theme="mono"><span>MONO</span><strong>黑白简约</strong></button>
        <button class="theme-preview glass ${a.theme==="glass"?"selected":""}" data-theme="glass"><span>LIQUID</span><strong>水玻璃</strong></button>
      </section>
      <div class="section-title"><h3>系统壁纸</h3><span>图片保存在本机</span></div>
      <section class="card stack">
        <div class="wallpaper-preview ${a.wallpaper?"has-image":""}" style="background-image:url('${escapeHtml(a.wallpaper)}')"><span>${a.wallpaper?"当前壁纸":"默认留白壁纸"}</span></div>
        <label class="field"><span>图床链接</span><input data-wallpaper-url value="${a.wallpaper?.startsWith("http")?escapeHtml(a.wallpaper):""}" placeholder="https://…"></label>
        <div class="row"><button class="button secondary" data-use-wallpaper-url>使用链接</button><label class="button secondary file-button">上传图片<input type="file" accept="image/*" data-wallpaper-file hidden></label><button class="button ghost" data-clear-wallpaper>清除</button></div>
      </section>
      <div class="section-title"><h3>系统与数据</h3><span>原功能全部保留</span></div>
      <section class="card">
        ${setting("模型与 API","文本、MiniMax 语音、生图接口","api")}
        ${setting("聊天全局设置","世界书、CSS、气泡、字体与背景","chat-settings")}
        ${setting("数据管理","云备份、导出、查看、清理与压缩","data-settings")}
        ${setting("现实桥","现实设备能力与授权边界","bridge")}
        ${setting("MCP 中心","工具连接和执行权限","mcp")}
      </section>
      <div class="section-title"><h3>恢复</h3><span>仅恢复外观</span></div>
      <section class="card"><div class="setting-row"><div><span class="label">恢复默认外观</span><small>不会清空聊天、人物、小组件与 API 数据</small></div><button class="button secondary" data-reset>恢复</button></div></section>`;
    container.querySelector("[data-app-name]").onchange=e=>{store.update(s=>s.appearance.appName=e.target.value.trim()||"bunny bunny");applyAppIdentity(store.getState().appearance);showToast("应用名称已保存")};
    container.querySelectorAll("[data-theme]").forEach(b=>b.onclick=()=>{store.update(s=>s.appearance.theme=b.dataset.theme);setPhoneAppearance(store.getState().appearance);createPhoneSettingsRenderer({store,navigate})(container)});
    container.querySelectorAll("[data-bunny]").forEach(b=>b.onclick=()=>{store.update(s=>{s.appearance.bunnyIcon=b.dataset.bunny;s.appearance.appIcon=""});applyAppIdentity(store.getState().appearance);createPhoneSettingsRenderer({store,navigate})(container);showToast("兔子图标已应用到主屏幕")});
    container.querySelectorAll("[data-jump]").forEach(b=>b.onclick=()=>navigate(b.dataset.jump,b.dataset.jump==="chat-settings"?{personId:"char-jun"}:{}));
    container.querySelector("[data-use-icon-url]").onclick=()=>{const url=container.querySelector("[data-icon-url]").value.trim();if(!validUrl(url))return showToast("请输入有效的 HTTP(S) 图片地址");store.update(s=>s.appearance.appIcon=url);applyAppIdentity(store.getState().appearance);createPhoneSettingsRenderer({store,navigate})(container)};
    container.querySelector("[data-use-wallpaper-url]").onclick=()=>{const url=container.querySelector("[data-wallpaper-url]").value.trim();if(!validUrl(url))return showToast("请输入有效的 HTTP(S) 图片地址");store.update(s=>s.appearance.wallpaper=url);setPhoneAppearance(store.getState().appearance);createPhoneSettingsRenderer({store,navigate})(container)};
    bindImage(container.querySelector("[data-icon-file]"),value=>store.update(s=>s.appearance.appIcon=value),()=>createPhoneSettingsRenderer({store,navigate})(container));
    bindImage(container.querySelector("[data-icon-camera]"),value=>store.update(s=>s.appearance.appIcon=value),()=>createPhoneSettingsRenderer({store,navigate})(container));
    bindImage(container.querySelector("[data-wallpaper-file]"),value=>{store.update(s=>s.appearance.wallpaper=value);setPhoneAppearance(store.getState().appearance)},()=>createPhoneSettingsRenderer({store,navigate})(container));
    container.querySelector("[data-app-icon]").onclick=()=>openSheet(`<div class="sheet-handle"></div><div class="sheet-title"><h3>更换应用图标</h3><button class="button ghost" data-sheet-close>关闭</button></div><p class="callout">可在当前页面使用图片文件、相机拍摄、图床链接或兔子图标库。</p><button class="button" data-sheet-close>我知道了</button>`);
    container.querySelector("[data-clear-wallpaper]").onclick=()=>{store.update(s=>s.appearance.wallpaper="");setPhoneAppearance(store.getState().appearance);createPhoneSettingsRenderer({store,navigate})(container)};
    container.querySelector("[data-reset]").onclick=()=>{store.update(s=>s.appearance={...s.appearance,theme:"mono",wallpaperType:"gradient",wallpaper:"",appName:"bunny bunny",appIcon:"",bunnyIcon:"line"});setPhoneAppearance(store.getState().appearance);createPhoneSettingsRenderer({store,navigate})(container);showToast("已恢复默认外观")};
  };
}
function setting(label,small,route){return`<div class="setting-row"><div><span class="label">${label}</span><small>${small}</small></div><button class="button secondary" data-jump="${route}">管理</button></div>`}
function validUrl(value){return/^https?:\/\//i.test(value)}
function bindImage(input,save,done){input.onchange=e=>{const file=e.target.files[0];if(!file)return;if(file.size>3*1024*1024)return showToast("请选择 3MB 以内的图片");const reader=new FileReader();reader.onload=()=>{save(reader.result);applyAppIdentity(JSON.parse(localStorage.getItem("bunny-bunny:m0")||"{}").appearance||{});done();showToast("图片已保存")};reader.readAsDataURL(file)}}
