export function ensureAccountState(state){
  state.activeUserAccountId=state.activeUserAccountId||state.currentUserId||state.people.find(x=>x.type==="user")?.id;
  state.currentUserId=state.activeUserAccountId;
  state.accountRelations=state.accountRelations||{};
  state.accountFriends=state.accountFriends||{};
  state.relationshipLabels=state.relationshipLabels||{};
  state.roleRelationships=state.roleRelationships||{};
  const users=state.people.filter(x=>x.type==="user"),main=users.find(x=>x.id==="user-me")||users[0];
  for(const user of users){state.accountRelations[user.id]=state.accountRelations[user.id]||{type:user.id===main?.id?"main":"none",relatedTo:user.id===main?.id?"":main?.id||"",disclosedTo:{}};state.accountFriends[user.id]=state.accountFriends[user.id]||[]}
  for(const conversation of state.conversations||[]){conversation.userAccountId=conversation.userAccountId||main?.id||state.activeUserAccountId;state.accountFriends[conversation.userAccountId]=state.accountFriends[conversation.userAccountId]||[];if(!state.accountFriends[conversation.userAccountId].includes(conversation.personId))state.accountFriends[conversation.userAccountId].push(conversation.personId)}
  state.momentsSettings=state.momentsSettings||{backgrounds:{},lastAutoAt:{},lastRefreshAt:{}};state.momentsSettings.backgrounds=state.momentsSettings.backgrounds||{};state.momentsSettings.lastAutoAt=state.momentsSettings.lastAutoAt||{};state.momentsSettings.lastRefreshAt=state.momentsSettings.lastRefreshAt||{};
  return state;
}

export function accountUsers(state){ensureAccountState(state);return state.people.filter(x=>x.type==="user")}
export function activeAccount(state){ensureAccountState(state);return state.people.find(x=>x.id===state.activeUserAccountId)||accountUsers(state)[0]}
export function accountRelation(state,accountId=state.activeUserAccountId){ensureAccountState(state);return state.accountRelations[accountId]||{type:"none",relatedTo:"",disclosedTo:{}}}
export function accountFriends(state,accountId=state.activeUserAccountId){ensureAccountState(state);return state.accountFriends[accountId]||[]}
export function isFriendForAccount(state,personId,accountId=state.activeUserAccountId){return accountFriends(state,accountId).includes(personId)}
export function conversationsForAccount(state,accountId=state.activeUserAccountId){ensureAccountState(state);return(state.conversations||[]).filter(x=>x.userAccountId===accountId)}
export function switchAccount(state,accountId){ensureAccountState(state);if(!state.people.some(x=>x.id===accountId&&x.type==="user"))return false;state.activeUserAccountId=accountId;state.currentUserId=accountId;return true}
export function accountContext(state,personId,accountId=state.activeUserAccountId){
  const relation=accountRelation(state,accountId),account=state.people.find(x=>x.id===accountId),related=state.people.find(x=>x.id===relation.relatedTo),disclosed=Boolean(relation.disclosedTo?.[personId]);
  const person=state.people.find(x=>x.id===personId),worldId=person?.worldId||state.chatGroups.find(x=>x.id===person?.groupId||x.personIds?.includes(personId))?.worldId||state.currentWorldId;
  const memoryOwnerId=worldId==='world-seoul'&&accountId==='user-me'?personId:`${worldId}::${personId}::${accountId}`;
  if(relation.type==="main")return{memoryOwnerId,prompt:`当前正在聊天的是 USER 的主账号 ${account?.chatName||account?.name}。`};
  if(relation.type==="alt")return{memoryOwnerId,prompt:disclosed
    ?`当前账号 ${account?.chatName||account?.name} 已向 CHAR 说明是 ${related?.chatName||related?.name||"USER"} 的小号。可以承认身份关联；只使用本账号的对话和明确获知的事实，不自动读取另一账号的私人记忆。`
    :`当前账号 ${account?.chatName||account?.name} 在 CHAR 视角里是独立的陌生账号。不要猜测身份关联，也不要使用其他账号的经历、关系或私人记忆。`};
  return{memoryOwnerId,prompt:`当前账号 ${account?.chatName||account?.name} 与其他 USER 账号没有设定关系。把它当作独立的人，不能调用其他账号的私人经历。`};
}
export function friendWorldGroup(state,personId){const person=state.people.find(x=>x.id===personId);return person?.groupId||state.chatGroups.find(g=>(g.personIds||[]).includes(personId))?.id||"group-default"}
