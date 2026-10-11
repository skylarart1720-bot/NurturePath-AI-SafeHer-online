from PIL import Image, ImageDraw
from pathlib import Path
target = Path('public/brand')
for size in [192, 512]:
    image = Image.new('RGB', (size, size), '#087E83')
    draw = ImageDraw.Draw(image)
    scale = size / 64
    path = [(32, 48), (19, 38), (14, 31), (14, 23), (18, 17), (24, 16), (32, 23), (40, 16), (46, 17), (50, 23), (50, 31), (45, 38), (32, 48)]
    draw.line([(int(x*scale),int(y*scale)) for x,y in path], fill='white', width=int(2.5*scale), joint='curve')
    line=[(16,32),(25,32),(29,25),(34,39),(38,32),(48,32)]
    draw.line([(int(x*scale),int(y*scale)) for x,y in line],fill='white',width=int(2*scale),joint='curve')
    image.save(target / f'icon-{size}.png')
print('Generated original PWA icons.')
