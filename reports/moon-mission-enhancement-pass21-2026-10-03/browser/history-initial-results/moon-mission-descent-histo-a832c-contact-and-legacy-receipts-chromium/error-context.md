# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: moon-mission-descent-history.spec.ts >> fallback measured flight history >> signed recorded history ends at inspection, follows scrubbing and preserves contact and legacy receipts
- Location: tests\e2e\moon-mission-descent-history.spec.ts:128:7

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: locator.screenshot: Element is not attached to the DOM
Call log:
  - taking element screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - attempting scroll into view action
    - waiting for element to be stable

```

```
Tearing down "context" exceeded the test timeout of 180000ms.
```

# Page snapshot

```yaml
- status [ref=e3]
```