# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: microbiology-experiment-design.spec.ts >> Resistance reflows at enlarged text and retains keyboard controls, current run and saved notebook
- Location: tests\e2e\microbiology-experiment-design.spec.ts:163:5

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator: locator('#micro-resistance-review-note')
Expected: "Later saved reflection."
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toHaveValue" with timeout 15000ms
  - waiting for locator('#micro-resistance-review-note')

```

```yaml
- heading "Microbiology Lab" [level=2]
- text: NGSS MS-LS1 · HS-LS1 · HS-LS3 · HS-LS4
- button "Show topic library"
- tablist "Microbiology sections":
  - tab "Home": 🦠 Home
  - tab "Bacteria": 🧫 Bacteria
  - tab "Viruses": 🧬 Viruses
  - tab "Mystery specimens": 🧩 Mystery specimens
  - tab "Microscope": 🔬 Microscope
  - tab "Resistance" [selected]: ⚠️ Resistance
  - tab "Microbiome": 🌱 Microbiome
  - tab "Quiz": 📝 Quiz
  - tab "Growth Lab": 📈 Growth Lab
- tabpanel "Resistance":
  - strong: ⚠️ Antibiotic resistance is a global health crisis.
  - text: Antibiotic-resistant infections killed at least 1.27 million people in 2019, with millions more deaths in which resistance contributed. The CDC ranks it among the top global health threats of this century.
  - heading "Antibiotic resistance - petri-dish evolution sim" [level=3]
  - text: Model selection acting on pre-existing resistant cells across repeated exposure rounds. Petri dish · Round 0 of 3
  - 'img "Petri dish model at exposure round 0. 80 cells remain; resistant share: 10%. Circles are sensitive cells and diamonds are resistant cells."'
  - text: sensitive circles resistant diamonds % resistant over time
  - img "Resistance trend from round 0 to round 0. Current resistant share is 10%. The line stops when no cells survive."
  - text: Alive 80 % Resistant 10%
  - note: "Model boundary: this dish holds 80 cells; the starting resistant count is rounded to a whole cell. Survival and reproduction are random. Resistant cells are present only when initial resistance is above zero. The simulation omits mutation, horizontal gene transfer, drug concentration over time, immune responses, and patient dosing. It demonstrates selection, not a treatment recommendation."
  - paragraph: "Resistant share is the percentage of living cells that are resistant: resistant cells ÷ all living cells × 100. With no survivors, the share is undefined."
  - group "1. Predict the resistant share after exposure":
    - text: 1. Predict the resistant share after exposure
    - radio "Increase" [checked]
    - text: Increase
    - radio "Stay about the same"
    - text: Stay about the same
    - radio "Decrease"
    - text: Decrease
    - radio "No survivors to compare"
    - text: No survivors to compare
  - text: "Exposure strength:"
  - strong: 30/100
  - slider "Antibiotic exposure strength in the teaching model": "30"
  - paragraph: Exposure strength is a relative teaching scale from 0 to 100. It changes survival probabilities in this model; it is not a drug dose.
  - text: "Exposure rounds:"
  - strong: "3"
  - slider "Number of exposure rounds in the teaching model": "3"
  - paragraph: Each round is one modeled survival-and-reproduction step, not a fixed amount of real time.
  - text: "Initial resistance:"
  - strong: 10%
  - slider "Initial resistance": "10"
  - paragraph: Requested starting percentage; the model rounds it to whole cells in a dish of 80.
  - button "▶ Play"
  - button "Step round"
  - button "↺ Reset current run"
  - group: View counts by exposure round
  - region "Resistance evidence notebook":
    - heading "Resistance evidence notebook" [level=3]
    - paragraph: Save observed evidence before resetting. Each record preserves a snapshot of the settings, original prediction, counts, and explanation. Snapshots may come from different rounds of the same run; they are not necessarily independent experiments.
    - text: My written evidence for the current run
    - textbox "My written evidence for the current run"
    - paragraph: Cite counts as well as percentages. Explain how survival and reproduction could account for the pattern. Editing this field changes the current run only; saved snapshots stay unchanged.
    - button "Save evidence" [disabled]
    - button "Download resistance notebook"
    - button "Download resistance CSV"
    - status: 1/8 snapshots saved. Observe at least one round to save evidence.
    - status
    - group:
      - text: Review saved resistance evidence
      - button "Evidence 7 Partial run Round 1/3 · Strength 30/100" [pressed]:
        - strong: Evidence 7
        - text: Partial run Round 1/3 · Strength 30/100
      - heading "Evidence 7 · Partial run" [level=4]
      - paragraph: "Saved settings: Strength 30/100 · 3 planned rounds · 10% initial resistance requested. Actual starting resistant count: 8/80 (10%)."
      - paragraph:
        - strong: "Original prediction:"
        - text: Increase
      - paragraph: "Observed at this snapshot: 68 cells alive, 8 resistant; resistant share 12%."
      - paragraph: This snapshot ends before the planned final round. Its original prediction has not been evaluated as a final outcome.
      - paragraph:
        - strong: "Selected explanation:"
        - text: Not recorded
      - paragraph:
        - strong: Original written evidence
      - blockquote: Original saved notes.
      - text: My reflection on saved evidence 7
      - textbox "My reflection on saved evidence 7": Later saved reflection.
      - paragraph: Saved as you type with this record and included separately in downloads. Use the saved counts to explain what you think now. Original notes, predictions, and outcomes stay unchanged; this reflection is not graded.
      - region "Saved resistance counts; scroll horizontally if needed":
        - table "Saved living-cell counts. Shares are rounded to whole percentages; no surviving cells means an undefined share.":
          - caption: Saved living-cell counts. Shares are rounded to whole percentages; no surviving cells means an undefined share.
          - rowgroup:
            - row "Round Sensitive Resistant Total alive Resistant share":
              - columnheader "Round"
              - columnheader "Sensitive"
              - columnheader "Resistant"
              - columnheader "Total alive"
              - columnheader "Resistant share"
          - rowgroup:
            - row "0 72 8 80 10%":
              - rowheader "0"
              - cell "72"
              - cell "8"
              - cell "80"
              - cell "10%"
            - row "1 60 8 68 12%":
              - rowheader "1"
              - cell "60"
              - cell "8"
              - cell "68"
              - cell "12%"
      - button "Remove selected evidence"
    - group: Compare saved resistance snapshots
  - text: How resistance evolves (in 5 steps)
  - list:
    - listitem:
      - strong: Random mutation.
      - text: A bacterium's DNA copies with rare errors. Most are harmful or neutral. Occasionally, one happens to make the bacterium less sensitive to an antibiotic.
    - listitem:
      - strong: Antibiotic exposure.
      - text: Patient takes the antibiotic. Susceptible bacteria die in massive numbers. The few that happen to be resistant survive.
    - listitem:
      - strong: Selection.
      - text: The resistant survivors have all the food and space to themselves. They reproduce. Within hours to days, the surviving population is mostly resistant.
    - listitem:
      - strong: Spread.
      - text: Resistant bacteria spread person-to-person, hospital-to-community, country-to-country. Bacteria can also transfer resistance genes between species via plasmids (horizontal gene transfer).
    - listitem:
      - strong: The antibiotic stops working.
      - text: For everyone. The drug that saved millions becomes useless. Each lost antibiotic narrows medicine's toolkit.
  - text: 🔁 Horizontal gene transfer - how bacteria share resistance
  - paragraph: "Bacteria don't just inherit genes from parents (VERTICAL transmission). They also SHARE genes with neighbors + sometimes with completely unrelated species (HORIZONTAL gene transfer). This is why antibiotic resistance spreads so fast: a resistance gene that evolves in one bacterium can be in a hundred different species within years. There are three main mechanisms."
  - button "Transformation"
  - button "Transduction (phage-mediated)"
  - button "Conjugation (pilus-mediated)"
  - text: Transformation What happens A bacterium picks up FREE DNA from its environment (released when other bacteria die + lyse). If the bacterium is "competent" - its membrane lets DNA in - the new DNA may integrate into its chromosome. Discovery + science Discovered by Frederick Griffith in 1928. He showed that dead virulent Streptococcus pneumoniae could transform live non-virulent strains into virulent ones - somehow "transferring" the virulence. Avery, MacLeod, McCarty (1944) showed the transforming agent was DNA. This experiment proved DNA carries genetic information. Examples / where it matters Streptococcus pneumoniae, Neisseria, Bacillus subtilis. Some species are "naturally competent" - they take up DNA constantly. Others can be made competent in the lab (this is how you genetically transform bacteria for biotech experiments). Speed + reach Limited to neighbors. Free DNA fragments don't travel far. But in dense communities like biofilms, every cell is a potential donor + recipient.
  - strong: "Why HGT shapes the resistance crisis:"
  - text: A resistance gene only needs to evolve ONCE in any bacterium anywhere on Earth. From there, conjugation can spread it across hundreds of species. By the time clinicians notice the resistance in patients, the gene may already be present in dozens of bacterial species worldwide. The NDM-1 gene first identified in 2008 is now found in ~70 countries + multiple bacterial families. This is why the "spread to other countries" is essentially guaranteed once a resistance gene exists.
  - strong: "HGT in evolution:"
  - text: The traditional "tree of life" with clean branches works for animals + plants - they mostly inherit genes vertically. Bacterial + archaeal evolution is more like a "web of life" because of constant horizontal transfer. About 8% of the human genome is virus-derived (from past retroviral infections); some of those genes are now essential (placenta development uses retroviral genes). HGT is not just a curiosity - it has shaped the genomes of every organism on Earth, including us. 💊 How antibiotics actually work (and what resistance breaks)
  - paragraph: Antibiotics are NOT all the same. Each class attacks a different essential bacterial function. Bacteria can evolve resistance to one mechanism without losing susceptibility to others. Knowing which class is which is the foundation of antibiotic stewardship - and the reason we still have working drugs.
  - text: "Beta-lactams (penicillin, amoxicillin, cephalosporins, carbapenems) Target: Cell wall (peptidoglycan synthesis)"
  - strong: "How it works:"
  - text: Block the enzyme that cross-links peptidoglycan strands. The bacterium tries to divide, can't build a wall, ruptures. Only works on actively dividing bacteria.
  - strong: "How resistance breaks it:"
  - text: "Bacteria produce β-lactamase enzymes that destroy the antibiotic. ESBL (extended-spectrum) and carbapenemase-producing bacteria break almost all β-lactams. Aminoglycosides (gentamicin, streptomycin, tobramycin) Target: Protein synthesis (30S ribosome)"
  - strong: "How it works:"
  - text: Bind the 30S ribosome subunit and cause mistranslation. Bacterial proteins fold wrong; cell dies.
  - strong: "How resistance breaks it:"
  - text: "Bacteria acquire enzymes that chemically modify the antibiotic before it can bind. Or change the ribosome target. Or pump it out. Tetracyclines (doxycycline, minocycline) Target: Protein synthesis (30S ribosome)"
  - strong: "How it works:"
  - text: Block the binding of tRNA to the ribosome. Protein synthesis stops.
  - strong: "How resistance breaks it:"
  - text: "Efflux pumps that physically remove the antibiotic from the cell. Ribosomal protection proteins. Most tetracycline resistance is plasmid-borne. Macrolides (azithromycin, erythromycin) Target: Protein synthesis (50S ribosome)"
  - strong: "How it works:"
  - text: Bind the 50S ribosome subunit and block protein elongation. The growing peptide can't exit the ribosome.
  - strong: "How resistance breaks it:"
  - text: "Methylation of the ribosomal RNA (so the antibiotic can't bind). Efflux pumps. Often co-resistance with clindamycin (D-test). Fluoroquinolones (ciprofloxacin, levofloxacin) Target: DNA replication (DNA gyrase + topoisomerase)"
  - strong: "How it works:"
  - text: Block the enzymes that supercoil + uncoil bacterial DNA during replication. Replication forks collapse. Cell dies.
  - strong: "How resistance breaks it:"
  - text: "Mutations in the gyrA/parC genes change the target. Efflux pumps. Quinolone resistance has risen dramatically in the last 20 years. Sulfonamides + trimethoprim Target: Folate synthesis"
  - strong: "How it works:"
  - text: Block two steps of bacterial folate (vitamin B9) synthesis. Without folate, bacteria can't make DNA. Humans get folate from food - we are not affected.
  - strong: "How resistance breaks it:"
  - text: "Acquired enzymes with altered active sites that the drugs can't inhibit. Folate uptake systems. Glycopeptides (vancomycin) Target: Cell wall (D-Ala-D-Ala terminus)"
  - strong: "How it works:"
  - text: Bind directly to the D-Ala-D-Ala terminus of peptidoglycan precursors, physically blocking wall assembly. Last-line drug for MRSA + many Gram-positives.
  - strong: "How resistance breaks it:"
  - text: VanA/VanB resistance changes the terminus to D-Ala-D-Lac, which vancomycin can't bind. VRE (vancomycin-resistant Enterococcus) and VRSA (vancomycin-resistant Staph) are growing problems.
  - strong: "Key insight:"
  - text: Antibiotics that work via the cell wall (β-lactams, vancomycin) are useless against organisms without a typical bacterial cell wall - including all viruses, fungi, and humans. This is why antibiotics don't treat the flu or a cold. The body has no equivalent target. What accelerates resistance
  - list:
    - listitem: Antibiotics prescribed for viral infections (antibiotics don't work on viruses).
    - listitem: Using the wrong antibiotic, dose, or duration - including changing a prescription without clinical guidance.
    - listitem: Antibiotics in animal feed for growth promotion (now banned in EU; still common elsewhere).
    - listitem: Poor sanitation + crowded conditions in hospitals + jails + refugee camps.
    - listitem: Lack of new antibiotic development. The pipeline has slowed for 40 years.
  - text: What helps
  - list:
    - listitem:
      - strong: "For you:"
      - text: Use antibiotics only when prescribed and take them exactly as directed. Do not shorten, extend, share, save, or reuse them without clinical guidance.
    - listitem:
      - strong: "For the world:"
      - text: Public investment in new antibiotic development. Restrictions on agricultural use. Phage therapy research. Better infection control in hospitals. Vaccines that prevent infection in the first place.
    - listitem:
      - strong: "Big picture:"
      - text: Stop treating antibiotics as a renewable resource. Each one is a one-shot weapon; once resistance is widespread, that antibiotic is gone forever.
  - text: 🎯 Phage therapy - the antibiotic alternative
  - paragraph: Bacteriophages (or just "phages") are viruses that infect bacteria - and ONLY bacteria, never human cells. The most abundant biological entity on Earth (~10³¹ of them). They were discovered in 1915-17 + used as antibacterial therapy in the Soviet Union throughout the 20th century. Western medicine largely abandoned them after antibiotics took off in the 1940s - but the antibiotic resistance crisis is bringing phage therapy back.
  - text: "Why phages are uniquely promising:"
  - list:
    - listitem:
      - strong: "Self-replicating:"
      - text: A single phage multiplies inside the bacterial host. One dose can grow into trillions, kill the infection, then disappear as targets run out.
    - listitem:
      - strong: "Highly specific:"
      - text: Each phage strain targets only one (or a few) bacterial species - no collateral damage to the gut microbiome. Antibiotics kill broadly; phages are surgical.
    - listitem:
      - strong: "Evolvable in real time:"
      - text: When bacteria evolve resistance to a phage, scientists can re-isolate phages from sewage or soil that have already evolved counter-resistance. The arms race never stops.
    - listitem:
      - strong: "Active against biofilms:"
      - text: Phages can penetrate biofilms where antibiotics fail. Several phage cocktails specifically target biofilm-forming pathogens.
    - listitem:
      - strong: "Free of antibiotic resistance:"
      - text: A phage that kills MRSA does so by an entirely different mechanism than methicillin. The MRSA bacteria's resistance to the antibiotic is irrelevant.
  - strong: "The complications:"
  - list:
    - listitem:
      - strong: "Identification needed:"
      - text: Treatment requires knowing the exact bacterial strain + having a phage that targets it. Takes days for the lab work - sometimes longer than antibiotic empirical treatment would.
    - listitem:
      - strong: "Regulatory pathway:"
      - text: Each phage cocktail is its own biological product. The FDA + EMA frameworks are designed for chemical drugs, not self-evolving viruses. "Compassionate use" + Phase I/II trials are progressing.
    - listitem:
      - strong: "Immune response:"
      - text: The body produces antibodies against the phage over time, neutralizing it. Multiple-dose regimens face this challenge.
    - listitem:
      - strong: "Bacterial defense:"
      - text: Bacteria evolve resistance to phages too (CRISPR is one of their defenses!). Phage cocktails - multiple phages with different targets - are used to slow this.
  - strong: "Where it stands clinically:"
  - text: Georgia + Russia have continued phage therapy clinically since the 1920s (Eliava Institute in Tbilisi treats ~5,000 patients/year). In the US + EU, phage therapy is currently "expanded access" / compassionate use only - given case-by-case for life-threatening multi-drug-resistant infections. ~100+ patients have been treated this way in the US since 2016. Several Phase II clinical trials are running in 2024-25 (Locus Biosciences, Armata Pharmaceuticals, Adaptive Phage Therapeutics, BiomX). First FDA-approved phage product is widely expected within ~5 years.
  - strong: "A famous case (2017, San Diego):"
  - text: Tom Patterson, a UCSD psychiatry professor, contracted a multidrug-resistant Acinetobacter baumannii infection while traveling in Egypt. After 9 months in a coma + every available antibiotic failing, his wife (epidemiologist Steffanie Strathdee) coordinated with Navy + UCSD researchers to compile a personalized phage cocktail from sewage samples around the world. He recovered. The case (documented in their 2019 book "The Perfect Predator") was a turning point in US medical interest in phage therapy. 💊 Antibiotic classes - chemistry, history, and the pipeline problem Antibiotics are not a single drug; they are roughly a dozen chemical classes with completely different mechanisms, spectrums, toxicities, and resistance patterns. Understanding the classes helps make sense of why doctors prescribe what they do, why courses sometimes change, and why the world is facing a slow-motion crisis in antibiotic discovery + use.
  - button "🧪 Beta-lactams (penicillin family)"
  - button "⚙️ Aminoglycosides"
  - button "🟡 Tetracyclines + glycylcyclines"
  - button "🔄 Macrolides + lincosamides"
  - button "⚡ Fluoroquinolones"
  - button "🛡️ Glycopeptides + lipoglycopeptides"
  - button "🆕 Newer classes (oxazolidinones + others)"
  - button "🏚️ Why the pipeline is empty"
  - text: "🧪 Beta-lactams (penicillin family) First introduced: 1928 · Alexander Fleming (penicillin, 1928); Howard Florey + Ernst Chain (purification, 1940); Norman Heatley (production) Chemistry + mechanism A four-membered β-lactam ring fused to a five- or six-membered ring. Penicillins (penicillin G, amoxicillin), cephalosporins (cephalexin, ceftriaxone, cefepime, ceftaroline), carbapenems (meropenem, ertapenem), monobactams (aztreonam). The β-lactam ring covalently binds + inactivates penicillin-binding proteins (PBPs) - enzymes that crosslink peptidoglycan in the bacterial cell wall. Bacteria die because they cannot maintain cell-wall integrity during growth. Clinical use Still the largest single class of antibiotics by prescription volume + by infections covered. Carbapenems are \"last-line\" for many gram-negative infections. Cephalosporins span generations from very narrow-spectrum (1st gen, skin infections) to extended-spectrum (3rd gen, meningitis + sepsis) to anti-MRSA (5th gen, ceftaroline). Resistance + limits Bacteria fight back with β-lactamases - enzymes that hydrolyze the β-lactam ring. Extended-spectrum β-lactamases (ESBLs) + carbapenemases (KPC, NDM, OXA-48) defeat even carbapenems. β-lactamase inhibitors (clavulanic acid, tazobactam, avibactam, vaborbactam) restore activity by inhibiting the enzymes."
  - strong: "The honest stewardship message:"
  - text: "The most important thing any individual + healthcare system can do is USE EXISTING ANTIBIOTICS APPROPRIATELY: not for viral infections (most colds, flu, most sore throats, most bronchitis), only for the right organism in the right dose for the right duration, with culture confirmation when possible. Every inappropriate course shortens the useful life of the entire class. CDC Be Antibiotics Aware + WHO World Antimicrobial Awareness Week campaigns reinforce this. School nurses + counselors are positioned to support family conversations about this without dismissing genuine illness. 🏛️ Public health surveillance - how we watch for outbreaks You do not see public health surveillance until it fails. The systems that scan wastewater for polio, sequence E. coli outbreaks to find their source, trace contacts during an Ebola scare, and track excess mortality in real time during a pandemic are how a society defends itself against infectious disease. They are also chronically underfunded, institutionally fragmented, and politically vulnerable. School-based health workers + counselors are often the closest most students get to the system."
  - button "🔭 What surveillance is"
  - button "🚰 Wastewater surveillance"
  - button "🕸️ Contact tracing"
  - button "🧬 Genomic surveillance + PulseNet"
  - button "🌍 One Health framework"
  - button "📋 Excess mortality + cause-of-death surveillance"
  - button "🩺 Epidemiologists do this work"
  - button "⚖️ The trust + politics layer"
  - text: "🔭 What surveillance is Public health surveillance is the ongoing systematic collection, analysis, and interpretation of health data - used to plan, implement, and evaluate public health practice. It is the immune system of a community. Categories: PASSIVE surveillance (clinicians report cases to health departments - standard for ~100+ reportable diseases including TB, HIV, measles, salmonella, hepatitis), ACTIVE surveillance (health workers proactively go look for cases - used during outbreaks), SYNDROMIC surveillance (counting symptoms or hospital visits in real time, sometimes before specific diagnosis - used after 9/11 + during COVID), SENTINEL surveillance (selected clinics report intensively, used for flu via the US Influenza Sentinel Provider Network), and ENVIRONMENTAL surveillance (wastewater, air, water, food testing)."
  - strong: "Honest framing:"
  - text: Surveillance only works if (a) clinicians + labs report cases (often hard to enforce; in some US states reporting rates for certain diseases are below 50%), (b) the data gets to public health staff with time to act, (c) public health authorities have the power + capacity to respond. A surveillance system that detects an outbreak but cannot trigger a response is a tragic kind of theater.
```

# Test source

```ts
  71  |   await page.locator('#gl-profile').selectOption('thermus');
  72  |   await expect(design(page)).toHaveAttribute('data-growth-design', 'confounded');
  73  |   await expect(page.locator('#gl-design-guidance')).toContainText('You can still run it');
  74  |   const shape = await page.evaluate(() => (window as any).__MicrobiologyCore.growth.designPreview(
  75  |     (window as any).__toolData.microbiology.growthInvestigation.control, (window as any).__toolData.microbiology.growthLab));
  76  |   expect(Object.keys(shape).sort()).toEqual(['changed', 'control', 'design', 'held', 'trial']);
  77  |   expect(shape.changed).toEqual(['profile', 'oxygen']); expect(shape.held).toEqual(['tempC', 'pH']);
  78  |   await expect(page.locator('#gl-design-status')).toHaveAttribute('aria-live', 'polite');
  79  |   await expect(page.locator('#gl-design-status')).toHaveAttribute('aria-atomic', 'true');
  80  |   expect(await page.locator('#gl-design-status table').count()).toBe(0);
  81  |   await expect(page.locator('#gl-saved-result')).toHaveCount(0);
  82  |   expect((await state(page)).growthInvestigation.trials || []).toHaveLength(0);
  83  |   await phone(page); await design(page).screenshot({ path: path.join(out, 'growth-design-preview-phone.png') });
  84  |   await reload(page); await expect(design(page)).toHaveAttribute('data-growth-design', 'confounded');
  85  | });
  86  | 
  87  | test('preparing one Growth difference preserves saved evidence, recovery, sweeps and all working responses', async ({ page }) => {
  88  |   const trial = { id: 7, control: base, conditions: { ...base, oxygen: 50 }, prediction: 'lower', hypothesis: 'Original trial hypothesis.', explanation: 'Original saved explanation.' };
  89  |   const removed = { trial: { ...trial, id: 9, conditions: { ...base, pH: 6 }, hypothesis: 'Recoverable hypothesis.' }, index: 1 };
  90  |   await mount(page, { tab: 'growthLab', growthReviewHour: 6,
  91  |     growthLab: { ...changed, understood: true, stuckRevealed: true, hypothesis: 'Independent legacy note.', log: [{ note: 'Keep this legacy log.' }] },
  92  |     growthInvestigation: { control: base, trials: [trial], removed, selectedId: 7, nextId: 10, prediction: 'unsure', hypothesis: 'My next prediction reasoning.', explanation: 'Independent notebook note.',
  93  |       sweep: { variable: 'oxygen', conditions: base }, previousSweep: { variable: 'pH', conditions: { ...changed, oxygen: 100 } }, sweepVariable: 'pH' },
  94  |     mysteryLab: { active: 'wall' }, quizAnswers: [1, 2] });
  95  |   const before = await state(page), savedView = await page.locator('#gl-saved-result').innerText();
  96  |   await page.locator('#gl-design-variable').selectOption('oxygen');
  97  |   expect(await state(page)).toEqual(before);
  98  |   await page.locator('#gl-design-prepare').press('Enter');
  99  |   await expect(page.locator('#gl-design-heading')).toBeFocused();
  100 |   await expect(design(page)).toHaveAttribute('data-growth-design', 'single');
  101 |   let saved = await state(page);
  102 |   expect(saved.growthLab).toEqual({ ...before.growthLab, ...base, oxygen: 35 });
  103 |   expect(saved.growthInvestigation).toEqual(before.growthInvestigation);
  104 |   expect(saved.growthReviewHour).toBe(6); expect(saved.mysteryLab).toEqual(before.mysteryLab); expect(saved.quizAnswers).toEqual(before.quizAnswers);
  105 |   expect(await page.locator('#gl-saved-result').innerText()).toBe(savedView);
  106 |   await expect(page.getByRole('button', { name: 'Run comparison', exact: true })).toBeEnabled();
  107 |   await expect(page.locator('#gl-design-prepare')).toHaveCount(0);
  108 |   await phone(page); await design(page).screenshot({ path: path.join(out, 'growth-design-repair-phone.png') });
  109 |   await reload(page); saved = await state(page);
  110 |   await expect(design(page)).toHaveAttribute('data-growth-design', 'single'); expect(saved.growthInvestigation).toEqual(before.growthInvestigation);
  111 |   expect(saved.growthLab).toEqual({ ...before.growthLab, ...base, oxygen: 35 });
  112 | });
  113 | 
  114 | test('Growth still permits unchanged and multiple-difference exploration with the original saved prediction', async ({ page }) => {
  115 |   await mount(page, { tab: 'growthLab', growthLab: base, growthInvestigation: { control: base, prediction: 'unsure', hypothesis: 'Explore first.' } });
  116 |   const run = page.getByRole('button', { name: 'Run comparison', exact: true });
  117 |   await expect(design(page)).toHaveAttribute('data-growth-design', 'none'); await expect(run).toBeEnabled(); await run.press('Enter');
  118 |   let saved = await state(page); expect(saved.growthInvestigation.trials).toHaveLength(1);
  119 |   expect(saved.growthInvestigation.trials[0].conditions).toEqual(base); expect(saved.growthInvestigation.trials[0].prediction).toBe('unsure');
  120 |   await setRange(page.locator('#gl-pH'), 6); await setRange(page.locator('#gl-oxygen'), 50);
  121 |   await expect(design(page)).toHaveAttribute('data-growth-design', 'confounded'); await expect(run).toBeEnabled(); await run.press('Enter');
  122 |   saved = await state(page); expect(saved.growthInvestigation.trials).toHaveLength(2);
  123 |   expect(saved.growthInvestigation.trials[1].conditions).toEqual({ ...base, pH: 6, oxygen: 50 });
  124 |   expect(saved.growthInvestigation.trials[1].prediction).toBe('unsure');
  125 |   await expect(page.locator('#gl-saved-result [data-design="confounded"]')).toBeVisible();
  126 | });
  127 | 
  128 | test('Growth setup preparation respects a later focus-only move to an activity tab', async ({ page }) => {
  129 |   await mount(page, { tab: 'growthLab', growthLab: { ...changed, understood: true, stuckRevealed: true }, growthInvestigation: { control: base, prediction: 'unsure', hypothesis: 'Keep my reasoning.' } });
  130 |   await page.locator('#gl-design-variable').selectOption('tempC');
  131 |   await page.evaluate(() => {
  132 |     const original = window.setTimeout; (window as any).__originalFocusTimeout = original; (window as any).__pendingDesignFocus = [];
  133 |     window.setTimeout = ((callback: (...args: any[]) => void, delay?: number, ...args: any[]) => {
  134 |       if (delay === 0) { (window as any).__pendingDesignFocus.push(() => callback(...args)); return 0; }
  135 |       return original(callback, delay, ...args);
  136 |     }) as typeof window.setTimeout;
  137 |   });
  138 |   await page.locator('#gl-design-prepare').click(); const nextFocus = page.locator('#micro-tab-quiz'); await nextFocus.focus(); const before = await state(page);
  139 |   await page.evaluate(() => { window.setTimeout = (window as any).__originalFocusTimeout; for (const callback of (window as any).__pendingDesignFocus) callback(); delete (window as any).__pendingDesignFocus; delete (window as any).__originalFocusTimeout; });
  140 |   await expect(nextFocus).toBeFocused(); expect(await state(page)).toEqual(before); await expect(page.locator('#micro-tab-growthLab')).toHaveAttribute('aria-selected', 'true');
  141 |   expect(before.growthLab).toEqual({ ...base, tempC: 70, understood: true, stuckRevealed: true }); expect(before.growthInvestigation.hypothesis).toBe('Keep my reasoning.');
  142 | });
  143 | 
  144 | test('Resistance phone layout keeps readable help, large controls and shape-based chart descriptions', async ({ page }) => {
  145 |   await mount(page, { tab: 'resistance' }); const panel = page.locator('[data-micro-resistance-workspace]');
  146 |   const exposure = page.getByRole('slider', { name: 'Antibiotic exposure strength in the teaching model', exact: true });
  147 |   await expect(exposure).toHaveAttribute('aria-describedby', /micro-resistance-exposure-help/);
  148 |   await expect(page.getByRole('slider', { name: 'Number of exposure rounds in the teaching model', exact: true })).toHaveAttribute('aria-describedby', /micro-resistance-rounds-help/);
  149 |   await expect(page.getByRole('slider', { name: 'Initial resistance', exact: true })).toHaveAttribute('aria-describedby', /micro-resistance-initial-help/);
  150 |   await expect(page.locator('#micro-resistance-share-help')).toContainText('With no survivors, the share is undefined.');
  151 |   await expect(page.getByRole('img', { name: /^Resistance trend/ })).toHaveAttribute('aria-describedby', 'micro-resistance-share-help');
  152 |   await expect(page.locator('[data-resistance-shape-legend]')).toContainText('sensitive circles');
  153 |   await expect(page.locator('[data-resistance-shape-legend]')).toContainText('resistant diamonds');
  154 |   const before = await state(page); await phone(page); await noOverflow(page);
  155 |   for (const selector of ['#micro-resistance-share-help', '#micro-resistance-exposure-help', '[data-resistance-shape-legend]'])
  156 |     expect(await page.locator(selector).evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(13);
  157 |   for (const target of [exposure, page.getByRole('button', { name: 'Step round', exact: true }), page.getByRole('button', { name: '▶ Play', exact: true })])
  158 |     expect((await target.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  159 |   expect(await state(page)).toEqual(before);
  160 |   await panel.screenshot({ path: path.join(out, 'resistance-readable-phone.png') });
  161 | });
  162 | 
  163 | test('Resistance reflows at enlarged text and retains keyboard controls, current run and saved notebook', async ({ page }) => {
  164 |   const evidence = { dose: 30, duration: 3, initRes: 10, prediction: 'increase', history: [{ day: 0, sensitive: 72, resistant: 8 }] };
  165 |   const savedEvidence = { ...evidence, notes: 'Original saved notes.', history: [...evidence.history, { day: 1, sensitive: 60, resistant: 8 }] };
  166 |   await mount(page, { tab: 'resistance', resistanceInvestigation: evidence,
  167 |     resistanceNotebook: { records: [{ id: 7, evidence: savedEvidence, reviewNote: 'Later saved reflection.' }], selectedId: 7 } });
  168 |   await open(page.locator('.micro-resistance-saved'));
  169 |   await expect(page.locator('[data-resistance-evidence="7"]')).toBeVisible();
  170 |   await expect(page.locator('[data-resistance-evidence="7"]')).toContainText('Original saved notes.');
> 171 |   await expect(page.locator('#micro-resistance-review-note')).toHaveValue('Later saved reflection.');
      |                                                               ^ Error: expect(locator).toHaveValue(expected) failed
  172 |   await page.emulateMedia({ reducedMotion: 'reduce' }); const before = await state(page);
  173 |   await page.setViewportSize({ width: 1280, height: 960 });
  174 |   await page.evaluate(() => { document.documentElement.style.zoom = '2'; }); await noOverflow(page);
  175 |   await page.locator('[data-micro-resistance-workspace]').screenshot({ path: path.join(out, 'resistance-readable-zoom.png') });
  176 |   await page.evaluate(() => { document.documentElement.style.zoom = '4'; }); await noOverflow(page);
  177 |   expect(await state(page)).toEqual(before);
  178 |   await page.evaluate(() => { document.documentElement.style.zoom = ''; });
  179 |   const exposure = page.getByRole('slider', { name: 'Antibiotic exposure strength in the teaching model', exact: true });
  180 |   await exposure.focus(); await exposure.press('ArrowRight'); await expect(exposure).toHaveValue('35');
  181 |   await page.getByRole('radio', { name: 'Increase', exact: true }).press('Space');
  182 |   await page.getByRole('button', { name: 'Step round', exact: true }).press('Enter');
  183 |   await expect.poll(async () => (await state(page)).resistanceInvestigation.day).toBe(1);
  184 |   const saved = await state(page); expect(saved.resistanceNotebook).toEqual(before.resistanceNotebook);
  185 |   await expect(exposure).toBeDisabled(); await expect(page.getByRole('img', { name: /^Petri dish model/ })).toHaveAccessibleName(/exposure round 1/);
  186 | });
  187 | 
```