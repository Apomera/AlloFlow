# Patch plan for W3C BAD before/survey.html (forms run).
# The count-driven deco() helper auto-generates occurrence-indexed patches for
# repeated decorative chrome, so plan authoring scales with page size.
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "source-corpus" / "w3c-bad"
PAGE = ROOT / "before" / "survey.html"
OUT = Path(__file__).resolve().parent / "patch-plan.json"

TEXT = PAGE.read_text(encoding="utf-8", errors="replace")
sha = hashlib.sha256(PAGE.read_bytes()).hexdigest()
P = []

def patch(find, replace, rationale, wcag=None, text=False, occurrence=None):
    entry = {"file": "before/survey.html", "find": find, "replace": replace, "rationale": rationale}
    if wcag:
        entry["wcag"] = wcag
    if text:
        entry["changes_rendered_text"] = True
    if occurrence is not None:
        entry["occurrence"] = occurrence
    P.append(entry)

def deco(find, why="Decorative layout image; empty alt removes it from the reading order."):
    count = TEXT.count(find)
    assert count >= 1, f"not found: {find[:60]}"
    for n in range(1, count + 1):
        patch(find, find[:-1] + ' ALT="">',
              why + (f" (occurrence {n} of {count})" if count > 1 else ""),
              ["1.1.1"], occurrence=(n if count > 1 else None))

# ── Document language ──
patch("<HTML>", '<HTML lang="en">',
      "The document declares no language; assistive technology cannot pick a voice or braille table (axe html-has-lang).",
      ["3.1.1"])

# ── Quick menu (same chrome defect as the home page) ──
patch('<SELECT ONCHANGE="location.href = this.value;">',
      '<SELECT aria-label="Quick menu: city services" ONCHANGE="location.href = this.value;">',
      "The quick-menu select has no accessible name (axe select-name). Its navigate-on-change behavior is a 3.2.2 concern recorded in review_notes.",
      ["4.1.2"])

# ── Left nav: javascript: hrefs + onFocus=blur() + nameless image links ──
for page_name, img_attrs, label in (
    ("home.html", 'onFocus="blur();"><img name="nav_home" src=./img/nav_home.gif width=88 height=27 hspace="15" border=0px>', "Home"),
    ("news.html", 'ONFOCUS="blur();"><IMG SRC=./img/nav_news.gif name="nav_news" WIDTH=90 HEIGHT=21 hspace="12" BORDER=0px>', "News"),
    ("tickets.html", 'ONFOCUS="blur();"><IMG name="nav_facts" SRC=./img/nav_facts.gif WIDTH=105 HEIGHT=23 hspace="9" BORDER=0px>', "Tickets"),
    ("survey.html", 'ONFOCUS="blur();"><IMG SRC=./img/nav_survey.gif name="nav_survey" WIDTH=107 HEIGHT=32 hspace="8" BORDER=0px>', "Survey"),
):
    prefix = f'<A HREF="javascript:location.href=\'{page_name}\';" '
    close = "</a>" if label == "Home" else "</A>"
    find = prefix + img_attrs + close
    assert TEXT.count(find) == 1, f"nav find not unique for {label}: {TEXT.count(find)}"
    fixed_img = img_attrs.split(">", 1)[1][:-0] if False else img_attrs
    # strip the blur prefix, keep the img, add alt before its closing '>'
    img_only = img_attrs.split(">", 1)[1]
    alt_attr = f' alt="{label}">' if "src=" in img_only else f' ALT="{label}">'
    fixed = f'<A HREF="{page_name}">' + img_only[:-1] + alt_attr[:-1] + ">" + close
    patch(find, fixed,
          f"{label} nav link: javascript: href defeats non-JS navigation, onFocus=blur() throws keyboard focus away, and the image link has no name. Real href, no blur, alt names the link.",
          ["2.1.1", "4.1.2", "1.1.1"])

# ── Headings: styled paragraphs become real headings ──
patch('<p class="headline">Citylights Survey</p>',
      '<h2 class="headline">Citylights Survey</h2>',
      "The visual page title was a styled paragraph; a real h2 (under the demo chrome's h1) restores structural navigation.",
      ["1.3.1"])
patch('<p class="headline"><font size="4">This Week\'s Survey: More city parks - a pain or a gain?</font></p>',
      '<h3 class="headline"><font size="4">This Week\'s Survey: More city parks - a pain or a gain?</font></h3>',
      "The survey subtitle was a styled paragraph; a real h3 keeps the hierarchy in sequence.",
      ["1.3.1"])

# ── Main landmark ──
patch('<TD WIDTH=625px HEIGHT="600px" VALIGN=TOP id="main">',
      '<TD WIDTH=625px HEIGHT="600px" VALIGN=TOP id="main" role="main">',
      "The page has no main landmark; the central content cell takes role=main. Full landmark coverage of the table chrome is out of surgical scope (review_notes).",
      ["1.3.1"])

# ── THE FORM ──
# Favorite-park radios: six inputs in layout-table cells whose visible option
# text sits in DIFFERENT cells. aria-labels bind each control to its option;
# role=group + aria-label on the enclosing layout table gives group context a
# fieldset cannot (wrapping table rows in a fieldset is invalid markup).
patch('<table width="500" border="0" cellspacing="2" cellpadding="0">',
      '<table width="500" border="0" cellspacing="2" cellpadding="0" role="group" aria-label="Which is your favorite city park?">',
      "The six park radios have no group context (no fieldset is possible inside this layout table); role=group with the question as its label carries the grouping to assistive tech.",
      ["1.3.1", "3.3.2"])
for value, option in (("1", "None"), ("2", "Central Park"), ("3", "Grand Park"),
                      ("4", "Jurassic Park"), ("5", "South Park"), ("6", "Other")):
    find = f'<input class="align" type="radio" name="res" value="{value}">'
    assert TEXT.count(find) == 1, f"radio res {value}: {TEXT.count(find)}"
    patch(find,
          f'<input class="align" type="radio" name="res" value="{value}" aria-label="{option}">',
          f"Park radio {value}: its visible option text ('{option}') sits in a different layout-table cell, so the control had no accessible name (axe label, critical).",
          ["1.1.1", "3.3.2", "4.1.2"])

# Greenest-city select: its question lives in a th elsewhere.
patch('<select name="cc">',
      '<select name="cc" aria-label="Which city do you find is the greenest?">',
      "The city select has no accessible name (axe select-name, critical); the question text sits in a separate table header cell.",
      ["3.3.2", "4.1.2"])

# Personal details: title radios + three text fields whose visible labels sit
# in other cells ('Name:' precedes the radios; 'eMail Address' and 'Retype
# eMail' label the columns a row below).
patch('<input type="radio" name="t" value="mr"> Mr.',
      '<input type="radio" name="t" value="mr" aria-label="Title: Mr."> Mr.',
      "Title radio: the adjacent text 'Mr.' is not programmatically associated (axe label).",
      ["3.3.2", "4.1.2"])
patch('<input type="radio" name="t" value="mrs"> Mrs.',
      '<input type="radio" name="t" value="mrs" aria-label="Title: Mrs."> Mrs.',
      "Title radio: the adjacent text 'Mrs.' is not programmatically associated (axe label).",
      ["3.3.2", "4.1.2"])
patch('<input type="text" name="em" id="em" size="20" />',
      '<input type="text" name="em" id="em" size="20" aria-label="eMail Address" />',
      "Text field em: its visible label 'eMail Address' sits in a cell one row below (axe label). The name/id ('em') and column position confirm the pairing.",
      ["3.3.2", "4.1.2"])
patch('<input type="text" name="n" id="n" size="30" />',
      '<input type="text" name="n" id="n" size="30" aria-label="Name" />',
      "Text field n: the visible 'Name:' text precedes the title radios in a different cell and is never associated (axe label). The name/id ('n') confirms the pairing.",
      ["3.3.2", "4.1.2"])
patch('<input type="text" name="ev" id="ev" size="20" />',
      '<input type="text" name="ev" id="ev" size="20" aria-label="Retype eMail" />',
      "Text field ev: its visible label 'Retype eMail' sits in a cell one row below (axe label). The name/id ('ev' = email verify) and column position confirm the pairing.",
      ["3.3.2", "4.1.2"])

# ── Informative chrome image (viewed on the home-page run: same asset) ──
patch('<IMG SRC=./img/top_weather.gif WIDTH=128px HEIGHT=86px>',
      '<IMG SRC=./img/top_weather.gif WIDTH=128px HEIGHT=86px ALT="Weather symbol: partly cloudy">',
      "The weather pictogram (sun behind clouds, viewed on the home-page run; same asset) had no text alternative.",
      ["1.1.1"])

# ── Decorative chrome (count-driven; occurrence-indexed automatically) ──
for find in (
    '<IMG SRC=./img/top_logo_next_end.gif WIDTH=24px HEIGHT=86px>',
    '<IMG SRC=./img/top_logo_next_start.gif WIDTH=22px HEIGHT=86px>',
    '<IMG SRC=./img/mark.gif WIDTH=158px HEIGHT=7px>',
    '<IMG SRC=./img/marker2_w.gif WIDTH=78px HEIGHT=1px>',
    '<IMG SRC=.img/marker2_w.gif WIDTH=78px HEIGHT=1px>',
    '<IMG SRC=./img/marker2_t.gif WIDTH=1 HEIGHT=30px>',
    '<IMG SRC=./img/blank_5x5.gif WIDTH=20px HEIGHT=5px>',
    '<IMG SRC=./img/border_left_top.gif WIDTH=10px HEIGHT=10px>',
    '<IMG SRC=./img/border_top.gif HEIGHT=10px>',
    '<IMG SRC=./img/border_right_top.gif WIDTH=10px HEIGHT=10px>',
    '<IMG SRC=./img/border_left.gif WIDTH=10px>',
    '<IMG SRC=./img/border_right.gif WIDTH=10px>',
    '<IMG SRC=./img/border_bottom_left.gif WIDTH=10px HEIGHT=10px>',
    '<IMG SRC=./img/border_bottom.gif HEIGHT=10px>',
    '<IMG SRC=./img/border_bottom_right.gif WIDTH=10px HEIGHT=10px>',
):
    deco(find)

plan = {
    "schema_version": "0.1",
    "target": {
        "description": "W3C WAI Before/After Demonstration, inaccessible CityLights survey page (before/survey.html). Surgical accessibility patches with a forms focus; layout and visual design intentionally unchanged.",
        "files": [{"path": "before/survey.html", "sha256": sha}],
    },
    "patches": P,
    "review_notes": [
        "Accepted remainder: the two title radios (name=t) still count as an ungrouped pair in the auditor's fieldset/role-group check. Each control's aria-label carries the group lexically ('Title: Mr.' / 'Title: Mrs.'), and the only surgical wrapper available (the enclosing nobr, which also contains the unrelated visible text 'Name:') would produce a semantically muddy group; the honest structural fix belongs to a page rebuild.",
        "Form-association strategy: the survey lays controls and their visible labels out in SEPARATE layout-table cells, so label/for pairing and fieldsets are structurally impossible without rebuilding the tables. aria-label per control (bound from column position corroborated by the control's own name/id) plus role=group with the question text on the enclosing layout table is the surgical equivalent; a structural rebuild like W3C's own after-page remains the better long-term fix and belongs to the page owner.",
        "The eMail/Name/Retype-eMail pairings were derived from column positions and the controls' name/id attributes (em, n, ev); if the backend maps them differently the labels must follow the backend, not this inference - flagged for the page owner.",
        "The QUICKMENU select still navigates on change (WCAG 3.2.2); converting it to a go-button changes behavior and belongs to the page owner.",
        "axe 'region' violations only partially improve: role=main covers the content cell; the table-based chrome outside landmarks would need structural rework beyond surgical scope.",
        "The 25 gif.gif spacers already carry alt='' in the source and were left untouched.",
        "The submit button is a real input[type=submit] and was left untouched.",
    ],
}
OUT.write_text(json.dumps(plan, indent=1), encoding="utf-8")
print("patches:", len(P), "->", OUT.name)
