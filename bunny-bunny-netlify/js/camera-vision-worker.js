let classifyActions;
let face,hand;
self.onmessage=async({data})=>{try{
 if(data.type==='init'){
  ({classifyActions}=await import('./vision-actions.js')); 
  const base='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
  const {FilesetResolver,FaceLandmarker,HandLandmarker}=await import(base+'/vision_bundle.mjs');
  const wasm=await FilesetResolver.forVisionTasks(base+'/wasm');
  const options=name=>({baseOptions:{modelAssetPath:`https://storage.googleapis.com/mediapipe-models/${name}/${name}/float16/1/${name}.task`,delegate:'CPU'},runningMode:'VIDEO'});
  hand=await HandLandmarker.createFromOptions(wasm,{...options('hand_landmarker'),numHands:2,minHandDetectionConfidence:.7,minHandPresenceConfidence:.7,minTrackingConfidence:.7});
  face=await FaceLandmarker.createFromOptions(wasm,{...options('face_landmarker'),numFaces:1,outputFaceBlendshapes:true});self.postMessage({type:'ready'});
 }else if(data.type==='frame'){
  try{const h=hand.detectForVideo(data.frame,data.time),f=face.detectForVideo(data.frame,data.time);self.postMessage({type:'result',actions:classifyActions({hands:h.landmarks,face:f.faceLandmarks[0],blendshapes:f.faceBlendshapes[0]?.categories})});}finally{data.frame.close();}
 }
 }catch(error){self.postMessage({type:'error',message:error.message})}};
