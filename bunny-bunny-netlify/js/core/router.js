const routes = new Map();
let current = { name: "desktop", params: {} };

export function registerRoute(name, renderer) { routes.set(name, renderer); }
export function getRoute() { return current; }

export function navigate(name, params = {}, options = {}) {
  const owners={"user-profile":["chat-me","contacts"],"character-edit":["contacts","add-friend"],"chat-settings":["conversation","phone-settings"],api:["phone-settings","chat-settings"],worldbook:["desktop","phone-settings","chat-settings"],presets:["desktop","phone-settings","chat-settings"],wallet:["desktop","chat-me"],"memory-debug":["chat-settings"]};
  if(!options.fromBack&&!params._parent){if(name===current.name&&current.params._parent)params={...params,_parent:current.params._parent};else if(owners[name]?.includes(current.name))params={...params,_parent:{name:current.name,params:{...current.params}}}}
  const renderer = routes.get(name) || routes.get("placeholder");
  current = { name, params };
  const view = document.querySelector("#app-view");
  const screen = document.querySelector("#app-screen");
  const back = document.querySelector("#back-button");
  const settings = document.querySelector("#quick-settings");
  document.querySelector("#header-title").textContent = options.title || routeTitle(name);
  document.querySelector("#header-kicker").textContent = options.kicker || "BUNNY OS";
  back.classList.toggle("hidden", name === "desktop");
  back.textContent = "‹";
  back.setAttribute('aria-label','返回上一级');
  back.onclick = goBack;
  settings.classList.toggle("hidden", name !== "desktop");
  if (name !== "desktop") { settings.textContent = ""; settings.onclick = null; }
  screen.dataset.app = name;
  delete view.dataset.listSkin;
  view.scrollTop = 0;
  view.innerHTML = "";
  renderer(view, params);
  view.focus({ preventScroll: true });
  history.replaceState({ name, params }, "", `#${name}`);
}

export function goBack() {
  const parent = parentRoute(current);
  navigate(parent.name, parent.params, { fromBack: true });
}

export function parentRoute(route){
  if(route.params?._parent)return route.params._parent;
  const id=route.params?.conversationId||route.params?.id;
  if(route.name==="conversation")return{name:"chat",params:{}};
  if(route.name==="group-chat")return{name:"chat",params:{}};
  if(route.name==="group-call")return{name:"group-chat",params:{id:route.params?.id}};
  if(route.name==="call"||route.name==="chat-settings")return id?{name:"conversation",params:{id}}:{name:"chat",params:{}};
  if(route.name==="character-edit"||route.name==="user-profile")return{name:"contacts",params:{}};
  if(route.name==="contact-manage"||route.name==="relationship-map")return{name:"contacts",params:{}};
  if(route.name==="add-friend"||route.name==="friend-requests"||route.name==="chat-me"||route.name==="moments")return{name:"chat",params:{}};
  if(route.name==="favorites")return{name:"chat-me",params:{}};
  if(route.name==="anonymous-box")return{name:"chat-me",params:{}};
  if(route.name==="anonymous-letter")return{name:"anonymous-box",params:{}};
  if(route.name==="memory-debug")return{name:"chat-settings",params:{personId:route.params?.personId,conversationId:route.params?.conversationId}};
  if(["data-settings","api","bridge","mcp"].includes(route.name))return{name:"phone-settings",params:{}};
  return{name:"desktop",params:{}};
}

export function routeTitle(name) {
  return ({ desktop: "", chat: "兔信", conversation: "对话", call: "通话", "group-call":"群通话", contacts: "相识簿", "contact-manage":"管理联系人", "relationship-map":"关系手账", "character-edit": "编辑档案", "user-profile": "USER 名片", "add-friend": "添加好友", "friend-requests": "消息记录", "chat-settings": "聊天设置", "chat-me": "我", favorites:"收藏", "memory-debug":"角色内心", "anonymous-box":"匿名提问箱", "anonymous-letter":"匿名来信", moments: "日常圈", "phone-settings": "小兔设置", "data-settings": "数据管理", api: "模型与 API", bridge: "现实桥", mcp: "MCP 中心", focus: "番茄钟", couple:"两人岛", offline:"见面簿", world: "世界与身份", "x-social":"瞬语",tiktok:"映兔",forum:"回声广场",delivery:"暖餐",shop:"小集市",flea:"交换所",sms:"短笺",phone:"来电",worldbook:"世界录",presets:"语气册",games:"游乐屋",memos:"随手记",calendar:"日程页",wallet:"小钱包" })[name] || "bunny bunny";
}
