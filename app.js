import {mountCompanyWorkflow} from './company-workflow.js';
import {createCeoView} from './ceo-view.js';
import {employees,characterState,OfficeStore,actions} from './state.js';
const store=new OfficeStore(), ns='http://www.w3.org/2000/svg';
const byId=id=>document.getElementById(id);
const nodes=new Map(),positions=new Map();let focused=null,paused=false,phase=-1,ticks=0,job=0,external=false,handoffArrival=null,handoffStartedAt=null;
const escapes=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ceoView=createCeoView({getSnapshot:()=>window.tomatoOffice.getSnapshot()});
function desk(e){const [x,y]=e.home;return `<g transform="translate(${x} ${y-45})"><ellipse cy="36" rx="63" ry="24" fill="#8fabb7" opacity=".18"/><g id="chair-${e.id}" class="empty-chair" transform="translate(0 51)"><ellipse cy="16" rx="23" ry="9" fill="#b9ccd3"/><rect x="-20" y="-8" width="40" height="25" rx="12" fill="${e.color}" opacity=".7"/><path d="M0 14V26M-14 29 0 24 14 29" stroke="#97aeb7" stroke-width="4"/></g><path d="M-54 0V33M54 0V33" stroke="url(#metal)" stroke-width="6"/><path d="M-67 -8 0 -35 67 -8 0 20Z" fill="url(#wood)"/><path d="M-67 -8V0L0 28V20Z" fill="#c9d5d9"/><path d="M0 20 67 -8V0L0 28Z" fill="#a7bcc4"/><path d="M25 -42V-15H-18" stroke="#74818a" stroke-width="4" fill="none"/><rect x="-23" y="-46" width="46" height="30" rx="3" fill="#536d7c"/><path d="M-17 -43H19" stroke="#a7bdc5" stroke-width="1"/><rect x="-19" y="-42" width="38" height="22" rx="2" class="monitor-screen" fill="url(#monitor-glass)"/><circle cx="12" cy="-37" r="2" fill="#fff"/><path d="M-13 -36H8M-13 -30H15" stroke="${e.color}" stroke-width="3"/><path d="M0 -16V-9M-10 -8H10" stroke="#94b0bf" stroke-width="4"/><path d="M-22 0 0 -9 23 0 1 10Z" fill="#b8c6ca"/><path d="M-17 0 0 -6 17 0M-12 3 1 -2 13 3" fill="none" stroke="#edf2f0" stroke-width="1.5"/><ellipse cx="29" cy="-2" rx="5" ry="3" fill="#f1f4ee"/><path d="M29 -5Q32 -15 22 -15" fill="none" stroke="#82939a" stroke-width=".8"/><ellipse cx="43" cy="-12" rx="7" ry="4" fill="#c6e0d7"/><path d="M37 -12V-22H49V-12" fill="#d5ece3"/><path d="M49 -21Q57 -23 54 -16H49" fill="none" stroke="#bdd8cd" stroke-width="2"/><ellipse cx="43" cy="-22" rx="6" ry="2" fill="#9b8270"/><path class="steam" d="M42 -27Q38 -31 43 -35" stroke="#fff" stroke-width="2" fill="none"/><path d="M-56 6V24L-35 34V13Z" fill="#ddd7cb"/><path d="M-53 13 -38 20M-53 21 -38 28" stroke="#aab2ad"/><path d="M-48 -12 -29 -20 -16 -14 -35 -6Z" fill="#d5e6df"/><path d="M-45 -15 -34 -19" stroke="#95afa5" stroke-width="2"/></g>`;}
byId('furniture').innerHTML=employees.map(desk).join('');
for(const [i,e] of employees.entries()){
 const g=document.createElementNS(ns,'g');g.setAttribute('class','employee');g.setAttribute('role','button');g.setAttribute('tabindex','0');g.setAttribute('aria-label',`${e.name}の仕事を見る`);g.style.setProperty('--delay',`${i*.8}s`);g.dataset.role=e.id;
 const props={research:'<g transform="translate(-39 -8)"><rect x="-10" y="-6" width="18" height="22" rx="3" fill="#ecdfbb" stroke="#baa77d"/><path d="M-5 0H3M-5 5H3" stroke="#b5a98a" stroke-width="2"/></g>',analyst:'<g transform="translate(36 -4)"><rect x="-7" y="-8" width="18" height="24" rx="3" fill="#d3e6f2"/><path d="M-3 10V4M2 10V0M7 10V-4" stroke="#82a8c1" stroke-width="3"/></g>',creator:'<path d="M32 -5 43 13" stroke="#d5b089" stroke-width="4" stroke-linecap="round"/><path d="M41 10 45 16" stroke="#e69895" stroke-width="5" stroke-linecap="round"/>',critic:'<g transform="translate(35 0)"><rect x="-7" y="-9" width="18" height="25" rx="3" fill="#e4dcef"/><path d="M-3 2 1 6 7 -2" stroke="#9883ae" stroke-width="2" fill="none"/></g>',ceo:'<circle cx="25" cy="1" r="5" fill="#e5c381"/><path d="M22 1 24 3 28 -1" stroke="#fff7d6" fill="none" stroke-width="1.5"/>'};
 g.innerHTML=`<rect x="-65" y="-116" width="130" height="190" fill="transparent" pointer-events="all"/><ellipse cy="24" rx="30" ry="10" fill="#71858e" opacity=".14"/><ellipse cy="24" rx="20" ry="5" fill="#71858e" opacity=".12"/><g class="person"><g class="work-kit"><ellipse cy="24" rx="40" ry="9" fill="#78919d" opacity=".15"/><path d="M-35 8H35L42 22H-42Z" fill="#bdcdd5"/><path d="M-31 -9H31L35 12H-35Z" fill="#829cae" stroke="#cad8df" stroke-width="1.5"/><circle cy="1" r="3" fill="#dce9ed"/><path d="M-27 16H27M-23 19H23" stroke="#91a9b7"/><ellipse class="typing-hand left" cx="-17" cy="14" rx="7" ry="5" fill="#fff7f1" stroke="#e7d9d2"/><ellipse class="typing-hand right" cx="17" cy="14" rx="7" ry="5" fill="#fff7f1" stroke="#e7d9d2"/></g><image class="seated-toma" href="assets/toma-seated.png" x="-54" y="-112" width="108" height="140" preserveAspectRatio="xMidYMax meet"/><g class="toma-art"><image class="toma-front" href="assets/toma.png" x="-52" y="-99" width="104" height="127" preserveAspectRatio="xMidYMax meet"/><foreignObject class="toma-side" x="-52" y="-99" width="104" height="127"><div xmlns="http://www.w3.org/1999/xhtml" style="width:104px;height:127px;background:url(assets/toma-turns.png) -26px 0 / 254px 127px no-repeat"></div></foreignObject><foreignObject class="toma-back" x="-52" y="-99" width="104" height="127"><div xmlns="http://www.w3.org/1999/xhtml" style="width:104px;height:127px;background:url(assets/toma-turns.png) -133px 0 / 254px 127px no-repeat"></div></foreignObject></g><foreignObject class="walk-cycle" x="-55" y="-104" width="110" height="132"><div xmlns="http://www.w3.org/1999/xhtml" class="walk-frames"></div></foreignObject><g class="motion-effects" fill="none" stroke="#8fbfc9" stroke-width="2" stroke-linecap="round"><path class="speed-lines" d="M-50 3H-41M-54 11H-43M-49 19H-41"/><g class="work-spark"><path d="M39 -24V-32M35 -28H43"/><circle cx="47" cy="-17" r="2"/></g></g><g class="walking-hands"><ellipse class="swing-left" cx="-29" cy="4" rx="6" ry="8" fill="#fff3ed"/><ellipse class="swing-right" cx="29" cy="4" rx="6" ry="8" fill="#fff3ed"/></g><g class="role-prop">${props[e.id]||''}</g><g class="read-kit"><path d="M-29 -3Q-13 -9 0 -2Q13 -9 29 -3V21Q13 15 0 22Q-13 15 -29 21Z" fill="#fdf6e8" stroke="#cabda6"/><path d="M0 -2V22M-23 3H-7M7 3H23M-23 8H-7M7 8H23" stroke="#b8c7bb"/><ellipse cx="-29" cy="12" rx="5" ry="7" fill="#fff7f1"/><ellipse cx="29" cy="12" rx="5" ry="7" fill="#fff7f1"/></g><g class="received-document"><rect x="22" y="-15" width="22" height="28" rx="3" fill="#fff9e9" stroke="#adbfbd"/><path d="M27 -7H38M27 -1H38M27 5H34" stroke="#91b9b3" stroke-width="2"/></g><g class="coffee-kit"><path d="M22 -5H37V13Q29 19 22 13Z" fill="#fffcf2" stroke="#cab7a2"/><path d="M37 -2Q47 -4 43 7H37" stroke="#cab7a2" fill="none" stroke-width="2"/><ellipse cx="29" cy="-5" rx="7" ry="2" fill="#957358"/><path class="steam" d="M29 -9Q24 -14 29 -18" stroke="white" fill="none" stroke-width="2"/></g><g class="arm"><rect class="paper" x="23" y="-10" width="23" height="29" rx="4" fill="#fcfaf1" stroke="#d6d8cc"/><path class="paper" d="M29 -2H40M29 4H40M29 10H36" stroke="#a0bbb9" stroke-width="2"/></g></g><rect x="-42" y="35" width="84" height="21" rx="10" fill="white" opacity=".9"/><circle cx="-30" cy="45" r="3" fill="${e.color}"/><text class="employee-name" x="4" y="49" text-anchor="middle">${e.name}</text><text class="work-label" y="69" text-anchor="middle"></text><text class="bubble" x="42" y="-83"></text>`;
 // Slice the existing directional sprite at the joints: actual textured limbs move.
 const originalArt=g.querySelector('.toma-art');
 const definitions=document.createElementNS(ns,'defs');
 const clips={body:'M-55 -112H55V-12H22V15H-22V-12H-55Z',leftFoot:'M-55 15H0V33H-55Z',rightFoot:'M0 15H55V33H0Z',leftArm:'M-55 -12H-22V15H-55Z',rightArm:'M22 -12H55V15H22Z'};
 for(const [part,path] of Object.entries(clips)){
  const clip=document.createElementNS(ns,'clipPath');clip.id=`${e.id}-${part}`;
  const shape=document.createElementNS(ns,'path');shape.setAttribute('d',path);clip.append(shape);definitions.append(clip);
  if(part==='body')continue;
  const limb=document.createElementNS(ns,'g');limb.setAttribute('class',`walking-limb ${part}`);
  const slice=document.createElementNS(ns,'g');slice.setAttribute('clip-path',`url(#${e.id}-${part})`);slice.append(originalArt.cloneNode(true));limb.append(slice);g.querySelector('.person').append(limb);
 }
 originalArt.classList.add('main-body');originalArt.style.setProperty('--body-clip',`url(#${e.id}-body)`);
 g.prepend(definitions);
 g.classList.add('original-toma');
 const sleepArt=document.createElementNS(ns,'foreignObject');sleepArt.setAttribute('class','sleep-art');sleepArt.setAttribute('x','-58');sleepArt.setAttribute('y','-94');sleepArt.setAttribute('width','116');sleepArt.setAttribute('height','116');
 sleepArt.innerHTML='<div xmlns="http://www.w3.org/1999/xhtml" class="sleep-frames"></div>';g.querySelector('.person').append(sleepArt);
 const expressionArt=document.createElementNS(ns,'foreignObject');expressionArt.setAttribute('class','expression-art');expressionArt.setAttribute('x','-72');expressionArt.setAttribute('y','-115');expressionArt.setAttribute('width','144');expressionArt.setAttribute('height','144');
 expressionArt.innerHTML='<div xmlns="http://www.w3.org/1999/xhtml" class="expression-frames"></div>';g.querySelector('.person').append(expressionArt);
 const fx=document.createElementNS(ns,'g');fx.setAttribute('class','character-fx');fx.setAttribute('aria-hidden','true');
 fx.innerHTML='<g class="fx-sleep"><text x="34" y="-64">z</text><text x="44" y="-78">z</text><text x="58" y="-96">Z</text></g><g class="fx-sleepy"><text x="32" y="-74">…</text><path d="M-35 -88Q-43 -95 -39 -103"/></g><g class="fx-idea"><path d="M43 -89C31 -89 30 -72 38 -68V-63H48V-68C56 -73 55 -89 43 -89Z M38 -58H48 M43 -100V-96 M27 -93 30 -90 M57 -93 54 -90"/></g><g class="fx-worry"><text x="42" y="-75">?</text><path d="M-38 -86Q-45 -73 -38 -73Q-31 -73 -38 -86Z"/></g><g class="fx-happy"><text x="-48" y="-88">✧</text><text x="40" y="-72">♡</text><text x="45" y="-105">✦</text></g>';
 g.append(fx);

 const focus=()=>{if(e.id==='ceo'){ceoView.open(g);return;}focused=e.id;render();};g.addEventListener('click',focus);g.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();focus();}});byId('employees').append(g);nodes.set(e.id,g);positions.set(e.id,[...e.home]);
}
function render(){
 for(const e of employees){const a=store.agents[e.id],c=characterState(a),g=nodes.get(e.id);g.dataset.action=c.action;g.querySelector('.work-label').textContent=({READ:'資料を読む',THINK:'分析・考え中',WORK:'PCで制作中',REVIEW:'仕上がりを確認',DELIVER:'資料を届ける',REJECT:'修正を相談',CELEBRATE:'お仕事完了',DRINK:'ひと息',WALK:'移動中'})[c.action]||'';g.querySelector('.bubble').textContent=({READ:'なるほど',THINK:'うーん…',WORK:'カタカタ',REVIEW:'ここを確認',DELIVER:'お願い！',REJECT:'ここ直そう',CELEBRATE:'できた！',DRINK:'☕',SLEEP:'z'})[c.action]||'';}
 byId('delivery-dot').setAttribute('visibility',store.deliveries.length?'visible':'hidden');
 byId('back').hidden=!focused;byId('detail').hidden=!focused;
 if(!focused){byId('camera').style.transform='';return;}
 if(focused==='delivery'){
 byId('camera').style.transform='translate(-200px, -425px) scale(1.25)';byId('detail').innerHTML=`<button class="close" aria-label="閉じる">×</button><span class="tag">DELIVERY BOX</span><h2>お届けもの</h2><p>みんなで仕上げた成果物です。</p>${store.deliveries.length?`<ul>${store.deliveries.map(d=>`<li>${escapes(d.title)}<br><small>${escapes(new Date(d.time).toLocaleTimeString('ja-JP'))}</small></li>`).join('')}</ul>`:'<p>まだ納品はありません。<br>仕事が終わったら、ここに届きます。</p>'}`;
 }else{
 const e=employees.find(e=>e.id===focused),a=store.agents[e.id],[x,y]=e.home;
 byId('camera').style.transform=`translate(${720-x*1.55}px, ${380-y*1.55}px) scale(1.55)`;
 byId('detail').innerHTML=`<button class="close" aria-label="閉じる">×</button><span class="tag">${characterState(a).action}</span><h2>${e.name}</h2><p>${e.role}</p><div class="task">${escapes(a.task||'次のアイデアを待っています')}<progress max="100" value="${a.progress}" aria-label="仕事の進捗"></progress><div class="meta"><span>${escapes(a.status)}</span><span>${a.progress}%</span></div></div><p>受け取り：${escapes(a.from||'Owner')}<br>次の担当：${escapes(a.to||'—')}<br>直近の仕事：${escapes(a.last)}</p>`;
 }
 byId('detail').querySelector('.close').onclick=back;
}
function back(){focused=null;render();byId('office').focus();}
byId('back').onclick=back;document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(ceoView.isOpen())ceoView.close();else back();}});
byId('delivery').onclick=()=>{focused='delivery';render();};byId('delivery').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();byId('delivery').onclick();}};
store.subscribe(render);
const home=id=>employees.find(e=>e.id===id).home;
let steps=[];
function update(id,status,more={}){store.update({agentId:id,status,...more});}
function makeJob(){
 if(external)return;
 effectPreview=null;effectButton.disabled=true;job++;phase=0;ticks=0;byId('mode-label').textContent='仕事のデモ運転中';const title=`春のブランド投稿 #${String(141+job)}`;
 for(const e of employees)update(e.id,e.id==='analyst'?'analyzing':e.id==='creator'?'creating':'idle',{task:title,progress:0,destination:null,from:null,to:null});
 if(job===1){positions.set('research',[460,345]);positions.set('critic',[590,380]);}
 steps=[
 ['research','walking','research','Researchが自分の席へ向かっています。','analyst'],
 ['research','researching',null,'Researchがアイデアの種を探しています。','analyst'],
 ['research','handoff','analyst','Researchが調査メモをAnalystに届けています。','analyst'],
 ['analyst','analyzing',null,'Analystが情報を整理しています。','creator'],
 ['analyst','handoff','creator','AnalystがCreatorに企画を渡しています。','creator'],
 ['creator','creating',null,'Creatorが投稿のデザインを制作しています。','critic'],
 ['critic','walking','creator','CriticがCreatorの仕事を見に行きます。','creator'],
 ['critic','reviewing','creator','Criticがデザインをやさしくチェックしています。','creator'],
 ['critic','rejected','creator','Critic「見出しをもう少し読みやすくしよう！」','creator'],
 ['creator','creating',null,'Creatorがフィードバックを反映しています。','critic'],
 ['critic','reviewing','creator','Critic「いいね！これで届けよう。」','ceo'],
 ['critic','handoff','ceo','Criticが完成した仕事をCEOに届けています。','ceo'],
 ['ceo','reviewing',null,'CEOが仕上がりを最終確認しています。','Delivery BOX'],
 ['ceo','handoff','box','CEOが納品BOXへ成果物を運んでいます。','Delivery BOX'],
 ['ceo','completed',null,'お仕事完了。納品BOXに新しい成果物が届きました。',null]
 ];applyStep();
}
function applyStep(){
 handoffArrival=null;handoffStartedAt=null;for(const node of nodes.values()){node.dataset.giving='false';node.dataset.receiving='false';}
 const [id,status,target,text,to]=steps[phase];
 const previousStep=phase?steps[phase-1]:null;
 if(previousStep&&previousStep[0]!==id)update(previousStep[0],previousStep[0]==='creator'?'creating':'idle',{destination:null});
 // Other employees keep working while the active employee carries the handoff.
 const destination=target==='box'?[800,640]:target===id?home(id):target?[home(target)[0]+(home(target)[0]<home(id)[0]?72:-72),home(target)[1]+12]:null;
 update(id,status,{destination,progress:status==='completed'?100:0,to,from:phase?steps[phase-1][0]:'Owner'});
 byId('activity').textContent=text;
 if(status==='completed'){store.update({type:'delivery',id:`demo-${job}`,title:store.agents.ceo.task+' · デザイン案'});for(const e of employees)update(e.id,'completed',{progress:100,last:store.agents[e.id].task,destination:null});}
 byId('demo').disabled=true;
}
byId('demo').onclick=makeJob;
byId('pause').onclick=()=>{paused=!paused;document.body.classList.toggle('paused',paused);byId('pause').textContent=paused?'デモを再開':'デモを一時停止';byId('mode-label').textContent=paused?'一時停止':phase>=0?'仕事のデモ運転中':'動作実験中';};
let officeBeat=0,patrolId=null,patrolPoint=0,visitor=null,effectPreview=null;
const effectButton=document.createElement('button');effectButton.id='effects-demo';effectButton.textContent='表情・エフェクトを見る ♪';byId('pause').after(effectButton);
effectButton.onclick=()=>{if(external||phase>=0||paused)return;if(patrolId==='ceo')patrolId=null;if(visitor?.id==='ceo')visitor=null;effectPreview={id:'ceo',index:0,started:officeBeat};update('ceo','dozing',{destination:[1130,570]});effectButton.disabled=true;};
function animateVisit(){
 if(paused||external||phase>=0)return;
 if(visitor&&effectPreview&&visitor.route[6][0]!==1310){visitor.route[6]=[1310,570];if(visitor.index===6)visitor.wait=null;}
 if(!visitor){
  const e=employees.find(e=>e.id!==effectPreview?.id&&e.id!==patrolId&&e.id!==employees[Math.floor(officeBeat/24)%employees.length].id);
  visitor={id:e.id,index:0,wait:null,route:[[860,590],[1020,550],[1020,340],[1160,340],[1020,340],[1020,550],[effectPreview?1310:1140,570],[1020,550],[860,590],e.home]};
 }
 const v=visitor,p=positions.get(v.id),target=v.route[v.index];
 if(v.wait!==null){const elapsed=officeBeat-v.wait;if(v.index===6){const status=elapsed<4?'resting':elapsed<8?'dozing':'sleeping';if(store.agents[v.id].status!==status)update(v.id,status,{destination:target});}if(elapsed<(v.index===6?16:6))return;v.wait=null;v.index++;}
 else if(Math.hypot(p[0]-target[0],p[1]-target[1])<8){
  if(v.index===3||v.index===6){v.wait=officeBeat;update(v.id,v.index===3?'researching':'resting',{destination:target});return;}
  v.index++;
 }
 if(v.index>=v.route.length){update(v.id,'creating',{destination:null});visitor=null;return;}
 const a=store.agents[v.id],dest=v.route[v.index];
 if(a.status!=='walking'||a.destination?.[0]!==dest[0]||a.destination?.[1]!==dest[1])update(v.id,'walking',{destination:dest});
}
const patrolRoute=[[480,360],[660,360],[840,550],[1010,550],[1020,440],[1020,340],[1140,340],[1020,340],[1020,550],[1130,570],[1020,570],[840,620],[480,620],[420,470]];
function ensurePatrol(){
 if(paused||external||phase>=0)return;
 const walkers=employees.filter(e=>e.id!==visitor?.id&&e.id!==effectPreview?.id);const next=walkers[Math.floor(officeBeat/24)%walkers.length].id;
 if(patrolId!==next){if(patrolId)update(patrolId,'creating',{destination:null});patrolId=next;}
 const a=store.agents[patrolId],p=positions.get(patrolId),target=patrolRoute[patrolPoint];
 if(Math.hypot(p[0]-target[0],p[1]-target[1])<8)patrolPoint=(patrolPoint+1)%patrolRoute.length;
 const destination=patrolRoute[patrolPoint];
 if(a.status!=='walking'||a.destination?.[0]!==destination[0]||a.destination?.[1]!==destination[1])update(patrolId,'walking',{destination});
}
function keepOfficeAlive(){
 if(phase>=0)return;
 const active=phase>=0?steps[phase]:null;
 const protectedIds=new Set(active?[active[0],active[2]]:[]);
 for(const [i,e] of employees.entries()){
  if(protectedIds.has(e.id)||(phase<0&&(e.id===patrolId||e.id===visitor?.id||e.id===effectPreview?.id)))continue;
  const a=store.agents[e.id];
  if(a.status==='completed'&&phase>=0)continue;
  // Stagger each employee's quiet routine; active work and handoffs keep priority.
  const beat=(Math.floor(officeBeat/4)+i)%6;
  const [x,y]=e.home;
  if(beat===0)update(e.id,'walking',{destination:[x+(x<500?62:-62),y+36]});
  else if(beat===1)update(e.id,'resting',{destination:a.destination});
  else if(beat===2)update(e.id,'walking',{destination:null});
  else if(beat===3)update(e.id,e.id==='creator'?'creating':'researching',{destination:null});
  else if(beat===4)update(e.id,'analyzing',{destination:null});
  else update(e.id,e.id==='critic'?'reviewing':'creating',{destination:null});
 }
}
setInterval(()=>{
 if(paused||external)return;
 officeBeat++;
 effectButton.disabled=phase>=0||!!effectPreview;
 if(effectPreview){
  const v=effectPreview,p=positions.get(v.id);
  if(Math.hypot(p[0]-1130,p[1]-570)>8)v.started=officeBeat;
  else if(officeBeat-v.started>=7){v.index++;v.started=officeBeat;const status=['dozing','sleeping','researching','analyzing','rejected','completed'][v.index];if(status)update(v.id,status,{destination:[1130,570]});else{update(v.id,'walking',{destination:null});effectPreview=null;effectButton.disabled=false;}}
 }
 if(officeBeat%4===0)keepOfficeAlive();
 if(phase>=0){ticks++;if(ticks<7){const id=steps[phase][0];update(id,store.agents[id].status,{progress:Math.min(100,Math.round(ticks/6*100))});}else{const step=steps[phase];if(step[1]==='handoff'){const a=store.agents[step[0]],p=positions.get(step[0]);if(Math.hypot(p[0]-a.destination[0],p[1]-a.destination[1])>8)return;if(step[2]!=='box'&&(handoffArrival===null||officeBeat-handoffArrival<2))return;}ticks=0;phase++;if(phase<steps.length)applyStep();else{phase=-1;byId('demo').disabled=false;byId('mode-label').textContent='動作実験中';}}}
 else{ticks=(ticks+1)%18;ensurePatrol();}
},1000);
const transfer=document.createElementNS(ns,'g');transfer.innerHTML='<rect x="-11" y="-14" width="22" height="28" rx="3" fill="#fff9e9" stroke="#91b9b3"/><path d="M-6 -7H6M-6 -1H6M-6 5H2" stroke="#91b9b3" stroke-width="2"/>';transfer.style.display='none';byId('camera').append(transfer);
function showHandoff(){
 if(paused||external||phase<0){transfer.style.display='none';return;}
 const [from,status,to]=steps[phase];
 if(status!=='handoff'||to==='box'){transfer.style.display='none';return;}
 const a=store.agents[from],p=positions.get(from),q=positions.get(to);
 if(Math.hypot(p[0]-a.destination[0],p[1]-a.destination[1])>8)return;
 if(handoffArrival===null){handoffArrival=officeBeat;handoffStartedAt=performance.now();update(to,({research:'researching',analyst:'analyzing',creator:'creating',critic:'reviewing',ceo:'reviewing'})[to],{destination:null,from,task:a.task,progress:0});byId('activity').textContent=`${from}から${to}へ、資料を手渡しています。`;}
 nodes.get(from).dataset.giving='true';nodes.get(to).dataset.receiving='true';
 const fraction=Math.min(1,(performance.now()-handoffStartedAt)/1600);
 transfer.style.display='block';transfer.setAttribute('transform',`translate(${p[0]+(q[0]-p[0])*fraction} ${p[1]-5+(q[1]-p[1])*fraction-16*Math.sin(fraction*Math.PI)})`);
}
// Speech stays above the character layer, including when two employees meet.
const speechLayer=document.createElementNS(ns,'g');speechLayer.setAttribute('class','speech-layer');speechLayer.setAttribute('aria-label','社員の会話と作業');byId('camera').append(speechLayer);
const speeches=new Map();
for(const e of employees){
 const card=document.createElementNS(ns,'g');card.setAttribute('class','speech-card');
 card.dataset.speaker=e.id;
 card.innerHTML=`<path class="speech-tail" d="M61 47 70 57 78 47"/><rect class="speech-bg" width="140" height="48" rx="16"/><circle cx="14" cy="13" r="3" fill="${e.color}"/><text class="speech-status" x="23" y="17"></text><text class="speech-line" x="70" y="35" text-anchor="middle"></text>`;
 speechLayer.append(card);speeches.set(e.id,card);
}
const sayings={
 READ:['いいヒント、みっけ♪','ふむふむ、メモしよ'],
 THINK:['うーん…ひらめきそう','あ、つながったかも！'],
 WORK:['いい感じにできてきた♪','ここ、可愛くしよう'],
 REVIEW:['ひとつずつ確認するね','ここ、いい感じだね♪'],
 REJECT:['ここを直すとよさそう♪','いっしょに整えよう'],
 CELEBRATE:['できた！おつかれさま♡','みんな、ありがとう！'],
 DRINK:['ひとくち休憩〜♪','ふぅ、おいしいね'],
 SLEEPY:['ふぁ…ちょっと眠いかも','まぶたが重いよ〜'],
 SLEEP:['すやすや…','むにゃむにゃ…'],
 IDLE:['次は何をしようかな♪','お手伝いするよ〜'],
 WALK:['ちょっと行ってくるね♪','てくてく…'],
 DELIVER:['資料、届けてくるね','できた案を見てほしい♪']
};
function updateSpeech(){
 const placed=[];
 for(const [index,e] of employees.entries()){
  const node=nodes.get(e.id),card=speeches.get(e.id),a=store.agents[e.id],action=characterState(a).action,p=positions.get(e.id);
  let status=({READ:'資料を読んでいます',THINK:'分析・考え中',WORK:'PCで制作しています',REVIEW:'仕上がりを確認中',REJECT:'修正を相談中',CELEBRATE:'お仕事完了！',DRINK:'ちょっと休憩',SLEEPY:'うとうとしています',SLEEP:'おやすみ中',IDLE:'次のお仕事待ち',WALK:'移動しています',DELIVER:'資料をお届け中'})[action];
  let line=(sayings[action]||sayings.IDLE)[(Math.floor(officeBeat/8)+index)%2];
  if(node.dataset.moving==='true'){status=action==='DELIVER'?'資料をお届け中':'移動しています';line=action==='DELIVER'?sayings.DELIVER[0]:sayings.WALK[0];}
  if(node.dataset.giving==='true'){status='資料を手渡し中';line='これ、お願いするね♪';}
  if(node.dataset.receiving==='true'){status='資料を受け取り中';line='ありがとう！まかせて♪';}
  if(phase>=0&&steps[phase]?.[1]==='rejected'&&e.id==='creator'){status='修正のお話を聞いています';line='わかった！直してみるね';}
  const statusText=card.querySelector('.speech-status'),lineText=card.querySelector('.speech-line');
  if(statusText.textContent!==status)statusText.textContent=status;
  if(lineText.textContent!==line)lineText.textContent=line;
  const blocked=(x,y)=>placed.some(r=>Math.abs(r.x-x)<150&&Math.abs(r.y-y)<60)||employees.some(other=>{
   if(other.id===e.id)return false;const q=positions.get(other.id);
   return x<q[0]+48&&x+140>q[0]-48&&y<q[1]+28&&y+48>q[1]-116;
  });
  const candidates=[[p[0]-70,p[1]-164],[p[0]+62,p[1]-142],[p[0]-202,p[1]-142]];
  let [x,y]=candidates.find(([x,y])=>!blocked(x,y))||candidates[0];
  while(blocked(x,y))y-=62;
  placed.push({x,y});card.setAttribute('transform',`translate(${x} ${y})`);
  const tailX=Math.min(120,Math.max(20,p[0]-x));
  card.querySelector('.speech-tail').setAttribute('d',`M${tailX-8} 47 ${p[0]-x} ${p[1]-y-106} ${tailX+8} 47`);
 }
}
let previous=performance.now();const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function animate(now){animateVisit();ensurePatrol();const dt=Math.min((now-previous)/1000,.1);previous=now;
 for(const e of employees){const target=store.agents[e.id].destination||e.home,p=positions.get(e.id);const distance=Math.hypot(target[0]-p[0],target[1]-p[1]);nodes.get(e.id).dataset.moving=distance>3?'true':'false';const node=nodes.get(e.id),action=characterState(store.agents[e.id]).action;
 const seated=distance<=3&&Math.hypot(p[0]-e.home[0],p[1]-e.home[1])<4&&['WORK','THINK','READ','REVIEW','IDLE','DRINK'].includes(action);
 node.dataset.seated=String(seated);document.getElementById(`chair-${e.id}`).style.visibility=seated?'hidden':'visible';
 if(distance>3){const dx=target[0]-p[0],dy=target[1]-p[1];node.dataset.heading=String(Math.atan2(dx,dy));node.dataset.facing=Math.abs(dy)>Math.abs(dx)*1.2?(dy<0?'back':'front'):(dx<0?'left':'right');}
 else if(action==='WORK'||action==='THINK')node.dataset.facing='back';
 else if(action==='READ'||action==='REVIEW')node.dataset.facing=officeBeat%10<7?'front':e.home[0]>500?'left':'right';
 else if(action==='REJECT'||(action==='THINK'&&!seated))node.dataset.facing='front';
 else if(action==='SLEEP'||action==='SLEEPY')node.dataset.facing='front';
 else if(action==='CELEBRATE')node.dataset.facing='front';
 else if(action==='IDLE'||action==='DRINK')node.dataset.facing=Math.floor(now/6000+employees.indexOf(e))%3===0?'front':e.home[0]>500?'left':'right';const amount=reduced.matches?1:Math.min(1,dt*Math.min(48,Math.max(14,distance*1.8))/Math.max(distance,1));if(!paused||external){p[0]+=(target[0]-p[0])*amount;p[1]+=(target[1]-p[1])*amount;}nodes.get(e.id).setAttribute('transform',`translate(${p[0]} ${p[1]})`);}
 showHandoff();
 for(const e of employees){
  const node=nodes.get(e.id),action=characterState(store.agents[e.id]).action;
  let expression=({READ:'focused',REVIEW:'focused',REJECT:'worried',CELEBRATE:'happy',DRINK:'happy',IDLE:'neutral'})[action]||'neutral';
  if(action==='THINK')expression=officeBeat%10<6?'focused':'discovery';
  if(node.dataset.giving==='true')expression='discovery';
  if(node.dataset.receiving==='true')expression='happy';
  node.dataset.expression=expression;
 }
 updateSpeech();

 [...nodes.values()].sort((a,b)=>positions.get(employees.find(e=>nodes.get(e.id)===a).id)[1]-positions.get(employees.find(e=>nodes.get(e.id)===b).id)[1]).forEach((g,i)=>{const layer=byId('employees');if(layer.children[i]!==g)layer.insertBefore(g,layer.children[i]||null);});requestAnimationFrame(animate);
}
// Adapter boundary: actual agent integrations send validated events, never animation commands.
window.tomatoOffice={dispatch(event){if(event.type!=='delivery'&&(!Object.hasOwn(store.agents,event.agentId)||!Object.hasOwn(actions,event.status)))return false;if(!store.update(event))return false;external=true;phase=-1;byId('mode-label').textContent='Agent接続モード';byId('pause').hidden=true;effectButton.hidden=true;effectPreview=null;byId('demo').hidden=true;byId('activity').textContent='Agentイベントを受信しました。';return true;},getSnapshot(){return structuredClone({agents:store.agents,deliveries:store.deliveries});}};
// Ambient experiment starts without an assigned task or fabricated delivery.
for(const [i,e] of employees.entries())update(e.id,i===1?'analyzing':i===2?'creating':i===3?'researching':'resting',{task:'動作実験（仕事の依頼なし）',destination:null});
byId('mode-label').textContent='動作実験中';
byId('activity').textContent='仕事の依頼なしで、移動・PC操作・休憩を実験中。';
ensurePatrol();animateVisit();render();requestAnimationFrame(animate);
// Direct preview link for the approved one-on-one TOMA screen.
if(location.hash==='#toma')ceoView.open();

const companyWorkflow=mountCompanyWorkflow({dispatch:event=>window.tomatoOffice.dispatch(event)});
