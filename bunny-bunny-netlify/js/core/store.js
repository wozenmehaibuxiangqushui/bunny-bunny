const STORAGE_KEY = "bunny-bunny:m0";

export const seedState = {
  currentWorldId: "world-seoul",
  currentUserId: "user-me",
  activeUserAccountId: "user-me",
  worlds: [{ id: "world-seoul", name: "首尔 · 平行日常", timezone: "Asia/Seoul" }],
  people: [
    { id: "user-me", type: "user", name: "林小满", chatName: "manni", initials: "ME", height: "165cm", phone: "", location: "上海", note: "慢热，喜欢旧电影与雨天", signature: "今天也要把日常过得轻一点。", appearance: "", familyBackground: "", personality: "慢热、细腻，熟悉后会有很多小话", tmi: "喜欢旧电影、雨天和深夜便利店", city: "上海", cityPrototype: "Shanghai", accounts: [{ id: "acc-main", name: "manni", primary: true }] },
    { id: "char-jun", type: "char", name: "韩叙俊", initials: "HJ", age: "24", occupation: "唱片店店员", personality: "沉静克制，熟悉后偶尔毒舌，聊天喜欢短句", note: "在唱片店整理新到的黑胶", signature: "雨停之前，都算借来的时间。", city: "首尔", cityPrototype: "Seoul", groupId: "group-seoul", online: true },
    { id: "char-rin", type: "char", name: "尹夏凛", initials: "YR", note: "刚下课，晚点回复", signature: "今天也要把话留一半。", city: "釜山", cityPrototype: "Busan", groupId: "group-seoul", online: false },
    { id: "npc-soo", type: "npc", name: "朴秀安", initials: "PS", boundCharId: "char-jun", persona: "韩叙俊和 USER 的共同好友，外向爽快，很会观察气氛，会自然推动两人的关系。", note: "你和叙俊的共同好友", signature: "周末只接收好消息。", city: "东京", cityPrototype: "Tokyo", groupId: "group-tokyo", online: true }
  ],
  conversations: [
    { id: "conv-jun", personId: "char-jun", unread: 2, preview: "等你忙完，我们一起看那个视频。", time: "21:08" },
    { id: "conv-rin", personId: "char-rin", unread: 0, preview: "照片收到了，光很好看。", time: "18:42" }
  ],
  messages: {
    "conv-jun": [
      { id: "m1", role: "char", text: "店里今天放了你上次提到的那张专辑。", time: "20:54" },
      { id: "m2", role: "user", text: "真的？给我留到周末。", time: "20:57" },
      { id: "m3", role: "char", text: "已经放在柜台下面了。等你忙完，我们一起看那个视频。", time: "21:08" }
    ],
    "conv-rin": [
      { id: "m4", role: "user", text: "今天的天空像旧电影。", time: "18:40" },
      { id: "m5", role: "char", text: "照片收到了，光很好看。", time: "18:42" }
    ]
  },
  chatProfiles: {
    "char-jun": {
      avatarUrl: "", remark: "叙俊", voiceProvider: "浏览器语音", voiceName: "默认男声", voiceSpeed: 1,
      autoPlayVoice: false, voiceId: "voice_kr_01", llmTone: true, language: "自动", emotion: "自动", visionEnabled: true, stickerSteal: true, stickerPack: "日常 · 黑白", replyStyle: "自然短句",
      memoryDepth: 24, proactive: true, proactiveCall: false, quietHours: "23:00—08:00", timeAwarenessEnabled: true, manualDate: "", manualTime: ""
      , relationship: "暧昧中的朋友", userCity: "上海", charCity: "首尔", cityPrototype: "现实首尔", weather: "小雨 · 17°C", longDistance: true,
      autoAvatar: true, memoryMode: "分层长期记忆", imageProfile: "电影感写实", videoPortrait: "静态立绘 + 口型", worldbook: "首尔日常", chainOfThought: "仅保存文学化心声", preset: "自然聊天 v1", patText: "你拍了拍叙俊的唱片袋", patUserText: "叙俊拍了拍你的肩", voiceCallMode: "实时 ASR + TTS", stickerScope: "角色独立 + 通用库"
    },
    "char-rin": {
      avatarUrl: "", remark: "夏凛", voiceProvider: "浏览器语音", voiceName: "默认女声", voiceSpeed: 1,
      autoPlayVoice: false, voiceId: "voice_kr_02", llmTone: false, language: "自动", emotion: "自动", visionEnabled: true, stickerSteal: false, stickerPack: "轻松日常", replyStyle: "克制留白",
      memoryDepth: 16, proactive: true, quietHours: "23:00—08:00", timeAwarenessEnabled: true, manualDate: "", manualTime: ""
      , relationship: "多年好友", userCity: "上海", charCity: "釜山", cityPrototype: "现实釜山", weather: "晴 · 20°C", longDistance: true,
      autoAvatar: false, memoryMode: "分层长期记忆", imageProfile: "清透胶片", videoPortrait: "静态立绘", worldbook: "首尔日常", chainOfThought: "关闭", preset: "克制短句", patText: "你拍了拍夏凛的肩", patUserText: "夏凛拍了拍你的肩", voiceCallMode: "按键说话", stickerScope: "角色独立"
    }
  },
  mcp: { name: "", endpoint: "", transport: "HTTP / SSE", connected: false, enabledTools: ["share_context", "open_companion"] },
  bridge: { camera: false, microphone: false, screen: false, location: false, notifications: false, companionMode: true },
  appearance: { theme: "mono", wallpaperType: "gradient", wallpaper: "", appName: "bunny bunny", appIcon: "", bunnyIcon: "classic", deviceProfile: "iphone-pro" },
  desktopFolders: [],
  chatGroups: [
    { id: "group-default", name: "默认", worldId: "world-seoul", personIds: [] },
    { id: "group-seoul", name: "首尔日常", worldId: "world-seoul", personIds: ["char-jun", "char-rin"] },
    { id: "group-tokyo", name: "东京支线", worldId: "world-tokyo", personIds: ["npc-soo"] }
  ],
  friendRequests: [],
  accountRelations: { "user-me": { type: "main", relatedTo: "", disclosedTo: {} } },
  accountFriends: { "user-me": ["char-jun", "char-rin"] },
  relationshipLabels: {},
  roleRelationships: {},
  blockedPersonIds: [],
  worldbooks: [
    { id: "wb-seoul", name: "首尔日常", prompt: "故事发生在当代首尔。角色共享同一时间线与公共事件。", enabled: true },
    { id: "wb-record", name: "唱片店资料", prompt: "唱片店位于延南洞，营业时间 11:00—22:00。", enabled: true }
  ],
  presets: [
    { id: "preset-natural", name: "自然聊天", prompt: "保持自然、简洁、有生活感的对话。" },
    { id: "preset-story", name: "沉浸叙事", prompt: "使用细腻但克制的沉浸式表达。" }
  ],
  chatAppearance: { interfaceCss: "", interfacePresets: [], bubblePreset: "imessage", bubbleCss: "", bubbleColor: "#111111", bubbleScale: 1, fontSize: 14, fontUrl: "", fontPresets: [], background: "", backgroundHistory: [], hideUserAvatar: false, recentReactions: ["❤️","👍","👎","😂","‼️","❓"] },
  dataSettings: { autoBackup: false, cloudType: "", cloudEndpoint: "", lastBackup: "", imageQuality: 0.78, estimatedBytes: 0, storageWarning: "", lastPersistedAt: "" },
  desktopOrder: ["chat", "contacts", "moments", "phone", "sms", "calendar", "memos", "worldbook", "presets", "wallet", "focus", "together", "forum", "delivery", "shop", "flea", "games", "x-social", "tiktok", "phone-settings"],
  desktopLayout: [],
  desktopLayoutInitialized: false,
  desktopWidgetDesignVersion: 2,
  appCustomizations: {},
  desktopWidgets: [
    { id: "widget-weather-default", type: "weather", design: "ios", size: "2x2", title: "首尔天气", content: "首尔 · 微雨 17°C", style: { background: "#53677a", color: "#ffffff" } },
    { id: "widget-calendar-default", type: "calendar-widget", design: "ios", size: "2x2", title: "日历", content: "今天无日程", style: { background: "#ffffff", color: "#111111" } }
  ],
  modelProfiles: [],
  activeModelProfileId: "",
  apiDraft: { provider: "OpenAI", name: "OpenAI 默认", baseUrl: "https://api.openai.com/v1", apiKey: "", persistKey: true, model: "", models: [] },
  mediaApis: {
    minimax: { baseUrl: "https://api.minimax.io/v1", apiKey: "", groupId: "", model: "speech-02-hd", voiceId: "" },
    image: { enabled: false, provider: "OpenAI Images", baseUrl: "https://api.openai.com/v1", apiKey: "", model: "gpt-image-1", size: "1024x1024", globalPositivePrompt: "", globalNegativePrompt: "", responseFormat: "b64_json", quality: "auto" }
  },
  momentsSettings: { backgrounds: {}, lastAutoAt: {}, lastRefreshAt: {} },
  moments: [
    { id: "p1", personId: "char-jun", text: "闭店前最后一张唱片。窗外刚好开始下雨。", time: "20分钟前", likes: ["尹夏凛", "朴秀安"], comments: [{ name: "朴秀安", text: "又在等某个人吧。" }] },
    { id: "p2", personId: "npc-soo", text: "周末空出来了，谁负责想吃什么？", time: "1小时前", likes: ["韩叙俊"], comments: [{ name: "尹夏凛", text: "先排除上次那家。" }] }
  ],
  wallet: { balance: 2480, currency: "CNY", ledger: [] },
  voiceApis: {
    stt: { provider: "browser", baseUrl: "https://api.groq.com/openai/v1", apiKey: "", model: "whisper-large-v3-turbo", language: "zh" },
    tts: { provider: "browser", baseUrl: "https://api.groq.com/openai/v1", apiKey: "", model: "canopylabs/orpheus-v1-english", voice: "hannah", speed: 1 }
  },
  tts: { activeProvider: "browser", llmProsody: true, providers: {} },
  callPrompts: {},
  callRuntime: { lastProactiveAt: {}, pendingReplies: {}, proactiveWindows: {} },
  stickerLibraries: { global: [], user: [], characters: { "char-jun": [], "char-rin": [] } },
  favorites: [],
  callRecords: [],
  memoryProfiles: {},
  anonymousQuestions: [],
  anonymousBoxConfig: { proactive: true, lastGeneratedAt: 0 }
};

function deepCopy(value) { return JSON.parse(JSON.stringify(value)); }

function mergeState(base, saved) {
  if (!saved || !saved.worlds || !saved.people) return base;
  return {
    ...base, ...saved,
    appearance: { ...base.appearance, ...(saved.appearance || {}) },
    appCustomizations: { ...base.appCustomizations, ...(saved.appCustomizations || {}) },
    chatAppearance: { ...base.chatAppearance, ...(saved.chatAppearance || {}) },
    dataSettings: { ...base.dataSettings, ...(saved.dataSettings || {}) },
    wallet: { ...base.wallet, ...(saved.wallet || {}), ledger: saved.wallet?.ledger || base.wallet.ledger },
    voiceApis: { stt: { ...base.voiceApis.stt, ...(saved.voiceApis?.stt || {}) }, tts: { ...base.voiceApis.tts, ...(saved.voiceApis?.tts || {}) } },
    tts: { ...base.tts, ...(saved.tts || {}), providers: { ...base.tts.providers, ...(saved.tts?.providers || {}) } },
    callPrompts: { ...base.callPrompts, ...(saved.callPrompts || {}) },
    callRuntime: { ...base.callRuntime, ...(saved.callRuntime || {}), lastProactiveAt: { ...base.callRuntime.lastProactiveAt, ...(saved.callRuntime?.lastProactiveAt || {}) }, pendingReplies: { ...base.callRuntime.pendingReplies, ...(saved.callRuntime?.pendingReplies || {}) }, proactiveWindows: { ...base.callRuntime.proactiveWindows, ...(saved.callRuntime?.proactiveWindows || {}) } },
    accountRelations: { ...base.accountRelations, ...(saved.accountRelations||{}) },
    accountFriends: { ...base.accountFriends, ...(saved.accountFriends||{}) },
    relationshipLabels: { ...base.relationshipLabels, ...(saved.relationshipLabels||{}) },
    roleRelationships: { ...base.roleRelationships, ...(saved.roleRelationships||{}) },
    momentsSettings: { ...base.momentsSettings, ...(saved.momentsSettings||{}), backgrounds:{...base.momentsSettings.backgrounds,...(saved.momentsSettings?.backgrounds||{})}, lastAutoAt:{...base.momentsSettings.lastAutoAt,...(saved.momentsSettings?.lastAutoAt||{})}, lastRefreshAt:{...base.momentsSettings.lastRefreshAt,...(saved.momentsSettings?.lastRefreshAt||{})} },
    memoryProfiles: { ...(base.memoryProfiles||{}), ...(saved.memoryProfiles||{}) },
    anonymousQuestions: saved.anonymousQuestions || base.anonymousQuestions,
    anonymousBoxConfig: { ...base.anonymousBoxConfig, ...(saved.anonymousBoxConfig||{}) },
    stickerLibraries: { global: saved.stickerLibraries?.global || base.stickerLibraries.global, user: saved.stickerLibraries?.user || base.stickerLibraries.user, characters: { ...base.stickerLibraries.characters, ...(saved.stickerLibraries?.characters || {}) } },
    mediaApis: { minimax: { ...base.mediaApis.minimax, ...(saved.mediaApis?.minimax || {}) }, image: { ...base.mediaApis.image, ...(saved.mediaApis?.image || {}) } },
    chatProfiles: Object.fromEntries([...new Set([...Object.keys(base.chatProfiles), ...Object.keys(saved.chatProfiles || {})])].map(id => [id, { ...(base.chatProfiles[id] || {}), ...(saved.chatProfiles?.[id] || {}) }]))
  };
}

export function createStore() {
  let state = deepCopy(seedState);
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    state = mergeState(state, saved);
  } catch (error) { console.warn("Bunny state recovery failed", error); }

  const listeners = new Set();
  let saveTimer=0,idleHandle=0;
  const notify=()=>listeners.forEach(listener=>listener(state));
  const persist=()=>{
    saveTimer=0;idleHandle=0;
    try{
      const serialized=JSON.stringify(state,function(key,value){if((key==="src"&&this?.mediaId)||(key==="audioUrl"&&this?.audioMediaId)||(key==="videoBackground"&&this?.videoBackgroundMediaId)||(key==="userVideoPortrait"&&this?.userVideoPortraitMediaId)||(key==="imageReferenceFace"&&this?.imageReferenceFaceMediaId)){if(typeof value==="string"&&value.startsWith("blob:"))return""}return value});
      state.dataSettings.estimatedBytes=new Blob([serialized]).size;
      localStorage.setItem(STORAGE_KEY,serialized);
      state.dataSettings.storageWarning="";
      state.dataSettings.lastPersistedAt=new Date().toISOString();
    }catch(error){
      state.dataSettings.storageWarning="本机存储空间不足。新操作仍可继续，请尽快在数据管理中压缩图片或导出备份。";
      console.warn("Bunny persistence paused",error);
    }
  };
  const scheduleSave=()=>{clearTimeout(saveTimer);if(idleHandle&&globalThis.cancelIdleCallback)cancelIdleCallback(idleHandle);saveTimer=setTimeout(()=>{saveTimer=0;if(globalThis.requestIdleCallback)idleHandle=requestIdleCallback(persist,{timeout:700});else persist()},100)};
  const flush=()=>{clearTimeout(saveTimer);if(idleHandle&&globalThis.cancelIdleCallback)cancelIdleCallback(idleHandle);persist()};
  if(globalThis.addEventListener){addEventListener("pagehide",flush);addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")flush()})}
  return {
    getState: () => state,
    update(mutator) { mutator(state); notify(); scheduleSave(); },
    reset() { state = deepCopy(seedState); notify(); flush(); },
    flush,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
  };
}

export function personById(state, id) { return state.people.find(person => person.id === id); }
export function conversationById(state, id) { return state.conversations.find(item => item.id === id); }
