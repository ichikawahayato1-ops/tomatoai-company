"""Build a drop-in office for the existing Mac FastAPI server (no config files)."""
from pathlib import Path
import re, shutil, zipfile
root = Path(__file__).resolve().parent.parent
out = root / 'dist-sns-office'
if out.exists(): shutil.rmtree(out)
static = out / 'app/company_office_static'
static.mkdir(parents=True)
for name in ['index.html','style.css','app.js','state.js','portrait-motion.js','ceo-view.js','company-workflow.js','remote-workflow.js']:
    shutil.copy2(root / name, static / name)
shutil.copytree(root / 'assets', static / 'assets')
html = (static / 'index.html').read_text()
html = re.sub(r'<section class="sns-department".*?</section>', '''<section class="sns-department" aria-labelledby="sns-title"><span class="eyebrow">INSTAGRAM DEPARTMENT</span><h2 id="sns-title">Instagram部署</h2><p>既存SNS部署の制作依頼・投稿・予約・実績を、この画面で使えます。</p><p class="sns-note">承認は実公開につながります。内容を確認してから既存画面で操作してください。</p><a href="/company" target="_blank" rel="noopener">SNS会社画面を別タブで開く ↗</a><iframe src="/company" title="Instagram部署：制作依頼・投稿・予約・実績" style="display:block;width:100%;height:900px;border:1px solid #e9e2d4;border-radius:16px;margin-top:20px;background:white"></iframe><p class="sns-note">TOMAの会話とキャラクターの動きはデモです。制作依頼は上のSNS部署のフォームから登録してください。</p></section>''', html, flags=re.S)
html = html.replace('</head>', '<script>if(!location.hash)location.hash="toma";</script></head>')
(static / 'index.html').write_text(html)
app = (static / 'app.js').read_text().replace('const companyWorkflow=mountCompanyWorkflow({dispatch:event=>window.tomatoOffice.dispatch(event)});', "byId('demo').textContent='SNS制作を依頼 →';byId('demo').onclick=()=>document.querySelector('.sns-department').scrollIntoView({behavior:'smooth'});")
(static / 'app.js').write_text(app)
shutil.copy2(root / 'integrations/company_office.py', out / 'app/company_office.py')
shutil.copy2(root / 'integrations/INSTALL-SNS-OFFICE.md', out / 'INSTALL.md')
archive = root.parent / 'Tomato-SNS-Office.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
    for p in out.rglob('*'):
        if p.is_file(): z.write(p, p.relative_to(out))
print(archive)
