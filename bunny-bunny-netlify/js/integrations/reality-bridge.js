import { showToast, updateIsland } from "../core/ui.js";

const labels = { camera: "摄像头", microphone: "麦克风", screen: "屏幕共享", location: "位置", notifications: "通知" };

async function requestCapability(capability) {
  if (capability === "camera") {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(track => track.stop());
  } else if (capability === "microphone") {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
  } else if (capability === "screen") {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    stream.getTracks().forEach(track => track.stop());
  } else if (capability === "location") {
    await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 }));
  } else if (capability === "notifications") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("notification-denied");
  }
}

export function createBridgeRenderer({ store }) {
  return container => {
    const bridge = store.getState().bridge;
    container.innerHTML = `
      <p class="callout">现实桥只在你点击授权时调用浏览器能力。角色不会自动读取相册、通讯录或其他应用。</p>
      <div class="section-title"><h3>可授权能力</h3><span>逐项开启</span></div>
      <section class="permission-grid">${Object.entries(labels).map(([key, label]) => `<button class="permission-card ${bridge[key] ? "granted" : ""}" data-capability="${key}"><strong>${label}</strong><span>${bridge[key] ? "已获本次授权" : "点击请求授权"}</span></button>`).join("")}</section>
      <div class="section-title"><h3>陪伴边界</h3><span>始终可撤销</span></div>
      <section class="card">
        <div class="setting-row"><div><label for="companion-mode">一起使用手机</label><small>允许共享你主动选择的网页或屏幕</small></div><input class="switch" id="companion-mode" type="checkbox" ${bridge.companionMode ? "checked" : ""}></div>
        <div class="setting-row"><div><span class="label">真实通讯录</span><small>不读取、不上传、不向角色暴露</small></div><span class="pill">禁用</span></div>
        <div class="setting-row"><div><span class="label">会话结束</span><small>立即停止媒体流并清空临时上下文</small></div><button class="button secondary" data-stop>停止全部</button></div>
      </section>`;
    container.querySelectorAll("[data-capability]").forEach(button => button.addEventListener("click", async () => {
      const key = button.dataset.capability;
      updateIsland(`正在请求${labels[key]}…`, true);
      try {
        await requestCapability(key);
        store.update(state => { state.bridge[key] = true; });
        showToast(`${labels[key]}已授权`);
      } catch (error) {
        showToast(`${labels[key]}未授权或设备不支持`);
      } finally {
        updateIsland("bunny 正在陪你", false);
        createBridgeRenderer({ store })(container);
      }
    }));
    container.querySelector("#companion-mode").addEventListener("change", event => store.update(state => { state.bridge.companionMode = event.target.checked; }));
    container.querySelector("[data-stop]").addEventListener("click", () => {
      store.update(state => Object.keys(labels).forEach(key => { state.bridge[key] = false; }));
      showToast("现实桥临时授权已在应用内清空");
      createBridgeRenderer({ store })(container);
    });
  };
}
