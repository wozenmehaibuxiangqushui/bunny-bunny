import { createIsland3D } from './island-3d.js';

export const avatarDefaults={gender:'female',hairStyle:'bob',face:'round',skin:'#f3c7a4',hair:'#6c4b39',shirt:'#8db3cb',outfit:'overalls'};
const categories=[['hairStyle','发型'],['face','脸部'],['skin','肤色'],['hair','发色'],['outfit','服饰'],['shirt','衣服配色']];
const choices={hairStyle:[['crop','蓬松短发'],['bob','圆圆波波'],['long','柔软长发'],['buns','双丸子'],['pony','小马尾'],['curly','云朵卷发']],face:[['round','软糯圆脸'],['oval','小鹅蛋脸'],['wide','团子脸'],['smile','弯弯笑眼'],['sleepy','困困眼']],skin:['#ffe1c7','#f3c7a4','#d7a879','#b98264','#93644f','#65473e'],hair:['#312c32','#6c4b39','#ac7150','#eac783','#eee3d0','#d5a1ad','#9baccb','#a4b69d'],outfit:[['overalls','田园背带裤'],['hoodie','软软卫衣'],['dress','花苞连衣裙'],['sweater','奶油针织衫'],['bunny','兔耳连体衣']],shirt:['#8db3cb','#e39d87','#a4c89c','#e8c278','#bca1d2','#f2e5cc','#dba9bd','#718995']};

export function openAvatarStudio(container,initial,onSave){
  let draft={...avatarDefaults,...initial},tab='hairStyle';
  const panel=document.createElement('section');panel.className='island-studio';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','兔屿捏脸与装扮');
  panel.innerHTML='<header><button data-cancel>取消</button><div><small>BUNNY ATELIER</small><h2>捏一个喜欢的自己</h2></div><button data-save>保存</button></header><div class="island-avatar-stage"><canvas aria-label="可旋转的人物预览"></canvas><span>拖动看看侧面 · 所有造型都可以自由选择</span></div><div class="island-genders"><button data-gender="female">女生</button><button data-gender="male">男生</button><button data-reset>恢复初始</button></div><nav></nav><div class="island-avatar-options"></div>';
  container.append(panel);
  const preview=createIsland3D(panel.querySelector('canvas'),{preview:true,scene:()=>({avatar:draft})});
  function refresh(){
    panel.querySelectorAll('[data-gender]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gender===draft.gender)));
    panel.querySelector('nav').innerHTML=categories.map(([id,label])=>`<button data-tab="${id}" aria-selected="${id===tab}">${label}</button>`).join('');
    panel.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;refresh()});
    const palette=['skin','hair','shirt'].includes(tab);
    panel.querySelector('.island-avatar-options').innerHTML=choices[tab].map((item,i)=>{const [value,label]=palette?[item,`${categories.find(c=>c[0]===tab)[1]} ${i+1}`]:item;return `<button data-choice="${value}" aria-pressed="${draft[tab]===value}" class="${palette?'swatch':'shape'}">${palette?`<i style="background:${value}"></i>`:`<b>${tab==='face'?['◕','•','●','⌣','－'][i]:tab==='outfit'?['♧','☁','❀','≋','♧'][i]:['⌒','◡','〰','∞','❧','☁'][i]}</b>`}<span>${label}</span></button>`}).join('');
    panel.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{draft[tab]=b.dataset.choice;refresh()});
  }
  panel.querySelectorAll('[data-gender]').forEach(b=>b.onclick=()=>{draft.gender=b.dataset.gender;refresh()});
  // Gender changes the base proportions; individually selected clothes and hair are preserved.
  panel.querySelector('[data-reset]').onclick=()=>{draft={...avatarDefaults,...initial};refresh()};
  const close=()=>{preview?.dispose();panel.remove()};
  panel.querySelector('[data-cancel]').onclick=close;
  panel.querySelector('[data-save]').onclick=()=>{onSave({...draft});close()};refresh();
  return close;
}
