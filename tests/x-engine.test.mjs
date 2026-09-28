import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';

const context=vm.createContext({crypto:webcrypto,Date,Set,Map,Math,console});
const file=name=>new URL('../bunny-bunny-netlify/js/'+name,import.meta.url);
const source=name=>new vm.SourceTextModule(readFileSync(file(name),'utf8'),{context,identifier:name});
const account=source('account-system.js');
await account.link(()=>{});await account.evaluate();
const model=source('x-model.js');
await model.link(()=>account);await model.evaluate();
const stub=exports=>new vm.SyntheticModule(Object.keys(exports),function(){for(const [key,value] of Object.entries(exports))this.setExport(key,value)},{context});
const ai=stub({sendToModel:async()=>JSON.stringify({
  newAccounts:[{key:'new:1',name:'路人甲',handle:'passerby',bio:'路过',occupation:'摄影师'}],
  posts:[{key:'p1',authorId:'char',text:'今天在唱片店找到了遗失的蓝色封套 #唱片'},
    {key:'p2',authorId:'new:1',text:'地铁末班车上有人抱着一盆薄荷，香气很突然'}],
  comments:[{postKey:'p1',authorId:'new:1',text:'蓝色封套那张是上周摆在门口的吗？'}],
  shares:[{postKey:'p1',senderId:'char',note:'你上回找的那张唱片，今天看到了。'}]
})});
const worldbook=stub({compileWorldbook:()=>''});
const world=stub({knownWorldEvents:()=>[]});
const schedule=stub({currentSchedule:()=>({canReply:true})});
const engine=source('x-engine.js');
await engine.link(specifier=>({
  './integrations/ai-client.js':ai,'./apps/prompt-library.js':worldbook,
  './account-system.js':account,'./x-model.js':model,'./world-engine.js':world,
  './schedule-engine.js':schedule
})[specifier]);await engine.evaluate();
const x=model.namespace,e=engine.namespace;
const state={currentWorldId:'w',activeUserAccountId:'user',currentUserId:'user',
  people:[{id:'user',type:'user',name:'我'},{id:'char',type:'char',name:'店员',groupId:'g',occupation:'唱片店店员'},
    {id:'npc',type:'npc',name:'陌生人',groupId:'g'}],
  chatGroups:[{id:'g',worldId:'w',name:'日常',personIds:['char','npc']}],
  conversations:[{id:'c',personId:'char',userAccountId:'user',unread:0}],
  messages:{c:[]},worldbooks:[],worldLog:[],accountFriends:{user:['char']},
  accountRelations:{},modelProfiles:[{id:'main',provider:'OpenAI',baseUrl:'https://example.test/v1',apiKey:'test',model:'mock'}],
  activeModelProfileId:'main'};
const store={getState:()=>state,update:fn=>fn(state)};
x.ensureX(state);state.xSocial.groupId='g';state.xSocial.settings.batchPosts=2;state.xSocial.settings.batchComments=1;
const result=await e.refreshXFeed(store);
assert.deepEqual({...result},{posts:2,comments:1,shares:1});
assert.equal(state.messages.c.length,1);
assert.equal(state.messages.c[0].sourceXPostId,state.xSocial.posts[0].id);
assert.equal(state.xSocial.posts[2].parentId,state.xSocial.posts[0].id);
assert.equal(state.xSocial.profiles[state.xSocial.posts[1].authorId].kind,'network-npc');
assert(x.xVisible(state,state.xSocial.posts[1]));
assert.equal(x.inferXFame({occupation:'明星'}).tier,'celebrity');
assert.equal(x.inferXFame({occupation:'网红'}).tier,'creator');
state.xSocial.settings.autoMode='activity';state.xSocial.settings.lastRefreshAt.g=Date.now()-20*60_000;
state.xSocial.settings.activityThreshold=1;
x.xPost(state,{authorId:'user',text:'今天下雨了'});
assert.equal(e.xAutoDue(state),true);
console.log('PASS: X batch generation, NPC avatar identity, conversation share, nested comments, fame, activity trigger');
