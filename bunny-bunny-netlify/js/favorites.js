import { personById } from "./core/store.js";
import { escapeHtml, showToast } from "./core/ui.js";
import { resolveTtsConfig, synthesizeSpeech } from "./tts-providers.js";
import { saveMediaBlob } from "./media-store.js";

export function createFavoritesRenderer({store}){
  return function render(container){
    const state=store.getState(),items=[...(state.favorites||[])].sort((a,b)=>b.createdAt-a.createdAt);
    container.className="app-view favorites-view";
    container.innerHTML=`<section class="favorites-hero"><span>COLLECTION</span><h2>收藏</h2><p>${items.length} 条来自 CHAR 与 USER 的消息</p></section><div class="favorites-list">${items.map(item=>favoriteCard(item,state)).join("")||'<div class="empty"><strong>还没有收藏</strong><span>长按聊天或通话中的消息即可收藏。</span></div>'}</div>`;
    container.querySelectorAll("[data-favorite-delete]").forEach(button=>button.onclick=()=>{store.update(s=>s.favorites=(s.favorites||[]).filter(x=>x.id!==button.dataset.favoriteDelete));render(container)});
    container.querySelectorAll("[data-favorite-voice]").forEach(button=>button.onclick=()=>playFavorite(button.dataset.favoriteVoice,button));
    async function playFavorite(id,button){
      const item=store.getState().favorites.find(x=>x.id===id);if(!item)return;
      if(button.classList.contains("playing"))return;
      button.classList.add("playing");
      try{
        if(item.audioUrl){const audio=new Audio(item.audioUrl);await audio.play();await new Promise((ok,bad)=>{audio.onended=ok;audio.onerror=bad})}
        else{
          const profile=store.getState().chatProfiles[item.personId]||{},config=item.role==="char"?resolveTtsConfig(store.getState(),profile):{provider:"browser",lang:"zh-CN",speed:1};
          const blob=await synthesizeSpeech(config,item.transcript||item.text||"语音消息",{tone:item.tone||"",play:false});
          if(blob){const media=await saveMediaBlob(blob);store.update(s=>{const fav=s.favorites.find(x=>x.id===id);fav.audioMediaId=media.mediaId;fav.audioUrl=media.src;const original=(s.messages[item.conversationId]||[]).find(x=>x.id===item.messageId);if(original){original.audioMediaId=media.mediaId;original.audioUrl=media.src}});const audio=new Audio(media.src);await audio.play();await new Promise((ok,bad)=>{audio.onended=ok;audio.onerror=bad})}
          else await synthesizeSpeech(config,item.transcript||item.text||"语音消息",{tone:item.tone||""});
        }
      }catch(error){showToast(error.message||"语音播放失败")}finally{button.classList.remove("playing")}
    }
  }
}

function favoriteCard(item,state){
  item={...(item.snapshot||{}),...item};
  const person=personById(state,item.personId)||{name:item.role==="user"?"我":"CHAR"},type=item.type||"text";
  const body=type==="image"||type==="text-image"||type==="sticker"?`<img src="${escapeHtml(item.src||"")}" alt="${escapeHtml(item.description||"收藏图片")}">`:type==="voice"?`<button class="favorite-voice" data-favorite-voice="${item.id}"><i></i><i></i><i></i><span>${escapeHtml(item.transcript||item.text||"语音消息")}</span></button>`:`<p>${escapeHtml(item.text||item.description||"消息")}</p>`;
  return `<article class="favorite-card"><header><div><strong>${escapeHtml(item.role==="user"?"我":person.name)}</strong><small>${escapeHtml(label(type))} · ${new Date(item.createdAt||Date.now()).toLocaleString("zh-CN")}</small></div><button data-favorite-delete="${item.id}" aria-label="移除收藏">×</button></header><div class="favorite-content">${body}</div></article>`
}
function label(type){return({voice:"语音",image:"图片","text-image":"文字图",sticker:"表情包",redpacket:"红包",transfer:"转账",location:"位置","voice-call":"语音通话","video-call":"视频通话"})[type]||"文字"}
