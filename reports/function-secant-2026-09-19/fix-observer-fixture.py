from pathlib import Path
p=Path('tests/funcgrapher_secant_investigation.test.js');s=p.read_text(encoding='utf-8');anchor='const api=()=>';s=s.replace(anchor,"beforeEach(()=>{vi.stubGlobal('ResizeObserver',class {observe(){} unobserve(){} disconnect(){}});});\nafterEach(()=>vi.unstubAllGlobals());\n"+anchor,1);p.write_text(s,encoding='utf-8')
