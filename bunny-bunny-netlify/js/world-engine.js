import { currentSchedule } from './schedule-engine.js';

export function ensureWorldEngine(state) {
  for (const group of state.chatGroups || []) if(group.worldId && !state.worlds.some(world=>world.id===group.worldId))state.worlds.push({id:group.worldId,name:group.name,timezone:'Asia/Shanghai'});
  state.worldLog ||= [];
  state.relationEdges ||= {};
  state.worldTicks ||= {};
  state.deliveryJobs ||= [];
  state.groupThreads ||= [];
  state.groupMessages ||= {};
  state.diaryEntries ||= [];
  return state;
}

export function entityWorld(state, personId) {
  const person = state.people.find(row => row.id === personId);
  return person?.worldId || state.chatGroups.find(row => row.id === person?.groupId || row.personIds?.includes(personId))?.worldId || state.currentWorldId;
}

export function relationKey(worldId, a, b) { return `${worldId}:${[a,b].sort().join('::')}`; }

export function relationEdge(state, a, b, worldId = entityWorld(state, a)) {
  ensureWorldEngine(state);
  const key = relationKey(worldId, a, b), saved = state.relationEdges[key];
  if (saved) return saved;
  const label = state.roleRelationships?.[[a,b].sort().join('::')] || state.relationshipLabels?.[a]?.[b] || '认识';
  return { key, worldId, ids:[a,b].sort(), label, affinity: label === '陌生人' ? 18 : 42, trust: 40, familiarity: 35, updatedAt:0, history:[] };
}

export function appendWorldEvent(store, event) {
  const state = ensureWorldEngine(store.getState());
  const worldId = event.worldId || entityWorld(state, event.actorIds?.[0]);
  const id = event.id || crypto.randomUUID();
  if (state.worldLog.some(row => row.id === id)) return state.worldLog.find(row => row.id === id);
  const row = { id, worldId, occurredAt:event.occurredAt || Date.now(), actorIds:[...new Set(event.actorIds || [])], witnessIds:[...new Set(event.witnessIds || [])], place:event.place || '', kind:event.kind, payload:event.payload || {}, source:event.source || 'rule', revision:1 };
  store.update(next => { ensureWorldEngine(next); if (!next.worldLog.some(item => item.id === id)) next.worldLog.push(row); if (next.worldLog.length > 1500) next.worldLog.splice(0,next.worldLog.length-1500); });
  return row;
}

export function knownWorldEvents(state, actorId, worldId = entityWorld(state, actorId), limit = 12) {
  return (state.worldLog || []).filter(row => row.worldId === worldId && (row.witnessIds?.includes(actorId) || row.payload?.public === true)).sort((a,b) => b.occurredAt - a.occurredAt).slice(0,limit);
}

export function changeRelationship(store, { a, b, worldId, deltaAffinity = 0, deltaTrust = 0, reasonEventId = '', label = '' }) {
  const state = ensureWorldEngine(store.getState());
  worldId ||= entityWorld(state,a);
  if (!a || !b || a === b || !state.people.some(row => row.id === a) || !state.people.some(row => row.id === b)) return null;
  const original = relationEdge(state,a,b,worldId), key = original.key, now = Date.now();
  if (reasonEventId && original.history.some(row => row.reasonEventId === reasonEventId)) return original;
  const clamp = (value) => Math.max(0,Math.min(100,value));
  const next = { ...original, affinity:clamp(original.affinity + Math.max(-4,Math.min(4,Number(deltaAffinity)||0))), trust:clamp(original.trust + Math.max(-4,Math.min(4,Number(deltaTrust)||0))), label:label || original.label, updatedAt:now,
    history:[...(original.history || []),{at:now,reasonEventId,deltaAffinity:Math.max(-4,Math.min(4,Number(deltaAffinity)||0)),deltaTrust:Math.max(-4,Math.min(4,Number(deltaTrust)||0))}].slice(-60) };
  store.update(nextState => { ensureWorldEngine(nextState); nextState.relationEdges[key] = next; });
  return next;
}

function hash(text) { let n = 2166136261; for (const c of text) { n ^= c.charCodeAt(0); n = Math.imul(n,16777619); } return n >>> 0; }

export function tickWorld(store, now = Date.now()) {
  const state = ensureWorldEngine(store.getState()), generated=[];
  for (const world of state.worlds) {
    const last = Number(state.worldTicks[world.id] || now - 6*3600_000), start = Math.max(last,now - 72*3600_000);
    for (let at = Math.floor(start/(6*3600_000))*6*3600_000; at < now; at += 6*3600_000) {
      const id=`ambient:${world.id}:${at}:1`;
      if ((state.worldLog || []).some(row => row.id === id)) continue;
      const actors=state.people.filter(row => ['char','npc'].includes(row.type) && entityWorld(state,row.id) === world.id);
      if (actors.length < 2) continue;
      const pick=hash(id)%actors.length, a=actors[pick], b=actors[(pick+1)%actors.length];
      if (hash(`${id}:chance`) % 3 !== 0) continue;
      const sameCity=Boolean(a.city&&b.city&&a.city===b.city),variant=hash(`${id}:variant`)%3;
      const details=sameCity?[
        `${a.name} 在${a.city}的路上碰到 ${b.name}，两人站着聊了几句各自的近况。`,
        `${a.name} 和 ${b.name} 找时间吃了顿简单的饭；临走前还在讨论下一次去哪儿。`,
        `${b.name} 把一件落下的小物件交还给 ${a.name}，两人因此多说了几句。`
      ]:[
        `${a.name} 给 ${b.name} 发了张今天随手拍的照片，${b.name} 回了一个很短的玩笑。`,
        `${b.name} 问起 ${a.name} 最近的安排，两人隔着城市聊了几句。`,
        `${a.name} 想起上次 ${b.name} 提过的一件小事，发消息确认了后续。`
      ];
      const summary=details[variant],event=appendWorldEvent(store,{ id,worldId:world.id,occurredAt:at,actorIds:[a.id,b.id],witnessIds:[a.id,b.id],kind:sameCity?'encounter':'remote-contact',payload:{public:false,summary},source:'world-tick' });
      changeRelationship(store,{a:a.id,b:b.id,worldId:world.id,deltaAffinity:1,reasonEventId:event.id});
      for(const thread of store.getState().groupThreads||[]){if(thread.archived||thread.worldId!==world.id||!thread.memberIds.includes(a.id)||!thread.memberIds.includes(b.id)||thread.mutedMemberIds?.includes(a.id)||hash(`${id}:${thread.id}:share`)%3!==0)continue;if(currentSchedule(store,a.id,new Date(at))?.canReply===false)continue;const messageId=`world-group:${thread.id}:${id}`;if(store.getState().groupMessages?.[thread.id]?.some(row=>row.id===messageId))continue;const text=sameCity?`刚刚在${a.city}碰到${b.name}了，聊了几句。`: `刚才跟${b.name}聊了一下，想起群里之前说的事。`;store.update(s=>{(s.groupMessages[thread.id]||=[]).push({id:messageId,speakerId:a.id,text,type:'text',createdAt:at,status:'sent',sourceEventId:id});const target=s.groupThreads.find(row=>row.id===thread.id);target.lastActivityAt=at;if(!target.muted)target.unread=(target.unread||0)+1});appendWorldEvent(store,{id:`group-message:${messageId}`,worldId:world.id,occurredAt:at,actorIds:[a.id],witnessIds:thread.memberIds,kind:'group-message',payload:{threadId:thread.id,text,public:false},source:'world-tick'})}
      generated.push(event);
    }
    store.update(next => { ensureWorldEngine(next); next.worldTicks[world.id] = now; });
  }
  return generated;
}

export function availableGroupSpeakers(store, thread, now = new Date()) {
  const state = store.getState(), members=thread.memberIds.filter(id => id !== thread.accountId).map(id => state.people.find(row => row.id === id)).filter(row => row && ['char','npc'].includes(row.type) && entityWorld(state,row.id) === thread.worldId);
  return members.filter(row => currentSchedule(store,row.id,now)?.canReply !== false).sort((a,b) => relationEdge(state,thread.accountId,b.id,thread.worldId).affinity - relationEdge(state,thread.accountId,a.id,thread.worldId).affinity);
}
