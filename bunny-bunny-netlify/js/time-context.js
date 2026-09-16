const PERIODS=[
  [5,"凌晨"],[8,"早晨"],[11,"上午"],[13,"中午"],[17,"下午"],[19,"傍晚"],[23,"晚上"],[24,"深夜"]
];

export function ensureTimeProfile(profile={}){
  if(typeof profile.timeAwarenessEnabled!=="boolean")profile.timeAwarenessEnabled=true;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(profile.manualDate||""))profile.manualDate=localDateValue(new Date());
  if(!/^\d{2}:\d{2}$/.test(profile.manualTime||""))profile.manualTime=localTimeValue(new Date());
  return profile;
}

export function effectiveNow(profile={},realNow=new Date()){
  ensureTimeProfile(profile);
  if(profile.timeAwarenessEnabled!==false)return new Date(realNow);
  const [year,month,day]=profile.manualDate.split("-").map(Number),[hour,minute]=profile.manualTime.split(":").map(Number);
  const value=new Date(year,month-1,day,hour,minute,0,0);
  return Number.isNaN(value.getTime())?new Date(realNow):value;
}

export function buildTimeContext(profile={},options={}){
  const now=effectiveNow(profile,options.realNow||new Date()),timezone=options.timezone||"本机时区",lastAt=Number(options.lastMessageAt||0),elapsed=lastAt?elapsedText((options.realNow||new Date()).getTime()-lastAt):"无法确定";
  const date=new Intl.DateTimeFormat("zh-CN",{year:"numeric",month:"long",day:"numeric",weekday:"long"}).format(now),clock=localTimeValue(now),period=dayPeriod(now.getHours());
  return `【当前时间感知（后台事实）】\n当前日期与时刻：${date} ${clock}（${period}）；时区参考：${timezone}；时间来源：${profile.timeAwarenessEnabled===false?"USER 手动设定":"现实设备时间"}。距聊天中上一条真实消息约：${elapsed}。\n必须敏锐理解今天/明天/昨晚/周末、作息、职业日程、节日与相隔时长，但只在自然相关时体现；不得每轮报时，不得把时间设定逐字复述给 USER。手动时间视为当前世界的真实现在，不能擅自改回现实日期。`;
}

export function timeSummary(profile={}){
  const now=effectiveNow(profile);return profile.timeAwarenessEnabled===false?`${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,"0")}.${String(now.getDate()).padStart(2,"0")}`:"现实时间";
}

export function localDateValue(date){return`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`}
export function localTimeValue(date){return`${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}`}
function dayPeriod(hour){return PERIODS.find(([end])=>hour<end)?.[1]||"深夜"}
function elapsedText(delta){if(delta<0)return"时间线中的未来消息";if(delta<60*1000)return"不到 1 分钟";if(delta<60*60*1000)return`${Math.floor(delta/60000)} 分钟`;if(delta<24*60*60*1000)return`${Math.floor(delta/3600000)} 小时`;return`${Math.floor(delta/86400000)} 天`}
