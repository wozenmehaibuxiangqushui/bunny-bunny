export function registerBunnyTools({ store, navigate }) {
  const context = document.modelContext;
  if (!context?.registerTool) return false;
  const tools = [
    {
      name: "navigate_bunny_app", title: "打开 Bunny 应用", description: "在 bunny bunny 虚拟手机中打开指定应用。",
      inputSchema: { type: "object", properties: { app: { type: "string", enum: ["desktop", "chat", "contacts", "together", "bridge", "mcp", "phone-settings", "api"] } }, required: ["app"], additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) { navigate(input.app); return { app: input.app, opened: true }; }
    },
    {
      name: "send_bunny_message", title: "发送 Bunny 消息", description: "向已存在的 bunny bunny 会话发送一条虚拟消息。",
      inputSchema: { type: "object", properties: { conversationId: { type: "string", enum: ["conv-jun", "conv-rin"] }, text: { type: "string", minLength: 1, maxLength: 2000 } }, required: ["conversationId", "text"], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute(input) {
        if (!store.getState().messages[input.conversationId] || typeof input.text !== "string" || !input.text.trim()) throw new Error("Invalid conversation or message");
        store.update(state => state.messages[input.conversationId].push({ id: crypto.randomUUID(), role: "user", text: input.text.trim(), time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }) }));
        navigate("conversation", { id: input.conversationId });
        return { conversationId: input.conversationId, sent: true };
      }
    }
  ];
  tools.forEach(tool => { try { void Promise.resolve(context.registerTool(tool)).catch(console.error); } catch (error) { console.error(error); } });
  return true;
}
