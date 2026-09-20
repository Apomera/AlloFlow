# Road Ready focus and interruption safety

Reviewed 2026-09-19. Local changes only; this pass did not commit or deploy.

## Behavior changes

- Space and Enter belong to focused buttons, links, disclosure summaries, and elements with the button role. The shared drill listener no longer prevents their activation or turns their activation into braking. Space still brakes when pressed on the driving scene, and the listener respects events already handled by another component.
- Standard and scenario parking pause when the window loses focus or the document becomes hidden. The interruption stops the car and clears held keys and queued actions without changing its position, steering, score, or completed result.
- Returning to the window does not resume the maneuver automatically. Resume uses the existing neutral-input gate so a held controller trigger cannot immediately move the car.
- Interruption listeners are removed when the parking controls unmount. The canonical tool and desktop STEM mirror remain identical.

## Validation

- 32 Vitest tests passed across six focused suites, including native-control key handling, interruption cleanup, hidden-tab behavior, completed-result preservation, controller neutral gating, and previous input and pause regressions.
- Six Chromium scenarios passed: focus interruption and Space activation in standard and tight parallel parking; the complete guided parking maneuver; paused completion and retained contact penalties; and controller reset neutrality in both drills.
- JavaScript syntax, source/mirror byte parity, and targeted Git whitespace checks passed.

Browser interruption checks dispatch a window blur event; hidden-document behavior is covered by the unit suite. Gamepad checks use a simulated standard controller rather than physical hardware.
