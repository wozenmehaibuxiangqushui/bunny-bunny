import { entityWorld } from './world-engine.js';

export function ensureForum(state){
  state.forum ||= {posts:[],replies:[],drafts:{},lastRefreshAt:{},settings:{batchPosts:4,batchReplies:8}};
  state.forum.posts ||= [];state.forum.replies ||= [];state.forum.drafts ||= {};state.forum.lastRefreshAt ||= {};state.forum.settings ||= {batchPosts:4,batchReplies:8};
  return state.forum;
}
export function forumAlias(id,worldId){const names=['晚风','纸船','薄荷','星期三','白噪音','路灯','蓝莓','某个路人','小行星','雨伞'];const hash=[...`${id}:${worldId}`].reduce((h,ch)=>((h*33)^ch.charCodeAt(0))>>>0,5381);return `${names[hash%names.length]}${String(hash%997).padStart(3,'0')}`}
export function forumActors(state,worldId){return state.people.filter(p=>p.type==='char'||p.type==='npc').filter(p=>entityWorld(state,p.id)===worldId)}
export function forumVisible(state,worldId){return ensureForum(state).posts.filter(p=>!p.deleted&&p.worldId===worldId).sort((a,b)=>b.createdAt-a.createdAt)}
export function forumPost(state,{authorId,worldId,text,board='tree',topic='',anonymous=true}){
  const db=ensureForum(state),content=String(text||'').trim().slice(0,1600);
  if(!content)throw Error('写点内容再发布');
  if(!state.people.some(p=>p.id===authorId))throw Error('账号已不存在');
  if(authorId!==state.currentUserId&&!forumActors(state,worldId).some(p=>p.id===authorId))throw Error('角色与世界不匹配');
  const row={id:crypto.randomUUID(),worldId,authorId,text:content,board:board==='topic'?'topic':'tree',topic:String(topic||'').trim().slice(0,32),anonymous:Boolean(anonymous),createdAt:Date.now(),likes:[],bookmarks:[],guesses:{}};
  db.posts.push(row);return row;
}
export function forumReply(state,{postId,authorId,text}){const db=ensureForum(state),post=db.posts.find(p=>p.id===postId&&!p.deleted),content=String(text||'').trim().slice(0,480);if(!post)throw Error('帖子不存在');if(!content)throw Error('回复不能为空');if(authorId!==state.currentUserId&&!forumActors(state,post.worldId).some(p=>p.id===authorId))throw Error('回复角色与世界不匹配');const row={id:crypto.randomUUID(),postId,authorId,text:content,createdAt:Date.now(),likes:[]};db.replies.push(row);return row}
export function forumToggle(state,postId,key,accountId){const post=ensureForum(state).posts.find(p=>p.id===postId);if(!post||!['likes','bookmarks'].includes(key))return;const list=post[key]||=[];post[key]=list.includes(accountId)?list.filter(id=>id!==accountId):[...list,accountId]}
