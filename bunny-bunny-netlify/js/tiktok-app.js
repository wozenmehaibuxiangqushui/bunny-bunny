import { escapeHtml as esc,openSheet,closeSheet,showToast } from './core/ui.js';
import { saveMediaBlob,getMediaUrl } from './media-store.js';
import { switchAccount,friendWorldGroup } from './account-system.js';
import { providerDefaults,testModelConnection } from './integrations/ai-client.js';
import { ensureTikTok,tikPost,tikComment,tikToggle,tikFollow,tikFollowers,tikRecordWatch,
  tikRankFeed,tikVisible,tikDm,tikLiveMessage } from './tiktok-model.js';
import { refreshTikTok,respondToTikTokPost,replyToTikTokComment,replyToTikTokDm,
  generateTikTokLiveMoment,tikAutoDue } from './tiktok-engine.js';

const icons={
  home:'M4 11 12 4l8 7v9H4z',search:'M20 20l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  plus:'M12 4v16M4 12h16',inbox:'M3 5h18v14H3zM3 6l9 8 9-8',
  user:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c0-8 16-8 16 0',
  heart:'M12 21 3.4 12.4C-1 8 4 2 9 5l3 3 3-3c5-3 10 3 5.6 7.4Z',
  comment:'M4 4h16v13H9l-5 4z',bookmark:'M6 3h12v18l-6-4-6 4z',
  share:'M12 16V3m-5 5 5-5 5 5M4 13v8h16v-8',
  music:'M10 5v12a3 3 0 1 1-2-2.8V7l10-3v10a3 3 0 1 1-2-2.8V4',
  back:'m15 4-8 8 8 8',menu:'M4 6h16M4 12h16M4 18h16',
  play:'m9 5 10 7-10 7z',pause:'M8 5v14M16 5v14',
  check:'M4 12l5 5L20 6',refresh:'M19 8V3l-3 3a8 8 0 1 0 3 7M19 3h-5'
};
const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[name]||icons.home}"/></svg>`;
const url=value=>/^(https?:\/\/|blob:|data:image\/)/i.test(String(value||''))?String(value):'';
const format=n=>n>=10000?(n/10000).toFixed(1).replace(/\.0$/,'')+'万':n>=1000?(n/1000).toFixed(1).replace(/\.0$/,'')+'千':String(n||0);
const when=n=>new Date(n).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
const field=(name,label,value='',type='text')=>`<label class="tt-field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value??'')}"></label>`;
const area=(name,label,value='',rows=3)=>`<label class="tt-field"><span>${label}</span><textarea name="${name}" rows="${rows}">${esc(value||'')}</textarea></label>`;
const select=(name,label,options,value)=>`<label class="tt-field"><span>${label}</span><select name="${name}">${options.map(([key,label])=>`<option value="${esc(key)}" ${key===value?'selected':''}>${esc(label)}</option>`).join('')}</select></label>`;
const clamp=(n,min,max,fallback)=>Math.max(min,Math.min(max,Number.isFinite(Number(n))?Number(n):fallback));

export function createTikTokRenderer({store,navigate}){
  let page='home',tab='for-you',index=0,profileId='',profileTab='posts',query='',peerId='',soundName='',
    editId='',liveHostId='',liveLoading=false,refreshing=false,replying=false,paused=false,selectedFile=null,selectedKind='story',previewUrl='',containerRef=null,
    watchTimer=0,lastWheel=0;
  const state=()=>store.getState(),t=()=>ensureTikTok(state()),me=()=>state().activeUserAccountId,
    profile=id=>t().profiles[id]||{name:'已注销账号',handle:'unknown'};
  const posts=()=>tikRankFeed(state(),me(),tab);
  const avatar=(id,extra='')=>{const p=profile(id);return `<span class="tt-avatar ${extra}">${p.avatarMediaId?
    `<img data-tik-media="${esc(p.avatarMediaId)}" alt="">`:url(p.avatar)?`<img src="${esc(p.avatar)}" alt="">`:
    esc((p.name||'?').slice(0,1))}</span>`};
  const owned=key=>new Set(t()[key]?.[me()]||[]);
  const countOf=(key,id)=>Object.values(t()[key]||{}).filter(list=>list.includes(id)).length+
    (key==='likes'||key==='favorites'?Number(t().posts.find(p=>p.id===id)?.[key==='likes'?'baseLikes':'baseFavorites'])||0:0);
  const visible=()=>t().posts.filter(p=>tikVisible(state(),p));
  const people=()=>[...state().people.filter(p=>p.type==='user'||friendWorldGroup(state(),p.id)===t().groupId).map(p=>p.id),
    ...Object.values(t().profiles).filter(p=>p.kind==='network-npc'&&p.groupId===t().groupId).map(p=>p.id)];
  function stopVideo(){clearInterval(watchTimer);containerRef?.querySelector('video[data-tik-media],video[data-tik-url]')?.pause()}
  function go(next){stopVideo();page=next;render(containerRef)}
  function back(){
    if(page==='live-room')go('live');
    else if(page==='live')go('home');
    else if(page==='dm')go('inbox');
    else if(page==='settings'||page==='edit-profile')go('profile');
    else if(page==='sound'||page==='person')go('home');
    else navigate('desktop');
  }
  function render(container){
    const entering=!container.firstElementChild;containerRef=container;ensureTikTok(state());stopVideo();
    const home=page==='home',dark=home||page==='dm'||page==='live-room';
    container.className='app-view tt-app';container.dataset.ttDark=dark?'true':'false';
    document.querySelector('#header-title').textContent='TikTok';document.querySelector('#back-button').onclick=back;
    container.innerHTML=`<div class="tt-page ${home?'tt-page-feed':''}">
      ${home?feed():page==='discover'?discover():page==='create'?createPage():page==='inbox'?inbox():
        page==='dm'?dm():page==='profile'||page==='person'?profilePage(profileId||me()):
        page==='edit-profile'?editProfilePage():page==='settings'?settingsPage():page==='sound'?soundPage():
        page==='live'?livePage():page==='live-room'?liveRoom():feed()}
    </div>${page==='dm'||page==='edit-profile'||page==='settings'||page==='live-room'?'':
      `<nav class="tt-nav">${[['home','home','首页'],['discover','search','发现'],['create','plus','发布'],['inbox','inbox','收件箱'],['profile','user','我']].map(([key,glyph,label])=>
        `<button class="${page===key?'active':''} ${key==='create'?'tt-nav-create':''}" data-tt-nav="${key}" aria-label="${label}">${icon(glyph)}<span>${label}</span></button>`).join('')}</nav>`}`;
    bind(container);void hydrate(container);
    if(home&&posts()[index]&&posts()[index].kind!=='video')
      watchTimer=setInterval(()=>{if(page==='home'&&!document.hidden){
        const post=posts()[index];if(post)store.update(s=>tikRecordWatch(s,post.id,me(),3))}},3000);
    if(entering&&tikAutoDue(state(),'open'))queueMicrotask(()=>void refresh(false));
  }
  async function hydrate(root){
    for(const item of root.querySelectorAll('[data-tik-media]')){
      const src=await getMediaUrl(item.dataset.tikMedia);
      if(item.isConnected&&src){item.src=src;if(item.tagName==='VIDEO'&&page==='home')startVideo(item)}
    }
    const direct=root.querySelector('video[data-tik-url]');if(direct&&page==='home')startVideo(direct);
  }
  function startVideo(video){
    if(t().settings.autoplay&&!paused)video.play().catch(()=>{});
    clearInterval(watchTimer);
    watchTimer=setInterval(()=>{if(page!=='home'||document.hidden)return;
      const post=posts()[index];if(post&&(!video.paused||post.kind!=='video'))
        store.update(s=>tikRecordWatch(s,post.id,me(),3))},3000);
    video.ontimeupdate=()=>{const bar=containerRef?.querySelector('[data-tt-progress]');
      if(bar&&video.duration)bar.value=Math.round(video.currentTime/video.duration*100)};
    video.onended=()=>{if(page==='home')next(1)};
  }
  function next(direction){
    const list=posts();if(!list.length)return;index=Math.max(0,Math.min(list.length-1,index+direction));
    paused=false;render(containerRef);
  }
  async function refresh(manual=true){
    if(refreshing)return;refreshing=true;if(page==='home'||page==='settings')render(containerRef);
    try{const result=await refreshTikTok(store,{manual});index=0;page='home';
      showToast(`新增 ${result.posts} 条作品、${result.comments} 条评论${result.shares?' · 角色分享了作品':''}`)}
    catch(error){showToast(error.message)}
    finally{refreshing=false;if(document.querySelector('#app-screen')?.dataset.app==='tiktok')render(containerRef)}
  }
  function feed(){
    const list=posts(),post=list[Math.min(index,list.length-1)];if(index>=list.length)index=Math.max(0,list.length-1);
    return `<div class="tt-feed-top"><button data-tt-live>LIVE</button><div>
      ${[['following','关注'],['for-you','推荐'],['friends','朋友']].map(([key,label])=>`<button class="${tab===key?'active':''}" data-tt-tab="${key}">${label}</button>`).join('')}</div>
      <button data-tt-nav="discover" aria-label="搜索">${icon('search')}</button></div>
      ${post?`<section class="tt-video-stage" data-tt-stage data-post="${post.id}">
        ${visual(post)}
        <div class="tt-video-tint"></div>
        <div class="tt-rail"><button data-tt-person="${post.authorId}" aria-label="作者主页">${avatar(post.authorId)}${post.authorId!==me()&&!((t().follows[me()]||[]).includes(post.authorId))?'<i>+</i>':''}</button>
          <button class="${owned('likes').has(post.id)?'selected':''}" data-tt-toggle="likes" data-id="${post.id}" aria-label="点赞">${icon('heart')}<span>${format(countOf('likes',post.id))}</span></button>
          <button data-tt-comments="${post.id}" aria-label="评论">${icon('comment')}<span>${format(t().comments.filter(c=>c.postId===post.id&&!c.deleted).length)}</span></button>
          <button class="${owned('favorites').has(post.id)?'selected':''}" data-tt-toggle="favorites" data-id="${post.id}" aria-label="收藏">${icon('bookmark')}<span>${format(countOf('favorites',post.id))}</span></button>
          <button data-tt-share="${post.id}" aria-label="分享">${icon('share')}<span>分享</span></button>
          <button class="tt-record" data-tt-sound="${esc(post.sound)}" aria-label="声音">${icon('music')}</button></div>
        <div class="tt-caption"><b>@${esc(profile(post.authorId).handle)} ${profile(post.authorId).verified?'✓':''}</b>
          <p>${esc(post.caption||post.title)}</p><button data-tt-sound="${esc(post.sound)}">♫ ${esc(post.sound)}</button>
          ${post.kind==='video'?'<input data-tt-progress type="range" min="0" max="100" value="0" aria-label="播放进度">':''}</div>
        <button class="tt-video-pause ${paused?'visible':''}" data-tt-play aria-label="${paused?'播放':'暂停'}">${icon(paused?'play':'pause')}</button>
        ${post.kind==='video'?'<button class="tt-audio-toggle" data-tt-mute aria-label="切换声音">🔇</button>':''}
        <div class="tt-swipe-hint">${index+1} / ${list.length}</div>
      </section>`:`<div class="tt-feed-empty"><div class="tt-empty-orbit">♪</div><h2>今天还没刷到新片段</h2>
        <p>导入视频或照片，让角色替它写文案和评论；也可以生成图文卡，看看这个世界正在发生什么。</p>
        <button data-tt-refresh ${refreshing?'disabled':''}>${refreshing?'正在生成…':'为你生成推荐'}</button>
        <button data-tt-nav="create">上传第一段</button></div>`}`;
  }
  function visual(post){
    if(post.kind==='video'&&post.media)return `<video class="tt-visual" ${post.media.mediaId?`data-tik-media="${esc(post.media.mediaId)}"`:`src="${esc(url(post.media.url))}" data-tik-url`} playsinline loop muted preload="metadata"></video>`;
    if(post.kind==='photo'&&post.media)return `<img class="tt-visual" ${post.media.mediaId?`data-tik-media="${esc(post.media.mediaId)}"`:`src="${esc(url(post.media.url))}"`} alt="${esc(post.title)}">`;
    return `<div class="tt-story-card" style="--tt-cover:${esc(post.coverColor||'#243c54')}"><span class="tt-story-noise"></span>
      <span class="tt-story-mark">BUNNY / SHORTS</span><div class="tt-story-copy"><span>图文卡 · ${esc(profile(post.authorId).name)}</span>
      <h2>${esc(post.title)}</h2><p>${esc(post.body||post.caption)}</p></div><span class="tt-story-index">◉ &nbsp; ${when(post.createdAt)}</span></div>`;
  }
  function thumbnail(post){
    if(post.kind==='video')return post.media?.mediaId?
      `<video data-tik-media="${esc(post.media.mediaId)}" muted playsinline preload="metadata"></video>`:
      `<video src="${esc(url(post.media?.url))}" muted playsinline preload="metadata"></video>`;
    if(post.kind==='photo')return post.media?.mediaId?
      `<img data-tik-media="${esc(post.media.mediaId)}" alt="">`:
      `<img src="${esc(url(post.media?.url))}" alt="">`;
    return `<span style="--tt-cover:${esc(post.coverColor||'#344b5c')}">${esc(post.title.slice(0,32))}</span>`;
  }
  function discover(){
    const list=visible(),term=query.toLowerCase(),found=list.filter(p=>
      (p.title+' '+p.caption+' '+profile(p.authorId).name).toLowerCase().includes(term));
    const matches=people().filter(id=>(profile(id).name+' '+profile(id).handle).toLowerCase().includes(term));
    const trends=new Map();for(const post of list)for(const tag of post.caption.match(/#[\p{L}\p{N}_]+/gu)||[])
      trends.set(tag,(trends.get(tag)||0)+1);
    return `<header class="tt-light-header"><h1>发现</h1><button data-tt-settings aria-label="设置">${icon('menu')}</button></header>
      <form class="tt-search"><span>${icon('search')}</span><input name="q" value="${esc(query)}" placeholder="搜索视频、用户、话题" aria-label="搜索"></form>
      ${query?`<section class="tt-section"><h2>账号</h2>${matches.slice(0,10).map(id=>personRow(id)).join('')||'<p class="tt-muted">没有匹配的账号</p>'}</section>
        <section class="tt-section"><h2>作品</h2><div class="tt-grid">${found.map(p=>tile(p)).join('')}</div></section>`:
      `<section class="tt-section"><div class="tt-section-head"><h2>正在发生</h2><button data-tt-refresh>↻ 发现更多</button></div>
        ${[...trends].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([tag,n],i)=>
          `<button class="tt-trend" data-tt-trend="${esc(tag)}"><small>${i+1} · 当前世界热议</small><b>${esc(tag)}</b><span>${n} 条作品</span></button>`).join('')||
          '<p class="tt-muted">还没有热议话题，发布带 #话题 的作品后会出现在这里。</p>'}</section>
        <section class="tt-section"><h2>推荐创作者</h2>${matches.slice(0,8).map(id=>personRow(id)).join('')}</section>
        <section class="tt-section"><h2>最近作品</h2><div class="tt-grid">${list.slice(-12).reverse().map(p=>tile(p)).join('')}</div></section>`}`;
  }
  function personRow(id){
    const p=profile(id);return `<div class="tt-person"><button data-tt-person="${id}">${avatar(id)}<span><b>${esc(p.name)} ${p.verified?'✓':''}</b><small>@${esc(p.handle)} · ${format(tikFollowers(state(),id))} 粉丝</small></span></button>
      ${id!==me()?`<button class="${(t().follows[me()]||[]).includes(id)?'following':''}" data-tt-follow="${id}">${(t().follows[me()]||[]).includes(id)?'已关注':'关注'}</button>`:''}</div>`;
  }
  function tile(post){return `<button class="tt-tile" data-tt-open="${post.id}">${thumbnail(post)}<b>${esc(post.title)}</b><small>${icon('play')}${format(post.views)}</small></button>`}
  function createPage(){
    const draft=t().drafts.find(row=>row.accountId===me()&&row.groupId===t().groupId)||{};
    return `<header class="tt-light-header"><h1>发布作品</h1><button data-tt-settings aria-label="设置">${icon('menu')}</button></header>
      <div class="tt-create-intro"><span>CREATE / 01</span><h2>把今天的一小段放进来</h2><p>视频和照片从你的素材来；图文卡可以直接写。AI 可帮角色和网友接住这条动态。</p></div>
      <div class="tt-create-tabs">${[['video','视频'],['photo','照片'],['story','图文卡']].map(([key,label])=>
        `<button data-tt-kind="${key}" class="${selectedKind===key?'active':''}">${label}</button>`).join('')}</div>
      <form class="tt-create-form"><div class="tt-upload-zone">
        ${previewUrl?selectedKind==='video'?`<video src="${esc(previewUrl)}" muted controls playsinline></video>`:
          `<img src="${esc(previewUrl)}" alt="待发布素材">`:
          `<div class="tt-upload-symbol">${selectedKind==='story'?'Aa':icon('plus')}</div>`}
        <strong>${selectedKind==='video'?'选择本地视频或粘贴直链':selectedKind==='photo'?'选择照片或粘贴图床直链':'写一段会动起来的图文'}</strong>
        ${selectedKind!=='story'?`<label class="tt-upload-pick">从相册选择<input type="file" name="file" accept="${selectedKind==='video'?'video/*':'image/*'}" hidden></label>`:''}
      </div>
      ${selectedKind!=='story'?field('mediaUrl','媒体直链（可选）',draft.mediaUrl||'','url'):''}
      ${field('title','短标题',draft.title||'')}
      ${selectedKind==='story'?area('body','图文卡正文',draft.body||'',4):''}
      ${area('caption','文案 / #话题',draft.caption||'',4)}
      ${field('sound','声音名称',draft.sound||'原声')}
      <label class="tt-field"><span>图文卡底色</span><input name="coverColor" type="color" value="${esc(draft.coverColor||'#294253')}"></label>
      ${select('visibility','谁可以看',[['public','当前世界公开'],['followers','关注者'],['private','仅自己']],draft.visibility||'public')}
      <div class="tt-create-actions"><button type="button" data-tt-save-draft>存草稿</button><button class="primary">发布作品</button></div>
      </form><section class="tt-section"><h2>草稿箱</h2>${t().drafts.filter(row=>row.accountId===me()&&row.groupId===t().groupId)
        .map(row=>`<p class="tt-muted">${esc(row.title||'未命名草稿')} · 文字已保存，待发布媒体请重新选择</p>`).join('')||
        '<p class="tt-muted">草稿留在当前账号和世界。</p>'}</section>`;
  }
  function inbox(){
    const events=t().events.filter(e=>e.targetId===me()&&e.actorId!==me()&&e.groupId===t().groupId).slice().reverse();
    const peers=[...new Set(t().dm.filter(m=>m.groupId===t().groupId&&(m.from===me()||m.to===me()))
      .map(m=>m.from===me()?m.to:m.from))];
    return `<header class="tt-light-header"><h1>收件箱</h1><button data-tt-settings aria-label="设置">${icon('menu')}</button></header>
      <div class="tt-inbox-switch"><button class="active">活动</button><button data-tt-inbox-dm>私信 ${peers.length||''}</button></div>
      <section class="tt-section"><h2>最近活动</h2>${events.map(e=>{
        const actor=profile(e.actorId),post=t().posts.find(p=>p.id===e.postId);
        return `<button class="tt-event" ${post?`data-tt-open="${post.id}"`:e.kind==='follow'?`data-tt-person="${e.actorId}"`:''}>
          ${avatar(e.actorId)}<span><b>${esc(actor.name)}</b> ${e.kind==='like'?'赞了你的作品':e.kind==='comment'?'评论了你的作品':e.kind==='follow'?'关注了你':'与你互动'}
          <small>${when(e.createdAt)}${post?' · '+esc(post.title):''}</small></span>${post?thumbnail(post):''}</button>`}).join('')||
        '<p class="tt-muted">新评论、点赞和关注会在这里出现。</p>'}</section>
      <section class="tt-section"><div class="tt-section-head"><h2>私信</h2><button data-tt-new-dm>新消息 ＋</button></div>
        ${peers.map(id=>{const last=t().dm.filter(m=>m.groupId===t().groupId&&(m.from===me()&&m.to===id||m.from===id&&m.to===me())).at(-1);
          return `<button class="tt-inbox-peer" data-tt-dm="${id}">${avatar(id)}<span><b>${esc(profile(id).name)}</b><small>${esc(last?.text||'分享了一条作品')}</small></span><time>${when(last?.createdAt||Date.now())}</time></button>`}).join('')||
          '<p class="tt-muted">这里还没有私信。看到喜欢的作品可以分享给角色。</p>'}</section>`;
  }
  function dm(){
    const history=t().dm.filter(m=>m.groupId===t().groupId&&(m.from===me()&&m.to===peerId||m.from===peerId&&m.to===me()));
    return `<header class="tt-dm-head"><button data-tt-back aria-label="返回">${icon('back')}</button>${avatar(peerId)}
      <button data-tt-person="${peerId}"><b>${esc(profile(peerId).name)}</b><small>@${esc(profile(peerId).handle)}</small></button></header>
      <div class="tt-dm-stream">${history.map(m=>`<div class="tt-dm-bubble ${m.from===me()?'mine':''}">
        ${m.postId?`<button data-tt-open="${m.postId}">↗ 分享的作品 · ${esc(t().posts.find(p=>p.id===m.postId)?.title||'作品')}</button>`:''}
        ${m.text?`<p>${esc(m.text)}</p>`:''}<small>${when(m.createdAt)}</small></div>`).join('')}
        ${replying?'<p class="tt-dm-typing">对方正在输入…</p>':''}</div>
      <div class="tt-dm-tools"><button data-tt-dm-reply ${replying?'disabled':''}>让对方回复</button></div>
      <form class="tt-dm-compose"><input name="text" placeholder="发送私信…" maxlength="2000" required aria-label="私信内容"><button>发送</button></form>`;
  }
  function profilePage(id){
    const p=profile(id),self=id===me(),mine=t().posts.filter(post=>post.authorId===id&&tikVisible(state(),post)),
      list=profileTab==='likes'?t().posts.filter(post=>(t().likes[id]||[]).includes(post.id)&&tikVisible(state(),post)):
      profileTab==='favorites'?t().posts.filter(post=>(t().favorites[id]||[]).includes(post.id)&&tikVisible(state(),post)):
      profileTab==='reposts'?t().posts.filter(post=>(t().reposts[id]||[]).includes(post.id)&&tikVisible(state(),post)):mine;
    return `<header class="tt-light-header"><button ${self?'data-tt-account':'data-tt-back'}>${self?esc(p.handle):icon('back')}</button>
      <b>${self?'我的主页':esc(p.name)}</b><button data-tt-settings aria-label="设置">${icon('menu')}</button></header>
      <section class="tt-profile"><div class="tt-profile-avatar">${avatar(id)}</div><h1>${esc(p.name)}${p.verified?' <i>✓</i>':''}</h1>
        <small>@${esc(p.handle)}</small><div class="tt-profile-stats"><span><b>${(t().follows[id]||[]).length}</b>关注</span>
        <span><b>${format(tikFollowers(state(),id))}</b>粉丝</span><span><b>${format(mine.reduce((n,post)=>n+countOf('likes',post.id),0))}</b>获赞</span></div>
        <p>${esc(p.bio||'还没有写简介')}</p>${p.identityPublic&&p.linkedIdentityId?
          `<small class="tt-profile-identity">公开身份 · ${esc(state().people.find(row=>row.id===p.linkedIdentityId)?.name||p.name)}</small>`:''}
        <div class="tt-profile-actions">${self?`<button data-tt-edit-profile>编辑资料</button><button data-tt-settings>设置</button>`:
          `<button class="primary" data-tt-follow="${id}">${(t().follows[me()]||[]).includes(id)?'已关注':'关注'}</button>
          <button data-tt-dm="${id}">私信</button>`}</div></section>
      <div class="tt-profile-tabs">${[['posts','作品'],['likes','喜欢'],['favorites','收藏'],['reposts','转发']].map(([key,label])=>
        `<button class="${profileTab===key?'active':''}" data-tt-profile-tab="${key}">${label}</button>`).join('')}</div>
      ${!self&&['likes','favorites'].includes(profileTab)&&t().settings.likedVisibility==='private'?
        '<p class="tt-muted">此列表仅本人可见。</p>':
        `<div class="tt-grid tt-profile-grid">${list.slice().reverse().map(post=>tile(post)).join('')}</div>`}`;
  }
  function editProfilePage(){
    const p=profile(editId||me()),ids=state().people.filter(person=>person.type!=='user'||person.id===p.id);
    return `<header class="tt-light-header"><button data-tt-back>${icon('back')}</button><h1>编辑资料</h1></header>
      <div class="tt-edit-person">${avatar(p.id)}<span><b>${esc(p.name)}</b><small>@${esc(p.handle)}</small></span></div>
      <form class="tt-edit-form">
        ${field('name','显示名称',p.name)}${field('handle','用户名',p.handle)}
        ${area('bio','个人简介',p.bio,4)}
        <label class="tt-field"><span>头像 · 从相册选择</span><input name="avatarFile" type="file" accept="image/*"></label>
        ${field('avatar','头像直链',p.avatar,'url')}
        ${select('fameTier','基础名气',[['ordinary','普通人'],['niche','圈内知名'],['creator','创作者'],['celebrity','公众人物']],p.fameTier)}
        ${field('baseFollowers','基础粉丝数',p.baseFollowers,'number')}
        ${select('verifiedType','认证类型',[['none','未认证'],['creator','创作者'],['public-figure','公众人物'],['organization','机构']],p.verifiedType)}
        <label class="tt-checkbox">显示认证标识<input name="verified" type="checkbox" ${p.verified?'checked':''}></label>
        ${select('linkedIdentityId','绑定现实身份',[['','不绑定'],...ids.map(row=>[row.id,row.name||row.id])],p.linkedIdentityId)}
        <label class="tt-checkbox">向其他用户公开身份关联<input name="identityPublic" type="checkbox" ${p.identityPublic?'checked':''}></label>
        <button class="tt-save">保存资料</button>
      </form>`;
  }
  function settingsPage(){
    const db=t(),s=db.settings,a=s.api||{},last=s.lastRefreshAt[db.groupId];
    return `<header class="tt-light-header"><button data-tt-back>${icon('back')}</button><h1>设置与隐私</h1></header>
      <section class="tt-settings-hero"><span>FOR YOUR WORLD</span><h2>让下一段动态发生</h2><p>素材、人物和世界规则在这里汇合；刷新只追加新作品。</p>
        <button data-tt-refresh ${refreshing?'disabled':''}>${refreshing?'正在生成…':'↻ 一键生成推荐'}</button>
        <small>${last?'上次刷新 · '+when(last):'还没有生成过推荐'}</small></section>
      <form class="tt-settings-form"><section class="tt-setting-card"><h2>生成节奏</h2>
        ${field('batchPosts','每次作品数',s.batchPosts,'number')}
        ${field('batchComments','每次评论数',s.batchComments,'number')}
        ${select('autoMode','自动刷新',[['off','关闭'],['on-open','每次进入'],['interval','按时间间隔'],['activity','USER 发布达到次数']],s.autoMode)}
        ${field('autoMinutes','时间间隔（分钟）',s.autoMinutes,'number')}
        ${field('activityThreshold','发布次数阈值',s.activityThreshold,'number')}
        <label class="tt-checkbox">角色回应 USER 新作品<input name="respondToUserPosts" type="checkbox" ${s.respondToUserPosts?'checked':''}></label>
        <label class="tt-checkbox">自动播放视频<input name="autoplay" type="checkbox" ${s.autoplay?'checked':''}></label>
        ${select('likedVisibility','喜欢列表可见范围',[['private','仅自己'],['public','公开']],s.likedVisibility)}
      </section><section class="tt-setting-card"><h2>专用 API</h2>
        ${select('modelMode','模型来源',[['main','使用主 API'],['dedicated','TikTok 专用 API']],s.modelMode)}
        ${select('provider','服务商',[['OpenAI','OpenAI'],['DeepSeek','DeepSeek'],['Google','Google'],['Claude','Claude'],['Grok','Grok'],['第三方中转站','第三方中转站']],a.provider||'OpenAI')}
        ${field('baseUrl','接口地址',a.baseUrl||providerDefaults(a.provider||'OpenAI').baseUrl,'url')}
        ${field('apiKey','API Key',a.apiKey||'','password')}
        ${field('model','模型名称',a.model||'')}
        <button type="button" data-tt-test-api>测试连接</button>
      </section><section class="tt-setting-card"><h2>专用世界书</h2>
        ${select('worldbookId','绑定世界书',[['','不绑定'],...(state().worldbooks||[]).map(book=>[book.id,book.name])],s.worldbookId)}
        <button type="button" data-tt-worldbook>编辑 / 新建世界书</button>
        ${area('worldIntro','世界观介绍',s.worldIntro,4)}
        ${area('rules','短视频社区规则 / 文风',s.rules,5)}
        <small>模型只拿到当前世界可知的事实；本地素材 ID 和作者仍由程序验证。</small>
      </section><button class="tt-save">保存设置</button></form>
      <section class="tt-setting-card"><h2>视频与照片素材库</h2><p>从相册批量导入，或粘贴直链。AI 可选这些素材写标题、文案和评论。</p>
        <label class="tt-upload-pick">批量上传<input data-tt-library-files type="file" accept="video/*,image/*" multiple hidden></label>
        <form class="tt-library-url"><input name="url" type="url" placeholder="https://… 视频或图片直链" required>
          <select name="kind"><option value="video">视频</option><option value="photo">图片</option></select><button>添加</button></form>
        <div class="tt-library-list">${db.mediaLibrary.filter(a=>!a.deleted&&(!a.groupId||a.groupId===db.groupId)).map(asset=>
          `<div class="tt-asset-row"><b>${asset.kind==='video'?'▶':'▧'} ${esc(asset.name)}</b>
            <input data-tt-asset-note="${asset.id}" value="${esc(asset.note||'')}" placeholder="描述画面，供 AI 写文案" maxlength="240">
            <button data-tt-save-asset-note="${asset.id}">保存描述</button><button data-tt-remove-asset="${asset.id}">移除</button></div>`).join('')||
          '<p>还没有素材。无素材时 AI 只会生成图文卡。</p>'}</div></section>
      <section class="tt-setting-card"><h2>网络 NPC 头像池</h2><p>从相册批量上传，或每行粘贴一个图床链接。新创作者会随机获得头像。</p>
        <label class="tt-upload-pick">批量上传头像<input data-tt-avatar-files type="file" accept="image/*" multiple hidden></label>
        <form class="tt-avatar-urls"><textarea name="urls" rows="3" placeholder="每行一个 https:// 图片地址"></textarea><button>添加地址</button></form>
        <div class="tt-avatar-pool">${db.avatarPool.map(asset=>`<div>${asset.mediaId?
          `<img data-tik-media="${esc(asset.mediaId)}" alt="">`:`<img src="${esc(url(asset.url))}" alt="">`}
          <button data-tt-remove-avatar="${asset.id}">×</button></div>`).join('')}</div></section>
      <section class="tt-setting-card"><h2>世界与网络身份</h2>
        ${select('worldSwitch','当前世界',(state().chatGroups||[]).map(group=>[group.id,group.name]),db.groupId)}
        <select data-tt-identity>${people().map(id=>`<option value="${id}">${esc(profile(id).name)} · @${esc(profile(id).handle)}</option>`).join('')}</select>
        <button data-tt-edit-identity>编辑选中身份</button></section>`;
  }
  function soundPage(){
    const list=visible().filter(post=>post.sound===soundName);
    return `<header class="tt-light-header"><button data-tt-back>${icon('back')}</button><h1>声音</h1></header>
      <div class="tt-sound-cover">${icon('music')}<span><b>${esc(soundName)}</b><small>${list.length} 条作品使用这个声音</small></span></div>
      <div class="tt-grid">${list.map(p=>tile(p)).join('')}</div>`;
  }
  function livePage(){
    const actors=people().filter(id=>id!==me()).slice(0,12);
    return `<header class="tt-light-header"><button data-tt-back>${icon('back')}</button><h1>LIVE</h1></header>
      <section class="tt-live-hero"><span>LIVE / WORLD</span><h2>正在这个世界里</h2><p>进入角色的图文直播间，发送弹幕，再让 AI 续写现场。真实视频仍从你的素材库播放。</p></section>
      <section class="tt-section"><h2>正在开播</h2>${actors.map(id=>`<button class="tt-live-card" data-tt-live-room="${id}">
        ${avatar(id)}<span><b>${esc(profile(id).name)}</b><small>${esc(profile(id).bio||'来看看此刻正在发生什么')}</small></span><i>LIVE</i></button>`).join('')||'<p class="tt-muted">当前世界还没有创作者。</p>'}</section>`;
  }
  function liveRoom(){
    const host=profile(liveHostId),room=t().live[t().groupId+':'+liveHostId],history=room?.messages||[],
      latest=visible().filter(post=>post.authorId===liveHostId).at(-1),viewers=Math.max(12,
        Math.round((Number(host.baseFollowers)||0)*.015)+history.length);
    return `<div class="tt-live-room"><header><button data-tt-back>${icon('back')}</button>${avatar(liveHostId)}
      <span><b>${esc(host.name)}</b><small>图文现场 · ${format(viewers)} 人在看</small></span><i>LIVE</i></header>
      <div class="tt-live-scene" style="--tt-cover:${esc(latest?.coverColor||'#31445a')}">
        <span>LIVE FROM ${esc(t().groupId.toUpperCase())}</span><h2>${esc(latest?.title||'此刻，刚好在线')}</h2>
        <p>${esc(latest?.caption||host.bio||'主播正在等第一条弹幕。')}</p>
        <small>图文直播模拟 · 没有真实视频信号</small></div>
      <div class="tt-live-chat">${history.map(row=>`<p><b>${esc(profile(row.authorId).name)}</b> ${esc(row.text)}</p>`).join('')||
        '<p class="tt-live-intro">现场还安静。说一句话，或让直播继续。</p>'}</div>
      <div class="tt-live-controls"><button data-tt-live-next ${liveLoading?'disabled':''}>${liveLoading?'现场继续中…':'↻ 让现场继续'}</button>
        <form class="tt-live-compose"><input name="text" maxlength="240" placeholder="发一条弹幕…" required><button>发送</button></form></div></div>`;
  }
  function bind(root){
    root.querySelectorAll('[data-tt-nav]').forEach(button=>button.onclick=()=>{
      const nextPage=button.dataset.ttNav;
      if(nextPage==='profile'){profileId=me();profileTab='posts'}
      if(nextPage==='create'){selectedKind='story';selectedFile=null;previewUrl=''}
      go(nextPage);
    });
    root.querySelectorAll('[data-tt-back]').forEach(button=>button.onclick=back);
    root.querySelectorAll('[data-tt-settings]').forEach(button=>button.onclick=()=>go('settings'));
    root.querySelectorAll('[data-tt-refresh]').forEach(button=>button.onclick=()=>void refresh());
    root.querySelector('[data-tt-live]')?.addEventListener('click',()=>go('live'));
    root.querySelectorAll('[data-tt-live-room]').forEach(button=>button.onclick=()=>{
      liveHostId=button.dataset.ttLiveRoom;go('live-room')});
    root.querySelector('[data-tt-live-next]')?.addEventListener('click',()=>void advanceLive());
    root.querySelector('.tt-live-compose')?.addEventListener('submit',event=>{
      event.preventDefault();const value=event.target.elements.text.value.trim();if(!value)return;
      try{store.update(s=>tikLiveMessage(s,{hostId:liveHostId,authorId:me(),text:value}));render(root)}
      catch(error){showToast(error.message)}
    });
    root.querySelectorAll('[data-tt-tab]').forEach(button=>button.onclick=()=>{tab=button.dataset.ttTab;index=0;render(root)});
    root.querySelectorAll('[data-tt-person]').forEach(button=>button.onclick=()=>{
      profileId=button.dataset.ttPerson;profileTab='posts';go('person')});
    root.querySelectorAll('[data-tt-open]').forEach(button=>button.onclick=()=>{
      tab='for-you';const list=posts(),found=list.findIndex(p=>p.id===button.dataset.ttOpen);
      index=Math.max(0,found);
      if(index<0)index=0;go('home');
    });
    root.querySelectorAll('[data-tt-follow]').forEach(button=>button.onclick=()=>{
      store.update(s=>tikFollow(s,button.dataset.ttFollow,me()));render(root)});
    root.querySelectorAll('[data-tt-toggle]').forEach(button=>button.onclick=()=>{
      let enabled=false;store.update(s=>{enabled=tikToggle(s,button.dataset.ttToggle,button.dataset.id,me())});
      if(button.dataset.ttToggle==='notInterested'&&enabled)index=0;render(root)});
    root.querySelectorAll('[data-tt-comments]').forEach(button=>button.onclick=()=>openComments(button.dataset.ttComments));
    root.querySelectorAll('[data-tt-share]').forEach(button=>button.onclick=()=>share(button.dataset.ttShare));
    root.querySelectorAll('[data-tt-sound]').forEach(button=>button.onclick=()=>{
      soundName=button.dataset.ttSound;go('sound')});
    root.querySelectorAll('[data-tt-profile-tab]').forEach(button=>button.onclick=()=>{
      profileTab=button.dataset.ttProfileTab;render(root)});
    root.querySelector('[data-tt-edit-profile]')?.addEventListener('click',()=>{editId=me();go('edit-profile')});
    root.querySelector('[data-tt-account]')?.addEventListener('click',accountPicker);
    root.querySelector('[data-tt-edit-identity]')?.addEventListener('click',()=>{
      editId=root.querySelector('[data-tt-identity]').value;go('edit-profile')});
    root.querySelector('[data-tt-inbox-dm]')?.addEventListener('click',()=>
      root.querySelector('.tt-inbox-peer')?.scrollIntoView({block:'center',behavior:'smooth'}));
    root.querySelectorAll('[data-tt-dm]').forEach(button=>button.onclick=()=>{
      peerId=button.dataset.ttDm;go('dm')});
    root.querySelector('[data-tt-new-dm]')?.addEventListener('click',newDm);
    root.querySelector('.tt-dm-compose')?.addEventListener('submit',event=>{
      event.preventDefault();const text=event.target.elements.text.value.trim();if(!text)return;
      try{store.update(s=>tikDm(s,{from:me(),to:peerId,text}));render(root);void dmReply(peerId)}
      catch(error){showToast(error.message)}
    });
    root.querySelector('[data-tt-dm-reply]')?.addEventListener('click',()=>void dmReply(peerId));
    const stage=root.querySelector('[data-tt-stage]');
    if(stage){
      let startY=0,lastTap=0;
      stage.addEventListener('touchstart',event=>{startY=event.touches[0]?.clientY||0},{passive:true});
      stage.addEventListener('touchend',event=>{
        if(event.target.closest('button,input'))return;
        const delta=(event.changedTouches[0]?.clientY||0)-startY;
        if(Math.abs(delta)>45)next(delta<0?1:-1);
      },{passive:true});
      stage.addEventListener('wheel',event=>{
        if(Date.now()-lastWheel<550)return;lastWheel=Date.now();next(event.deltaY>0?1:-1)
      },{passive:true});
      stage.addEventListener('click',event=>{
        if(event.target.closest('button,input'))return;
        if(Date.now()-lastTap<320){store.update(s=>tikToggle(s,'likes',stage.dataset.post,me()));render(root)}
        else{const video=stage.querySelector('video');if(video){video.paused?video.play():video.pause();paused=video.paused;
          root.querySelector('.tt-video-pause')?.classList.toggle('visible',paused)}}
        lastTap=Date.now();
      });
      root.querySelector('[data-tt-play]')?.addEventListener('click',()=>{
        const video=stage.querySelector('video');if(!video)return;video.paused?video.play():video.pause();
        paused=video.paused;root.querySelector('.tt-video-pause')?.classList.toggle('visible',paused)});
      root.querySelector('[data-tt-mute]')?.addEventListener('click',event=>{
        const video=stage.querySelector('video');if(!video)return;video.muted=!video.muted;
        event.currentTarget.textContent=video.muted?'🔇':'🔊'});
      root.querySelector('[data-tt-progress]')?.addEventListener('input',event=>{
        const video=stage.querySelector('video');if(video?.duration)video.currentTime=video.duration*Number(event.target.value)/100});
    }
    root.onkeydown=event=>{if(page==='home'&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){
      if(event.key==='ArrowDown')next(1);if(event.key==='ArrowUp')next(-1)}};
    root.querySelector('.tt-search')?.addEventListener('submit',event=>{
      event.preventDefault();query=event.target.elements.q.value.trim();render(root)});
    root.querySelectorAll('[data-tt-trend]').forEach(button=>button.onclick=()=>{
      query=button.dataset.ttTrend;render(root)});
    root.querySelectorAll('[data-tt-kind]').forEach(button=>button.onclick=()=>{
      saveDraftFromForm(root.querySelector('.tt-create-form'));selectedKind=button.dataset.ttKind;
      selectedFile=null;if(previewUrl.startsWith('blob:'))URL.revokeObjectURL(previewUrl);previewUrl='';render(root)});
    root.querySelector('.tt-create-form')?.addEventListener('submit',event=>void publish(event));
    root.querySelector('[data-tt-save-draft]')?.addEventListener('click',()=>{
      saveDraftFromForm(root.querySelector('.tt-create-form'));showToast('文字草稿已保存')});
    root.querySelector('.tt-create-form input[type=file]')?.addEventListener('change',event=>{
      const file=event.target.files?.[0];if(!file)return;
      saveDraftFromForm(root.querySelector('.tt-create-form'));selectedFile=file;
      if(previewUrl.startsWith('blob:'))URL.revokeObjectURL(previewUrl);
      previewUrl=URL.createObjectURL(file);render(root)});
    root.querySelector('.tt-edit-form')?.addEventListener('submit',event=>void saveProfile(event));
    bindSettings(root);
  }
  function saveDraftFromForm(form){
    if(!form)return;const q=form.elements,row={accountId:me(),groupId:t().groupId,
      title:q.title?.value.trim()||'',body:q.body?.value.trim()||'',caption:q.caption?.value.trim()||'',
      mediaUrl:q.mediaUrl?.value.trim()||'',sound:q.sound?.value.trim()||'原声',
      coverColor:q.coverColor?.value||'#294253',visibility:q.visibility?.value||'public'};
    store.update(s=>{const db=ensureTikTok(s),i=db.drafts.findIndex(d=>d.accountId===row.accountId&&d.groupId===row.groupId);
      if(i>=0)db.drafts[i]=row;else db.drafts.push(row)});
  }
  async function publish(event){
    event.preventDefault();const form=event.target,q=form.elements,mediaUrl=q.mediaUrl?.value.trim()||'';
    if(mediaUrl&&!/^https?:\/\//i.test(mediaUrl))return showToast('媒体直链需要以 https:// 或 http:// 开头');
    if(selectedKind!=='story'&&!selectedFile&&!mediaUrl)return showToast('先上传素材或填写直链');
    let media=null;
    if(selectedFile){
      const max=selectedKind==='video'?80:12;
      if(selectedFile.size>max*1024*1024)return showToast(`请选择 ${max}MB 以内的文件`);
      if(!selectedFile.type.startsWith(selectedKind==='video'?'video/':'image/'))return showToast('文件类型与作品类型不符');
      try{const saved=await saveMediaBlob(selectedFile);
        media={kind:selectedKind,mediaId:saved.mediaId,name:selectedFile.name}}
      catch(error){return showToast(error.message)}
    }else if(mediaUrl)media={kind:selectedKind,url:mediaUrl,name:q.title.value.trim()};
    let post;try{store.update(s=>{post=tikPost(s,{authorId:me(),kind:selectedKind,media,
      title:q.title.value,body:q.body?.value||'',caption:q.caption.value,sound:q.sound.value,
      coverColor:q.coverColor.value,visibility:q.visibility.value});
      const db=ensureTikTok(s);db.drafts=db.drafts.filter(d=>d.accountId!==me()||d.groupId!==db.groupId)});
      selectedFile=null;if(previewUrl.startsWith('blob:'))URL.revokeObjectURL(previewUrl);previewUrl='';
      tab='for-you';index=0;go('home');showToast('作品已发布');
      if(t().settings.respondToUserPosts&&modelConfigured())void respondToTikTokPost(store,post.id)
        .then(()=>{if(page==='home')render(containerRef)}).catch(error=>showToast(error.message));
      if(tikAutoDue(state()))void refresh(false);
    }catch(error){showToast(error.message)}
  }
  function modelConfigured(){const s=t().settings,p=s.modelMode==='dedicated'?s.api:
    state().modelProfiles.find(row=>row.id===state().activeModelProfileId);return !!p?.apiKey&&!!p?.model}
  async function dmReply(target){
    if(replying||!modelConfigured())return;replying=true;if(page==='dm')render(containerRef);
    try{await replyToTikTokDm(store,target)}catch(error){showToast(error.message)}
    finally{replying=false;if(document.querySelector('#app-screen')?.dataset.app==='tiktok'&&page==='dm'&&peerId===target)
      render(containerRef)}
  }
  async function advanceLive(){
    if(liveLoading)return;liveLoading=true;render(containerRef);
    try{await generateTikTokLiveMoment(store,liveHostId)}catch(error){showToast(error.message)}
    finally{liveLoading=false;if(page==='live-room')render(containerRef)}
  }
  function openComments(postId){
    const post=t().posts.find(p=>p.id===postId);if(!post)return;
    const rows=t().comments.filter(c=>c.postId===postId&&!c.deleted);
    const comments=rows.filter(c=>!c.parentId).map(c=>commentHtml(c,rows)).join('');
    openSheet(`<div class="tt-comments-sheet"><h3>${rows.length} 条评论</h3>
      <div class="tt-comment-list">${comments||'<p>还没有评论。说点和这段内容有关的话。</p>'}</div>
      <form class="tt-comment-compose"><input name="text" maxlength="500" placeholder="添加评论…" aria-label="评论内容" required>
        <button>发送</button></form></div>`,{onReady(sheet){
      let parentId='';
      sheet.querySelectorAll('[data-tt-reply-comment]').forEach(button=>button.onclick=()=>{
        parentId=button.dataset.ttReplyComment;const author=profile(rows.find(c=>c.id===parentId)?.authorId);
        const input=sheet.querySelector('input[name=text]');input.placeholder='回复 @'+author.handle;input.focus()});
      sheet.querySelectorAll('[data-tt-like-comment]').forEach(button=>button.onclick=()=>{
        store.update(s=>{const row=ensureTikTok(s).comments.find(c=>c.id===button.dataset.ttLikeComment);
          if(!row)return;const i=row.likes.indexOf(me());if(i>=0)row.likes.splice(i,1);else row.likes.push(me())});
        closeSheet();openComments(postId)});
      sheet.querySelectorAll('[data-tt-comment-person]').forEach(button=>button.onclick=()=>{
        profileId=button.dataset.ttCommentPerson;profileTab='posts';closeSheet();go('person')});
      sheet.querySelector('form').onsubmit=event=>{
        event.preventDefault();const text=event.target.elements.text.value.trim();if(!text)return;
        let row;try{store.update(s=>{row=tikComment(s,{postId,authorId:me(),text,parentId})});
          closeSheet();openComments(postId);if(modelConfigured()&&post.authorId!==me())
            void replyToTikTokComment(store,row.id).then(reply=>{if(reply){closeSheet();openComments(postId)}})
              .catch(error=>showToast(error.message))
        }catch(error){showToast(error.message)}
      };
    }});
  }
  function commentHtml(c,rows){
    const p=profile(c.authorId),children=rows.filter(row=>row.parentId===c.id).slice(0,12);
    return `<div class="tt-comment"><button data-tt-comment-person="${c.authorId}">${avatar(c.authorId)}</button>
      <div><b>${esc(p.name)}</b><p>${esc(c.text)}</p><small>${when(c.createdAt)} ·
        <button data-tt-reply-comment="${c.id}">回复</button></small>
        ${children.map(child=>`<div class="tt-comment tt-comment-child">
          ${avatar(child.authorId)}<span><b>${esc(profile(child.authorId).name)}</b><p>${esc(child.text)}</p>
          <small>${when(child.createdAt)}</small></span></div>`).join('')}</div>
      <button class="tt-comment-like ${c.likes.includes(me())?'selected':''}" data-tt-like-comment="${c.id}">${icon('heart')}<small>${c.likes.length||''}</small></button></div>`;
  }
  function share(postId){
    const post=t().posts.find(p=>p.id===postId);if(!post)return;
    const friends=state().conversations.filter(c=>c.userAccountId===me()&&
      friendWorldGroup(state(),c.personId)===t().groupId);
    openSheet(`<div class="tt-share-sheet"><h3>分享这段内容</h3><p>${esc(post.title)}</p>
      <div class="tt-share-actions"><button data-tik-repost>${icon('refresh')}<span>${owned('reposts').has(postId)?'取消转发':'转发'}</span></button>
        <button data-tik-copy>${icon('share')}<span>复制简介</span></button>
        <button data-tik-uninterested>⊘<span>不感兴趣</span></button></div>
      <h4>发送 TikTok 私信</h4><div class="tt-share-peers">${people().filter(id=>id!==me()).slice(0,12).map(id=>
        `<button data-tik-send-dm="${id}">${avatar(id)}<small>${esc(profile(id).name)}</small></button>`).join('')}</div>
      <h4>分享到聊天</h4><div class="tt-share-peers">${friends.map(c=>
        `<button data-tik-send-chat="${c.id}">${avatar(c.personId)}<small>${esc(profile(c.personId).name)}</small></button>`).join('')||
        '<p>当前世界还没有可分享的聊天。</p>'}</div></div>`,{onReady(sheet){
      sheet.querySelector('[data-tik-repost]').onclick=()=>{store.update(s=>tikToggle(s,'reposts',postId,me()));
        closeSheet();render(containerRef)};
      sheet.querySelector('[data-tik-copy]').onclick=async()=>{
        try{await navigator.clipboard.writeText(`${post.title}\n${post.caption}`);showToast('已复制')}
        catch{showToast('复制失败，请检查剪贴板权限')}closeSheet()};
      sheet.querySelector('[data-tik-uninterested]').onclick=()=>{
        store.update(s=>tikToggle(s,'notInterested',postId,me()));closeSheet();index=0;render(containerRef)};
      sheet.querySelectorAll('[data-tik-send-dm]').forEach(button=>button.onclick=()=>{
        try{store.update(s=>tikDm(s,{from:me(),to:button.dataset.tikSendDm,
          text:`看到这段想发给你：《${post.title}》`,postId}));peerId=button.dataset.tikSendDm;
          closeSheet();go('dm');void dmReply(peerId)}
        catch(error){showToast(error.message)}});
      sheet.querySelectorAll('[data-tik-send-chat]').forEach(button=>button.onclick=()=>{
        const convId=button.dataset.tikSendChat;
        store.update(s=>{const conv=s.conversations.find(c=>c.id===convId&&c.userAccountId===s.activeUserAccountId);
          if(!conv)return;const text=`分享一段短视频《${post.title}》：${post.caption}`;
          (s.messages[convId]||=[]).push({id:crypto.randomUUID(),role:'user',type:'text',text,
            sourceTikTokPostId:postId,time:new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}),
            createdAt:Date.now()});conv.preview=text;conv.time=new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})});
        closeSheet();showToast('已分享到聊天')});
    }});
  }
  function accountPicker(){
    openSheet(`<h3>切换 TikTok 账号</h3>${state().people.filter(p=>p.type==='user').map(p=>
      `<button class="button secondary" data-tik-account="${p.id}">${esc(profile(p.id).name)} ${p.id===me()?'✓':''}</button>`).join('')}
      <p class="tt-muted">账号的私信、喜欢、收藏与观看记录分别保存。</p>`,{onReady(sheet){
      sheet.querySelectorAll('[data-tik-account]').forEach(button=>button.onclick=()=>{
        store.update(s=>switchAccount(s,button.dataset.tikAccount));profileId=me();index=0;
        closeSheet();render(containerRef)})}});
  }
  function newDm(){
    openSheet(`<h3>新私信</h3>${people().filter(id=>id!==me()).map(id=>
      `<button class="button secondary" data-tik-peer="${id}">${esc(profile(id).name)}</button>`).join('')}`,{onReady(sheet){
      sheet.querySelectorAll('[data-tik-peer]').forEach(button=>button.onclick=()=>{
        peerId=button.dataset.tikPeer;closeSheet();go('dm')})}});
  }
  async function saveProfile(event){
    event.preventDefault();const q=event.target.elements,p=profile(editId),name=q.name.value.trim().slice(0,36),
      handle=q.handle.value.trim().replace(/^@/,'').replace(/[^a-zA-Z0-9_]/g,'').slice(0,24);
    if(!name||!handle)return showToast('名字和用户名不能为空');
    if(Object.values(t().profiles).some(row=>row.id!==editId&&row.handle.toLowerCase()===handle.toLowerCase()))
      return showToast('用户名已被使用');
    if(q.avatar.value.trim()&&!/^https?:\/\//i.test(q.avatar.value.trim()))return showToast('头像地址需要完整链接');
    let mediaId='';const file=q.avatarFile.files?.[0];
    if(file){if(!file.type.startsWith('image/')||file.size>8*1024*1024)return showToast('请选择 8MB 以内的图片');
      try{mediaId=(await saveMediaBlob(file)).mediaId}catch(error){return showToast(error.message)}}
    store.update(s=>{const row=ensureTikTok(s).profiles[editId];
      Object.assign(row,{name,handle,bio:q.bio.value.trim().slice(0,160),avatar:url(q.avatar.value.trim()),
        fameTier:q.fameTier.value,baseFollowers:clamp(q.baseFollowers.value,0,100000000,p.baseFollowers),
        verifiedType:q.verifiedType.value,verified:q.verified.checked,
        linkedIdentityId:q.linkedIdentityId.value,identityPublic:q.identityPublic.checked});
      if(mediaId)row.avatarMediaId=mediaId;else if(q.avatar.value.trim())row.avatarMediaId=''});
    profileId=editId;showToast('资料已保存');go(editId===me()?'profile':'person');
  }
  function bindSettings(root){
    const form=root.querySelector('.tt-settings-form');if(!form)return;
    form.onsubmit=event=>{event.preventDefault();const q=form.elements;
      store.update(s=>{const setting=ensureTikTok(s).settings;
        Object.assign(setting,{batchPosts:clamp(q.batchPosts.value,1,8,4),
          batchComments:clamp(q.batchComments.value,0,24,8),autoMode:q.autoMode.value,
          autoMinutes:clamp(q.autoMinutes.value,15,1440,180),
          activityThreshold:clamp(q.activityThreshold.value,1,20,3),
          respondToUserPosts:q.respondToUserPosts.checked,autoplay:q.autoplay.checked,
          likedVisibility:q.likedVisibility.value,modelMode:q.modelMode.value,
          api:{provider:q.provider.value,baseUrl:q.baseUrl.value.trim(),
            apiKey:q.apiKey.value.trim(),model:q.model.value.trim()},
          worldbookId:q.worldbookId.value,worldIntro:q.worldIntro.value.trim(),
          rules:q.rules.value.trim()})});
      showToast('TikTok 设置已保存');render(root)};
    form.elements.provider.onchange=()=>form.elements.baseUrl.value=providerDefaults(form.elements.provider.value).baseUrl;
    root.querySelector('[data-tt-test-api]').onclick=async()=>{
      const q=form.elements,model=q.modelMode.value==='main'?
        state().modelProfiles.find(p=>p.id===state().activeModelProfileId):
        {provider:q.provider.value,baseUrl:q.baseUrl.value,apiKey:q.apiKey.value,model:q.model.value};
      try{showToast('正在测试…');showToast('模型可用 · '+await testModelConnection(model))}
      catch(error){showToast(error.message)}};
    root.querySelector('[data-tt-worldbook]').onclick=()=>editWorldbook(form.elements.worldbookId.value);
    root.querySelector('[name=worldSwitch]').onchange=event=>{
      store.update(s=>ensureTikTok(s).groupId=event.target.value);index=0;render(root)};
    root.querySelector('[data-tt-library-files]').onchange=async event=>{
      let added=0;for(const file of [...event.target.files].slice(0,24)){
        const kind=file.type.startsWith('video/')?'video':file.type.startsWith('image/')?'photo':'';
        if(!kind||file.size>(kind==='video'?80:12)*1024*1024)continue;
        try{const saved=await saveMediaBlob(file);store.update(s=>ensureTikTok(s).mediaLibrary.push({
          id:crypto.randomUUID(),groupId:ensureTikTok(s).groupId,kind,mediaId:saved.mediaId,name:file.name,createdAt:Date.now()}));added++}
        catch(error){showToast(error.message);break}
      }showToast(`已导入 ${added} 个素材`);render(root)};
    root.querySelector('.tt-library-url').onsubmit=event=>{
      event.preventDefault();const q=event.target.elements,link=q.url.value.trim();
      try{new URL(link)}catch{return showToast('请填写完整链接')}
      if(!/^https?:\/\//i.test(link))return showToast('请填写完整链接');
      store.update(s=>ensureTikTok(s).mediaLibrary.push({id:crypto.randomUUID(),groupId:ensureTikTok(s).groupId,
        kind:q.kind.value,url:link,name:new URL(link).pathname.split('/').at(-1)||'远程素材',
        createdAt:Date.now()}));showToast('素材已加入');render(root)};
    root.querySelectorAll('[data-tt-remove-asset]').forEach(button=>button.onclick=()=>{
      store.update(s=>{const item=ensureTikTok(s).mediaLibrary.find(a=>a.id===button.dataset.ttRemoveAsset);
        if(item)item.deleted=true});render(root)});
    root.querySelectorAll('[data-tt-save-asset-note]').forEach(button=>button.onclick=()=>{
      const value=root.querySelector(`[data-tt-asset-note="${button.dataset.ttSaveAssetNote}"]`)?.value||'';
      store.update(s=>{const item=ensureTikTok(s).mediaLibrary.find(a=>a.id===button.dataset.ttSaveAssetNote);
        if(item)item.note=value.trim().slice(0,240)});showToast('素材画面描述已保存')});
    root.querySelector('[data-tt-avatar-files]').onchange=async event=>{
      let added=0;for(const file of [...event.target.files].slice(0,40)){
        if(!file.type.startsWith('image/')||file.size>8*1024*1024)continue;
        try{const saved=await saveMediaBlob(file);store.update(s=>ensureTikTok(s).avatarPool.push({
          id:crypto.randomUUID(),mediaId:saved.mediaId,assignedTo:''}));added++}
        catch(error){showToast(error.message);break}
      }showToast(`已添加 ${added} 张头像`);render(root)};
    root.querySelector('.tt-avatar-urls').onsubmit=event=>{
      event.preventDefault();const links=event.target.elements.urls.value.split(/[\r\n]+/).map(v=>v.trim())
        .filter(v=>/^https?:\/\//i.test(v)).slice(0,80);
      store.update(s=>{const pool=ensureTikTok(s).avatarPool;
        for(const link of links)if(!pool.some(a=>a.url===link))pool.push({
          id:crypto.randomUUID(),url:link,assignedTo:''})});
      showToast(`已添加 ${links.length} 条地址`);render(root)};
    root.querySelectorAll('[data-tt-remove-avatar]').forEach(button=>button.onclick=()=>{
      store.update(s=>{const db=ensureTikTok(s);
        db.avatarPool=db.avatarPool.filter(a=>a.id!==button.dataset.ttRemoveAvatar)});
      render(root)});
  }
  function editWorldbook(bookId){
    const old=state().worldbooks.find(b=>b.id===bookId),entries=old?.entries?.length?old.entries:
      [{id:crypto.randomUUID(),name:'短视频社区',content:''}];
    const row=entry=>`${field('entryName','条目名称',entry.name)}${area('entryContent','内容',entry.content,4)}`;
    openSheet(`<form class="tt-worldbook-editor"><h3>${old?'编辑 TikTok 世界书':'新建 TikTok 世界书'}</h3>
      ${field('bookName','名称',old?.name||'TikTok 专用世界书')}
      <div data-tt-entries>${entries.map(row).join('')}</div>
      <button class="button secondary" type="button" data-tt-add-entry>添加条目</button>
      <button class="button">保存并绑定</button></form>`,{onReady(sheet){
      sheet.querySelector('[data-tt-add-entry]').onclick=()=>sheet.querySelector('[data-tt-entries]')
        .insertAdjacentHTML('beforeend',row({name:'',content:''}));
      sheet.querySelector('form').onsubmit=event=>{
        event.preventDefault();const data=new FormData(event.target),names=data.getAll('entryName'),
          contents=data.getAll('entryContent');
        const book={id:old?.id||'wb-tik-'+crypto.randomUUID(),name:String(data.get('bookName')).trim(),
          enabled:true,entries:names.map((name,i)=>({id:entries[i]?.id||crypto.randomUUID(),
            name:String(name).trim(),content:String(contents[i]).trim(),mode:'constant',keywords:[]}))};
        if(!book.name||book.entries.some(entry=>!entry.name||!entry.content))
          return showToast('请填写每个世界书条目');
        store.update(s=>{const index=s.worldbooks.findIndex(b=>b.id===book.id);
          if(index>=0)s.worldbooks[index]=book;else s.worldbooks.push(book);
          ensureTikTok(s).settings.worldbookId=book.id});
        closeSheet();showToast('世界书已绑定');render(containerRef)};
    }});
  }
  return render;
}
