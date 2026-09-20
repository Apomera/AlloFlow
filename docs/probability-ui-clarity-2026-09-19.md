# Probability Lab UI clarity — September 19, 2026

## Changes

The experiment picker starts with Coin, Dice, Two-Dice Sum, Spinner, and Marble Bag. Show all experiments (13) reveals all existing modes. Collapsing the list retains a selected advanced experiment alongside the five common choices. Saved advanced modes remain visible on reopening the tool.

Labels now explain Custom outcomes, Probability tree, Estimate pi, and Shared birthdays. Buttons wrap in a responsive grid with a 44-pixel minimum height. The disclosure exposes its expanded state and controlled list to assistive technology.

Opening or closing the picker changes only its display preference. Existing simulation switching/reset behavior, rewards, calculations, and every experiment remain intact. English label keys and source/public mirrors are synchronized.

## Validation

- Added two component regression tests for result preservation and saved advanced selection.
- The simulation, sampling uncertainty, rewards, marble model, dice/shape sampling, custom distribution, conditional tree, and navigation suites passed. Updated pre-existing accessibility assertions to recognize translated visual labels.
- Browser verification opened all 13 experiments in default, dark, and high-contrast themes.
- Both picker sizes fit 1120, 375, and 320 pixels: 18 layout checks. Increased text spacing did not overflow the collapsed picker; navigation buttons meet the 44-pixel minimum.
- Enter and Space toggle the disclosure; a 10-trial run retains its mode, trial count, and result history across expansion/collapse.
- Scoped axe scans passed for the experiment list and disclosure in all themes, with no browser runtime errors. The narrow layout was visually reviewed.
- Source/public mirrors match, the English catalog parses, and scoped diff whitespace checks pass.

Evidence: scratch/probability-ui-clarity-2026-09-19/ contains the browser harness, screenshots, verification JSON, and regression reports. Component checks use mocked host context; a full deployed application run was not performed. No deployment was made.
