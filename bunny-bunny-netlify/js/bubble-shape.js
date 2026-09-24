// Draw the body and the tail in one path so there is no overlap seam on photos or glass.
export function bubblePath(width,height,radius,kind,tail){
  const w=Math.max(1,width),h=Math.max(1,height);
  const preferred=kind==='wechat'?5:kind==='kakaotalk'?14:kind==='line'?18:radius;
  const r=Math.min(preferred,h/2,w/2);
  let d=`M${r},0 H${w-r} Q${w},0 ${w},${r} V${h-r} Q${w},${h} ${w-r},${h} H${r}`;
  if(kind==='imessage'&&tail){
    // The iMessage tail curves below the last capsule in a run.
    d+=` C${Math.min(10,r/2)},${h} 2,${h+3} -8,${h+8} C-2,${h+2} 0,${h-2} 0,${h-11} V${r}`;
    return d+` Q0,0 ${r},0 Z`;
  }
  d+=` Q0,${h} 0,${h-r}`;
  if(tail&&kind==='line')return d+` V16 Q-4,2 -10,0 H${r} Z`;
  if(tail&&kind==='kakaotalk')return d+` V15 Q-3,2 -7,1 H${r} Z`;
  if(tail&&kind==='wechat')d+=` V15 L-7,11 L0,8`;
  return d+` V${r} Q0,0 ${r},0 Z`;
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
    // Equal CSS and SVG padding keeps the outline at the bubble's actual pixel edge.
    svg.style.left='-10px';svg.style.top='0';svg.style.width='calc(100% + 20px)';svg.style.height='calc(100% + 10px)';
    svg.setAttribute('viewBox',`-10 0 ${w+20} ${h+10}`);svg.setAttribute('preserveAspectRatio','none');const path=svg.firstChild;
    path.setAttribute('d',bubblePath(w,h,parseFloat(getComputedStyle(bubble).borderTopLeftRadius)||16,kind,tail));path.setAttribute('transform',message.classList.contains('user')?`translate(${w} 0) scale(-1 1)`:'');
  }
  const observer=new ResizeObserver(entries=>{if(!root.isConnected){observer.disconnect();return}for(const entry of entries)update(entry.target)});
  active.set(root.parentElement,observer);for(const bubble of bubbles){update(bubble);observer.observe(bubble)}
}
