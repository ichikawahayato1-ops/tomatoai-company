import test from 'node:test';
import assert from 'node:assert/strict';
import {CompanyWorkflow} from '../company-workflow.js';
import {webcrypto} from 'node:crypto';
globalThis.crypto ??= webcrypto;
const memory=()=>{let data=null;return {getItem:()=>data,setItem:(k,v)=>data=v};};
test('queued jobs, review revision, delivery and history survive reload',()=>{const storage=memory(),f=new CompanyWorkflow(storage);const a=f.create('SNS投稿を企画'),b=f.create('次の依頼');assert.equal(f.advance(b.id),false);for(let i=0;i<4;i++)f.advance(a.id);assert.equal(f.revise(a.id),true);assert.equal(f.active().step,3);for(let i=0;i<3;i++)f.advance(a.id);assert.equal(f.active().id,b.id);const restored=new CompanyWorkflow(storage);assert.match(restored.jobs[0].artifact,/SNS投稿を企画/);assert.equal(restored.jobs[0].step,6);assert.equal(restored.jobs[0].history.length,9);assert.equal(restored.advance(a.id),false);});
test('failed storage does not accept or advance a job',()=>{const s=memory(),f=new CompanyWorkflow(s),j=f.create('依頼');s.setItem=()=>{throw Error('quota');};assert.equal(f.advance(j.id),false);assert.equal(f.jobs[0].step,0);assert.equal(f.create('保存できない依頼'),null);assert.equal(f.jobs.length,1);assert.match(f.error,/保存できません/);});
