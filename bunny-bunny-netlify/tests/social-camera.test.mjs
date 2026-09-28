import test from 'node:test';
import assert from 'node:assert/strict';
import {seedState} from '../js/core/store.js';
import {removeBundledExamples} from '../js/empty-start.js';
import {classifyActions,createActionStabilizer} from '../js/vision-actions.js';
import {forumPost,forumReply} from '../js/forum-model.js';
import {generateSocialCover} from '../js/social-media.js';
import {ensureGameDay,lineWinner} from '../js/games-hub.js';

test('daily game progress resets by world date without deleting yesterday',()=>{
 const s={currentWorldId:'w',currentUserId:'u',worlds:[{id:'w',timezone:'Asia/Shanghai'}]};
 const before=Date.parse('2026-09-28T15:59:00Z'),after=Date.parse('2026-09-28T16:01:00Z');
 ensureGameDay(s,before).today.results.push({id:'one'});
 assert.equal(ensureGameDay(s,before).today.results.length,1);
 assert.equal(ensureGameDay(s,after).today.results.length,0);
 assert.equal(Object.keys(s.gameRoom['w::u'].days).length,2);
 assert.equal(lineWinner(['user','user','user','','','','','','']),'user');
 assert.equal(lineWinner(['user','opponent','user','user','opponent','opponent','opponent','user','user']),'draw');
});

test('fresh installation contains no authored identities or conversations',()=>{
 for(const key of ['people','worlds','worldbooks','presets','moments','conversations'])assert.deepEqual(seedState[key],[]);
 assert.deepEqual(seedState.messages,{});
});
test('demo cleanup removes scoped memories and retains custom identities and API configuration',()=>{
 const state=structuredClone(seedState);state.people=[{id:'char-jun',name:'韩叙俊',type:'char'},{id:'own',name:'Own',type:'user'}];state.currentUserId='own';state.memoryProfiles={'world:user:char-jun':{coreMemory:'demo'},own:{coreMemory:'custom'}};state.modelProfiles=[{id:'model',apiKey:'test-key'}];state.innerVoiceRecords=[{scope:'world:user:char-jun',thought:'demo'}];
 removeBundledExamples(state);assert.equal(state.people.length,1);assert.equal(state.memoryProfiles.own.coreMemory,'custom');assert.equal(Object.keys(state.memoryProfiles).length,1);assert.equal(state.innerVoiceRecords.length,0);assert.equal(state.modelProfiles[0].apiKey,'test-key');
});
test('forum accepts image-only posts and replies but rejects an empty reply',()=>{
 const state=structuredClone(seedState);state.currentUserId='u';state.people=[{id:'u',type:'user'}];const images=[{url:'https://example.com/image.png'}];const post=forumPost(state,{authorId:'u',worldId:'w',images});assert.equal(post.images.length,1);assert.equal(forumReply(state,{postId:post.id,authorId:'u',images}).images.length,1);assert.throws(()=>forumReply(state,{postId:post.id,authorId:'u'}));
});
test('image channel gates prevent API calls, enabled channel persists returned image',async()=>{
 const state=structuredClone(seedState);state.mediaApis.image={enabled:true,apiKey:'test-key',model:'test',channels:{forum:true,x:false}};const store={getState:()=>state,update:f=>f(state)},rows=[{imagePrompt:'A fictional landscape'}];let count=0;const saved=globalThis.fetch;globalThis.fetch=async()=>{count++;return new Response(JSON.stringify({data:[{url:'https://example.com/generated.png'}]}),{status:200})};try{await generateSocialCover(store,'x',rows);assert.equal(count,0);await generateSocialCover(store,'forum',rows);assert.equal(count,1);assert.equal(rows[0].images[0].url,'https://example.com/generated.png')}finally{globalThis.fetch=saved}
});
test('empty landmarks do not invent gestures, repeated observations are debounced',()=>{
 assert.deepEqual(classifyActions(),[]);const smile=classifyActions({blendshapes:[{categoryName:'mouthSmileLeft',score:.9},{categoryName:'mouthSmileRight',score:.9}]});const stable=createActionStabilizer();for(let i=0;i<3;i++)assert.equal(stable(smile,50000+i*250),null);assert.ok(stable(smile,51000));assert.equal(stable(smile,52000),null);assert.equal(smile[0].experimental,false);
});
