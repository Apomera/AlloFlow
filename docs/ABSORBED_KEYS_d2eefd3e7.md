# 20 keys absorbed by d2eefd3e7 (not that commit's own work)

`d2eefd3e7` ("Emotions: Spanish for the Name It to Tame It prompts, 602
keys") registered 622 English keys in `ui_strings.js`. Only 602 were its own.

The other 20 were other sessions' uncommitted work, sitting in the shared
working tree when that commit ran. They were committed under the wrong
message by accident, NOT reviewed, and have **no Spanish translations**.

## Why this matters

An English key with no Spanish renders its English fallback forever, and no
gate reports it — `check_sel_i18n_coverage` counts registered keys, not
translated ones. So these will quietly ship in English unless their owners
translate them.

## The keys

    stem.cephalopodlab.sr_out_of_ink_no_refill
    stem.galaxy.panel_resizer
    stem.lifeskills.a11y_scenario_table
    stem.lifeskills.a11y_usage_level
    stem.lifeskills.all_three_scenarios
    stem.lifeskills.budget_needs_over_goal
    stem.lifeskills.budget_needs_within_goal
    stem.lifeskills.budget_rule_is_a_target
    stem.lifeskills.cheaper
    stem.lifeskills.crossover_note
    stem.lifeskills.fine_print_coinsurance
    stem.lifeskills.fine_print_deductible
    stem.lifeskills.fine_print_oop
    stem.lifeskills.fine_print_premium
    stem.lifeskills.insurance_intro
    stem.lifeskills.no_crossover_note
    stem.lifeskills.read_the_fine_print
    stem.lifeskills.std_deduction_row
    stem.lifeskills.usage
    stem.lifeskills.what_you_pay

If you own the lifeskills insurance/budget work, the cephalopod SR strings, or
the galaxy settings panel: your English is already registered. Check the
wording is what you intended, and add the Spanish.

## How it happened, so it does not happen again

To keep other sessions' lines out of my commits I was building a
HEAD-plus-my-keys blob and staging it with `git update-index`, then committing
with an explicit pathspec. On this commit the `update-index` call lost the
race for `.git/index.lock` and failed, while the `git commit` that followed
succeeded — so the commit took the WORKING-TREE file, including everyone
else's in-flight lines.

The lesson: `update-index` failing is not a safe failure. It leaves the
pathspec commit picking up the working tree, which is exactly what the blob
was meant to prevent. Either check its exit status before committing, or
build the clean content from `git stash create` (a commit object of the tree
that needs no lock and no working-tree swap) and commit that.
