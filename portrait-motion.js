// Blend illustrated poses without replacing TOMA's face geometry.
export function createPortraitMotion(host,{reduced}){
 const stage=document.createElement('div');stage.className='ceo-face-stage';host.append(stage);
 const loaded=new Map();let current=null,currentKey='',wanted=null,running=false;
 function preload(url){if(!loaded.has(url)){const img=new Image();img.src=url;loaded.set(url,img.decode().catch(()=>{}));}return loaded.get(url);}
 const assets=['assets/toma-ceo.png','assets/toma-ceo-emotions.png','assets/toma-ceo-reactions.png'];assets.forEach(preload);
 function spec(mode,emotion,blink){
  if(emotion){const first=['happy','excited','focused','worried','shy','sleepy'],second=['relieved','surprised','curious','amused','wink','determined'];let index=first.indexOf(emotion),url=assets[1];if(index<0){index=second.indexOf(emotion);url=assets[2];}if(index>=0)return {url,size:'300% 200%',position:`${index%3*50}% ${Math.floor(index/3)*100}%`,clip:true};}
  return {url:assets[0],size:'200% 200%',position:blink?'100% 100%':mode==='thinking'?'100% 0':mode==='replying'?'0 100%':'0 0',clip:false};
 }
 async function drain(){
  if(running||!wanted)return;running=true;
  while(wanted){const target=wanted;wanted=null;const key=JSON.stringify(target);if(key===currentKey)continue;await preload(target.url);if(wanted)continue;
   const next=document.createElement('div');next.className='ceo-face-layer';Object.assign(next.style,{backgroundImage:`url(${target.url})`,backgroundSize:target.size,backgroundPosition:target.position,clipPath:target.clip?'inset(1.8% 0 0)':'none'});stage.append(next);
   const old=current;current=next;currentKey=key;
   if(old&&!reduced.matches){
    const duration=target.blink?120:340;next.style.opacity='0';
    await new Promise(resolve=>{const start=performance.now();function step(now){const t=Math.min(1,(now-start)/duration),blend=1-(1-t)**3;next.style.opacity=String(blend);old.style.opacity=String(1-blend);if(t<1)requestAnimationFrame(step);else resolve();}requestAnimationFrame(step);});
    old.remove();next.style.opacity='1';
   }
   else old?.remove();
  }running=false;
 }
 return {show(mode,emotion,blink=false){wanted={...spec(mode,emotion,blink),blink};void drain();}};
}
