import { escapeHtml, openSheet } from './core/ui.js';

export function chatRecordCard(message){
  const rows=Array.isArray(message.bundle)?message.bundle:[];
  return `<button type="button" class="chat-record-card" data-chat-record="${escapeHtml(message.id)}" aria-label="查看聊天记录详情"><span class="chat-record-title">${escapeHtml(message.text||'聊天记录')}</span><span class="chat-record-preview">${rows.slice(0,4).map(row=>`<span><b>${escapeHtml(row.sender||roleName(row.role))}：</b>${escapeHtml(row.text||typeName(row.type))}</span>`).join('')||'<span>暂无消息预览</span>'}</span><span class="chat-record-footer">聊天记录 <small>${rows.length} 条 ›</small></span></button>`;
}
export function openChatRecordDetail(message){
  const rows=Array.isArray(message.bundle)?message.bundle:[];
  openSheet(`<section class="chat-record-detail"><div class="sheet-title"><h3>${escapeHtml(message.text||'聊天记录')}</h3><button type="button" class="button ghost" data-sheet-close>完成</button></div><p class="chat-record-summary">${rows.length} 条消息 · 合并转发</p><div class="chat-record-transcript">${rows.map(row=>`<article><span class="chat-record-avatar">${escapeHtml((row.sender||roleName(row.role)).slice(0,1))}</span><div><header><strong>${escapeHtml(row.sender||roleName(row.role))}</strong><time>${escapeHtml(row.time||'')}</time></header><p>${escapeHtml(row.text||typeName(row.type))}</p></div></article>`).join('')||'<p>这份记录暂无可显示的内容。</p>'}</div><small class="chat-record-notice">这份记录是发送时的快照；原聊天后续修改不会改变它。</small></section>`);
}
function roleName(role){return role==='user'?'我':role==='char'?'对方':'成员'}
function typeName(type){return ({image:'[图片]',photo:'[照片]',sticker:'[表情]',voice:'[语音]',redpacket:'[红包]','chat-record':'[聊天记录]'})[type]||'[消息]'}
