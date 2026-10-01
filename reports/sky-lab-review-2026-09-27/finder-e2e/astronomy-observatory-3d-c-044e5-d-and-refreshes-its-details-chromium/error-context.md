# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: astronomy-observatory-3d.spec.ts >> catalog finder selects the exact HIP star with the keyboard and refreshes its details
- Location: tests\e2e\astronomy-observatory-3d.spec.ts:614:5

# Error details

```
Error: page.evaluate: ReferenceError: ReactDOM is not defined
    at window.__mount (http://127.0.0.1:51439/__harness:58:21)
    at eval (eval at evaluate (:302:30), <anonymous>:1:17)
    at UtilityScript.evaluate (<anonymous>:304:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)
```