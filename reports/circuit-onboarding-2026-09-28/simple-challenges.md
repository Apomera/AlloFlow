# Understandable circuit targets

Targets now have explicit selection and **Check target** actions. The active card shows the current reading, goal, accepted range, difference, a circuit-specific hint, and saved completion status. A populated bench exposes **Try a Target**, which scrolls and focuses the first target.

Grading preserves the existing strict less-than-5% tolerance and reads the latest circuit state. Empty circuits cannot earn completion. The 0.1 A label no longer promises an exact match while using a tolerance. Existing completion keys and legacy target selection remain compatible.

Rewards are issued after a successful check commits. Repeated checks, rapid duplicate clicks, StrictMode rendering, and reopening saved feedback cannot repeat the completion reward. Changing the circuit does not erase an earned completion.

The focused challenge suite passed **17 tests**, including small-unit formatting, latest-state grading, reward/badge behavior, and shortcut focus. Integration results are recorded in the main report.
