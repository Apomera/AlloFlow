# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cell-comparison-visuals.spec.ts >> comparison identity and readable evidence at 640
- Location: tests\e2e\cell-comparison-visuals.spec.ts:7:39

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator: locator('[data-cell-comparison-lab]').getByLabel('Organism A', { exact: true })
Expected: "0"
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toHaveValue" with timeout 15000ms
  - waiting for locator('[data-cell-comparison-lab]').getByLabel('Organism A', { exact: true })

```

```yaml
- button "Back to tools"
- heading "🔬 Cell Simulator" [level=3]
- text: CELL v3 ⭐ 0 RP Compare
- button "🏠 Hub"
- text: / 🦠 Browse Organisms
- textbox "Search modes":
  - /placeholder: Search activities or ideas...
- button "📚 Encyclopedia"
- button "🔍 Filter"
- button "⚖ Compare"
- group: Optional quests and progress
- heading "Observe - explore the cell" [level=3]
- paragraph: "Click any organelle to see its structure, function, and how it talks to its neighbors. Cells are factories: every organelle has a job and a delivery route."
- status: No organism selected. Zoom 40x. Simulation paused.
- text: Living Petri Dish Observed 0 Zoom 40x Paused Click an organism to inspect behavior and anatomy
- img "Interactive cell biology simulation. Click or tap organisms, or use the organism buttons below, to inspect behavior and anatomy. Press Escape to dismiss an anatomy explanation."
- text: Zoom
- slider "Microscope zoom level": "1"
- status "Current magnification": 40×
- button "Reset microscope view"
- text: Speed
- slider "Simulation speed": "1"
- status "Current simulation speed": 1×
- button "Play simulation"
- region "Visible cell types":
  - heading "Visible cell types" [level=4]
  - paragraph: Choose which models appear in the dish.
  - status: 11 of 11 visible
  - button "Show all cell types in petri dish": Show All
  - button "Clear all cell types from petri dish": Clear All
  - group "Cell type visibility filters":
    - button "Hide Amoeba in petri dish" [pressed]:
      - strong: Amoeba
      - text: Visible
    - button "Hide Paramecium in petri dish" [pressed]:
      - strong: Paramecium
      - text: Visible
    - button "Hide Euglena in petri dish" [pressed]:
      - strong: Euglena
      - text: Visible
    - button "Hide Neutrophil (White Blood Cell) in petri dish" [pressed]:
      - strong: Neutrophil (White Blood Cell)
      - text: Visible
    - button "Hide Bacterium in petri dish" [pressed]:
      - strong: Bacterium
      - text: Visible
    - button "Hide Plant Cell in petri dish" [pressed]:
      - strong: Plant Cell
      - text: Visible
    - button "Hide Diatom in petri dish" [pressed]:
      - strong: Diatom
      - text: Visible
    - button "Hide Volvox in petri dish" [pressed]:
      - strong: Volvox
      - text: Visible
    - button "Hide Stentor in petri dish" [pressed]:
      - strong: Stentor
      - text: Visible
    - button "Hide Tardigrade in petri dish" [pressed]:
      - strong: Tardigrade
      - text: Visible
    - button "Hide Spirillum in petri dish" [pressed]:
      - strong: Spirillum
      - text: Visible
- region "Choose an organism to inspect":
  - heading "Choose an organism to inspect" [level=4]
  - paragraph: Recognize each model, then explore its movement and anatomy. Illustrations are not to scale.
  - text: 0 / 11 observed
  - button "Inspect Amoeba": "Amoeba Status: new mission. Control mapping: Direction input, then Pseudopods extend, producing Cell crawls. Mission: Engulf 3 green food particles. Single-celled protist Pseudopods"
  - button "Inspect Paramecium": "Paramecium Status: new mission. Control mapping: Direction input, then Cilia beat together, producing Cell swims. Mission: Sweep through 3 green food particles. Single-celled ciliate Coordinated cilia"
  - button "Inspect Euglena": "Euglena Status: new mission. Control mapping: Direction input, then Flagellum pulls, producing Cell tracks light. Mission: Complete 3 light-energy cycles. Photosynthetic protist Flagellum + phototaxis"
  - button "Inspect Neutrophil (White Blood Cell)": "Neutrophil (White Blood Cell) Status: new mission. Control mapping: Direction input, then Pseudopods extend, producing Immune cell crawls. Mission: Engulf 3 pathogen targets. Human immune cell (neutrophil) Amoeboid crawling + chemotaxis"
  - button "Inspect Bacterium": "Bacterium Status: new mission. Control mapping: Direction input, then Flagellum rotates, producing Run or tumble. Mission: Collect 3 teal nutrient markers. Prokaryotic cell Rotary flagellum"
  - button "Inspect Plant Cell": "Plant Cell Status: new mission. Control mapping: Select a label, then Structure highlighted, producing Function revealed. Mission: Locate 3 different structures. Eukaryotic plant tissue cell Stationary; supported by turgor"
  - button "Inspect Diatom": "Diatom Status: new mission. Control mapping: Gentle direction input, then Raphe enables gliding, producing Cell moves slowly. Mission: Collect 3 teal nutrient markers. Single-celled photosynthetic alga Drift or raphe gliding"
  - button "Inspect Volvox": "Volvox Status: new mission. Control mapping: Direction input, then Flagella coordinate, producing Colony swims. Mission: Complete 3 light-energy cycles. Colonial green alga Coordinated flagella"
  - button "Inspect Stentor": "Stentor Status: new mission. Control mapping: Direction input, then Body cilia beat, producing Cell swims. Mission: Sweep in 3 food particles. Single-celled ciliate Body cilia + holdfast"
  - button "Inspect Tardigrade": "Tardigrade Status: new mission. Control mapping: Direction input, then Leg muscles contract, producing Animal crawls. Mission: Reach 3 green food particles. Microscopic multicellular animal Eight lobopod legs"
  - button "Inspect Spirillum": "Spirillum Status: new mission. Control mapping: Direction input, then Bipolar flagella rotate, producing Body corkscrews. Mission: Collect 3 teal nutrient markers. Spiral-shaped prokaryote Bipolar flagella"
- button "Toggle badges panel": 🏅 Badges 0/10
- button "AI Tutor": 🤖 AI Tutor
- button "Snapshot": 📸 Snapshot
- region "Compare two organisms":
  - paragraph: Compare • notice • explain
  - heading "Compare two organisms" [level=3]
  - paragraph: Look for a shared property and a useful contrast, then support your explanation with evidence.
  - group "Suggested organism comparisons":
    - button "Compare movement"
    - button "Compare cell organization"
    - button "Compare nutrition"
  - text: Find organisms
  - searchbox "Find organisms"
  - status: 59 matches. Current selections stay available.
  - text: Organism A
  - combobox "Organism A":
    - option "Amoeba" [selected]
    - option "Paramecium"
    - option "Euglena"
    - option "White Blood Cell"
    - option "E. coli"
    - option "Plant Cell (Elodea)"
    - option "Diatom"
    - option "Volvox"
    - option "Stentor"
    - option "Tardigrade"
    - option "Spirillum"
    - option "Bacterium (rod)"
    - option "Streptococcus"
    - option "Lactobacillus"
    - option "Cyanobacteria"
    - option "Spirochete"
    - option "Salmonella"
    - option "Mycobacterium"
    - option "Yeast (Saccharomyces)"
    - option "Penicillium"
    - option "Algae (general)"
    - option "Slime Mold"
    - option "Plasmodium"
    - option "Giardia"
    - option "Trypanosome"
    - option "Chlamydomonas"
    - option "Sponge cell"
    - option "Hydra"
    - option "Planarian"
    - option "Rotifer"
    - option "Daphnia"
    - option "Bdelloid Rotifer"
    - option "Generic Animal Cell"
    - option "Plasmodial slime mold"
    - option "Dinoflagellate"
    - option "Foraminifera"
    - option "Radiolarian"
    - option "Trichomonas"
    - option "Entamoeba histolytica"
    - option "Toxoplasma"
    - option "Cryptosporidium"
    - option "Caulobacter"
    - option "Helicobacter pylori"
    - option "Clostridium"
    - option "Methanogen"
    - option "Halophile"
    - option "Thermophile"
    - option "Hyperthermophile"
    - option "Macrophage"
    - option "Neutrophil"
    - option "Lymphocyte"
    - option "Erythrocyte (RBC)"
    - option "Platelet (thrombocyte)"
    - option "Neuron"
    - option "Sperm cell"
    - option "Egg cell"
    - option "Stem cell"
    - option "Epithelial cell"
    - option "Muscle cell"
  - term: Cell organization
  - definition: Eukaryote
  - term: Typical size
  - definition: 500 μm
  - text: Organism B
  - combobox "Organism B":
    - option "Amoeba"
    - option "Paramecium" [selected]
    - option "Euglena"
    - option "White Blood Cell"
    - option "E. coli"
    - option "Plant Cell (Elodea)"
    - option "Diatom"
    - option "Volvox"
    - option "Stentor"
    - option "Tardigrade"
    - option "Spirillum"
    - option "Bacterium (rod)"
    - option "Streptococcus"
    - option "Lactobacillus"
    - option "Cyanobacteria"
    - option "Spirochete"
    - option "Salmonella"
    - option "Mycobacterium"
    - option "Yeast (Saccharomyces)"
    - option "Penicillium"
    - option "Algae (general)"
    - option "Slime Mold"
    - option "Plasmodium"
    - option "Giardia"
    - option "Trypanosome"
    - option "Chlamydomonas"
    - option "Sponge cell"
    - option "Hydra"
    - option "Planarian"
    - option "Rotifer"
    - option "Daphnia"
    - option "Bdelloid Rotifer"
    - option "Generic Animal Cell"
    - option "Plasmodial slime mold"
    - option "Dinoflagellate"
    - option "Foraminifera"
    - option "Radiolarian"
    - option "Trichomonas"
    - option "Entamoeba histolytica"
    - option "Toxoplasma"
    - option "Cryptosporidium"
    - option "Caulobacter"
    - option "Helicobacter pylori"
    - option "Clostridium"
    - option "Methanogen"
    - option "Halophile"
    - option "Thermophile"
    - option "Hyperthermophile"
    - option "Macrophage"
    - option "Neutrophil"
    - option "Lymphocyte"
    - option "Erythrocyte (RBC)"
    - option "Platelet (thrombocyte)"
    - option "Neuron"
    - option "Sperm cell"
    - option "Egg cell"
    - option "Stem cell"
    - option "Epithelial cell"
    - option "Muscle cell"
  - term: Cell organization
  - definition: Eukaryote
  - term: Typical size
  - definition: 120 μm
  - button "Swap organisms"
  - text: 2 matching descriptions · 5 differing descriptions
  - group "Comparison property filter":
    - button "All properties" [pressed]
    - button "Differences"
    - button "Shared descriptions"
  - status: Showing 7 of 7 properties.
  - paragraph: These are reference descriptions. Different wording does not prove that traits are mutually exclusive. Sizes are typical examples, not measurements of the current specimen.
  - region "Group":
    - heading "Group" [level=4]
    - text: Matching description
    - paragraph: Amoeba
    - paragraph: Protist
    - paragraph: Paramecium
    - paragraph: Protist
  - region "Cell organization":
    - heading "Cell organization" [level=4]
    - text: Matching description
    - paragraph: Amoeba
    - paragraph: Eukaryote
    - paragraph: Paramecium
    - paragraph: Eukaryote
  - region "Typical size":
    - heading "Typical size" [level=4]
    - text: Different descriptions
    - paragraph: Amoeba
    - paragraph: 500 μm
    - paragraph: Paramecium
    - paragraph: 120 μm
  - region "Habitat":
    - heading "Habitat" [level=4]
    - text: Different descriptions
    - paragraph: Amoeba
    - paragraph: Freshwater ponds + soil
    - paragraph: Paramecium
    - paragraph: Freshwater + slightly brackish
  - region "Nutrition":
    - heading "Nutrition" [level=4]
    - text: Different descriptions
    - paragraph: Amoeba
    - paragraph: Phagocytosis of bacteria + smaller protists
    - button "Study Phagocytosis"
    - paragraph: Paramecium
    - paragraph: Bacteria + algae via oral groove
  - region "Reproduction":
    - heading "Reproduction" [level=4]
    - text: Different descriptions
    - paragraph: Amoeba
    - paragraph: Binary fission
    - paragraph: Paramecium
    - paragraph: Binary fission + conjugation
  - region "Movement":
    - heading "Movement" [level=4]
    - text: Different descriptions
    - paragraph: Amoeba
    - paragraph: Pseudopod extension
    - paragraph: Paramecium
    - paragraph: Ciliary propulsion ~3 mm/s
  - region "Build an evidence-based explanation":
    - heading "Build an evidence-based explanation" [level=4]
    - paragraph: Writing belongs to this pair and stays when you swap columns or compare another pair during this session. Download a report to keep it.
    - text: Claim
    - textbox "Comparison claim":
      - /placeholder: What important similarity or difference do you notice?
    - text: Evidence
    - textbox "Comparison evidence":
      - /placeholder: Name both organisms and cite a property from the comparison.
    - text: Reasoning
    - textbox "Comparison reasoning":
      - /placeholder: How does the evidence support your claim? What can these descriptions not tell you?
    - button "Download comparison report"
  - status
- status
```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | import {GlHarness} from './helpers/stem_gl_harness';
  3  | const harness=new GlHarness({toolFile:'stem_lab/stem_tool_cell.js',toolId:'cell',width:1200,height:1000,appStyles:true});
  4  | test.beforeAll(()=>harness.start());
  5  | test.afterAll(()=>harness.stop());
  6  | test.afterEach(async({page})=>harness.destroy(page));
  7  | for(const width of [280,640,1200])test('comparison identity and readable evidence at '+width,async({page})=>{
  8  |  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  9  |  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width,height:1000});
  10 |  await harness.mount(page,{cell:{mode:'compare',_cellPicked:true,_cellCategory:'browse'}},undefined,{expectCanvas:false});
  11 |  await page.addStyleTag({content:'body{background:#f8fafc}#wrap{width:100%;max-width:1200px;display:block}'});
  12 |  const lab=page.locator('[data-cell-comparison-lab]'),pair=lab.locator('[data-cell-compare-pair]');
  13 |  const a=lab.getByLabel('Organism A',{exact:true}),b=lab.getByLabel('Organism B',{exact:true});
  14 |  const row=lab.locator('[data-cell-comparison-property="movement"]');
> 15 |  await expect(a).toHaveValue('0');await expect(b).toHaveValue('1');
     |                  ^ Error: expect(locator).toHaveValue(expected) failed
  16 |  await expect(row.locator('[data-cell-compare-value=a]')).toContainText('Amoeba');
  17 |  await expect(row.locator('[data-cell-compare-value=b]')).toContainText('Paramecium');
  18 |  await expect(lab.locator('[data-cell-compare-result-status]')).toHaveText('Showing 7 of 7 properties.');
  19 |  const boxes=await pair.locator('[data-cell-compare-identity]').evaluateAll(items=>items.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
  20 |  if(width===280){expect(boxes[1].y).toBeGreaterThanOrEqual(boxes[0].y+boxes[0].h);}
  21 |  else {expect(boxes[1].y).toBeCloseTo(boxes[0].y,0);expect(boxes[1].x).toBeGreaterThan(boxes[0].x);}
  22 |  await lab.getByRole('button',{name:'Swap organisms',exact:true}).click();
  23 |  await expect(a).toHaveValue('1');await expect(b).toHaveValue('0');
  24 |  await expect(row.locator('[data-cell-compare-value=a]')).toContainText('Paramecium');
  25 |  await expect(row.locator('[data-cell-compare-value=b]')).toContainText('Amoeba');
  26 |  await lab.getByRole('button',{name:'Shared descriptions',exact:true}).click();
  27 |  await expect(lab.locator('[data-cell-compare-result-status]')).toHaveText('Showing 2 of 7 properties with matching descriptions.');
  28 |  await expect(lab.locator('[data-cell-comparison-property]')).toHaveCount(2);
  29 |  await expect(lab.getByRole('button',{name:'Shared descriptions',exact:true})).toHaveAttribute('aria-pressed','true');
  30 |  await b.selectOption('1');await lab.getByRole('button',{name:'Differences',exact:true}).click();
  31 |  await expect(lab.locator('[data-cell-compare-result-status]')).toHaveText('Showing 0 of 7 properties with different descriptions.');
  32 |  const reset=lab.getByRole('button',{name:'Show all properties',exact:true});await reset.focus();await page.keyboard.press('Enter');
  33 |  await expect(lab.getByRole('button',{name:'All properties',exact:true})).toBeFocused();
  34 |  await expect(lab.locator('[data-cell-comparison-property]')).toHaveCount(7);
  35 |  await b.selectOption('0');
  36 |  await pair.screenshot({path:'reports/cell-comparison-visuals/pair-'+width+'.png',scale:'css'});
  37 |  await row.screenshot({path:'reports/cell-comparison-visuals/movement-'+width+'.png',scale:'css'});
  38 |  await lab.locator('[data-cell-compare-tools]').screenshot({path:'reports/cell-comparison-visuals/filters-'+width+'.png',scale:'css'});
  39 |  const targets=await lab.locator('button,select,input').evaluateAll(items=>items.filter(el=>el.getBoundingClientRect().width>0).map(el=>el.getBoundingClientRect().height));
  40 |  for(const height of targets)expect(height).toBeGreaterThanOrEqual(44);
  41 |  expect(await lab.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  42 |  if(width===280){
  43 |   await page.addStyleTag({content:'[data-cell-comparison-lab]{font-size:20px}[data-cell-compare-value-text]{font-size:20px!important;line-height:1.6!important}'});
  44 |   await expect(row.locator('[data-cell-compare-value-text]').first()).toHaveCSS('font-size','20px');
  45 |   expect(await row.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  46 |   const cells=await row.locator('[data-cell-compare-value]').evaluateAll(items=>items.map(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom};}));
  47 |   expect(cells[1].top).toBeGreaterThanOrEqual(cells[0].bottom);
  48 |   await row.screenshot({path:'reports/cell-comparison-visuals/movement-enlarged-280.png',scale:'css'});
  49 |  }
  50 |  if(width===1200){
  51 |   await lab.screenshot({path:'reports/cell-comparison-visuals/workspace-1200.png',scale:'css'});
  52 |   await page.addStyleTag({content:'[data-cell-comparison-lab]{width:400px!important}'});
  53 |   const cards=await pair.locator('[data-cell-compare-identity]').evaluateAll(items=>items.map(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom};}));
  54 |   expect(cards[1].top).toBeGreaterThanOrEqual(cards[0].bottom);
  55 |   expect(await lab.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  56 |  }
  57 |  expect(errors).toEqual([]);
  58 | });
  59 | 
```