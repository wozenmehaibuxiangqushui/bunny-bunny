// One filled outline per bubble avoids a double-opacity seam where glass tails join.
export function bubblePath(width,height,radius,kind,tail,{continuation=false,groupEnd=true}={}){
  const w=Math.max(1,width),h=Math.max(1,height),r=Math.min(radius,h/2,w/2);
  const isIMessage=kind==='imessage',isCompact=kind==='kakaotalk'||kind==='line';
  const topLeft=isIMessage&&continuation?Math.min(5,r):isCompact&&tail?Math.min(7,r):r;
  const bottomLeft=isIMessage&&!groupEnd?Math.min(5,r):r;
  let d=`M${topLeft},0 H${w-r} Q${w},0 ${w},${r} V${h-r} Q${w},${h} ${w-r},${h} H${bottomLeft}`;
  if(tail&&isIMessage){
    // One continuous filled path keeps the curved terminal tail seamless, even on glass.
    d+=` C${Math.min(9,bottomLeft/2)},${h} 0,${h-2} -7,${h-2} C-1,${h-5} 0,${h-9} 0,${h-13} V${topLeft}`;
  }else{
    d+=` Q0,${h} 0,${h-bottomLeft}`;
    if(tail){
      // LINE and KakaoTalk put a short tail beside the first message in a run.
      const y=Math.min(h-bottomLeft-4,Math.max(topLeft+5,12));
      d+=` V${y+5} Q-2,${y+2} -7,${y} Q-3,${y-1} 0,${y-5}`;
    }
    d+=` V${topLeft}`;
  }
  return d+` Q0,0 ${topLeft},0 Z`;
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
    path.setAttribute('d',bubblePath(w,h,parseFloat(getComputedStyle(bubble).borderTopLeftRadius)||16,kind,tail,{continuation:message.classList.contains('continuation'),groupEnd:message.classList.contains('group-end')}));path.setAttribute('transform',message.classList.contains('user')?`translate(${w} 0) scale(-1 1)`:'');
  }
  const observer=new ResizeObserver(entries=>{if(!root.isConnected){observer.disconnect();return}for(const entry of entries)update(entry.target)});
  active.set(root.parentElement,observer);for(const bubble of bubbles){update(bubble);observer.observe(bubble)}
}
