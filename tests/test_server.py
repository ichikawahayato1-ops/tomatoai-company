import base64, json, tempfile, threading, unittest
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from server import JobRepository, create_server
from ai_company import OpenAIProvider

class RepositoryTests(unittest.TestCase):
    def test_restart_queue_revision_and_conflicting_advance(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'company.db';r=JobRepository(path)
            first=r.create('企画の下書きを作る');second=r.create('次の依頼')
            with self.assertRaises(ValueError):r.transition(second['id'],'advance',0)
            r.transition(first['id'],'advance',0)
            with self.assertRaises(ValueError):r.transition(first['id'],'advance',0)
            for step in range(1,4):r.transition(first['id'],'advance',step)
            r.transition(first['id'],'revise',4)
            for step in range(3,6):r.transition(first['id'],'advance',step)
            saved=JobRepository(path).list()
            self.assertEqual(saved[0]['step'],6)
            self.assertIn('企画の下書き',saved[0]['artifact'])
            self.assertEqual(saved[1]['step'],0)
            with self.assertRaises(ValueError):r.create(' ')
            with self.assertRaises(ValueError):r.create('a'*601)

class HTTPTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.server=create_server('127.0.0.1',0,Path(self.temp.name)/'jobs.db','test-password',provider=OpenAIProvider(key=''))
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
        self.url=f'http://127.0.0.1:{self.server.server_port}'
    def tearDown(self):
        self.server.shutdown();self.server.server_close();self.thread.join();self.temp.cleanup()
    def call(self,path,body=None,authorized=True,origin=None):
        headers={}
        if authorized:headers['Authorization']='Basic '+base64.b64encode(b'toma:test-password').decode()
        if body is not None:headers['Content-Type']='application/json'
        if origin:headers['Origin']=origin
        return urlopen(Request(self.url+path,headers=headers,data=json.dumps(body).encode() if body is not None else None))
    def test_protected_api_and_private_files(self):
        with self.assertRaises(HTTPError) as e:self.call('/api/jobs',authorized=False)
        self.assertEqual(e.exception.code,401)
        for path in ['/server.py','/data/company.sqlite3','/AGENTS.md','/assets/../server.py']:
            with self.assertRaises(HTTPError) as e:self.call(path)
            self.assertEqual(e.exception.code,404)
        with self.call('/') as response:self.assertIn(b'company-storage',response.read())
        with self.call('/remote-workflow.js') as response:self.assertEqual(response.status,200)
    def test_create_progress_and_cross_origin_block(self):
        with self.call('/api/jobs',dict(request='調査項目を整理')) as response:job=json.load(response)['jobs'][0]
        with self.call(f"/api/jobs/{job['id']}/advance",dict(expectedStep=0)) as response:self.assertEqual(json.load(response)['jobs'][0]['step'],1)
        with self.assertRaises(HTTPError) as e:self.call('/api/jobs',dict(request='拒否される依頼'),origin='https://other.invalid')
        self.assertEqual(e.exception.code,403)
        with self.call('/api/jobs') as response:self.assertEqual(len(json.load(response)['jobs']),1)

    def test_unconfigured_ai_cannot_run_or_manually_finish(self):
        with self.call('/api/jobs',dict(request='AIに依頼する',mode='ai')) as response:
            data=json.load(response);job=data['jobs'][0]
        self.assertFalse(data['aiAvailable'])
        with self.assertRaises(HTTPError) as e:self.call(f"/api/jobs/{job['id']}/run",{})
        self.assertEqual(e.exception.code,409)
        with self.assertRaises(HTTPError) as e:self.call(f"/api/jobs/{job['id']}/advance",dict(expectedStep=0))
        self.assertEqual(e.exception.code,400)
        with self.call('/api/jobs') as response:saved=json.load(response)['jobs'][0]
        self.assertEqual(saved['step'],0);self.assertEqual(saved['execution'],'ready');self.assertIsNone(saved['artifact'])
