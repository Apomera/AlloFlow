# Function Grapher: secant-to-tangent investigation — 19 September 2026

## New learning workflow

Expand **From secant slopes to a tangent** in Function Grapher. It uses the selected function and current trace point. Choose a positive starting step and predict what the left and right slopes will do, then compute four successively smaller steps.

The table separates left slopes, right slopes, and the centered estimate. It makes the absolute-value corner instructive: left slopes stay at −1, right slopes stay at 1, while the centered estimate stays at zero. Learners can reveal the analytic derivative comparison afterward, write an explanation, and export the investigation with function parameters, base point, step sizes, numerical evidence, and reflection.

Changing the function, parameters, trace point, step, or prediction hides stale results until recalculation. Repeating Compute with unchanged inputs preserves the reflection and revealed comparison. A fresh calculation clears the previous reflection and reveal.

## Numerical and teaching refinements

- Domain failures, exceptions, complex/non-finite values, arithmetic overflow, and coincident sample positions remain unavailable rather than becoming zero slopes.
- Quotients use actual represented sample spacing. If either side collapses to the base point, the centered estimate is unavailable.
- The activity explains that four rows cannot prove a limit and that small steps can amplify roundoff.
- The function guide now explains that a zero derivative can mark a maximum, minimum, or neither, using x³ at zero as the counterexample.
- Table text uses explicit theme colors. Numeric cells stay on one line on phones, with scrolling contained within the named table region if needed.

## Validation

40 regression tests passed, including 16 new numerical and interaction tests. Existing Function Grapher engine and accessibility suites also passed.

Real-browser workflows passed in light, dark, and high-contrast themes. Cases include a smooth quadratic, changed trace point, square-root domain boundary, stationary cubic point, undefined rational base, and absolute-value corner. Keyboard computation, derivative reveal, reflection, and downloaded reports were exercised.

The checked panel had no automated accessibility violations and no page overflow at 375 or 320 pixels. Final mobile screenshots were visually inspected. Syntax, scoped diff checks, and source/desktop-mirror parity passed.

See `unit-results.json`, `browser-results.json`, `validation-summary.json`, the browser runner, screenshots, and exported investigations in this directory.

No deployment was performed. The sim, circuit, and molecule shelves remain outside this work.
