import { openSheet, closeSheet, showToast, setPhoneAppearance } from "./core/ui.js";
import { getRoute } from "./core/router.js";
import { personById } from "./core/store.js";

const iconPaths={
chat:'<path d="M13 15.5c5.4 0 9.8-3.4 9.8-7.5S18.4.5 13 .5 3.2 3.9 3.2 8c0 2 1 3.8 2.7 5.1l-1 4.1 4.4-2.3c1.1.4 2.4.6 3.7.6Z"/>',
contacts:'<circle cx="13" cy="8" r="4"/><path d="M5 23c.8-6.2 15.2-6.2 16 0"/>',
moments:'<circle cx="13" cy="13" r="9"/><circle cx="13" cy="13" r="3"/><path d="M13 4v6m0 6v6M4 13h6m6 0h6"/>',
forum:'<path d="M5 5h16v13H10l-5 4V5Z"/><path d="M9 9h8M9 13h6"/>',
delivery:'<path d="M4 10h18l-2 10H6L4 10Z"/><path d="M9 10c0-5 8-5 8 0"/>',
shop:'<path d="M5 9h16l-1.5 13h-13L5 9Z"/><path d="M9 10c0-6 8-6 8 0"/>',
flea:'<path d="M7 8h12v12H7z"/><path d="m4 7 3-3 3 3m12 12-3 3-3-3"/>',
sms:'<path d="M4 6h18v13H9l-5 3V6Z"/><path d="M8 11h10"/>',
phone:'<path d="M8 3 4.5 5.2c.5 8.7 6.6 14.8 15.3 15.3L22 17l-5-2-2 2c-3.2-1.3-5.7-3.8-7-7l2-2-2-5Z"/>',
worldbook:'<path d="M4 5c5-2 9 0 9 3v15c0-3-4-5-9-3V5Zm18 0c-5-2-9 0-9 3v15c0-3 4-5 9-3V5Z"/>',
presets:'<path d="M5 7h16M5 13h16M5 19h16"/><circle cx="9" cy="7" r="2"/><circle cx="17" cy="13" r="2"/><circle cx="11" cy="19" r="2"/>',
games:'<path d="M7 10h12l3 10-4 2-3-4H11l-3 4-4-2 3-10Z"/><path d="M9 13v4m-2-2h4"/><circle cx="17" cy="14" r=".8"/><circle cx="19" cy="16" r=".8"/>',
memos:'<rect x="5" y="3" width="16" height="20" rx="3"/><path d="M9 8h8M9 12h8M9 16h5"/>',
calendar:'<rect x="4" y="6" width="18" height="16" rx="3"/><path d="M4 11h18M8 3v6m10-6v6"/><path d="M10 15h2v2h-2z"/>',
wallet:'<path d="M4 7h17v15H4z"/><path d="M4 7l13-4v4m0 6h5v5h-5a2.5 2.5 0 0 1 0-5Z"/>',
focus:'<circle cx="13" cy="14" r="9"/><path d="M13 14V8m-4-5h8"/>',
together:'<path d="m10 8 8 5-8 5V8Z"/><circle cx="13" cy="13" r="11"/>',
api:'<path d="M8 5 3 13l5 8m10-16 5 8-5 8M15 3l-4 20"/>',
bridge:'<path d="M8 7H5a4 4 0 0 0 0 8h3m10-8h3a4 4 0 0 1 0 8h-3M8 11h10v4H8z"/>',
mcp:'<path d="M5 21V5l8 10 8-10v16"/>',
'data-settings':'<ellipse cx="13" cy="6" rx="8" ry="3"/><path d="M5 6v7c0 4 16 4 16 0V6m-16 7v7c0 4 16 4 16 0v-7"/>',
'phone-settings':'<path d="M13 4v3m0 12v3M4 13h3m12 0h3M6.6 6.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1"/><circle cx="13" cy="13" r="4"/>'
};
const iconTones=["#f4eee9","#e9eff2","#f1eee4","#edf0e9","#f1e9eb","#ebeaf1"];
function appIcon(id,index=0){const path=iconPaths[id]||'<circle cx="13" cy="13" r="8"/>';return `<svg viewBox="0 0 26 26" aria-hidden="true"><rect width="26" height="26" rx="7" fill="${iconTones[index%iconTones.length]}"/><g fill="none" stroke="#161616" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">${path}</g></svg>`}

function bunnySvg(kind="line"){
 const schemes={line:["#111","#fff"],glass:["#dfe9ed","#111"],moon:["#19191b","#f5f0df"],pixel:["#eee9e1","#111"],lop:["#efe7e8","#111"],minimal:["#f4f4f1","#111"],ink:["#111","#fff"],cloud:["#e8eef0","#111"]};
 const [bg,fg]=schemes[kind]||schemes.line;
 const ears=kind==="lop"?'<path d="M42 50C22 47 20 21 31 18c8-2 10 14 12 25m43 7c20-3 22-29 11-32-8-2-10 14-12 25"/>':'<path d="M45 48 36 16c-2-10 10-13 14-4l7 27m26 9 9-32c2-10-10-13-14-4l-7 27"/>';
 const face=kind==="pixel"?'<path d="M43 54h42v39H43zM51 65h7v7h-7zm19 0h7v7h-7zM60 78h8v6h-8z"/>':'<path d="M40 51c-10 9-11 28-2 39 12 15 40 15 52 0 9-11 8-30-2-39-13-12-35-12-48 0Z"/><circle cx="54" cy="69" r="3"/><circle cx="75" cy="69" r="3"/><path d="M61 80c2 2 5 2 7 0"/>';
 return `<svg viewBox="0 0 128 128" aria-hidden="true"><rect width="128" height="128" rx="29" fill="${bg}"/><g fill="none" stroke="${fg}" stroke-width="${kind==="minimal"?4:6}" stroke-linecap="round" stroke-linejoin="round">${ears}${face}</g></svg>`;
}
function bunnyData(kind){return "data:image/svg+xml,"+encodeURIComponent(bunnySvg(kind).replace('aria-hidden="true"',""));}

export function setupIosRefinement({store,navigate}){
 let mediaContext=null;
 const root=document.querySelector("#phone-root"),screen=document.querySelector("#app-screen");
 if(store.getState().appearance.dynamicIsland===undefined||store.getState().appearance.deviceProfile!=="iphone-pro")store.update(s=>{if(s.appearance.dynamicIsland===undefined)s.appearance.dynamicIsland=true;s.appearance.deviceProfile="iphone-pro"});
 applySystem();

 function applySystem(){
   const a=store.getState().appearance;
   root.classList.toggle("island-off",a.dynamicIsland===false);
   root.removeAttribute("data-device");
 }
 function refresh(){
   const route=getRoute();
   const quick=document.querySelector("#quick-settings");
   const editing=screen.dataset.app==="desktop"&&/完成|✓/.test(quick.textContent);
   quick.classList.toggle("desktop-edit-action",editing);
   if(screen.dataset.app==="desktop"){
     const now=new Date();
     const time=now.toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit",hour12:false});
     const title=document.querySelector("#header-title"),kicker=document.querySelector("#header-kicker");
     if(title.textContent!==time)title.textContent=time;
     const date=new Intl.DateTimeFormat("zh-CN",{month:"long",day:"numeric",weekday:"short"}).format(now);
     if(kicker.textContent!==date)kicker.textContent=date;
   }
   document.querySelectorAll(".app-tile[data-app-id] .app-icon").forEach((el,i)=>{if(!el.dataset.iosIcon&&!el.classList.contains("folder-icon")){el.innerHTML=appIcon(el.closest(".app-tile").dataset.appId,i);el.dataset.iosIcon="1"}});
   document.querySelectorAll("[data-bunny]").forEach(b=>{const strong=b.querySelector("strong");if(strong&&!strong.dataset.bunnyArt){strong.innerHTML=bunnySvg(b.dataset.bunny);strong.dataset.bunnyArt="1"}b.classList.toggle("selected",store.getState().appearance.bunnyIcon===b.dataset.bunny&&!/^https?:/.test(store.getState().appearance.appIcon||""))});
   const iconButton=document.querySelector("[data-app-icon] .avatar");
   if(iconButton&&!iconButton.dataset.bunnyArt&&!iconButton.querySelector("img")){iconButton.innerHTML=bunnySvg(store.getState().appearance.bunnyIcon||"line");iconButton.dataset.bunnyArt="1"}
   if(route.name==="phone-settings")enhancePhoneSettings();
   if(route.name==="chat-settings")enhanceChatSettings();
 }
 function enhancePhoneSettings(){
   const a=store.getState().appearance;
   const iconUrl=document.querySelector("[data-icon-url]");if(iconUrl)iconUrl.closest(".field")?.classList.add("upload-controls-hidden");
   document.querySelector("[data-icon-file]")?.closest(".row")?.classList.add("upload-controls-hidden");
   const wallpaper=document.querySelector(".wallpaper-preview");
   if(wallpaper&&!wallpaper.dataset.mediaReady){wallpaper.dataset.mediaReady="1";wallpaper.tabIndex=0;wallpaper.setAttribute("role","button");wallpaper.dataset.mediaTarget="wallpaper"}
   const wpUrl=document.querySelector("[data-wallpaper-url]");if(wpUrl)wpUrl.closest(".field")?.classList.add("upload-controls-hidden");
   document.querySelector("[data-wallpaper-file]")?.closest(".row")?.classList.add("upload-controls-hidden");
   const themeGrid=document.querySelector(".theme-preview-grid");
   if(themeGrid&&!document.querySelector("[data-island-toggle]")){
     themeGrid.insertAdjacentHTML("afterend",`<section class="card"><label class="setting-row"><div><span class="label">灵动岛</span><small>显示顶部实时状态区域</small></div><input class="switch" data-island-toggle type="checkbox" ${a.dynamicIsland===false?"":"checked"}></label></section>`);
     document.querySelector("[data-island-toggle]").onchange=e=>{store.update(s=>s.appearance.dynamicIsland=e.target.checked);applySystem();showToast(e.target.checked?"已开启灵动岛":"已关闭灵动岛")};
   }
 }
 function enhanceChatSettings(){
   document.querySelectorAll("[data-avatar-url]").forEach(x=>x.classList.add("upload-controls-hidden"));
   const bg=document.querySelector("[data-bg]");
   if(bg){const row=bg.closest(".row");row?.classList.add("upload-controls-hidden");if(row&&!document.querySelector('[data-media-target="chat-bg"]'))row.insertAdjacentHTML("afterend",mediaTrigger("chat-bg","聊天背景","选取照片、相机或图床"))}
   const sticker=document.querySelector("[data-sticker]");
   if(sticker){const row=sticker.closest(".row");row?.classList.add("upload-controls-hidden");if(row&&!document.querySelector('[data-media-target="sticker"]'))row.insertAdjacentHTML("afterend",mediaTrigger("sticker","添加表情图片","选取文件、照片、相机或图床"))}
 }
 function mediaTrigger(target,title,sub){return `<button type="button" class="media-upload-trigger" data-media-target="${target}"><span class="upload-glyph">＋</span><span><strong>${title}</strong><small>${sub}</small></span></button>`}
 function openPicker(context){mediaContext=context;openSheet(`<div class="sheet-handle"></div><div class="sheet-title"><h3>选择图片来源</h3><button class="button ghost" data-sheet-close>取消</button></div><div class="media-picker-grid">${[
 ["file","<path d='M5 3h9l5 5v15H5z'/><path d='M14 3v6h5'/>","选取文件"],
 ["photo","<rect x='3' y='5' width='20' height='16' rx='3'/><circle cx='9' cy='11' r='2'/><path d='m5 19 5-5 3 3 3-3 5 5'/>","照片"],
 ["camera","<path d='M4 8h4l2-3h6l2 3h4v13H4z'/><circle cx='13' cy='14' r='4'/>","相机"],
 ["url","<path d='M9 15 7 17a4 4 0 0 1-6-6l3-3a4 4 0 0 1 6 0m7 3 2-2a4 4 0 0 1 6 6l-3 3a4 4 0 0 1-6 0M8 13h10'/>","图床"]
 ].map(x=>`<button class="media-picker-option" data-media-source="${x[0]}"><svg viewBox="0 0 26 26">${x[1]}</svg><span>${x[2]}</span></button>`).join("")}</div><p class="sub">图片只在你确认后读取，并保存在当前设备数据中。</p>`,{onReady(sheet){sheet.querySelectorAll("[data-media-source]").forEach(b=>b.onclick=()=>chooseSource(b.dataset.mediaSource))}})}
 function chooseSource(source){
   if(source==="url"){const url=prompt("输入图床图片 URL","https://");if(/^https?:\/\//i.test(url||""))saveMedia(url);else if(url)showToast("请输入有效的图片地址");return}
   const input=document.createElement("input");input.type="file";input.accept=source==="file"?"image/*,.heic,.heif":"image/*";if(source==="camera")input.capture="environment";if(mediaContext?.target==="sticker")input.multiple=true;
   input.onchange=()=>{const files=[...input.files];if(!files.length)return;Promise.all(files.slice(0,20).map(readImage)).then(urls=>{if(mediaContext?.target==="sticker")saveStickers(urls,files);else saveMedia(urls[0])}).catch(e=>showToast(e.message))};input.click();
 }
 function readImage(file){return new Promise((resolve,reject)=>{if(!file.type.startsWith("image/"))return reject(Error("请选择图片文件"));if(file.size>4*1024*1024)return reject(Error("请选择 4MB 以内图片"));const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error("图片读取失败"));r.readAsDataURL(file)})}
 function saveMedia(url){
   const c=mediaContext||{};closeSheet();
   if(c.target==="app-icon"){store.update(s=>s.appearance.appIcon=url);setFavicon(url);navigate("phone-settings");showToast("应用图标已更新")}
   else if(c.target==="wallpaper"){store.update(s=>s.appearance.wallpaper=url);setPhoneAppearance(store.getState().appearance);navigate("phone-settings");showToast("壁纸已更新")}
   else if(c.target==="avatar"){const {kind,personId,userId}=c;store.update(s=>{if(kind==="char")s.chatProfiles[personId].avatarUrl=url;else personById(s,userId).avatarUrl=url});navigate("chat-settings",{personId:c.personId});showToast("头像已更新")}
   else if(c.target==="chat-bg"){store.update(s=>{s.chatAppearance.background=url;s.chatAppearance.backgroundHistory=[url,...s.chatAppearance.backgroundHistory.filter(x=>x!==url)].slice(0,12)});navigate("chat-settings",{personId:c.personId});showToast("聊天背景已保存")}
 }
 function saveStickers(urls,files){const c=mediaContext;closeSheet();store.update(s=>urls.forEach((url,i)=>s.stickerLibraries.characters[c.personId].push({name:files[i]?.name||"图床表情",url,tags:["图片"]})));navigate("chat-settings",{personId:c.personId});showToast(`已添加 ${urls.length} 张图片`)}
 function setFavicon(url){const icon=document.querySelector('link[rel="icon"]');if(icon)icon.href=url}
 document.addEventListener("click",e=>{
   const bunny=e.target.closest("[data-bunny]");if(bunny){e.preventDefault();e.stopImmediatePropagation();const kind=bunny.dataset.bunny,url=bunnyData(kind);store.update(s=>{s.appearance.bunnyIcon=kind;s.appearance.appIcon=url});setFavicon(url);navigate("phone-settings");showToast("已换成标准兔子图标");return}
   const target=e.target.closest("[data-media-target],[data-app-icon],[data-avatar]");
   if(!target)return;
   e.preventDefault();e.stopImmediatePropagation();
   const route=getRoute(),personId=route.params.personId||"char-jun",state=store.getState();
   if(target.matches("[data-app-icon]"))openPicker({target:"app-icon"});
   else if(target.matches("[data-avatar]"))openPicker({target:"avatar",kind:target.dataset.avatar,personId,userId:state.currentUserId});
   else openPicker({target:target.dataset.mediaTarget,personId});
 },true);
 let swipe=null;
 screen.addEventListener("pointerdown",e=>{if(screen.dataset.app!=="desktop"&&e.clientX<38)swipe={x:e.clientX,y:e.clientY}}, {passive:true});
 screen.addEventListener("pointerup",e=>{if(!swipe)return;const dx=e.clientX-swipe.x,dy=Math.abs(e.clientY-swipe.y);swipe=null;if(dx>72&&dy<55){const r=getRoute();navigate(["conversation","chat-settings"].includes(r.name)?"chat":"desktop");showToast("已退出当前界面")}}, {passive:true});
 const observer=new MutationObserver(refresh);observer.observe(document.querySelector("#app-screen"),{subtree:true,childList:true,characterData:true});
 setInterval(refresh,30000);refresh();
}
