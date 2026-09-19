// Keep stickers as editable layers until export. Selection handles never enter the saved image.
export function bindPhotoEditor(sheet,src,notify){
  const canvas=sheet.querySelector('[data-photo-canvas]'),ctx=canvas.getContext('2d');
  const base=new Image();base.crossOrigin='anonymous';
  const layers=[],strokes=[];let selected=null,editing=false,mode='select',gesture=null,ready=false,frame=0;
  const controls=document.createElement('div');controls.className='photo-layer-controls';
  controls.innerHTML='<div><button type="button" data-select-tool aria-label="移动贴纸" aria-pressed="true">↖</button><button type="button" data-brush-tool aria-label="画笔" aria-pressed="false">✎</button><button type="button" data-delete-layer aria-label="删除选中贴纸" disabled>−</button><label>大小 <input data-layer-size type="range" min="3" max="100" value="25" disabled><output>25%</output></label></div><small>点选贴纸后拖动；拖右下角圆点或滑动“大小”缩放。</small>';
  sheet.querySelector('[data-photo-edit-panel]').prepend(controls);
  const slider=controls.querySelector('[data-layer-size]'),del=controls.querySelector('[data-delete-layer]');
  const limit=(n,min,max)=>Math.max(min,Math.min(max,n));
  function updateControls(){slider.disabled=del.disabled=!selected;if(selected){slider.value=String(Math.round(selected.w/canvas.width*100));controls.querySelector('output').value=slider.value+'%'}controls.querySelector('[data-select-tool]').setAttribute('aria-pressed',String(mode==='select'));controls.querySelector('[data-brush-tool]').setAttribute('aria-pressed',String(mode==='brush'))}
  function paint(target,handles=false){
    target.clearRect(0,0,canvas.width,canvas.height);if(!ready)return;
    target.drawImage(base,0,0,canvas.width,canvas.height);
    for(const stroke of strokes){target.strokeStyle=stroke.color;target.lineWidth=stroke.width;target.lineCap=target.lineJoin='round';target.beginPath();stroke.points.forEach((p,i)=>i?target.lineTo(p.x,p.y):target.moveTo(p.x,p.y));target.stroke()}
    for(const layer of layers){if(layer.image)target.drawImage(layer.image,layer.x-layer.w/2,layer.y-layer.h/2,layer.w,layer.h);else{target.font=`${layer.h*.82}px "Apple Color Emoji","Noto Color Emoji","Segoe UI Emoji",sans-serif`;target.textAlign='center';target.textBaseline='middle';target.fillText(layer.emoji,layer.x,layer.y)}}
    if(handles&&editing&&selected){const s=selected,unit=canvas.width/(canvas.getBoundingClientRect().width||canvas.width);target.save();target.strokeStyle='#fff';target.lineWidth=2*unit;target.shadowColor='#0008';target.shadowBlur=3*unit;target.setLineDash([5*unit,4*unit]);target.strokeRect(s.x-s.w/2,s.y-s.h/2,s.w,s.h);target.setLineDash([]);target.beginPath();target.arc(s.x+s.w/2,s.y+s.h/2,7*unit,0,Math.PI*2);target.fillStyle='#202326';target.fill();target.stroke();target.restore()}
  }
  function render(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;paint(ctx,true)})}
  base.onload=()=>{const scale=Math.min(1,1100/Math.max(base.naturalWidth,base.naturalHeight));canvas.width=Math.max(1,Math.round(base.naturalWidth*scale));canvas.height=Math.max(1,Math.round(base.naturalHeight*scale));ready=true;render()};
  base.onerror=()=>notify('图片无法加载。图床需允许跨域编辑，或请先下载再从相册上传。');base.src=src;
  function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}}
  function select(layer){selected=layer;mode='select';updateControls();render()}
  function resize(layer,width){const ratio=layer.h/layer.w;layer.w=limit(width,canvas.width*.03,canvas.width);layer.h=layer.w*ratio;updateControls();render()}
  function addLayer(data){if(!ready)return notify('图片还在加载');editing=true;sheet.classList.add('photo-editing');const w=canvas.width*.25,h=w*(data.image?data.image.naturalHeight/data.image.naturalWidth:1);const layer={x:canvas.width/2,y:canvas.height/2,w,h,...data};layers.push(layer);select(layer)}
  canvas.onpointerdown=e=>{if(!editing||!ready)return;e.preventDefault();const p=point(e),unit=canvas.width/canvas.getBoundingClientRect().width;canvas.setPointerCapture(e.pointerId);
    if(mode==='brush'){const stroke={color:sheet.querySelector('[data-brush-color]').value,width:Math.max(3,canvas.width/150),points:[p,{x:p.x+.01,y:p.y+.01}]};strokes.push(stroke);gesture={type:'draw',stroke};selected=null;updateControls();render();return}
    if(selected&&Math.hypot(p.x-selected.x-selected.w/2,p.y-selected.y-selected.h/2)<18*unit){gesture={type:'resize',layer:selected,start:p,width:selected.w,height:selected.h};return}
    const hit=[...layers].reverse().find(s=>Math.abs(p.x-s.x)<=s.w/2&&Math.abs(p.y-s.y)<=s.h/2);select(hit||null);if(hit){layers.splice(layers.indexOf(hit),1);layers.push(hit);gesture={type:'move',layer:hit,dx:p.x-hit.x,dy:p.y-hit.y}}
  };
  canvas.onpointermove=e=>{if(!gesture)return;e.preventDefault();const p=point(e);if(gesture.type==='draw')gesture.stroke.points.push(p);else if(gesture.type==='move'){gesture.layer.x=limit(p.x-gesture.dx,0,canvas.width);gesture.layer.y=limit(p.y-gesture.dy,0,canvas.height)}else{const g=gesture,ratio=Math.hypot(p.x-g.layer.x,p.y-g.layer.y)/Math.max(1,Math.hypot(g.start.x-g.layer.x,g.start.y-g.layer.y));resize(g.layer,g.width*ratio)}render()};
  canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=()=>{gesture=null};
  controls.querySelector('[data-select-tool]').onclick=()=>{mode='select';updateControls()};
  controls.querySelector('[data-brush-tool]').onclick=()=>{mode='brush';selected=null;updateControls();render()};
  sheet.querySelector('[data-brush-color]').oninput=()=>{mode='brush';selected=null;updateControls();render()};
  slider.oninput=()=>{if(selected)resize(selected,canvas.width*Number(slider.value)/100)};
  del.onclick=()=>{if(selected)layers.splice(layers.indexOf(selected),1);select(null)};
  sheet.querySelector('[data-photo-edit]').onclick=()=>{editing=!editing;sheet.classList.toggle('photo-editing',editing);render()};
  sheet.querySelector('[data-clear-drawing]').onclick=()=>{layers.length=strokes.length=0;select(null)};
  sheet.querySelectorAll('[data-photo-emoji]').forEach(b=>b.onclick=()=>addLayer({emoji:b.dataset.photoEmoji}));
  sheet.querySelector('[data-photo-sticker]').onchange=e=>{const file=e.target.files?.[0];if(!file)return;const url=URL.createObjectURL(file),image=new Image();image.onload=()=>{URL.revokeObjectURL(url);if(sheet.isConnected)addLayer({image})};image.onerror=()=>{URL.revokeObjectURL(url);notify('贴纸无法读取')};image.src=url;e.target.value=''};
  return {exportBlob(){return new Promise((resolve,reject)=>{if(!ready)return reject(Error('图片还未加载完成'));try{const output=document.createElement('canvas');output.width=canvas.width;output.height=canvas.height;paint(output.getContext('2d'));output.toBlob(blob=>blob?resolve(blob):reject(Error('图片保存失败')),'image/png')}catch{reject(Error('图床不允许导出编辑后的图片，请下载原图后从相册上传'))}})} };
}
