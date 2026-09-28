// Stable garment IDs are shared by the studio, renderer and character wardrobe.
export const wardrobeCategories=[['hairStyle','发型'],['face','脸部'],['skin','肤色'],['hair','发色'],['top','上衣'],['bottom','下装'],['outfit','套装'],['shoes','鞋子'],['accessory','发饰'],['shirt','上衣配色'],['bottomColor','下装配色'],['shoeColor','鞋子配色'],['accessoryColor','发饰配色']];
const colors=['#8db3cb','#e39d87','#a4c89c','#e8c278','#bca1d2','#f2e5cc','#dba9bd','#718995','#443e48','#f6f3ed'];
const common={face:[['round','软糯圆脸'],['oval','小鹅蛋脸'],['wide','团子脸'],['smile','弯弯笑眼'],['sleepy','困困眼']],skin:['#ffe1c7','#f3c7a4','#d7a879','#b98264','#93644f','#65473e'],hair:['#312c32','#6c4b39','#ac7150','#eac783','#eee3d0','#d5a1ad','#9baccb','#a4b69d'],shirt:colors,bottomColor:colors,shoeColor:colors,accessoryColor:colors};
export const wardrobes={
  female:{
    hairStyle:[['twintails','蓬松双马尾'],['braids','双麻花辫'],['long','柔顺长发'],['jellyfish','水母头'],['bob','内扣波波头'],['waves','慵懒大波浪'],['eggroll','蛋卷短发'],['buns','双丸子头'],['pony','高马尾']],
    top:[['blouse','泡泡袖衬衫'],['cardigan','蝴蝶结开衫'],['f-hoodie','落肩卫衣'],['sailor','海军领上衣']],
    bottom:[['pleats','百褶短裙'],['a-skirt','A 字半裙'],['f-shorts','灯笼短裤'],['f-jeans','阔腿牛仔裤']],
    outfit:[['none','自由搭配'],['dress','花苞连衣裙'],['pinafore','森系背带裙'],['f-sailor-set','水手服套装'],['f-bunny','兔耳家居服']],
    shoes:[['maryjane','玛丽珍鞋'],['f-sneakers','奶油运动鞋'],['f-boots','系带短靴'],['ballet','蝴蝶结芭蕾鞋']],
    accessory:[['none','不戴发饰'],['ribbon','大蝴蝶结'],['clips','双侧发夹'],['flowers','小花发饰'],['headband','绒面发箍']]
  },
  male:{
    hairStyle:[['m-curtains','蓬松中分'],['m-crop','纹理短碎发'],['m-side','侧分逗号刘海'],['m-mushroom','柔软蘑菇头'],['m-curls','微卷短发'],['m-wolf','层次狼尾'],['m-tied','束发小辫']],
    top:[['m-shirt','翻领衬衫'],['m-knit','学院针织衫'],['m-hoodie','连帽卫衣'],['m-varsity','棒球夹克']],
    bottom:[['m-shorts','工装短裤'],['m-jeans','直筒牛仔裤'],['m-cargo','束脚工装裤'],['m-trousers','学院长裤']],
    outfit:[['none','自由搭配'],['overalls','田园背带裤'],['m-school','学院制服'],['m-sport','运动套装'],['m-bunny','兔耳家居服']],
    shoes:[['m-sneakers','拼色运动鞋'],['loafers','学院乐福鞋'],['m-boots','工装短靴'],['high-tops','高帮帆布鞋']],
    accessory:[['none','不戴发饰'],['barrette','星星发夹'],['sportband','运动发带'],['beret','画家贝雷帽'],['cap','软檐鸭舌帽']]
  }
};
export function wardrobeChoices(gender,part){return wardrobes[gender==='male'?'male':'female'][part]||common[part]||[];}
export function defaultLook(gender='female'){const male=gender==='male';return {gender:male?'male':'female',hairStyle:male?'m-curtains':'twintails',face:male?'wide':'round',skin:'#f3c7a4',hair:'#6c4b39',shirt:male?'#8db3cb':'#dba9bd',top:male?'m-knit':'blouse',bottom:male?'m-shorts':'pleats',outfit:'none',shoes:male?'m-sneakers':'maryjane',accessory:male?'none':'ribbon',bottomColor:male?'#718995':'#f2e5cc',shoeColor:'#443e48',accessoryColor:'#dba9bd',wardrobeVersion:2};}
export function normalizeLook(value={}){
  const look={...defaultLook(value.gender),...value},male=look.gender==='male';
  if(!value.wardrobeVersion){
    const aliases=male?{crop:'m-crop',bob:'m-mushroom',curly:'m-curls',long:'m-wolf',pony:'m-tied',buns:'m-tied'}:{crop:'bob',curly:'eggroll'};
    look.hairStyle=aliases[look.hairStyle]||look.hairStyle;
    if(['hoodie','sweater'].includes(value.outfit)){look.top=value.outfit==='hoodie'?(male?'m-hoodie':'f-hoodie'):(male?'m-knit':'cardigan');look.outfit='none';}
    if(value.outfit==='bunny')look.outfit=male?'m-bunny':'f-bunny';
    if(value.outfit==='overalls'&&!male)look.outfit='pinafore';
  }
  for(const part of ['hairStyle','top','bottom','outfit','shoes','accessory'])if(!wardrobeChoices(look.gender,part).some(([id])=>id===look[part]))look[part]=defaultLook(look.gender)[part];
  look.wardrobeVersion=2;return look;
}
