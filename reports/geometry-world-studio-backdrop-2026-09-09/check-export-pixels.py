from pathlib import Path
from PIL import Image
import json

root = Path(__file__).resolve().parent
results = []
for stage in ('before', 'after'):
    for quality in ('saver', 'detail'):
        name = f'{stage}-{quality}-export.png'
        with Image.open(root / name) as im:
            image = im.convert('RGB')
            width, height = image.size
            def sample(y):
                return list(image.getpixel((int(width * .18), int(height * y))))
            sky, floor = sample(.02), sample(.9)
            results.append(dict(stage=stage, quality=quality, file=name, width=width, height=height, sky=sky, floor=floor, contrast=max(abs(a-b) for a, b in zip(sky, floor))))
summary = {'pass': all(max(r['width'], r['height']) == 2048 and (r['stage'] != 'after' or r['contrast'] <= 6 and max(abs(a-b) for a,b in zip(r['sky'], [241,238,232])) <= 2) for r in results), 'exports': results}
(root / 'export-pixels.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
print(json.dumps(summary))
if not summary['pass']:
    raise SystemExit(1)
