import { escapeHtml, initialsAvatar, showToast, openSheet, closeSheet } from "../core/ui.js";

const PAGE_SIZE=6;

export function createContactsRenderer({store,navigate}){
  let roleType="char",page=0;
  return function render(container){
    const state=store.getState(),user=state.people.find(x=>x.id===state.currentUserId),roles=state.people.filter(x=>x.type===roleType).sort(roleSort),pages=Math.max(1,Math.ceil(roles.length/PAGE_SIZE));
    page=Math.min(page,pages-1);const visible=roles.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
    container.className="app-view role-archive-view";
    container.innerHTML=`<section class="role-archive">
      <header class="role-archive-head"><button class="role-user-chip" data-user-profile>${initialsAvatar(user,{avatarUrl:user.avatarUrl||""})}<span><small>MY USER</small><strong>${escapeHtml(user.chatName||user.name)}</strong></span></button><label class="role-type-picker"><select data-role-type><option value="char" ${roleType==="char"?"selected":""}>CHAR</option><option value="npc" ${roleType==="npc"?"selected":""}>配角 / NPC</option></select><span>⌄</span></label></header>
      <div class="archive-caption"><div><span>CHARACTER ARCHIVE</span><strong>${roleType==="char"?"主要角色":"支线人物"}</strong></div><button class="archive-add" data-create-role>＋</button></div>
      <div class="polaroid-page" data-role-page>${visible.map((person,index)=>roleCard(person,state,index)).join("")}${emptyCards(visible.length,roleType)}</div>
      <nav class="archive-pagination"><button data-page-prev ${page===0?"disabled":""}>‹</button><div>${Array.from({length:pages},(_,i)=>`<button class="${i===page?"active":""}" data-page="${i}"></button>`).join("")}</div><button data-page-next ${page===pages-1?"disabled":""}>›</button></nav>
    </section>`;
    container.querySelector("[data-user-profile]").onclick=()=>navigate("user-profile");
    container.querySelector("[data-role-type]").onchange=e=>{roleType=e.target.value;page=0;render(container)};
    container.querySelectorAll("[data-create-role]").forEach(x=>x.onclick=()=>navigate("character-edit",{type:roleType}));
    container.querySelectorAll("[data-role-id]").forEach(x=>x.onclick=()=>navigate("character-edit",{id:x.dataset.roleId,type:roleType}));
    container.querySelector("[data-page-prev]").onclick=()=>{if(page){page--;render(container)}};
    container.querySelector("[data-page-next]").onclick=()=>{if(page<pages-1){page++;render(container)}};
    container.querySelectorAll("[data-page]").forEach(x=>x.onclick=()=>{page=Number(x.dataset.page);render(container)});
    bindSwipe(container.querySelector("[data-role-page]"),dir=>{if(dir==="left"&&page<pages-1)page++;if(dir==="right"&&page)page--;render(container)});
  };
}

export function createCharacterEditorRenderer({store,navigate}){
  return function render(container,params={}){
    const state=store.getState(),existing=params.id?state.people.find(x=>x.id===params.id):null,type=existing?.type==="npc"||params.type==="npc"?"npc":"char",base={...roleDefaults(type),...(existing||{}),...(params.draft||{})};
    let avatar=base.avatarUrl||state.chatProfiles[base.id]?.avatarUrl||"";
    container.className="app-view role-file-view";
    container.innerHTML=`<form class="archive-folder ${type}" data-role-form><div class="archive-folder-tab">CONFIDENTIAL // ${type.toUpperCase()}</div><section class="archive-paper">
      <header class="archive-doc-head"><div><span>BUNNY OS</span><strong>${type==="npc"?"NPC FILE":"CHARACTER FILE"}</strong></div><small>||| | |||| | |||</small></header>
      <div class="archive-profile-grid"><button type="button" class="archive-photo" data-avatar-pick>${avatar?`<img src="${escapeHtml(avatar)}" alt="">`:'<span>＋</span><small>PHOTO</small>'}</button><div class="archive-mini-grid">${box("name","01 / NAME",base.name,true)}${box("gender","02 / GENDER",base.gender)}${box("age","03 / AGE",base.age,false,"number")}${box("height","04 / HEIGHT",base.height)}${box("birthday","05 / BIRTHDAY",base.birthday)}${box("phone","06 / CONTACT",base.phone||randomPhone())}</div></div>
      ${type==="npc"?npcFields(base,state):charFields(base,state)}
      <footer class="archive-file-actions"><button type="button" class="round-file-button cancel" data-cancel>×</button><span>保存后将作为隐藏人设发送给 AI</span><button class="round-file-button save">✓</button></footer>
    </section></form>`;
    container.querySelector("[data-cancel]").onclick=()=>navigate("contacts");
    container.querySelector("[data-avatar-pick]").onclick=()=>{const draft=Object.fromEntries(new FormData(container.querySelector("form")));pickAvatar(value=>render(container,{...params,draft:{...base,...draft,avatarUrl:value}}))};
    container.querySelector("form").onsubmit=e=>{
      e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget)),id=existing?.id||`${type}-${Date.now()}`,person={...base,...data,id,type,avatarUrl:avatar||base.avatarUrl||"",initials:existing?.initials||initials(data.name),online:existing?.online??true};
      person.persona=data.persona||[data.personality,data.appearance,data.familyBackground,data.hobbies].filter(Boolean).join("\n");
      store.update(s=>{const old=s.people.find(x=>x.id===id);if(old)Object.assign(old,person);else s.people.push(person);s.chatProfiles[id]={...profileSeed(person,person.avatarUrl),...(s.chatProfiles[id]||{}),avatarUrl:person.avatarUrl};s.stickerLibraries.characters[id]||=[];s.chatGroups.forEach(g=>g.personIds=g.personIds.filter(x=>x!==id));const group=s.chatGroups.find(g=>g.id===data.groupId);if(group&&!group.personIds.includes(id))group.personIds.push(id)});
      showToast(type==="npc"?"NPC 档案已保存":"CHAR 档案已保存");navigate("contacts");
    };
  };
}

export function createUserProfileRenderer({store}){
  return function render(container){
    let state=store.getState(),user=state.people.find(x=>x.id===state.currentUserId);
    if(!user.phone){store.update(s=>s.people.find(x=>x.id===s.currentUserId).phone=randomPhone());state=store.getState();user=state.people.find(x=>x.id===state.currentUserId)}
    container.className="app-view user-card-view";container.innerHTML=userDisplay(user);
    container.querySelector("[data-edit-user]").onclick=()=>openUserEditor(store,user,()=>render(container));
  };
}

export function createAddFriendRenderer({store,navigate}){
  return container=>{const state=store.getState(),added=new Set(state.conversations.map(x=>x.personId)),items=state.people.filter(x=>x.type==="char"&&!added.has(x.id)).sort(roleSort);
    container.className="app-view";container.innerHTML=`<p class="callout">从已保存的 CHAR 档案中添加好友。添加后会立即建立可聊天会话。</p><section class="contact-book">${grouped(items).map(g=>`<div class="contact-letter">${g.letter}</div>${g.items.map(p=>`<article class="contact-row card row"><div>${initialsAvatar(p,state.chatProfiles[p.id]||{})}</div><div class="meta"><strong>${escapeHtml(p.name)}</strong><span>${escapeHtml(p.note||p.personality||"")}</span></div><button class="button secondary" data-add="${p.id}">添加</button></article>`).join("")}`).join("")||'<div class="empty"><strong>没有待添加的 CHAR</strong></div>'}</section><button class="button secondary" data-new>创建新 CHAR</button>`;
    container.querySelector("[data-new]").onclick=()=>navigate("character-edit",{type:"char"});
    container.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{const person=state.people.find(x=>x.id===b.dataset.add),id=`conv-${person.id}-${Date.now()}`;store.update(s=>{s.conversations.push({id,personId:person.id,preview:"你们已经是好友了",time:timeNow(),unread:0});s.messages[id]=[]});showToast(`${person.name} 已添加`);navigate("conversation",{id})});
  };
}

function roleCard(person,state,index){const p=state.chatProfiles[person.id]||{},bound=state.people.find(x=>x.id===person.boundCharId),src=p.avatarUrl||person.avatarUrl,rot=[-2.2,1.5,-.7,1.9,-1.4,.8][index];return`<button class="role-card" data-role-id="${person.id}" style="--card-rotate:${rot}deg"><span class="role-pin"></span><span class="role-photo">${src?`<img src="${escapeHtml(src)}" alt="">`:initialsAvatar(person,p)}</span><strong>${escapeHtml(person.name||"UNNAMED")}</strong><small>${person.type==="npc"?`NPC · ${escapeHtml(bound?.name||"未绑定")}`:escapeHtml(person.occupation||person.signature||"CHAR")}</small></button>`}
function emptyCards(count,type){return Array.from({length:PAGE_SIZE-count},(_,i)=>i===0?`<button class="role-card role-card-add" data-create-role><span>＋</span><strong>ADD ${type.toUpperCase()}</strong><small>新建档案</small></button>`:'<span class="role-card role-card-empty"></span>').join("")}
function charFields(p,s){return`${big("appearance","07 / APPEARANCE","外形与穿搭",p.appearance)}${big("familyBackground","08 / FAMILY","家庭与成长背景",p.familyBackground)}${big("personality","09 / PERSONALITY","性格、脾气、处事方式与聊天习惯",p.personality||p.persona)}${big("hobbies","10 / HOBBIES & TMI","爱好、口癖、关系网与其他细节",p.hobbies)}<div class="archive-field-row">${field("occupation","职业 / 身份",p.occupation)}${field("signature","个性签名",p.signature)}</div><div class="archive-field-row">${field("city","所在城市",p.city)}${field("cityPrototype","原型城市",p.cityPrototype)}</div>${field("note","当前状态",p.note)}${groupSelect(p,s)}`}
function npcFields(p,s){const chars=s.people.filter(x=>x.type==="char");return`<label class="archive-select-field"><span>07 / BOUND CHAR</span><select name="boundCharId" required><option value="">选择绑定的 CHAR</option>${chars.map(x=>`<option value="${x.id}" ${p.boundCharId===x.id?"selected":""}>${escapeHtml(x.name)}</option>`).join("")}</select></label>${big("persona","08 / PERSONA","人物设定：身份、关系、外形、性格、爱好、口癖、经历与 TMI",p.persona||p.personality,8)}<div class="archive-field-row">${field("city","所在城市",p.city)}${field("cityPrototype","原型城市",p.cityPrototype)}</div>${field("note","当前状态",p.note)}${groupSelect(p,s)}`}
function userDisplay(u){const avatar=u.avatarUrl?`<img src="${escapeHtml(u.avatarUrl)}" alt="">`:`<span>${escapeHtml(u.initials||initials(u.name))}</span>`;return`<article class="user-pass"><header><span>PERSONAL IDENTITY</span><small>BUNNY USER · ${escapeHtml(u.phone||"")}</small></header><button class="user-pass-avatar" data-edit-user>${avatar}<i>✎</i></button><div class="user-pass-name"><h2>${escapeHtml(u.chatName||u.name)}</h2><p>${escapeHtml(u.name||"")}</p></div><section class="user-pass-brief">${datum("真实名字",u.name)}${datum("社交名称",u.chatName)}${datum("身高",u.height)}${datum("电话号码",u.phone)}${datum("所在地",u.location||u.city)}</section><blockquote>${escapeHtml(u.signature||"还没有写个性签名")}</blockquote><section class="user-pass-details">${detail("外形",u.appearance)}${detail("家庭背景",u.familyBackground)}${detail("性格",u.personality)}${detail("OTHER TMI",u.tmi||u.note)}</section><footer><span>点击头像编辑资料</span><strong>BB / USER</strong></footer></article>`}

function openUserEditor(store,source,done){const d={...source};const show=()=>openSheet(`<form class="user-edit-card" data-user-form><header><span>EDIT PERSONAL CARD</span><small>资料会作为隐藏 USER 身份发送给 AI</small></header><button type="button" class="user-edit-avatar" data-avatar>${d.avatarUrl?`<img src="${escapeHtml(d.avatarUrl)}" alt="">`:`<span>${escapeHtml(d.initials||initials(d.name))}</span>`}<i>＋</i></button><section class="user-edit-module"><div class="archive-field-row">${field("name","真实名字",d.name)}${field("chatName","社交软件名称",d.chatName)}</div><div class="archive-field-row">${field("height","身高",d.height)}${field("phone","电话号码",d.phone||randomPhone())}</div>${field("location","所在地",d.location||d.city)}</section><section class="user-edit-module">${big("signature","SIGNATURE","个性签名",d.signature,2)}</section><section class="user-edit-module">${big("appearance","APPEARANCE","外形与穿搭",d.appearance)}${big("familyBackground","FAMILY","家庭与成长背景",d.familyBackground)}${big("personality","PERSONALITY","性格、习惯与聊天方式",d.personality)}${big("tmi","OTHER TMI","其他希望 AI 记住的信息",d.tmi||d.note)}</section><footer class="user-edit-actions"><button type="button" class="round-file-button cancel" data-cancel>×</button><span>PRIVATE PROFILE</span><button class="round-file-button save">✓</button></footer></form>`,{onReady(sheet){const form=sheet.querySelector("form");form.querySelectorAll("[name]").forEach(x=>x.oninput=()=>d[x.name]=x.value);sheet.querySelector("[data-cancel]").onclick=closeSheet;sheet.querySelector("[data-avatar]").onclick=()=>pickAvatar(value=>{d.avatarUrl=value;show()});form.onsubmit=e=>{e.preventDefault();Object.assign(d,Object.fromEntries(new FormData(form)));store.update(s=>Object.assign(s.people.find(x=>x.id===s.currentUserId),d,{initials:initials(d.name),city:d.location}));closeSheet();showToast("USER 名片已保存");done()}}});show()}
function roleDefaults(type){return{type,name:"",gender:"",age:"",height:"",birthday:"",phone:randomPhone(),occupation:"",appearance:"",familyBackground:"",personality:"",hobbies:"",persona:"",note:"",signature:"",city:"",cityPrototype:"",groupId:"",boundCharId:""}}
function box(name,label,value,full=false,type="text"){return`<label class="archive-box ${full?"full":""}"><span>${label}</span><input name="${name}" type="${type}" value="${escapeHtml(value||"")}" ${name==="name"?"required":""}></label>`}
function big(name,label,placeholder,value,rows=4){return`<label class="archive-big-field"><span><b>${label}</b><small>${placeholder}</small></span><textarea name="${name}" rows="${rows}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value||"")}</textarea></label>`}
function field(name,label,value){return`<label class="field"><span>${label}</span><input name="${name}" value="${escapeHtml(value||"")}"></label>`}
function groupSelect(p,s){return`<label class="archive-select-field"><span>WORLD GROUP</span><select name="groupId"><option value="">暂不分组</option>${s.chatGroups.map(g=>`<option value="${g.id}" ${p.groupId===g.id?"selected":""}>${escapeHtml(g.name)}</option>`).join("")}</select></label>`}
function datum(label,value){return`<div><span>${label}</span><strong>${escapeHtml(value||"—")}</strong></div>`}
function detail(label,value){return`<div><span>${label}</span><p>${escapeHtml(value||"尚未填写")}</p></div>`}
function grouped(items){const groups=[];for(const item of items){const letter=sortLetter(item),last=groups.at(-1);if(!last||last.letter!==letter)groups.push({letter,items:[item]});else last.items.push(item)}return groups}
function sortLetter(p){const x=String(p.sortKey||p.initials||p.name||"#").trim()[0]?.toUpperCase()||"#";return/[A-Z]/.test(x)?x:"#"}
function roleSort(a,b){return sortLetter(a).localeCompare(sortLetter(b),"en")||String(a.name).localeCompare(String(b.name),"zh-CN-u-co-pinyin")}
function initials(name){return String(name||"USER").replace(/\s/g,"").slice(0,2).toUpperCase()}
function randomPhone(){const tail=String(Math.floor(Math.random()*1e8)).padStart(8,"0"),prefix=["35","37","38","55","58","76","86"][Math.floor(Math.random()*7)];return`1${prefix} ${tail.slice(0,4)} ${tail.slice(4)}`}
function profileSeed(p,avatar){return{avatarUrl:avatar,remark:p.name,voiceSpeed:1,voiceId:"",autoPlayVoice:false,llmTone:true,language:"中文",emotion:"自动",translationEnabled:false,visionEnabled:true,memoryDepth:24,quietHours:"23:00—08:00",proactiveCall:false,patText:`你拍了拍${p.name}`,patUserText:`${p.name}拍了拍你`}}
function bindSwipe(el,done){let x=0,y=0;el.onpointerdown=e=>{x=e.clientX;y=e.clientY};el.onpointerup=e=>{const dx=e.clientX-x,dy=e.clientY-y;if(Math.abs(dx)>46&&Math.abs(dx)>Math.abs(dy)*1.35)done(dx<0?"left":"right")}}
function pickAvatar(done){openSheet(`<div class="sheet-handle"></div><div class="sheet-title"><h3>选择图片</h3><button class="button ghost" data-sheet-close>取消</button></div><div class="action-grid"><button class="action-card" data-source="file">□ 选取文件</button><button class="action-card" data-source="album">▧ 照片</button><button class="action-card" data-source="camera">◉ 相机</button><button class="action-card" data-source="url">⌁ 图床</button></div>`,{onReady(sheet){sheet.querySelectorAll("[data-source]").forEach(b=>b.onclick=()=>{if(b.dataset.source==="url"){const url=prompt("图片 URL");if(/^https?:\/\//.test(url||"")){closeSheet();done(url)}return}const input=document.createElement("input");input.type="file";input.accept="image/*";if(b.dataset.source==="camera")input.capture="user";input.onchange=()=>readImage(input.files?.[0]).then(value=>{closeSheet();done(value)}).catch(e=>showToast(e.message));input.click()})}})}
function readImage(file){return new Promise((resolve,reject)=>{if(!file)return reject(Error("没有选择图片"));if(file.size>6*1024*1024)return reject(Error("请选择 6MB 以内图片"));const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error("头像读取失败"));r.readAsDataURL(file)})}
function timeNow(){return new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit",hour12:false})}
