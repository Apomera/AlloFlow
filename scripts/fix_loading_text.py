FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    c = f.read()

OLD = "Universal Design for Learning Platform</p>"
NEW = ('Adaptive Levels, Layers, &amp; Outputs</p>\n'
       '            <p style={{ fontSize: \'11px\', color: \'rgba(165,180,252,0.5)\', '
       'margin: \'0 0 32px\', fontWeight: 500, fontStyle: \'italic\' }}>'
       'Informed by Universal Design for Learning</p>')

# Actually, JSX uses & directly, not &amp;
NEW = ('Adaptive Levels, Layers, & Outputs</p>\n'
       '            <p style={{ fontSize: \'11px\', color: \'rgba(165,180,252,0.5)\', '
       'margin: \'0 0 32px\', fontWeight: 500, fontStyle: \'italic\' }}>'
       'Informed by Universal Design for Learning</p>')

if OLD in c:
    c = c.replace(OLD, NEW)
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(c)
    print('Updated loading screen text')
else:
    print('NOT FOUND')
