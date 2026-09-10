
from pathlib import Path
p=Path('tests/algebracas_grading.test.js');s=p.read_text(encoding='utf-8')
s=s.replace('renders "Verified by the math engine" when the solved answer checks out','qualifies a numerical root check without claiming the AI steps are verified')
s=s.replace("expect(html).toContain('Verified by the math engine');","expect(html).toContain('Listed roots pass a numerical substitution check');\n    expect(html).toContain('steps are not independently checked');\n    expect(html).toContain('does not prove all roots were found');")
p.write_text(s,encoding='utf-8',newline='\n')
p=Path('tests/stem_learning_expansion.test.js');s=p.read_text(encoding='utf-8')
needle="  it('rejects invalid windows and tolerates undefined domains',()=>{"
s=s.replace(needle,"  it('identifies an all-zero sample set without inventing isolated roots',()=>{\n    expect(graph().scan(()=>0,-1,1)).toMatchObject({zeroThroughoutSamples:true,candidates:[]});\n  });\n"+needle,1)
p.write_text(s,encoding='utf-8',newline='\n')
print('Verification wording and zero-function regression coverage updated.')

