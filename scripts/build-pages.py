from pathlib import Path
import shutil
root=Path(__file__).resolve().parent.parent
out=root/'dist'
if out.exists():shutil.rmtree(out)
out.mkdir()
for name in ['index.html','style.css','app.js','state.js','portrait-motion.js','ceo-view.js','company-workflow.js','remote-workflow.js']:
 shutil.copy2(root/name,out/name)
shutil.copytree(root/'assets',out/'assets')
p=out/'index.html'
p.write_text(p.read_text().replace('</head>','<script>if(!location.hash)location.hash="toma";</script></head>'))
(out/'.nojekyll').touch()
print('GitHub Pages site built in dist; browser-local storage, no server data')
