"""Fix immersive mode image to show full uncropped image when UI is hidden."""
FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    c = f.read()

OLD = 'className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 animate-ken-burns"'
NEW = 'className={`absolute inset-0 w-full h-full ${immersiveHideUI ? \'object-contain\' : \'object-cover\'} transition-opacity duration-700 animate-ken-burns`}'

if OLD in c:
    c = c.replace(OLD, NEW, 1)
    print("OK: Replaced object-cover with conditional object-contain/cover")
else:
    print("SKIP: Pattern not found")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(c)
