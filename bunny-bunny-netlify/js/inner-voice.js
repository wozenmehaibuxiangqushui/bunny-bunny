import { sendToModel } from './integrations/ai-client.js';

export function innerVoiceScope(state, conversation) {
  const person=state.people?.find(row=>row.id===conversation.personId),worldId=conversation.worldId||person?.worldId||state.chatGroups?.find(row=>row.id===person?.groupId||row.personIds?.includes(person?.id))?.worldId||state.currentWorldId||'default';
  return `${worldId}:${state.currentUserId || state.activeUserAccountId || 'default'}:${conversation.id}`;
}

export function savedInnerVoices(state, conversation) {
  if (conversation.userAccountId && conversation.userAccountId !== (state.currentUserId || state.activeUserAccountId)) return [];
  const scope = innerVoiceScope(state, conversation);
  return (state.innerVoiceRecords || []).filter(row => row.scope === scope).sort((a, b) => b.createdAt - a.createdAt);
}

export function innerVoiceActivityDue(state, conversation, now = Date.now()) {
  if (conversation.userAccountId && conversation.userAccountId !== (state.currentUserId || state.activeUserAccountId)) return false;
  const messages = state.messages[conversation.id] || [], turns = messages.filter(row => row.role === 'user' && !row.recalled).length;
  if (turns < 6 || !messages.some(row => row.role === 'char' && !row.recalled)) return false;
  const last = savedInnerVoices(state, conversation)[0];
  if (last && (turns - Number(last.turnCount || 0) < 9 || now - last.createdAt < 20 * 60_000)) return false;
  const topic = topicTokens(messages);
  if (last?.topicTokens?.length && turns - Number(last.turnCount || 0) < 24) {
    const overlap = topic.filter(token => last.topicTokens.includes(token)).length;
    if (overlap / Math.max(1, Math.min(topic.length, last.topicTokens.length)) > .55) return false;
  }
  return true;
}

function topicTokens(messages) {
  const text = messages.filter(row => row.role === 'user' && !row.recalled).slice(-4).map(row => row.text || '').join('').replace(/\s+/g, '');
  const counts = new Map();
  for (let i = 0; i < text.length - 1; i++) {
    const token = text.slice(i, i + 2);
    if (/^[\u3400-\u9fff]{2}$/.test(token)) counts.set(token, (counts.get(token) || 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 16).map(row => row[0]);
}

// A fictional aside is authored content. Never request or display model reasoning.
export function parseInnerVoice(raw) {
  const match = String(raw || '').match(/\{[\s\S]*\}/);
  if (!match) throw Error('心声格式不正确，请重试');
  let data;
  try { data = JSON.parse(match[0]); } catch { throw Error('心声格式不正确，请重试'); }
  if (typeof data.thought !== 'string') throw Error('心声缺少文字，请重试');
  const thought = Array.from(data.thought.trim().replace(/\s+/g, ' ')).slice(0, 140).join('');
  if (thought.length < 4) throw Error('心声内容太短，请重试');
  return thought;
}

export async function generateInnerVoice(store, conversation, person, options = {}) {
  const state = store.getState();
  if (conversation.userAccountId && conversation.userAccountId !== (state.currentUserId || state.activeUserAccountId)) throw Error('请切换到这段聊天所属的账号');
  const scope = innerVoiceScope(state, conversation);
  const recent = (state.messages[conversation.id] || []).filter(row => !row.recalled && row.role !== 'system').slice(-8);
  const anchor = [...recent].reverse().find(row => row.role === 'char');
  if (!anchor) throw Error('等 CHAR 发出第一条消息后再看心声');
  const cached = savedInnerVoices(state, conversation).find(row => row.anchorMessageId === anchor.id);
  if (cached) return cached;
  const model = state.modelProfiles.find(row => row.id === state.activeModelProfileId);
  if (!model?.apiKey || !model?.model) throw Error('请先在「模型与 API」配置文本模型');
  const snapshot = {
    person: { name: person.name, personality: person.personality || '', occupation: person.occupation || '', note: person.note || '' },
    messages: recent.map(row => ({ role: row.role, text: String(row.text || row.description || '').slice(0, 260) }))
  };
  const system = '你写的是虚构人物此刻没发出的私人念头，不是模型推理。用第一人称，25—90 个汉字；抓住刚刚聊天里一个具体词、动作或没说完的小事，让它带出当下的欲望、顾虑或一点口是心非。允许琐碎、偏心、没想明白和突然走神；句式随人物性格变化。不要总结关系、讲道理、堆抒情意象或写成心理分析；不要用“其实我一直”“不知为何”“心里泛起”“或许这就是”“原来如此”等套路开头。USER 没表达过的心思不能替其认定；未发生的事不要写成事实。只返回 JSON：{"thought":"心声"}。';
  const raw = await sendToModel(model, [{ role: 'user', text: JSON.stringify(snapshot) }], system);
  const thought = parseInnerVoice(raw);
  const record = { id: crypto.randomUUID(), scope, anchorMessageId: anchor.id, personId: person.id, thought, createdAt: Date.now(), turnCount: recent.length ? (state.messages[conversation.id] || []).filter(row => row.role === 'user' && !row.recalled).length : 0, topicTokens: topicTokens(state.messages[conversation.id] || []), activity: Boolean(options.activity), seenAt: options.activity ? 0 : Date.now() };
  store.update(next => {
    next.innerVoiceRecords = [record, ...(next.innerVoiceRecords || []).filter(row => !(row.scope === scope && row.anchorMessageId === anchor.id))].slice(0, 80);
  });
  return record;
}
