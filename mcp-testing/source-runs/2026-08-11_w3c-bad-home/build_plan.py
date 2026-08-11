# Builds patch-plan.json for the W3C BAD before/home.html evidence run.
# Programmatic because the finds are quote-heavy; the engine re-verifies
# uniqueness of every find against the bound bytes regardless.
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "source-corpus" / "w3c-bad"
PAGE = ROOT / "before" / "home.html"
OUT = Path(__file__).resolve().parent / "patch-plan.json"

sha = hashlib.sha256(PAGE.read_bytes()).hexdigest()
P = []

def patch(find, replace, rationale, wcag=None, text=False):
    entry = {"file": "before/home.html", "find": find, "replace": replace, "rationale": rationale}
    if wcag:
        entry["wcag"] = wcag
    if text:
        entry["changes_rendered_text"] = True
    P.append(entry)

# Language
patch("<HTML>", '<HTML lang="en">',
      "The document declares no language; assistive technology cannot pick a voice or braille table (axe html-has-lang).",
      ["3.1.1"])

# Quick menu select: no accessible name
patch('<SELECT ONCHANGE="location.href = this.value;">',
      '<SELECT aria-label="Quick menu: city services" ONCHANGE="location.href = this.value;">',
      "The quick-menu select has no accessible name (axe select-name, critical). Auto-navigation on change is a further 3.2.2 concern recorded in review_notes; renaming only here keeps the patch behavior-preserving.",
      ["4.1.2"])

# Left nav: javascript: hrefs + onFocus=blur() + nameless image links
patch('<A HREF="javascript:location.href=\'home.html\';" onFocus="blur();"><img name="nav_home" src=./img/nav_home.gif width=88 height=27 hspace="15" border=0px></a>',
      '<A HREF="home.html"><img name="nav_home" src=./img/nav_home.gif width=88 height=27 hspace="15" border=0px alt="Home"></a>',
      "Home nav link: javascript: href defeats non-JS navigation, onFocus=blur() throws keyboard focus away, and the image link has no name (axe link-name). Real href, no blur, alt names the link.",
      ["2.1.1", "4.1.2", "1.1.1"])
patch('<A HREF="javascript:location.href=\'news.html\';" ONFOCUS="blur();"><IMG SRC=./img/nav_news.gif name="nav_news" WIDTH=90 HEIGHT=21 hspace="12" BORDER=0px></A>',
      '<A HREF="news.html"><IMG SRC=./img/nav_news.gif name="nav_news" WIDTH=90 HEIGHT=21 hspace="12" BORDER=0px ALT="News"></A>',
      "News nav link: same defect set as the Home link (javascript: href, focus thrown away, nameless image link).",
      ["2.1.1", "4.1.2", "1.1.1"])
patch('<A HREF="javascript:location.href=\'tickets.html\';" ONFOCUS="blur();"><IMG name="nav_facts" SRC=./img/nav_facts.gif WIDTH=105 HEIGHT=23 hspace="9" BORDER=0px></A>',
      '<A HREF="tickets.html"><IMG name="nav_facts" SRC=./img/nav_facts.gif WIDTH=105 HEIGHT=23 hspace="9" BORDER=0px ALT="Tickets"></A>',
      "Tickets nav link: same defect set as the Home link.",
      ["2.1.1", "4.1.2", "1.1.1"])
patch('<A HREF="javascript:location.href=\'survey.html\';" ONFOCUS="blur();"><IMG SRC=./img/nav_survey.gif name="nav_survey" WIDTH=107 HEIGHT=32 hspace="8" BORDER=0px></A>',
      '<A HREF="survey.html"><IMG SRC=./img/nav_survey.gif name="nav_survey" WIDTH=107 HEIGHT=32 hspace="8" BORDER=0px ALT="Survey"></A>',
      "Survey nav link: same defect set as the Home link.",
      ["2.1.1", "4.1.2", "1.1.1"])

# Headline links: onFocus=blur()
for headline in ("Heat wave linked to temperatures", "Man Gets Nine Months in Violin Case", "Lack of brains hinders research"):
    patch(f'<a href="news.html" onFocus="blur();">{headline}</a>',
          f'<a href="news.html">{headline}</a>',
          f"News headline link '{headline[:24]}...': onFocus=blur() makes the link unreachable by keyboard.",
          ["2.1.1"])

# Story more-arrow links: empty-alt image is the only link content + blur
for prefix, label in (
    ("hot air from our ", "Read more: heat wave study"),
    ("require compulsory ", "Read more: violin case sentencing"),
    ("Safe Streets' policy ", "Read more: brain donations drop"),
):
    patch(prefix + '<a href="news.html" onFocus="blur();"><img src="./img/morearrow.gif" width="48" height="10" alt=""',
          prefix + '<a href="news.html"><img src="./img/morearrow.gif" width="48" height="10" alt="' + label + '"',
          f"Story continuation link: its only content was an empty-alt arrow image (axe link-name) and onFocus=blur() defeated keyboard focus. Alt now names the destination: '{label}'.",
          ["1.1.1", "2.4.4", "2.1.1"])

# 'Click here' offsite links
patch('Killer bees. <a onFocus="blur();" href="../offsite.html" target="_blank">Click here</a>',
      'Killer bees: <a href="../offsite.html" target="_blank">killer bees information (external site)</a>',
      "'Click here' is meaningless out of context and the link threw focus away; the link text now names its destination and discloses that it leaves the site.",
      ["2.4.4", "2.1.1"], text=True)
patch('Onions. <a onFocus="blur();" href="../offsite.html" target="_blank">Click here</a>',
      'Onions: <a href="../offsite.html" target="_blank">onion advice (external site)</a>',
      "Second 'Click here' link, same repair as the killer-bees link.",
      ["2.4.4", "2.1.1"], text=True)

# Sidebar 'Read More' links: blur
patch('<A HREF=tickets.html ONFOCUS="blur();" STYLE="text-decoration:none;">Read More...</A>',
      '<A HREF=tickets.html STYLE="text-decoration:none;" aria-label="Read more: free penguins concert">Read More...</A>',
      "Sidebar Read More (penguins): onFocus=blur() defeated keyboard use; aria-label disambiguates the repeated link text.",
      ["2.1.1", "2.4.4"])
patch('<A HREF=survey.html ONFOCUS="blur();" STYLE="text-decoration:none;">Read More...</A>',
      '<A HREF=survey.html STYLE="text-decoration:none;" aria-label="Read more: city parks survey">Read More...</A>',
      "Sidebar Read More (parks): same repair as the penguins link.",
      ["2.1.1", "2.4.4"])

# Informative images
patch('<IMG SRC=./img/top_weather.gif WIDTH=128px HEIGHT=86px>',
      '<IMG SRC=./img/top_weather.gif WIDTH=128px HEIGHT=86px ALT="Weather symbol: partly cloudy">',
      "The weather pictogram (sun behind clouds, viewed) had no text alternative; the adjacent scripted ticker carries the temperature text.",
      ["1.1.1"])
patch('<IMG SRC=./img/teaser_right1.jpg WIDTH=150px HEIGHT=106px>',
      '<IMG SRC=./img/teaser_right1.jpg WIDTH=150px HEIGHT=106px ALT="A performer on stage at a concert">',
      "Teaser photo for the zoo benefit concert story (viewed: a performer on a dark stage under stage lighting) had no text alternative.",
      ["1.1.1"])
patch('<IMG SRC=./img/teaser_right2.jpg WIDTH=150px HEIGHT=154px>',
      '<IMG SRC=./img/teaser_right2.jpg WIDTH=150px HEIGHT=154px ALT="A white crocus flower blooming in dry grass">',
      "Teaser photo for the city parks story (viewed: a single white crocus with a yellow center in dry grass) had no text alternative.",
      ["1.1.1"])

# News photos rendered as CSS backgrounds with title="image"
for url, label in (
    ("panda-sm.jpg", "A man shading himself from the sun with a cardboard visor tucked into his hard hat"),
    ("oldenburgstudentviolin34.jpg", "A violin and bow in an open case"),
):
    patch(f'url(./img/{url}) center center no-repeat #cccccc" title="image"',
          f'url(./img/{url}) center center no-repeat #cccccc" role="img" aria-label="{label}"',
          f"News photo delivered as a CSS background with title='image'; role=img plus a real label ('{label}') makes it perceivable.",
          ["1.1.1"])
patch('url(./img/BrainInJar.jpg) center center no-repeat #cccccc;" title="image"',
      'url(./img/BrainInJar.jpg) center center no-repeat #cccccc;" role="img" aria-label="A model of a human brain"',
      "Third news photo (viewed: a gray model brain against a blurred outdoor background; no jar is visible despite the filename).",
      ["1.1.1"])

# Decorative chrome images that are UNIQUE in markup
for find in (
    '<IMG SRC=./img/top_logo_next_end.gif WIDTH=24px HEIGHT=86px>',
    '<IMG SRC=./img/top_logo_next_start.gif WIDTH=22px HEIGHT=86px>',
    '<IMG SRC=./img/mark.gif WIDTH=158px HEIGHT=7px>',
    '<IMG SRC=.img/marker2_w.gif WIDTH=78px HEIGHT=1px>',
    '<IMG SRC=./img/border_left_top.gif WIDTH=10px HEIGHT=10px>',
    '<IMG SRC=./img/border_top.gif HEIGHT=10px>',
    '<IMG SRC=./img/border_right_top.gif WIDTH=10px HEIGHT=10px>',
    '<IMG SRC=./img/border_left.gif WIDTH=10px>',
    '<IMG SRC=./img/border_right.gif WIDTH=10px>',
    '<IMG SRC=./img/border_bottom_left.gif WIDTH=10px HEIGHT=10px>',
    '<IMG SRC=./img/border_bottom.gif HEIGHT=10px>',
    '<IMG SRC=./img/border_bottom_right.gif WIDTH=10px HEIGHT=10px>',
):
    patch(find, find[:-1] + ' ALT="">',
          "Decorative layout image (border/spacer chrome); empty alt removes it from the reading order.",
          ["1.1.1"])

# Landmark + headings
patch('<TD WIDTH=434px HEIGHT="600px" VALIGN=TOP id="main">',
      '<TD WIDTH=434px HEIGHT="600px" VALIGN=TOP id="main" role="main">',
      "The page has no main landmark (axe landmark-one-main); the central content cell takes role=main. Full landmark coverage of the table chrome is out of surgical scope and recorded in review_notes.",
      ["1.3.1"])
patch('<p class="headline">Welcome to CityLights</p>',
      '<h2 class="headline">Welcome to CityLights</h2>',
      "The visual page title was a styled paragraph; a real h2 (under the demo chrome's h1) restores structural navigation.",
      ["1.3.1"])
patch('<p class="subheadline">Elsewhere on the Web</p>',
      '<h3 class="subheadline">Elsewhere on the Web</h3>',
      "Second styled-paragraph heading becomes a real h3 in sequence.",
      ["1.3.1"])

# Contrast: sidebar headers #41545D on #A9B8BF is about 3.7:1
patch('<FONT COLOR=#41545D FACE=Verdana SIZE=2>&nbsp;<B>Free Penguins</B></FONT>',
      '<FONT COLOR=#25333B FACE=Verdana SIZE=2>&nbsp;<B>Free Penguins</B></FONT>',
      "Sidebar header text fails contrast on its #A9B8BF band (axe color-contrast, about 3.7:1); darkening within the same slate hue reaches AA.",
      ["1.4.3"])
patch('<FONT COLOR=#41545D FACE=Verdana SIZE=2>&nbsp;<B>More City Parks</B></FONT>',
      '<FONT COLOR=#25333B FACE=Verdana SIZE=2>&nbsp;<B>More City Parks</B></FONT>',
      "Second sidebar header, same contrast repair.",
      ["1.4.3"])

# v2 (engine 0.2.0, E-SRC-1): the byte-identical repeated spacers v1 REFUSED,
# now addressable with occurrence-indexed patches.
def occ_patch(find, occurrence, rationale):
    entry = {"file": "before/home.html", "find": find, "replace": find[:-1] + ' ALT="">',
             "rationale": rationale, "wcag": ["1.1.1"], "occurrence": occurrence}
    P.append(entry)

for n in range(1, 8):
    occ_patch('<IMG SRC=./img/marker2_w.gif WIDTH=78px HEIGHT=1px>', n,
              f"Decorative 1px divider (occurrence {n} of 7 byte-identical spacers); empty alt removes it from the reading order.")
for n in range(1, 3):
    occ_patch('<IMG SRC=./img/blank_5x5.gif WIDTH=20px HEIGHT=5px>', n,
              f"Decorative blank spacer (occurrence {n} of 2); empty alt removes it from the reading order.")
patch('<IMG SRC=./img/marker2_t.gif WIDTH=1px HEIGHT=30px>',
      '<IMG SRC=./img/marker2_t.gif WIDTH=1px HEIGHT=30px ALT="">',
      "Decorative vertical divider; empty alt removes it from the reading order.", ["1.1.1"])
patch('<IMG SRC=./img/marker2_t.gif WIDTH=1 HEIGHT=30px>',
      '<IMG SRC=./img/marker2_t.gif WIDTH=1 HEIGHT=30px ALT="">',
      "Decorative vertical divider (unitless-width variant); empty alt removes it from the reading order.", ["1.1.1"])
for n in range(1, 4):
    P.append({"file": "before/home.html",
              "find": '<img src="./img/headline_middle.gif" width="23" height="24" align="absmiddle">',
              "replace": '<img src="./img/headline_middle.gif" width="23" height="24" align="absmiddle" alt="">',
              "rationale": f"Decorative headline icon (occurrence {n} of 3); empty alt removes it from the reading order.",
              "wcag": ["1.1.1"], "occurrence": n})

# v4 (verification round 2 findings): a WRONG pre-existing alt and decorative
# bullet noise, both surfaced by the fresh reader's completeness sweep.
patch('<img src="./img/telefon_white_bg.gif" alt="1234 56789" border="0" align="absmiddle">',
      '<img src="./img/telefon_white_bg.gif" alt="(1) 269 C-H-O-K-E" border="0" align="absmiddle">',
      "The hotline image's pre-existing alt told screen-reader users a DIFFERENT phone number (1234 56789) than the pixels show sighted users ((1) 269 C-H-O-K-E, viewed); the prose says to call the number below, so the mismatch is a functional barrier.",
      ["1.1.1"])
for n in range(1, 3):
    P.append({"file": "before/home.html",
              "find": '<img src="./img/list_bullets.gif" alt="bullet" border="0" align="absmiddle">',
              "replace": '<img src="./img/list_bullets.gif" alt="" border="0" align="absmiddle">',
              "rationale": f"Decorative list-bullet graphic (occurrence {n} of 2): alt='bullet' is reading-order noise; empty alt silences it.",
              "wcag": ["1.1.1"], "occurrence": n})

plan = {
    "schema_version": "0.1",
    "target": {
        "description": "W3C WAI Before/After Demonstration, inaccessible CityLights home page (before/home.html). Surgical accessibility patches; layout and visual design intentionally unchanged.",
        "files": [{"path": "before/home.html", "sha256": sha}],
    },
    "patches": P,
    "review_notes": [
        "v4 note (verification round 2 finding): the fresh reader's completeness sweep caught a pre-existing WRONG alt - the hotline image reads (1) 269 C-H-O-K-E on screen but its alt said 1234 56789, giving screen-reader users a different phone number - plus alt='bullet' noise on two decorative bullets. Both patched after the author viewed the pixels. The engine also now preserves line endings byte-for-byte (E-SRC-3), removing the undeclared LF-to-CRLF rewrite round 2 observed.",
        "v3 note (verification round 1 finding): the first plan authored image descriptions from filenames and story context WITHOUT viewing the pixels, and the independent verifier rejected five of six (a concert stage labeled as penguins, a crocus flower as a park, a man in a cardboard sun visor as a panda, a cased violin as being played, an invented jar). All six meaningful descriptions were re-authored from direct viewing before this revision. The round-1 worksheet and exit-9 report are preserved as the record.",
        "v2 note: the byte-identical repeated spacers v1 refused (marker2_w.gif x7, blank_5x5.gif x2, headline_middle.gif x3, plus two unique marker2_t variants) are now patched via the occurrence-indexed form the v1 refusal motivated (engine 0.2.0, E-SRC-1). The v1 refusal note is preserved in the run's NOTES.md as the motivating record.",
        "The QUICKMENU select still navigates on change (WCAG 3.2.2 concern); converting it to a go-button pattern changes behavior and belongs to the page owner, not a surgical patch.",
        "axe 'region' violations only partially improve: role=main covers the content cell, but the table-based chrome outside landmarks would need structural rework beyond surgical scope.",
        "The two 'Click here' links now carry destination-bearing text; rendered text changes are declared on those patches.",
        "W3C publishes its own accessible rebuild of this page (after/home.html); this run patches the inaccessible original independently and audits W3C's version as a reference point only.",
    ],
}
OUT.write_text(json.dumps(plan, indent=1), encoding="utf-8")
print("patches:", len(P), "->", OUT.name)
