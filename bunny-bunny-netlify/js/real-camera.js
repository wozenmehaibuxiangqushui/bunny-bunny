import {createActionStabilizer} from './vision-actions.js';
export function createRealCamera({recognition=false,onObservation,onStatus=()=>{}}){
 let stream=null,video=null,worker=null,timer=0,timeout=0,ready=false,inFlight=false,closed=false,facing='user',generation=0,lastVideoTime=-1;
 const stable=createActionStabilizer();
 const status=text=>{if(!closed)onStatus(text)};
 async function start(flip=false){const token=++generation;closed=false;globalThis.addEventListener('pagehide',stop);if(!navigator.mediaDevices?.getUserMedia)throw Error('摄像头需要 HTTPS 和支持的浏览器');if(flip)facing=facing==='user'?'environment':'user';stream?.getTracks().forEach(t=>t.stop());stream=null;status('正在请求摄像头…');
  try{const next=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:facing},width:{ideal:640},height:{ideal:480}}});if(closed||token!==generation){next.getTracks().forEach(t=>t.stop());return}stream=next;attach(video);status(recognition?'摄像头已开启 · 正在加载动作模型…':'摄像头已开启');if(recognition&&!worker)startVision();}catch(e){status(e.name==='NotAllowedError'?'未获得摄像头权限，可在浏览器站点设置中开启':e.name==='NotFoundError'?'没有找到可用摄像头':`摄像头不可用：${e.message}`);}
 }
 function attach(el){video=el;if(!video||!stream)return;video.srcObject=stream;video.muted=true;video.playsInline=true;video.style.transform=facing==='user'?'scaleX(-1)':'';void video.play().catch(()=>status('点击摄像头按钮继续播放'));}
 function startVision(){worker=new Worker(new URL('./camera-vision-worker.js',import.meta.url));timeout=setTimeout(()=>{if(!ready){stopVision();status('动作模型加载超时 · 摄像头仍可用，点击重试识别')}},45000);
  worker.onmessage=({data})=>{if(closed)return;if(data.type==='ready'){ready=true;clearTimeout(timeout);status('动作识别已开启 · 比心候选需点按确认');timer=setInterval(frame,250);}else if(data.type==='result'){inFlight=false;const observation=stable(data.actions);if(observation)onObservation(observation)}else if(data.type==='error'){stopVision();status(`识别暂不可用：${data.message}`)}};
  worker.onerror=()=>{stopVision();status('动作模型加载失败，可检查网络后重试')};worker.postMessage({type:'init'});
 }
 async function frame(){if(closed||inFlight||!ready||document.hidden||!video||video.readyState<2||lastVideoTime===video.currentTime)return;inFlight=true;lastVideoTime=video.currentTime;try{const bitmap=await createImageBitmap(video,{resizeWidth:480});if(closed||!worker){bitmap.close();inFlight=false;return}worker.postMessage({type:'frame',frame:bitmap,time:performance.now()},[bitmap]);}catch{inFlight=false}}
 function stopVision(){clearTimeout(timeout);clearInterval(timer);worker?.terminate();worker=null;ready=false;inFlight=false;}
 function stop(){globalThis.removeEventListener('pagehide',stop);closed=true;generation++;stopVision();stream?.getTracks().forEach(t=>t.stop());stream=null;if(video)video.srcObject=null;video=null;}
 return {start,attach,stop,flip:()=>start(true),retryVision:()=>{stopVision();if(stream)startVision()},get active(){return !!stream}};
}
