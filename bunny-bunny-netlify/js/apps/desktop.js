import { personById } from "../core/store.js";
import { escapeHtml, openSheet, closeSheet, showToast } from "../core/ui.js";

export const appRegistry = {
  chat: ["聊天", "◌", "chat"], contacts: ["联系人", "人", "contacts"], moments: ["朋友圈", "◎", "moments"],
  forum: ["论坛", "文", "forum"], delivery: ["外卖", "食", "delivery"], shop: ["购物", "购", "shop"], flea: ["二手", "换", "flea"],
  sms: ["短信", "信", "sms"], phone: ["电话", "话", "phone"], worldbook: ["世界书", "世", "worldbook"], presets: ["预设", "预", "presets"],
  games: ["游戏", "玩", "games"], memos: ["备忘录", "记", "memos"], calendar: ["日历", "日", "calendar"], wallet: ["钱包", "¥", "wallet"],
  focus: ["陪伴专注", "25", "focus"], together: ["一起刷", "▷", "together"], api: ["模型与 API", "AI", "api"], bridge: ["现实桥", "⌁", "bridge"],
  mcp: ["MCP", "M", "mcp"], "phone-settings": ["手机设置", "＋", "phone-settings"]
};

const widgetCatalog = [
  { type: "date", title: "日期", content: "今天也要慢慢生活", size: "small", style: { background: "#ffffff", color: "#111111" } },
  { type: "weather", title: "天气", content: "首尔 · 小雨 17°C", size: "small", style: { background: "#dfe5e8", color: "#111111" } },
  { type: "memo", title: "便签", content: "周末去拿唱片", size: "wide", style: { background: "#f1eee7", color: "#111111" } },
  { type: "character", title: "CHAR STATUS", content: "现在正在唱片店。", size: "wide", style: { background: "#111111", color: "#ffffff" } }
];

export function createDesktopRenderer({ store, navigate }) {
  let editMode = false;
  let touchDragId = null;

  function render(container) {
    const state = store.getState();
    const jun = personById(state, "char-jun");
    const today = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "short" }).format(new Date());
    configureHeader(container);
    container.innerHTML = `
      <section class="desktop-greeting"><div><div class="date">${new Date().getDate().toString().padStart(2, "0")}</div><p>${today} · ${escapeHtml(state.worlds[0].name)}</p></div><div class="page-dots">● ○ ○</div></section>
      <section class="desktop-widgets">${state.desktopWidgets.map(widget => widgetCard(widget, jun)).join("")}</section>
      <section class="app-grid ${editMode ? "editing" : ""}" aria-label="应用">${state.desktopOrder.map(id => appTile(id)).join("")}</section>
      ${editMode ? '<p class="edit-tip">按住图标拖动排版 · 点击右上角完成保存</p>' : '<p class="desktop-hint">长按任意应用图标管理主屏幕</p>'}`;
    bindTiles(container);
  }

  function configureHeader(container) {
    const left = document.querySelector("#back-button");
    const right = document.querySelector("#quick-settings");
    if (editMode) {
      left.classList.remove("hidden"); left.textContent = "+"; left.setAttribute("aria-label", "添加小组件");
      right.textContent = "✓"; right.setAttribute("aria-label", "完成主屏幕编辑");
      left.onclick = () => openWidgetManager(container);
      right.onclick = () => { editMode = false; showToast("主屏幕布局已保存"); render(container); };
    } else {
      left.classList.add("hidden"); left.textContent = "‹"; left.onclick = null;
      right.textContent = "⌁"; right.setAttribute("aria-label", "打开手机设置"); right.onclick = () => navigate("phone-settings");
    }
  }

  function appTile(id) {
    const app = appRegistry[id];
    if (!app) return "";
    return `<button class="app-tile" data-app-id="${id}" data-route="${app[2]}" draggable="${editMode}" aria-label="${editMode ? "拖动" : "打开"}${app[0]}">${editMode ? '<span class="delete-badge">−</span>' : ""}<span class="app-icon">${app[1]}</span><span>${app[0]}</span></button>`;
  }

  function widgetCard(widget, person) {
    const content = widget.type === "date" ? new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric" }).format(new Date()) : widget.content;
    return `<article class="home-widget ${widget.size}" data-widget-id="${escapeHtml(widget.id)}" style="--widget-bg:${escapeHtml(widget.style?.background || "#fff")};--widget-color:${escapeHtml(widget.style?.color || "#111")}"><span>${escapeHtml(widget.title)}</span><strong>${escapeHtml(content)}</strong>${widget.type === "character" ? `<small>${escapeHtml(person.note)}</small>` : ""}${editMode ? '<button class="widget-remove" aria-label="移除小组件">−</button>' : ""}</article>`;
  }

  function bindTiles(container) {
    container.querySelectorAll(".app-tile").forEach(tile => {
      let timer;
      tile.addEventListener("pointerdown", event => {
        if (editMode) { touchDragId = tile.dataset.appId; tile.setPointerCapture?.(event.pointerId); tile.classList.add("dragging"); return; }
        timer = setTimeout(() => { editMode = true; navigator.vibrate?.(20); render(container); }, 520);
      });
      tile.addEventListener("pointerup", () => {
        clearTimeout(timer);
        if (editMode && touchDragId) { tile.classList.remove("dragging"); touchDragId = null; return; }
        if (!editMode) navigate(tile.dataset.route);
      });
      tile.addEventListener("pointercancel", () => clearTimeout(timer));
      tile.addEventListener("pointermove", event => {
        if (!editMode || !touchDragId) return;
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".app-tile");
        if (target && target.dataset.appId !== touchDragId) reorder(touchDragId, target.dataset.appId, container);
      });
      tile.addEventListener("dragstart", event => event.dataTransfer.setData("text/plain", tile.dataset.appId));
      tile.addEventListener("dragover", event => event.preventDefault());
      tile.addEventListener("drop", event => { event.preventDefault(); reorder(event.dataTransfer.getData("text/plain"), tile.dataset.appId, container); });
    });
    container.querySelectorAll(".widget-remove").forEach(button => button.addEventListener("click", event => {
      event.stopPropagation(); const id = button.closest("[data-widget-id]").dataset.widgetId;
      store.update(state => { state.desktopWidgets = state.desktopWidgets.filter(widget => widget.id !== id); }); render(container);
    }));
    if (editMode) container.querySelectorAll(".home-widget").forEach(widget => widget.addEventListener("click", event => { if (!event.target.closest(".widget-remove")) openCustomWidget(container, widget.dataset.widgetId); }));
  }

  function reorder(fromId, toId, container) {
    if (!fromId || fromId === toId) return;
    store.update(state => { const items = [...state.desktopOrder]; const from = items.indexOf(fromId); const to = items.indexOf(toId); if (from < 0 || to < 0) return; items.splice(to, 0, items.splice(from, 1)[0]); state.desktopOrder = items; });
    render(container);
  }

  function openWidgetManager(container) {
    openSheet(`<div class="sheet-handle"></div><div class="sheet-title"><h3>添加小组件</h3><button class="button ghost" data-sheet-close>关闭</button></div><div class="widget-picker">${widgetCatalog.map((widget, index) => `<button class="widget-option" data-widget-index="${index}"><span>${widget.title}</span><strong>${widget.content}</strong></button>`).join("")}</div><div class="section-title"><h3>自定义</h3><span>bunny.widget.v1</span></div><div class="row"><button class="button secondary" data-custom>创建小组件</button><label class="button secondary file-button">导入 JSON<input type="file" accept="application/json,.json" data-widget-json hidden></label><button class="button ghost" data-template>下载格式</button></div>`, { onReady(sheet) {
      sheet.querySelectorAll("[data-widget-index]").forEach(button => button.addEventListener("click", () => { addWidget(widgetCatalog[Number(button.dataset.widgetIndex)]); closeSheet(); render(container); }));
      sheet.querySelector("[data-custom]").addEventListener("click", () => openCustomWidget(container));
      sheet.querySelector("[data-template]").addEventListener("click", downloadWidgetTemplate);
      sheet.querySelector("[data-widget-json]").addEventListener("change", event => importWidgets(event.target.files[0], container));
    }});
  }

  function addWidget(widget) { store.update(state => state.desktopWidgets.push({ ...widget, id: `widget-${Date.now()}-${Math.random().toString(16).slice(2)}` })); }

  function openCustomWidget(container, widgetId = "") {
    const existing = store.getState().desktopWidgets.find(widget => widget.id === widgetId);
    openSheet(`<div class="sheet-handle"></div><div class="sheet-title"><h3>${existing ? "编辑" : "创建"}小组件</h3><button class="button ghost" data-sheet-close>取消</button></div><form class="stack" data-custom-widget><label class="field"><span>标题</span><input name="title" required maxlength="24" value="${escapeHtml(existing?.title || "我的小组件")}"></label><label class="field"><span>内容</span><textarea name="content" required maxlength="120">${escapeHtml(existing?.content || "写一点想放在桌面的话")}</textarea></label><label class="field"><span>尺寸</span><select name="size"><option value="small" ${existing?.size === "small" ? "selected" : ""}>小号</option><option value="wide" ${existing?.size === "wide" ? "selected" : ""}>横向</option></select></label><div class="row"><label class="field"><span>背景</span><input name="background" type="color" value="${escapeHtml(existing?.style?.background || "#111111")}"></label><label class="field"><span>文字</span><input name="color" type="color" value="${escapeHtml(existing?.style?.color || "#ffffff")}"></label></div><button class="button">${existing ? "保存修改" : "添加到主屏幕"}</button></form>`, { onReady(sheet) { sheet.querySelector("form").addEventListener("submit", event => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); const next = { type: existing?.type || "custom", title: data.title, content: data.content, size: data.size, style: { background: data.background, color: data.color } }; if (existing) store.update(state => Object.assign(state.desktopWidgets.find(widget => widget.id === widgetId), next)); else addWidget(next); closeSheet(); render(container); }); }});
  }

  function importWidgets(file, container) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { const data = JSON.parse(reader.result); if (data.schema !== "bunny.widget.v1" || !Array.isArray(data.widgets)) throw new Error(); data.widgets.forEach(widget => { if (!widget.title || !["small", "wide"].includes(widget.size)) throw new Error(); addWidget({ type: widget.type || "custom", title: String(widget.title).slice(0, 24), content: String(widget.content || "").slice(0, 120), size: widget.size, style: { background: widget.style?.background || "#fff", color: widget.style?.color || "#111" }, binding: widget.binding || null }); }); closeSheet(); render(container); showToast(`已导入 ${data.widgets.length} 个小组件`); } catch { showToast("JSON 格式不符合 bunny.widget.v1"); } };
    reader.readAsText(file);
  }

  function downloadWidgetTemplate() {
    const data = { schema: "bunny.widget.v1", widgets: [{ type: "custom", size: "wide", title: "我的小组件", content: "显示在主屏幕上的内容", style: { background: "#111111", color: "#ffffff" }, binding: null }] };
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })); link.download = "bunny-widget-template.json"; link.click(); URL.revokeObjectURL(link.href);
  }

  return render;
}
