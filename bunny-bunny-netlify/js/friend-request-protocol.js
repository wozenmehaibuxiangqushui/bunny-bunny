export function buildFriendRequestPrompt({user,people,conversations}){
  const friends=new Set(conversations.map(x=>x.personId));
  const chars=people.filter(x=>x.type==="char"&&!friends.has(x.id));
  const npcs=people.filter(x=>x.type==="npc"&&!friends.has(x.id)&&!boundIds(x).some(id=>friends.has(id)));
  const mainChars=people.filter(x=>x.type==="char");
  return `你在 Bunny Bunny 手机系统中生成一条“有人主动添加 USER 为好友”的申请。不要扮演助手，不要解释。
USER 资料：${JSON.stringify(publicIdentity(user))}
可直接发起申请的未添加 CHAR：${JSON.stringify(chars.map(publicIdentity))}
可直接发起申请且与 USER 没有共同好友的 NPC：${JSON.stringify(npcs.map(publicIdentity))}
可作为小号所属人的 CHAR：${JSON.stringify(mainChars.map(x=>({id:x.id,name:x.name,persona:x.persona||x.personality||x.note})))}
从以下四类选择一种：existing_char、unrelated_npc、stranger、char_alt。
existing_char/unrelated_npc 必须返回上面真实存在的 personId；stranger 必须生成完整陌生人人设；char_alt 必须返回 parentCharId 并生成与本体有关但社交名称、头像和聊天习惯可不同的小号档案。
申请备注要像真人主动加好友时写的短备注，符合人物身份和关系线索，10—36字。
只返回 JSON，不要 Markdown：
{"sourceType":"existing_char|unrelated_npc|stranger|char_alt","personId":"","parentCharId":"","name":"","chatName":"","age":"","gender":"","occupation":"","location":"","personality":"","appearance":"","familyBackground":"","hobbies":"","tmi":"","signature":"","requestNote":""}`;
}

export function parseFriendRequest(raw,context){
  const source=String(raw||"").replace(/^\`\`\`(?:json)?\s*/i,"").replace(/\s*\`\`\`$/,""),match=source.match(/\{[\s\S]*\}/);
  if(!match)throw Error("模型没有返回可用的好友申请 JSON");
  let data;try{data=JSON.parse(match[0])}catch{throw Error("好友申请返回格式无法解析，请重试")}
  const type=["existing_char","unrelated_npc","stranger","char_alt"].includes(data.sourceType)?data.sourceType:"stranger";
  const friends=new Set(context.conversations.map(x=>x.personId));
  let person=context.people.find(x=>x.id===data.personId);
  if(type==="existing_char"&&(!person||person.type!=="char"||friends.has(person.id)))person=null;
  if(type==="unrelated_npc"&&(!person||person.type!=="npc"||friends.has(person.id)||boundIds(person).some(id=>friends.has(id))))person=null;
  if(!person){
    const parent=type==="char_alt"?context.people.find(x=>x.id===data.parentCharId&&x.type==="char"):null;
    person={id:`${type==="char_alt"?"char":"stranger"}-${Date.now()}-${Math.random().toString(16).slice(2,7)}`,type:"char",isAlt:type==="char_alt",parentCharId:parent?.id||"",name:String(data.name||parent?.name||"新朋友").trim(),chatName:String(data.chatName||data.name||"new_friend").trim(),age:String(data.age||""),gender:String(data.gender||""),occupation:String(data.occupation||""),location:String(data.location||""),city:String(data.location||""),personality:String(data.personality||"自然、礼貌，有自己的生活节奏"),appearance:String(data.appearance||""),familyBackground:String(data.familyBackground||""),hobbies:String(data.hobbies||""),tmi:String(data.tmi||""),signature:String(data.signature||""),persona:[data.personality,data.appearance,data.familyBackground,data.hobbies,data.tmi].filter(Boolean).join("\n"),initials:initials(data.name||parent?.name),online:true};
  }
  return{sourceType:type,personDraft:{...person},requestNote:String(data.requestNote||"你好 可以认识一下吗").trim(),raw:source.slice(0,6000)};
}

function publicIdentity(p={}){return{id:p.id,name:p.name,chatName:p.chatName,type:p.type,age:p.age,occupation:p.occupation,location:p.location||p.city,personality:p.personality||p.persona,note:p.note,boundCharId:p.boundCharId,boundIdentityIds:boundIds(p)}}
function boundIds(person={}){return[...new Set([...(person.boundIdentityIds||[]),...(person.boundCharId?[person.boundCharId]:[])])]}
function initials(name){return String(name||"FR").replace(/\s/g,"").slice(0,2).toUpperCase()}
