// Geometric candidates, not calibrated gesture probabilities or emotion inference.
const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.y-b.y):Infinity;
export function classifyActions({hands=[],face=[],blendshapes=[]}={}){
 const out=[],scores=Object.fromEntries(blendshapes.map(x=>[x.categoryName,x.score]));
 const add=(label,experimental=true)=>out.push({label,experimental});
 if(Math.min(scores.mouthSmileLeft||0,scores.mouthSmileRight||0)>.68)add('嘴角上扬，像在微笑',false);
 if((scores.mouthPucker||0)>.72)add('嘴唇向前嘟起',false);
 if(Math.min(scores.mouthFrownLeft||0,scores.mouthFrownRight||0)>.65)add('嘴角向下撇');
 const faceWidth=face.length?distance(face[234],face[454]):0;
 for(const h of hands){if(h.length<21)continue;const palm=distance(h[5],h[17]);if(palm<.015)continue;
   const pinch=distance(h[4],h[8])<palm*.48,curled=[12,16,20].filter(i=>distance(h[i],h[0])<distance(h[i-2],h[0])*1.15).length;
   if(pinch&&curled>=2){const cheek=faceWidth&&Math.min(distance(h[8],face[234]),distance(h[8],face[454]))<faceWidth*.55;add(cheek?'疑似贴脸比心':'疑似手指比心（也可能是捏合）');}
   if(faceWidth&&distance(h[9],face[13])<faceWidth*.28&&distance(h[12],face[13])<faceWidth*.5)add('手靠近并遮住嘴部');
 }
 if(hands.length===2&&hands.every(h=>h.length>=21)){const [a,b]=hands,scale=(distance(a[5],a[17])+distance(b[5],b[17]))/2;
   if(distance(a[8],b[8])<scale*.8&&distance(a[4],b[4])<scale*.9&&Math.abs(a[8].y-a[4].y)>scale*.22)add(face.length&&a[8].y<face[10].y&&b[8].y<face[10].y?'疑似头顶比心':'疑似双手比心');
 }
 return [...new Map(out.map(x=>[x.label,x])).values()];
}
export function createActionStabilizer(){let label='',count=0,lastSent='',sentAt=0;return(actions,now=Date.now())=>{const candidate=actions[0];if(!candidate){label='';count=0;return null}if(candidate.label===label)count++;else{label=candidate.label;count=1}if(count<4||now-sentAt<10000||(lastSent===label&&now-sentAt<45000))return null;lastSent=label;sentAt=now;return {...candidate,observedAt:now};};}
