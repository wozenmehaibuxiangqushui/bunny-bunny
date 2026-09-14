import { escapeHtml, initialsAvatar, showToast } from "../core/ui.js";

export function createContactsRenderer({ store, navigate }) {
  return container => {
    const state = store.getState();
    const characters = state.people.filter(person => person.type === "char");
    container.innerHTML = `
      <div class="row between"><span class="pill">${escapeHtml(state.worlds[0].name)}</span><button class="button ghost" data-add>＋ 创建角色</button></div>
      <div class="section-title"><h3>CHAR</h3><span>${characters.length} 位</span></div>
      <section class="stack">${characters.map(person => `<article class="card row">${initialsAvatar(person, state.chatProfiles[person.id])}<div class="meta"><strong>${escapeHtml(person.name)}</strong><span>${escapeHtml(person.note)}</span></div><button class="button secondary" data-person="${person.id}">聊天设置</button></article>`).join("")}</section>
      <div class="section-title"><h3>身份规则</h3><span>严格隔离</span></div>
      <section class="card"><div class="setting-row"><div><span class="label">人物与账号分离</span><small>同一人物可绑定多个平台账号</small></div><span class="pill">已开启</span></div><div class="setting-row"><div><span class="label">跨世界读取</span><small>默认禁止角色读取其他世界</small></div><span class="pill">禁止</span></div></section>`;
    container.querySelectorAll("[data-person]").forEach(button => button.addEventListener("click", () => navigate("chat-settings", { personId: button.dataset.person })));
    container.querySelector("[data-add]").addEventListener("click", () => showToast("角色创建表单将在下一阶段展开"));
  };
}
