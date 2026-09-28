import { normalizeLook } from './island-wardrobe.js';

const idleMeshes=new Map();
export function drawIslandCharacter(data,x,z,input,pose){
  if(pose.walking)return buildCharacter(data,x,z,input,pose);
  const look=normalizeLook(input),fields=['gender','hairStyle','face','skin','hair','shirt','top','bottom','outfit','shoes','accessory','bottomColor','shoeColor','accessoryColor'];
  const key=fields.map(k=>look[k]).join('|');let mesh=idleMeshes.get(key);
  if(!mesh){mesh=[];buildCharacter(mesh,0,0,{...look,direction:0},pose);if(idleMeshes.size>=8)idleMeshes.delete(idleMeshes.keys().next().value);idleMeshes.set(key,mesh);}
  const a=input.direction||0,c=Math.cos(a),q=Math.sin(a);for(let i=0;i<mesh.length;i+=6)data.push(x+mesh[i]*c+mesh[i+2]*q,mesh[i+1],z-mesh[i]*q+mesh[i+2]*c,mesh[i+3],mesh[i+4],mesh[i+5]);
}
function buildCharacter(data,x,z,input,{sphere,box,phase=0,facing=0,walking=false}){
  const look=normalizeLook(input),start=data.length,male=look.gender==='male';
  const skin=look.skin,hair=look.hair,shirt=look.shirt,pants=look.bottomColor,shoe=look.shoeColor,accent=look.accessoryColor;
  const bob=walking?Math.abs(Math.sin(phase))*.035:0,step=walking?Math.sin(phase)*.15:0;
  let lift=0;
  const ball=(a,b,c,d,e,f,color)=>sphere(data,a,b+bob+lift,c,d,e,f,color,14,20);
  const block=(a,b,c,d,e,f,color)=>box(data,a,b+bob+lift,c,d,e,f,color);
  const tints=new Map();const tint=hex=>{if(!tints.has(hex))tints.set(hex,/^#[a-f0-9]{6}$/i.test(hex)?[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255):[.5,.35,.25]);return tints.get(hex)};
  function vertex(p,n,color){const light=.84+.13*n[1]+.07*n[2]+.035*n[0]+(color===hair?.075*Math.pow(Math.max(0,n[2]),6):0);data.push(p[0],p[1]+bob+lift,p[2],...tint(color).map(c=>Math.min(1,c*light)));}
  // Continuous swept locks: no gaps between beads, and tapered, rounded hair tips.
  function lock(points,radius,color=hair,depth=.75){
    const count=24,sides=10,at=t=>{const u=t*(points.length-1),i=Math.min(points.length-2,Math.floor(u)),f=u-i,p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(points.length-1,i+2)];return [0,1,2].map(k=>.5*((2*p1[k])+(-p0[k]+p2[k])*f+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*f*f+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*f*f*f));};
    const ring=(i,j)=>{const t=i/count,p=at(t),angle=j*2*Math.PI/sides,prev=at(Math.max(0,t-.01)),next=at(Math.min(1,t+.01)),dy=next[1]-prev[1],dx=next[0]-prev[0],len=Math.hypot(dx,dy)||1,n=[-dy/len*Math.cos(angle),dx/len*Math.cos(angle),Math.sin(angle)],r=radius*Math.pow(Math.sin(Math.PI*t),.25);return {p:[p[0]+n[0]*r,p[1]+n[1]*r,p[2]+n[2]*r*depth],n};};
    for(let i=0;i<count;i++)for(let j=0;j<sides;j++){const a=ring(i,j),b=ring(i+1,j),c=ring(i+1,j+1),d=ring(i,j+1);for(const v of [a,b,c,a,c,d])vertex(v.p,v.n,color);}
  }
  const suit=look.outfit,bunny=suit.endsWith('bunny'),dress=['dress','pinafore','f-sailor-set'].includes(suit);
  const top=suit==='none'?look.top:suit==='m-school'?'m-shirt':suit==='m-sport'?'m-varsity':bunny?'f-hoodie':'blouse';
  const bottom=suit==='none'?look.bottom:suit==='overalls'?'m-jeans':suit==='m-school'?'m-trousers':suit==='m-sport'?'m-cargo':'pleats';
  const legHeight=male?.27:.23,legGap=male?.155:.135,bodyWidth=male?.335:.27;
  sphere(data,0,.052,0,.39,.022,.28,'#95ad83',6,12);
  for(const side of [-1,1]){
    const legZ=side*step,shorts=bottom.endsWith('shorts')||bottom.includes('skirt')||bottom==='pleats'||dress;
    ball(side*legGap,legHeight,legZ,bottom==='f-jeans'?.15:bottom==='m-jeans'?.125:.105,legHeight-.065,bottom==='f-jeans'?.14:.115,shorts&&!bunny?skin:bunny?shirt:pants);
    if(!shorts&&!bunny&&bottom.includes('cargo'))block(side*(legGap+.07),.31,legZ+.075,.1,.14,.09,pants);
    const boot=look.shoes.includes('boots')||look.shoes==='high-tops';
    if(boot){ball(side*legGap,.24,legZ,.135,.17,.14,shoe);if(look.shoes==='high-tops')ball(side*legGap,.345,legZ,.138,.032,.143,'#f3ecda');}
    ball(side*legGap,.115,.075+legZ,.15,.084,.22,shoe);
    ball(side*legGap,.073,.082+legZ,.153,.022,.225,'#f3ecda');
    if(look.shoes==='maryjane'){ball(side*legGap,.18,.019+legZ,.093,.014,.07,skin);block(side*legGap,.193,.067+legZ,.24,.025,.045,shoe);}
    else if(look.shoes==='ballet'){ball(side*legGap-.04,.188,.15+legZ,.052,.025,.038,accent);ball(side*legGap+.04,.188,.15+legZ,.052,.025,.038,accent);}
    else if(look.shoes.includes('sneakers')||boot)for(let i=0;i<3;i++)block(side*legGap,.19-i*.009,.08+i*.034+legZ,.12,.012,.018,'#fff7e8');
    else block(side*legGap,.184,.11+legZ,.21,.03,.055,'#b69b76');
  }
  const waist=male?.51:.47,shoulder=male?.77:.7;
  ball(0,shoulder-.085,0,bodyWidth,.29,.23,shirt);
  if(dress||(!bunny&&suit==='none'&&['pleats','a-skirt'].includes(bottom))){
    const col=dress?shirt:pants;
    const pleated=bottom==='pleats'||suit==='f-sailor-set';
    const skirtPoint=(row,j)=>{const a=j/48*Math.PI*2,r=(row?.37:.245)+(pleated?.013*Math.cos(a*12):0),n=[Math.cos(a),.35,Math.sin(a)];return {p:[Math.cos(a)*r,row?.29:.54,Math.sin(a)*r*.8+.005],n};};
    for(let j=0;j<48;j++){const a=skirtPoint(0,j),b=skirtPoint(1,j),c=skirtPoint(1,j+1),d=skirtPoint(0,j+1);for(const v of [a,b,c,a,c,d])vertex(v.p,v.n,col);}
    
    if(bottom==='pleats'||suit==='f-sailor-set')for(let i=0;i<9;i++){const a=(i/8)*Math.PI;lock([[Math.cos(a)*.23,.52,Math.sin(a)*.22],[Math.cos(a)*.345,.32,Math.sin(a)*.27]],.016,col,1);}
    if(suit==='pinafore'){block(0,.65,.24,.29,.24,.035,pants);for(const side of [-1,1])block(side*.17,.73,.21,.07,.3,.035,pants);}
  }else if(!bunny){
    for(const side of [-1,1])ball(side*legGap,waist-.09,side*step*.25,male?.15:.14,bottom.endsWith('shorts')?.16:.19,.16,pants);
    if(suit==='overalls'){block(0,.64,.24,.3,.25,.045,pants);for(const side of [-1,1]){block(side*.17,.74,.2,.075,.32,.045,pants);ball(side*.17,.78,.233,.023,.023,.013,'#e5cf94');}}
  }
  for(const side of [-1,1]){
    const sx=side*(bodyWidth+.015),az=-side*step;
    ball(sx,shoulder-.07,az,top==='blouse'?.15:.125,top==='blouse'?.14:.22,.13,shirt);
    ball(side*(bodyWidth+.035),shoulder-.265,az,.085,.095,.085,skin);
  }
  if(top.includes('hoodie')||bunny){ball(0,shoulder+.14,-.1,bodyWidth+.025,.13,.24,shirt);for(const side of [-1,1])block(side*.045,shoulder+.005,.232,.018,.15,.02,'#fff6e6');ball(0,shoulder-.18,.218,.14,.07,.038,shirt);}
  if(['m-shirt','blouse','sailor'].includes(top)||suit==='m-school'){for(const side of [-1,1])ball(side*.09,shoulder+.075,.215,.09,.065,.03,'#fff6e7');for(const y of [.55,.65,.75])ball(0,y,.238,.017,.017,.01,'#b7a184');}
  if(top==='cardigan'||top==='m-varsity'){block(0,shoulder-.065,.24,.035,.39,.025,'#fff2dc');for(const side of [-1,1])block(side*.13,shoulder-.18,.226,.105,.055,.025,'#fff2dc');}
  if(top==='m-knit')for(const y of [.5,.58,.66])block(0,y,.236,.45,.026,.021,'#f5eddd');
  if(top==='sailor'||suit==='f-sailor-set'||suit==='m-school'){lock([[-.2,shoulder+.13,.18],[0,shoulder-.06,.26],[.2,shoulder+.13,.18]],.038,'#485f7d',.5);ball(0,shoulder-.08,.268,.045,.08,.025,accent);}
  if(top==='cardigan'||suit==='dress'){for(const side of [-1,1])ball(side*.055,shoulder+.02,.248,.06,.036,.026,accent);}

  // Different base silhouette and facial treatment, still sharing the same chibi scale.
  lift=male?.075:0;
  const hw=(look.face==='wide'?.48:look.face==='oval'?.425:.455)*(male?1.035:1),hh=look.face==='oval'?.47:.435;
  for(const side of [-1,1])ball(side*hw,1.25,0,.075,.105,.07,skin);
  const faceStart=data.length;ball(0,1.31,0,hw,hh,.39,skin);
  if(!male)for(let i=faceStart;i<data.length;i+=6){const below=Math.max(0,1.31+bob-data[i+1]);data[i]*=1-below*.18;}
  for(const side of [-1,1]){
    const ex=side*(male?.168:.158),ey=1.29,smile=look.face==='smile',sleep=look.face==='sleepy';
    if(smile)lock([[ex-.036,ey-.012,.375],[ex,ey+.018,.39],[ex+.036,ey-.012,.375]],.012,'#403334',.6);
    else {ball(ex,ey,.367,male?.051:.061,sleep?.023:male?.071:.083,.031,'#403334');if(!sleep){ball(ex-.015,ey+.03,.395,.017,.023,.012,'#fffdf4');ball(ex+.012,ey-.033,.395,.012,.014,.01,'#98735e');}}
    if(male)lock([[ex-.044,1.415,.37],[ex+.04,1.417,.373]],.014,hair,.5);
    else lock([[ex+side*.038,ey+.042,.387],[ex+side*.068,ey+.063,.362]],.01,'#403334',.5);
    ball(side*.27,1.18,.322,male?.059:.077,.036,.016,'#eaa79d');
  }
  ball(0,1.205,.393,.035,.03,.032,'#e4aa8a');ball(0,1.12,.368,.028,.012,.01,'#a26c65');

  const style=look.hairStyle,short=male||['bob','eggroll','jellyfish'].includes(style);
  // A seamless cap follows the entire skull. Its lower edge varies around the face.
  const capPoint=(i,j)=>{const phi=j/40*Math.PI*2,front=Math.max(0,Math.sin(phi)),theta=i/18*(2.28-1.01*Math.pow(front,3)),n=[Math.sin(theta)*Math.cos(phi),Math.cos(theta),Math.sin(theta)*Math.sin(phi)];return {p:[n[0]*(hw+.045),1.32+n[1]*(hh+.065),n[2]*.435-.023],n};};
  for(let i=0;i<18;i++)for(let j=0;j<40;j++){const a=capPoint(i,j),b=capPoint(i+1,j),c=capPoint(i+1,j+1),d=capPoint(i,j+1);for(const v of [a,b,c,a,c,d])vertex(v.p,v.n,hair);}
  // Broad curved bangs connect to the crown and overlap the cap's front edge.
  if(style==='m-side'){for(let i=-2;i<=2;i++)lock([[i*.075-.12,1.78,.02],[i*.065+.04,1.69,.29],[.3+i*.035,1.43+Math.abs(i)*.02,.36]],.091,hair,.63);}
  else if(['m-curtains','waves'].includes(style)){
    for(const side of [-1,1])for(let i=0;i<3;i++)lock([[side*.04,1.79,-.01],[side*(.13+i*.07),1.71,.3],[side*(.27+i*.055),1.49,.36]],.08,hair,.58);
  }else for(let i=-2;i<=2;i++)lock([[i*.105,1.76,.11],[i*.13,1.63,.34],[i*.14+(male?.045:0),1.45+Math.abs(i)*.012,.398]],male?.095:.083,hair,.56);
  const sideLock=(side,points,r=.13)=>lock(points.map(([a,b,c])=>[side*a,b,c]),r,hair,.9);
  for(const side of [-1,1]){
    if(['bob','jellyfish','m-mushroom'].includes(style))sideLock(side,[[.39,1.56,.02],[.47,1.28,.06],[.43,1.01,.12],[.35,.99,.16]],.14);
    else sideLock(side,[[.4,1.56,.02],[.45,1.34,.09],[.4,1.13,.14]],.09);
    if(style==='long'||style==='waves'||style==='jellyfish'){
      for(let i=0;i<3;i++)sideLock(side,style==='waves'?[[.37+i*.06,1.49,-.15],[.5+i*.05,1.2,-.1],[.43+i*.06,.96,-.04],[.55+i*.045,.73,.015],[.45+i*.04,.56,.07]]:[[.38+i*.045,1.45,-.18],[.43+i*.045,1.09,-.13],[.42+i*.04,.74,-.05],[.36+i*.04,.59,.01]],style==='jellyfish'?.055:.092);
    }
    if(style==='twintails'){ball(side*.46,1.53,-.1,.095,.1,.1,accent);sideLock(side,[[.43,1.59,-.14],[.64,1.45,-.1],[.69,1.12,-.08],[.62,.91,.025],[.51,.81,.13]],.145);}
    if(style==='braids'){
      sideLock(side,[[.4,1.3,-.04],[.47,1.04,.08],[.44,.65,.17]],.095);
      for(let strand=0;strand<3;strand++){const points=Array.from({length:16},(_,i)=>{const t=i/15,a=t*4*Math.PI+strand*2*Math.PI/3;return[side*(.455+Math.sin(a)*.05),1.17-t*.56,.07+t*.12+Math.cos(a)*.065]});lock(points,.045,hair,.95);}
      ball(side*.455,.61,.2,.066,.028,.06,accent);sideLock(side,[[.455,.61,.2],[.48,.48,.23]],.065);
    }
    if(style==='eggroll')for(let i=0;i<3;i++)sideLock(side,[[.36+i*.05,1.53,-.12+i*.04],[.47+i*.035,1.35,.04],[.42+i*.045,1.18,.08],[.5+i*.03,1.04,.08],[.42+i*.025,.94,.12]],.082);
    if(style==='buns'){ball(side*.43,1.73,-.14,.195,.19,.18,hair);sideLock(side,[[.52,1.75,.0],[.55,1.54,.04]],.048);}
    if(style==='m-wolf')for(let i=0;i<3;i++)sideLock(side,[[.36+i*.035,1.36,-.21],[.44+i*.025,1.09,-.16],[.45+i*.04,.94,-.09]],.07);
    if(style==='m-crop')for(let i=0;i<3;i++)sideLock(side,[[.05+i*.12,1.79,-.02],[.1+i*.12,1.87,.08],[.17+i*.1,1.62,.25]],.075);
    if(style==='m-curls')for(let i=0;i<4;i++)sideLock(side,[[.07+i*.1,1.73,.08],[.12+i*.1,1.79,.22],[.16+i*.09,1.65,.34],[.11+i*.1,1.51,.34]],.075);
  }
  if(style==='pony'||style==='m-tied')lock([[0,1.72,-.34],[.08,1.62,-.54],[.12,male?1.26:.92,-.54],[.2,male?1.15:.7,-.36]],male?.12:.19);
  if(!short&&['long','waves','braids','pony'].includes(style))for(let i=-2;i<=2;i++)lock([[i*.13,1.61,-.27],[i*.15,1.23,-.39],[i*.145,.76,-.32],[i*.13,.65,-.19]],.115);

  function bow(cx,cy,cz,size=.09){for(const side of [-1,1])ball(cx+side*size*.75,cy,cz,size,size*.6,size*.35,accent);ball(cx,cy,cz+.02,size*.3,size*.38,size*.32,accent);}
  if(look.accessory==='ribbon')bow(.32,1.73,.29,.125);
  if(look.accessory==='clips')for(const side of [-1,1])lock([[side*.36,1.59,.32],[side*.43,1.48,.3]],.027,accent,.6);
  if(look.accessory==='flowers'||look.accessory==='barrette'){const count=look.accessory==='flowers'?5:4;for(let i=0;i<count;i++){const a=i/count*Math.PI*2;ball(.36+Math.cos(a)*.065,1.56+Math.sin(a)*.065,.345,.047,.045,.025,accent);}ball(.36,1.56,.376,.032,.03,.015,'#f7d78a');}
  if(look.accessory==='headband'||look.accessory==='sportband')lock(Array.from({length:13},(_,i)=>{const a=i/12*Math.PI;return[Math.cos(a)*(hw+.052),1.37+Math.sin(a)*.42,.18]}),.038,accent,.75);
  if(look.accessory==='beret'){ball(-.045,1.77,-.03,.48,.15,.38,accent);ball(-.02,1.93,-.04,.027,.045,.027,accent);}
  if(look.accessory==='cap'){ball(0,1.72,-.04,.49,.19,.4,accent);ball(0,1.63,.36,.37,.035,.26,accent);}
  if(bunny)for(const side of [-1,1]){ball(side*.19,1.99,-.06,.105,.28,.1,shirt);ball(side*.19,2.01,.019,.052,.2,.025,'#e8b4ba');}
  const angle=walking?facing:(look.direction||0),c=Math.cos(angle),q=Math.sin(angle);
  for(let i=start;i<data.length;i+=6){const px=data[i],pz=data[i+2];data[i]=x+px*c+pz*q;data[i+2]=z-px*q+pz*c;}
}
