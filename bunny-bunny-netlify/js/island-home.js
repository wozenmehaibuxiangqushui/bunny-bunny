import { createIsland3D } from './island-3d.js';
import { showToast } from './core/ui.js';

const catalog=[['sofa','棉花沙发'],['table','小圆桌'],['bed','奶油小床'],['plant','盆栽'],['lamp','蘑菇灯'],['rug','绒绒地毯']];
export const starterRoom=()=>[{id:'bed',kind:'bed',x:2,z:2,rotation:0},{id:'plant',kind:'plant',x:7,z:2,rotation:0},{id:'rug',kind:'rug',x:4.5,z:4.5,rotation:0}];
export function openIslandHome(container,{avatar,home,onSave}){
  let furniture=structuredClone(home?.furniture||starterRoom()),blueprints=structuredClone(home?.blueprints||[]),undo=[],selected=null,editing=false;
  const panel=document.createElement('section');panel.className='island-home';panel.innerHTML='<canvas aria-label="兔屿室内，可以拖动家具"></canvas><header><small>HOME SWEET HOME</small><h2>慢慢布置的小家</h2><p>轻点地板走过去，拖动空白处旋转视角</p></header><div class="island-home-bar"><button data-out>回到小岛</button><button data-edit>布置房间</button><button data-undo>撤销</button></div><div class="island-home-editor" hidden><div class="home-catalog"></div><div class="home-actions"><button data-rotate>旋转选中</button><button data-remove>收起选中</button><button data-blueprint>保存蓝图</button><select aria-label="恢复蓝图"><option value="">选择蓝图…</option></select></div><p data-home-tip>点家具选中，按住拖动；家具会避开彼此。</p></div>';
  container.append(panel);const snapshot=()=>{undo.push(structuredClone(furniture));if(undo.length>30)undo.shift();};
  const persist=()=>onSave({furniture:structuredClone(furniture),blueprints:structuredClone(blueprints)});
  const valid=(item,list=furniture)=>item.x>=1&&item.x<=8&&item.z>=1&&item.z<=7.5&&(item.kind==='rug'||Math.hypot(item.x-4.5,item.z-7)>1.1)&&(item.kind==='rug'||!list.some(f=>f.id!==item.id&&f.kind!=='rug'&&Math.abs(f.x-item.x)<(size(f)[0]+size(item)[0])/2+.1&&Math.abs(f.z-item.z)<(size(f)[1]+size(item)[1])/2+.1));
  function size(f){const base=f.kind==='bed'?[1.25,2]:f.kind==='sofa'?[1.8,.8]:f.kind==='table'?[1.1,1.1]:[.65,.65];return f.rotation%2?[base[1],base[0]]:base;}
  let dragSaved=false;
  const renderer=createIsland3D(panel.querySelector('canvas'),{indoor:true,scene:()=>({avatar:{...avatar,x:4.5,z:7},furniture,selected,editing}),onMove:()=>{},onFurniture:(id,x,z,done)=>{
    selected=id;const item=furniture.find(f=>f.id===id);if(!item)return;
    if(Number.isFinite(x)&&valid({...item,x,z})){if(!dragSaved){snapshot();dragSaved=true;}item.x=x;item.z=z;}
    if(done){dragSaved=false;persist();}panel.querySelector('[data-home-tip]').textContent=`选中：${catalog.find(c=>c[0]===item.kind)?.[1]} · 拖动移动，或使用旋转／收起`;
  }});
  panel.querySelector('[data-out]').onclick=()=>{persist();renderer?.dispose();panel.remove()};
  panel.querySelector('[data-edit]').onclick=()=>{editing=!editing;panel.querySelector('.island-home-editor').hidden=!editing;panel.querySelector('[data-edit]').textContent=editing?'完成布置':'布置房间';if(!editing)persist()};
  panel.querySelector('.home-catalog').innerHTML=catalog.map(([id,label])=>`<button data-kind="${id}">${label}</button>`).join('');
  panel.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{const item={id:crypto.randomUUID(),kind:b.dataset.kind,x:4.5,z:4.5,rotation:0};let found=false;for(let z=2;z<7&&!found;z+=.5)for(let x=1.5;x<8;x+=.5){item.x=x;item.z=z;if(valid(item)){found=true;break;}}if(!found)return showToast('房间有点满了，先收起一件家具吧');snapshot();furniture.push(item);selected=item.id;persist()});
  panel.querySelector('[data-undo]').onclick=()=>{if(!undo.length)return showToast('还没有需要撤销的操作');furniture=undo.pop();selected=null;persist()};
  panel.querySelector('[data-remove]').onclick=()=>{if(!selected)return showToast('先点选一件家具');snapshot();furniture=furniture.filter(f=>f.id!==selected);selected=null;persist()};
  panel.querySelector('[data-rotate]').onclick=()=>{const f=furniture.find(f=>f.id===selected);if(!f)return showToast('先点选一件家具');const next={...f,rotation:(f.rotation+1)%4};if(!valid(next))return showToast('这里转不开，先把家具挪远一点');snapshot();Object.assign(f,next);persist()};
  const select=panel.querySelector('select');function refresh(){select.innerHTML='<option value="">选择蓝图…</option>';blueprints.forEach((b,i)=>select.add(new Option(b.name,String(i))))}refresh();
  panel.querySelector('[data-blueprint]').onclick=()=>{if(blueprints.length>=8)return showToast('最多保留 8 份蓝图');blueprints.push({name:`小家方案 ${blueprints.length+1}`,furniture:structuredClone(furniture)});refresh();persist();showToast('当前布置已保存为蓝图')};
  select.onchange=()=>{if(select.value==='')return;snapshot();furniture=structuredClone(blueprints[Number(select.value)].furniture);selected=null;persist();showToast('已恢复蓝图，可以撤销')};
}
