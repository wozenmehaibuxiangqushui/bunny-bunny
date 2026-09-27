import { createIsland3D } from './island-3d.js';
import { defaultLook, normalizeLook, wardrobeCategories, wardrobeChoices } from './island-wardrobe.js';
export const avatarDefaults=defaultLook('female');

export function openAvatarStudio(container,initial,onSave){
  let draft=normalizeLook(initial),tab='hairStyle';
  const variants=structuredClone(initial.genderLooks||{});
  variants[draft.gender]={...draft};delete variants[draft.gender].genderLooks;
  const panel=document.createElement('section');panel.className='island-studio';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','兔屿捏脸与装扮');
  panel.innerHTML='<header><button data-cancel>取消</button><div><small>BUNNY ATELIER</small><h2>今天，也很喜欢自己</h2></div><button data-save>保存</button></header><div class="island-avatar-stage"><canvas aria-label="可旋转的人物预览"></canvas><span>拖动旋转 · 看看侧面和背面的头发</span></div><div class="island-genders"><button data-gender="female">女生衣橱</button><button data-gender="male">男生衣橱</button><button data-reset>恢复初始</button></div><nav aria-label="装扮分类"></nav><p class="island-outfit-note"></p><div class="island-avatar-options"></div>';
  container.append(panel);
  const preview=createIsland3D(panel.querySelector('canvas'),{preview:true,scene:()=>({avatar:draft})});
  if(!preview)panel.querySelector('.island-avatar-stage>span').textContent='设备暂不支持 3D 预览，仍可以选择并保存装扮';
  function refresh(){
    panel.querySelectorAll('[data-gender]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gender===draft.gender)));
    const scroll=panel.querySelector('nav').scrollLeft;
    panel.querySelector('nav').innerHTML=wardrobeCategories.map(([id,label])=>`<button data-tab="${id}" aria-selected="${id===tab}">${label}</button>`).join('');
    panel.querySelector('nav').scrollLeft=scroll;
    panel.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;refresh();panel.querySelector('.island-avatar-options').scrollTop=0});
    const options=wardrobeChoices(draft.gender,tab),palette=typeof options[0]==='string';
    panel.querySelector('.island-outfit-note').textContent=draft.outfit==='none'?'自由搭配 · 上衣、下装、鞋子与发饰独立保存':'正在穿套装 · 选上衣或下装会切回自由搭配，鞋饰保持不变';
    panel.querySelector('.island-avatar-options').innerHTML=options.map((item,i)=>{const [value,label]=palette?[item,`${wardrobeCategories.find(c=>c[0]===tab)[1]} ${i+1}`]:item;return `<button data-choice="${value}" aria-pressed="${draft[tab]===value}" class="${palette?'swatch':'shape'}">${palette?`<i style="background:${value}"></i>`:optionIcon(tab,value,draft.gender)}<span>${label}</span></button>`}).join('');
    panel.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{draft[tab]=b.dataset.choice;if(tab==='top'||tab==='bottom')draft.outfit='none';refresh()});
  }
  panel.querySelectorAll('[data-gender]').forEach(b=>b.onclick=()=>{variants[draft.gender]={...draft};delete variants[draft.gender].genderLooks;draft=normalizeLook(variants[b.dataset.gender]||defaultLook(b.dataset.gender));refresh()});
  panel.querySelector('[data-reset]').onclick=()=>{for(const id of Object.keys(variants))delete variants[id];Object.assign(variants,structuredClone(initial.genderLooks||{}));draft=normalizeLook(initial);refresh()};
  const close=()=>{preview?.dispose();panel.remove()};
  panel.querySelector('[data-cancel]').onclick=close;
  panel.querySelector('[data-save]').onclick=()=>{variants[draft.gender]={...draft};delete variants[draft.gender].genderLooks;onSave({...draft,genderLooks:variants});close()};refresh();
  return close;
}
function optionIcon(part,id,gender){
  const head='<ellipse cx="24" cy="26" rx="10" ry="12" fill="#f3d5bb" stroke="none"/><path d="M20 28h.1m8 0h.1" stroke="#736353" stroke-width="3"/>';
  let art='';
  if(part==='hairStyle'){
    const long=['long','waves','braids','twintails','jellyfish','m-wolf'].includes(id);
    art=`<path d="M12 29V19Q11 5 24 5T36 19V${long?40:30}L31 ${long?41:32}V19H17V${long?40:30}Z" fill="#9b7a62" stroke="none"/>${head}<path d="M12 23Q10 5 24 7Q39 5 36 24L29 18L23 22L17 18Z" fill="#9b7a62" stroke="none"/>`;
    if(id==='twintails'||id==='buns')art+='<path d="M12 14Q0 12 6 35M36 14Q48 12 42 35" stroke="#9b7a62" stroke-width="8"/>';
    if(id==='braids')art+='<path d="M12 27l-3 4 5 4-5 4M36 27l3 4-5 4 5 4" stroke="#8c694f" stroke-width="5"/>';
    if(['waves','eggroll','m-curls'].includes(id))art+='<path d="M12 17q-5 4 0 8t0 9M36 17q5 4 0 8t0 9" stroke="#86664f" stroke-width="4"/>';
  }else if(part==='top')art='<path d="M16 10l-10 8 5 9 6-4v16h14V23l6 4 5-9-10-8q-8 8-16 0Z" fill="#cfb5a6"/>';
  else if(part==='bottom')art=/skirt|pleats/.test(id)?'<path d="M17 10h14l8 28H9Z" fill="#c1c6b0"/><path d="M21 15l-3 20m9-20 3 20"/>':'<path d="M13 10h22l-2 29H25l-1-20-1 20h-8Z" fill="#a5b9c5"/>';
  else if(part==='shoes')art='<path d="M11 14h10v13l14 4q7 2 4 8H9q-3-9 2-25Z" fill="#c0ab96"/><path d="M10 34h29M23 28l5-2m-1 4 5-2"/>';
  else if(part==='accessory')art=id==='none'?'<path d="M12 12l24 24m0-24L12 36"/>':'<path d="M24 23Q2 5 7 31l17-6q23 14 17-15Z" fill="#d6abb7"/><circle cx="24" cy="24" r="4" fill="#b78496"/>';
  else if(part==='face')art=head;
  else art=id==='none'?'<path d="M10 16h28m-28 8h28m-28 8h28"/>':'<path d="M18 8h12l9 9-6 7-3-3 8 19H10l8-19-3 3-6-7Z" fill="#b6c4af"/>';
  return `<svg viewBox="0 0 48 48" width="44" height="44" fill="none" stroke="#a18a72" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${art}</svg>`;
}
