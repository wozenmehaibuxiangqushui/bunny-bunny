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

export async function sendToModel(profile, messages) {
  if (!profile?.apiKey || !profile.model) throw new Error("请先在“模型与 API”中选择一个可用预设");
  const base = profile.baseUrl.replace(/\/$/, "");
  const clean = messages.slice(-24).map(message => ({ role: message.role === "char" ? "assistant" : "user", content: message.text }));
  if (profile.provider === "Google") {
    const response = await fetch(`${base}/models/${encodeURIComponent(profile.model)}:generateContent?key=${encodeURIComponent(profile.apiKey)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contents: clean.map(message => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] })) }) });
    if (!response.ok) throw new Error(`Google 返回 ${response.status}`); const data = await response.json(); return data.candidates?.[0]?.content?.parts?.map(part => part.text).join("") || "模型没有返回文字。";
  }
  if (profile.provider === "Claude") {
    const response = await fetch(`${base}/messages`, { method: "POST", headers: headers(profile), body: JSON.stringify({ model: profile.model, max_tokens: 1024, messages: clean }) });
    if (!response.ok) throw new Error(`Claude 返回 ${response.status}`); const data = await response.json(); return data.content?.map(part => part.text || "").join("") || "模型没有返回文字。";
  }
  const response = await fetch(`${base}/chat/completions`, { method: "POST", headers: headers(profile), body: JSON.stringify({ model: profile.model, messages: clean, temperature: .85 }) });
  if (!response.ok) throw new Error(`接口返回 ${response.status}`); const data = await response.json(); return data.choices?.[0]?.message?.content || "模型没有返回文字。";
}
