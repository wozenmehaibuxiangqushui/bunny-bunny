import { personById } from "../core/store.js";
import { escapeHtml, openSheet, closeSheet, showToast } from "../core/ui.js";

export const appRegistry = {
  chat:["聊天","◌","chat"],contacts:["联系人","人","contacts"],moments:["朋友圈","◎","moments"],
  forum:["论坛","文","forum"],delivery:["外卖","食","delivery"],shop:["购物","购","shop"],flea:["二手","换","flea"],
  sms:["短信","信","sms"],phone:["电话","话","phone"],worldbook:["世界书","世","worldbook"],presets:["预设","预","presets"],
  games:["游戏","玩","games"],memos:["备忘录","记","memos"],calendar:["日历","日","calendar"],wallet:["钱包","¥","wallet"],
  focus:["陪伴专注","25","focus"],together:["一起刷","▷","together"],api:["模型与 API","AI","api"],bridge:["现实桥","⌁","bridge"],
  mcp:["MCP","M","mcp"],"data-settings":["数据管理","数","data-settings"],"phone-settings":["手机设置","＋","phone-settings"]
};
const profiles={
  "iphone-classic":{label:"iPhone 12—15 / 16",cols:4,rows:4,width:390,height:844},
  "iphone-pro":{label:"iPhone Pro",cols:4,rows:5,width:402,height:874},
  "iphone-max":{label:"iPhone Pro Max",cols:4,rows:5,width:440,height:930},
  "android-pro":{label:"Android Pro / Max",cols:5,rows:5,width:430,height:900}
};
const widgetCatalog=[
  {type:"date",title:"日期",content:"今天也要慢慢生活",size:"small",style:{background:"#fff",color:"#111"}},
  {type:"weather",title:"天气",content:"首尔 · 小雨 17°C",size:"small",style:{background:"#dfe5e8",color:"#111"}},
  {type:"memo",title:"便签",content:"周末去拿唱片",size:"wide",style:{background:"#f1eee7",color:"#111"}},
  {type:"character",title:"CHAR STATUS",content:"现在正在唱片店。",size:"wide",style:{background:"#111",color:"#fff"}}
];

export function createDesktopRenderer({store,navigate}){
  let editMode=false,currentPage=0,dragId="",edgeTimer=null;
  function render(container){
    container.className="app-view";
    const state=store.getState(),profile=profiles[state.appearance.deviceProfile]||profiles["iphone-pro"],cap=profile.cols*profile.rows;
    const jun=personById(state,"char-jun"),items=[
      ...state.desktopOrder.filter(id=>appRegistry[id]).map(id=>({kind:"app",id})),
      ...(state.desktopFolders||[]).map(folder=>({kind:"folder",id:folder.id}))
    ];
    const pages=[];for(let i=0;i<items.length;i+=cap)pages.push(items.slice(i,i+cap));if(!pages.length)pages.push([]);
    currentPage=Math.min(currentPage,pages.length-1);
    configureHeader(container);
    container.innerHTML=`
      <section class="desktop-greeting"><div><div class="date">${String(new Date().getDate()).padStart(2,"0")}</div><p>${new Intl.DateTimeFormat("zh-CN",{month:"long",day:"numeric",weekday:"short"}).format(new Date())} · ${escapeHtml(state.worlds[0].name)}</p></div><button class="device-chip" data-device>${escapeHtml(profile.label)} · ${profile.cols}×${profile.rows}</button></section>
      <div class="desktop-pages" data-pages><div class="desktop-track" style="transform:translateX(-${currentPage*100}%)">
        ${pages.map((page,index)=>`<section class="desktop-page" data-page="${index}">
          ${index===0?`<section class="desktop-widgets">${state.desktopWidgets.map(widget=>widgetCard(widget,jun)).join("")}</section>`:""}
          <section class="app-grid ${editMode?"editing":""}" style="--desktop-cols:${profile.cols};--desktop-rows:${profile.rows}" aria-label="第 ${index+1} 页应用">${page.map(item=>tile(item,state)).join("")}</section>
        </section>`).join("")}
      </div></div>
      <div class="page-dots">${pages.map((_,i)=>`<button class="${i===currentPage?"active":""}" data-page-dot="${i}" aria-label="第 ${i+1} 页"></button>`).join("")}</div>
      ${editMode?'<p class="edit-tip">拖到左右边缘跨页 · 拖到另一个应用上创建文件夹</p>':'<p class="desktop-hint">左右滑动翻页 · 长按应用管理桌面</p>'}`;
    bind(container,pages,cap);
  }
  function configureHeader(container){
    const left=document.querySelector("#back-button"),right=document.querySelector("#quick-settings");
    if(editMode){left.classList.remove("hidden");left.textContent="＋";left.setAttribute("aria-label","添加小组件");left.onclick=()=>openWidgetManager(container);right.textContent="完成";right.onclick=()=>{editMode=false;showToast("主屏幕布局已保存");render(container)}}
    else{left.classList.add("hidden");left.textContent="‹";left.onclick=null;right.textContent="⌁";right.onclick=()=>navigate("phone-settings")}
  }
  function tile(item,state){
    if(item.kind==="folder"){const f=state.desktopFolders.find(x=>x.id===item.id);if(!f)return"";return`<button class="app-tile folder-tile" data-kind="folder" data-app-id="${f.id}" draggable="${editMode}">${editMode?'<span class="delete-badge">−</span>':""}<span class="app-icon folder-icon">${f.items.slice(0,4).map(id=>`<i>${appRegistry[id]?.[1]||"·"}</i>`).join("")}</span><span>${escapeHtml(f.name)}</span></button>`}
    const app=appRegistry[item.id];return`<button class="app-tile" data-kind="app" data-app-id="${item.id}" data-route="${app[2]}" draggable="${editMode}">${editMode?'<span class="delete-badge">−</span>':""}<span class="app-icon">${app[1]}</span><span>${escapeHtml(app[0])}</span></button>`
  }
  function widgetCard(widget,person){const content=widget.type==="date"?new Intl.DateTimeFormat("zh-CN",{month:"long",day:"numeric"}).format(new Date()):widget.content;return`<article class="home-widget ${widget.size}" data-widget-id="${escapeHtml(widget.id)}" style="--widget-bg:${escapeHtml(widget.style?.background||"#fff")};--widget-color:${escapeHtml(widget.style?.color||"#111")}"><span>${escapeHtml(widget.title)}</span><strong>${escapeHtml(content)}</strong>${widget.type==="character"?`<small>${escapeHtml(person.note)}</small>`:""}${editMode?'<button class="widget-remove" aria-label="移除小组件">−</button>':""}</article>`}
  function bind(container,pages,cap){
    container.querySelector("[data-device]").onclick=()=>openDevicePicker(container);
    container.querySelectorAll("[data-page-dot]").forEach(dot=>dot.onclick=()=>{currentPage=Number(dot.dataset.pageDot);render(container)});
    let startX=0;const viewport=container.querySelector("[data-pages]");
    viewport.onpointerdown=e=>{startX=e.clientX};
    viewport.onpointerup=e=>{if(editMode)return;const dx=e.clientX-startX;if(Math.abs(dx)>38){currentPage=Math.max(0,Math.min(pages.length-1,currentPage+(dx<0?1:-1)));render(container)}};
    container.querySelectorAll(".app-tile").forEach(tile=>{
      let hold;
      tile.onpointerdown=e=>{if(!editMode){hold=setTimeout(()=>{editMode=true;navigator.vibrate?.(20);render(container)},480);return}dragId=tile.dataset.appId;tile.classList.add("dragging");tile.setPointerCapture?.(e.pointerId)};
      tile.onpointermove=e=>{if(!editMode||!dragId)return;const rect=document.querySelector("#phone-root").getBoundingClientRect();let dir=0;if(e.clientX<rect.left+42)dir=-1;if(e.clientX>rect.right-42)dir=1;if(dir&&!edgeTimer)edgeTimer=setTimeout(()=>{currentPage=Math.max(0,Math.min(pages.length-1,currentPage+dir));moveToPage(dragId,currentPage,cap);edgeTimer=null},520);if(!dir&&edgeTimer){clearTimeout(edgeTimer);edgeTimer=null}};
      tile.onpointerup=e=>{clearTimeout(hold);if(!editMode){if(tile.dataset.kind==="folder")openFolder(tile.dataset.appId,container);else navigate(tile.dataset.route);return}tile.classList.remove("dragging");if(edgeTimer){clearTimeout(edgeTimer);edgeTimer=null}const target=document.elementFromPoint(e.clientX,e.clientY)?.closest(".app-tile");if(target&&target.dataset.kind==="app"&&tile.dataset.kind==="app"&&target.dataset.appId!==dragId)createFolder(dragId,target.dataset.appId,container);dragId=""};
      tile.onpointercancel=()=>{clearTimeout(hold);if(edgeTimer)clearTimeout(edgeTimer);edgeTimer=null;dragId=""};
      tile.ondragstart=e=>{dragId=tile.dataset.appId;e.dataTransfer.setData("text/plain",dragId)};
      tile.ondragover=e=>e.preventDefault();
      tile.ondrop=e=>{e.preventDefault();const from=e.dataTransfer.getData("text/plain");if(from&&tile.dataset.kind==="app"&&from!==tile.dataset.appId)createFolder(from,tile.dataset.appId,container)};
    });
    container.querySelectorAll(".widget-remove").forEach(button=>button.onclick=e=>{e.stopPropagation();const id=button.closest("[data-widget-id]").dataset.widgetId;store.update(s=>s.desktopWidgets=s.desktopWidgets.filter(w=>w.id!==id));render(container)});
    if(editMode)container.querySelectorAll(".home-widget").forEach(widget=>widget.onclick=e=>{if(!e.target.closest(".widget-remove"))openCustomWidget(container,widget.dataset.widgetId)});
  }
  function moveToPage(id,page,cap){store.update(s=>{const index=s.desktopOrder.indexOf(id);if(index<0)return;const app=s.desktopOrder.splice(index,1)[0];s.desktopOrder.splice(Math.min(page*cap,s.desktopOrder.length),0,app)});showToast(`已移到第 ${page+1} 页`);render(document.querySelector("#app-view"))}
  function createFolder(from,to,container){store.update(s=>{if((s.desktopFolders||[]).some(f=>f.items.includes(from)||f.items.includes(to)))return;s.desktopOrder=s.desktopOrder.filter(id=>id!==from&&id!==to);s.desktopFolders.push({id:`folder-${Date.now()}`,name:"新建文件夹",items:[from,to]})});showToast("已创建文件夹");render(container)}
  function openFolder(id,container){const folder=store.getState().desktopFolders.find(f=>f.id===id);if(!folder)return;openSheet(`<div class="sheet-handle"></div><input class="folder-name-input" data-folder-name value="${escapeHtml(folder.name)}" aria-label="文件夹名称"><div class="folder-apps">${folder.items.map(appId=>tile({kind:"app",id:appId},store.getState())).join("")}</div><button class="button ghost" data-sheet-close>完成</button>`,{onReady(sheet){sheet.querySelector("[data-folder-name]").onchange=e=>{store.update(s=>{const f=s.desktopFolders.find(x=>x.id===id);f.name=e.target.value.trim()||"未命名"});showToast("文件夹名称已保存")};sheet.querySelectorAll(".app-tile").forEach(t=>t.onclick=()=>{closeSheet();navigate(t.dataset.route)})}})}
  function openDevicePicker(container){const state=store.getState();openSheet(`<div class="sheet-handle"></div><div class="sheet-title"><h3>屏幕与桌面容量</h3><button class="button ghost" data-sheet-close>关闭</button></div><div class="device-profile-list">${Object.entries(profiles).map(([id,p])=>`<button class="device-profile ${state.appearance.deviceProfile===id?"selected":""}" data-profile="${id}"><strong>${p.label}</strong><span>${p.width}×${p.height} · 固定 ${p.cols*p.rows} 格 / 页</span></button>`).join("")}</div>`,{onReady(sheet){sheet.querySelectorAll("[data-profile]").forEach(button=>button.onclick=()=>{store.update(s=>s.appearance.deviceProfile=button.dataset.profile);document.querySelector("#phone-root").dataset.device=button.dataset.profile;closeSheet();currentPage=0;render(container)})}})}
  function openWidgetManager(container){openSheet(`<div class="sheet-handle"></div><div class="sheet-title"><h3>添加小组件</h3><button class="button ghost" data-sheet-close>关闭</button></div><div class="widget-picker">${widgetCatalog.map((w,i)=>`<button class="widget-option" data-widget-index="${i}"><span>${w.title}</span><strong>${w.content}</strong></button>`).join("")}</div><div class="section-title"><h3>自定义</h3><span>bunny.widget.v1</span></div><div class="row"><button class="button secondary" data-custom>创建小组件</button><label class="button secondary file-button">导入 JSON<input type="file" accept="application/json,.json" data-widget-json hidden></label><button class="button ghost" data-template>下载格式</button></div>`,{onReady(sheet){sheet.querySelectorAll("[data-widget-index]").forEach(b=>b.onclick=()=>{addWidget(widgetCatalog[Number(b.dataset.widgetIndex)]);closeSheet();render(container)});sheet.querySelector("[data-custom]").onclick=()=>openCustomWidget(container);sheet.querySelector("[data-template]").onclick=downloadTemplate;sheet.querySelector("[data-widget-json]").onchange=e=>importWidgets(e.target.files[0],container)}})}
  function addWidget(widget){store.update(s=>s.desktopWidgets.push({...widget,id:`widget-${Date.now()}-${Math.random().toString(16).slice(2)}`}))}
  function openCustomWidget(container,id=""){const existing=store.getState().desktopWidgets.find(w=>w.id===id);openSheet(`<div class="sheet-handle"></div><div class="sheet-title"><h3>${existing?"编辑":"创建"}小组件</h3><button class="button ghost" data-sheet-close>取消</button></div><form class="stack" data-widget-form><label class="field"><span>标题</span><input name="title" maxlength="24" required value="${escapeHtml(existing?.title||"我的小组件")}"></label><label class="field"><span>内容</span><textarea name="content" maxlength="120" required>${escapeHtml(existing?.content||"写一点想放在桌面的话")}</textarea></label><label class="field"><span>尺寸</span><select name="size"><option value="small">小号</option><option value="wide" ${existing?.size==="wide"?"selected":""}>横向</option></select></label><div class="row"><label class="field"><span>背景</span><input name="background" type="color" value="${existing?.style?.background||"#111111"}"></label><label class="field"><span>文字</span><input name="color" type="color" value="${existing?.style?.color||"#ffffff"}"></label></div><button class="button">保存</button></form>`,{onReady(sheet){sheet.querySelector("form").onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget)),next={type:existing?.type||"custom",title:d.title,content:d.content,size:d.size,style:{background:d.background,color:d.color}};if(existing)store.update(s=>Object.assign(s.desktopWidgets.find(w=>w.id===id),next));else addWidget(next);closeSheet();render(container)}}})}
  function importWidgets(file,container){if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(data.schema!=="bunny.widget.v1"||!Array.isArray(data.widgets))throw Error();data.widgets.forEach(addWidget);closeSheet();render(container);showToast(`已导入 ${data.widgets.length} 个小组件`)}catch{showToast("JSON 格式不符合 bunny.widget.v1")}};reader.readAsText(file)}
  function downloadTemplate(){const blob=new Blob([JSON.stringify({schema:"bunny.widget.v1",widgets:[widgetCatalog[2]]},null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="bunny-widget-template.json";a.click();URL.revokeObjectURL(a.href)}
  return render;
}
