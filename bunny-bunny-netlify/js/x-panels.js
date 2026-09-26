import {escapeHtml as esc,openSheet,closeSheet,showToast} from './core/ui.js';
import {ensureX} from './x-model.js';
import {friendWorldGroup} from './account-system.js';
import {saveMediaBlob,getMediaUrl} from './media-store.js';
import {providerDefaults,testModelConnection} from './integrations/ai-client.js';
const url=v=>/^(https?:\/\/|blob:|data:image\/)/i.test(String(v||''))?String(v):'';
const f=(key,label,value='',type='text')=>`<label class="x-panel-field"><span>${label}</span><input name="${key}" type="${type}" value="${esc(value||'')}"></label>`;
const a=(key,label,value='')=>`<label class="x-panel-field"><span>${label}</span><textarea name="${key}" rows="4">${esc(value||'')}</textarea></label>`;
const sel=(key,label,opts,value)=>`<label class="x-panel-field"><span>${label}</span><select name="${key}">${opts.map(([id,text])=>`<option value="${esc(id)}" ${id===value?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`;
const clamp=(value,min,max,fallback)=>Math.max(min,Math.min(max,Number.isFinite(Number(value))?Number(value):fallback));

export function renderXSettings(state){
 const x=ensureX(state),s=x.settings,api=s.api||{},last=s.lastRefreshAt[x.groupId];
 const ids=[...state.people.filter(p=>p.type==='user'||friendWorldGroup(state,p.id)===x.groupId).map(p=>x.profiles[p.id]),...Object.values(x.profiles).filter(p=>p.kind==='network-npc'&&p.groupId===x.groupId)].filter(Boolean);
 return `<div class="x-title"><button data-x-back>‹</button><h2>X 设置</h2></div>
 <section class="x-panel-hero"><b>让这个世界继续发生</b><p>刷新会增加贴文和评论，已有时间线会保留。</p><button data-x-refresh-now>↻ 一键刷新主页</button><small>${last?'上次刷新：'+new Date(last).toLocaleString('zh-CN'):'尚未生成过动态'}</small></section>
 <form class="x-settings-form"><section class="x-panel-card"><h3>生成节奏</h3>
 ${f('batchPosts','每次主贴条数',s.batchPosts,'number')}${f('batchComments','每次评论条数',s.batchComments,'number')}
 ${sel('autoMode','自动刷新',[['off','关闭'],['on-open','进入 X 时'],['interval','按时间间隔'],['activity','USER 发帖达到次数']],s.autoMode)}
 ${f('autoMinutes','时间间隔（分钟）',s.autoMinutes,'number')}${f('activityThreshold','发帖次数阈值',s.activityThreshold,'number')}
 <label class="x-panel-toggle"><span>角色回应 USER 新帖<small>可能点赞或写具体评论。</small></span><input name="respondToUserPosts" type="checkbox" ${s.respondToUserPosts?'checked':''}></label></section>
 <section class="x-panel-card"><h3>X 专用 API</h3>
 ${sel('modelMode','模型来源',[['main','默认主 API'],['dedicated','X 专用 API']],s.modelMode)}
 ${sel('provider','服务商',[['OpenAI','OpenAI'],['DeepSeek','DeepSeek'],['Google','Google'],['Claude','Claude'],['Grok','Grok'],['第三方中转站','第三方中转站']],api.provider||'OpenAI')}
 ${f('baseUrl','接口地址',api.baseUrl||providerDefaults(api.provider||'OpenAI').baseUrl,'url')}
 ${f('apiKey','API Key',api.apiKey,'password')}${f('model','模型名称',api.model)}
 <button type="button" data-x-test-api>测试连接</button></section>
 <section class="x-panel-card"><h3>世界书与专用规则</h3>
 ${sel('worldbookId','绑定世界书',[['','不绑定'],...(state.worldbooks||[]).map(book=>[book.id,book.name])],s.worldbookId)}
 <button type="button" data-x-edit-worldbook>编辑绑定世界书 / 新建</button>
 ${a('worldIntro','X 的世界观介绍',s.worldIntro)}${a('rules','发帖与互动规则',s.rules)}${a('extensionRules','扩展文风 / 破限设定',s.extensionRules)}
 <small>真实身份与世界归属仍由程序校验。</small></section><button class="x-panel-save">保存 X 设置</button></form>
 <section class="x-panel-card"><h3>网络 NPC 头像池</h3><p>批量上传图片或粘贴图床直链，新网友会轮流使用。</p>
 <label class="x-panel-minor">从相册批量上传<input type="file" accept="image/*" multiple data-x-avatar-batch hidden></label>
 <form class="x-avatar-url-form"><textarea name="urls" rows="3" placeholder="每行一个 https:// 图片直链"></textarea><button>添加图床地址</button></form>
 <div class="x-pool-grid">${x.avatarPool.map(asset=>`<div><span>${asset.mediaId?`<img data-x-asset="${esc(asset.mediaId)}" alt="">`:`<img src="${esc(url(asset.url))}" alt="">`}</span><button data-x-pool-remove="${esc(asset.id)}">×</button></div>`).join('')||'<small>还没有网友头像。</small>'}</div></section>
 <section class="x-panel-card"><h3>管理网络身份</h3><p>USER、CHAR 和 NPC 的资料、名气、认证和现实身份分别设置。</p>
 <select data-x-identity>${ids.map(p=>`<option value="${esc(p.id)}">${esc(p.name)} · @${esc(p.handle)}</option>`).join('')}</select><button data-x-edit-identity>编辑选中账号</button></section>`;
}
export function bindXSettings(root,store,{render,refresh,editProfile}){
 const form=root.querySelector('.x-settings-form');if(!form)return;
 form.onsubmit=e=>{e.preventDefault();const q=form.elements;store.update(state=>{const s=ensureX(state).settings;Object.assign(s,{
 batchPosts:clamp(q.batchPosts.value,1,8,5),batchComments:clamp(q.batchComments.value,0,20,9),autoMode:q.autoMode.value,
 autoMinutes:clamp(q.autoMinutes.value,15,1440,180),activityThreshold:clamp(q.activityThreshold.value,1,20,4),
 respondToUserPosts:q.respondToUserPosts.checked,modelMode:q.modelMode.value,worldbookId:q.worldbookId.value,
 api:{provider:q.provider.value,baseUrl:q.baseUrl.value.trim(),apiKey:q.apiKey.value.trim(),model:q.model.value.trim()},
 worldIntro:q.worldIntro.value.trim(),rules:q.rules.value.trim(),extensionRules:q.extensionRules.value.trim()})});showToast('X 设置已保存');render()};
 form.elements.provider.onchange=()=>form.elements.baseUrl.value=providerDefaults(form.elements.provider.value).baseUrl;
 root.querySelector('[data-x-refresh-now]').onclick=()=>void refresh();
 root.querySelector('[data-x-test-api]').onclick=async()=>{try{const q=form.elements,model=q.modelMode.value==='main'?
 store.getState().modelProfiles.find(p=>p.id===store.getState().activeModelProfileId):
 {provider:q.provider.value,baseUrl:q.baseUrl.value,apiKey:q.apiKey.value,model:q.model.value};showToast('正在测试…');
 showToast('模型可用 · '+await testModelConnection(model))}catch(error){showToast(error.message)}};
 root.querySelector('[data-x-edit-worldbook]').onclick=()=>editWorldbook(store,form.elements.worldbookId.value,render);
 root.querySelector('[data-x-edit-identity]').onclick=()=>editProfile(root.querySelector('[data-x-identity]').value);
 root.querySelector('[data-x-avatar-batch]').onchange=async e=>{let n=0;for(const file of [...e.target.files].slice(0,40)){
 if(!file.type.startsWith('image/')||file.size>8*1024*1024)continue;
 try{const media=await saveMediaBlob(file);store.update(s=>ensureX(s).avatarPool.push({id:crypto.randomUUID(),mediaId:media.mediaId,assignedTo:''}));n++}
 catch(error){showToast(error.message);break}}showToast(`已添加 ${n} 张头像`);render()};
 root.querySelector('.x-avatar-url-form').onsubmit=e=>{e.preventDefault();const lines=e.target.elements.urls.value.split(/[\r\n]+/).map(v=>v.trim()).filter(Boolean).slice(0,80);
 const good=lines.filter(v=>{try{return ['http:','https:'].includes(new URL(v).protocol)}catch{return false}});
 store.update(s=>{const pool=ensureX(s).avatarPool;for(const link of good)if(!pool.some(item=>item.url===link))pool.push({id:crypto.randomUUID(),url:link,assignedTo:''})});
 showToast(`已添加 ${good.length} 条地址`);render()};
 root.querySelectorAll('[data-x-pool-remove]').forEach(b=>b.onclick=()=>{store.update(s=>ensureX(s).avatarPool=s.xSocial.avatarPool.filter(item=>item.id!==b.dataset.xPoolRemove));render()});
 void hydrateXAssets(root,store.getState());
}
function editWorldbook(store,id,render){
 const old=store.getState().worldbooks.find(b=>b.id===id),entries=old?.entries?.length?old.entries:[{id:crypto.randomUUID(),name:'X 世界观',content:''}];
 openSheet(`<form class="x-book-editor"><h3>${old?'编辑 X 世界书':'新建 X 世界书'}</h3>${f('bookName','名称',old?.name||'X 专用世界书')}
 <div data-book-entries>${entries.map(row=>`${f('entryName','条目名称',row.name)}${a('entryContent','内容',row.content)}`).join('')}</div>
 <button type="button" data-add-entry>添加条目</button><button class="button">保存并绑定</button></form>`,{onReady(sheet){
 sheet.querySelector('[data-add-entry]').onclick=()=>sheet.querySelector('[data-book-entries]').insertAdjacentHTML('beforeend',f('entryName','条目名称')+a('entryContent','内容'));
 sheet.querySelector('form').onsubmit=e=>{e.preventDefault();const d=new FormData(e.target),names=d.getAll('entryName'),contents=d.getAll('entryContent');
 const key=old?.id||'wb-x-'+crypto.randomUUID(),book={id:key,name:String(d.get('bookName')).trim(),
 entries:names.map((name,i)=>({id:entries[i]?.id||crypto.randomUUID(),name:String(name).trim(),content:String(contents[i]).trim(),mode:'constant',keywords:[]})),enabled:true};
 if(!book.name||book.entries.some(row=>!row.name||!row.content))return showToast('请填写每个条目');
 store.update(s=>{const row=s.worldbooks.find(b=>b.id===key);if(row)Object.assign(row,book);else s.worldbooks.push(book);ensureX(s).settings.worldbookId=key});
 closeSheet();render();showToast('世界书已绑定');
 };}});
}
export async function hydrateXAssets(root,state){
 for(const img of root.querySelectorAll('[data-x-asset]')){const src=await getMediaUrl(img.dataset.xAsset);if(img.isConnected&&src)img.src=src}
 for(const img of root.querySelectorAll('[data-x-pool]')){const item=ensureX(state).avatarPool.find(row=>row.id===img.dataset.xPool);
 const src=item?.mediaId?await getMediaUrl(item.mediaId):url(item?.url);if(img.isConnected&&src)img.src=src}
}

export function renderXProfileEditor(state,id){
 const x=ensureX(state),p=x.profiles[id];if(!p)return '<p class="x-note">账号不存在</p>';
 const people=state.people.filter(row=>row.type!=='user'||row.id===id);
 return `<div class="x-title"><button data-x-back>‹</button><h2>编辑 X 身份</h2></div>
 <div class="x-edit-identity"><div class="x-edit-avatar">${p.avatarAssetId?`<img data-x-pool="${esc(p.avatarAssetId)}" alt="">`:p.avatarMediaId?`<img data-x-asset="${esc(p.avatarMediaId)}" alt="">`:p.avatar?`<img src="${esc(url(p.avatar))}" alt="">`:esc(p.name.slice(0,1))}</div><span><b>${esc(p.name)}</b><small>@${esc(p.handle)}</small></span></div>
 <form class="x-profile-editor">
 <section class="x-panel-card"><h3>公开资料</h3>${f('name','显示名称',p.name)}${f('handle','用户名 @',p.handle)}
 ${a('bio','个人简介',p.bio)}${f('signature','个性签名',p.signature)}${f('pronouns','称呼 / 代词',p.pronouns)}
 ${f('occupation','职业 / 身份',p.occupation)}${f('interests','兴趣关键词',p.interests)}
 ${f('location','所在地',p.location)}${f('website','个人网站',p.website,'url')}${f('birthday','生日',p.birthday,'date')}
 <label class="x-panel-field"><span>头像 · 相册上传</span><input name="avatarFile" type="file" accept="image/*"></label>
 ${f('avatar','头像图床 URL',p.avatar,'url')}
 <label class="x-panel-field"><span>封面 · 相册上传</span><input name="bannerFile" type="file" accept="image/*"></label>
 ${f('banner','封面图床 URL',p.banner,'url')}</section>
 <section class="x-panel-card"><h3>名气和认证</h3>
 ${sel('fameTier','基础名气',[['ordinary','普通人'],['niche','圈内知名'],['creator','创作者 / 网红'],['celebrity','公众人物 / 明星']],p.fameTier)}
 ${f('baseFollowers','基础关注者',p.baseFollowers,'number')}
 ${sel('verifiedType','认证类型',[['none','未认证'],['personal','个人认证'],['creator','创作者认证'],['organization','机构认证'],['public-figure','公众人物认证']],p.verifiedType)}
 <label class="x-panel-toggle"><span>显示认证标识</span><input name="verified" type="checkbox" ${p.verified?'checked':''}></label>
 <p class="x-note">基础名气会影响初始关注者，之后的关注、点赞和转发继续累积。</p></section>
 <section class="x-panel-card"><h3>现实身份与可见范围</h3>
 ${sel('linkedIdentityId','绑定现实身份',[['','不绑定'],...people.map(row=>[row.id,row.name||row.chatName||row.id])],p.linkedIdentityId)}
 <label class="x-panel-toggle"><span>在 X 公开此关联<small>关闭后生成内容不会披露账号与现实身份的关系。</small></span><input name="identityPublic" type="checkbox" ${p.identityPublic?'checked':''}></label></section>
 <button class="x-panel-save">保存资料</button></form>`;
}

export function bindXProfileEditor(root,store,id,{render,done}){
 const form=root.querySelector('.x-profile-editor');if(!form)return;
 form.onsubmit=async e=>{
  e.preventDefault();const q=form.elements,original=ensureX(store.getState()).profiles[id];
  const name=q.name.value.trim().slice(0,32),handle=q.handle.value.trim().replace(/^@/,'').replace(/[^a-zA-Z0-9_]/g,'').slice(0,30);
  if(!name||!handle)return showToast('名字和用户名不能为空');
  if(Object.values(ensureX(store.getState()).profiles).some(row=>row.id!==id&&row.handle.toLowerCase()===handle.toLowerCase()))return showToast('用户名已被使用');
  const avatarUrl=q.avatar.value.trim(),bannerUrl=q.banner.value.trim();
  if(avatarUrl&&!url(avatarUrl)||bannerUrl&&!url(bannerUrl))return showToast('图片地址需要以 http:// 或 https:// 开头');
  if(q.website.value.trim()&&!/^https?:\/\//i.test(q.website.value.trim()))return showToast('个人网站需要完整链接');
  const assets={};for(const key of ['avatar','banner']){
   const file=q[key+'File'].files?.[0];if(!file)continue;
   if(!file.type.startsWith('image/')||file.size>8*1024*1024)return showToast('请选择 8MB 以内的图片');
   try{assets[key]=await saveMediaBlob(file)}catch(error){return showToast(error.message)}
  }
  store.update(s=>{const p=ensureX(s).profiles[id];
   Object.assign(p,{name,handle,bio:q.bio.value.trim().slice(0,300),signature:q.signature.value.trim().slice(0,120),
    pronouns:q.pronouns.value.trim().slice(0,40),occupation:q.occupation.value.trim().slice(0,80),
    interests:q.interests.value.trim().slice(0,180),location:q.location.value.trim().slice(0,80),
    website:q.website.value.trim().slice(0,260),birthday:q.birthday.value,avatar:url(avatarUrl),banner:url(bannerUrl),
    fameTier:q.fameTier.value,baseFollowers:clamp(q.baseFollowers.value,0,100000000,original.baseFollowers||0),
    verifiedType:q.verifiedType.value,verified:q.verified.checked,
    linkedIdentityId:q.linkedIdentityId.value,identityPublic:q.identityPublic.checked});
   if(assets.avatar){p.avatarMediaId=assets.avatar.mediaId;p.avatarAssetId=''}
   else if(avatarUrl){p.avatarMediaId='';p.avatarAssetId=''}
   if(assets.banner)p.bannerMediaId=assets.banner.mediaId;
   else if(bannerUrl)p.bannerMediaId='';
  });
  showToast('X 资料已保存');done();
 };
 void hydrateXAssets(root,store.getState());
}
