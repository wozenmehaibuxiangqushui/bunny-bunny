import { escapeHtml, showToast, updateIsland, openSheet } from "../core/ui.js";
import { fetchModels, providerDefaults, testModelConnection } from "../integrations/ai-client.js";
import { ttsPanel, bindTtsPanel } from "../tts-providers.js";
import { testImageConnection } from "../image-client.js";

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
      container.querySelectorAll("[data-delete-profile]").forEach(button=>button.onclick=()=>{store.update(s=>{const id=button.dataset.deleteProfile;s.modelProfiles=s.modelProfiles.filter(x=>x.id!==id);if(s.activeModelProfileId===id){s.activeModelProfileId=s.modelProfiles[0]?.id||"";s.apiDraft={...s.apiDraft,apiKey:"",model:""}}});showToast("模型预设已删除");render(container)});
      container.querySelectorAll("[data-activate-profile]").forEach(button => button.addEventListener("click", () => { store.update(s => { s.activeModelProfileId = button.dataset.activateProfile; }); showToast("已切换模型预设"); render(container); }));
    } else if(form.dataset.kind==="image") {
      container.querySelector('[data-image-enable-all]').onclick=()=>{form.enabled.checked=true;form.querySelectorAll('[data-image-channel]').forEach(input=>input.checked=true);form.requestSubmit();showToast('所有生图场景已开启并保存')};
      container.querySelector('[data-image-disable-all]').onclick=()=>{form.querySelectorAll('[data-image-channel]').forEach(input=>input.checked=false);form.requestSubmit();showToast('所有生图场景已关闭并保存')};
      form.provider.onchange=()=>{const defaults=imageProviderDefaults(form.provider.value);form.baseUrl.value=defaults.baseUrl;form.model.innerHTML=defaults.models.map(x=>`<option>${x}</option>`).join("")};
      container.querySelector("[data-fetch-image-models]").onclick=async()=>{updateIsland("正在拉取生图模型…",true);try{const data=imageFormValues(form),models=await fetchImageModels(data);store.update(s=>{s.mediaApis.image={...s.mediaApis.image,...data,models,model:models.includes(data.model)?data.model:(models[0]||data.model)}});showToast(`已拉取 ${models.length} 个生图模型`);render(container)}catch(error){showToast(`${error.message}；也可能被浏览器跨域策略拦截`)}finally{updateIsland("bunny 正在陪你",false)}};
      container.querySelector("[data-test-image]").onclick=async()=>{const data={...imageFormValues(form),enabled:true};updateIsland("正在生成测试图…",true);try{const src=await testImageConnection(data);openSheet(`<div class="sheet-title"><div><small>IMAGE API TEST</small><h3>连接成功</h3></div><button class="button ghost" data-sheet-close>关闭</button></div><img class="image-api-test" src="${escapeHtml(src)}" alt="生图接口测试结果"><p class="callout">接口已返回真实图片。保存后，还需在具体 CHAR 的聊天设置中开启生图。</p>`)}catch(error){showToast(error.message)}finally{updateIsland("bunny 正在陪你",false)}};
      form.addEventListener("submit",event=>{event.preventDefault();const data=imageFormValues(form);store.update(s=>s.mediaApis.image={...s.mediaApis.image,...data,models:[...new Set([...(s.mediaApis.image.models||[]),data.model].filter(Boolean))]});showToast(data.enabled?"生图配置已保存并启用":"配置已保存；关闭时仍使用文字图")});
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
    <section class="stack">${state.modelProfiles.length?state.modelProfiles.map(profile=>`<button class="card row between preset-row ${state.activeModelProfileId===profile.id?"active":""}" data-activate-profile="${profile.id}"><div class="meta"><strong>${escapeHtml(profile.name)}</strong><span>${escapeHtml(profile.provider)} · ${escapeHtml(profile.model)}</span></div><span class="pill">${state.activeModelProfileId===profile.id?"使用中":"切换"}</span></button><button class="button secondary" data-delete-profile="${profile.id}">删除 ${escapeHtml(profile.name)}</button>`).join(""):'<div class="empty"><strong>还没有模型预设</strong><span>填写配置并拉取模型后保存。</span></div>'}</section>`;
}
function voicePanel(state) { return ttsPanel(state); }
function imagePanel(state) { const c=state.mediaApis.image,models=[...new Set([...(c.models||[]),c.model].filter(Boolean))];return `<p class="callout">全局负责接口与画面基调；是否为某个 CHAR 生图、参考脸和角色专属反向词在该 CHAR 的聊天设置中配置。关闭时继续使用可翻转文字图。</p><form class="stack image-api-form" data-kind="image"><div class="setting-row"><div><span class="label">开启全局生图</span><small>全局与角色开关同时开启才会请求接口</small></div><input class="switch" name="enabled" type="checkbox" ${c.enabled?"checked":""}></div><section class="image-channel-settings"><div class="image-channel-head"><strong>各场景生图</strong><div><button type="button" data-image-enable-all>一键打开</button><button type="button" data-image-disable-all>全部关闭</button></div></div><p>总开关与对应场景均开启才会发出图片请求。未接入生图流程的应用先保存选择，后续接入时自动沿用。</p><div class="image-channel-grid">${[['chat','聊天'],['moments','朋友圈'],['x','X'],['tiktok','TikTok'],['forum','论坛'],['shop','购物平台'],['sms','短信']].map(([key,label])=>`<label><span>${label}</span><input class="switch" type="checkbox" data-image-channel="${key}" ${c.channels?.[key]?'checked':''}></label>`).join('')}</div></section><label class="field"><span>接口类型</span><select name="provider"><option ${c.provider==="OpenAI Images"?"selected":""}>OpenAI Images</option><option ${c.provider==="兼容生图接口"?"selected":""}>兼容生图接口</option><option ${c.provider==="Stability AI"?"selected":""}>Stability AI</option></select></label><label class="field"><span>Base URL</span><input name="baseUrl" value="${escapeHtml(c.baseUrl||"")}" placeholder="https://api.openai.com/v1"></label><label class="field"><span>API Key</span><input name="apiKey" type="password" value="${escapeHtml(c.apiKey||"")}" autocomplete="off"></label><div class="row"><label class="field" style="flex:1"><span>生图模型</span><select name="model">${models.length?models.map(x=>`<option ${x===c.model?"selected":""}>${escapeHtml(x)}</option>`).join(""):'<option value="">请先拉取模型</option>'}</select></label><button class="button secondary" type="button" data-fetch-image-models>拉取模型</button></div><div class="row"><label class="field"><span>默认尺寸</span><select name="size"><option ${c.size==="1024x1024"?"selected":""}>1024x1024</option><option ${c.size==="1536x1024"?"selected":""}>1536x1024</option><option ${c.size==="1024x1536"?"selected":""}>1024x1536</option></select></label><label class="field"><span>质量</span><select name="quality"><option ${c.quality==="auto"?"selected":""}>auto</option><option ${c.quality==="low"?"selected":""}>low</option><option ${c.quality==="medium"?"selected":""}>medium</option><option ${c.quality==="high"?"selected":""}>high</option></select></label></div><label class="field"><span>全局正面提示词</span><textarea name="globalPositivePrompt" rows="4" placeholder="会自动放在每次角色图片提示词之前">${escapeHtml(c.globalPositivePrompt||"")}</textarea></label><label class="field"><span>全局反面提示词</span><textarea name="globalNegativePrompt" rows="4" placeholder="例如：水印、文字、畸形手指、低清晰度">${escapeHtml(c.globalNegativePrompt||"")}</textarea></label><div class="row"><button class="button secondary" type="button" data-test-image>生成测试图</button><button class="button">保存并应用</button></div></form>`; }

function imageFormValues(form){return{enabled:form.enabled.checked,channels:Object.fromEntries([...form.querySelectorAll("[data-image-channel]")].map(input=>[input.dataset.imageChannel,input.checked])),provider:form.provider.value,baseUrl:form.baseUrl.value.trim().replace(/\/$/,""),apiKey:form.apiKey.value.trim(),model:form.model.value,size:form.size.value,quality:form.quality.value,globalPositivePrompt:form.globalPositivePrompt.value.trim(),globalNegativePrompt:form.globalNegativePrompt.value.trim(),responseFormat:"b64_json"}}
function imageProviderDefaults(provider){if(provider==="Stability AI")return{baseUrl:"https://api.stability.ai",models:["stable-image-core"]};return{baseUrl:"https://api.openai.com/v1",models:provider==="OpenAI Images"?["gpt-image-1","gpt-image-1.5"]:[]}}
async function fetchImageModels(config){if(!config.apiKey)throw Error("请填写 API Key");if(config.provider==="Stability AI")return["stable-image-core","stable-image-ultra","sd3.5-large"];const response=await fetch(`${config.baseUrl.replace(/\/$/,"")}/models`,{headers:{Authorization:`Bearer ${config.apiKey}`}});if(!response.ok)throw Error(`模型接口返回 ${response.status}`);const data=await response.json(),all=(data.data||data.models||[]).map(x=>typeof x==="string"?x:x.id).filter(Boolean),image=all.filter(x=>/image|dall|flux|stable|sdxl/i.test(x));return image.length?image:all}
