export const employees = [
 {id:'research',spriteColumn:0,bodyColor:'#34343d',name:'LYCO',role:'リサーチ担当',color:'#83bcb4',home:[320,375],leaf:'round'},
 {id:'analyst',spriteColumn:1,bodyColor:'#b9bcc4',name:'SOL',role:'分析・戦略担当',color:'#91b4d9',home:[760,375],leaf:'point'},
 {id:'creator',name:'POMO',role:'制作担当',color:'#e9b481',home:[320,520],leaf:'round'},
 {id:'critic',spriteColumn:2,bodyColor:'#f0cad7',name:'RUBY',role:'品質管理担当',color:'#b4a3d6',home:[760,520],leaf:'point'},
 {id:'ceo',name:'TOMA',role:'CEO · 会社をまとめる',color:'#ec8f86',home:[540,600],leaf:'point'}
];
export const actions={idle:'IDLE',researching:'READ',analyzing:'THINK',creating:'WORK',reviewing:'REVIEW',handoff:'DELIVER',rejected:'REJECT',completed:'CELEBRATE',resting:'DRINK',dozing:'SLEEPY',sleeping:'SLEEP',walking:'WALK'};
export function characterState(agent){return {action:actions[agent.status]||'IDLE',destination:agent.destination||null};}
export class OfficeStore {
 constructor(){this.agents=Object.fromEntries(employees.map(e=>[e.id,{status:'idle',progress:0,task:'',from:null,to:null,last:'まだ仕事はありません'}]));this.deliveries=[];this.listeners=new Set();}
 subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
 emit(){this.listeners.forEach(fn=>fn(this));}
 update(event){
  if(event.type==='delivery'){if(!event.id||this.deliveries.some(d=>d.id===event.id))return false;this.deliveries.push({id:event.id,title:event.title||'成果物',time:new Date().toISOString()});this.emit();return true;}
  if(!Object.hasOwn(this.agents,event.agentId)||!Object.hasOwn(actions,event.status))return false;
  const next={...this.agents[event.agentId],...event};next.progress=Math.max(0,Math.min(100,Number(next.progress)||0));
  if(next.destination&&(!Array.isArray(next.destination)||next.destination.length!==2||!next.destination.every(Number.isFinite)))return false;
  this.agents[event.agentId]=next;this.emit();return true;
 }
}
