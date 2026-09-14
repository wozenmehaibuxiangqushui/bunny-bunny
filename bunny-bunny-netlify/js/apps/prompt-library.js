import { escapeHtml, showToast, openSheet, closeSheet } from "../core/ui.js";

export function createWorldbookRenderer({store,navigate}){return container=>renderLibrary(container,store,"worldbook")}
export function createPresetsRenderer({store,navigate}){return container=>renderLibrary(container,store,"preset")}

function renderLibrary(container,store,type){
 const state=store.getState(),isWorld=type==="worldbook",items=isWorld?state.worldbooks:state.presets;
 container.innerHTML=`<div class="editor-tabs"><button class="editor-tab ${isWorld?"active":""}" data-mode="worldbook">世界书</button><button class="editor-tab ${!isWorld?"active":""}" data-mode="preset">预设</button></div>
 <div class="callout">${isWorld?"世界书可以同时绑定多本，作为补充设定发送给 AI；优先级低于聊天预设。":"预设是高优先级提示词，每次聊天只能绑定一个。"}</div>
 <div class="section-title"><h3>${isWorld?"世界书":"聊天预设"}</h3><span>${items.length} 本</span></div>
 <section class="stack">${items.map(item=>`<article class="card" data-item="${item.id}"><div class="row between"><div><strong>${escapeHtml(item.name)}</strong><div class="sub">${escapeHtml(item.prompt.slice(0,50))}${item.prompt.length>50?"…":""}</div></div><button class="button secondary" data-edit="${item.id}">编辑</button></div></article>`).join("")}</section>
 <button class="button" data-new>＋ 新建${isWorld?"世界书":"预设"}</button>`;
 container.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>renderLibrary(container,store,b.dataset.mode));
 container.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editor(container,store,type,b.dataset.edit));
 container.querySelector("[data-new]").onclick=()=>editor(container,store,type);
}
function editor(container,store,type,id=""){
 const isWorld=type==="worldbook",list=isWorld?store.getState().worldbooks:store.getState().presets,item=list.find(x=>x.id===id);
 openSheet(`<div class="sheet-handle"></div><div class="sheet-title"><h3>${item?"编辑":"新建"}${isWorld?"世界书":"预设"}</h3><button class="button ghost" data-sheet-close>取消</button></div><form class="stack"><label class="field"><span>名称</span><input name="name" required value="${escapeHtml(item?.name||"")}"></label><label class="field"><span>发送给 AI 的提示词</span><textarea class="css-editor" name="prompt" required placeholder="填写背景、规则、角色关系与行为要求…">${escapeHtml(item?.prompt||"")}</textarea></label><button class="button">保存</button>${item?'<button type="button" class="button ghost danger-button" data-delete>删除</button>':""}</form>`,{onReady(sheet){const form=sheet.querySelector("form");form.onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(form));store.update(s=>{const target=isWorld?s.worldbooks:s.presets;if(item)Object.assign(target.find(x=>x.id===id),d);else target.push({id:(isWorld?"wb-":"preset-")+Date.now(),...d,enabled:true})});closeSheet();renderLibrary(container,store,type);showToast("提示词已保存")};sheet.querySelector("[data-delete]")?.addEventListener("click",()=>{if(!confirm("确认删除？"))return;store.update(s=>{const key=isWorld?"worldbooks":"presets";s[key]=s[key].filter(x=>x.id!==id)});closeSheet();renderLibrary(container,store,type)})}})
}
