# CircuitTool: readable saved comparisons and direct writing

Each comparison selector now has a wrapping caption showing its selected observation number, circuit type, captured input or relative light, and ordered red/black probe connections. Students can read the complete selection on a phone or with enlarged text, even when the native dropdown clips its option.

The captions use saved observations. Live circuit and probe edits leave that captured context fixed. Removing or importing a selected point clears its caption and asks the student to choose again; restoration preserves the existing selection rules. Each select describes its own caption through a unique local ID.

Comparison chart values, metric values and separate probe voltages now retain number-before-unit order inside right-to-left interfaces. Each magnitude and unit stays whole when wrapping. Existing formats, signs and calculations are preserved.

**Write my explanation** moves directly to the existing explanation field for a valid distinct saved comparison. It preserves the student's text, caret, writing size, selected readings and stored work. The existing Add readings and Review explanation actions keep their behavior. When the selected readings are already included, the existing Review action is retained.

## Visual examples

- [Phone comparison captions](manual-comparison-context-390.png)
- [Writing shortcut](write-from-evidence-actions-320.png)
- [RTL chart, metric and probe readings](rtl-chart-and-metric-readings-320.png)

## Verification

See [final validation](validation.json) for completed regression and browser evidence. The regression scope covers 16 new caption cases, eight new navigation cases, and 80 existing comparison, writing, recording and notebook cases.

Browser coverage includes eight selector views, two writing details and one RTL chart/metric/probe detail: desktop, phones, sensors, captured probe differences, actual doubled text, forced colors, translated right-to-left text, missing selections and recovery. Native keyboard selection and writing activation check the actual browser behavior. All eleven final PNGs were inspected at original resolution by the root reviewer; the source also received an independent review.

The source and public mirror match. Reversing the eight recorded fragments reproduces the previous verified source byte for byte. Selection identity, native options and callbacks, comparison calculations, exports, history, lessons and AI requests retain their existing behavior.

The first regression run passed 103 of 104 cases. Its sole failure was a new test querying an English select label after translating it. The failed run and exact fixture correction are retained; cases, assertions and product source were unchanged. Passed runs before the RTL markup revisions are retained separately from the final-source run.

The first browser run and all ten original images are retained. Review found that its crop also included lower chart content and exposed the RTL unit ordering issue. The final run narrows the selector crop, doubles every text node in that capture and adds an explicit RTL reading detail to verify the product correction.

The first expanded RTL accessibility run stopped because Chrome's partial tree query returned the queried span and its ancestors without the span's text descendant. Its native value snapshot and geometry were correct; the failed partial run is retained. The final harness queries the exact magnitude/unit subtree and still requires each complete native text token.

- [Regression results](regression-raw.json)
- [Native regression receipt](regression-receipt.json)
- [Browser measurements](browser-results.json)
- [Visual review](visual-review.json)
- [Root screenshot review](root-visual-review.json)
- [Independent source review](independent-review.json)
- [Source preservation](source-preservation.json)

Changes remain uncommitted and unstaged.
