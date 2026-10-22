import os,sys
D=os.path.dirname(os.path.abspath(__file__))
rd=lambda f: open(os.path.join(D,f),encoding='utf-8').read()
js='\n'.join(rd(f) for f in ['core.js','gfx.js','paint.js','world.js','env.js','wood.js','actors.js','art.js','bosses.js','bossart.js','rigs.js','cel.js','giant.js','wyrm.js','foes.js','story.js','hall.js','vig.js','game.js'])
open(os.path.join(D,'all.js'),'w',encoding='utf-8').write(js)
head=rd('p_head.html'); body=rd('p_body.html')
script='<script>\n'+js+'\n</script>\n'
full=('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
 '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">\n'
 '<meta name="theme-color" content="#0c0908">\n'+head+'</head>\n<body>\n'+body+script+'</body>\n</html>\n')
art=head+body+script
open(os.path.join(D,'..','einheri.html'),'w',encoding='utf-8').write(full)  # the playable page at the repo root
open(os.path.join(D,'artifact.html'),'w',encoding='utf-8').write(art)  # the same, without doctype/head, for Artifact publishing
print('full',len(full),'artifact',len(art),'js lines',js.count('\n'))
