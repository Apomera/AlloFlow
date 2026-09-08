import base64, io, sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
im.thumbnail((1200,900))
out=io.BytesIO()
im.save(out,format='JPEG',quality=65)
print(base64.b64encode(out.getvalue()).decode())
