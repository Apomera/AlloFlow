# Charts & Graphs UI clarity — September 19, 2026

## Changes

Each selected chart now has a short purpose statement: comparing categories, showing parts of a whole, following a sequence, exploring an X/Y relationship, or summarizing a distribution. The active chart button references this guidance through aria-describedby. All six chart types remain available.

Data-entry fields have persistent visible labels. Scatter entry shows Label, X value, and Y value; other chart modes retain Label and Value. Existing input handlers, Enter-to-add behavior, and data validation are preserved. Inputs and the Add button have a 44-pixel minimum height and wrap at narrow widths.

The Regression workspace is labeled Regression & curve fitting. Workspace and chart selectors have wrapping labels and minimum button heights of 44 pixels. Both workspaces, the embedded regression tool, chart settings, imports, exports, and existing calculations remain available. English catalog entries and public mirrors are synchronized.

## Validation

- 56 tests passed across chart-engine, regression-engine, and shared tab/selector semantics suites.
- Browser checks covered all six chart types and both workspaces in default, dark, and high-contrast themes.
- Added a scatter point through the labeled fields using Enter and confirmed its label, X, and Y values. Switching chart types and going to Regression and back preserved the Chart Builder rows.
- Three control regions (workspace selector, chart selector, row entry) fit 1120, 375, and 320 pixels in all themes: nine viewport/theme combinations. Increased row-entry text spacing fits without overflow.
- Narrow-screen row entry was visually inspected; the Add button was enlarged to match the fields, then browser verification was repeated.
- No browser runtime errors occurred. Source/public mirrors match, catalog JSON parses, and scoped whitespace checks pass.

Evidence and the reusable component harness are in scratch/charts-ui-clarity-2026-09-19/. Browser verification uses mocked host context and is not a complete deployed application audit. Changes remain local; no deployment was made.
