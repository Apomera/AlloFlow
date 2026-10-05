import json,sys,math
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parent.parent
out=root/'docs'/'allopack-quality-2026-10-04'
out.mkdir(exist_ok=True,parents=True)
for slug in sys.argv[1:]:
 folder=root/'allopacks'/'media'/slug
 assets=json.loads((folder/'manifest.json').read_text(encoding='utf8'))['assets']
 for kind in ['term','lesson']:
  selected=[a for a in assets if (a['kind']=='lesson')==(kind=='lesson')]
  if not selected: continue
  cols=2 if kind=='lesson' else 4
  cw,ch=(550,400) if kind=='lesson' else (250,290)
  sheet=Image.new('RGB',(cw*cols,ch*math.ceil(len(selected)/cols)), 'white')
  draw=ImageDraw.Draw(sheet)
  for i,a in enumerate(selected):
   im=Image.open(folder/a['file']).convert('RGB')
   im.thumbnail((cw-20,ch-40),Image.Resampling.LANCZOS)
   x=(i%cols)*cw+(cw-im.width)//2;y=(i//cols)*ch+10
   sheet.paste(im,(x,y));draw.text(((i%cols)*cw+10,(i//cols)*ch+ch-24),a['id'],fill='black')
  target=out/(slug+'-'+kind+'-review.jpg');sheet.save(target,quality=92);print(target)
