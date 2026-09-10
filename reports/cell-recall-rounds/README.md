# Cell recall rounds

The structure study workflow now has finite five-question recall rounds. Each round uses a fixed queue of distinct structures, prioritizing the review list and then structures not yet mastered. The question counter and segmented progress bar show how much remains.

After the last answer, **See round results** opens a responsive completion card with the round score, explicit results for each structure, and actions to study missed structures or start another round. Lifetime accuracy remains separate in the study toolbar. Pending questions continue to hide reference content until answered.

**End check** pauses the current round. **Resume recall** continues with the first unanswered structure. Round queues and answer history are stored independently for animal, plant, and bacterial cells in the existing versioned portable progress record. Older records remain compatible. Duplicate and out-of-order answers cannot inflate round results.

Validation:

- 17 unit checks passed for rounds, answer choices, and existing process/contrast behavior.
- 6 progress persistence and integrity checks passed.
- 11 browser checks passed for the new desktop/320px round flow, pause/export/import across sessions and cell types, and existing study, visual, and control workflows.
- Source syntax, whitespace checks, and desktop mirror equality passed.

Visual captures: [desktop results](results-1200.png), [phone results](results-320.png).

Changes are local; no deployment was performed.
