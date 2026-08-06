#!/usr/bin/env python3
"""Author tranche 61 of the i1040 rebuild: printed pages 123-124 — the Index.

MECHANICAL. Three columns of entries with page numbers, sub-entries indented
under a parent, and italic "See"/"See also" cross-references. Parsed out of
per-item page geometry and gated by six assertions.

Usage: python gen_tranche_61.py [out.json]
"""
import json
import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
PDF = os.path.join(REPO, "mcp-testing", "corpus", "born-digital",
                   "irs-i1040-instructions.pdf")
ITEMS_TOOL = os.path.join(REPO, "mcp-testing", "tools", "page_items.cjs")
CACHE = os.path.join(tempfile.gettempdir(), "i1040_index_items_123_124.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-61-pages-123-124.json")

FIRST_PAGE, LAST_PAGE = 123, 124
MARKER = re.compile(r"(«[^»]*»|‹[^›]*›|\[\[[^\]]*\]\])")

# (entry x, sub-entry x, right edge), measured from the x histogram.
COLUMNS = [(42, 53, 215), (224, 235, 397), (406, 417, 580)]
XTOL = 4
BAND_TOL = 2.5
ENTRY_FACE = "g_d0_f4"        # entry labels AND the letter section heads
VALUE_FACE = "g_d0_f1"        # page numbers, commas, ranges, and "(Tax help)"
SEE_FACE = "g_d0_f2"          # the italic "See" / "See also"
LETTER_SIZE = 9.6             # letter heads; entries are 8pt
ENTRY_SIZE = 8
WRAP_GAP = 60                 # a wrapped line ends within this of the column edge

blocks = []


def rich(text):
    """«…» emphasis, ‹…› strong, [[text|url]] link, [[«text»|url]] italic link."""
    if not MARKER.search(text):
        return text, None
    runs, plain = [], []
    for piece in MARKER.split(text):
        if not piece:
            continue
        if piece.startswith("«"):
            body = piece[1:-1]
            runs.append({"text": body, "style": "emphasis"})
        elif piece.startswith("‹"):
            body = piece[1:-1]
            runs.append({"text": body, "style": "strong"})
        elif piece.startswith("[["):
            body, url = piece[2:-2].split("|", 1)
            if body.startswith("«") and body.endswith("»"):
                body = body[1:-1]
                runs.append({"text": body, "style": "emphasis", "href": url})
            else:
                runs.append({"text": body, "style": "normal", "href": url})
        else:
            body = piece
            runs.append({"text": body, "style": "normal"})
        plain.append(body)
    joined = "".join(plain)
    assert joined == "".join(run["text"] for run in runs)
    return joined, runs


def heading(text, level, page):
    blocks.append({"type": "heading", "level": level, "text": text, "source_page": page})


def para(text, page):
    plain, runs = rich(text)
    block = {"type": "paragraph", "text": plain, "source_page": page}
    if runs:
        block["runs"] = runs
    blocks.append(block)


# ---------------------------------------------------------------- extraction

def load_pages():
    if not os.path.exists(CACHE):
        subprocess.run(
            ["node", ITEMS_TOOL, PDF, str(FIRST_PAGE), str(LAST_PAGE), "--out", CACHE],
            check=True,
        )
    with open(CACHE, encoding="utf-8") as handle:
        return json.load(handle)["pages"]


def bands(items):
    rows, current, last_y = [], [], None
    for item in sorted(items, key=lambda i: (-i["y"], i["x"])):
        if last_y is None or abs(item["y"] - last_y) <= BAND_TOL:
            current.append(item)
            last_y = item["y"] if last_y is None else last_y
        else:
            rows.append(current)
            current, last_y = [item], item["y"]
    if current:
        rows.append(current)
    return rows


def join_value(parts):
    """Page numbers and See-references. The separators arrive as their own
    items ("92", ",", "112"), so they are concatenated with NO space and the
    commas are re-spaced afterwards. Ranges ("63", "-", "65") come out right
    for free."""
    text = ""
    for part in sorted(parts, key=lambda i: i["x"]):
        piece = part["text"]
        if not piece:
            continue
        # Space only between two WORD characters. That keeps "92" + "," +
        # "112" as "92,112" (re-spaced below) and "63" + "-" + "65" as
        # "63-65", while still separating "(" + "See" + "Tax help)" into
        # "(See Tax help)" - which the first version ran together as
        # "(SeeTax help)".
        if text and text[-1].isalnum() and piece[0].isalnum():
            text += " "
        text += piece
    text = re.sub(r"\s+", " ", text).strip()
    text = text.replace(",", ", ").replace(" ,", ",")
    text = re.sub(r"\s+", " ", text).strip()
    text = text.replace("( ", "(").replace(" )", ")")
    return text


def parse():
    """Return [(letter, [(label, value), ...]), ...] in reading order."""
    sections = []
    current = None
    pending_parent = None
    pending_sub_wrap = None

    for page in load_pages():
        # Only the three faces that make up the index take part. Everything
        # else is furniture sitting at a column x - the "Index to
        # Instructions" title and the folio are both g_d0_f3, and without this
        # the title parses as a stray value. Tranche 58 hit the same thing.
        items = [i for i in page["items"]
                 if str(i["text"]).strip()
                 and i["face"] in (ENTRY_FACE, VALUE_FACE, SEE_FACE)]
        for main_x, sub_x, right_x in COLUMNS:
            column = [i for i in items if main_x - XTOL <= i["x"] < right_x]
            rows = bands(column)

            def indented(n):
                if n < 0 or n >= len(rows):
                    return False
                first = sorted(rows[n], key=lambda i: i["x"])[0]
                return abs(first["x"] - sub_x) < abs(first["x"] - main_x)

            skip_next = False
            for n, row in enumerate(rows):
                if skip_next:
                    skip_next = False
                    continue
                row = sorted(row, key=lambda i: i["x"])
                labels = [i for i in row if i["face"] == ENTRY_FACE]
                letters = [i for i in labels if abs(i["size"] - LETTER_SIZE) < 0.3]
                if letters:
                    assert len(row) == len(letters),                         f"letter head band carries other content: {[i['text'] for i in row]}"
                    sections.append((letters[0]["text"].strip(), []))
                    current = sections[-1][1]
                    pending_parent = pending_sub_wrap = None
                    continue

                is_sub = indented(n)
                # ONLY TOP-LEVEL LABELS USE THE ENTRY FACE. A sub-entry's label
                # is g_d0_f1 - the same face as the page numbers - so splitting
                # by face alone yields "Standard deduction35". The parent's
                # colon is g_d0_f1 too, so "Education:" arrives as label
                # "Education" plus value ":".
                if labels and not is_sub:
                    label = " ".join(i["text"].strip() for i in labels if i["text"].strip())
                    value = join_value([i for i in row if i["face"] != ENTRY_FACE])
                else:
                    if any(i["face"] == SEE_FACE for i in row) and not labels:
                        value = join_value(row)
                        assert current, f"orphan cross-reference: {value!r}"
                        current[-1][1] = (current[-1][1] + " " + value).strip()
                        continue
                    cut = next((k for k, i in enumerate(row)
                                if re.fullmatch(r"\d+", i["text"].strip())), len(row))
                    label = " ".join(i["text"].strip() for i in row[:cut] if i["text"].strip())
                    value = join_value(row[cut:])
                    if not label:
                        assert current, f"orphan value: {value!r}"
                        current[-1][1] = (current[-1][1] + " " + value).strip()
                        continue

                assert current is not None, f"entry {label!r} before any letter head"

                if is_sub:
                    assert pending_parent, f"sub-entry {label!r} with no parent"
                    if pending_sub_wrap:
                        label = f"{pending_sub_wrap} {label}"
                        pending_sub_wrap = None
                    if not value:
                        # A SUB-entry label can wrap too, and its tail is the
                        # next indented line: "Penalty:" / "Others (including
                        # late filing and late" / "payment)  65". Caught by the
                        # every-entry-has-a-value assertion.
                        pending_sub_wrap = label
                        continue
                    # One join convention throughout: "Parent: Sub". Some
                    # parents print their own colon ("Education:"), some do not
                    # ("Dependents", which carries pages of its own), so the
                    # colon is normalised rather than assumed.
                    current.append([f"{pending_parent.rstrip(':')}: {label}", value])
                    continue

                if value and value != ":":
                    # A plain entry. It may ALSO parent indented lines below -
                    # a parent need not be childless or colon-terminated.
                    current.append([label, value])
                    pending_parent = label
                    continue

                # No pages of its own. Either a PARENT or a label that WRAPPED
                # onto the next indented line. x cannot tell them apart and
                # neither can capitalisation ("Disclosure, Privacy Act, and
                # Paperwork" wraps to "Reduction Act Notice"). Two signals
                # together do: a wrapped line ran out of room, so it reaches the
                # column edge, AND it is followed by exactly ONE indented line.
                # "Individual retirement arrangements (IRAs)" also reaches the
                # edge but has four children, so the child count is what
                # separates it.
                right_edge = max(i["x"] + i["w"] for i in row)
                ran_out = (right_x - right_edge) < WRAP_GAP
                only_one_child = indented(n + 1) and not indented(n + 2)
                if value != ":" and ran_out and only_one_child:
                    tail = sorted(rows[n + 1], key=lambda i: i["x"])
                    cut = next((k for k, i in enumerate(tail)
                                if re.fullmatch(r"\d+", i["text"].strip())), len(tail))
                    tail_label = " ".join(i["text"].strip() for i in tail[:cut]
                                          if i["text"].strip())
                    current.append([f"{label} {tail_label}".strip(),
                                    join_value(tail[cut:])])
                    pending_parent = None
                    skip_next = True
                else:
                    pending_parent = label
    return sections


sections = parse()

# ------------------------------------------------------------- assertions

all_entries = [e for _, entries in sections for e in entries]

# 1. Every section is a single letter and has entries.
for letter, entries in sections:
    assert len(letter) == 1 and letter.isalpha(), f"bad section head {letter!r}"
    assert entries, f"section {letter} has no entries"

# 2. Every entry has a label and a value.
for label, value in all_entries:
    assert label and not label.isspace(), "entry with no label"
    assert value and not value.isspace(), f"entry {label!r} has no pages or See"

# 3. Sections run in alphabetical order across the whole index. This is the
#    check that catches a column read out of order.
heads = [s for s, _ in sections]
for prev, nxt in zip(heads, heads[1:]):
    assert nxt > prev, f"sections out of order: {prev} then {nxt}"

# 4. Every page number cited is inside the document.
for label, value in all_entries:
    for num in re.findall(r"\d+", value):
        assert 1 <= int(num) <= 126, f"entry {label!r} cites page {num}"

# 5. A top-level entry starts with its section's letter. Sub-entries inherit
#    their parent's label, so they satisfy this too.
for letter, entries in sections:
    for label, _ in entries:
        first = re.sub(r"^[^A-Za-z]+", "", label)[:1].upper()
        assert first == letter, \
            f"entry {label!r} filed under {letter} but starts with {first!r}"

# 6. Scale.
assert len(all_entries) >= 200, f"only {len(all_entries)} index entries parsed"
assert len(sections) >= 20, f"only {len(sections)} letter sections parsed"

# ------------------------------------------------------------------ blocks

heading("Index to Instructions", 2, 123)
para(
    "Index entries give the printed page number in these instructions. A "
    "sub-entry is written with its parent, so every row stands on its own.",
    123,
)

for letter, entries in sections:
    page = 123 if letter < "R" else 124
    heading(letter, 3, page)
    blocks.append({
        "type": "table",
        "caption": f"Index entries beginning with {letter}, and their pages.",
        "columns": ["Entry", "Pages"],
        "rows": [list(e) for e in entries],
        "row_headers": True,
        "source_page": page,
    })

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 61 OF A MULTI-SESSION REBUILD, AND THE LAST OF THE INDEX. This "
    f"plan covers printed pages 123-124: {len(all_entries)} entries in "
    f"{len(sections)} letter sections. It carries no document title by design "
    "— only tranche 1 does — so this file validates through merge-plans "
    "rather than standalone.",

    "THE INDEX IS PAGES 123-124, NOT 123-126. Earlier NEXT sections in the "
    "session log said 123-126, which was wrong and was corrected by measuring: "
    "page 125 is “Your Rights as a Taxpayer” and page 126 is “Where Do You "
    "File?”. **Those two pages still need authoring** and are not covered "
    "here.",

    "MECHANICAL, NOT TRANSCRIBED, and gated by six assertions: every section "
    "head is a single letter with entries; every entry has a label and a "
    "value; **the letter sections run in alphabetical order across the whole "
    "index**; every page number cited is between 1 and 126; every entry starts "
    "with its own section's letter; and the totals clear 200 entries in 20 "
    "sections. The alphabetical-order check plays the role the "
    "strictly-increasing topic numbers played in tranche 58 — it is what "
    "catches a column read out of order.",

    "SUB-ENTRY LABELS ARE SET IN THE **VALUE** FACE, NOT THE ENTRY FACE. Only "
    "top-level labels use g_d0_f4; a sub-entry's words are g_d0_f1, the same "
    "face as its page numbers, so splitting a band by face alone produces "
    "“Standard deduction35” with the label swallowed into the value. A "
    "sub-entry band is therefore split at the first purely numeric item "
    "instead. The parent's colon is g_d0_f1 too, so “Education:” arrives as "
    "label “Education” plus value “:”. Found because the scale assertion "
    "reported 180 entries against 196 label-bearing bands.",

    "AN INDENTED LINE IS AMBIGUOUS AND NEEDS TWO SIGNALS. It is either a "
    "sub-entry or the tail of a label too long for one line, and x cannot tell "
    "them apart. Neither can capitalisation: “Disclosure, Privacy Act, and "
    "Paperwork” wraps to “Reduction Act Notice”. What works is a wrapped "
    "line having RUN OUT OF ROOM (its right edge within 60pt of the column "
    "edge) **and** being followed by exactly ONE indented line. “Individual "
    "retirement arrangements (IRAs)” also reaches the column edge but has "
    "four children, so the child count is what separates it from a wrap.",

    "A PARENT NEED NOT BE CHILDLESS OR COLON-TERMINATED. “Dependents” "
    "carries its own pages (16, 17) AND parents “Standard deduction”, so it "
    "appears both as its own entry and as the stem of a sub-entry. Sub-entry "
    "labels wrap as well (“Penalty:” / “Others (including late filing and "
    "late” / “payment)  86”), which the every-entry-has-a-value assertion "
    "caught. **Sub-entries are folded as “Parent: Sub”** so every row stands "
    "on its own — a bare “Credits | 61, 115” tells a reader nothing — and "
    "the colon is normalised, since some parents print one and some do not.",

    "PAGE NUMBERS AND CROSS-REFERENCES ARE REJOINED WITHOUT INVENTED SPACING. "
    "The separators arrive as their own items, so a space is inserted only "
    "between two WORD characters: “92” + “,” + “112” stays “92,112” and is "
    "re-spaced to “92, 112”, ranges come out as “63-65”, and “(” + “See” + "
    "“Tax help)” becomes “(See Tax help)” rather than the “(SeeTax help)” "
    "the first version produced. Italic “See”/“See also” references are kept "
    "in the Pages column as printed, and a bare “(See also …)” on its own "
    "line is appended to the entry above rather than becoming an entry.",

    "PAGE FURNITURE OMITTED: both printed page numbers and the running title. "
    "One short paragraph is ADDED under the heading to say that entries cite "
    "printed page numbers and that sub-entries are written with their parent; "
    "that is disclosure of this tranche's own transformation, and it is the "
    "only added wording.",
]

with open(TRANCHE_1, encoding="utf-8") as handle:
    tranche_1 = json.load(handle)

plan = {
    "schema_version": tranche_1["schema_version"],
    "document": tranche_1["document"],  # identical header: merge-plans requires it
    "blocks": blocks,
    "review_notes": review_notes,
}

with open(OUT, "w", encoding="utf-8") as handle:
    json.dump(plan, handle, ensure_ascii=False, indent=1)
    handle.write("\n")

print(f"wrote {OUT}: {len(blocks)} blocks, {len(all_entries)} entries, "
      f"{len(sections)} sections, {len(review_notes)} review notes")
