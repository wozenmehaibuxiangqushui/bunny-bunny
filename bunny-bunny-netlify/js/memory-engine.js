import { sendToModel } from "./integrations/ai-client.js";

const DB_NAME="bunny-bunny-memory",STORE="entries",DIM=192,running=new Set();
export const DEFAULT_MEMORY_PROFILE={
  coreMemory:"尚未形成稳定的共同记忆。",
  dynamicState:{charImpressionOfUser:{traits:[],trustLevel:20,affectionLevel:10,recentMood:"观察中"},charSelfState:{currentMood:"平静",recentThoughts:[]},relationshipStage:{stage:"初识",milestones:[],tensionPoints:[]}},
  summaryEveryN:8,grandEveryM:40,lastRegularTurn:0,lastGrandTurn:0,lastUpdatedAt:"",memoryDebugEnabled:false,lastPrompt:"",lastRetrieval:null,
  regularPrompt:"请从最近对话中提炼真正值得角色记住的事实、计划和情绪变化。不要把寒暄或一次性措辞当作长期记忆。",
  grandPrompt:"请以角色第一人称内心独白视角重新整理核心记忆、对 USER 的印象、自我状态和关系阶段。变化必须循序渐进并服从原始人设。"
};

export function memoryProfile(state,personId){return{...DEFAULT_MEMORY_PROFILE,...(state.memoryProfiles?.[personId]||{}),dynamicState:deepMerge(DEFAULT_MEMORY_PROFILE.dynamicState,state.memoryProfiles?.[personId]?.dynamicState||{})}}

export async function retrieveMemoryContext(state,personId,input){
  const profile=memoryProfile(state,personId),entries=await getEntries(personId),query=String(input||"").trim(),vector=embed(query);
  const keyword=entries.filter(x=>x.kind==="keyword"&&(x.keywords||[]).some(key=>query.toLowerCase().includes(String(key).toLowerCase()))).sort((a,b)=>(b.priority||0)-(a.priority||0)).slice(0,4);
  const semantic=entries.filter(x=>x.kind==="longTerm"&&Array.isArray(x.vector)).map(x=>({...x,score:cosine(vector,x.vector)})).filter(x=>x.score>.12).sort((a,b)=>b.score-a.score||(b.importance||0)-(a.importance||0)).slice(0,5);
  const today=new Date(),monthDay=`${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`,episodic=entries.filter(x=>x.kind==="episodic"&&(x.isAnniversary||String(x.date||"").slice(5)===monthDay)).slice(0,4);
  const selected=uniqueById([...keyword,...episodic,...semantic]);
  const promptBlock=`【角色核心记忆】\n${profile.coreMemory}\n【当前内在状态】\n${JSON.stringify(profile.dynamicState)}\n【本轮自然联想到的记忆】\n${selected.length?selected.map(x=>`- ${x.text||x.event}`).join("\n"):"本轮没有强相关旧记忆。"}\n记忆只用于自然理解和反应，不要逐条复述、不要表现得像在读取档案，也不要为了命中记忆而生硬转移话题。`;
  return{promptBlock,selected,keyword,episodic,semantic:semantic.map(x=>({id:x.id,text:x.text,score:Number(x.score.toFixed(4))}))};
}

export function savePromptDebug(store,personId,payload){const state=store.getState(),enabled=memoryProfile(state,personId).memoryDebugEnabled;if(!enabled)return;const transcript=(payload.messages||[]).map((message,index)=>{const body=message.text||message.description||message.type||"";return`${index+1}. ${String(message.role||"user").toUpperCase()} [${message.type||"text"}] ${body}`}).join("\n"),actual=`【SYSTEM PROMPT】\n${payload.systemPrompt||""}\n\n【MESSAGES】\n${transcript}`;store.update(s=>{s.memoryProfiles=s.memoryProfiles||{};s.memoryProfiles[personId]={...memoryProfile(s,personId),lastPrompt:actual.slice(-100000),lastRetrieval:payload.retrieval||null,lastPromptAt:new Date().toISOString()}})}

export function scheduleMemoryMaintenance({store,personId,model,messages}){
  const state=store.getState(),profile=memoryProfile(state,personId),turns=(messages||[]).filter(x=>x.role==="user"&&!x.recalled).length,n=Math.max(2,Number(profile.summaryEveryN)||8),m=Math.max(n,Number(profile.grandEveryM)||40),grand=turns-profile.lastGrandTurn>=m,regular=turns-profile.lastRegularTurn>=n;
  if((!regular&&!grand)||running.has(personId)||!model?.apiKey||!model.model)return;
  running.add(personId);queueMicrotask(async()=>{try{await maintain(store,personId,model,grand?"grand":"regular")}catch(error){console.warn("Bunny memory update failed",error)}finally{running.delete(personId)}});
}

export async function addMemoryEntry(personId,entry){const row={id:entry.id||crypto.randomUUID(),personId,timestamp:entry.timestamp||Date.now(),importance:3,...entry};if(row.kind==="longTerm")row.vector=embed(row.text||"");await putEntries([row]);return row}
export async function listMemoryEntries(personId){return getEntries(personId)}
export async function clearCharacterMemory(personId){const rows=await getEntries(personId);await Promise.all(rows.map(x=>removeEntry(x.id)))}

async function maintain(store,personId,model,mode){
  const state=store.getState(),profile=memoryProfile(state,personId),person=state.people.find(x=>x.id===personId),user=state.people.find(x=>x.id===state.currentUserId),conv=state.conversations.find(x=>x.personId===personId),messages=(state.messages[conv?.id]||[]),turns=messages.filter(x=>x.role==="user"&&!x.recalled).length,limit=mode==="grand"?Math.max(40,Number(profile.grandEveryM)||40)*2:Math.max(8,Number(profile.summaryEveryN)||8)*2,recent=messages.slice(-limit).map(x=>`${x.role==="char"?person.name:user.name}：${x.recalled?"[已撤回]":x.text||x.description||x.type}`).join("\n");
  const custom=mode==="grand"?profile.grandPrompt:profile.regularPrompt,prompt=`你正在维护角色 ${person.name} 与 ${user.name} 的私人记忆库。角色原始人设：${person.personality||person.persona||person.note||""}\n当前核心记忆：${profile.coreMemory}\n当前动态状态：${JSON.stringify(profile.dynamicState)}\n这是一次${mode==="grand"?"大总结":"阶段总结"}。${custom}\n最近对话：\n${recent}\n以角色第一人称内心独白的判断方式分析，但不要输出散文，只返回严格 JSON：{"coreMemory":"压缩后的核心记忆","longTermMemory":[{"text":"事实或了解","importance":1到5}],"episodicMemory":[{"event":"事件","date":"YYYY-MM-DD或空","emotionalWeight":1到5,"isAnniversary":true或false}],"keywordMemory":[{"keywords":["精确词"],"text":"命中后想起的内容","priority":1到5}],"dynamicState":{"charImpressionOfUser":{"traits":[],"trustLevel":0到100,"affectionLevel":0到100,"recentMood":""},"charSelfState":{"currentMood":"","recentThoughts":[]},"relationshipStage":{"stage":"","milestones":[],"tensionPoints":[]}},"summary":"本次总结"}。数值只能渐进变化，不能因一轮对话突变；一切变化服从原始人设。`;
  const result=parseJson(await sendToModel(model,[{role:"user",text:prompt}],""));if(!result)throw Error("记忆总结没有返回有效 JSON");
  const rows=[];for(const x of result.longTermMemory||[])if(x.text)rows.push({id:crypto.randomUUID(),personId,kind:"longTerm",text:String(x.text),vector:embed(x.text),importance:clamp(x.importance,1,5),timestamp:Date.now()});for(const x of result.episodicMemory||[])if(x.event)rows.push({id:crypto.randomUUID(),personId,kind:"episodic",event:String(x.event),text:String(x.event),date:x.date||"",emotionalWeight:clamp(x.emotionalWeight,1,5),isAnniversary:Boolean(x.isAnniversary),timestamp:Date.now()});for(const x of result.keywordMemory||[])if(x.text&&(x.keywords||[]).length)rows.push({id:crypto.randomUUID(),personId,kind:"keyword",keywords:x.keywords.map(String).slice(0,8),text:String(x.text),priority:clamp(x.priority,1,5),timestamp:Date.now()});await putEntries(rows);
  store.update(s=>{s.memoryProfiles=s.memoryProfiles||{};const old=memoryProfile(s,personId),dynamic=boundedDynamic(old.dynamicState,result.dynamicState||{});s.memoryProfiles[personId]={...old,coreMemory:String(result.coreMemory||old.coreMemory).slice(0,5000),dynamicState:dynamic,lastRegularTurn:turns,lastGrandTurn:mode==="grand"?turns:old.lastGrandTurn,lastUpdatedAt:new Date().toISOString(),lastSummary:String(result.summary||"").slice(0,1200)}})
}

function openDb(){return new Promise((resolve,reject)=>{const request=indexedDB.open(DB_NAME,1);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE)){const object=db.createObjectStore(STORE,{keyPath:"id"});object.createIndex("personId","personId");object.createIndex("kind","kind")}};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
async function getEntries(personId){if(!globalThis.indexedDB)return[];const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readonly"),request=tx.objectStore(STORE).index("personId").getAll(personId);request.onsuccess=()=>resolve(request.result||[]);request.onerror=()=>reject(request.error);tx.oncomplete=()=>db.close()})}
async function putEntries(rows){if(!rows.length||!globalThis.indexedDB)return;const db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite"),object=tx.objectStore(STORE);rows.forEach(x=>object.put(x));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}
async function removeEntry(id){const db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}
export function embed(text){const values=new Float32Array(DIM),tokens=tokenize(text);for(const token of tokens){let h=2166136261;for(const c of token){h^=c.codePointAt(0);h=Math.imul(h,16777619)}const index=(h>>>0)%DIM,sign=(h&1)?1:-1;values[index]+=sign*(1+Math.min(token.length,8)/8)}const norm=Math.sqrt(values.reduce((sum,x)=>sum+x*x,0))||1;return Array.from(values,x=>x/norm)}
export function cosine(a,b){let sum=0,aa=0,bb=0;for(let i=0;i<Math.min(a.length,b.length);i++){sum+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i]}return aa&&bb?sum/Math.sqrt(aa*bb):0}
function tokenize(value){const text=String(value||"").toLowerCase().normalize("NFKC"),parts=text.match(/[a-z0-9_]+|[\u3400-\u9fff]/g)||[],out=[...parts];for(let i=0;i<parts.length-1;i++)out.push(parts[i]+parts[i+1]);return out}
function parseJson(text){try{const match=String(text||"").match(/\{[\s\S]*\}/);return match?JSON.parse(match[0]):null}catch{return null}}
function boundedDynamic(old,next){const merged=deepMerge(old,next);for(const key of ["trustLevel","affectionLevel"]){const before=Number(old?.charImpressionOfUser?.[key]||0),wanted=Number(merged.charImpressionOfUser?.[key]||before);merged.charImpressionOfUser[key]=Math.max(0,Math.min(100,before+Math.max(-8,Math.min(8,wanted-before))))}return merged}
function deepMerge(a,b){const out={...a};for(const [key,value] of Object.entries(b||{}))out[key]=value&&typeof value==="object"&&!Array.isArray(value)?deepMerge(a?.[key]||{},value):value;return out}
function uniqueById(items){const seen=new Set();return items.filter(x=>!seen.has(x.id)&&seen.add(x.id))}
function clamp(value,min,max){return Math.max(min,Math.min(max,Number(value)||min))}
