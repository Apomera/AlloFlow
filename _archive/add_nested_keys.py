"""Add the remaining missing keys - these were missed because the section 
pattern didn't match (different naming or 3-level nesting)"""
import re

FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

le = '\r\n' if lines[0].endswith('\r\n') else '\n'

# Find UI_STRINGS start
ui_start = None
for i, line in enumerate(lines):
    if 'const UI_STRINGS' in line:
        ui_start = i
        break

# Strategy: For still-missing keys, search for the exact section text pattern
# and insert before the section's closing }

def find_section(section_name, start_range, end_range):
    """Find section by looking for 'section_name: {' or 'section_name:{' """
    for i in range(start_range, min(end_range, len(lines))):
        s = lines[i].strip()
        if s.startswith(section_name + ':') and '{' in s:
            return i
        if s.startswith("'" + section_name + "':") and '{' in s:
            return i
    return None

def find_section_end(section_start):
    """Find the closing } of a section"""
    depth = 0
    for j in range(section_start, min(section_start + 2000, len(lines))):
        for ch in lines[j]:
            if ch == '{': depth += 1
            elif ch == '}': depth -= 1
        if depth == 0:
            return j
    return None

def find_nested_section(parent_name, child_name):
    """Find a nested section like organizer -> labels"""
    parent = find_section(parent_name, ui_start, ui_start + 7000)
    if parent is None:
        return None, None
    parent_end = find_section_end(parent)
    if parent_end is None:
        return None, None
    child = find_section(child_name, parent, parent_end)
    if child is None:
        return parent, parent_end  # Will add to parent
    child_end = find_section_end(child)
    return child, child_end

total = 0

# 1. Add adventure.toasts nested keys
adv_toasts_start = None
adv_start = find_section('adventure', ui_start, ui_start + 7000)
if adv_start:
    adv_end = find_section_end(adv_start)
    # Look for 'toasts:' subsection inside adventure
    toasts_sub = find_section('toasts', adv_start, adv_end or adv_start + 500)
    if toasts_sub:
        toasts_end = find_section_end(toasts_sub)
        if toasts_end:
            new = [
                "        broadcast_error: 'Failed to broadcast adventure update.'," + le,
                "        options_broadcast_success: 'Options broadcast to students!'," + le,
            ]
            for idx, nl in enumerate(new):
                lines.insert(toasts_end + idx, nl)
            total += 2
            print("Added 2 adventure.toasts keys")

# 2. Organizer labels (nested)
org_start = find_section('organizer', ui_start, ui_start + 7000)
if org_start:
    org_end = find_section_end(org_start)
    labels_sub = find_section('labels', org_start, org_end or org_start + 500)
    if labels_sub:
        labels_end = find_section_end(labels_sub)
        if labels_end:
            new = [
                "        cause: 'Cause'," + le,
                "        effect: 'Effect'," + le,
                "        end: 'End'," + le,
                "        problem_label: 'Problem'," + le,
                "        solutions: 'Solutions'," + le,
            ]
            for idx, nl in enumerate(new):
                lines.insert(labels_end + idx, nl)
            total += 5
            print("Added 5 organizer.labels keys")

# 3. Outline labels (nested)
out_start = find_section('outline', ui_start, ui_start + 7000)
if out_start:
    out_end = find_section_end(out_start)
    labels_sub = find_section('labels', out_start, out_end or out_start + 500)
    if labels_sub:
        labels_end = find_section_end(labels_sub)
        if labels_end:
            new = [
                "        generate_outcome: 'Generate Outcome'," + le,
            ]
            for idx, nl in enumerate(new):
                lines.insert(labels_end + idx, nl)
            total += 1
            print("Added 1 outline.labels key")

# 4. Games fill_blank (nested)
games_start = find_section('games', ui_start, ui_start + 7000)
if games_start:
    games_end = find_section_end(games_start)
    fb_sub = find_section('fill_blank', games_start, games_end or games_start + 500)
    if fb_sub:
        fb_end = find_section_end(fb_sub)
        if fb_end:
            new = [
                "        input_label: 'Your answer'," + le,
            ]
            for idx, nl in enumerate(new):
                lines.insert(fb_end + idx, nl)
            total += 1
            print("Added 1 games.fill_blank key")

print("\nTotal added: " + str(total))
f = open(FILE, 'w', encoding='utf-8')
f.write(''.join(lines))
f.close()
print("Lines: " + str(len(lines)))
