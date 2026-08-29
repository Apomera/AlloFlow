# SEL Hub WCAG AA and Theme Audit

Generated: 2026-08-29T02:08:15.428Z

## Summary

- Hub shell views audited: 4 across light, dark, high-contrast, mobile-high-contrast
- Hub shell issues: 0 error(s), 0 warning(s)
- Tool audit: 71 tools, 0 error(s), 0 warning(s)
- Standard tool shell gaps: 0

## Coverage (read this before the counts)

- Tool contrast: 14219 text node(s) graded; 934 skipped (gradient background), 933 skipped (colour set by a CSS class)
- **Skipped is not passed.** Gradient-backed text has no single background to measure, and a colour set by a utility class cannot be resolved from server-rendered markup.
- Hub shell entry points found this run: light=recent+sharePacket+teacherLaunch+privacyCopy, dark=recent+sharePacket+teacherLaunch+privacyCopy, high-contrast=recent+sharePacket+teacherLaunch+privacyCopy, mobile-high-contrast=recent+sharePacket+teacherLaunch+privacyCopy
- Tool interiors render on the host dark shell (`needsDarkShell` in sel_hub_module.js), so a tool that ignores `ctx.theme` produces identical markup in light and dark. Byte-identical renders across themes below mean the tool is theme-blind, not that it passed three audits.

## Remaining Manual QA

- Browser-click focus order for Create SEL Share Packet, For Educators, and Station Builder.
- Visual responsive review at mobile, tablet, and desktop widths in the live app.
- Editorial/safety review for crisis and other sensitive SEL content.

## View Results

- sel-hub-catalog / light: 0 error(s), 0 warning(s); recent=true, sharePacket=true, teacherLaunch=true
- sel-hub-catalog / dark: 0 error(s), 0 warning(s); recent=true, sharePacket=true, teacherLaunch=true
- sel-hub-catalog / high-contrast: 0 error(s), 0 warning(s); recent=true, sharePacket=true, teacherLaunch=true
- sel-hub-catalog / mobile-high-contrast: 0 error(s), 0 warning(s); recent=true, sharePacket=true, teacherLaunch=true
