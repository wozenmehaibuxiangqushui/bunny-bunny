import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let calls = 0;
const context = vm.createContext({ Date, JSON, crypto: { randomUUID: () => `voice-${calls}` } });
const module = new vm.SourceTextModule(readFileSync(new URL('./inner-voice.js', import.meta.url), 'utf8'), { context });
await module.link(async () => new vm.SyntheticModule(['sendToModel'], function () {
  this.setExport('sendToModel', async () => { calls++; return '{"thought":"他看见了那句话，却想先把手边的事做完，再认真回复。"}'; });
}, { context }));
await module.evaluate();

const voice = module.namespace;
const state = {
  currentWorldId: 'world-a', currentUserId: 'user-a', currentUserAccountId: 'user-a',
  messages: { chat: [{ id: 'm1', role: 'char', text: '晚点聊', createdAt: 1 }] },
  modelProfiles: [{ id: 'model', apiKey: 'local-test-key', model: 'mock' }], activeModelProfileId: 'model'
};
const store = { getState: () => state, update(fn) { fn(state); } };
const conv = { id: 'chat' }, person = { id: 'char', name: '阿兔' };
const first = await voice.generateInnerVoice(store, conv, person);
assert.equal(calls, 1);
assert.equal((await voice.generateInnerVoice(store, conv, person)).id, first.id, 'same message uses saved aside');
state.currentUserId = 'user-b';
assert.equal(voice.savedInnerVoices(state, conv).length, 0, 'another USER cannot read this aside');
await voice.generateInnerVoice(store, conv, person);
assert.equal(calls, 2, 'another USER gets an isolated aside');
state.currentWorldId = 'world-b';
assert.equal(voice.savedInnerVoices(state, conv).length, 0, 'another world cannot read this aside');
assert.throws(() => voice.parseInnerVoice('{"reasoning":"private"}'), /心声缺少文字/);
console.log('Inner voice: explicit generation, cached anchor and account/world isolation passed.');
