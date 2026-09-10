# Guided pathway refinement

Guided pathways now live in a compact disclosure beside the structure study controls, making them available in Focus view. Each pathway shows a numbered, clickable structure map, the current explanation, a named next destination, and a return-to-exploring action. Touch targets are at least 44px tall, current steps are identified for assistive technology, and keyboard focus moves safely when the final next button disappears.

The animal energy tour previously selected a chloroplast even though the animal model has none. Pathways now filter their stops against the selected cell catalogue, keeping the explanation, selected structure, and diagram trace aligned. Original step indices remain in portable progress records so old saved tours retain their positions. Older records pointing to an absent structure recover to the next available stop.

Validation:

- 29 unit checks passed across pathway logic, the interior catalogue, and progress integrity/persistence.
- 11 distinct browser scenarios passed: four pathway scenarios, four interior recovery checks, and three recall-round scenarios. The final four pathway checks were rerun after the keyboard-focus fix.
- Desktop, 320px plant, and 390px bacterial layouts have no horizontal overflow; pathway controls meet the 44px target.
- Source syntax, whitespace checks, and desktop mirror equality passed.

Visual captures: [desktop animal pathway](pathway-animal-1200.png), [phone plant pathway](pathway-plant-320.png), [bacterial pathway](pathway-bacterium-390.png).

Changes remain local; no deployment was performed.
