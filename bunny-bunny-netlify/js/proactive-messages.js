import { personById } from "./core/store.js";
import { worldContextPrompt } from "./world-context.js";
import { sendToModel } from "./integrations/ai-client.js";
import { ensureAccountState, conversationsForAccount } from "./account-system.js";
import { effectiveNow, buildTimeContext } from "./time-context.js";
import { currentSchedule, ensureDailySchedule, enrichDailySchedule, schedulePrompt } from './schedule-engine.js';

export function setupProactiveMessages({store}){
  let running=false;
  const check=async()=>{
    if(running||document.hidden)return;
    running=true;
    try{
      const state=ensureAccountState(store.getState()),now=Date.now();
      if(now-Number(state.callRuntime?.lastMessageCheck||0)<2*60*1000)return;
      store.update(s=>{s.callRuntime={...(s.callRuntime||{}),lastMessageCheck:now,lastProactiveAt:{...(s.callRuntime?.lastProactiveAt||{})},pendingReplies:{...(s.callRuntime?.pendingReplies||{})},proactiveWindows:{...(s.callRuntime?.proactiveWindows||{})}}});
      for(const conv of conversationsForAccount(state)){
        const profile=state.chatProfiles[conv.personId]||{},pending=state.callRuntime?.pendingReplies?.[conv.id];
        if(!profile.proactive||inQuietHours(profile.quietHours,effectiveNow(profile)))continue;
        const person=personById(state,conv.personId),user=personById(state,state.currentUserId);
        if(!person||!user)continue;
        ensureDailySchedule(store,person.id);void enrichDailySchedule(store,person.id);
        const schedule=currentSchedule(store,person.id);
        if(schedule&&!schedule.canReply){store.update(s=>{s.callRuntime.proactiveWindows[conv.id]={nextAt:Date.now()+Math.max(10,Math.min(90,(Number(schedule.end.slice(0,2))*60+Number(schedule.end.slice(3)))-(Number(schedule.start.slice(0,2))*60+Number(schedule.start.slice(3)))))*60000,reason:schedule.status}});continue}
        const messages=state.messages[conv.id]||[],last=messages.at(-1),due=Boolean(pending&&Number(pending.dueAt)<=now),window=state.callRuntime?.proactiveWindows?.[conv.id];
        if(!due&&window&&now<Number(window.nextAt||0))continue;
        if(!due&&!eligibleForSpontaneous(last,now))continue;
        const model=state.modelProfiles.find(x=>x.id===state.activeModelProfileId);
        if(!model?.apiKey||!model.model)break;
        const world=state.worlds.find(x=>x.id===state.currentWorldId),timeContext=buildTimeContext(profile,{timezone:world?.timezone,lastMessageAt:last?.createdAt});
        const recent=messages.slice(-14).map(x=>`${x.role}:${x.text||x.description||x.type}`).join("\n"),cadence=personaCadence(person,profile),prompt=proactivePrompt({person,user,profile,recent,timeContext,due,pending,last,cadence})+'\n'+schedulePrompt(store,person.id);
        try{
          const raw=await sendToModel(model,[{role:"user",text:prompt}],worldContextPrompt(state,person.id)),result=parseJson(raw),nextMinutes=clamp(Number(result?.nextMinutes)||randomWindow(cadence),12,720);
          store.update(s=>{s.callRuntime.lastProactiveAt[conv.id]=Date.now();s.callRuntime.proactiveWindows[conv.id]={nextAt:Date.now()+nextMinutes*60000,reason:result?.busy?"busy":"persona"};if(due)delete s.callRuntime.pendingReplies[conv.id]});
          if(!result?.send)continue;
          const rows=(Array.isArray(result.messages)?result.messages:[{text:result.text,translation:result.translation}]).map(x=>({text:String(x?.text||"").trim(),translation:String(x?.translation||"").trim()})).filter(x=>x.text).slice(0,4);
          if(!rows.length)continue;
          for(let index=0;index<rows.length;index++){
            if(index)await wait(420+Math.min(1100,rows[index].text.length*24));
            const row=rows[index],time=timeNow(),messageId=crypto.randomUUID();
            store.update(s=>{(s.messages[conv.id]||(s.messages[conv.id]=[])).push({id:messageId,role:"char",type:"text",text:row.text,translation:row.translation,time,createdAt:Date.now(),arrivedWithPause:true});const target=s.conversations.find(x=>x.id===conv.id);if(target){target.preview=row.text;target.time=time;target.unread=Number(target.unread||0)+1}});
          }
          if(result.pat)store.update(s=>(s.messages[conv.id]||(s.messages[conv.id]=[])).push({id:crypto.randomUUID(),role:"system",type:"pat",text:profile.patUserText||`${person.name}拍了拍你`,time:timeNow(),createdAt:Date.now()}));
        }catch{}
        break;
      }
    }finally{running=false}
  };
  setInterval(check,60000);
  setTimeout(check,5000);
}

function proactivePrompt({person,user,profile,recent,timeContext,due,pending,last,cadence}){return `你是 ${person.name}，正在真实的手机聊天中判断是否主动联系 ${user.name}。
【人物设定】
${person.persona||person.personality||person.note||"未设定"}
职业/身份：${person.occupation||"未设定"}；年龄：${person.age||"未设定"}；当前状态：${person.note||"未设定"}；关系：${profile.relationship||"未设定"}。
${timeContext}
【判断原则】
- 先根据职业、当地时间、行程和人设判断此刻是否忙碌；上班、上课、睡眠或高强度任务中不应随便闲聊。
- 主动频率只能从性格、年龄、职业、亲密度和最近事件自然推导，不能像定时任务。系统仅提供一个人设倾向参考窗口 ${cadence.min}—${cadence.max} 分钟，不是要求你必须发。
- 活泼、黏人、年轻或爱分享的人更可能主动；克制、成熟、独立或工作繁忙的人更少主动。
- 必须延续最近记忆与对话主线，不要突然抛出与生活无关的话题；不写动作、旁白、AI 套话或客服句式。
${due?`你此前因忙碌暂缓了回复，现在已到约定回复时间（原因：${pending?.reason||"busy"}）。如果仍忙可简短说明，否则要自然接上 USER 最后的消息。`:`这是一次自主联系判断。${last?.role==="char"?"USER 还没有回你；只有符合人设才可轻微追问，不要施压。":"如果没有自然的联系理由，选择不发。"}`}
最近对话：
${recent||"暂无"}
只返回严格 JSON：{"send":true,"busy":false,"messages":[{"text":"符合本人的线上短消息","translation":"外语的中文翻译或空字符串"}],"pat":false,"nextMinutes":90}。不发时 messages 为 []。nextMinutes 是你根据人设和行程认为下次值得再判断的时间（12—720）。`}
function eligibleForSpontaneous(last,now){if(!last)return true;const age=now-Number(last.createdAt||0);if(last.role==="user")return age>8*60*1000;if(last.role==="char"&&last.readAt)return age>15*60*1000;return age>40*60*1000}
function personaCadence(person,profile){const text=`${person.personality||""} ${person.persona||""} ${person.note||""} ${person.occupation||""}`.toLowerCase();let center=130;if(/(活泼|黏人|爱撒娇|外向|话多|分享欲|幼稚)/.test(text))center-=60;if(/(沉静|克制|成熟|独立|慢热|寡言)/.test(text))center+=90;if(/(医生|护士|警察|刑警|教师|学生|律师|演员|艺人|程序员)/.test(text))center+=55;if(Number(person.age)&&Number(person.age)<20)center-=20;if(/(恋人|暧昧|挚友|亲密)/.test(String(profile.relationship||"")))center-=25;center=clamp(center,30,360);return{min:Math.max(12,Math.round(center*.45)),max:Math.round(center*1.8)}}
function randomWindow({min,max}){return Math.round(min+Math.random()*(max-min))}
function parseJson(text){try{const match=String(text||"").match(/\{[\s\S]*\}/);return match?JSON.parse(match[0]):null}catch{return null}}
function inQuietHours(value,now=new Date()){const match=String(value||"").match(/(\d{1,2}):(\d{2})\D+(\d{1,2}):(\d{2})/);if(!match)return false;const minute=now.getHours()*60+now.getMinutes(),start=Number(match[1])*60+Number(match[2]),end=Number(match[3])*60+Number(match[4]);return start>end?minute>=start||minute<end:minute>=start&&minute<end}
function timeNow(){return new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit",hour12:false})}
function clamp(value,min,max){return Math.max(min,Math.min(max,value))}
function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
