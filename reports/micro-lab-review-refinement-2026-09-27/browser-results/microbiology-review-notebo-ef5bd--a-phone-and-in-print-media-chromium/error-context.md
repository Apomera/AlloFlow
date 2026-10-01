# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: microbiology-review-notebooks.spec.ts >> reads the corrected print reference on a phone and in print media
- Location: tests\e2e\microbiology-review-notebooks.spec.ts:137:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('#micro-print-region')
Expected substring: "risk assessment"
Received string:    "Microbiology ReferenceNGSS MS-LS1 · HS-LS1 · HS-LS3 · HS-LS4Lab safety: Follow your instructor's approved activity and waste-disposal procedures. Wash hands before and after laboratory work, wear the required protective equipment and closed-toe shoes, and keep food and drink outside the lab. Report spills or injuries immediately. Unknown cultures must not be assumed harmless. This reference does not authorize handling live cultures.Biosafety levels: a risk-assessment frameworkA biosafety level combines practices, equipment, and facilities. Qualified staff assess the organism, procedure, and possible exposure to choose containment; a species name alone does not determine the level.BSL-1: Work with well-characterized agents unlikely to cause disease in healthy adults. Low risk does not mean zero risk.BSL-2: Work with agents associated with human disease, using additional training and safeguards suited to the activity.BSL-3: Specialized containment for work involving agents that can cause serious or lethal disease through inhalation.BSL-4: Maximum containment for work with certain highly hazardous agents. Vaccine availability alone does not determine containment.ASM recommends BSL-1 organisms for teaching unless a necessary learning objective requires approved BSL-2 work. Cultured unknown samples require BSL-2 handling. BSL-3 and BSL-4 work is outside teaching laboratories.Quick microbe referenceOn a narrow screen, scroll the table sideways. Keyboard users can focus the table region and use the arrow keys.Examples of bacteria and viruses. Roles depend on strain, host, and context; this table cannot identify an unknown specimen or establish its safety.MicrobeGroup / shapeHabitat / hostRole / effectEscherichia coli (E. coli)Bacterium / rod (bacillus)Lives in the gut of most mammals including humans. About 0.1% of human gut bacteria.mostly-beneficialLactobacillusBacterium / rodYogurt, sauerkraut, kimchi, sourdough, the human gut and vagina, soil.beneficialCyanobacteria (blue-green algae)Bacterium / variesOceans, freshwater, soil, ice. Some 3.5 billion years old - among the first life on Earth.beneficialMycobacterium tuberculosisBacterium / rodSpread human-to-human via airborne droplets. Roughly 1.5 million deaths/year globally.pathogenicStaphylococcus aureusBacterium / cocci (spheres in clusters)About 30% of healthy people carry it harmlessly on skin or in the nose. Can cause infection if it gets through the skin.mostly-pathogenicRhizobiumBacterium / rodSoil; forms nodules on the roots of legume plants (beans, peas, clover).beneficialSARS-CoV-2 (COVID-19)VirusHumans and other mammals, including cats, dogs, and deerCan cause human diseaseInfluenza AVirusHumans, birds, pigs, horses, dogs, others. Cross-species jumps cause pandemics.Can cause human diseaseHIV (Human Immunodeficiency Virus)VirusHumans only. Originally crossed from chimpanzees in central Africa, probably in the early 20th century.Can cause human diseaseBacteriophage (T4)VirusBacterial hosts, including E. coliInfects bacteriaMeaslesVirusHumans only.Can cause human diseaseAntibiotic stewardship checklist□ Antibiotics only when prescribed by a clinician.□ Antibiotics do not treat viral infections such as colds and flu. Some ear and sinus infections improve without antibiotics; ask a clinician.□ Take antibiotics exactly as prescribed. Do not change the dose or duration without clinical guidance.□ Never share antibiotics or take leftover doses.□ Ask what specific bacterium is being treated and whether a narrow-spectrum option is available.□ Don't demand antibiotics. Trust the diagnosis.Microbiome: influences and evidence limitsWhat shapes communitiesMicrobial communities differ by body site and between people. Different communities can still be healthy.Diet, medicines, and environmental exposures can change the microbiome. A change alone does not prove benefit or harm.Researchers study particular microbes, functions, and health outcomes. One microbiome measurement cannot diagnose overall health.Use evidence with careHandwashing with soap helps prevent infection. Microbiome research is not a reason to skip recommended hygiene.Probiotic benefits depend on the organism, product, and condition studied. Results for one product do not apply to all fermented foods or supplements.Birth, feeding, diet, and treatment decisions depend on individual needs and clinical guidance; microbial diversity is not a score for judging those choices.Sources and further readingCDC/NIH: Biosafety in Microbiological and Biomedical Laboratories, 6th editionASM: Guidelines for Biosafety in Teaching LaboratoriesOpenStax Microbiology: viruses and their hostsCDC: Animals and COVID-19NIH/NIEHS: The Microbiome, the Environment, and Your HealthNIH/NCCIH: Probiotics—Usefulness and SafetyCDC: About HandwashingCDC: Healthy Habits—Antibiotic Do’s and Don’ts"
Timeout: 15000ms

Call log:
  - Expect "toContainText" with timeout 15000ms
  - waiting for locator('#micro-print-region')
    31 × locator resolved to <div id="micro-print-region">…</div>
       - unexpected value "Microbiology ReferenceNGSS MS-LS1 · HS-LS1 · HS-LS3 · HS-LS4Lab safety: Follow your instructor's approved activity and waste-disposal procedures. Wash hands before and after laboratory work, wear the required protective equipment and closed-toe shoes, and keep food and drink outside the lab. Report spills or injuries immediately. Unknown cultures must not be assumed harmless. This reference does not authorize handling live cultures.Biosafety levels: a risk-assessment frameworkA biosafety level combines practices, equipment, and facilities. Qualified staff assess the organism, procedure, and possible exposure to choose containment; a species name alone does not determine the level.BSL-1: Work with well-characterized agents unlikely to cause disease in healthy adults. Low risk does not mean zero risk.BSL-2: Work with agents associated with human disease, using additional training and safeguards suited to the activity.BSL-3: Specialized containment for work involving agents that can cause serious or lethal disease through inhalation.BSL-4: Maximum containment for work with certain highly hazardous agents. Vaccine availability alone does not determine containment.ASM recommends BSL-1 organisms for teaching unless a necessary learning objective requires approved BSL-2 work. Cultured unknown samples require BSL-2 handling. BSL-3 and BSL-4 work is outside teaching laboratories.Quick microbe referenceOn a narrow screen, scroll the table sideways. Keyboard users can focus the table region and use the arrow keys.Examples of bacteria and viruses. Roles depend on strain, host, and context; this table cannot identify an unknown specimen or establish its safety.MicrobeGroup / shapeHabitat / hostRole / effectEscherichia coli (E. coli)Bacterium / rod (bacillus)Lives in the gut of most mammals including humans. About 0.1% of human gut bacteria.mostly-beneficialLactobacillusBacterium / rodYogurt, sauerkraut, kimchi, sourdough, the human gut and vagina, soil.beneficialCyanobacteria (blue-green algae)Bacterium / variesOceans, freshwater, soil, ice. Some 3.5 billion years old - among the first life on Earth.beneficialMycobacterium tuberculosisBacterium / rodSpread human-to-human via airborne droplets. Roughly 1.5 million deaths/year globally.pathogenicStaphylococcus aureusBacterium / cocci (spheres in clusters)About 30% of healthy people carry it harmlessly on skin or in the nose. Can cause infection if it gets through the skin.mostly-pathogenicRhizobiumBacterium / rodSoil; forms nodules on the roots of legume plants (beans, peas, clover).beneficialSARS-CoV-2 (COVID-19)VirusHumans and other mammals, including cats, dogs, and deerCan cause human diseaseInfluenza AVirusHumans, birds, pigs, horses, dogs, others. Cross-species jumps cause pandemics.Can cause human diseaseHIV (Human Immunodeficiency Virus)VirusHumans only. Originally crossed from chimpanzees in central Africa, probably in the early 20th century.Can cause human diseaseBacteriophage (T4)VirusBacterial hosts, including E. coliInfects bacteriaMeaslesVirusHumans only.Can cause human diseaseAntibiotic stewardship checklist□ Antibiotics only when prescribed by a clinician.□ Antibiotics do not treat viral infections such as colds and flu. Some ear and sinus infections improve without antibiotics; ask a clinician.□ Take antibiotics exactly as prescribed. Do not change the dose or duration without clinical guidance.□ Never share antibiotics or take leftover doses.□ Ask what specific bacterium is being treated and whether a narrow-spectrum option is available.□ Don't demand antibiotics. Trust the diagnosis.Microbiome: influences and evidence limitsWhat shapes communitiesMicrobial communities differ by body site and between people. Different communities can still be healthy.Diet, medicines, and environmental exposures can change the microbiome. A change alone does not prove benefit or harm.Researchers study particular microbes, functions, and health outcomes. One microbiome measurement cannot diagnose overall health.Use evidence with careHandwashing with soap helps prevent infection. Microbiome research is not a reason to skip recommended hygiene.Probiotic benefits depend on the organism, product, and condition studied. Results for one product do not apply to all fermented foods or supplements.Birth, feeding, diet, and treatment decisions depend on individual needs and clinical guidance; microbial diversity is not a score for judging those choices.Sources and further readingCDC/NIH: Biosafety in Microbiological and Biomedical Laboratories, 6th editionASM: Guidelines for Biosafety in Teaching LaboratoriesOpenStax Microbiology: viruses and their hostsCDC: Animals and COVID-19NIH/NIEHS: The Microbiome, the Environment, and Your HealthNIH/NCCIH: Probiotics—Usefulness and SafetyCDC: About HandwashingCDC: Healthy Habits—Antibiotic Do’s and Don’ts"

```

```yaml
- heading "Microbiology Reference" [level=2]
- text: NGSS MS-LS1 · HS-LS1 · HS-LS3 · HS-LS4
- strong: "Lab safety:"
- text: Follow your instructor's approved activity and waste-disposal procedures. Wash hands before and after laboratory work, wear the required protective equipment and closed-toe shoes, and keep food and drink outside the lab. Report spills or injuries immediately. Unknown cultures must not be assumed harmless. This reference does not authorize handling live cultures.
- 'heading "Biosafety levels: a risk-assessment framework" [level=3]'
- paragraph: A biosafety level combines practices, equipment, and facilities. Qualified staff assess the organism, procedure, and possible exposure to choose containment; a species name alone does not determine the level.
- list:
  - listitem:
    - strong: "BSL-1:"
    - text: Work with well-characterized agents unlikely to cause disease in healthy adults. Low risk does not mean zero risk.
  - listitem:
    - strong: "BSL-2:"
    - text: Work with agents associated with human disease, using additional training and safeguards suited to the activity.
  - listitem:
    - strong: "BSL-3:"
    - text: Specialized containment for work involving agents that can cause serious or lethal disease through inhalation.
  - listitem:
    - strong: "BSL-4:"
    - text: Maximum containment for work with certain highly hazardous agents. Vaccine availability alone does not determine containment.
- paragraph: ASM recommends BSL-1 organisms for teaching unless a necessary learning objective requires approved BSL-2 work. Cultured unknown samples require BSL-2 handling. BSL-3 and BSL-4 work is outside teaching laboratories.
- heading "Quick microbe reference" [level=3]
- paragraph: On a narrow screen, scroll the table sideways. Keyboard users can focus the table region and use the arrow keys.
- region "Examples of bacteria and viruses. Roles depend on strain, host, and context; this table cannot identify an unknown specimen or establish its safety.":
  - table "Examples of bacteria and viruses. Roles depend on strain, host, and context; this table cannot identify an unknown specimen or establish its safety.":
    - caption: Examples of bacteria and viruses. Roles depend on strain, host, and context; this table cannot identify an unknown specimen or establish its safety.
    - rowgroup:
      - row "Microbe Group / shape Habitat / host Role / effect":
        - columnheader "Microbe"
        - columnheader "Group / shape"
        - columnheader "Habitat / host"
        - columnheader "Role / effect"
    - rowgroup:
      - row "Escherichia coli (E. coli) Bacterium / rod (bacillus) Lives in the gut of most mammals including humans. About 0.1% of human gut bacteria. mostly-beneficial":
        - rowheader "Escherichia coli (E. coli)"
        - cell "Bacterium / rod (bacillus)"
        - cell "Lives in the gut of most mammals including humans. About 0.1% of human gut bacteria."
        - cell "mostly-beneficial"
      - row "Lactobacillus Bacterium / rod Yogurt, sauerkraut, kimchi, sourdough, the human gut and vagina, soil. beneficial":
        - rowheader "Lactobacillus"
        - cell "Bacterium / rod"
        - cell "Yogurt, sauerkraut, kimchi, sourdough, the human gut and vagina, soil."
        - cell "beneficial"
      - row "Cyanobacteria (blue-green algae) Bacterium / varies Oceans, freshwater, soil, ice. Some 3.5 billion years old - among the first life on Earth. beneficial":
        - rowheader "Cyanobacteria (blue-green algae)"
        - cell "Bacterium / varies"
        - cell "Oceans, freshwater, soil, ice. Some 3.5 billion years old - among the first life on Earth."
        - cell "beneficial"
      - row "Mycobacterium tuberculosis Bacterium / rod Spread human-to-human via airborne droplets. Roughly 1.5 million deaths/year globally. pathogenic":
        - rowheader "Mycobacterium tuberculosis"
        - cell "Bacterium / rod"
        - cell "Spread human-to-human via airborne droplets. Roughly 1.5 million deaths/year globally."
        - cell "pathogenic"
      - row "Staphylococcus aureus Bacterium / cocci (spheres in clusters) About 30% of healthy people carry it harmlessly on skin or in the nose. Can cause infection if it gets through the skin. mostly-pathogenic":
        - rowheader "Staphylococcus aureus"
        - cell "Bacterium / cocci (spheres in clusters)"
        - cell "About 30% of healthy people carry it harmlessly on skin or in the nose. Can cause infection if it gets through the skin."
        - cell "mostly-pathogenic"
      - row "Rhizobium Bacterium / rod Soil; forms nodules on the roots of legume plants (beans, peas, clover). beneficial":
        - rowheader "Rhizobium"
        - cell "Bacterium / rod"
        - cell "Soil; forms nodules on the roots of legume plants (beans, peas, clover)."
        - cell "beneficial"
      - row "SARS-CoV-2 (COVID-19) Virus Humans and other mammals, including cats, dogs, and deer Can cause human disease":
        - rowheader "SARS-CoV-2 (COVID-19)"
        - cell "Virus"
        - cell "Humans and other mammals, including cats, dogs, and deer"
        - cell "Can cause human disease"
      - row "Influenza A Virus Humans, birds, pigs, horses, dogs, others. Cross-species jumps cause pandemics. Can cause human disease":
        - rowheader "Influenza A"
        - cell "Virus"
        - cell "Humans, birds, pigs, horses, dogs, others. Cross-species jumps cause pandemics."
        - cell "Can cause human disease"
      - row "HIV (Human Immunodeficiency Virus) Virus Humans only. Originally crossed from chimpanzees in central Africa, probably in the early 20th century. Can cause human disease":
        - rowheader "HIV (Human Immunodeficiency Virus)"
        - cell "Virus"
        - cell "Humans only. Originally crossed from chimpanzees in central Africa, probably in the early 20th century."
        - cell "Can cause human disease"
      - row "Bacteriophage (T4) Virus Bacterial hosts, including E. coli Infects bacteria":
        - rowheader "Bacteriophage (T4)"
        - cell "Virus"
        - cell "Bacterial hosts, including E. coli"
        - cell "Infects bacteria"
      - row "Measles Virus Humans only. Can cause human disease":
        - rowheader "Measles"
        - cell "Virus"
        - cell "Humans only."
        - cell "Can cause human disease"
- heading "Antibiotic stewardship checklist" [level=3]
- list:
  - listitem: □ Antibiotics only when prescribed by a clinician.
  - listitem: □ Antibiotics do not treat viral infections such as colds and flu. Some ear and sinus infections improve without antibiotics; ask a clinician.
  - listitem: □ Take antibiotics exactly as prescribed. Do not change the dose or duration without clinical guidance.
  - listitem: □ Never share antibiotics or take leftover doses.
  - listitem: □ Ask what specific bacterium is being treated and whether a narrow-spectrum option is available.
  - listitem: □ Don't demand antibiotics. Trust the diagnosis.
- 'heading "Microbiome: influences and evidence limits" [level=3]'
- strong: What shapes communities
- list:
  - listitem: Microbial communities differ by body site and between people. Different communities can still be healthy.
  - listitem: Diet, medicines, and environmental exposures can change the microbiome. A change alone does not prove benefit or harm.
  - listitem: Researchers study particular microbes, functions, and health outcomes. One microbiome measurement cannot diagnose overall health.
- strong: Use evidence with care
- list:
  - listitem: Handwashing with soap helps prevent infection. Microbiome research is not a reason to skip recommended hygiene.
  - listitem: Probiotic benefits depend on the organism, product, and condition studied. Results for one product do not apply to all fermented foods or supplements.
  - listitem: Birth, feeding, diet, and treatment decisions depend on individual needs and clinical guidance; microbial diversity is not a score for judging those choices.
- heading "Sources and further reading" [level=3]
- list:
  - listitem:
    - 'link "CDC/NIH: Biosafety in Microbiological and Biomedical Laboratories, 6th edition"':
      - /url: https://www.cdc.gov/labs/bmbl/index.html
  - listitem:
    - 'link "ASM: Guidelines for Biosafety in Teaching Laboratories"':
      - /url: https://asm.org/getmedia/e0cc1a61-74bb-402e-a4f9-80c9de0186fd/asm-biosafety-guidelines.pdf
  - listitem:
    - 'link "OpenStax Microbiology: viruses and their hosts"':
      - /url: https://openstax.org/books/microbiology/pages/6-1-viruses
  - listitem:
    - 'link "CDC: Animals and COVID-19"':
      - /url: https://www.cdc.gov/coronavirus/2019-ncov/daily-life-coping/animals.html
  - listitem:
    - 'link "NIH/NIEHS: The Microbiome, the Environment, and Your Health"':
      - /url: https://www.niehs.nih.gov/sites/default/files/health/materials/microbiome_508.pdf
  - listitem:
    - 'link "NIH/NCCIH: Probiotics—Usefulness and Safety"':
      - /url: https://www.nccih.nih.gov/health/probiotics-usefulness-and-safety
  - listitem:
    - 'link "CDC: About Handwashing"':
      - /url: https://www.cdc.gov/clean-hands/about/
  - listitem:
    - 'link "CDC: Healthy Habits—Antibiotic Do’s and Don’ts"':
      - /url: https://www.cdc.gov/antibiotic-use/about/
```

# Test source

```ts
  43  |   await quiz.locator(`input[name="micro-quiz-practice-0"][value="${bank[0].answer}"]`).check();
  44  |   await quiz.getByRole('button', { name: 'Check practice answer', exact: true }).click();
  45  |   await expect(quiz).toContainText('Correct after checking in practice: 1/1');
  46  |   expect((await state(page)).quizAnswers).toEqual(original);
  47  |   await quiz.locator('.micro-quiz-header').scrollIntoViewIfNeeded();
  48  |   await page.screenshot({ path: path.join(out, 'quiz-practice-desktop.png') });
  49  |   await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page);
  50  |   await page.screenshot({ path: path.join(out, 'quiz-practice-phone.png') });
  51  |   await page.getByRole('tab', { name: 'Home', exact: true }).click();
  52  |   await page.getByRole('tab', { name: 'Quiz', exact: true }).click();
  53  |   await expect(quiz).toContainText('Correct after checking in practice: 1/1');
  54  |   const saved = await state(page); await harness.unmount(page);
  55  |   await page.evaluate(data => (window as any).__mount({ microbiology: data }), saved);
  56  |   await expect(quiz.locator('[data-quiz-original-score]')).toHaveText('Original score: 14/15');
  57  |   await expect(quiz).toContainText('Correct in practice');
  58  |   expect(errors).toEqual([]);
  59  | });
  60  | 
  61  | test('restores a microscope measurement view and downloads original evidence while keeping a draft', async ({ page }) => {
  62  |   const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  63  |   await mount(page, 'microscope');
  64  |   const scope = page.getByRole('region', { name: 'Virtual microscope investigation', exact: true });
  65  |   await scope.getByRole('button', { name: 'Open measurement notebook · 0/5', exact: true }).click();
  66  |   await expect(scope.getByRole('button', { name: 'Download measurement notebook', exact: true })).toBeDisabled();
  67  |   await scope.getByRole('button', { name: 'Prepare slide · E. coli', exact: true }).click();
  68  |   await scope.getByRole('button', { name: 'Focus assist', exact: true }).click();
  69  |   await scope.getByRole('button', { name: 'Go to size estimate', exact: true }).click();
  70  |   await expect(scope.getByLabel('Your size estimate', { exact: true })).toBeFocused();
  71  |   await scope.getByLabel('Your size estimate', { exact: true }).fill('2000');
  72  |   await scope.getByRole('button', { name: 'Check and save estimate', exact: true }).click();
  73  |   await expect(scope).toContainText('A unit mix-up may explain this difference');
  74  |   await scope.getByLabel('Estimate units', { exact: true }).selectOption('nm');
  75  |   await scope.getByRole('button', { name: 'Check and save estimate', exact: true }).click();
  76  |   const result = (await state(page)).microscopeMeasurements.ecoli.result;
  77  |   await scope.getByLabel('Your size estimate', { exact: true }).fill('3');
  78  |   await scope.getByRole('button', { name: 'Open measurement notebook · 1/5', exact: true }).click();
  79  |   await scope.getByRole('button', { name: 'Prepare slide · T4 bacteriophage', exact: true }).click();
  80  |   await scope.getByRole('button', { name: 'Review saved view · E. coli', exact: true }).click();
  81  |   await expect(scope.getByLabel('Your size estimate', { exact: true })).toHaveValue('3');
  82  |   await expect(scope.getByLabel('Your size estimate', { exact: true })).toBeFocused();
  83  |   expect((await state(page)).microscopeMeasurements.ecoli.result).toEqual(result);
  84  |   expect((await state(page)).magnification).toBe(result.context.mag);
  85  |   expect((await state(page)).microscopeZoom).toBe(result.context.zoom);
  86  |   await scope.getByRole('button', { name: 'Open measurement notebook · 1/5', exact: true }).click();
  87  |   const downloadPromise = page.waitForEvent('download');
  88  |   await scope.getByRole('button', { name: 'Download measurement notebook', exact: true }).click();
  89  |   const download = await downloadPromise; await download.saveAs(path.join(out, 'measurement-notebook.txt'));
  90  |   const text = readFileSync(path.join(out, 'measurement-notebook.txt'), 'utf8');
  91  |   expect(text).toContain('2000 nm'); expect(text).toContain('1/5'); expect(text).toContain('T4 bacteriophage');
  92  |   expect(text).not.toContain('Your estimate: 3 nm');
  93  |   await page.screenshot({ path: path.join(out, 'measurement-notebook-desktop.png') });
  94  |   await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page);
  95  |   await page.screenshot({ path: path.join(out, 'measurement-notebook-phone.png') });
  96  |   expect(errors).toEqual([]);
  97  | });
  98  | 
  99  | test('compares each saved growth run with its own control and keeps stable IDs when removing a run', async ({ page }) => {
  100 |   const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  101 |   const base = { profile: 'ecoli', tempC: 37, pH: 7, oxygen: 100 };
  102 |   const current = { profile: 'thermus', tempC: 70, pH: 7.5, oxygen: 100 };
  103 |   const trials = [
  104 |     { id: 3, control: base, conditions: { ...base, oxygen: 0 }, prediction: 'higher', hypothesis: 'Original prediction', explanation: 'Evidence for trial three' },
  105 |     { id: 9, control: { ...base, oxygen: 0 }, conditions: base, prediction: 'higher', explanation: 'Evidence for trial nine' }
  106 |   ];
  107 |   await mount(page, 'growthLab', { growthLab: current, growthInvestigation: { trials, selectedId: 9, nextId: 10, control: current, hypothesis: 'Next run draft', prediction: 'similar' } });
  108 |   await page.getByText('Compare saved runs', { exact: true }).click();
  109 |   const review = page.locator('.micro-growth-review');
  110 |   await expect(review).toContainText('different saved controls');
  111 |   await expect(review.locator('tbody th')).toHaveText(['Trial 3', 'Trial 9']);
  112 |   await review.getByRole('button', { name: 'Trial 3', exact: true }).click();
  113 |   await expect(page.locator('#gl-explanation')).toHaveValue('Evidence for trial three');
  114 |   await expect(page.locator('#gl-hypothesis')).toHaveValue('Next run draft');
  115 |   const book = (await state(page)).growthInvestigation;
  116 |   await page.getByRole('button', { name: 'Use saved trial settings', exact: true }).click();
  117 |   expect((await state(page)).growthInvestigation).toEqual(book);
  118 |   expect((await state(page)).growthLab).toMatchObject(trials[0].conditions);
  119 |   await review.scrollIntoViewIfNeeded();
  120 |   await page.screenshot({ path: path.join(out, 'growth-review-desktop.png') });
  121 |   await page.setViewportSize({ width: 320, height: 800 }); await noOverflow(page);
  122 |   await review.scrollIntoViewIfNeeded();
  123 |   await review.locator('.micro-growth-table-wrap').focus();
  124 |   await page.keyboard.press('ArrowRight');
  125 |   await page.screenshot({ path: path.join(out, 'growth-review-phone.png') });
  126 |   await page.getByRole('button', { name: 'Remove selected trial', exact: true }).click();
  127 |   await expect(review.locator('tbody th')).toHaveText(['Trial 9']);
  128 |   await expect(page.locator('.micro-growth-trials strong')).toHaveText(['Trial 9']);
  129 |   const downloadPromise = page.waitForEvent('download');
  130 |   await page.getByRole('button', { name: 'Download notebook', exact: true }).click();
  131 |   const download = await downloadPromise; await download.saveAs(path.join(out, 'growth-notebook.txt'));
  132 |   const text = readFileSync(path.join(out, 'growth-notebook.txt'), 'utf8');
  133 |   expect(text).toContain('\nTrial 9\n'); expect(text).not.toContain('\nTrial 1\n');
  134 |   expect(errors).toEqual([]);
  135 | });
  136 | 
  137 | test('reads the corrected print reference on a phone and in print media', async ({ page }) => {
  138 |   const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  139 |   await mount(page, 'print');
  140 |   const reference = page.locator('#micro-print-region');
  141 |   await expect(reference.locator('caption')).toBeVisible();
  142 |   await expect(reference.locator('tbody th[scope="row"]')).not.toHaveCount(0);
> 143 |   await expect(reference).toContainText('risk assessment');
      |                           ^ Error: expect(locator).toContainText(expected) failed
  144 |   await expect(reference).not.toContainText('Lethal, no vaccine');
  145 |   const phage = reference.getByRole('row').filter({ hasText: 'T4' });
  146 |   await expect(phage).toContainText('bacteria');
  147 |   await expect(phage).not.toContainText('pathogen');
  148 |   await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page);
  149 |   await reference.scrollIntoViewIfNeeded();
  150 |   await page.screenshot({ path: path.join(out, 'reference-phone.png') });
  151 |   await page.setViewportSize({ width: 1000, height: 1000 }); await page.emulateMedia({ media: 'print' });
  152 |   await reference.screenshot({ path: path.join(out, 'reference-print.png') });
  153 |   expect(errors).toEqual([]);
  154 | });
  155 | 
```