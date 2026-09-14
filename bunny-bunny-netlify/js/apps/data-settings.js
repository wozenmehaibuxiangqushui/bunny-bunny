import { escapeHtml, showToast, openSheet } from "../core/ui.js";

export function createDataSettingsRenderer({store,navigate}){
 return container=>{
  const s=store.getState(),d=s.dataSettings,raw=JSON.stringify(s),images=countImages(s);
  container.innerHTML=`<div class="data-stats"><div class="data-stat"><strong>${(raw.length/1024).toFixed(1)}</strong><span>KB 本机数据</span></div><div class="data-stat"><strong>${images}</strong><span>图片与表情</span></div><div class="data-stat"><strong>${d.lastBackup?new Date(d.lastBackup).toLocaleDateString():"—"}</strong><span>最近备份</span></div></div>
  <div class="section-title"><h3>个人云自动备份</h3><span>凭据只保存在本机</span></div>
  <section class="card stack">
   <div class="setting-row"><div><span class="label">自动备份</span><small>数据变化后写入你绑定的个人云</small></div><input class="switch" data-auto type="checkbox" ${d.autoBackup?"checked":""}></div>
   <label class="field"><span>云端类型</span><select data-cloud><option ${d.cloudType==="WebDAV"?"selected":""}>WebDAV</option><option ${d.cloudType==="Dropbox"?"selected":""}>Dropbox</option><option ${d.cloudType==="iCloud Drive"?"selected":""}>iCloud Drive</option><option ${d.cloudType==="自定义 HTTPS"?"selected":""}>自定义 HTTPS</option></select></label>
   <label class="field"><span>备份端点 / 文件 URL</span><input data-endpoint value="${escapeHtml(d.cloudEndpoint||"")}" placeholder="https://cloud.example.com/bunny-backup.json"></label>
   <div class="row"><button class="button secondary" data-bind>保存绑定</button><button class="button" data-backup>立即备份</button></div>
  </section>
  <div class="section-title"><h3>导出与查看</h3></div>
  <section class="card">
   ${row("导出全部数据","下载可迁移的 bunny JSON 文件","export")}
   ${row("查看原始数据","按模块检查当前持久化内容","view")}
   ${row("导入并恢复","从 bunny JSON 恢复，导入前自动校验","import")}
   <input type="file" accept="application/json,.json" data-import-file hidden>
  </section>
  <div class="section-title"><h3>空间优化</h3></div>
  <section class="card">
   ${row("删除冗余数据","去重背景、表情和失效引用","clean")}
   ${row("压缩图片大小","在本机重编码图片，不会上传","compress")}
   <label class="field"><span>图片质量 <output>${Math.round(d.imageQuality*100)}%</output></span><input data-quality type="range" min=".35" max=".95" step=".05" value="${d.imageQuality}"></label>
  </section>
  <div class="section-title"><h3>危险操作</h3><span>不可撤销</span></div>
  <section class="card danger-zone">${row("清空全部数据","删除聊天、角色、设置、媒体与 API 配置","clear",true)}</section>`;
  container.querySelector("[data-auto]").onchange=e=>store.update(s=>s.dataSettings.autoBackup=e.target.checked);
  container.querySelector("[data-quality]").oninput=e=>{e.target.previousElementSibling.value=Math.round(e.target.value*100)+"%";store.update(s=>s.dataSettings.imageQuality=Number(e.target.value))};
  container.querySelector("[data-bind]").onclick=()=>{store.update(s=>{s.dataSettings.cloudType=container.querySelector("[data-cloud]").value;s.dataSettings.cloudEndpoint=container.querySelector("[data-endpoint]").value.trim()});showToast("个人云绑定已保存")};
  container.querySelector("[data-backup]").onclick=async()=>{const endpoint=container.querySelector("[data-endpoint]").value.trim();if(!/^https:\/\//.test(endpoint))return showToast("请填写 HTTPS 备份端点");try{const res=await fetch(endpoint,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(store.getState())});if(!res.ok)throw Error(`HTTP ${res.status}`);store.update(s=>s.dataSettings.lastBackup=new Date().toISOString());showToast("云端备份成功");createDataSettingsRenderer({store,navigate})(container)}catch(e){showToast(`备份失败：${e.message}`)}};
  container.querySelector("[data-export]").onclick=()=>download(store.getState(),"bunny-bunny-backup.json");
  container.querySelector("[data-view]").onclick=()=>openSheet(`<div class="sheet-handle"></div><div class="sheet-title"><h3>本机数据</h3><button class="button ghost" data-sheet-close>关闭</button></div><textarea class="css-editor" readonly>${escapeHtml(JSON.stringify(store.getState(),null,2))}</textarea>`);
  container.querySelector("[data-import]").onclick=()=>container.querySelector("[data-import-file]").click();
  container.querySelector("[data-import-file]").onchange=e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const parsed=JSON.parse(reader.result);if(!parsed.people||!parsed.worlds||!parsed.messages)throw Error();store.update(s=>Object.assign(s,parsed));showToast("数据恢复成功");createDataSettingsRenderer({store,navigate})(container)}catch{showToast("文件不是有效的 Bunny 备份")}};reader.readAsText(file)};
  container.querySelector("[data-clean]").onclick=()=>{let removed=0;store.update(s=>{const unique=a=>a.filter((x,i,list)=>{const keep=list.indexOf(x)===i;if(!keep)removed++;return keep});s.chatAppearance.backgroundHistory=unique(s.chatAppearance.backgroundHistory);s.stickerLibraries.global=dedupeMedia(s.stickerLibraries.global,()=>removed++);Object.keys(s.stickerLibraries.characters).forEach(k=>s.stickerLibraries.characters[k]=dedupeMedia(s.stickerLibraries.characters[k],()=>removed++))});showToast(`已删除 ${removed} 条冗余数据`)};
  container.querySelector("[data-compress]").onclick=async()=>{showToast("正在本机压缩图片…");let changed=0;const quality=store.getState().dataSettings.imageQuality;const current=store.getState();for(const bg of current.chatAppearance.backgroundHistory){if(bg.startsWith("data:image/")){const next=await compress(bg,quality);if(next&&next.length<bg.length){store.update(s=>{const i=s.chatAppearance.backgroundHistory.indexOf(bg);if(i>-1)s.chatAppearance.backgroundHistory[i]=next;if(s.chatAppearance.background===bg)s.chatAppearance.background=next});changed++}}}showToast(`已压缩 ${changed} 张图片`)};
  container.querySelector("[data-clear]").onclick=()=>{if(!confirm("确定清空 Bunny 的全部本机数据吗？此操作不可撤销。"))return;if(!confirm("最后确认：聊天、角色、API 与图片都会删除。"))return;localStorage.removeItem("bunny-bunny:m0");location.reload()};
 };
}
function row(label,small,key,danger=false){return`<div class="setting-row"><div><span class="label">${label}</span><small>${small}</small></div><button class="button secondary ${danger?"danger-button":""}" data-${key}>${key==="clear"?"清空":"打开"}</button></div>`}
function download(data,name){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));a.download=name;a.click();URL.revokeObjectURL(a.href);showToast("数据已导出")}
function countImages(s){return(s.chatAppearance.backgroundHistory?.length||0)+(s.stickerLibraries.global?.length||0)+Object.values(s.stickerLibraries.characters||{}).reduce((n,x)=>n+x.length,0)}
function dedupeMedia(items,onRemove){const seen=new Set;return items.filter(x=>{const key=x.url||JSON.stringify(x);if(seen.has(key)){onRemove();return false}seen.add(key);return true})}
function compress(src,quality){return new Promise(resolve=>{const img=new Image();img.onload=()=>{const max=1440,scale=Math.min(1,max/Math.max(img.width,img.height)),canvas=document.createElement("canvas");canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL("image/webp",quality))};img.onerror=()=>resolve(null);img.src=src})}
