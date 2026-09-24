// One filled outline per bubble avoids a double-opacity seam where glass tails join.
export function bubblePath(width,height,radius,kind,tail){
  const w=Math.max(1,width),h=Math.max(1,height),r=Math.min(radius,h/2,w/2);
  let d=`M${r},0 H${w-r} Q${w},0 ${w},${r} V${h-r} Q${w},${h} ${w-r},${h} H${r}`;
  if(tail&&kind==='imessage')d+=` C${Math.min(8,r/2)},${h} -1,${h-1} -6,${h-2} C-1,${h-5} 0,${h-9} 0,${Math.max(r,h-14)} V${r}`;
  else {d+=` Q0,${h} 0,${h-r}`;if(tail){const y=Math.max(r+5,Math.min(18,h/2));d+=` V${y+5} L-6,${y} L0,${y-5}`}d+=` V${r}`}
  return d+` Q0,0 ${r},0 Z`;
}
const active=new WeakMap();
export function alignBubbleShapes(root){
  const old=active.get(root.parentElement);old?.disconnect();
  // Let explicitly authored bubble CSS keep control of its own fill and silhouette.
  if(/:is\([^)]*\.bubble-v3/.test(document.getElementById('bunny-conversation-user-css')?.textContent||''))return;
  const kind=root.dataset.chatSkin;if(!['imessage','wechat','kakaotalk','line'].includes(kind))return;
  const ns='http://www.w3.org/2000/svg',bubbles=[...root.querySelectorAll('.message:not(.special-message) .bubble-v3')];
  function update(bubble){const w=bubble.clientWidth,h=bubble.clientHeight;if(!w||!h)return;let svg=bubble.querySelector(':scope > .bubble-outline');if(!svg){svg=document.createElementNS(ns,'svg');svg.classList.add('bubble-outline');svg.setAttribute('aria-hidden','true');svg.append(document.createElementNS(ns,'path'));bubble.prepend(svg);bubble.classList.add('joined-tail')}
    const message=bubble.closest('.message'),tail=kind==='imessage'?message.classList.contains('group-end'):kind==='wechat'||!message.classList.contains('continuation');
    svg.setAttribute('viewBox',`-8 0 ${w+16} ${h}`);svg.setAttribute('preserveAspectRatio','none');const path=svg.firstChild;
    path.setAttribute('d',bubblePath(w,h,parseFloat(getComputedStyle(bubble).borderTopLeftRadius)||16,kind,tail));path.setAttribute('transform',message.classList.contains('user')?`translate(${w} 0) scale(-1 1)`:'');
  }
  const observer=new ResizeObserver(entries=>{if(!root.isConnected){observer.disconnect();return}for(const entry of entries)update(entry.target)});
  active.set(root.parentElement,observer);for(const bubble of bubbles){update(bubble);observer.observe(bubble)}
}
