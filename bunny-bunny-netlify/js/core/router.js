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
  back.onclick = () => {
    if (name === "chat-settings" && params.conversationId) navigate("conversation", { id: params.conversationId });
    else if (name === "call" && params.id) navigate("conversation", { id: params.id });
    else if (name === "conversation") navigate("chat");
    else navigate("desktop");
  };
  settings.textContent = "⌁";
  settings.onclick = () => navigate("phone-settings");
  screen.dataset.app = name;
  view.scrollTop = 0;
  view.innerHTML = "";
  renderer(view, params);
  view.focus({ preventScroll: true });
  history.replaceState({ name, params }, "", `#${name}`);
}

export function routeTitle(name) {
  return ({ desktop: "我的小手机", chat: "聊天", conversation: "对话", call: "通话", contacts: "联系人", "chat-settings": "聊天设置", "chat-me": "我", moments: "朋友圈", "phone-settings": "手机设置", "data-settings": "数据管理", api: "模型与 API", bridge: "现实桥", mcp: "MCP 中心", together: "一起刷", focus: "陪伴专注", world: "世界与身份", forum:"论坛",delivery:"外卖",shop:"购物",flea:"二手平台",sms:"短信",phone:"电话",worldbook:"世界书",presets:"预设",games:"游戏",memos:"备忘录",calendar:"日历",wallet:"钱包" })[name] || "bunny bunny";
}
