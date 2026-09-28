import { removeBundledExamples } from "../empty-start.js";
const STORAGE_KEY = "bunny-bunny:m0";
export const seedState = {
  "currentWorldId": "",
  "currentUserId": "",
  "activeUserAccountId": "",
  "worlds": [],
  "people": [],
  "conversations": [],
  "messages": {},
  "chatProfiles": {},
  "mcp": {
    "name": "",
    "endpoint": "",
    "transport": "HTTP / SSE",
    "connected": false,
    "enabledTools": [
      "share_context",
      "open_companion"
    ]
  },
  "bridge": {
    "camera": false,
    "microphone": false,
    "screen": false,
    "location": false,
    "notifications": false,
    "companionMode": true
  },
  "appearance": {
    "theme": "mono",
    "wallpaperType": "gradient",
    "wallpaper": "",
    "appName": "bunny bunny",
    "appIcon": "",
    "bunnyIcon": "classic",
    "deviceProfile": "iphone-pro"
  },
  "desktopFolders": [],
  "chatGroups": [],
  "friendRequests": [],
  "accountRelations": {},
  "accountFriends": {},
  "relationshipLabels": {},
  "roleRelationships": {},
  "blockedPersonIds": [],
  "worldbooks": [],
  "presets": [],
  "chatAppearance": {
    "interfaceCss": "",
    "interfacePresets": [],
    "bubblePreset": "imessage",
    "bubbleCss": "",
    "bubbleColor": "#111111",
    "bubbleScale": 1,
    "bubbleRadius": 0,
    "fontSize": 14,
    "fontUrl": "",
    "fontPresets": [],
    "background": "",
    "backgroundHistory": [],
    "hideUserAvatar": false,
    "recentReactions": [
      "❤️",
      "👍",
      "👎",
      "😂",
      "‼️",
      "❓"
    ]
  },
  "dataSettings": {
    "autoBackup": false,
    "cloudType": "",
    "cloudEndpoint": "",
    "lastBackup": "",
    "imageQuality": 0.78,
    "estimatedBytes": 0,
    "storageWarning": "",
    "lastPersistedAt": ""
  },
  "desktopOrder": [
    "chat",
    "contacts",
    "moments",
    "phone",
    "sms",
    "calendar",
    "memos",
    "worldbook",
    "presets",
    "wallet",
    "focus",
    "couple",
    "offline",
    "forum",
    "delivery",
    "shop",
    "flea",
    "games",
    "x-social",
    "tiktok",
    "phone-settings"
  ],
  "desktopLayout": [],
  "desktopLayoutInitialized": false,
  "desktopWidgetDesignVersion": 3,
  "appCustomizations": {},
  "desktopWidgets": [],
  "modelProfiles": [],
  "activeModelProfileId": "",
  "apiDraft": {
    "provider": "OpenAI",
    "name": "OpenAI 默认",
    "baseUrl": "https://api.openai.com/v1",
    "apiKey": "",
    "persistKey": true,
    "model": "",
    "models": []
  },
  "mediaApis": {
    "minimax": {
      "baseUrl": "https://api.minimax.io/v1",
      "apiKey": "",
      "groupId": "",
      "model": "speech-02-hd",
      "voiceId": ""
    },
    "image": {
      "enabled": false,
      "channels": {
        "chat": true,
        "moments": false,
        "x": false,
        "tiktok": false,
        "forum": false,
        "shop": false,
        "sms": false
      },
      "provider": "OpenAI Images",
      "baseUrl": "https://api.openai.com/v1",
      "apiKey": "",
      "model": "gpt-image-1",
      "size": "1024x1024",
      "globalPositivePrompt": "",
      "globalNegativePrompt": "",
      "responseFormat": "b64_json",
      "quality": "auto"
    }
  },
  "schedulePlans": {},
  "scheduleDays": {},
  "worldLog": [],
  "relationEdges": {},
  "worldTicks": {},
  "deliveryJobs": [],
  "groupThreads": [],
  "groupMessages": {},
  "diaryEntries": [],
  "momentsSettings": {
    "backgrounds": {},
    "lastAutoAt": {},
    "lastRefreshAt": {}
  },
  "moments": [],
  "wallet": {
    "balance": 0,
    "currency": "CNY",
    "ledger": []
  },
  "voiceApis": {
    "stt": {
      "provider": "browser",
      "baseUrl": "https://api.groq.com/openai/v1",
      "apiKey": "",
      "model": "whisper-large-v3-turbo",
      "language": "zh"
    },
    "tts": {
      "provider": "browser",
      "baseUrl": "https://api.groq.com/openai/v1",
      "apiKey": "",
      "model": "canopylabs/orpheus-v1-english",
      "voice": "hannah",
      "speed": 1
    }
  },
  "tts": {
    "activeProvider": "browser",
    "llmProsody": true,
    "providers": {}
  },
  "callPrompts": {},
  "callRuntime": {
    "lastProactiveAt": {},
    "pendingReplies": {},
    "proactiveWindows": {}
  },
  "stickerLibraries": {
    "global": [],
    "user": [],
    "characters": {}
  },
  "favorites": [],
  "callRecords": [],
  "memoryProfiles": {},
  "anonymousQuestions": [],
  "anonymousBoxConfig": {
    "proactive": true,
    "lastGeneratedAt": 0
  }
};
function deepCopy(value) { return JSON.parse(JSON.stringify(value)); }

function mergeState(base, saved) {
  if (!saved || !saved.worlds || !saved.people) return base;
  return {
    ...base, ...saved,
    appearance: { ...base.appearance, ...(saved.appearance || {}) },
    schedulePlans: { ...base.schedulePlans, ...(saved.schedulePlans||{}) },
    scheduleDays: { ...base.scheduleDays, ...(saved.scheduleDays||{}) },
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
    mediaApis: { minimax: { ...base.mediaApis.minimax, ...(saved.mediaApis?.minimax || {}) }, image: { ...base.mediaApis.image, ...(saved.mediaApis?.image || {}), channels:{...base.mediaApis.image.channels,...saved.mediaApis?.image?.channels} } },
    chatProfiles: Object.fromEntries([...new Set([...Object.keys(base.chatProfiles), ...Object.keys(saved.chatProfiles || {})])].map(id => [id, { ...(base.chatProfiles[id] || {}), ...(saved.chatProfiles?.[id] || {}) }]))
  };
}

export function createStore() {
  let state = deepCopy(seedState);
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    state = mergeState(state, saved);
    removeBundledExamples(state);
  } catch (error) { console.warn("Bunny state recovery failed", error); }

  const listeners = new Set();
  let saveTimer=0,idleHandle=0;
  const notify=()=>listeners.forEach(listener=>listener(state));
  const persist=()=>{
    saveTimer=0;idleHandle=0;
    try{
      const serialized=JSON.stringify(state,function(key,value){if((key==="src"&&this?.mediaId)||(key==="image"&&this?.imageMediaId)||(key==="audioUrl"&&this?.audioMediaId)||(key==="videoBackground"&&this?.videoBackgroundMediaId)||(key==="userVideoPortrait"&&this?.userVideoPortraitMediaId)||(key==="imageReferenceFace"&&this?.imageReferenceFaceMediaId)){if(typeof value==="string"&&value.startsWith("blob:"))return""}return value});
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
