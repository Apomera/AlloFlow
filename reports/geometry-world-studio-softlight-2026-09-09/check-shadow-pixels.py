from pathlib import Path
from PIL import Image, ImageChops
import json

root = Path(__file__).resolve().parent
metrics = []
for stage in ('before', 'after'):
    with Image.open(root / f'{stage}-detail-perspective-1200x820.png') as im:
        im = im.convert('RGB')
        # Clear portion of the projected floor shadow, to the right of the model.
        steps = []
        for y in range(526, 546):
            for x in range(818, 896):
                a, b = im.getpixel((x,y)), im.getpixel((x+1,y))
                steps.append(max(abs(c-d) for c,d in zip(a,b)))
        metrics.append({'stage': stage, 'region': [818,526,896,546], 'maxAdjacentStep': max(steps), 'stepsOver20': sum(s>20 for s in steps)})

saver = []
for name in ('saver-front-844x390.png', 'saver-perspective-1200x820.png', 'saver-perspective-390x844.png', 'saver-export.png'):
    with Image.open(root / ('before-'+name)) as b, Image.open(root / ('after-'+name)) as a:
        saver.append({'file': name, 'identical': b.size == a.size and ImageChops.difference(b.convert('RGB'), a.convert('RGB')).getbbox() is None})

exports = []
for stage in ('before', 'after'):
    with Image.open(root / f'{stage}-detail-perspective-export.png') as im:
        exports.append({'stage': stage, 'width': im.width, 'height': im.height, 'validSize': max(im.size)==2048})

summary = {'pass': metrics[1]['maxAdjacentStep'] < metrics[0]['maxAdjacentStep'] and metrics[1]['stepsOver20'] < metrics[0]['stepsOver20'] and all(x['identical'] for x in saver) and all(x['validSize'] for x in exports), 'shadowEdge': metrics, 'saver': saver, 'perspectiveExports': exports}
(root/'shadow-pixels.json').write_text(json.dumps(summary, indent=2), encoding='utf8')
print(json.dumps(summary))
if not summary['pass']:
    raise SystemExit(1)
