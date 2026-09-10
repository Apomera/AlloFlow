
from pathlib import Path
p=Path('stem_lab/stem_tool_algebracas.js');s=p.read_text(encoding='utf-8')
a="            updMulti({ result: local.text, verify: local.verify, history: localHistory, isLoading: false });"
b="""            var localModes=Object.assign({},d._modesUsed||{},{solve:true}),localCount=(d._solveCount||0)+1;
            updMulti({ result: local.text, verify: local.verify, history: localHistory, isLoading: false, _solveCount:localCount, _modesUsed:localModes });
            if(awardStemXP)awardStemXP('algebraCAS',5,'Exact local solve');
            checkBadges(Object.assign({},d,{_solveCount:localCount,_modesUsed:localModes,history:localHistory}));"""
assert a in s;s=s.replace(a,b,1)
a="            if (localGrade.correct && awardStemXP) awardStemXP('algebraCAS', 10, 'Exact linear practice');"
b=a+"\n            checkBadges(Object.assign({},d,{_maxStreak:Math.max(d._maxStreak||0,streak)}));"
assert a in s;s=s.replace(a,b,1)
p.write_text(s,encoding='utf-8',newline='\n')
Path('desktop/web-app/public/stem_lab/stem_tool_algebracas.js').write_bytes(p.read_bytes())
p=Path('tests/stem_learning_expansion.test.js');s=p.read_text(encoding='utf-8')
s=s.replace("expect(state().history[0].verify.exact).toBe(true);","expect(state().history[0].verify.exact).toBe(true);\n    expect(state()._solveCount).toBe(1);expect(state()._modesUsed.solve).toBe(true);expect(state()._badgesEarned).toContain('firstSolve');",1)
p.write_text(s,encoding='utf-8',newline='\n')
print('Local algebra now contributes to the existing solve and streak achievements.')

