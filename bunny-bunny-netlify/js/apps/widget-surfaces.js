import { escapeHtml as esc, openSheet, closeSheet, showToast } from '../core/ui.js';

// Independently drawn controls. Reference photographs are not redistributed.
const paths={play:'M8 5l12 7-12 7Z',pause:'M8 5v14M16 5v14',back:'M11 6l-8 6 8 6ZM21 6l-8 6 8 6Z',next:'M3 6l8 6-8 6ZM13 6l8 6-8 6Z',sound:'M3 9h4l5-4v14l-5-4H3ZM16 8q5 4 0 8M19 5q8 7 0 14',moon:'M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z',search:'M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',star:'m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z',music:'M9 17V5l12-3v13M9 8l12-3M9 17c0 5-7 5-7 1s7-4 7-1M21 15c0 5-7 5-7 1s7-4 7-1',heart:'M12 21 3 12C-3 4 7-1 12 6c5-7 15-2 9 6Z',bed:'M3 20V8m18 12V8M3 16h18M5 12V5h14v7M8 8h3m2 0h3',work:'M3 7h18v14H3ZM8 7V3h8v4M3 12h18',bunny:'M7 12C-1-3 10-2 10 11M14 11c0-13 11-13 3 1M5 14c-3 10 17 10 14 0M9 16h.1m6 0h.1',waves:'M4 10v4m4-7v10m4-13v16m4-13v10m4-7v4'};
export const surfaceIcon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.bunny}"/></svg>`;
const clock=()=>new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false});
const date=()=>new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'});
const time=value=>`${Math.floor((Number(value)||0)/60)}:${String(Math.floor((Number(value)||0)%60)).padStart(2,'0')}`;
export const referenceWidgets=[
 {type:'clock',design:'ios',title:'时间',content:'今天也慢慢来',size:'1x4'},
 {type:'music',design:'ios',title:'正在播放',content:'Bunny Radio · 选择自己的音乐',size:'2x4'},
 {type:'message',design:'ios',title:'聊天',content:'有空的时候 给我发个消息吧',size:'1x4'},
 {type:'modes',design:'ios',title:'me time',content:'留一点时间给自己',size:'1x4'},
 {type:'search',design:'ios',title:'搜索',content:'搜索应用',size:'1x4'},
 {type:'mode-stack',design:'ios',title:'专注模式',content:'Do Not Disturb\nSleep\nme time\nWork',size:'4x4'},
 {type:'clock-gray',design:'ios',title:'灰色时间栏',content:'',size:'1x4'}
].map(x=>({...x,style:{background:'#202326',color:'#ffffff'}}));

export function renderSurface(w){const title=esc(w.title||''),text=esc(w.content||''),art=w.image?`<img src="${esc(w.image)}" alt="">`:surfaceIcon('bunny');
 if(w.type==='clock'||w.type==='clock-gray')return `<div class="ref-clock ${w.type==='clock-gray'?'clock-gray':''}"><time data-live-clock>${clock()}</time><span data-live-date>${date()}</span></div>`;
 if(w.type==='music')return `<div class="ref-player"><header><div class="ref-cover">${art}</div><div><strong>${title}</strong><span>${text}</span></div><i>${surfaceIcon('waves')}</i></header><div class="ref-timeline"><small data-elapsed>0:00</small><input type="range" min="0" max="100" value="0" data-seek aria-label="播放进度"><small data-duration>0:00</small></div><nav><button data-star aria-label="收藏歌曲" aria-pressed="${!!w.favorite}">${surfaceIcon('star')}</button><button data-skip="-10" aria-label="后退十秒">${surfaceIcon('back')}</button><button data-play aria-label="播放">${surfaceIcon('play')}</button><button data-skip="10" aria-label="前进十秒">${surfaceIcon('next')}</button><button data-audio-source aria-label="设置音频地址">${surfaceIcon('music')}</button></nav><div class="ref-volume">${surfaceIcon('sound')}<input data-volume aria-label="音量" type="range" min="0" max="1" step=".01" value=".7">${surfaceIcon('sound')}</div></div>`;
 if(w.type==='message')return `<button class="ref-notification" data-notification><i>${art}<b>${surfaceIcon('bunny')}</b></i><span><strong>${title}</strong><span>${text}</span></span><small>通知</small></button>`;
 if(w.type==='search')return `<button class="ref-search" data-home-search>${surfaceIcon('search')}<span>${text||'搜索应用'}</span><i>⌕</i></button>`;
 if(w.type==='modes'||w.type==='mode-stack'){const modes=w.type==='modes'?[{name:w.title||'me time',icon:'moon',note:w.content}]:[{name:'Do Not Disturb',icon:'moon',note:'Silence all notifications'},{name:'Sleep',icon:'bed',note:''},{name:'me time',icon:'music',note:'留一点时间给自己'},{name:'Work',icon:'work',note:'Get things done'}];return `<div class="ref-modes">${modes.map(m=>`<button class="ref-mode ${w.activeMode===m.name?'selected':''}" data-mode="${esc(m.name)}" aria-pressed="${w.activeMode===m.name}">${surfaceIcon(m.icon)}<span><strong>${esc(m.name)}</strong><small>${w.activeMode===m.name?'On':esc(m.note||'')}</small></span><b>•••</b></button>`).join('')}</div>`}
 return null;
}

export function bindSurfaces(container,{store,navigate,registry,editing}){
 container.querySelectorAll('[data-widget-id]').forEach(card=>{
 const id=card.dataset.widgetId,w=store.getState().desktopWidgets.find(x=>x.id===id);if(!w)return;
 const save=change=>store.update(s=>Object.assign(s.desktopWidgets.find(x=>x.id===id)||{},change));
 card.querySelectorAll('button,input').forEach(control=>control.addEventListener('pointerdown',e=>{if(!editing)e.stopPropagation()}));
 const player=card.querySelector('.ref-player');
 if(player&&!editing){const audio=new Audio();audio.preload='none';audio.volume=.7;if(w.audioUrl)audio.src=w.audioUrl;
 const play=card.querySelector('[data-play]');audio.ontimeupdate=()=>{card.querySelector('[data-elapsed]').textContent=time(audio.currentTime);card.querySelector('[data-duration]').textContent=time(audio.duration);card.querySelector('[data-seek]').value=Number.isFinite(audio.duration)?audio.currentTime/audio.duration*100:0};audio.onpause=audio.onended=()=>{play.innerHTML=surfaceIcon('play');play.setAttribute('aria-label','播放')};audio.onplay=()=>{play.innerHTML=surfaceIcon('pause');play.setAttribute('aria-label','暂停')};
 const source=()=>openSheet(`<form class="ref-audio-form"><h3>你的音乐</h3><p>填写可直接播放的音频地址，封面与曲名可在组件编辑中更换。</p><label class="field"><span>音频 URL</span><input name="url" type="url" required value="${esc(w.audioUrl||'')}" placeholder="https://…/music.mp3"></label><div class="sheet-split-actions"><button type="button" data-sheet-close class="button secondary">取消</button><button class="button">保存</button></div></form>`,{onReady(sheet){sheet.querySelector('form').onsubmit=e=>{e.preventDefault();const url=e.target.elements.url.value.trim();if(!/^https?:\/\//i.test(url))return showToast('请输入 HTTP(S) 音频地址');save({audioUrl:url});audio.src=url;closeSheet()}}});
 play.onclick=async()=>{if(!audio.getAttribute('src'))return source();if(!audio.paused)return audio.pause();try{await audio.play()}catch{showToast('音频无法播放，请检查地址及文件格式')}};
 card.querySelector('[data-audio-source]').onclick=source;card.querySelector('[data-volume]').oninput=e=>audio.volume=+e.target.value;card.querySelector('[data-seek]').oninput=e=>{if(Number.isFinite(audio.duration))audio.currentTime=audio.duration*e.target.value/100};card.querySelectorAll('[data-skip]').forEach(b=>b.onclick=()=>{if(Number.isFinite(audio.duration))audio.currentTime=Math.max(0,Math.min(audio.duration,audio.currentTime+Number(b.dataset.skip)))});card.querySelector('[data-star]').onclick=e=>{const b=e.currentTarget,value=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',value);save({favorite:value})};
 const observer=new MutationObserver(()=>{if(!card.isConnected){audio.pause();audio.removeAttribute('src');audio.load();observer.disconnect()}});observer.observe(container,{childList:true});
 }
 if(editing)return;
 card.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>{const selected=button.getAttribute('aria-pressed')!=='true';save({activeMode:selected?button.dataset.mode:''});card.querySelectorAll('[data-mode]').forEach(b=>{const active=b===button&&selected;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',active);b.querySelector('small').textContent=active?'On':''});showToast(selected?'桌面模式已开启':'桌面模式已关闭')});
 const notification=card.querySelector('[data-notification]');if(notification)notification.onclick=()=>navigate('chat');
 const search=card.querySelector('[data-home-search]');if(search)search.onclick=()=>openSheet(`<section class="ref-search-sheet"><label class="field"><span>搜索应用</span><input type="search" placeholder="输入应用名称" data-query></label><div data-results></div></section>`,{onReady(sheet){const input=sheet.querySelector('[data-query]'),results=sheet.querySelector('[data-results]');const update=()=>{results.innerHTML=Object.entries(registry).filter(([id,a])=>(store.getState().appCustomizations?.[id]?.name||a.name).toLowerCase().includes(input.value.trim().toLowerCase())).map(([id,a])=>`<button class="button secondary" data-result="${id}">${esc(store.getState().appCustomizations?.[id]?.name||a.name)}</button>`).join('');results.querySelectorAll('[data-result]').forEach(b=>b.onclick=()=>{const a=registry[b.dataset.result];if(!a.route)return showToast('此应用尚未开放');closeSheet();navigate(a.route)})};input.oninput=update;update();input.focus()}});
 });
 const timer=setInterval(()=>{if(!container.querySelector('[data-live-clock]'))return clearInterval(timer);container.querySelectorAll('[data-live-clock]').forEach(x=>x.textContent=clock());container.querySelectorAll('[data-live-date]').forEach(x=>x.textContent=date())},15000);
 return()=>clearInterval(timer);
}
