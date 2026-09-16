import { personById } from "./core/store.js";
import { sendToModel } from "./integrations/ai-client.js";

export function setupProactiveMessages({store}){
  let running=false;
  const check=async()=>{
    if(running||document.hidden)return;running=true;
    try{
      const state=store.getState(),now=Date.now();
      if(now-Number(state.callRuntime?.lastMessageCheck||0)<4*60*1000)return;
      store.update(s=>s.callRuntime={...(s.callRuntime||{}),lastMessageCheck:now,lastProactiveAt:{...(s.callRuntime?.lastProactiveAt||{})}});
      for(const conv of state.conversations){
        const profile=state.chatProfiles[conv.personId]||{};if(!profile.proactive||inQuietHours(profile.quietHours))continue;
        const last=(state.messages[conv.id]||[]).at(-1),previous=Number(state.callRuntime?.lastProactiveAt?.[conv.id]||0);
        if(now-previous<45*60*1000)continue;
        const waiting=last?.role==="char"&&last.readAt&&now-Number(last.readAt)>12*60*1000;
        const idle=Boolean(last?.createdAt)&&now-Number(last.createdAt)>90*60*1000;
        if(!waiting&&!idle)continue;
        const model=state.modelProfiles.find(x=>x.id===state.activeModelProfileId);if(!model?.apiKey||!model.model)break;
        const person=personById(state,conv.personId),user=personById(state,state.currentUserId),recent=(state.messages[conv.id]||[]).slice(-10).map(x=>`${x.role}:${x.text||x.description||x.type}`).join("\n");
        const prompt=`你是${person.name}，人物设定：${person.personality||person.persona||person.note||""}。USER 是${user.name}，资料：${user.personality||user.note||""}。\n${waiting?"USER 已读了你上一条消息但暂时没有回复。只有活泼、爱撒娇或较幼稚的人设才可以自然追问；成熟克制的人设应选择不发送。":"你们已经一段时间没有聊天，请判断此刻是否会主动联系。"}\n最近对话：\n${recent}\n严格只返回 JSON：{"send":true或false,"text":"若发送则是符合人设的真人短消息，不写动作描写","translation":"外语消息的中文翻译，否则留空"}。不要解释。`;
        try{store.update(s=>s.callRuntime.lastProactiveAt[conv.id]=Date.now());const raw=await sendToModel(model,[{role:"user",text:prompt}],""),result=parseJson(raw);if(!result?.send||!result.text)continue;const time=timeNow(),id=crypto.randomUUID();store.update(s=>{(s.messages[conv.id]||(s.messages[conv.id]=[])).push({id,role:"char",type:"text",text:String(result.text),translation:result.translation||"",time,createdAt:Date.now()});const target=s.conversations.find(x=>x.id===conv.id);target.preview=result.text;target.time=time;target.unread=Number(target.unread||0)+1})}catch{}
        break;
      }
    }finally{running=false}
  };
  setInterval(check,60000);setTimeout(check,5000);
}
function parseJson(text){try{const match=String(text||"").match(/\{[\s\S]*\}/);return match?JSON.parse(match[0]):null}catch{return null}}
function inQuietHours(value){const match=String(value||"").match(/(\d{1,2}):(\d{2})\D+(\d{1,2}):(\d{2})/);if(!match)return false;const now=new Date(),minute=now.getHours()*60+now.getMinutes(),start=Number(match[1])*60+Number(match[2]),end=Number(match[3])*60+Number(match[4]);return start>end?minute>=start||minute<end:minute>=start&&minute<end}
function timeNow(){return new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit",hour12:false})}
