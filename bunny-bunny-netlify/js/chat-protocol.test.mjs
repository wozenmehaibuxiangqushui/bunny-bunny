import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const module = new vm.SourceTextModule(readFileSync(new URL('./chat-protocol.js', import.meta.url), 'utf8'));
await module.link(() => { throw Error('Unexpected dependency'); });
await module.evaluate();
const parse = module.namespace.parseChatResponse;
const allowed = parse('{"messages":[{"text":"我到了","translation":"","tone":"开心","effect":"echo"}],"actions":[]}');
assert.equal(allowed.messages[0].effect, 'echo');
const rejected = parse('{"messages":[{"text":"我到了","translation":"","tone":"","effect":"script"}],"actions":[]}');
assert.equal(rejected.messages[0].effect, '', 'only the named visual effect is accepted');
console.log('Chat protocol: echo effect is retained and unknown effects are ignored.');
