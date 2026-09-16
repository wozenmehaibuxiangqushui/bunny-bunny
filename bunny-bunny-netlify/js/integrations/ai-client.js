const providers = {
  OpenAI: { baseUrl: "https://api.openai.com/v1", modelsPath: "/models", kind: "openai" },
  Google: { baseUrl: "https://generativelanguage.googleapis.com/v1beta", modelsPath: "/models", kind: "google" },
  Claude: { baseUrl: "https://api.anthropic.com/v1", modelsPath: "/models", kind: "claude" },
  DeepSeek: { baseUrl: "https://api.deepseek.com/v1", modelsPath: "/models", kind: "openai" },
  Grok: { baseUrl: "https://api.x.ai/v1", modelsPath: "/models", kind: "openai" },
  "第三方中转站": { baseUrl: "", modelsPath: "/models", kind: "openai" }
};

export function providerDefaults(name) { return providers[name] || providers["第三方中转站"]; }

function headers(profile) {
  if (profile.provider === "Claude") return { "x-api-key": profile.apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" };
  return { Authorization: `Bearer ${profile.apiKey}`, "content-type": "application/json" };
}

export async function fetchModels(profile) {
  if (!profile.apiKey) throw new Error("请先填写 API Key");
  const config = providerDefaults(profile.provider);
  const base = profile.baseUrl.replace(/\/$/, "");
  const url = profile.provider === "Google" ? `${base}${config.modelsPath}?key=${encodeURIComponent(profile.apiKey)}` : `${base}${config.modelsPath}`;
  const response = await fetch(url, { headers: profile.provider === "Google" ? {} : headers(profile) });
  if (!response.ok) throw new Error(`拉取失败（HTTP ${response.status}）`);
  const data = await response.json();
  const items = data.data || data.models || [];
  return items.map(item => item.id || item.name?.replace(/^models\//, "")).filter(Boolean).sort();
}

export async function testModelConnection(profile) {
  const started=performance.now();
  const reply=await sendToModel(profile,[{role:"user",text:"只回复 OK"}],"这是 API 连通性测试。只回复 OK，不要补充其他内容。");
  const elapsed=Math.max(1,Math.round(performance.now()-started));
  if(!String(reply||"").trim())throw Error("接口已响应，但没有返回文字");
  return `${elapsed}ms · ${String(reply).trim().slice(0,18)}`;
}

import { sourceToDataUrl } from "../media-store.js";

export async function sendToModel(profile, messages, systemPrompt = "") {
  if (!profile?.apiKey || !profile.model) throw new Error("请先在“模型与 API”中选择一个可用预设");
  const base = profile.baseUrl.replace(/\/$/, "");
  const recent = await Promise.all(messages.slice(-24).map(async message=>message.src&&String(message.src).startsWith("blob:")?{...message,src:await sourceToDataUrl(message.src)}:message));
  const messageText = message => [`[消息ID：${message.id||"unknown"}]`,message.recalled?`[${message.role==="char"?"CHAR":"USER"} 撤回了一条消息，撤回前内容：${message.recalledText||message.text||""}]`:"",!message.recalled&&message.type&&message.type!=="text"?`[消息类型：${message.type}]`:"",!message.recalled&&message.type==="text-image"?`[这是一张文字图片，图片中可见文字：${message.text||message.description||""}]`:!message.recalled&&message.type==="voice"?`[语音中说：${message.transcript||message.text||""}]`:!message.recalled&&(message.text||""),!message.recalled&&(message.description||""),message.reaction?`[${message.reactionBy==="char"?"CHAR":"USER"} 对这条消息做出 reaction：${message.reaction}]`:""].filter(Boolean).join("\n");
  const clean = recent.map(message => ({ role: message.role === "char" ? "assistant" : "user", content: messageText(message) }));
  const claudeClean = recent.map(message => {const text=messageText(message),source=!message.recalled?imageSource(message.src):null;return{role:message.role==="char"?"assistant":"user",content:source?[{type:"text",text},{type:"image",source}]:text}});
  const googleClean = recent.map((message,index) => {const parts=[{text:index===0&&systemPrompt?`${systemPrompt}\n\n${messageText(message)}`:messageText(message)}],inline=!message.recalled?inlineImage(message.src):null;if(inline)parts.push({inline_data:inline});return{role:message.role==="char"?"model":"user",parts}});
  const openAiClean = recent.map(message => ({ role: message.role === "char" ? "assistant" : "user", content: message.src&&!message.recalled ? [{ type: "text", text: messageText(message) }, { type: "image_url", image_url: { url: message.src } }] : messageText(message) }));
  const conversationMessages=openAiClean.length?openAiClean:[{role:"user",content:"请根据角色设定自然开启当前聊天。"}];
  const openAiMessages = systemPrompt ? [{ role: "system", content: systemPrompt }, ...conversationMessages] : conversationMessages;
  if (profile.provider === "Google") {
    const response = await fetchWithTimeout(`${base}/models/${encodeURIComponent(profile.model)}:generateContent?key=${encodeURIComponent(profile.apiKey)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contents: googleClean.length?googleClean:[{role:"user",parts:[{text:systemPrompt||"请自然开启聊天"}]}] }) });
    if (!response.ok) throw new Error(await responseError(response,"Google")); const data = await response.json(); return data.candidates?.[0]?.content?.parts?.map(part => part.text).join("") || "模型没有返回文字。";
  }
  if (profile.provider === "Claude") {
    const response = await fetchWithTimeout(`${base}/messages`, { method: "POST", headers: headers(profile), body: JSON.stringify({ model: profile.model, max_tokens: 1024, system: systemPrompt || undefined, messages: claudeClean.length?claudeClean:[{role:"user",content:"请自然开启聊天"}] }) });
    if (!response.ok) throw new Error(await responseError(response,"Claude")); const data = await response.json(); return data.content?.map(part => part.text || "").join("") || "模型没有返回文字。";
  }
  const response = await fetchWithTimeout(`${base}/chat/completions`, { method: "POST", headers: headers(profile), body: JSON.stringify({ model: profile.model, messages: openAiMessages, temperature: .85 }) });
  if (!response.ok) throw new Error(await responseError(response,profile.provider||"接口")); const data = await response.json(); return data.choices?.[0]?.message?.content || "模型没有返回文字。";
}

async function fetchWithTimeout(url,options){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);try{return await fetch(url,{...options,signal:controller.signal})}catch(error){if(error.name==="AbortError")throw Error("模型请求超过 60 秒，请检查接口或稍后重试");throw error}finally{clearTimeout(timer)}}
async function responseError(response,label){let detail="";try{const data=await response.clone().json();detail=data.error?.message||data.message||data.detail||""}catch{try{detail=(await response.text()).slice(0,180)}catch{}}return`${label} 返回 ${response.status}${detail?`：${detail}`:""}`}
function inlineImage(src){const match=String(src||"").match(/^data:([^;,]+);base64,(.+)$/);return match?{mime_type:match[1],data:match[2]}:null}
function imageSource(src){const inline=inlineImage(src);if(inline)return{type:"base64",media_type:inline.mime_type,data:inline.data};return/^https?:\/\//.test(String(src||""))?{type:"url",url:src}:null}
