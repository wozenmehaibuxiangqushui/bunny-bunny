import { escapeHtml, readForm, showToast, updateIsland } from "../core/ui.js";

const availableTools = [
  { id: "share_context", name: "分享当前上下文", scope: "只读 · 当前会话" },
  { id: "open_companion", name: "打开陪伴活动", scope: "导航 · 应用内" },
  { id: "create_reminder", name: "创建虚拟提醒", scope: "写入 · 需确认" },
  { id: "fetch_web_content", name: "获取网页内容", scope: "联网 · 需确认" }
];

export function createMcpRenderer({ store }) {
  return container => {
    const config = store.getState().mcp;
    container.innerHTML = `
      <div class="row between"><span class="status-chip ${config.connected ? "ready" : ""}">${config.connected ? "已连接" : "未连接"}</span><span class="pill">实验功能</span></div>
      <p class="callout">这里保存 MCP 服务配置与工具授权。密钥不写入演示数据；正式接入建议通过受控代理完成。</p>
      <form class="stack" data-mcp-form>
        <label class="field"><span>服务名称</span><input name="name" value="${escapeHtml(config.name)}" placeholder="例如：我的生活工具"></label>
        <label class="field"><span>Endpoint</span><input name="endpoint" value="${escapeHtml(config.endpoint)}" placeholder="https://example.com/mcp" inputmode="url"></label>
        <label class="field"><span>传输方式</span><select name="transport"><option ${config.transport === "HTTP / SSE" ? "selected" : ""}>HTTP / SSE</option><option ${config.transport === "Streamable HTTP" ? "selected" : ""}>Streamable HTTP</option></select></label>
        <button class="button" type="submit">${config.connected ? "重新测试连接" : "测试并保存"}</button>
      </form>
      <div class="section-title"><h3>工具权限</h3><span>最小授权</span></div>
      <section class="card tool-list">${availableTools.map((tool, index) => `<div class="tool-item"><span class="tool-code">0${index + 1}</span><div><strong>${tool.name}</strong><small>${tool.scope}</small></div><input class="switch" type="checkbox" data-tool="${tool.id}" ${config.enabledTools.includes(tool.id) ? "checked" : ""}></div>`).join("")}</section>
      <div class="section-title"><h3>执行规则</h3><span>程序校验优先</span></div>
      <section class="card"><div class="setting-row"><div><span class="label">写操作二次确认</span><small>转账、发消息、创建事件不可静默执行</small></div><input class="switch" type="checkbox" checked disabled></div><div class="setting-row"><div><span class="label">结果回写聊天</span><small>只有工具成功后角色才能声称已完成</small></div><input class="switch" type="checkbox" checked disabled></div></section>`;
    container.querySelector("[data-mcp-form]").addEventListener("submit", event => {
      event.preventDefault();
      const values = readForm(event.currentTarget);
      if (!/^https?:\/\//.test(values.endpoint)) { showToast("请输入有效的 HTTP(S) Endpoint"); return; }
      updateIsland("正在检查 MCP…", true);
      store.update(state => { state.mcp = { ...state.mcp, ...values, connected: false }; });
      setTimeout(() => {
        store.update(state => { state.mcp.connected = true; });
        updateIsland("MCP 配置已保存", true);
        showToast("演示连接已保存；正式握手需接入服务端代理");
        createMcpRenderer({ store })(container);
        setTimeout(() => updateIsland("bunny 正在陪你", false), 1500);
      }, 650);
    });
    container.querySelectorAll("[data-tool]").forEach(input => input.addEventListener("change", () => {
      store.update(state => { state.mcp.enabledTools = [...container.querySelectorAll("[data-tool]:checked")].map(item => item.dataset.tool); });
    }));
  };
}
