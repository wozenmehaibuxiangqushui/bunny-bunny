import { entityWorld } from './world-engine.js';

const STARTER_GROUPS=[
  ['slow','慢一点生活','日常','散步、天气、便利店里的小发现','今天路上遇见了什么？','◒'],
  ['screen','银幕之后','书影音','电影、音乐、书和舍不得删的片段','最近反复看的片段','▣'],
  ['create','手作宇宙','创作','画画、做饭、照片与半成品','晒一个还没做完的东西','✳'],
  ['heart','关系练习室','心事','友情、恋爱与那些说不清的小事','一句没说出口的话','♡'],
  ['game','游戏夜航','游戏','游戏、角色、小岛与约人一起玩','今晚想一起玩什么？','◇'],
  ['city','街角情报局','附近','本地小店、活动、地点与偶遇','分享一家想再去的小店','⌁']
];
export function ensureForum(state){
  state.forum ||= {posts:[],replies:[],drafts:{},lastRefreshAt:{},settings:{batchPosts:4,batchReplies:8}};
  const db=state.forum;db.posts ||= [];db.replies ||= [];db.drafts ||= {};db.lastRefreshAt ||= {};
  db.settings ||= {batchPosts:4,batchReplies:8};db.groups ||= [];db.memberships ||= {};return db;
}
export function forumAlias(id,worldId){const names=['晚风','纸船','薄荷','星期三','白噪音','路灯','蓝莓','某个路人','小行星','雨伞'];const hash=[...`${id}:${worldId}`].reduce((h,ch)=>((h*33)^ch.charCodeAt(0))>>>0,5381);return `${names[hash%names.length]}${String(hash%997).padStart(3,'0')}`}
export function forumActors(state,worldId){return state.people.filter(p=>p.type==='char'||p.type==='npc').filter(p=>entityWorld(state,p.id)===worldId)}
export function forumGroups(state,worldId){const db=ensureForum(state);if(!worldId)return[];for(const [suffix,name,category,description,prompt,symbol] of STARTER_GROUPS){const id=`forum-${worldId}-${suffix}`;if(!db.groups.some(g=>g.id===id))db.groups.push({id,worldId,name,category,description,prompt,symbol,createdAt:0,ownerId:'',starter:true})}return db.groups.filter(g=>g.worldId===worldId&&!g.deleted)}
export function forumCreateGroup(state,{worldId,name,category,description,prompt,ownerId}){if(!state.worlds?.some(w=>w.id===worldId))throw Error('世界不存在');if(ownerId!==state.currentUserId)throw Error('只能为自己创建小组');name=String(name||'').trim().slice(0,28);if(!name)throw Error('请填写小组名称');const db=ensureForum(state);const group={id:crypto.randomUUID(),worldId,name,category:String(category||'兴趣').trim().slice(0,16),description:String(description||'').trim().slice(0,280),prompt:String(prompt||'').trim().slice(0,80),symbol:'✦',ownerId,createdAt:Date.now(),starter:false};db.groups.push(group);forumJoinGroup(state,group.id,ownerId);return group}
export function forumIsMember(state,groupId,accountId){return Boolean(ensureForum(state).memberships[groupId]?.includes(accountId))}
export function forumJoinGroup(state,groupId,accountId){const group=ensureForum(state).groups.find(g=>g.id===groupId&&!g.deleted);if(!group)throw Error('小组不存在');if(!state.people.some(p=>p.id===accountId))throw Error('账号不存在');const list=ensureForum(state).memberships[groupId]||=[];if(!list.includes(accountId))list.push(accountId);return list.length}
export function forumLeaveGroup(state,groupId,accountId){const db=ensureForum(state),group=db.groups.find(g=>g.id===groupId&&!g.deleted);if(!group)throw Error('小组不存在');if(group.ownerId===accountId)throw Error('组长不能退出自己创建的小组');db.memberships[groupId]=(db.memberships[groupId]||[]).filter(id=>id!==accountId)}
export function forumEditGroup(state,groupId,accountId,changes){const group=ensureForum(state).groups.find(g=>g.id===groupId&&!g.deleted);if(!group||group.ownerId!==accountId)throw Error('只有创建者可以编辑小组');const name=String(changes.name||'').trim().slice(0,28);if(!name)throw Error('小组名字不能为空');Object.assign(group,{name,category:String(changes.category||'兴趣').trim().slice(0,16),description:String(changes.description||'').trim().slice(0,280),prompt:String(changes.prompt||'').trim().slice(0,80)});return group}
export function forumDeleteGroup(state,groupId,accountId){const db=ensureForum(state),group=db.groups.find(g=>g.id===groupId&&!g.deleted);if(!group||group.ownerId!==accountId)throw Error('只有创建者可以删除小组');group.deleted=true;for(const post of db.posts.filter(p=>p.groupId===groupId)){post.groupId='';post.board='topic';post.challenge=false;post.topic ||= group.name}delete db.memberships[groupId];return group}
export function forumVisible(state,worldId){return ensureForum(state).posts.filter(p=>!p.deleted&&p.worldId===worldId).sort((a,b)=>b.createdAt-a.createdAt)}
export function forumPost(state,{authorId,worldId,text,board='tree',topic='',anonymous=true,groupId='',quotePostId='',challenge=false}){
  const db=ensureForum(state),content=String(text||'').trim().slice(0,1600);if(!content)throw Error('写点内容再发布');
  if(!state.people.some(p=>p.id===authorId))throw Error('账号已不存在');
  if(authorId!==state.currentUserId&&!forumActors(state,worldId).some(p=>p.id===authorId))throw Error('角色与世界不匹配');
  if(groupId){const group=forumGroups(state,worldId).find(g=>g.id===groupId);if(!group)throw Error('小组与世界不匹配');if(authorId===state.currentUserId&&!forumIsMember(state,groupId,authorId))throw Error('加入小组后才能发帖');board='group'}
  if(quotePostId&&!db.posts.some(p=>p.id===quotePostId&&p.worldId===worldId&&!p.deleted))throw Error('转发的帖子不存在');
  const row={id:crypto.randomUUID(),worldId,authorId,text:content,board:['topic','timeline','group'].includes(board)?board:'tree',groupId,quotePostId,challenge:Boolean(challenge&&groupId),topic:String(topic||'').trim().slice(0,32),anonymous:Boolean(anonymous),createdAt:Date.now(),likes:[],bookmarks:[],reposts:[],guesses:{}};db.posts.push(row);return row;
}
export function forumReply(state,{postId,authorId,text,parentId=''}){const db=ensureForum(state),post=db.posts.find(p=>p.id===postId&&!p.deleted),content=String(text||'').trim().slice(0,480);if(!post)throw Error('帖子不存在');if(!content)throw Error('回复不能为空');if(authorId!==state.currentUserId&&!forumActors(state,post.worldId).some(p=>p.id===authorId))throw Error('回复角色与世界不匹配');if(parentId&&!db.replies.some(r=>r.id===parentId&&r.postId===postId&&!r.deleted))throw Error('要回复的评论不存在');const row={id:crypto.randomUUID(),postId,authorId,text:content,parentId,createdAt:Date.now(),likes:[]};db.replies.push(row);return row}
export function forumToggle(state,postId,key,accountId){const post=ensureForum(state).posts.find(p=>p.id===postId&&!p.deleted);if(!post||!['likes','bookmarks','reposts'].includes(key))return;const list=post[key]||=[];post[key]=list.includes(accountId)?list.filter(id=>id!==accountId):[...list,accountId]}
export function forumToggleReply(state,replyId,accountId){const row=ensureForum(state).replies.find(r=>r.id===replyId&&!r.deleted);if(!row)return;row.likes||=[];row.likes=row.likes.includes(accountId)?row.likes.filter(id=>id!==accountId):[...row.likes,accountId]}
