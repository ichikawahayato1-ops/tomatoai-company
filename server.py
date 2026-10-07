"""Tomato AI Company: same-origin app + durable demo workflow API."""
import argparse, base64, hmac, json, os, sqlite3, uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, unquote
from ai_company import CompanyRunner, OpenAIProvider, ProviderError

ROOT = Path(__file__).resolve().parent
STAGES = ['TOMAが依頼を整理','LYCOが調査項目を整理','SOLが構成を整理','POMOが下書きを準備','RUBYが確認','TOMAが納品を確認']

def now():
    return datetime.now(timezone.utc).isoformat()

class JobRepository:
    def __init__(self, path):
        self.path = str(path)
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.execute('CREATE TABLE IF NOT EXISTS jobs (sequence INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL, payload TEXT NOT NULL)')
    def connect(self):
        return sqlite3.connect(self.path, timeout=15)
    def list(self):
        with self.connect() as db:
            return [json.loads(row[0]) for row in db.execute('SELECT payload FROM jobs ORDER BY sequence')]
    def create(self, request, mode="demo"):
        if not isinstance(request, str) or not request.strip() or len(request)>600:
            raise ValueError('依頼は1〜600文字で入力してください。')
        if mode not in ('demo','ai'):raise ValueError('不明な実行モードです。')
        job = dict(id=str(uuid.uuid4()), request=request.strip(), step=0, history=[dict(at=now(),text='依頼を受付')], artifact=None,mode=mode,execution='ready',outputs=[],answers=[],revisions=0,error='',question='')
        with self.connect() as db:
            db.execute('INSERT INTO jobs(id,payload) VALUES (?,?)',(job['id'],json.dumps(job,ensure_ascii=False)))
        return job
    def transition(self, job_id, action, expected_step):
        if type(expected_step) is not int:
            raise ValueError('進行段階を指定してください。')
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            jobs = [json.loads(row[0]) for row in db.execute('SELECT payload FROM jobs ORDER BY sequence')]
            active = next((j for j in jobs if j['step']<6 and j.get('execution')!='cancelled'),None)
            if not active or active['id']!=job_id or active['step']!=expected_step:
                raise ValueError('別の画面で進行が更新されました。最新の状態を確認してください。')
            if active.get('mode')=='ai':raise ValueError('AIの仕事は手動で完了にできません。')
            if action=='revise':
                if active['step']!=4:
                    raise ValueError('差し戻しはレビュー中にできます。')
                active['step']=3
                active['history'].append(dict(at=now(),text='RUBYからPOMOへ修正依頼（デモ）'))
            elif action=='advance':
                active['history'].append(dict(at=now(),text=STAGES[active['step']]+'（デモ確認済み）'))
                active['step']+=1
                if active['step']==6:
                    active['artifact']=f"# 依頼整理シート（デモ）\n\n## 依頼\n{active['request']}\n\n## 制作前に確認すること\n- 誰に届けるか\n- 目的と完成条件\n- 必要な資料・根拠\n- 納期と制約\n\n## 次の行動\n上記の条件を具体化して、調査・制作に進みます。\n\n※これは依頼文から作成したテンプレートです。実際の調査・AI制作・品質審査は未実行です。\n"
            else:
                raise ValueError('不明な操作です。')
            db.execute('UPDATE jobs SET payload=? WHERE id=?',(json.dumps(active,ensure_ascii=False),job_id))
        return active

    def get(self, job_id):
        with self.connect() as db:
            row=db.execute('SELECT payload FROM jobs WHERE id=?',(job_id,)).fetchone()
            if not row:raise ValueError('依頼が見つかりません。')
            return json.loads(row[0])
    def change_ai(self, job_id, fn):
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            row=db.execute('SELECT payload FROM jobs WHERE id=?',(job_id,)).fetchone()
            if not row:raise ValueError('依頼が見つかりません。')
            job=json.loads(row[0])
            if job.get('mode')!='ai':raise ValueError('AIの依頼ではありません。')
            fn(job,db)
            db.execute('UPDATE jobs SET payload=? WHERE id=?',(json.dumps(job,ensure_ascii=False),job_id))
        return job
    def claim_ai(self, job_id):
        def claim(job,db):
            active=next((json.loads(row[0]) for row in db.execute('SELECT payload FROM jobs ORDER BY sequence') if json.loads(row[0])['step']<6 and json.loads(row[0]).get('execution')!='cancelled'),None)
            if not active or active['id']!=job_id or job['execution'] not in ('ready','failed'):
                raise ValueError('前の依頼の完了、または質問への回答を待っています。')
            job['execution']='running';job['error']=''
            job['history'].append(dict(at=now(),text='AIの実行を開始'))
        return self.change_ai(job_id,claim)
    def finish_ai_stage(self, job_id, step, result):
        def finish(job,db):
            if job['execution']=='cancelled':return
            if job['execution']!='running' or job['step']!=step:raise ValueError('進行が更新されました。')
            if result['needs_input']:
                job['execution']='needs_input';job['question']=result['question']
                job['history'].append(dict(at=now(),text='TOMAから確認の質問'))
                return
            job['outputs'].append(dict(stage=step,content=result['content'],approved=result['approved']))
            job['history'].append(dict(at=now(),text=STAGES[step]+'（AI処理完了）'))
            if step==4 and not result['approved']:
                job['revisions']+=1
                if job['revisions']>2:
                    job['execution']='failed';job['error']='レビューで未解決の点があります。依頼内容を補足して再試行してください。'
                else:
                    job['step']=3
                    job['history'].append(dict(at=now(),text='RUBYからPOMOへ修正依頼'))
                return
            job['step']+=1
            if job['step']==6:
                job['artifact']=result['content'];job['execution']='completed'
        job=self.change_ai(job_id,finish)
        return job['execution']
    def fail_ai(self, job_id, error):
        def fail(job,db):
            if job['execution']=='cancelled':return
            job['execution']='failed';job['error']=error
            job['history'].append(dict(at=now(),text='実行を停止: '+error))
        return self.change_ai(job_id,fail)
    def answer_ai(self, job_id, answer):
        if not isinstance(answer,str) or not answer.strip() or len(answer)>1500:raise ValueError('回答は1〜1500文字で入力してください。')
        def answer_job(job,db):
            if job['execution'] not in ('needs_input','failed'):raise ValueError('回答待ちではありません。')
            job['answers'].append(answer.strip());job['question']='';job['error']='';job['execution']='ready';job['revisions']=0
            job['history'].append(dict(at=now(),text='ユーザーが依頼を補足'))
        return self.change_ai(job_id,answer_job)
    def cancel_ai(self, job_id):
        def cancel(job,db):
            if job['execution'] in ('completed','cancelled'):raise ValueError('この依頼は終了しています。')
            job['execution']='cancelled';job['error']='';job['question']=''
            job['history'].append(dict(at=now(),text='ユーザーが依頼を中止'))
        return self.change_ai(job_id,cancel)
    def recover_ai(self):
        for job in self.list():
            if job.get('mode')=='ai' and job.get('execution')=='running':
                self.fail_ai(job['id'],'サーバーの再起動で中断しました。再試行してください。')

class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        # Never log request headers, credentials or request content.
        pass
    def reply(self, code, data, kind='application/json; charset=utf-8'):
        body = json.dumps(data,ensure_ascii=False).encode() if kind.startswith('application/json') else data
        self.send_response(code)
        self.send_header('Content-Type',kind)
        self.send_header('Content-Length',str(len(body)))
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Cache-Control','no-store' if self.path.startswith('/api/') or kind.startswith('text/html') else 'no-cache')
        self.end_headers()
        self.wfile.write(body)
    def authorized(self):
        password=self.server.password
        if password:
            try:
                if not self.headers.get('Authorization','').startswith('Basic '):raise ValueError('invalid authentication')
                value=base64.b64decode(self.headers.get('Authorization','').removeprefix('Basic '),validate=True).decode()
                username, supplied=value.split(':',1)
                accepted=hmac.compare_digest(username,'toma') and hmac.compare_digest(supplied.encode(),password.encode())
            except (ValueError,UnicodeError):
                accepted=False
        else:
            accepted=self.client_address[0] in ('127.0.0.1','::1')
        if not accepted:
            self.send_response(401)
            self.send_header('WWW-Authenticate','Basic realm="Tomato AI Company", charset="UTF-8"')
            self.send_header('Content-Length','0')
            self.end_headers()
        return accepted
    def do_GET(self):
        path=unquote(urlsplit(self.path).path)
        if path=='/api/health':
            self.reply(200,dict(ok=True));return
        if not self.authorized():return
        if path=='/api/jobs':
            self.reply(200,dict(jobs=self.server.repository.list(),aiAvailable=self.server.runner.available));return
        if path in ('/','/index.html'):
            body=(ROOT/'index.html').read_text().replace('</head>','<meta name="company-storage" content="server"><script>if(!location.hash)location.hash="toma";</script></head>')
            self.reply(200,body.encode(),'text/html; charset=utf-8');return
        # Serve only app assets, never database, secrets or repository files.
        allowed={'app.js','state.js','style.css','ceo-view.js','portrait-motion.js','company-workflow.js','remote-workflow.js','seed-learning.js'}
        relative=path.lstrip('/')
        file=(ROOT/relative).resolve()
        if file.parent==ROOT and relative in allowed:
            kind='text/css; charset=utf-8' if file.suffix=='.css' else 'text/javascript; charset=utf-8'
        elif file.parent==ROOT/'assets' and file.suffix=='.png':
            kind='image/png'
        else:
            self.reply(404,dict(error='見つかりません。'));return
        if not file.is_file():
            self.reply(404,dict(error='見つかりません。'));return
        self.reply(200,file.read_bytes(),kind)
    def do_POST(self):
        if not self.authorized():return
        origin=self.headers.get('Origin')
        if origin and urlsplit(origin).netloc!=self.headers.get('Host'):
            self.reply(403,dict(error='この画面から操作してください。'));return
        if self.headers.get('Content-Type','').split(';')[0]!='application/json':
            self.reply(415,dict(error='JSONで送信してください。'));return
        try:
            size=int(self.headers.get('Content-Length','0'))
            if not 0<size<=8192:raise ValueError('送信内容が大きすぎます。')
            self.connection.settimeout(10)
            body=json.loads(self.rfile.read(size))
            if not isinstance(body,dict):raise ValueError('不正な送信内容です。')
            path=urlsplit(self.path).path
            if path=='/api/jobs':
                self.server.repository.create(body.get('request'),body.get('mode','demo'))
            else:
                parts=path.strip('/').split('/')
                if len(parts)!=4 or parts[:2]!=['api','jobs'] or parts[3] not in ('advance','revise','run','answer','cancel'):
                    self.reply(404,dict(error='見つかりません。'));return
                if parts[3]=='run':self.server.runner.start(parts[2])
                elif parts[3]=='cancel':self.server.repository.cancel_ai(parts[2])
                elif parts[3]=='answer':self.server.repository.answer_ai(parts[2],body.get('answer'))
                else:self.server.repository.transition(parts[2],parts[3],body.get('expectedStep'))
            self.reply(200,dict(jobs=self.server.repository.list(),aiAvailable=self.server.runner.available))
        except ProviderError as e:
            self.reply(409,dict(error=str(e)))
        except (ValueError, UnicodeError):
            self.reply(400,dict(error='依頼内容と進行段階を確認してください。最新の状態を読み直せます。'))
        except sqlite3.Error:
            self.reply(503,dict(error='保存できませんでした。時間をおいて再試行してください。'))

def create_server(host,port,database,password='',provider=None):
    server=ThreadingHTTPServer((host,port),Handler)
    server.repository=JobRepository(database)
    server.password=password
    server.repository.recover_ai()
    server.runner=CompanyRunner(server.repository,provider or OpenAIProvider())
    return server

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--host',default=os.environ.get('HOST','127.0.0.1'))
    parser.add_argument('--port',type=int,default=int(os.environ.get('PORT','3000')))
    args=parser.parse_args()
    password=os.environ.get('APP_PASSWORD','')
    if args.host not in ('127.0.0.1','localhost','::1') and not password:
        parser.error('外部公開にはAPP_PASSWORDを設定してください。')
    server=create_server(args.host,args.port,os.environ.get('DATABASE_PATH',str(ROOT/'data/company.sqlite3')),password)
    print(f'Tomato AI Company listening on {args.host}:{server.server_port}',flush=True)
    server.serve_forever()
