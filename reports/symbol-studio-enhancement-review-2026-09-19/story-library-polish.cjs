const fs=require('fs');
function edit(file,before,after){let s=fs.readFileSync(file,'utf8');if(!s.includes(before))throw new Error('Missing anchor '+file);fs.writeFileSync(file,s.replace(before,()=>after));}
edit('symbol_studio_module.js', '        studioDraftWorkEpochRef.current.story += 1; storyRevisionRef.current += 1;', `        studioDraftWorkEpochRef.current.story += 1; storyRevisionRef.current += 1;
        Object.keys(symbolWorkRef.current.pending).forEach(function (key) { if (studioDraftWorkGroup(key) === 'story') delete symbolWorkRef.current.pending[key]; });`);
fs.copyFileSync('symbol_studio_module.js','desktop/web-app/public/symbol_studio_module.js');
edit('tests/symbol_studio_story_library.test.js', `    const pending = deferred();
    await mount({ onCallGemini: () => pending.promise });`, `    const pending = deferred(); const next = deferred();
    const generate = vi.fn().mockImplementationOnce(() => pending.promise).mockImplementationOnce(() => next.promise);
    await mount({ onCallGemini: generate });`);
edit('tests/symbol_studio_story_library.test.js', `    await settle(() => pending.resolve(JSON.stringify([{ text: 'Too late' }])));
    expect(host.querySelector('.ss-story-page p').textContent).toBe(saved.pages[0].text);
    expect(control('Generate social story').disabled).toBe(false);`, `    await click('Generate social story'); expect(generate).toHaveBeenCalledTimes(2);
    await settle(() => pending.resolve(JSON.stringify([{ text: 'Too late' }])));
    expect(host.querySelector('.ss-story-page p').textContent).toBe(saved.pages[0].text);
    expect(control('Generate social story').disabled).toBe(true);
    await settle(() => next.resolve(JSON.stringify([{ text: 'A fresh story after reopening.' }])));
    expect(host.querySelector('.ss-story-page p').textContent).toBe('A fresh story after reopening.');
    expect(control('Generate social story').disabled).toBe(false);`);
console.log('Released canceled generation locks and extended regression coverage.');
