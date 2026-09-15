import { escapeHtml, showToast, openSheet } from "./core/ui.js";

export function ensureWallet(state){
  if(!state.wallet)state.wallet={balance:2480,currency:"CNY",ledger:[]};
  if(!Array.isArray(state.wallet.ledger))state.wallet.ledger=[];
  return state.wallet;
}
export function walletDebit(store,{amount,kind,title,conversationId,messageId,note}){
  amount=money(amount);let ok=false;
  store.update(state=>{const wallet=ensureWallet(state);if(amount<=0||wallet.balance<amount)return;wallet.balance=money(wallet.balance-amount);wallet.ledger.unshift({id:id(),direction:"expense",amount,kind,title,conversationId,messageId,note:note||"",time:new Date().toISOString()});ok=true});
  return ok;
}
export function walletCredit(store,{amount,kind,title,conversationId,messageId,note}){
  amount=money(amount);if(amount<=0)return false;
  store.update(state=>{const wallet=ensureWallet(state);wallet.balance=money(wallet.balance+amount);wallet.ledger.unshift({id:id(),direction:"income",amount,kind,title,conversationId,messageId,note:note||"",time:new Date().toISOString()})});return true;
}
export function createWalletRenderer({store}){
  return container=>{const state=store.getState(),wallet=ensureWallet(state);container.innerHTML=`<section class="wallet-hero"><span>可用余额</span><strong>¥${wallet.balance.toFixed(2)}</strong><small>红包、转账、购物与收入使用同一账本</small></section><div class="section-title"><h3>收支明细</h3><span>${wallet.ledger.length} 笔</span></div><section class="wallet-ledger">${wallet.ledger.length?wallet.ledger.map(row=>`<button class="wallet-row" data-ledger="${row.id}"><span class="wallet-kind">${row.kind==="redpacket"?"礼":row.kind==="transfer"?"¥":"账"}</span><span><strong>${escapeHtml(row.title)}</strong><small>${formatTime(row.time)}${row.note?` · ${escapeHtml(row.note)}`:""}</small></span><b class="${row.direction}">${row.direction==="income"?"+":"−"}¥${row.amount.toFixed(2)}</b></button>`).join(""):'<div class="empty"><strong>还没有收支记录</strong><span>发送红包或转账后会自动显示。</span></div>'}</section>`;container.querySelectorAll("[data-ledger]").forEach(button=>button.onclick=()=>{const row=wallet.ledger.find(x=>x.id===button.dataset.ledger);openSheet(`<div class="sheet-title"><h3>交易详情</h3><button class="button ghost" data-sheet-close>关闭</button></div><section class="receipt"><span>${escapeHtml(row.title)}</span><strong>${row.direction==="income"?"+":"−"}¥${row.amount.toFixed(2)}</strong><dl><div><dt>类型</dt><dd>${row.kind==="redpacket"?"红包":"转账"}</dd></div><div><dt>时间</dt><dd>${formatTime(row.time)}</dd></div><div><dt>备注</dt><dd>${escapeHtml(row.note||"无")}</dd></div></dl></section>`)})};
}
export function insufficientSheet(){openSheet(`<div class="confirm-dialog"><div class="confirm-symbol">¥</div><h3>余额不足</h3><p>钱包可用余额不足，无法完成本次发送。</p><button class="button" data-sheet-close>知道了</button></div>`)}
function money(value){return Math.round(Number(value||0)*100)/100}
function formatTime(value){return new Intl.DateTimeFormat("zh-CN",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(value))}
function id(){return crypto.randomUUID?.()||`tx-${Date.now()}-${Math.random().toString(16).slice(2)}`}
