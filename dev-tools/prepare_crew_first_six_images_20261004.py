from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import sys

slug=sys.argv[1]
folder=Path('allopacks/media')/slug
files=sorted(folder.glob('*.png'))
tiles=[]
for f in files:
    with Image.open(f) as im:
        im.convert('RGB').resize((1,1))  # Force full decoding before saving.
        target=720 if '-img-' in f.stem else 400
        final=ImageOps.contain(im.convert('RGB'),(target,target))
        final.save(f.with_suffix('.webp'),'WEBP',quality=70,method=6)
        tile=Image.new('RGB',(320,350),'white')
        preview=ImageOps.contain(im.convert('RGB'),(320,320))
        tile.paste(preview,((320-preview.width)//2,0))
        ImageDraw.Draw(tile).text((5,328),f.stem,fill='black')
        tiles.append(tile)
sheet=Image.new('RGB',(960,350*((len(tiles)+2)//3)),(230,230,230))
for i,tile in enumerate(tiles):sheet.paste(tile,((i%3)*320,(i//3)*350))
sheet.save(folder/'visual-review-contact-sheet.jpg',quality=90)
print(f'{slug}: {len(files)} source PNGs decoded; WebP assets saved.')
