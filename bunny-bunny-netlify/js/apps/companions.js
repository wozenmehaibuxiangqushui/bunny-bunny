import { personById } from "../core/store.js";
import { escapeHtml, initialsAvatar, showToast, updateIsland } from "../core/ui.js";

export function createTogetherRenderer({ store }) {
  return container => {
    const state = store.getState();
    const person = personById(state, "char-jun");
    container.innerHTML = `<div class="segmented"><button class="active">推荐</button><button>收藏</button><button>共同列表</button></div><div class="section-title"><h3>正在一起看</h3><span>虚拟内容</span></div><section class="card shared-video"><span class="eyebrow">00:18 · DAILY CLIP</span><h3>雨天唱片店的一分钟</h3><p>以模拟视频卡运行；接入真实视频源后才会播放素材。</p><div class="row between"><span class="pill">♡ 2.8k</span><button class="button secondary" data-next>下一个</button></div></section><div class="section-title"><h3>陪伴者</h3><span>同屏上下文</span></div><section class="card row">${initialsAvatar(person, state.chatProfiles[person.id])}<div class="meta"><strong>${escapeHtml(person.name)}</strong><span>“这个角度很像你上次发我的照片。”</span></div><span class="pill">同看中</span></section>`;
    container.querySelector("[data-next]").addEventListener("click", () => { updateIsland(`${person.name} 和你切到下一条`, true); showToast("已同步切换给陪伴角色"); setTimeout(() => updateIsland("bunny 正在陪你", false), 1600); });
  };
}

export function createFocusRenderer({ store }) {
  return container => {
    const person = personById(store.getState(), "char-rin");
    container.innerHTML = `<section class="card" style="text-align:center;padding:2rem 1rem"><span class="eyebrow">FOCUS WITH ${escapeHtml(person.name)}</span><div style="font-size:4.2rem;letter-spacing:-.09em;margin:1.4rem 0">25:00</div><p style="color:var(--muted)">专注结束后，夏凛会提醒你休息。</p><button class="button" data-start>开始专注</button></section>`;
    container.querySelector("[data-start]").addEventListener("click", event => { event.currentTarget.textContent = "专注中 · 点击暂停"; updateIsland("专注 25:00", true); showToast("专注计时已开始（演示）"); });
  };
}

export function createWorldRenderer({ store }) {
  return container => {
    const state = store.getState();
    container.innerHTML = `<section class="card"><span class="eyebrow">CURRENT WORLD</span><h3 style="font-size:1.45rem;margin:.55rem 0">${escapeHtml(state.worlds[0].name)}</h3><p style="color:var(--muted);line-height:1.6">一个现实规则相近、人物记忆严格隔离的日常世界。</p><div class="row"><span class="pill">${state.people.filter(p => p.type === "user").length} USER</span><span class="pill">${state.people.filter(p => p.type === "char").length} CHAR</span></div></section><div class="section-title"><h3>当前身份</h3><span>虚拟人物</span></div><section class="card row">${initialsAvatar(state.people[0])}<div class="meta"><strong>${escapeHtml(state.people[0].name)}</strong><span>一个人物 · 一个账号 · 独立记忆边界</span></div></section>`;
  };
}
