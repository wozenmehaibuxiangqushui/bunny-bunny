const LANGUAGE_RULES={
  "自动":"按照角色人设和当前对话自然选择语言",
  "中文":"使用简体中文",
  "粤语":"使用自然粤语口语",
  "English":"use natural conversational English",
  "日本語":"自然な日本語のチャット口調を使う",
  "Français":"utiliser un français conversationnel naturel",
  "한국어":"자연스러운 한국어 채팅 말투를 사용한다",
  "Deutsch":"natürliches umgangssprachliches Deutsch verwenden",
  "Español":"usar español conversacional natural"
};

export function buildInternalChatPrompt({person,user,boundChar,profile,translationEnabled=false,toneEnabled=false,stickerGuide=""}){const language=profile.language||"自动",foreign=!['自动','中文'].includes(language);return `你正在手机聊天软件里扮演 ${person.name}。以下资料来自用户已保存的后台档案，只用于扮演和理解关系，不要逐项复述，不要告诉用户你看到了系统档案。
【你扮演的角色】
${identityBlock(person)}
${person.type==="npc"?`NPC 绑定主角色：${boundChar?identityBlock(boundChar):"尚未绑定"}`:""}
【正在与你聊天的 USER】
${identityBlock(user)}
语言要求：${LANGUAGE_RULES[language]||language}。默认情绪：${profile.emotion||"自动"}；口吻偏好：${profile.toneStyle||"自然"}。
这是纯线上文字聊天：禁止动作描写、舞台说明、括号动作和旁白；不要写“看着你”“笑了笑”等无法通过线上聊天直接看到的内容。
模仿真人即时聊天习惯，并严格服从角色年龄与性格。可以自然使用倒装句、无主语、小短句、空格代替部分逗号、不完全规范的标点、偶尔打错一个字再在下一条纠正、符合角色的小口癖。不要每次同时使用全部特征。
一句完整意思可以拆成 1—4 条连续气泡，但每条应短而自然，禁止长篇文学化输出。
${translationEnabled&&foreign?"每条外语消息必须同时给出准确自然的简体中文翻译；原文和翻译必须在同一次回复中生成。":"translation 字段必须为空字符串。"}
${toneEnabled?"每条消息填写 tone，使用简短中文语气词，如自然、温柔、开心、低落、认真。":"tone 字段必须为空字符串，由语音引擎自行判断。"}
特殊消息只能使用 actions：红包 redpacket（金额不超过520）、转账 transfer、表情 sticker。没有必要时 actions 为空。${stickerGuide}
只返回 JSON，不要 Markdown：{"messages":[{"text":"消息原文","translation":"中文翻译或空字符串","tone":"语气或空字符串"}],"actions":[{"type":"redpacket|transfer|sticker","amount":52,"note":"备注","query":"表情关键词"}]}。`}

export function parseChatResponse(raw){const source=String(raw||"").trim(),candidate=source.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,""),match=candidate.match(/\{[\s\S]*\}/);if(match){try{const data=JSON.parse(match[0]),messages=(Array.isArray(data.messages)?data.messages:[]).slice(0,6).map(x=>({text:String(x.text||"").trim(),translation:String(x.translation||"").trim(),tone:String(x.tone||"").trim()})).filter(x=>x.text),actions=(Array.isArray(data.actions)?data.actions:[]).map(normalizeAction).filter(Boolean);if(messages.length||actions.length)return{messages,actions}}catch{}}
  const clean=source.replace(/[（(][^）)]*[）)]/g,"").trim();return{messages:clean?[{text:clean,translation:"",tone:""}]:[],actions:[]}}
function normalizeAction(x){const type=String(x.type||x.kind||"").toLowerCase();if(type==="sticker")return{kind:"sticker",query:String(x.query||x.note||"").trim()};if(type==="redpacket"||type==="transfer"){const amount=Math.max(0,Number(x.amount)||0);if(!amount)return null;return{kind:type,amount,note:String(x.note||"").trim()}}return null}
function identityBlock(p={}){return[
  `类型：${p.type||"未设定"}；真实姓名：${p.name||"未设定"}；社交名称：${p.chatName||"未设定"}；年龄：${p.age||"未设定"}；性别：${p.gender||"未设定"}；身高：${p.height||"未设定"}；生日：${p.birthday||"未设定"}`,
  `职业/身份：${p.occupation||"未设定"}；所在地：${p.location||p.city||"未设定"}；原型城市：${p.cityPrototype||"未设定"}；联系方式：${p.phone||"未设定"}`,
  `个性签名：${p.signature||"未设定"}；当前状态：${p.note||"未设定"}`,
  `外形：${p.appearance||"未设定"}；家庭背景：${p.familyBackground||"未设定"}；性格：${p.personality||"未设定"}；爱好：${p.hobbies||"未设定"}；其他 TMI：${p.tmi||"未设定"}`,
  `完整人物设定：${p.persona||"未设定"}`
].join("\n")}
