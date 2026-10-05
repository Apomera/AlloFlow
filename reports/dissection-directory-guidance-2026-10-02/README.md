# Dissection Lab: guidance beside directory results

A search with one matching structure now explains its visibility and next step beside the directory result. The guidance updates as the view, search, filter, or inspection record changes.

## Improvements

| Structure state | Guidance and action |
| --- | --- |
| Visible and uninspected | Focus the result, then activate it to inspect. |
| Occluded by the view | Switch to an available view and return focus to the same result. Check visibility before activating it. |
| Partly exposed or obscured | Open the existing field setup controls to review preparation and clarity. |
| Previously inspected | Focus the result to review or finish its existing record. |

The view switch preserves the search, notes, confidence, procedure history, instrument, and scores. Opening field setup preserves the search and focuses its controls. Inspection credit requires explicit activation of a visible structure.

Guided mode follows its fixed target and pauses this guidance at the evidence question. Assessment and study routes keep their own actions. Broad searches and empty results retain the existing directory workflow.

The card uses distinct readiness and caution states, readable text, 48 px controls, and visible keyboard focus. Large-text and forced-color settings are supported. A focused result includes the guidance in its accessible description.

## Verification

| Checks | Result |
| --- | --- |
| New interaction and layout cases | 19 passed |
| Previous inspection and directory cases | 25 passed |
| Canvas, workspace, reference, and lab regression tests | 349 passed |
| Directory axe audits, hidden and visible states in five layouts | 10 audits, zero violations |

Phone, tablet, desktop, embedded large-text/high-contrast, and forced-color captures have no clipped text or controls and no horizontal overflow in the guidance card. Text is at least 14 px, or 16 px with large text. Controls are at least 48 px tall.

Checks use the local working-tree harness. The next-action card uses static positioning during screenshots so the complete guidance card can be captured.

[Verification details](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-directory-guidance-2026-10-02/verification.json) · [Browser spec](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/e2e/dissection-directory-guidance.spec.ts)

## Screenshots

[Phone: occluded](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-directory-guidance-2026-10-02/phone-occluded.png) · [Phone: visible](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-directory-guidance-2026-10-02/phone-visible.png) · [Large text](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-directory-guidance-2026-10-02/embedded-large-occluded.png) · [Forced colors](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-directory-guidance-2026-10-02/forced-colors-occluded.png) · [Incomplete exposure](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-directory-guidance-2026-10-02/emerging-guidance.png)

## Regression run notes

The initial core run passed 255 of 258 cases; three eye-reference cases exceeded the existing five-second test deadline. Three isolated retries then failed the worker startup handshake and executed zero tests. A fresh full core run passed all 258 cases, including the three initial failures, and the lab suite passed all 91 cases. The final runs used the original fork worker pool, assertions, and deadlines. Product source stayed identical throughout verification. The logs do not establish the underlying startup stall.

Initial reports and logs are retained. Verification details identify each attempt and the final passing cases. Independent read-only review found no actionable defects in the source, learning-credit flow, accessibility, or screenshot clarity.

## Source integrity

Both renderer copies are byte-identical, parse successfully, and retain LF line endings. Final SHA-256:

`bf7568de2f6c38b431665a33aa9f473ed7ac020efb13c1b6be25f3850d1c5d60`

Changes remain uncommitted.
