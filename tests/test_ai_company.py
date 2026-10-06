import io, json, tempfile, unittest
from pathlib import Path
from unittest.mock import patch
from ai_company import CompanyRunner, OpenAIProvider, ProviderError
from server import JobRepository

class FakeProvider:
    available=True
    def __init__(self, question=False, reject=False, fail=False):
        self.calls=[];self.question=question;self.reject=reject;self.fail=fail
    def generate(self,step,job):
        self.calls.append(step)
        if self.fail:raise ProviderError('AIが混雑しています。')
        if self.question and not job['answers']:
            return dict(content='対象を確認します',needs_input=True,question='誰に届ける企画ですか？',approved=True)
        approved=not(self.reject and step==4 and self.calls.count(4)==1)
        return dict(content=f"工程{step}: {job['request']}の成果物",needs_input=False,question='',approved=approved)

class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.repo=JobRepository(Path(self.temp.name)/'jobs.db')
    def tearDown(self):self.temp.cleanup()
    def run_job(self,provider,job):
        runner=CompanyRunner(self.repo,provider);runner.start(job['id']);runner.thread.join(timeout=3)
        self.assertFalse(runner.thread.is_alive());return self.repo.get(job['id'])
    def test_full_pipeline_and_review_handoff(self):
        j=self.repo.create('SNS企画を作る','ai');provider=FakeProvider(reject=True)
        done=self.run_job(provider,j)
        self.assertEqual(provider.calls,[0,1,2,3,4,3,4,5])
        self.assertEqual(done['execution'],'completed');self.assertEqual(done['step'],6)
        self.assertIn('SNS企画',done['artifact']);self.assertNotIn('テンプレート',done['artifact'])
        self.assertEqual(done['revisions'],1)
        self.assertEqual(JobRepository(self.repo.path).get(j['id'])['artifact'],done['artifact'])
    def test_question_stops_then_answer_resumes(self):
        j=self.repo.create('企画を作る','ai');provider=FakeProvider(question=True)
        paused=self.run_job(provider,j)
        self.assertEqual(paused['execution'],'needs_input');self.assertIsNone(paused['artifact'])
        self.assertEqual(paused['step'],0)
        self.repo.answer_ai(j['id'],'大学生向けです')
        done=self.run_job(provider,j);self.assertEqual(done['execution'],'completed')
        self.assertEqual(done['answers'],['大学生向けです'])
    def test_failure_and_missing_credentials_never_complete_job(self):
        j=self.repo.create('企画を作る','ai')
        failed=self.run_job(FakeProvider(fail=True),j)
        self.assertEqual(failed['execution'],'failed');self.assertEqual(failed['step'],0);self.assertIsNone(failed['artifact'])
        with self.assertRaises(ValueError):self.repo.transition(j['id'],'advance',0)
        with self.assertRaises(ProviderError):CompanyRunner(self.repo,OpenAIProvider(key='')).start(j['id'])
        self.assertEqual(self.repo.get(j['id'])['execution'],'failed')
    def test_duplicate_claim_queue_and_restart(self):
        j=self.repo.create('最初の仕事','ai');queued=self.repo.create('次の仕事','ai')
        with self.assertRaises(ValueError):self.repo.claim_ai(queued['id'])
        self.repo.claim_ai(j['id'])
        with self.assertRaises(ValueError):self.repo.claim_ai(j['id'])
        self.repo.recover_ai();self.assertEqual(self.repo.get(j['id'])['execution'],'failed')
    def test_review_is_bounded(self):
        class RejectProvider(FakeProvider):
            def generate(self,step,job):
                result=super().generate(step,job);result['approved']=step!=4;return result
        j=self.repo.create('レビューが通らない仕事','ai');provider=RejectProvider()
        failed=self.run_job(provider,j)
        self.assertEqual(failed['execution'],'failed');self.assertIsNone(failed['artifact'])
        self.assertEqual(provider.calls.count(4),3)

class ProviderTests(unittest.TestCase):
    def test_response_parsing_and_private_server_key(self):
        response={'status':'completed','output':[{'type':'message','content':[{'type':'output_text','text':json.dumps(dict(content='成果物',needs_input=False,question='',approved=True))}]}]}
        with patch('ai_company.urlopen',return_value=io.BytesIO(json.dumps(response).encode())) as send:
            value=OpenAIProvider(key='test-only-key').generate(3,{'request':'依頼'})
        self.assertEqual(value['content'],'成果物')
        request=send.call_args.args[0];payload=json.loads(request.data)
        self.assertEqual(payload['store'],False)
        self.assertNotIn('test-only-key',request.data.decode())
    def test_incomplete_or_invalid_response_is_failure(self):
        for value in [{'status':'incomplete'}, {'status':'completed','output':[]}]:
            with patch('ai_company.urlopen',return_value=io.BytesIO(json.dumps(value).encode())):
                with self.assertRaises(ProviderError):OpenAIProvider(key='test-only').generate(0,{'request':'依頼'})

class CancellationTests(unittest.TestCase):
    def test_cancelled_job_does_not_complete_or_block_the_next_job(self):
        with tempfile.TemporaryDirectory() as d:
            r=JobRepository(Path(d)/'jobs.db');first=r.create('中止する依頼','ai');second=r.create('次の依頼','ai')
            r.claim_ai(first['id']);r.cancel_ai(first['id'])
            result=dict(content='中止後の応答',needs_input=False,question='',approved=True)
            self.assertEqual(r.finish_ai_stage(first['id'],0,result),'cancelled')
            r.fail_ai(first['id'],'遅れて返ったエラー')
            self.assertEqual(r.get(first['id'])['execution'],'cancelled')
            self.assertIsNone(r.get(first['id'])['artifact'])
            r.claim_ai(second['id']);self.assertEqual(r.get(second['id'])['execution'],'running')
