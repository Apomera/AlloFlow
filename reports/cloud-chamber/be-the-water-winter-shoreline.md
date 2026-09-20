# Be the Water: winter shoreline and cold-water appearance

Snow now extends to the upper lake shore and the upward-facing surfaces of lake and stream stones, including their shared gravel instances. A radial mask retains the wet margin beside the lake. The existing stream-outlet clipping wraps the stone snow shader, keeping the lake connection open.

The winter lake uses gentler ripple-normal variation and a paler reflection tint. It remains liquid in accordance with the current model: no ice sheet, new phase change, altered landing radius, or water-height adjustment was introduced. This pass changes seasonal appearance, not freezing or melting physics.

The shared winter surface shader now supports both Standard and Phong materials. All new coverage uses the existing winter uniform, so changing to temperate or desert scenarios clears it. No geometry, texture, draw call, or per-frame surface query is added.

## Validation

- Lake browser acceptance passed shared winter activation, shoreline snow mask, stream-outlet clipping, unchanged liquid state and surface height, animated/paused winter ripples, temperate/desert reset, actual lake landing, reduced motion, accessibility, and resource cleanup with no page or WebGL errors.
- Winter and restored-temperate lake close-ups were visually reviewed.
- Source syntax passed; canonical and desktop copies match; preview returned HTTP 200.
- Browser acceptance: `dev-tools/watercycle_pilot_winter_shoreline_qa.cjs`.
- Captures: `scratch/water-winter-shoreline-review/`.

Source: `stem_lab/stem_tool_watercycle.js`, mirrored in `desktop/web-app/public/stem_lab/stem_tool_watercycle.js`.

Final validation: 117 pilot experience/kernel regressions passed, zero failures (pilot-winter-shoreline-regressions.json). Existing winter-surface browser acceptance also passed, preserving tree/rock snow, seasonal resets, groundwater hiding, and cleanup.
