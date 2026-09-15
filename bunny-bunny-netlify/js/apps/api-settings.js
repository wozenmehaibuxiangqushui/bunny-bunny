import { escapeHtml, showToast, updateIsland } from "../core/ui.js";
import { fetchModels, providerDefaults, testModelConnection } from "../integrations/ai-client.js";
import { ttsPanel, bindTtsPanel } from "../tts-providers.js";

const providerNames = ["OpenAI", "Google", "Claude", "DeepSeek", "Grok", "第三方中转站"];

export function createApiSettingsRenderer({ store }) {
  let section = "text";
  function render(container) {
    const state = store.getState(); const draft = state.apiDraft;
    container.innerHTML = `<div class="segmented"><button class="${section === "text" ? "active" : ""}" data-section="text">文本模型</button><button class="${section === "voice" ? "active" : ""}" data-section="voice">TTS 语音</button><button class="${section === "image" ? "active" : ""}" data-section="image">生图</button></div><div data-api-body>${section === "text" ? textPanel(state, draft) : section === "voice" ? voicePanel(state) : imagePanel(state)}</div>`;
    container.querySelectorAll("[data-section]").forEach(button => button.addEventListener("click", () => { section = button.dataset.section; render(container); }));
    bind(container);
  }

  function bind(container) {
    const form = container.querySelector("form"); if (!form) return;
    if (form.dataset.kind === "tts") { bindTtsPanel(container, store, () => render(container)); return; }
    if (form.dataset.kind === "text") {
      const provider = form.provider;
      provider.addEventListener("change", () => { const defaults = providerDefaults(provider.value); form.baseUrl.value = defaults.baseUrl; });
      container.querySelector("[data-fetch-models]").addEventListener("click", async () => {
        const values = formValues(form); updateIsland("正在拉取模型…", true);
        try { const models = await fetchModels(values); store.update(s => { s.apiDraft = { ...s.apiDraft, ...values, models, model:models.includes(values.model)?values.model:(models[0]||"") }; }); showToast(`已拉取 ${models.length} 个模型`); render(container); }
        catch (error) { showToast(`${error.message}；也可能被浏览器跨域策略拦截`); }
        finally { updateIsland("bunny 正在陪你", false); }
      });
      container.querySelector("[data-test-model]").addEventListener("click", async () => {
        const values=formValues(form);if(!values.model)return showToast("请先拉取并选择模型");updateIsland("正在测试模型连接…",true);
        try{const result=await testModelConnection(values);showToast(`连接成功：${result}`)}
        catch(error){showToast(error.message)}
        finally{updateIsland("bunny 正在陪你",false)}
      });
      form.addEventListener("submit", event => { event.preventDefault(); const values = formValues(form); if (!values.model) return showToast("请先拉取并选择模型"); const id = crypto.randomUUID(); store.update(s => { const safe = { ...values, id, models: s.apiDraft.models }; if (!form.persistKey.checked) safe.apiKey = ""; s.apiDraft = { ...s.apiDraft, ...values, apiKey: form.persistKey.checked ? values.apiKey : "" }; s.modelProfiles.push(safe); s.activeModelProfileId = id; }); showToast("模型预设已保存并启用"); render(container); });
      container.querySelectorAll("[data-activate-profile]").forEach(button => button.addEventListener("click", () => { store.update(s => { s.activeModelProfileId = button.dataset.activateProfile; }); showToast("已切换模型预设"); render(container); }));
    } else {
      form.addEventListener("submit", event => { event.preventDefault(); const data = Object.fromEntries(new FormData(form)); store.update(s => { s.mediaApis[form.dataset.kind] = { ...s.mediaApis[form.dataset.kind], ...data }; }); showToast("生图配置已保存"); });
    }
  }

  return (container, params = {}) => { if (params.section) section = params.section; render(container); };
}

function formValues(form) { return { provider: form.provider.value, name: form.profileName.value.trim(), baseUrl: form.baseUrl.value.trim().replace(/\/$/, ""), apiKey: form.apiKey.value.trim(), persistKey: form.persistKey.checked, model: form.model.value.trim() }; }
function textPanel(state, draft) {
  const models=draft.models||[];
  return `<p class="callout">先拉取模型，再从下拉框选择并测试连接；模型名称不再手动填写。密钥默认只保存在当前浏览器。</p>
    <form class="stack" data-kind="text">
      <label class="field"><span>厂商</span><select name="provider">${providerNames.map(name=>`<option ${draft.provider===name?"selected":""}>${name}</option>`).join("")}</select></label>
      <label class="field"><span>预设名称</span><input name="profileName" value="${escapeHtml(draft.name)}"></label>
      <label class="field"><span>Base URL</span><input name="baseUrl" value="${escapeHtml(draft.baseUrl)}"></label>
      <label class="field"><span>API Key</span><input name="apiKey" type="password" value="${escapeHtml(draft.apiKey)}" autocomplete="off"></label>
      <div class="setting-row"><div><span class="label">在本机保存密钥</span><small>关闭后预设不会保存 Key</small></div><input class="switch" name="persistKey" type="checkbox" ${draft.persistKey?"checked":""}></div>
      <div class="row"><label class="field" style="flex:1"><span>模型</span><select name="model"><option value="">${models.length?"请选择模型":"请先拉取模型"}</option>${models.map(model=>`<option value="${escapeHtml(model)}" ${draft.model===model?"selected":""}>${escapeHtml(model)}</option>`).join("")}</select></label><button class="button secondary" type="button" data-fetch-models>拉取模型</button></div>
      <div class="row"><button class="button secondary" type="button" data-test-model>测试连接</button><button class="button">保存为预设并启用</button></div>
    </form>
    <div class="section-title"><h3>已保存预设</h3><span>${state.modelProfiles.length} 个</span></div>
    <section class="stack">${state.modelProfiles.length?state.modelProfiles.map(profile=>`<button class="card row between preset-row ${state.activeModelProfileId===profile.id?"active":""}" data-activate-profile="${profile.id}"><div class="meta"><strong>${escapeHtml(profile.name)}</strong><span>${escapeHtml(profile.provider)} · ${escapeHtml(profile.model)}</span></div><span class="pill">${state.activeModelProfileId===profile.id?"使用中":"切换"}</span></button>`).join(""):'<div class="empty"><strong>还没有模型预设</strong><span>填写配置并拉取模型后保存。</span></div>'}</section>`;
}
function voicePanel(state) { return ttsPanel(state); }
function imagePanel(state) { const c = state.mediaApis.image; return `<p class="callout">支持 OpenAI Images 与兼容中转站。参数是否可用以供应商能力为准。</p><form class="stack" data-kind="image"><label class="field"><span>供应方式</span><select name="provider"><option ${c.provider === "OpenAI Images" ? "selected" : ""}>OpenAI Images</option><option>兼容生图接口</option><option>NovelAI</option></select></label><label class="field"><span>Base URL</span><input name="baseUrl" value="${escapeHtml(c.baseUrl)}"></label><label class="field"><span>API Key</span><input name="apiKey" type="password" value="${escapeHtml(c.apiKey)}"></label><label class="field"><span>模型</span><input name="model" value="${escapeHtml(c.model)}"></label><label class="field"><span>默认尺寸</span><select name="size"><option ${c.size === "1024x1024" ? "selected" : ""}>1024x1024</option><option>1536x1024</option><option>1024x1536</option></select></label><button class="button">保存生图配置</button></form>`; }
