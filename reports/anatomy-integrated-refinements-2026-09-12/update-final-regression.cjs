const fs=require('fs');const file='tests/anatomy_list_text_and_arrows.test.js';let s=fs.readFileSync(file,'utf8');s=s.replace('clips the compare card and flashcard clinical text on a boundary in %s','keeps clinical explanations complete while clipping only the function summary in %s');s=s.replace("expect(source).toContain('clipAtSentence(compareSel.clinical, 150)');",`expect(source).not.toContain('clipAtSentence(compareSel.clinical, 150)');
    const root=render(filePath,{system:'circulatory',selectedStructure:'heart',_compareStructure:'kidneys'},OLDER);
    const note=root.querySelector('[data-anatomy-compare-tray] [data-anatomy-clinical-note="kidneys"]');
    expect(note.querySelector('[data-anatomy-clinical-note-text]').textContent).toContain('A low filtration estimate alone is not an automatic start rule.');
    expect(note.querySelector('[data-anatomy-clinical-note-source]').href).toContain('kdigo.org');`);fs.writeFileSync(file,s);
fs.copyFileSync(__dirname+'/tests-results.json',__dirname+'/tests-full-results.json');
