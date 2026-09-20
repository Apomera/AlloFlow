# Contextual pathway entry

The inspector's **Structure & connections** section now offers guided pathways containing the selected structure. Each link names the pathway, shows the current structure's step and the tour length, and opens that step directly. An already active pathway has a return action.

The links use the existing cell-type-specific guides, so an animal energy pathway shows two stops while the plant version includes its additional stop. Structures without a matching tour do not receive unrelated suggestions. Entering a pathway marks only the selected stop explored and preserves mastery and recall scores. Saved progress retains the corresponding original step index.

Validation: 7 browser scenarios and 9 unit checks passed. Source syntax, whitespace, and mirror equality checks passed. The new links fit 320px screens without horizontal overflow and retain controls at least 44px tall.

Validation files:

- `unit-results.json`: contextual matching, visible step counts, invalid selections, existing guide logic, and progress integrity.
- `playwright.config.cjs`: desktop/320px/390px contextual entry, focus, navigation, saved-session restoration, and existing guided-pathway workflows.
- Rendered captures: [animal](related-animal-1200.png), [plant](related-plant-320.png), [bacterium](related-bacterium-390.png).

The main source and desktop mirror are synchronized. Changes remain local.
