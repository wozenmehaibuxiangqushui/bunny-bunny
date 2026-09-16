const routes = new Map();
let current = { name: "desktop", params: {} };

export function registerRoute(name, renderer) { routes.set(name, renderer); }
export function getRoute() { return current; }

export function navigate(name, params = {}, options = {}) {
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
  back.onclick = goBack;
  settings.classList.toggle("hidden", name !== "desktop");
  if (name !== "desktop") { settings.textContent = ""; settings.onclick = null; }
  screen.dataset.app = name;
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

function parentRoute(route){
  const id=route.params?.conversationId||route.params?.id;
  if(route.name==="conversation")return{name:"chat",params:{}};
  if(route.name==="call"||route.name==="chat-settings")return{name:"conversation",params:{id}};
  if(route.name==="character-edit"||route.name==="user-profile")return{name:"contacts",params:{}};
  if(route.name==="contact-manage"||route.name==="relationship-map")return{name:"contacts",params:{}};
  if(route.name==="add-friend"||route.name==="friend-requests"||route.name==="chat-me"||route.name==="moments")return{name:"chat",params:{}};
  if(route.name==="favorites")return{name:"chat-me",params:{}};
  if(route.name==="anonymous-box")return{name:"chat-me",params:{}};
  if(route.name==="anonymous-letter")return{name:"anonymous-box",params:{}};
  if(route.name==="memory-debug")return{name:"chat-settings",params:{personId:route.params?.personId,conversationId:route.params?.conversationId}};
  if(["data-settings","api","bridge","mcp","worldbook","presets"].includes(route.name))return{name:"phone-settings",params:{}};
  return{name:"desktop",params:{}};
}

export function routeTitle(name) {
  return ({ desktop: "", chat: "聊天", conversation: "对话", call: "通话", contacts: "角色档案", "contact-manage":"管理联系人", "relationship-map":"关系手账", "character-edit": "编辑档案", "user-profile": "USER 名片", "add-friend": "添加好友", "friend-requests": "消息记录", "chat-settings": "聊天设置", "chat-me": "我", favorites:"收藏", "memory-debug":"角色内心", "anonymous-box":"匿名提问箱", "anonymous-letter":"匿名来信", moments: "朋友圈", "phone-settings": "手机设置", "data-settings": "数据管理", api: "模型与 API", bridge: "现实桥", mcp: "MCP 中心", together: "一起刷", focus: "陪伴专注", world: "世界与身份", forum:"论坛",delivery:"外卖",shop:"购物",flea:"二手平台",sms:"短信",phone:"电话",worldbook:"世界书",presets:"预设",games:"游戏",memos:"备忘录",calendar:"日历",wallet:"钱包" })[name] || "bunny bunny";
}
