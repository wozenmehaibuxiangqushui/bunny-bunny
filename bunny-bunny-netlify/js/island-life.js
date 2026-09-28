export const HOUR=3600000;
export const cropsCatalog={lettuce:{name:'生菜',hours:.33,seed:6,sell:10,color:'#87b66b'},carrot:{name:'胡萝卜',hours:.75,seed:9,sell:15,color:'#dc9b61'},strawberry:{name:'草莓',hours:2,seed:12,sell:22,color:'#e8888a'},tomato:{name:'番茄',hours:3,seed:15,sell:28,color:'#d77766'},pumpkin:{name:'南瓜',hours:4,seed:18,sell:36,color:'#d7a568'},cosmos:{name:'波斯菊',hours:1.5,seed:10,sell:18,color:'#dbbad1'}};
export const fishCatalog={minnow:{name:'小银鱼',sell:12},carp:{name:'鲤鱼',sell:24},perch:{name:'鲈鱼',sell:32},koi:{name:'锦鲤',sell:65},moonfish:{name:'月光鱼',sell:90}};
export const plots=Array.from({length:6},(_,i)=>({x:2+i%3,z:5+Math.floor(i/3)}));
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function hash(text){let n=2166136261;for(const c of String(text)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;}
export const dayKey=now=>new Date(now).toISOString().slice(0,10);
export function islandWeather(home,now=Date.now()){
  const date=new Date(now),month=date.getUTCMonth()+1,day=date.getUTCDate(),season=month>=3&&month<=5?'春':month>=6&&month<=8?'夏':month>=9&&month<=11?'秋':'冬',n=hash(`${home.worldId}:${dayKey(now)}:weather`)%10;
  const kind=n<3?'雨':n<5?'多云':'晴';const festival=day===1?`${season}日集市`:month===12&&day===24?'冬夜灯会':month===10&&day===31?'南瓜之夜':'';
  return {day:dayKey(now),season,kind,festival,temperature:(season==='冬'?5:season==='夏'?26:17)+n-4};
}
export function ensureLife(home,now=Date.now()){
  home.crops||=[];home.life||={version:1,coins:180,inventory:{'seed:lettuce':4,'seed:strawberry':3,bait:5,food:5},tilled:home.crops.map(c=>`${c.x},${c.z}`),pets:[],ledger:[],castCount:0,claims:[],lastAt:now};
  const life=home.life;life.pets||=[];life.inventory||={};life.ledger||=[];life.claims||=[];life.tilled||=[];
  const elapsed=clamp(now-(life.lastAt||now),0,72*HOUR)/HOUR;
  if(elapsed){for(const pet of life.pets){const hungryHours=clamp(elapsed-Math.max(0,(pet.hunger-25)/2),0,elapsed);pet.hunger=clamp(pet.hunger-elapsed*2,15,100);pet.mood=clamp(pet.mood-elapsed*.8,20,100);pet.health=clamp(pet.health-hungryHours*.25,40,100);}life.lastAt=Math.max(now,life.lastAt||0);}
  return life;
}
export function cropProgress(home,crop,now=Date.now()){
  const type=cropsCatalog[crop.type]||cropsCatalog.strawberry,start=crop.plantedAt,elapsed=clamp(now-start,0,72*HOUR);
  let rain=0;for(let at=start;at<start+elapsed;){const next=Math.min(start+elapsed,(Math.floor(at/86400000)+1)*86400000);if(islandWeather(home,at).kind==='雨')rain+=next-at;at=next;}
  const watered=crop.wateredAt?clamp(now-Math.max(start,crop.wateredAt),0,elapsed):0;
  return clamp((elapsed+rain*.15+watered*.25)/(type.hours*HOUR),0,1);
}
const add=(life,id,n)=>life.inventory[id]=(life.inventory[id]||0)+n;
const consume=(life,id,n)=>{if((life.inventory[id]||0)<n)throw Error('库存不足，去商店补充一下');add(life,id,-n);};
function money(life,amount,label,now){if(life.coins+amount<0)throw Error('岛币不足，可以出售收获');life.coins+=amount;life.ledger.push({at:now,amount,label,balance:life.coins});life.ledger=life.ledger.slice(-100);}
export function itemLabel(id){if(id.startsWith('seed:'))return `${cropsCatalog[id.slice(5)]?.name||'作物'}种子`;if(id.startsWith('crop:'))return cropsCatalog[id.slice(5)]?.name||'收获';if(id.startsWith('fish:'))return fishCatalog[id.slice(5)]?.name||'鱼';return {bait:'鱼饵',food:'宠物口粮'}[id]||id;}
export function lifeAction(home,action,args={},now=Date.now()){
  const life=ensureLife(home,now),weather=islandWeather(home,now);let summary='';
  if(action==='till'){const p=plots.find(p=>!life.tilled.includes(`${p.x},${p.z}`));if(!p)throw Error('六块地已经全部翻好了');life.tilled.push(`${p.x},${p.z}`);summary=`翻好了 ${p.x},${p.z} 的田地`;}
  else if(action==='plant'){const type=cropsCatalog[args.type];if(!type)throw Error('请选择有效品种');const p=plots.find(p=>life.tilled.includes(`${p.x},${p.z}`)&&!home.crops.some(c=>c.x===p.x&&c.z===p.z));if(!p)throw Error('先翻一块空地，或收获已成熟的作物');consume(life,`seed:${args.type}`,1);home.crops.push({...p,type:args.type,kind:type.name,plantedAt:now,wateredAt:null});summary=`种下了${type.name}`;}
  else if(action==='water'){const crop=home.crops.find(c=>!c.wateredAt&&cropProgress(home,c,now)<1);if(!crop)throw Error('没有需要浇水的作物');crop.wateredAt=now;summary=`给${crop.kind||'草莓'}浇了水`;}
  else if(action==='harvest'){const ready=home.crops.filter(c=>cropProgress(home,c,now)>=1);if(!ready.length)throw Error('还没有成熟的作物');for(const c of ready)add(life,`crop:${c.type||'strawberry'}`,c.wateredAt?3:2);home.crops=home.crops.filter(c=>!ready.includes(c));home.harvests=(home.harvests||0)+ready.length;summary=`收获了 ${ready.length} 块田的作物，放进背包`;}
  else if(action==='buy'){const qty=clamp(Math.floor(Number(args.qty)||1),1,20),price=args.item==='food'?7:args.item==='bait'?4:args.item?.startsWith('seed:')?cropsCatalog[args.item.slice(5)]?.seed:0;if(!price)throw Error('商品不存在');money(life,-price*qty,`购买${itemLabel(args.item)} × ${qty}`,now);add(life,args.item,qty);summary=`买了${itemLabel(args.item)} × ${qty}`;}
  else if(action==='sell'){const qty=clamp(Math.floor(Number(args.qty)||1),1,99),price=args.item?.startsWith('crop:')?cropsCatalog[args.item.slice(5)]?.sell:args.item?.startsWith('fish:')?fishCatalog[args.item.slice(5)]?.sell:0;if(!price)throw Error('这件物品不能出售');consume(life,args.item,qty);const bonus=weather.festival?1.2:1;money(life,Math.round(price*qty*bonus),`出售${itemLabel(args.item)} × ${qty}`,now);summary=`出售了${itemLabel(args.item)} × ${qty}`;}
  else if(action==='adopt'){if(life.pets.length>=2)throw Error('小岛最多照顾两只宠物');if(!['cat','dog','rabbit'].includes(args.species))throw Error('请选择宠物');const name=String(args.name||'').trim().slice(0,16);if(!name)throw Error('先给新朋友起个名字');money(life,-60,`领养 ${name}`,now);life.pets.push({id:`pet-${hash(`${home.accountId}:${now}:${life.pets.length}`)}`,species:args.species,name,hunger:80,mood:80,health:100,affection:5,lastPlay:0,lastFeed:0});summary=`领养了${name}`;}
  else if(action==='feed'||action==='play'){const pet=life.pets.find(p=>p.id===args.id);if(!pet)throw Error('宠物不在这里');if(action==='feed'){if(pet.hunger>90)throw Error('已经吃饱了，晚些再喂吧');consume(life,'food',1);pet.hunger=clamp(pet.hunger+25,0,100);pet.health=clamp(pet.health+5,0,100);pet.lastFeed=now;}else{if(now-pet.lastPlay<10*60000)throw Error('刚玩过一会儿，让它歇歇吧');pet.mood=clamp(pet.mood+18,0,100);pet.lastPlay=now;}pet.affection=clamp(pet.affection+2,0,100);summary=`${action==='feed'?'喂了':'陪伴了'}${pet.name}`;}
  else if(action==='cast'){if(life.fishing&&now<=life.fishing.expiresAt)throw Error('鱼线还在水里');consume(life,'bait',1);const n=hash(`${home.worldId}:${home.accountId}:${++life.castCount}:${weather.day}`),night=new Date(now).getUTCHours()>=18||new Date(now).getUTCHours()<6,pool=['minnow','minnow','carp','perch',weather.kind==='雨'?'koi':'carp',night?'moonfish':'perch'];const biteAt=now+3000+n%3000;life.fishing={id:life.castCount,fish:pool[n%pool.length],castAt:now,biteAt,expiresAt:biteAt+2500};summary='在池塘边抛下了鱼线';}
  else if(action==='reel'){const f=life.fishing;if(!f)throw Error('先抛竿');life.fishing=null;if(now<f.biteAt){summary='收竿太早，鱼还没上钩';}else if(now>f.expiresAt){summary='鱼已经游走了，下次留意浮标';}else{add(life,`fish:${f.fish}`,1);summary=`钓到了一条${fishCatalog[f.fish].name}`;}}
  else if(action==='festival'){if(!weather.festival)throw Error('今天没有节日礼物');if(life.claims.includes(weather.day))throw Error('今天的礼物已经领过了');life.claims.push(weather.day);add(life,'bait',3);add(life,'food',2);summary=`领到了${weather.festival}的礼物`;}
  else throw Error('未知的小岛动作');
  return {summary,action,at:now};
}
