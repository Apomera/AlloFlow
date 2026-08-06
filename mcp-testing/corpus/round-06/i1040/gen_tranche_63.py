#!/usr/bin/env python3
"""Author tranche 63 of the i1040 rebuild: printed page 126 — Where Do You
File?, the mailing-address table. THE LAST PAGE.

Usage: python gen_tranche_63.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-63-pages-126-126.json")

PAGE = 126
MARKER = re.compile(r"(«[^»]*»|‹[^›]*›|\[\[[^\]]*\]\])")

blocks = []

# (states, refund-or-no-payment address, payment-enclosed address). Read from
# the page geometry by x-cluster: the three address columns sit at x=46, 288
# and 436, and each row's lines were joined within its own column. Getting a
# row's two addresses the wrong way round would misdirect a tax return, so the
# split is by column position and never by reading order.
ROWS = [
    ("Alabama, Florida, Georgia, Louisiana, Mississippi, North Carolina, "
     "South Carolina, Tennessee, Texas",
     "Department of the Treasury, Internal Revenue Service, Austin, TX 73301-0002",
     "Internal Revenue Service, P.O. Box 1214, Charlotte, NC 28201-1214"),
    ("Alaska, California, Colorado, Hawaii, Idaho, Kansas, Michigan, Montana, "
     "Nebraska, Nevada, North Dakota, Ohio, Oregon, South Dakota, Utah, "
     "Washington, Wyoming",
     "Department of the Treasury, Internal Revenue Service, Ogden, UT 84201-0002",
     "Internal Revenue Service, P.O. Box 931000, Louisville, KY 40293-1000"),
    ("Arizona, Arkansas, New Mexico, Oklahoma",
     "Department of the Treasury, Internal Revenue Service, Austin, TX 73301-0002",
     "Internal Revenue Service, P.O. Box 931000, Louisville, KY 40293-1000"),
    ("Connecticut, Delaware, District of Columbia, Illinois, Indiana, Iowa, "
     "Kentucky, Maine, Maryland, Massachusetts, Minnesota, Missouri, "
     "New Hampshire, New Jersey, New York, Pennsylvania, Rhode Island, "
     "Vermont, Virginia, West Virginia, Wisconsin",
     "Department of the Treasury, Internal Revenue Service, "
     "Kansas City, MO 64999-0002",
     "Internal Revenue Service, P.O. Box 931000, Louisville, KY 40293-1000"),
    ("A foreign country, U.S. territory*, or use an APO or FPO address, or "
     "file Form 2555 or 4563, or are a dual-status alien",
     "Department of the Treasury, Internal Revenue Service, Austin, TX 73301-0215",
     "Internal Revenue Service, P.O. Box 1303, Charlotte, NC 28201-1303"),
]

# Every address must name a city, a state, and a ZIP. A row whose columns were
# crossed, or whose lines were joined across rows, would fail this.
ZIP_RE = re.compile(r"\b[A-Z]{2} \d{5}-\d{4}$")
for states, refund, payment in ROWS:
    assert states and refund and payment, "incomplete row"
    for address in (refund, payment):
        assert ZIP_RE.search(address), f"address has no trailing ZIP: {address!r}"
    assert refund != payment, f"both addresses identical for {states[:30]!r}"
assert len({r[0] for r in ROWS}) == len(ROWS), "duplicate state list"


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


def heading(text, level):
    blocks.append({"type": "heading", "level": level, "text": text, "source_page": PAGE})


def para(text):
    plain, runs = rich(text)
    block = {"type": "paragraph", "text": plain, "source_page": PAGE}
    if runs:
        block["runs"] = runs
    blocks.append(block)


def callout(label, body):
    plain, runs = rich(body)
    text = f"{label} {plain}"
    if runs:
        runs = [{"text": label, "style": "strong"}, {"text": " ", "style": "normal"}] + runs
    else:
        runs = [{"text": label, "style": "strong"}, {"text": " " + plain, "style": "normal"}]
    assert "".join(run["text"] for run in runs) == text
    blocks.append({"type": "paragraph", "text": text, "runs": runs, "source_page": PAGE})


heading("Where Do You File?", 2)
para(
    "Mail your return to the address shown below that applies to you. If you "
    "want to use a private delivery service, see «Private Delivery Services» "
    "under «Filing Requirements», earlier."
)
callout(
    "Tip.",
    "Envelopes without enough postage will be returned to you by the post "
    "office. Your envelope may need additional postage if it contains more "
    "than five pages or is oversized (for example, it is over 1/4″ thick). "
    "Also include your complete return address.",
)
# "can't" is a STRAIGHT apostrophe here and is the only apostrophe on the page.
callout(
    "Caution.",
    "Only the U.S. Postal Service can deliver to P.O. boxes. You can't use a "
    "private delivery service to make tax payments required to be sent to a "
    "P.O. box.",
)

blocks.append({
    "type": "table",
    "caption": (
        "Where to mail your return. Find the row for where you live, then use "
        "the address in the second column if you are requesting a refund or "
        "are not enclosing a check or money order, or the address in the third "
        "column if you are enclosing a check or money order. The printed table "
        "sets “THEN use this address if you:” as a head spanning both address "
        "columns; it is folded into each column name here because the plan's "
        "table has one header row. Each address is written on one line with "
        "commas where the form breaks lines."
    ),
    "columns": [
        "IF you live in...",
        "THEN use this address if you: Are requesting a refund or are not "
        "enclosing a check or money order...",
        "THEN use this address if you: Are enclosing a check or money order...",
    ],
    "rows": [list(r) for r in ROWS],
    "row_headers": True,
    "source_page": PAGE,
})
para(
    "* If you live in American Samoa, Puerto Rico, Guam, the U.S. Virgin "
    "Islands, or the Northern Mariana Islands, see Pub. 570."
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 63 OF A MULTI-SESSION REBUILD, AND THE LAST PAGE. This plan "
    "covers printed page 126, Where Do You File?. It carries no document title "
    "by design — only tranche 1 does — so this file validates through "
    "merge-plans rather than standalone. Nothing is carried in or out. **With "
    "this tranche the rebuild covers all 126 printed pages.**",

    "THE ADDRESSES WERE SPLIT BY COLUMN POSITION, NEVER BY READING ORDER. The "
    "three columns sit at x=46, 288, and 436, and each row's lines were joined "
    "within their own column. **Getting a row's two addresses the wrong way "
    "round would misdirect a tax return** — the second column is for a refund "
    "or no payment and the third is for an enclosed check — and no downstream "
    "check could catch it, because every token would be present and only the "
    "pairing wrong. Same hazard as the two pie charts in tranche 60.",

    "FOUR ASSERTIONS GUARD THE TABLE: every row is complete; **every address "
    "ends in a “ST 12345-6789” city/state/ZIP**, which a row whose columns "
    "were crossed or whose lines were joined across rows would fail; the two "
    "addresses in a row are never identical; and no state list repeats. Note "
    "the limit, as in tranche 60: swapping the two ADDRESSES within one row "
    "would still satisfy all four, so the column split was done by x and not "
    "left to the arithmetic.",

    "THE SPANNING HEADER IS FOLDED INTO BOTH COLUMN NAMES. The printed table "
    "sets “THEN use this address if you:” across both address columns, above "
    "“Are requesting a refund or are not enclosing a check or money order…” "
    "and “Are enclosing a check or money order…”. The plan's table has one "
    "header row, so the spanning text is repeated in each name rather than "
    "dropped — without it, a reader of the flat table has two address columns "
    "and no statement of which to use. Same handling as the burden table in "
    "tranche 59.",

    "EACH ADDRESS IS ONE LINE WITH COMMAS where the form breaks lines: "
    "“Department of the Treasury, Internal Revenue Service, Austin, TX "
    "73301-0002”. The commas are the rebuild's own, added because a postal "
    "address run together without them (“Department of the TreasuryInternal "
    "Revenue ServiceAustin, TX 73301-0002”) is unreadable and because the "
    "table cell cannot carry the line breaks the form uses. This is disclosed "
    "in the caption.",

    "“can't” IS A STRAIGHT APOSTROPHE and is the ONLY apostrophe on the page; "
    "reproduced as printed. The fraction in the TIP is written “1/4″ thick” — "
    "the source sets the 1 and 4 as superscript and subscript around a solidus "
    "and follows them with a double-prime inch mark, and there is no way to "
    "carry that typography in the plan, so the ordinary form is used. PAGE "
    "FURNITURE OMITTED: the printed page number. THE PAGE CARRIES NO LINK "
    "ANNOTATIONS, checked rather than assumed.",
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

print(f"wrote {OUT}: {len(blocks)} blocks, page {PAGE}, {len(ROWS)} address rows, "
      f"{len(review_notes)} review notes")
