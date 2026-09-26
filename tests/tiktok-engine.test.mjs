import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';

const context=vm.createContext({crypto:webcrypto,Date,Set,Map,Math,console});
const file=name=>new URL('../bunny-bunny-netlify/js/'+name,import.meta.url);
const source=name=>new vm.SourceTextModule(readFileSync(file(name),'utf8'),{context,identifier:name});
const stub=exports=>new vm.SyntheticModule(Object.keys(exports),function(){
  for(const [key,value] of Object.entries(exports))this.setExport(key,value)
},{context});
const account=source('account-system.js');await account.link(()=>{});await account.evaluate();
const fame=source('x-model.js');await fame.link(()=>account);await fame.evaluate();
const model=source('tiktok-model.js');await model.link(specifier=>({
  './account-system.js':account,'./x-model.js':fame
})[specifier]);await model.evaluate();
let promptSeen='';
const ai=stub({sendToModel:async(_profile,_messages,prompt)=>{
  promptSeen=prompt;
  if(prompt.includes('最多写 3 条'))return JSON.stringify({comments:[
    {authorId:'char',text:'封面上那道雨痕是怎么拍到的？'}],likes:['char']});
  if(prompt.includes('给 USER 的这条评论'))return JSON.stringify({text:'是在唱片店门口拍的，等了三次红灯。'});
  if(prompt.includes('私信给 USER'))return JSON.stringify({text:'我看到了，镜头里的那把伞确实是你的。'});
  if(prompt.includes('图文直播间里'))return JSON.stringify({hostLine:'门口的雨小了一点，唱机还在转。',
    audience:[{authorId:'npc',text:'刚刚是不是有人进店了？'}]});
  return JSON.stringify({newCreators:[{key:'new:1',name:'路过的摄影师',handle:'passing',bio:'雨天拍街角',occupation:'摄影师'}],
    posts:[
      {key:'p1',authorId:'char',kind:'video',assetId:'asset-video',title:'雨后唱片店',body:'',caption:'门口的水光很好看 #首尔',sound:'原声'},
      {key:'p2',authorId:'new:1',kind:'story',assetId:'',title:'错过末班车',body:'车站只剩灯',caption:'还是走回去吧 #夜晚',sound:'风声'},
      {key:'p3',authorId:'other-world',kind:'story',title:'越界内容',caption:'不应该出现'}],
    comments:[{postKey:'p1',authorId:'new:1',text:'招牌倒影刚好压在雨伞边上。'}],
    shares:[{postKey:'p1',senderId:'char',note:'你上次说的那家店，刚有人拍了。'}]});
}});
const worldbook=stub({compileWorldbook:()=>''});
const world=stub({knownWorldEvents:()=>[]});
const schedule=stub({currentSchedule:()=>({canReply:true})});
const engine=source('tiktok-engine.js');await engine.link(specifier=>({
  './integrations/ai-client.js':ai,'./apps/prompt-library.js':worldbook,
  './account-system.js':account,'./schedule-engine.js':schedule,
  './world-engine.js':world,'./tiktok-model.js':model
})[specifier]);await engine.evaluate();

const m=model.namespace,e=engine.namespace;
const state={currentWorldId:'w',activeUserAccountId:'user',currentUserId:'user',
  people:[{id:'user',type:'user',name:'我'},{id:'char',type:'char',name:'唱片店员',groupId:'g'},
    {id:'npc',type:'npc',name:'陌生人',groupId:'g'},{id:'other-world',type:'char',name:'远方',groupId:'g2'}],
  chatGroups:[{id:'g',worldId:'w',name:'首尔',personIds:['char','npc']},
    {id:'g2',worldId:'w2',name:'另一世界',personIds:['other-world']}],
  conversations:[{id:'c',personId:'char',userAccountId:'user',unread:0}],
  messages:{c:[]},worldbooks:[],accountFriends:{user:['char']},accountRelations:{},
  modelProfiles:[{id:'main',provider:'OpenAI',baseUrl:'https://example.test/v1',apiKey:'test',model:'mock'}],
  activeModelProfileId:'main'};
const store={getState:()=>state,update:fn=>fn(state)};
const t=m.ensureTikTok(state);t.groupId='g';t.settings.batchPosts=3;t.settings.batchComments=1;
t.mediaLibrary.push({id:'asset-video',kind:'video',url:'https://example.test/video.mp4',name:'街角'});
const result=await e.refreshTikTok(store);
assert.deepEqual({...result},{posts:2,comments:1,shares:1});
assert.match(promptSeen,/严格生成 3 条作品和 1 条评论/);
assert.equal(t.posts[0].media.url,'https://example.test/video.mp4');
assert.equal(t.posts.some(p=>p.authorId==='other-world'),false);
assert.equal(t.profiles[t.posts[1].authorId].kind,'network-npc');
assert.equal(t.comments[0].postId,t.posts[0].id);
assert.equal(state.messages.c[0].sourceTikTokPostId,t.posts[0].id);
assert(m.tikVisible(state,t.posts[1]));
assert.equal(m.tikRankFeed(state,'user','following').length,0);
m.tikFollow(state,'char','user');
assert.equal(m.tikRankFeed(state,'user','following').length,1);
const initialViews=t.posts[0].views;
m.tikRecordWatch(state,t.posts[0].id,'user',3);
m.tikRecordWatch(state,t.posts[0].id,'user',3);
assert.equal(t.posts[0].views,initialViews+1);
assert.equal(t.watch.user[t.posts[0].id].seconds,6);
assert.throws(()=>m.tikPost(state,{authorId:'other-world',title:'越界',caption:'另一个世界'}));
const userPost=m.tikPost(state,{authorId:'user',kind:'story',title:'雨中自拍',caption:'雨点落在镜头上'});
assert.equal((await e.respondToTikTokPost(store,userPost.id)).length,1);
assert((t.likes.char||[]).includes(userPost.id));
const comment=m.tikComment(state,{postId:t.posts[0].id,authorId:'user',text:'那把伞是不是蓝色的？'});
const reply=await e.replyToTikTokComment(store,comment.id);
assert.equal(reply.parentId,comment.id);
m.tikDm(state,{from:'user',to:'char',text:'你的新视频我看到了'});
assert.equal((await e.replyToTikTokDm(store,'char')).from,'char');
m.tikLiveMessage(state,{hostId:'char',authorId:'user',text:'现在店里放哪张唱片？'});
assert.equal(await e.generateTikTokLiveMoment(store,'char'),2);
assert.equal(t.live['g:char'].messages.length,3);
t.settings.autoMode='activity';t.settings.lastRefreshAt.g=Date.now()-20*60_000;
t.settings.activityThreshold=1;
assert.equal(e.tikAutoDue(state),true);
console.log('PASS: TikTok batch, media validation, world isolation, social actions, AI replies, live room, unique views, auto refresh');
