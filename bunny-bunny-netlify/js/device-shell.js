// Device chrome uses real browser capabilities; unavailable battery values stay hidden.
export function setupDeviceShell({store}){
 const root=document.querySelector('#phone-root');
 const mobile=navigator.userAgentData?.mobile??/Android|iPhone|iPad|iPod|HarmonyOS/i.test(navigator.userAgent);
 document.documentElement.dataset.mobile=String(mobile);
 const bar=document.createElement('div');bar.className='system-status-bar';bar.setAttribute('aria-label','设备状态栏');
 bar.innerHTML='<time data-system-time></time><div class="system-status-right"><span data-network-status title="网络连接状态"><svg viewBox="0 0 24 18" aria-hidden="true"><path d="M2 5q10-8 20 0M5 9q7-6 14 0M9 13q3-3 6 0"/><circle cx="12" cy="16" r="1"/></svg></span><span class="system-battery" hidden><span data-battery-fill></span><b data-battery-level></b></span></div>';
 root.prepend(bar);
 const apply=()=>{const a=store.getState().appearance;root.classList.toggle('status-bar-off',a.statusBar===false||(a.statusBar===undefined&&mobile));root.classList.toggle('island-off',a.dynamicIsland===false)};
 function update(){bar.querySelector('time').textContent=new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false});const network=bar.querySelector('[data-network-status]');network.classList.toggle('offline',!navigator.onLine);network.setAttribute('aria-label',navigator.onLine?'网络已连接':'网络已断开')}
 function settings(){if(document.querySelector('#app-screen').dataset.app!=='phone-settings'||document.querySelector('[data-status-toggle]'))return;const target=document.querySelector('.theme-preview-grid');if(!target)return;const checked=!root.classList.contains('status-bar-off');target.insertAdjacentHTML('afterend',`<section class="card"><label class="setting-row"><div><span class="label">顶部状态栏</span><small>时间与网络状态；支持时同步真实电量。手机端可关闭，保留系统顶栏。</small></div><input class="switch" data-status-toggle type="checkbox" ${checked?'checked':''}></label></section>`);document.querySelector('[data-status-toggle]').onchange=e=>{store.update(s=>s.appearance.statusBar=e.target.checked);apply()}}
 const observer=new MutationObserver(()=>{apply();settings()});observer.observe(document.querySelector('#app-view'),{childList:true,subtree:true});
 apply();update();setInterval(update,30000);window.addEventListener('online',update);window.addEventListener('offline',update);document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});
 if(navigator.getBattery)navigator.getBattery().then(battery=>{const draw=()=>{const value=Math.round(battery.level*100),cell=bar.querySelector('.system-battery');cell.hidden=false;cell.classList.toggle('charging',battery.charging);cell.setAttribute('aria-label',`真实电量 ${value}%${battery.charging?'，充电中':''}`);cell.querySelector('b').textContent=value;cell.querySelector('[data-battery-fill]').style.width=value+'%'};draw();battery.addEventListener('levelchange',draw);battery.addEventListener('chargingchange',draw)}).catch(()=>{});
}

// Keep tabs in a separate flex row, never inside the scrolling content.
export function mountChatTabLayout(container){
 const tabs=container.querySelector(':scope > .chat-tabs');if(!tabs)return;
 container.classList.add('chat-tab-layout');const scroll=document.createElement('div');scroll.className='chat-tab-scroll';
 [...container.childNodes].filter(n=>n!==tabs).forEach(n=>scroll.appendChild(n));container.prepend(scroll);
}
