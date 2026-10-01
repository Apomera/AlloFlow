# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: evolab-living-island.spec.ts >> life story on a phone keeps an unwritten fate unknown and updates after one watched generation
- Location: tests\e2e\evolab-living-island.spec.ts:1644:5

# Error details

```
Error: page.evaluate: TypeError: Cannot read properties of undefined (reading 'rng')
    at Object.step (http://127.0.0.1:50652/stem_lab/stem_tool_evolab.js:212:25)
    at eval (eval at evaluate (:302:30), <anonymous>:3:37)
    at UtilityScript.evaluate (<anonymous>:304:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)
```