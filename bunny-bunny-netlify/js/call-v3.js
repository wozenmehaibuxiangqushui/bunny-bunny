import { conversationById, personById } from "./core/store.js";
import { escapeHtml, initialsAvatar, showToast, updateIsland, openSheet, closeSheet } from "./core/ui.js";
import { sendToModel } from "./integrations/ai-client.js";
import { startBrowserRecognition, speakText } from "./voice-client.js";
import { ensureCallPrompts, fillPrompt, parseJsonReply } from "./call-prompts.js";
import { ensureTtsState, resolveTtsConfig, parseToneDirective, toneInstruction } from "./tts-providers.js";

const sessions=new Map();
export function createCallRenderer({store,navigate}){
  return function render(container,params={}){
    const state=store.getState(),conv=conversationById(state,params.id||"conv-jun");if(!conv)return navigate("chat");
    const person=personById(state,conv.personId),user=personById(state,state.currentUserId),profile=state.chatProfiles[person.id],mode=params.mode==="video"?"视频":"语音";
    const key=`${conv.id}:${params.mode||"voice"}:${params.direction||"outgoing"}`;
    let session=sessions.get(key);if(!session){session={status:params.direction==="incoming"?"incoming":"calling",lines:[],startedAt:Date.now(),busy:false};sessions.set(key,session);queueMicrotask(()=>begin(session,key,conv,person,user,profile,mode,container,params))}
    document.querySelector("#header-title").textContent=`${mode}通话`;document.querySelector("#header-kicker").textContent=person.name;
    const back=document.querySelector("#back-button");back.classList.remove("hidden");back.textContent="‹";back.onclick=()=>endCall(key,conv,navigate);
    container.className=`app-view call-screen ${params.mode==="video"?"video-call":"voice-call"}`;
    container.innerHTML=`<section class="call-stage">
      <div class="call-aurora"></div><div class="call-status"><span>${statusText(session,person)}</span><time data-call-time>${duration(session)}</time></div>
      <div class="call-portraits">${avatar(person,profile,"char")}<span class="call-heart">♥</span>${avatar(user,{avatarUrl:user.avatarUrl||""},"user")}</div>
      <div class="call-dialogue" data-call-dialogue>${session.status==="loading"?'<div class="call-loading"><i></i><i></i><i></i></div>':session.error?`<p class="call-error">${escapeHtml(session.error)}</p>`:session.lines.slice(-3).map(x=>`<p class="${x.role}">${escapeHtml(x.text)}</p>`).join("")||'<p class="call-wait">等待接通…</p>'}</div>
      <nav class="call-controls"><button class="call-control glass" data-voice-input aria-label="语音输入">${micIcon()}<span>说话</span></button><button class="call-control hangup" data-hangup aria-label="挂断">${phoneIcon()}<span>挂断</span></button><button class="call-control glass" data-text-input aria-label="文字输入">${speakerIcon()}<span>文字</span></button></nav>
    </section>`;
    container.querySelector("[data-hangup]").onclick=()=>endCall(key,conv,navigate);
    container.querySelector("[data-voice-input]").onclick=()=>openVoiceInput(session,key,conv,person,user,profile,mode,container,params);
    container.querySelector("[data-text-input]").onclick=()=>openTextInput(session,key,conv,person,user,profile,mode,container,params);
    if(session.status==="incoming")openIncoming(session,key,conv,person,user,profile,mode,container,params);
    const timer=setInterval(()=>{const el=container.querySelector("[data-call-time]");if(!el||!document.body.contains(el))return clearInterval(timer);el.textContent=duration(session)},1000);
  }

  async function begin(session,key,conv,person,user,profile,mode,container,params){
    if(params.direction==="incoming")return;
    session.status="loading";rerender(container,params);
    try{
      const state=store.getState(),toneEnabled=profile.llmTone!==false,model=activeModel(state),prompts=ensureCallPrompts(state),prompt=`${fillPrompt(prompts.callDecision,{char:person.name,user:user.name,mode,time:new Date().toLocaleString("zh-CN"),schedule:profile.quietHours||"无"})}${toneEnabled?'\nJSON 中额外返回 "tone":"简短中文语气"。':""}`;
      const raw=await sendToModel(model,[{role:"user",text:prompt}],"");const result=parseJsonReply(raw)||{answer:"accept",opening:raw};
      if(result.answer==="reject"){session.status="rejected";session.error=result.reason||"对方现在不方便接听";rerender(container,params);setTimeout(()=>endCall(key,conv,navigate),1800);return}
      session.status="connected";session.connectedAt=Date.now();rerender(container,params);if(result.opening)await streamLine(session,{role:"char",text:toneEnabled&&result.tone?`[[TONE:${result.tone}]]${result.opening}`:result.opening},container,params,resolveTtsConfig(state,profile))
    }catch(error){session.status="error";session.error=error.message;rerender(container,params)}
  }
  function openIncoming(session,key,conv,person,user,profile,mode,container,params){openSheet(`<div class="incoming-call-card">${initialsAvatar(person,profile)}<span>${escapeHtml(person.name)}</span><h3>邀请你进行${mode}通话</h3><div class="incoming-actions"><button class="decline" data-decline>${phoneIcon()}<span>拒绝</span></button><button class="accept" data-accept>${phoneIcon()}<span>接听</span></button></div></div>`,{onReady(sheet){sheet.querySelector("[data-decline]").onclick=()=>{closeSheet();endCall(key,conv,navigate)};sheet.querySelector("[data-accept]").onclick=()=>{closeSheet();session.status="connected";session.connectedAt=Date.now();const opening=parseToneDirective(params.opening||profile.proactiveOpening||"（声音轻轻靠近）喂，突然有点想听听你的声音。");session.lines.push({role:"char",text:opening.text});rerender(container,params);speakText(resolveTtsConfig(store.getState(),profile),opening.text,{tone:opening.tone}).catch(error=>showToast(error.message))}}})}
  function openTextInput(session,key,conv,person,user,profile,mode,container,params){openSheet(`<div class="call-input-sheet"><div class="sheet-title"><h3>文字输入</h3></div><textarea rows="5" data-call-text placeholder="输入想对 ${escapeHtml(person.name)} 说的话…"></textarea><div class="row"><button class="button secondary" data-sheet-close>取消</button><button class="button" data-send-call-text>发送</button></div></div>`,{onReady(sheet){sheet.querySelector("[data-send-call-text]").onclick=()=>{const text=sheet.querySelector("[data-call-text]").value.trim();if(!text)return showToast("请输入内容");closeSheet();respond(session,conv,person,user,profile,mode,text,container,params)}}})}
  function openVoiceInput(session,key,conv,person,user,profile,mode,container,params){let live=null;openSheet(`<div class="call-input-sheet"><div class="sheet-title"><h3>语音转文字</h3><span class="pill">免 Key</span></div><p class="callout">点击话筒后直接使用浏览器语音识别，结果可以手动修改。</p><textarea rows="5" data-stt-text placeholder="识别结果会出现在这里，也可以手动修改"></textarea><div class="voice-sheet-actions"><button data-cancel-voice>取消</button><button class="voice-record" data-record>${micIcon()}</button><button data-confirm-voice>确认</button></div><small data-stt-state>点击中间话筒开始识别</small></div>`,{onReady(sheet){
      const text=sheet.querySelector("[data-stt-text]"),status=sheet.querySelector("[data-stt-state]"),record=sheet.querySelector("[data-record]");let recording=false;
      record.onclick=()=>{try{if(recording){recording=false;record.classList.remove("active");live?.stop();live=null;return}recording=true;record.classList.add("active");live=startBrowserRecognition({language:recognitionLanguage(profile.language),onText:v=>text.value=v,onState:v=>{status.textContent=v==="listening"?"正在聆听…":"识别结束";if(v!=="listening"){recording=false;record.classList.remove("active")}},onError:e=>{status.textContent=browserSpeechError(e);recording=false;record.classList.remove("active")}})}catch(error){recording=false;record.classList.remove("active");status.textContent=error.message}};
      sheet.querySelector("[data-cancel-voice]").onclick=()=>{live?.abort();closeSheet()};
      sheet.querySelector("[data-confirm-voice]").onclick=()=>{const value=text.value.trim();if(!value)return showToast("没有可发送的识别文字");live?.stop();closeSheet();respond(session,conv,person,user,profile,mode,value,container,params)};
    }})}
  async function respond(session,conv,person,user,profile,mode,input,container,params){session.lines.push({role:"user",text:input});session.status="loading";rerender(container,params);try{const state=store.getState(),prompt=`${fillPrompt(ensureCallPrompts(state).callReply,{char:person.name,user:user.name,mode,input,schedule:profile.quietHours||"无"})}\n${toneInstruction(profile.llmTone!==false)}`;const reply=await sendToModel(activeModel(state),[{role:"user",text:prompt}],"");session.status="connected";await streamLine(session,{role:"char",text:reply},container,params,resolveTtsConfig(state,profile))}catch(error){session.status="connected";session.error=error.message;rerender(container,params)}}
  async function streamLine(session,line,container,params,tts){const parsed=parseToneDirective(line.text);session.lines.push({...line,text:""});for(const char of parsed.text){session.lines[session.lines.length-1].text+=char;rerender(container,params);await delay(32)}speakText(tts,parsed.text,{tone:parsed.tone}).catch(error=>showToast(error.message))}
  function rerender(container,params){const route=createCallRenderer({store,navigate});sessions.set(`${params.id||"conv-jun"}:${params.mode||"voice"}:${params.direction||"outgoing"}`,sessions.get(`${params.id||"conv-jun"}:${params.mode||"voice"}:${params.direction||"outgoing"}`));route(container,params)}
}

export function setupChatVoiceSettings({store,navigate}){
  const observer=new MutationObserver(()=>{if(document.querySelector("#app-screen")?.dataset.app!=="chat-settings")return;enhance()});observer.observe(document.querySelector("#app-screen"),{childList:true,subtree:true});
  function enhance(){const form=document.querySelector("#app-view [data-form]");if(!form||form.querySelector("[data-voice-v3-settings]"))return;const state=store.getState(),personId=location.hash.includes("chat-settings")?(history.state?.params?.personId||"char-jun"):"char-jun",profile=state.chatProfiles[personId]||state.chatProfiles["char-jun"],submit=form.querySelector('button[type="submit"]');submit.insertAdjacentHTML("beforebegin",`<div data-voice-v3-settings>
    <div class="section-title"><h3>拍一拍与主动通话</h3><span>真实交互</span></div><section class="card stack"><div class="row"><button type="button" class="button secondary" data-ai-pat="patText">AI 写“我拍 CHAR”</button><button type="button" class="button secondary" data-ai-pat="patUserText">AI 写“CHAR 拍我”</button></div><label class="setting-row"><div><span class="label">允许 CHAR 主动打电话</span><small>网页打开期间按角色日程判断来电</small></div><input class="switch" type="checkbox" data-proactive-call ${profile.proactiveCall?"checked":""}></label><button type="button" class="button secondary" data-test-incoming>测试一次主动来电</button></section></div>`);
    form.querySelector("[data-proactive-call]").onchange=e=>store.update(s=>s.chatProfiles[personId].proactiveCall=e.target.checked);
    form.querySelector("[data-test-incoming]").onclick=()=>{const conv=store.getState().conversations.find(x=>x.personId===personId);navigate("call",{id:conv.id,mode:"voice",direction:"incoming"})};
    form.querySelectorAll("[data-ai-pat]").forEach(b=>b.onclick=async()=>{try{const input=form.elements[b.dataset.aiPat];input.value=await sendToModel(activeModel(store.getState()),[{role:"user",text:`你是${profile.remark||personId}。写一句有角色个人风格的微信拍一拍文案，只输出文案本身，20字以内。`}],"");showToast("AI 文案已写入，保存设置后生效")}catch(e){showToast(e.message)}});
  }
  queueMicrotask(enhance);
}

export function setupProactiveCalls({store,navigate}){setInterval(async()=>{const state=store.getState();if(document.hidden||state.callRuntime?.active)return;const now=Date.now();if(now-(state.callRuntime?.lastCheck||0)<15*60*1000)return;store.update(s=>s.callRuntime={...(s.callRuntime||{}),lastCheck:now});for(const [personId,profile] of Object.entries(state.chatProfiles)){if(!profile.proactiveCall||Math.random()>.18)continue;const conv=state.conversations.find(x=>x.personId===personId),person=personById(state,personId),user=personById(state,state.currentUserId);try{const toneEnabled=profile.llmTone!==false,prompt=`${fillPrompt(ensureCallPrompts(state).proactiveCall,{char:person.name,user:user.name,time:new Date().toLocaleString("zh-CN"),schedule:profile.quietHours||"无",recent:(state.messages[conv.id]||[]).slice(-4).map(x=>x.text).join(" / ")})}${toneEnabled?'\nJSON 中额外返回 "tone":"简短中文语气"。':""}`,result=parseJsonReply(await sendToModel(activeModel(state),[{role:"user",text:prompt}],""));if(result?.call)navigate("call",{id:conv.id,mode:"voice",direction:"incoming",opening:toneEnabled&&result.tone?`[[TONE:${result.tone}]]${result.opening}`:result.opening})}catch{}break}},60000)}
function activeModel(state){const model=state.modelProfiles.find(x=>x.id===state.activeModelProfileId);if(!model?.apiKey||!model.model)throw Error("请先在“模型与 API”启用一个可用模型预设");return model}
function avatar(person,profile,kind){return`<div class="call-avatar ${kind}">${initialsAvatar(person,profile)}<span>${escapeHtml(person.name)}</span></div>`}
function statusText(session,person){return({incoming:"来电",calling:"正在呼叫…",loading:"等待 AI 响应…",connected:`正在与 ${person.name} 通话`,rejected:"对方暂时无法接听",error:"连接失败"})[session.status]||"通话已结束"}
function duration(session){if(!session.connectedAt)return"";const total=Math.floor((Date.now()-session.connectedAt)/1000),m=String(Math.floor(total/60)).padStart(2,"0"),s=String(total%60).padStart(2,"0");return`${m}:${s}`}
function endCall(key,conv,navigate){sessions.delete(key);window.speechSynthesis?.cancel?.();navigate("conversation",{id:conv.id})}
function recognitionLanguage(value){return({"粤语":"yue-Hant-HK",English:"en-US","日本語":"ja-JP",Français:"fr-FR","한국어":"ko-KR",Deutsch:"de-DE",Español:"es-ES"})[value]||"zh-CN"}
function browserSpeechError(value){return({"not-allowed":"请允许浏览器使用麦克风","service-not-allowed":"当前浏览器禁用了语音识别服务","language-not-supported":"当前设备不支持所选语言","network":"语音识别服务暂时无法连接"})[value]||`识别失败：${value}`}
function delay(ms){return new Promise(r=>setTimeout(r,ms))}
function micIcon(){return'<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4m-4 0h8"/></svg>'}
function phoneIcon(){return'<svg viewBox="0 0 24 24"><path d="M5 15c4-3 10-3 14 0l-2 4-4-2v-2h-2v2l-4 2-2-4Z"/></svg>'}
function speakerIcon(){return'<svg viewBox="0 0 24 24"><path d="M4 10h4l5-4v12l-5-4H4zM17 9c2 2 2 4 0 6m2-9c4 4 4 8 0 12"/></svg>'}
