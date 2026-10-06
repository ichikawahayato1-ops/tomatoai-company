// Network failures never fall back to a different, local copy of company data.
export class RemoteWorkflow {
 constructor(notify){this.notify=notify;this.jobs=[];this.error='';this.busy=false;this.ready=false;this.poll=null;this.aiAvailable=false;this.sequence=0;}
 active(){return this.jobs.find(j=>j.step<6&&j.execution!=='cancelled');}
 async request(path,body){const sequence=++this.sequence;const response=await fetch(path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000)});const data=await response.json();if(!response.ok)throw Error(data.error||'サーバーに接続できません。');if(!Array.isArray(data.jobs))throw Error('保存した依頼を読み込めません。');if(sequence===this.sequence){this.jobs=data.jobs;this.aiAvailable=!!data.aiAvailable;this.ready=true;}}
 async load(){if(this.busy)return;const sequence=this.sequence+1;try{await this.request('/api/jobs');if(sequence===this.sequence)this.error='';}catch(e){if(sequence===this.sequence)this.error=e.message;}if(sequence===this.sequence)this.notify();}
 start(){void this.load();this.poll=setInterval(()=>{if(!document.hidden)void this.load();},5000);window.addEventListener('pagehide',()=>clearInterval(this.poll),{once:true});}
 async mutate(path,body){if(this.busy||!this.ready)return false;this.busy=true;this.notify();let success=false;try{await this.request(path,body);this.error='';success=true;}catch(e){this.error=e.message;try{await this.request('/api/jobs');}catch{}}finally{this.busy=false;this.notify();}return success;}
 create(request){return this.mutate('/api/jobs',{request:request.trim(),mode:'ai'});}
 advance(id){const job=this.jobs.find(j=>j.id===id);return job?this.mutate(`/api/jobs/${encodeURIComponent(id)}/advance`,{expectedStep:job.step}):false;}
 cancel(id){return this.mutate(`/api/jobs/${encodeURIComponent(id)}/cancel`,{});}
 run(id){return this.mutate(`/api/jobs/${encodeURIComponent(id)}/run`,{});}
 answer(id,answer){return this.mutate(`/api/jobs/${encodeURIComponent(id)}/answer`,{answer});}
 revise(id){const job=this.jobs.find(j=>j.id===id);return job?this.mutate(`/api/jobs/${encodeURIComponent(id)}/revise`,{expectedStep:job.step}):false;}
}
