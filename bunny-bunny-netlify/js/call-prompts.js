export const DEFAULT_CALL_PROMPTS={
  callDecision:`你正在扮演 {{char}}。用户 {{user}} 发起了{{mode}}通话。当前时间：{{time}}。角色日程或安静时段：{{schedule}}。请结合角色性格与当前状态决定是否接听；忙碌时可以拒接，但不要机械拒绝。只返回 JSON：{"answer":"accept 或 reject","reason":"简短原因","opening":"接通后的第一句话，动作放在中文括号内"}。`,
  callReply:`你正在与 {{user}} 进行实时{{mode}}通话，你是 {{char}}。对方刚刚说：{{input}}。结合最近对话继续自然回应。动作或神态必须放在中文括号内，实际说出口的文字放在括号外；控制在 1—3 句，不要解释规则。`,
  proactiveCall:`你是 {{char}}，正在考虑主动给 {{user}} 打电话。当前时间：{{time}}，日程：{{schedule}}，最近对话：{{recent}}。判断现在是否适合主动联系。只返回 JSON：{"call":true或false,"reason":"原因","opening":"接通后的开场白"}。`,
  chatActions:`你可以正常聊天，也可以在剧情合理时发送特殊消息。若要给用户转账，单独输出 [[TRANSFER:金额:备注]]；若要发红包，单独输出 [[REDPACKET:金额:备注]]，红包金额不得超过 520；若要从角色表情包库发送表情，单独输出 [[STICKER:表情名称或描述关键词]]。只能选择提示词中列出的角色表情。除此之外不要输出这些标记。图片或表情信息会以描述文本提供；角色未开启识图时，只依据描述理解。`
};
export function ensureCallPrompts(state){state.callPrompts={...DEFAULT_CALL_PROMPTS,...(state.callPrompts||{})};return state.callPrompts}
export function fillPrompt(template,values){return String(template||"").replace(/{{(\w+)}}/g,(_,key)=>String(values[key]??""))}
export function parseJsonReply(text){const raw=String(text||"").replace(/^```(?:json)?|```$/g,"").trim();const match=raw.match(/\{[\s\S]*\}/);if(!match)return null;try{return JSON.parse(match[0])}catch{return null}}
export function extractChatActions(text){const actions=[];let clean=String(text||"").replace(/\[\[(TRANSFER|REDPACKET):([\d.]+):([^\]]*)\]\]/g,(_,kind,amount,note)=>{actions.push({kind:kind==="TRANSFER"?"transfer":"redpacket",amount:Number(amount),note:note.trim()});return""});clean=clean.replace(/\[\[STICKER:([^\]]+)\]\]/g,(_,query)=>{actions.push({kind:"sticker",query:query.trim()});return""}).trim();return{clean,actions}}
