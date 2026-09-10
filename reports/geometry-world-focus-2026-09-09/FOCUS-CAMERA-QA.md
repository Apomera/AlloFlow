# Focus creation — actual browser verification

The final bounded WebGL run passed. This audit changed report scripts and evidence only; production camera changes were owned by the main agent.

## Coverage and result

The harness mounts the real React tool, Three r128 renderer, Geometry World builder and Print Lab in a minimal local host. One touch-capable Chromium browser uses SwiftShader and DPR 1. No printer or deployed application is involved.

The initial nine-case run used a wide 69-block build, a tall 36-block tower, and an off-center 44-block pavilion with rotated fractional pieces, each at 1440 × 900, 390 × 844 and 320 × 700. It verified actual transformed mesh vertices, selection, complete authored world, STL bytes and undo/redo history. It exposed two defects subsequently corrected by the main agent:

- Focus released input flags but retained movement velocity, causing a small drift after Previous view.
- The minimum clear-area size caused a fallback rectangle to overlap mobile controls. The original 320-pixel screenshot also showed the return card covering part of Look speed.

After those corrections, the final run repeated the asymmetric pavilion at all three sizes and added the relevant animation and resize cases. It did not repeat the entire original fixture grid.

| Final check | Result |
| --- | --- |
| Actual mesh vertices remain inside the frustum and reported clear rectangle | Passed at all three sizes |
| Projected creation bounds avoid visible dock, palette, touch and camera controls | Passed at all three sizes |
| Previous view and Look speed do not overlap | Passed at all three sizes |
| Held keyboard/look flags, touch IDs/vector and movement velocity clear | Passed; seeded in capture phase of the actual UI action |
| Camera remains stable after focus, including walking mode | Passed |
| Real W-key movement takes manual control | Passed |
| Previous view restores exact position, quaternion, up, FOV, clipping planes and navigation mode | Passed |
| A newly placed fractional block completes its normal growth animation within the fitted frame | Passed |
| An active fog transition and overdue automatic day/night cycle stay paused while framing owns the camera | Passed |
| Fog begins beyond the whole selected creation | Passed |
| Desktop-to-320-pixel resize automatically refits before manual navigation | Passed |
| Studio Top view fits and returns to the focused edit camera | Passed |
| Actual Send to Print Lab → Revise in Geometry World preserves selected STL bytes and the complete workspace | Passed |
| Page, console or shader compilation errors | None |

Every geometry check uses the real mesh position attributes transformed into world space and projected through the live camera. The final obstacle test compares the projected creation bounds with actual visible DOM rectangles, rather than trusting the fit helper's declared rectangle alone. Exact STL signatures and serialized construction/history snapshots cover all camera actions.

The narrow-phone final screenshot was visually inspected: the pavilion occupies the clear space between controls, and the stacked Previous view card leaves Look speed readable. The phone composition prioritizes continued editing and reachable controls; Showcase remains available for a larger presentation view.

## Evidence

- [Final results](focus-final-results.json)
- [Final executable verifier](verify-focus-final.cjs)
- [Initial nine-case results, including reproduced defects](focus-creation-results.json)
- [Initial verifier](verify-focus-creation.cjs)
- [Desktop final](focus-final-offcenter-1440x900.png)
- [390-pixel phone final](focus-final-offcenter-390x844.png)
- [320-pixel phone final](focus-final-offcenter-320x700.png)
- [New fractional block after focused resize](focus-final-pop-phone.png)

The final browser completed and closed normally. No production files were edited by this verifier.
