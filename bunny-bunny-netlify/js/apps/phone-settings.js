import { escapeHtml, showToast, setPhoneAppearance } from "../core/ui.js";

export function createPhoneSettingsRenderer({ store, navigate }) {
  return container => {
    const state = store.getState();
    const appearance = state.appearance;
    container.innerHTML = `
      <div class="section-title"><h3>外观</h3><span>仅影响手机系统</span></div>
      <section class="theme-preview-grid">
        <button class="theme-preview mono ${appearance.theme === "mono" ? "selected" : ""}" data-theme="mono"><span>MONO</span><strong>黑白简约</strong></button>
        <button class="theme-preview glass ${appearance.theme === "glass" ? "selected" : ""}" data-theme="glass"><span>LIQUID</span><strong>水玻璃</strong></button>
      </section>
      <div class="section-title"><h3>壁纸</h3><span>图片保存在本机</span></div>
      <section class="card stack">
        <div class="wallpaper-preview ${appearance.wallpaper ? "has-image" : ""}" style="background-image:url('${escapeHtml(appearance.wallpaper)}')"><span>${appearance.wallpaper ? "当前壁纸" : "默认留白壁纸"}</span></div>
        <label class="field"><span>图床链接</span><input data-wallpaper-url value="${appearance.wallpaper?.startsWith("http") ? escapeHtml(appearance.wallpaper) : ""}" placeholder="https://…"></label>
        <div class="row"><button class="button secondary" data-use-url>使用链接</button><label class="button secondary file-button">上传图片<input type="file" accept="image/*" data-wallpaper-file hidden></label><button class="button ghost" data-clear-wallpaper>清除</button></div>
      </section>
      <div class="section-title"><h3>手机系统</h3><span>不包含聊天设置</span></div>
      <section class="card">
        <div class="setting-row"><div><span class="label">沉浸全屏</span><small>隐藏网页内时间、电量和系统状态栏</small></div><input class="switch" type="checkbox" checked disabled></div>
        <div class="setting-row"><div><span class="label">模型与 API</span><small>文本、MiniMax 语音、生图接口</small></div><button class="button secondary" data-jump="api">管理</button></div>
        <div class="setting-row"><div><span class="label">现实桥</span><small>现实设备能力与授权边界</small></div><button class="button secondary" data-jump="bridge">管理</button></div>
        <div class="setting-row"><div><span class="label">MCP 中心</span><small>工具连接和执行权限</small></div><button class="button secondary" data-jump="mcp">管理</button></div>
      </section>
      <div class="section-title"><h3>恢复</h3><span>安全入口</span></div>
      <section class="card"><div class="setting-row"><div><span class="label">恢复默认外观</span><small>不会清空聊天与人物数据</small></div><button class="button secondary" data-reset-appearance>恢复</button></div></section>`;

    container.querySelectorAll("[data-theme]").forEach(button => button.addEventListener("click", () => {
      store.update(s => { s.appearance.theme = button.dataset.theme; }); setPhoneAppearance(store.getState().appearance); createPhoneSettingsRenderer({ store, navigate })(container);
    }));
    container.querySelectorAll("[data-jump]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.jump)));
    container.querySelector("[data-use-url]").addEventListener("click", () => {
      const url = container.querySelector("[data-wallpaper-url]").value.trim();
      if (!/^https?:\/\//.test(url)) return showToast("请输入有效的 HTTP(S) 图片链接");
      store.update(s => { s.appearance.wallpaper = url; }); setPhoneAppearance(store.getState().appearance); showToast("壁纸链接已应用"); createPhoneSettingsRenderer({ store, navigate })(container);
    });
    container.querySelector("[data-wallpaper-file]").addEventListener("change", event => {
      const file = event.target.files[0]; if (!file) return;
      if (file.size > 2 * 1024 * 1024) return showToast("演示版请上传 2MB 以内的图片");
      const reader = new FileReader(); reader.onload = () => { store.update(s => { s.appearance.wallpaper = reader.result; }); setPhoneAppearance(store.getState().appearance); showToast("本地壁纸已应用"); createPhoneSettingsRenderer({ store, navigate })(container); }; reader.readAsDataURL(file);
    });
    container.querySelector("[data-clear-wallpaper]").addEventListener("click", () => { store.update(s => { s.appearance.wallpaper = ""; }); setPhoneAppearance(store.getState().appearance); createPhoneSettingsRenderer({ store, navigate })(container); });
    container.querySelector("[data-reset-appearance]").addEventListener("click", () => { store.update(s => { s.appearance = { theme: "mono", wallpaperType: "gradient", wallpaper: "" }; }); setPhoneAppearance(store.getState().appearance); showToast("已恢复默认外观"); createPhoneSettingsRenderer({ store, navigate })(container); });
  };
}
