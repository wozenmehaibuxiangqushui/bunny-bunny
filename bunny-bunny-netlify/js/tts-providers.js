import { escapeHtml, showToast } from "./core/ui.js";

export const TTS_PROVIDERS={
  browser:{label:"浏览器原生",note:"免 Key，使用设备自带音色；支持语速、音调和音量。"},
  openai:{label:"OpenAI / Groq 兼容",note:"兼容 /audio/speech；支持模型、Voice、格式、语速与 instructions。"},
  minimax:{label:"MiniMax",note:"支持 Speech 2.x、Voice ID、情绪、语速、音调、音量与输出质量。"},
  elevenlabs:{label:"ElevenLabs",note:"支持 Voice ID、稳定度、相似度、风格、说话人增强和输出格式。"},
  azure:{label:"Microsoft Azure Speech",note:"按区域接入，支持 SSML、Voice、Style、Role、语速和音调。"},
  google:{label:"Google Cloud TTS",note:"支持语言、Voice、speakingRate、pitch 与音频编码。"},
  deepgram:{label:"Deepgram Aura",note:"使用 Aura 模型名选择音色，支持编码与采样率。"},
  fish:{label:"Fish Audio",note:"支持模型、Reference ID、temperature、top_p、语速与低延迟模式。"},
  custom:{label:"自定义兼容接口",note:"接入返回音频二进制的 OpenAI 风格 /audio/speech 代理。"}
};

export const TTS_DEFAULTS={
  activeProvider:"browser",llmProsody:true,
  providers:{
    browser:{voice:"",lang:"zh-CN",speed:1,pitch:1,volume:1},
    openai:{baseUrl:"https://api.openai.com/v1",apiKey:"",model:"gpt-4o-mini-tts",voice:"alloy",format:"mp3",speed:1,instructions:""},
    minimax:{baseUrl:"https://api.minimaxi.com/v1",apiKey:"",model:"speech-2.8-hd",voiceId:"female-shaonv",emotion:"auto",speed:1,pitch:0,volume:1,format:"mp3",sampleRate:32000,bitrate:128000},
    elevenlabs:{baseUrl:"https://api.elevenlabs.io/v1",apiKey:"",model:"eleven_multilingual_v2",voiceId:"",stability:.5,similarity:.75,style:0,speakerBoost:true,speed:1,outputFormat:"mp3_44100_128"},
    azure:{region:"eastus",apiKey:"",voice:"zh-CN-XiaoxiaoNeural",language:"zh-CN",style:"general",role:"",speed:1,pitch:0,outputFormat:"audio-24khz-48kbitrate-mono-mp3"},
    google:{baseUrl:"https://texttospeech.googleapis.com/v1",apiKey:"",language:"cmn-CN",voice:"cmn-CN-Wavenet-A",speed:1,pitch:0,audioEncoding:"MP3"},
    deepgram:{baseUrl:"https://api.deepgram.com/v1",apiKey:"",model:"aura-2-thalia-en",encoding:"mp3",sampleRate:24000},
    fish:{baseUrl:"https://api.fish.audio/v1",apiKey:"",model:"s2.1-pro-free",referenceId:"",format:"mp3",temperature:.7,topP:.7,speed:1,latency:"balanced"},
    custom:{baseUrl:"",endpoint:"/audio/speech",apiKey:"",model:"",voice:"",format:"mp3",speed:1,extraHeaders:""}
  }
};

export function ensureTtsState(state){
  const saved=state.tts||{},savedProviders=saved.providers||{},legacy=state.voiceApis?.tts||{},legacyId=legacy.provider==="compatible"?"openai":legacy.provider;
  state.tts={...TTS_DEFAULTS,...saved,providers:{}};
  for(const [id,defaults] of Object.entries(TTS_DEFAULTS.providers))state.tts.providers[id]={...defaults,...(legacyId===id&&!savedProviders[id]?legacy:{}),...(savedProviders[id]||{})};
  return state.tts;
}

export function resolveTtsConfig(state,profile={}){const t=ensureTtsState(state),provider=t.activeProvider,c={provider,...t.providers[provider]},voice=/^voice_kr_\d+$/i.test(profile.voiceId||"")?"":profile.voiceId;if(voice){if(["minimax","elevenlabs"].includes(provider))c.voiceId=voice;else if(provider==="fish")c.referenceId=voice;else if(provider==="deepgram")c.model=voice;else c.voice=voice}if(profile.voiceSpeed)c.speed=Number(profile.voiceSpeed);return c}
export function parseToneDirective(value){const source=String(value||""),match=source.match(/\[\[TONE:([^\]]+)\]\]/i);return{text:source.replace(/\[\[TONE:[^\]]+\]\]/gi,"").trim(),tone:match?.[1]?.trim()||""}}
export function toneInstruction(enabled){return enabled?"回复第一行必须输出 [[TONE:语气]]，语气用简短中文描述，例如温柔、开心、低落、紧张、认真；正文紧随其后。":"不要输出 TONE 标记；语音引擎将自行根据文字语境决定语气。"}

export function ttsPanel(state){const t=ensureTtsState(state),id=t.activeProvider,c=t.providers[id];return `<section class="tts-center">
  <p class="callout">厂商密钥仅保存在当前浏览器。网页直连还取决于厂商是否允许浏览器跨域；不允许时请填写自己的同源代理地址。</p>
  <section class="card stack tts-common"><label class="field"><span>TTS 厂商</span><select data-tts-provider>${Object.entries(TTS_PROVIDERS).map(([key,x])=>`<option value="${key}" ${key===id?"selected":""}>${x.label}</option>`).join("")}</select></label>
  <label class="setting-row"><div><span class="label">由 LLM 提供语气</span><small>开启：模型输出语气并映射到当前引擎；关闭：引擎仅根据正文自行判断</small></div><input class="switch" type="checkbox" data-tts-llm-tone ${t.llmProsody?"checked":""}></label><small>${TTS_PROVIDERS[id].note}</small></section>
  <form class="stack" data-kind="tts" data-provider="${id}">${providerFields(id,c)}<div class="row"><button type="button" class="button secondary" data-test-tts>试听</button><button class="button">保存并启用</button></div></form>
  <section class="tts-capabilities">${capabilityCards(id)}</section></section>`}

export function bindTtsPanel(container,store,rerender){
  const select=container.querySelector("[data-tts-provider]"),form=container.querySelector('form[data-kind="tts"]');if(!select||!form)return;
  select.onchange=()=>{store.update(s=>ensureTtsState(s).activeProvider=select.value);rerender()};
  container.querySelector("[data-tts-llm-tone]").onchange=e=>store.update(s=>ensureTtsState(s).llmProsody=e.target.checked);
  form.onsubmit=e=>{e.preventDefault();saveForm(store,form);showToast(`${TTS_PROVIDERS[form.dataset.provider].label} 已保存并启用`);rerender()};
  container.querySelector("[data-test-tts]").onclick=async()=>{try{saveForm(store,form);const state=store.getState(),tone=ensureTtsState(state).llmProsody?"温柔、自然": "";await synthesizeSpeech(resolveTtsConfig(state),"你好，这里是 Bunny Bunny 的语音测试。",{tone});showToast("试听完成")}catch(error){showToast(error.message)}};
}

function saveForm(store,form){const id=form.dataset.provider,data=Object.fromEntries(new FormData(form));for(const input of form.querySelectorAll('input[type="number"],input[type="range"]'))data[input.name]=Number(input.value);for(const input of form.querySelectorAll('input[type="checkbox"]'))data[input.name]=input.checked;store.update(s=>{const t=ensureTtsState(s);t.activeProvider=id;t.providers[id]={...t.providers[id],...data}})}

export async function synthesizeSpeech(config,text,{tone=""}={}){const clean=String(text||"").trim();if(!clean)return;const c=config||{},provider=c.provider||"browser",prosody=toneProsody(tone);if(provider==="browser")return browserSpeech(tone?{...c,speed:num(c.speed,1)*prosody.speed,pitch:num(c.pitch,1)*prosody.pitch}:c,clean);if(!c.apiKey)throw Error(`请先填写 ${TTS_PROVIDERS[provider]?.label||"TTS"} API Key`);let response;
  if(provider==="openai"||provider==="custom"){const instructions=[c.instructions,tone&&`请使用${tone}的语气朗读`].filter(Boolean).join("；"),supportsInstructions=/api\.openai\.com/i.test(c.baseUrl)||Boolean(c.instructions),input=tone&&!supportsInstructions?`(${tone}) ${clean}`:clean;response=await fetch(`${trim(c.baseUrl)}${provider==="custom"?(c.endpoint||"/audio/speech"):"/audio/speech"}`,{method:"POST",headers:{Authorization:`Bearer ${c.apiKey}`,"Content-Type":"application/json",...extraHeaders(c.extraHeaders)},body:JSON.stringify({model:c.model,voice:c.voice,input,response_format:c.format||"mp3",speed:num(c.speed,1),...(instructions&&supportsInstructions?{instructions}:{})})})}
  else if(provider==="minimax"){response=await fetch(`${trim(c.baseUrl)}/t2a_v2`,{method:"POST",headers:{Authorization:`Bearer ${c.apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:c.model,text:clean,stream:false,voice_setting:{voice_id:c.voiceId,speed:num(c.speed,1),vol:num(c.volume,1),pitch:num(c.pitch,0),...(tone?{emotion:mapEmotion(tone,c.emotion)}:c.emotion&&c.emotion!=="auto"?{emotion:c.emotion}:{})},audio_setting:{sample_rate:Number(c.sampleRate),bitrate:Number(c.bitrate),format:c.format||"mp3",channel:1}})});if(response.ok){const data=await response.json(),audio=data.data?.audio||data.audio_file;if(!audio)throw Error(data.base_resp?.status_msg||"MiniMax 未返回音频");return playBlob(hexOrBase64(audio),`audio/${c.format||"mpeg"}`)}}
  else if(provider==="elevenlabs"){response=await fetch(`${trim(c.baseUrl)}/text-to-speech/${encodeURIComponent(c.voiceId)}?output_format=${encodeURIComponent(c.outputFormat)}`,{method:"POST",headers:{"xi-api-key":c.apiKey,"Content-Type":"application/json"},body:JSON.stringify({text:tone?`(${tone}) ${clean}`:clean,model_id:c.model,voice_settings:{stability:tone?Math.min(num(c.stability,.5),prosody.stability):num(c.stability,.5),similarity_boost:num(c.similarity,.75),style:tone?Math.max(num(c.style,0),prosody.style):num(c.style,0),use_speaker_boost:Boolean(c.speakerBoost),speed:num(c.speed,1)}})})}
  else if(provider==="azure"){const style=tone?mapAzureStyle(tone):c.style,ssml=`<speak version="1.0" xml:lang="${xml(c.language)}"><voice name="${xml(c.voice)}">${style&&style!=="general"?`<mstts:express-as style="${xml(style)}"${c.role?` role="${xml(c.role)}"`:""}>`:""}<prosody rate="${percent(num(c.speed,1)*prosody.speed)}" pitch="${signed(num(c.pitch,0)+prosody.pitchPercent)}%">${xml(clean)}</prosody>${style&&style!=="general"?"</mstts:express-as>":""}</voice></speak>`;response=await fetch(`https://${c.region}.tts.speech.microsoft.com/cognitiveservices/v1`,{method:"POST",headers:{"Ocp-Apim-Subscription-Key":c.apiKey,"Content-Type":"application/ssml+xml","X-Microsoft-OutputFormat":c.outputFormat,"User-Agent":"BunnyBunny"},body:ssml.replace("<speak ",'<speak xmlns:mstts="https://www.w3.org/2001/mstts" ')})}
  else if(provider==="google"){const input=tone?{ssml:`<speak><prosody rate="${percent(prosody.speed)}" pitch="${signed(prosody.pitchPercent)}%">${xml(clean)}</prosody></speak>`}:{text:clean};response=await fetch(`${trim(c.baseUrl)}/text:synthesize?key=${encodeURIComponent(c.apiKey)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({input,voice:{languageCode:c.language,name:c.voice},audioConfig:{audioEncoding:c.audioEncoding,speakingRate:num(c.speed,1),pitch:num(c.pitch,0)}})});if(response.ok){const data=await response.json();return playBlob(base64Blob(data.audioContent),mime(c.audioEncoding))}}
  else if(provider==="deepgram"){response=await fetch(`${trim(c.baseUrl)}/speak?model=${encodeURIComponent(c.model)}&encoding=${encodeURIComponent(c.encoding||"mp3")}&sample_rate=${Number(c.sampleRate||24000)}`,{method:"POST",headers:{Authorization:`Token ${c.apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({text:tone?`(${tone}) ${clean}`:clean})})}
  else if(provider==="fish"){response=await fetch(`${trim(c.baseUrl)}/tts`,{method:"POST",headers:{Authorization:`Bearer ${c.apiKey}`,"Content-Type":"application/json",model:c.model},body:JSON.stringify({text:tone?`(${tone}) ${clean}`:clean,reference_id:c.referenceId,format:c.format||"mp3",temperature:num(c.temperature,.7),top_p:num(c.topP,.7),latency:c.latency||"balanced",prosody:{speed:num(c.speed,1),volume:0,normalize_loudness:true}})})}
  if(!response?.ok){let detail="";try{detail=(await response.clone().json()).message||""}catch{}throw Error(`${TTS_PROVIDERS[provider]?.label||provider} 合成失败（${response?.status||"网络错误"}）${detail?`：${detail}`:""}`)}return playBlob(await response.blob())}

function providerFields(id,c){const f=(name,label,type="text",attrs="")=>`<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${escapeHtml(c[name]??"")}" ${attrs}></label>`,sel=(name,label,items)=>`<label class="field"><span>${label}</span><select name="${name}">${items.map(x=>`<option ${String(c[name])===String(x[0])?"selected":""} value="${x[0]}">${x[1]}</option>`).join("")}</select></label>`,toggle=(name,label)=>`<label class="setting-row"><span class="label">${label}</span><input class="switch" name="${name}" type="checkbox" ${c[name]?"checked":""}></label>`,common=()=>`${f("baseUrl","Base URL")}${f("apiKey","API Key","password",'autocomplete="off"')}`;
  if(id==="browser")return`${f("voice","系统音色名称（留空自动）")}${f("lang","语言")}${range("speed","语速",c.speed,.5,2,.05)}${range("pitch","音调",c.pitch,0,2,.05)}${range("volume","音量",c.volume,0,1,.05)}`;
  if(id==="openai")return`${common()}${f("model","模型")}${f("voice","Voice")}${sel("format","格式",[["mp3","MP3"],["wav","WAV"],["opus","Opus"],["aac","AAC"]])}${range("speed","语速",c.speed,.25,4,.05)}${f("instructions","固定朗读指令（可选）")}`;
  if(id==="minimax")return`${common()}${f("model","语音模型")}${f("voiceId","Voice ID")}${sel("emotion","默认情绪",[["auto","自动"],["happy","开心"],["sad","悲伤"],["angry","生气"],["fearful","害怕"],["surprised","惊讶"],["calm","平静"]])}${range("speed","语速",c.speed,.5,2,.05)}${range("pitch","音调",c.pitch,-12,12,1)}${range("volume","音量",c.volume,.1,10,.1)}<div class="row">${f("sampleRate","采样率","number")}${f("bitrate","码率","number")}</div>${sel("format","格式",[["mp3","MP3"],["wav","WAV"],["pcm","PCM"],["flac","FLAC"]])}`;
  if(id==="elevenlabs")return`${common()}${f("model","模型")}${f("voiceId","Voice ID")}${range("stability","稳定度",c.stability,0,1,.01)}${range("similarity","相似度",c.similarity,0,1,.01)}${range("style","风格强度",c.style,0,1,.01)}${range("speed","语速",c.speed,.7,1.2,.01)}${toggle("speakerBoost","说话人增强")}${f("outputFormat","输出格式")}`;
  if(id==="azure")return`${f("region","Azure 区域")}${f("apiKey","Speech Key","password",'autocomplete="off"')}${f("language","语言区域")}${f("voice","Voice 名称")}${f("style","Style（general 为自动）")}${f("role","Role（可选）")}${range("speed","语速",c.speed,.5,2,.05)}${range("pitch","音调 %",c.pitch,-50,50,1)}${f("outputFormat","输出格式")}`;
  if(id==="google")return`${common()}${f("language","Language Code")}${f("voice","Voice Name")}${range("speed","Speaking Rate",c.speed,.25,4,.05)}${range("pitch","Pitch",c.pitch,-20,20,.5)}${sel("audioEncoding","音频编码",[["MP3","MP3"],["OGG_OPUS","OGG Opus"],["LINEAR16","WAV / Linear16"]])}`;
  if(id==="deepgram")return`${common()}${f("model","Aura 模型 / 音色")}${sel("encoding","编码",[["mp3","MP3"],["opus","Opus"],["linear16","Linear16"]])}${f("sampleRate","采样率","number")}`;
  if(id==="fish")return`${common()}${f("model","模型")}${f("referenceId","Reference ID / 音色模型")}${sel("format","格式",[["mp3","MP3"],["wav","WAV"],["opus","Opus"]])}${range("temperature","表现力 Temperature",c.temperature,0,1,.05)}${range("topP","Top P",c.topP,0,1,.05)}${range("speed","语速",c.speed,.5,2,.05)}${sel("latency","延迟模式",[["normal","Normal"],["balanced","Balanced"]])}`;
  return`${common()}${f("endpoint","合成路径")}${f("model","模型")}${f("voice","Voice")}${sel("format","格式",[["mp3","MP3"],["wav","WAV"],["opus","Opus"]])}${range("speed","语速",c.speed,.25,4,.05)}${f("extraHeaders","额外请求头 JSON")}`}
function range(name,label,value,min,max,step){return`<label class="field tts-range"><span>${label} <output>${value}</output></span><input name="${name}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" oninput="this.previousElementSibling.querySelector('output').textContent=this.value"></label>`}
function capabilityCards(active){const rows=["独立鉴权","音色/模型","语速","情绪映射","试听可用"];return`<div class="section-title"><h3>${TTS_PROVIDERS[active].label}</h3><span>能力检查</span></div><div class="tts-cap-grid">${rows.map(x=>`<span>✓ ${x}</span>`).join("")}</div>`}
function browserSpeech(c,text){return new Promise((resolve,reject)=>{if(!window.speechSynthesis)return reject(Error("当前浏览器不支持语音朗读"));speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=c.lang||"zh-CN";u.rate=num(c.speed,1);u.pitch=num(c.pitch,1);u.volume=num(c.volume,1);if(c.voice){const v=speechSynthesis.getVoices().find(x=>x.name===c.voice);if(v)u.voice=v}u.onend=resolve;u.onerror=()=>reject(Error("浏览器朗读失败"));speechSynthesis.speak(u)})}
async function playBlob(blob){const url=URL.createObjectURL(blob),audio=new Audio(url);audio.onended=()=>URL.revokeObjectURL(url);audio.onerror=()=>URL.revokeObjectURL(url);await audio.play();return audio}
function trim(x){return String(x||"").replace(/\/$/,"")}
function num(x,d){const n=Number(x);return Number.isFinite(n)?n:d}
function percent(rate){return`${Math.round((num(rate,1)-1)*100)>=0?"+":""}${Math.round((num(rate,1)-1)*100)}%`}
function signed(x){return num(x,0)>=0?`+${num(x,0)}`:String(num(x,0))}
function xml(x){return escapeHtml(String(x??"")).replace(/'/g,"&apos;")}
function extraHeaders(value){try{return JSON.parse(value||"{}")}catch{throw Error("额外请求头必须是有效 JSON")}}
function mapEmotion(tone,fallback){const t=String(tone);if(/开|兴奋|愉快/.test(t))return"happy";if(/悲|低落|难过/.test(t))return"sad";if(/怒|生气/.test(t))return"angry";if(/怕|紧张/.test(t))return"fearful";if(/惊/.test(t))return"surprised";return fallback&&fallback!=="auto"?fallback:"calm"}
function mapAzureStyle(tone){const t=String(tone);if(/开|兴奋|愉快/.test(t))return"cheerful";if(/悲|低落|难过/.test(t))return"sad";if(/怒|生气/.test(t))return"angry";if(/怕|紧张/.test(t))return"fearful";if(/严肃|认真/.test(t))return"serious";if(/温柔|轻声|低语/.test(t))return"gentle";return"general"}
function toneProsody(tone){const t=String(tone);if(/开|兴奋|愉快/.test(t))return{speed:1.08,pitch:1.08,pitchPercent:8,style:.55,stability:.38};if(/悲|低落|难过/.test(t))return{speed:.9,pitch:.92,pitchPercent:-8,style:.35,stability:.55};if(/怒|生气|激动/.test(t))return{speed:1.1,pitch:.96,pitchPercent:-4,style:.65,stability:.3};if(/紧张|害怕/.test(t))return{speed:1.05,pitch:1.06,pitchPercent:6,style:.48,stability:.35};if(/温柔|轻声|低语/.test(t))return{speed:.94,pitch:1,pitchPercent:0,style:.28,stability:.62};return{speed:1,pitch:1,pitchPercent:0,style:.2,stability:.5}}
function base64Blob(value){const bytes=atob(value||""),arr=new Uint8Array(bytes.length);for(let i=0;i<bytes.length;i++)arr[i]=bytes.charCodeAt(i);return new Blob([arr])}
function hexOrBase64(value){const raw=String(value||"");if(/^[0-9a-f]+$/i.test(raw)&&raw.length%2===0){const arr=new Uint8Array(raw.length/2);for(let i=0;i<arr.length;i++)arr[i]=parseInt(raw.slice(i*2,i*2+2),16);return new Blob([arr])}return base64Blob(raw)}
function mime(enc){return enc==="OGG_OPUS"?"audio/ogg":enc==="LINEAR16"?"audio/wav":"audio/mpeg"}
