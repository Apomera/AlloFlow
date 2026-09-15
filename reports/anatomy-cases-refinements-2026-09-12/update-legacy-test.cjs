const fs=require('node:fs');const file='tests/anatomy_lab_science.test.js';let s=fs.readFileSync(file,'utf8');const a=`    expect(source).toContain("activeCaseId === cs.id");
    expect(source).toContain('Review explanation');`;const b=`    const restored = renderAnatomy({ system: 'circulatory', complexity: 3, _showClinical: true, _activeCaseId: 'case_3', _activeCaseFeedback: 'reveal' });
    expect(restored).toContain('The sinoatrial (SA) node');
    expect(restored).toContain('Mark explanation reviewed');`;if(!s.includes(a))throw Error('Test anchor');s=s.replace(a,b);fs.writeFileSync(file,s);
