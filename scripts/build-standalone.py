from pathlib import Path
import base64,re
root=Path(__file__).resolve().parent.parent
css=(root/'style.css').read_text()
modules=[]
for name in ['state.js','portrait-motion.js','ceo-view.js','remote-workflow.js','company-workflow.js','app.js']:
 s=(root/name).read_text()
 s=re.sub(r'^import .*?;\n','',s,flags=re.M)
 s=re.sub(r'^export ','',s,flags=re.M)
 modules.append(s)
js='\n'.join(modules)+'\nif(location.hash!=="#toma")ceoView.open();\n'
html=(root/'index.html').read_text()
html=re.sub(r'<link[^>]*href="style.css"[^>]*>',lambda m:'<style>'+css+'</style>',html)
html=html.replace('<script type="module" src="app.js"></script>','<script>'+js+'</script>')
for name in sorted(set(re.findall(r'assets/[\w.-]+\.png',html))):
 p=root/name
 html=html.replace(name,'data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode())
output=root.parent/'TOMA-preview.html'
output.write_text(html)
print(f'{output}: {output.stat().st_size//1024//1024} MB')
