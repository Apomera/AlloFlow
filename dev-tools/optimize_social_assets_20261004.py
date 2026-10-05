import json,sys
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parent.parent
for slug in sys.argv[1:]:
 folder=root/'allopacks'/'media'/slug
 manifest=json.loads((folder/'manifest.json').read_text(encoding='utf8'))
 records=[]
 for a in manifest['assets']:
  im=Image.open(folder/a['file']).convert('RGB')
  limit=1100 if a.get('vectorFile') else (900 if a['kind']=='lesson' else 400)
  im.thumbnail((limit,limit),Image.Resampling.LANCZOS)
  filename=a.get('webpFile',a['id']+'.webp')
  im.save(folder/filename,'WEBP',quality=94 if a.get('vectorFile') else 76,method=6)
  records.append(dict(id=a['id'],kind=a['kind'],file=filename,width=im.width,height=im.height,alt=a['alt']))
 (folder/'embedded-assets.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf8')
 print(slug,len(records))
