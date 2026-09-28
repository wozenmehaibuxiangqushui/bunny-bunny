// One-time removal of shipped demo entities. Customised identities are retained.
export function removeBundledExamples(state){
  if(state.exampleCleanupVersion===1)return;
  const originals={'user-me':'林小满','char-jun':'韩叙俊','char-rin':'尹夏凛','npc-soo':'朴秀安'};
  const removed=new Set((state.people||[]).filter(p=>originals[p.id]===p.name).map(p=>p.id));
  const refersToDemo=value=>typeof value==='string'&&[...removed].some(id=>value===id||value.split(/[:/|]/).includes(id));
  const demos=new Set(['wb-seoul','wb-record','preset-natural','preset-story']);
  for(const c of state.conversations||[])if(removed.has(c.personId)||removed.has(c.userId)||removed.has(c.accountId))removed.add(c.id);
  const prune=value=>{
    if(Array.isArray(value))return value.filter(v=>!(typeof v==='string'?refersToDemo(v):v&&Object.entries(v).some(([k,x])=>(k==='id'&&demos.has(x))||(/^(id|scope|personId|authorId|ownerId|userId|accountId|userAccountId|characterId|charId|conversationId|from|to|speakerId|actorId|targetId)$/.test(k)&&refersToDemo(x))))).map(prune);
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>!refersToDemo(k)).map(([k,v])=>[k,typeof v==='string'&&refersToDemo(v)?'':prune(v)]));
    return value;
  };
  // Do not inspect free-form prompts or API settings: authored text is user data.
  for(const k of Object.keys(state))if(!['modelProfiles','apiDraft','mediaApis','voiceApis','tts'].includes(k))state[k]=prune(state[k]);
  const demoWorlds=new Set(['world-seoul','world-tokyo']);
  for(const w of state.worlds||[]){if(demoWorlds.has(w.id)&&['首尔 · 平行日常','东京支线'].includes(w.name))w.name='我的世界';}
  if(!state.people?.length){state.worlds=[];state.chatGroups=[];state.currentWorldId='';state.currentUserId='';state.activeUserAccountId='';if(removed.size){for(const key of ['worldLog','groupThreads','diaryEntries','deliveryJobs','innerVoiceRecords','moments','callRecords'])state[key]=[];for(const key of ['memoryProfiles','schedulePlans','scheduleDays','relationEdges','groupMessages'])state[key]={};for(const key of ['xSocial','tiktok','forum'])if(state[key]){const old=state[key];state[key]={settings:old.settings,avatarPool:old.avatarPool||[],mediaLibrary:old.mediaLibrary||[]};}}}
  else {state.currentUserId=state.people.find(p=>p.id===state.currentUserId&&p.type==='user')?.id||state.people.find(p=>p.type==='user')?.id||'';state.activeUserAccountId=state.currentUserId;}
  for(const g of state.chatGroups||[])if(['group-seoul','group-tokyo'].includes(g.id)&&['首尔日常','东京支线'].includes(g.name))g.name='联系人';
  state.exampleCleanupVersion=1;
}

export function renderFirstIdentity(container,{store,navigate},destination='contacts'){
  container.innerHTML=`<section class="empty-identity"><span class="empty-identity-mark">b.</span><p class="eyebrow">YOUR WORLD, FROM ZERO</p><h1>故事从你开始。</h1><p>这里没有预设人物。先建立自己的身份，再去相识簿添加角色。</p><form><label>你的称呼<input name="name" maxlength="40" required autocomplete="nickname" placeholder="想让大家如何称呼你"></label><label>世界名称<input name="world" maxlength="60" required placeholder="给这个世界起个名字"></label><button class="primary-button" type="submit">开始我的日常 ↗</button></form></section>`;
  container.querySelector('form').onsubmit=e=>{e.preventDefault();const data=new FormData(e.currentTarget),name=String(data.get('name')).trim(),world=String(data.get('world')).trim();if(!name||!world)return;
    store.update(s=>{const id=crypto.randomUUID(),wid=s.currentWorldId||crypto.randomUUID();if(!s.worlds.some(w=>w.id===wid))s.worlds.push({id:wid,name:world,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone});s.people.push({id,type:'user',name,chatName:name,initials:name.slice(0,2),worldId:wid});s.currentWorldId=wid;s.currentUserId=id;s.activeUserAccountId=id;s.accountFriends[id]=[];s.accountRelations[id]={type:'main',relatedTo:'',disclosedTo:{}};if(!s.chatGroups.length)s.chatGroups.push({id:'group-default',name:'联系人',worldId:wid,personIds:[]});});
    navigate(['conversation','call','chat-settings'].includes(destination)?'chat':destination);
  };
}
