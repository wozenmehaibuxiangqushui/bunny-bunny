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
  const promptConfig=typeof systemPrompt==="object"&&systemPrompt!==null?systemPrompt:{system:systemPrompt,prefixMessages:[]};
  const systemText=String(promptConfig.system??promptConfig.systemPrompt??"");
  const prefixMessages=(Array.isArray(promptConfig.prefixMessages)?promptConfig.prefixMessages:[]).map(message=>({role:message.role==="assistant"?"assistant":"user",content:String(message.content??message.text??"")})).filter(message=>message.content.trim());
  const base = profile.baseUrl.replace(/\/$/, "");
  const recent = await Promise.all(messages.slice(-24).map(async message=>message.src&&String(message.src).startsWith("blob:")?{...message,src:await sourceToDataUrl(message.src)}:message));
  const messageText = message => {
    const special=message.type==="text-image"?`[图片中可见文字：${message.text||message.description||""}]`:message.type==="sticker"?`[表情包名称：${message.text||"表情包"}]\n[表情包辅助描述：${message.description||message.text||"无"}]`:message.type==="voice"?`[语音中说：${message.transcript||message.text||""}]`:message.text||"";
    return [`[消息ID：${message.id||"unknown"}]`,message.recalled?`[${message.role==="char"?"CHAR":"USER"} 撤回了一条消息，撤回前内容：${message.recalledText||message.text||""}]`:"",!message.recalled&&message.type&&message.type!=="text"?`[消息类型：${message.type}]`:"",!message.recalled?special:"",!message.recalled&&message.type!=="sticker"&&message.type!=="text-image"&&(message.description||""),message.reaction?`[${message.reactionBy==="char"?"CHAR":"USER"} 对这条消息做出 reaction：${message.reaction}]`:""].filter(Boolean).join("\n");
  };
  const clean = recent.map(message => ({ role: message.role === "char" ? "assistant" : "user", content: messageText(message) }));
  const claudeClean = recent.map(message => {const text=messageText(message),source=!message.recalled?imageSource(message.src):null;return{role:message.role==="char"?"assistant":"user",content:source?[{type:"text",text},{type:"image",source}]:text}});
  const googleClean = recent.map(message => {const parts=[{text:messageText(message)}],inline=!message.recalled?inlineImage(message.src):null;if(inline)parts.push({inline_data:inline});return{role:message.role==="char"?"model":"user",parts}});
  const openAiClean = recent.map(message => ({ role: message.role === "char" ? "assistant" : "user", content: message.src&&!message.recalled ? [{ type: "text", text: messageText(message) }, { type: "image_url", image_url: { url: message.src } }] : messageText(message) }));
  const conversationMessages=openAiClean.length?openAiClean:[{role:"user",content:"请根据角色设定自然开启当前聊天。"}];
  const openAiMessages = [...(systemText?[{ role: "system", content: systemText }]:[]),...prefixMessages,...conversationMessages];
  if (profile.provider === "Google") {
    const googlePrefix=prefixMessages.map(message=>({role:message.role==="assistant"?"model":"user",parts:[{text:message.content}]})),contents=normalizeGoogleMessages([...googlePrefix,...googleClean]);
    const response = await fetchWithTimeout(`${base}/models/${encodeURIComponent(profile.model)}:generateContent?key=${encodeURIComponent(profile.apiKey)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contents:contents.length?contents:[{role:"user",parts:[{text:"请自然开启聊天"}]}],system_instruction:systemText?{parts:[{text:systemText}]}:undefined }) });
    if (!response.ok) throw new Error(await responseError(response,"Google")); const data = await response.json(); return data.candidates?.[0]?.content?.parts?.map(part => part.text).join("") || "模型没有返回文字。";
  }
  if (profile.provider === "Claude") {
    const claudeMessages=normalizeClaudeMessages([...prefixMessages,...claudeClean]);
    const response = await fetchWithTimeout(`${base}/messages`, { method: "POST", headers: headers(profile), body: JSON.stringify({ model: profile.model, max_tokens: 1024, system: systemText || undefined, messages: claudeMessages.length?claudeMessages:[{role:"user",content:"请自然开启聊天"}] }) });
    if (!response.ok) throw new Error(await responseError(response,"Claude")); const data = await response.json(); return data.content?.map(part => part.text || "").join("") || "模型没有返回文字。";
  }
  const response = await fetchWithTimeout(`${base}/chat/completions`, { method: "POST", headers: headers(profile), body: JSON.stringify({ model: profile.model, messages: openAiMessages, temperature: .85 }) });
  if (!response.ok) throw new Error(await responseError(response,profile.provider||"接口")); const data = await response.json(); return data.choices?.[0]?.message?.content || "模型没有返回文字。";
}

async function fetchWithTimeout(url,options){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);try{return await fetch(url,{...options,signal:controller.signal})}catch(error){if(error.name==="AbortError")throw Error("模型请求超过 60 秒，请检查接口或稍后重试");throw error}finally{clearTimeout(timer)}}
async function responseError(response,label){let detail="";try{const data=await response.clone().json();detail=data.error?.message||data.message||data.detail||""}catch{try{detail=(await response.text()).slice(0,180)}catch{}}return`${label} 返回 ${response.status}${detail?`：${detail}`:""}`}
function inlineImage(src){const match=String(src||"").match(/^data:([^;,]+);base64,(.+)$/);return match?{mime_type:match[1],data:match[2]}:null}
function imageSource(src){const inline=inlineImage(src);if(inline)return{type:"base64",media_type:inline.mime_type,data:inline.data};return/^https?:\/\//.test(String(src||""))?{type:"url",url:src}:null}
function normalizeGoogleMessages(messages){const out=[];for(const item of messages){if(!item?.parts?.length)continue;const role=item.role==="model"?"model":"user",previous=out.at(-1);if(previous?.role===role)previous.parts.push({text:"\n"},...item.parts);else out.push({role,parts:[...item.parts]})}if(out[0]?.role==="model")out.unshift({role:"user",parts:[{text:"请先读取预设示例，再继续当前对话。"}]});return out}
function normalizeClaudeMessages(messages){const out=[];for(const item of messages){const role=item?.role==="assistant"?"assistant":"user",content=item?.content;if(content===undefined||content===null||content==="")continue;const parts=Array.isArray(content)?content:[{type:"text",text:String(content)}],previous=out.at(-1);if(previous?.role===role){previous.content=Array.isArray(previous.content)?previous.content:[{type:"text",text:String(previous.content)}];previous.content.push({type:"text",text:"\n"},...parts)}else out.push({role,content:Array.isArray(content)?[...content]:String(content)})}if(out[0]?.role==="assistant")out.unshift({role:"user",content:"请先读取预设示例，再继续当前对话。"});return out}
