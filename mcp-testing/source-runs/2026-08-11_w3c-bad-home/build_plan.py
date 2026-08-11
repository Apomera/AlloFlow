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
      '<IMG SRC=./img/top_weather.gif WIDTH=128px HEIGHT=86px ALT="Weather today: sunny, 23 degrees Celsius">',
      "The weather graphic conveys today's forecast and had no text alternative.",
      ["1.1.1"])
patch('<IMG SRC=./img/teaser_right1.jpg WIDTH=150px HEIGHT=106px>',
      '<IMG SRC=./img/teaser_right1.jpg WIDTH=150px HEIGHT=106px ALT="Penguins at the city zoo">',
      "Teaser photo for the Free Penguins story had no text alternative.",
      ["1.1.1"])
patch('<IMG SRC=./img/teaser_right2.jpg WIDTH=150px HEIGHT=154px>',
      '<IMG SRC=./img/teaser_right2.jpg WIDTH=150px HEIGHT=154px ALT="A green city park">',
      "Teaser photo for the More City Parks story had no text alternative.",
      ["1.1.1"])

# News photos rendered as CSS backgrounds with title="image"
for url, label in (
    ("panda-sm.jpg", "A panda eating bamboo"),
    ("oldenburgstudentviolin34.jpg", "A student playing the violin"),
):
    patch(f'url(./img/{url}) center center no-repeat #cccccc" title="image"',
          f'url(./img/{url}) center center no-repeat #cccccc" role="img" aria-label="{label}"',
          f"News photo delivered as a CSS background with title='image'; role=img plus a real label ('{label}') makes it perceivable.",
          ["1.1.1"])
patch('url(./img/BrainInJar.jpg) center center no-repeat #cccccc;" title="image"',
      'url(./img/BrainInJar.jpg) center center no-repeat #cccccc;" role="img" aria-label="A model brain in a jar"',
      "Third news photo (trailing-semicolon variant of the same pattern).",
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

plan = {
    "schema_version": "0.1",
    "target": {
        "description": "W3C WAI Before/After Demonstration, inaccessible CityLights home page (before/home.html). Surgical accessibility patches; layout and visual design intentionally unchanged.",
        "files": [{"path": "before/home.html", "sha256": sha}],
    },
    "patches": P,
    "review_notes": [
        "REFUSED (engine limitation, recorded honestly): repeated decorative spacers (./img/marker2_w.gif x6, marker2_t.gif x2, blank_5x5.gif x2, headline_middle.gif x3) share byte-identical markup, and this engine's exactly-once find contract cannot address one occurrence at a time. They remain unlabeled; an occurrence-indexed patch form is the engine follow-up this run motivates.",
        "The QUICKMENU select still navigates on change (WCAG 3.2.2 concern); converting it to a go-button pattern changes behavior and belongs to the page owner, not a surgical patch.",
        "axe 'region' violations only partially improve: role=main covers the content cell, but the table-based chrome outside landmarks would need structural rework beyond surgical scope.",
        "The two 'Click here' links now carry destination-bearing text; rendered text changes are declared on those patches.",
        "W3C publishes its own accessible rebuild of this page (after/home.html); this run patches the inaccessible original independently and audits W3C's version as a reference point only.",
    ],
}
OUT.write_text(json.dumps(plan, indent=1), encoding="utf-8")
print("patches:", len(P), "->", OUT.name)
