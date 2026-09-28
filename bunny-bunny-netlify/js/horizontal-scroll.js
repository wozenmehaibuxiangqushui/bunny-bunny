export function bindHorizontalScroll(el){
 if(!el)return;el.dataset.noSwipe='';el.tabIndex=0;el.setAttribute('aria-label','兴趣小组，左右滑动查看更多');let drag=null,suppressUntil=0;
 el.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:el.scrollLeft,moved:false};});
 el.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x;if(!drag.moved&&Math.abs(dx)>6&&Math.abs(dx)>Math.abs(e.clientY-drag.y)){drag.moved=true;el.setPointerCapture(e.pointerId);el.classList.add('dragging')}if(drag.moved){e.preventDefault();el.scrollLeft=drag.left-dx;}});
 const end=()=>{if(drag?.moved){suppressUntil=Date.now()+250;el.classList.remove('dragging')}drag=null};el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);el.addEventListener('lostpointercapture',end);
 el.addEventListener('click',e=>{if(Date.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
 el.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();el.scrollBy({left:(e.key==='ArrowRight'?1:-1)*el.clientWidth*.8,behavior:'smooth'})}});
}
