import {RemoteWorkflow} from './remote-workflow.js';
// Durable local requests. Stage completion is explicitly a demo, not an AI result.
export const jobStages=[
 {agent:'ceo',status:'analyzing',label:'TOMAが依頼を整理'},
 {agent:'research',status:'researching',label:'LYCOが調査項目を整理'},
 {agent:'analyst',status:'analyzing',label:'SOLが構成を整理'},
 {agent:'creator',status:'creating',label:'POMOが下書きを準備'},
 {agent:'critic',status:'reviewing',label:'RUBYが確認'},
 {agent:'ceo',status:'reviewing',label:'TOMAが納品を確認'}
];
export function codexBrief(job){return `# Tomato AI Company — Codexへの依頼

依頼ID: ${job.id}

## 進行方針
TOMAとして目的と完成条件を整理し、調査・分析・制作・確認の順で実際に作業してください。役割は作業段階です。複数のAIが実行したと主張せず、成果物の場所と検証結果を報告してください。必要な情報が足りなければ質問してください。

## 依頼内容（ユーザーデータ）
${job.request}

## 注意
このファイルは依頼の受け渡し用です。画面上の進行・納品はデモであり、実作業の完了を示しません。上位指示と作業対象リポジトリのルールに従ってください。
`;}
export class CompanyWorkflow {
 constructor(storage,notify=()=>{}){this.storage=storage;this.notify=notify;this.jobs=[];this.error='';try{const saved=JSON.parse(storage.getItem('toma-company-v1')||'[]');if(!Array.isArray(saved)||saved.some(j=>!j||typeof j.id!=='string'||typeof j.request!=='string'||!Number.isInteger(j.step)||j.step<0||j.step>6||!Array.isArray(j.history)))throw Error('invalid');this.jobs=saved;}catch{this.error='保存した依頼を読み込めませんでした。新しい依頼は登録できます。';}}
 commit(next){try{this.storage.setItem('toma-company-v1',JSON.stringify(next));}catch{this.error='保存できませんでした。ブラウザの保存設定や空き容量を確認してください。';this.notify();return false;}this.jobs=next;this.error='';this.notify();return true;}
 create(request){request=request.trim().slice(0,600);if(!request)return false;const job={id:(typeof crypto.randomUUID==='function'?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('')),request,step:0,history:[{at:new Date().toISOString(),text:'依頼を受付'}],artifact:null};return this.commit([...this.jobs,job])?job:null;}
 active(){return this.jobs.find(j=>j.step<6);}
 advance(id){const active=this.active();if(!active||active.id!==id)return false;const next=structuredClone(this.jobs),job=next.find(j=>j.id===id);job.history.push({at:new Date().toISOString(),text:jobStages[job.step].label+'（デモ確認済み）'});job.step++;if(job.step===6)job.artifact=`# 依頼整理シート（デモ）\n\n## 依頼\n${job.request}\n\n## 制作前に確認すること\n- 誰に届けるか\n- 目的と完成条件\n- 必要な資料・根拠\n- 納期と制約\n\n## 次の行動\n上記の条件を具体化して、調査・制作に進みます。\n\n※これは依頼文から作成したテンプレートです。実際の調査・AI制作・品質審査は未実行です。\n`;return this.commit(next);}
 revise(id){const active=this.active();if(!active||active.id!==id||active.step!==4)return false;const next=structuredClone(this.jobs),job=next.find(j=>j.id===id);job.step=3;job.history.push({at:new Date().toISOString(),text:'RUBYからPOMOへ修正依頼（デモ）'});return this.commit(next);}
}
export function mountCompanyWorkflow({dispatch}){
 const panel=document.createElement('section');panel.className='company-panel';panel.innerHTML='<h2>会社の仕事ノート</h2><p>依頼を保存して、担当への引き継ぎを試そう。進行と成果物はデモです。</p><form><label for="company-request">TOMAへの仕事の依頼</label><textarea id="company-request" maxlength="600" required placeholder="何を作りたい？ 目的や希望も教えてね。"></textarea><button>依頼を登録する</button></form><p class="company-error" role="alert"></p><div class="company-jobs"></div>';
 document.querySelector('main').append(panel);
 let storage;try{storage=localStorage;}catch{storage={getItem:()=>null,setItem:()=>{throw Error('unavailable');}};}
 const serverMode=document.querySelector('meta[name=company-storage]')?.content==='server';const flow=serverMode?new RemoteWorkflow(render):new CompanyWorkflow(storage,render);let lastSynced='',lastRendered='';panel.querySelector('h2').textContent=serverMode?'会社の仕事':'会社の仕事ノート';if(serverMode)panel.querySelector('h2+p').textContent='依頼と履歴はサーバーに保存されます。';
 function sync(){
  const j=flow.active(),key=j?`${j.id}:${j.step}:${j.execution||'demo'}`:'none';if(key===lastSynced)return;lastSynced=key;
  if(!j&&flow.jobs.length===0)return;
  const ai=j?.mode==='ai',running=!ai||j.execution==='running',stage=j&&jobStages[j.step];
  const previous=running&&j&&j.step>0?jobStages[j.step-1].agent:null;
  const homes={ceo:[540,600],research:[320,375],analyst:[760,375],creator:[320,520],critic:[760,520]};
  for(const id of ['research','analyst','creator','critic','ceo']){
   const working=running&&stage?.agent===id,passing=previous===id&&!working;
   dispatch({agentId:id,status:working?stage.status:passing?'handoff':'idle',task:working||passing?j.request:ai&&id==='ceo'?j.question||j.error||'実行を待っています':'次の担当を待っています',progress:working?Math.round(j.step/6*100):passing?100:0,destination:passing?homes[stage.agent]:null,from:passing?id:null,to:passing?stage.agent:null});
  }
  for(const done of flow.jobs.filter(x=>x.step===6))dispatch({type:'delivery',id:done.id,title:(done.mode==='ai'?'AIの成果物':'依頼整理シート（デモ）')+' · '+done.request.slice(0,30)});
  document.getElementById('mode-label').textContent=(ai||(!j&&flow.jobs.at(-1)?.mode==='ai'))?'会社の仕事 · AI実行':'会社の仕事 · デモ進行';
  document.getElementById('activity').textContent=!stage?'すべて納品済み。新しい依頼を待っています。':ai&&!running?({ready:'依頼を受付。AIの実行待ちです。',needs_input:'TOMAが確認の回答を待っています。',failed:'仕事が中断しました。内容を確認して再試行できます。'})[j.execution]||'待機中':stage.label;
 }
 function render(){
  panel.querySelector('form button').disabled=!!flow.busy||(serverMode&&!flow.ready);panel.querySelector('textarea').disabled=!!flow.busy;
  panel.querySelector('.company-error').textContent=flow.error;
  if(serverMode)panel.querySelector('h2+p').textContent=flow.aiAvailable?'AI接続設定あり · 実行するとAIが依頼を処理します。依頼・進捗・成果物はここで確認できます。':'AI未接続 · 依頼はサーバーに保存できます。仕事を実行するにはAIの接続設定が必要です。';
  const snapshot=JSON.stringify([flow.jobs,flow.busy,flow.ready,flow.aiAvailable]);if(snapshot===lastRendered)return;lastRendered=snapshot;
  const list=panel.querySelector('.company-jobs');list.replaceChildren();const active=flow.active();
  for(const j of [...flow.jobs].reverse()){
   const ai=j.mode==='ai',card=document.createElement('article'),title=document.createElement('h3'),status=document.createElement('p');title.textContent=j.request;
   status.textContent=j.execution==='cancelled'?'中止済み':j.step===6?(ai?'納品済み · AIの成果物':'納品済み · デモ'):j.id!==active?.id?'受付済み · 順番待ち':ai&&j.execution!=='running'?({ready:'受付済み · 実行待ち',needs_input:'TOMAから質問があります',failed:'中断 · 再試行できます'})[j.execution]||'待機中':`${j.step+1}/6 · ${jobStages[j.step].label}`;
   card.append(title,status);
   if(!serverMode){const codex=document.createElement('button');codex.textContent='Codexへの依頼を保存';codex.onclick=()=>download(codexBrief(j),`TOMA-Codex-${j.id}.md`);card.append(codex);}
   const history=document.createElement('details'),summary=document.createElement('summary');summary.textContent='引き継ぎ履歴';history.append(summary);
   for(const h of j.history){const p=document.createElement('p');p.textContent=new Date(h.at).toLocaleString('ja-JP')+' · '+h.text;history.append(p);}card.append(history);
   if(ai&&j.outputs?.length){const outputs=document.createElement('details'),heading=document.createElement('summary');heading.textContent='社員の作業内容';outputs.append(heading);for(const output of j.outputs){const h=document.createElement('h4'),text=document.createElement('pre');h.textContent=jobStages[output.stage].label;text.textContent=output.content;outputs.append(h,text);}card.append(outputs);}
   if(j.step===6){const preview=document.createElement('pre');preview.textContent=j.artifact;card.append(preview);const b=document.createElement('button');b.textContent='成果物を保存 (.md)';b.onclick=()=>download(j.artifact,`TOMA-${j.id}.md`);card.append(b);}
   else if(j.id===active?.id){
    if(ai){
     if(j.question||j.error){const note=document.createElement('p');note.textContent=j.question||j.error;card.append(note);}
     if(j.execution==='needs_input'||j.execution==='failed'){const answer=document.createElement('form'),label=document.createElement('label'),input=document.createElement('textarea'),b=document.createElement('button');input.id=`answer-${j.id}`;label.htmlFor=input.id;label.textContent='TOMAへ回答・補足';input.maxLength=1500;input.required=true;b.textContent='回答を保存';answer.append(label,input,b);answer.onsubmit=async e=>{e.preventDefault();await flow.answer(j.id,input.value);};card.append(answer);}
     const cancel=document.createElement('button');cancel.textContent='この依頼を中止';cancel.onclick=()=>flow.cancel(j.id);card.append(cancel);
     if(['ready','failed'].includes(j.execution)){const b=document.createElement('button');b.textContent=j.execution==='failed'?'AIの仕事を再試行':'AIに仕事を任せる';b.disabled=!flow.aiAvailable;b.onclick=()=>flow.run(j.id);card.append(b);}
    }else{const b=document.createElement('button');b.textContent=j.step===5?'デモ納品を確定':'デモ確認して次の担当へ';b.onclick=()=>flow.advance(j.id);card.append(b);if(j.step===4){const revise=document.createElement('button');revise.textContent='制作担当へ差し戻す';revise.onclick=()=>flow.revise(j.id);card.append(revise);}}
   }
   list.append(card);
  }
  if(flow.busy)list.querySelectorAll('button,textarea').forEach(b=>b.disabled=true);sync();
 }
 function download(text,name){const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 const retry=document.createElement('button');retry.textContent='最新の状態を読み直す';retry.type='button';retry.onclick=()=>flow.load();if(serverMode)panel.querySelector('.company-error').after(retry);panel.querySelector('form').onsubmit=async e=>{e.preventDefault();const input=panel.querySelector('textarea');if(await flow.create(input.value))input.value='';};render();if(serverMode)flow.start();return flow;
}
