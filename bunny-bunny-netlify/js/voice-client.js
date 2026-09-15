export const voiceDefaults={
  stt:{provider:"browser",baseUrl:"https://api.groq.com/openai/v1",apiKey:"",model:"whisper-large-v3-turbo",language:"zh"},
  tts:{provider:"browser",baseUrl:"https://api.groq.com/openai/v1",apiKey:"",model:"canopylabs/orpheus-v1-english",voice:"hannah",speed:1}
};

export function startBrowserRecognition({language="zh-CN",onText,onState,onError}){
  const Engine=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Engine)throw Error("当前浏览器不支持原生语音识别，请选择 Groq、Deepgram 或兼容接口");
  const recognition=new Engine();recognition.lang=language;recognition.continuous=true;recognition.interimResults=true;
  recognition.onstart=()=>onState?.("listening");recognition.onend=()=>onState?.("idle");recognition.onerror=e=>onError?.(e.error||"语音识别失败");
  recognition.onresult=e=>{let text="";for(let i=0;i<e.results.length;i++)text+=e.results[i][0].transcript;onText?.(text)};
  recognition.start();return{stop:()=>recognition.stop(),abort:()=>recognition.abort()};
}

export async function transcribeAudio(config,blob){
  if(!blob?.size)throw Error("没有录到声音");const c={...voiceDefaults.stt,...config};
  if(c.provider==="browser")throw Error("浏览器识别请使用实时识别按钮");
  if(!c.apiKey)throw Error("请先在聊天设置填写 STT API Key");
  if(c.provider==="deepgram"){
    const base=(c.baseUrl||"https://api.deepgram.com/v1").replace(/\/$/,"");
    const response=await fetch(`${base}/listen?model=${encodeURIComponent(c.model||"nova-3")}&smart_format=true&language=${encodeURIComponent(c.language||"zh")}`,{method:"POST",headers:{Authorization:`Token ${c.apiKey}`,"Content-Type":blob.type||"audio/webm"},body:blob});
    if(!response.ok)throw Error(`Deepgram 识别失败（${response.status}）`);const data=await response.json();return data.results?.channels?.[0]?.alternatives?.[0]?.transcript||"";
  }
  const form=new FormData();form.append("file",blob,"bunny-call.webm");form.append("model",c.model||"whisper-large-v3-turbo");if(c.language)form.append("language",c.language);
  const response=await fetch(`${(c.baseUrl||"https://api.groq.com/openai/v1").replace(/\/$/,"")}/audio/transcriptions`,{method:"POST",headers:{Authorization:`Bearer ${c.apiKey}`},body:form});
  if(!response.ok)throw Error(`语音识别失败（${response.status}）`);const data=await response.json();return data.text||"";
}

export async function speakText(config,text){
  const clean=String(text||"").replace(/[（(][^）)]*[）)]/g,"").trim();if(!clean)return;
  const c={...voiceDefaults.tts,...config};
  if(c.provider==="browser")return browserSpeak(clean,c);
  if(!c.apiKey)throw Error("请先在聊天设置填写 TTS API Key");
  const response=await fetch(`${c.baseUrl.replace(/\/$/,"")}/audio/speech`,{method:"POST",headers:{Authorization:`Bearer ${c.apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:c.model,voice:c.voice,input:clean,response_format:"mp3",speed:Number(c.speed||1)})});
  if(!response.ok)throw Error(`语音合成失败（${response.status}）`);const audio=new Audio(URL.createObjectURL(await response.blob()));await audio.play();return audio;
}
function browserSpeak(text,c){return new Promise((resolve,reject)=>{if(!window.speechSynthesis)return reject(Error("当前浏览器不支持语音朗读"));speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.rate=Number(c.speed||1);if(c.voice){const voice=speechSynthesis.getVoices().find(v=>v.name===c.voice);if(voice)u.voice=voice}u.onend=resolve;u.onerror=()=>reject(Error("语音朗读失败"));speechSynthesis.speak(u)})}

export async function recordAudio({onState}={}){
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error("当前浏览器不支持录音");const stream=await navigator.mediaDevices.getUserMedia({audio:true});const chunks=[],recorder=new MediaRecorder(stream);
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.start();onState?.("recording");
  return{stop:()=>new Promise(resolve=>{recorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());onState?.("idle");resolve(new Blob(chunks,{type:recorder.mimeType||"audio/webm"}))};recorder.stop()}),cancel:()=>{recorder.onstop=()=>stream.getTracks().forEach(t=>t.stop());recorder.stop()}};
}
