# Project Gutenberg: rights and import policy

Last checked: 2026-11-23

## Rights

Project Gutenberg marks these works "Public domain in the USA." The importer
keeps only records whose catalog entry says exactly that. It strips the
Project Gutenberg header, footer and license text from the body, so the
Project Gutenberg trademark terms do not apply to the copy in AlloFlow. Every
book still names Project Gutenberg as the source and links to its ebook page
and license page.

Public domain in the US does not mean public domain everywhere. Countries
with "life plus 70 years" terms protect a work until 70 full years after its
last author or translator died. When any creator or translator in the catalog
record has no death year, or died fewer than 71 years ago, the importer adds a
`rightsNotice` to the book and to its first page, telling readers outside the
US to check local rules.

## Automated access

`gutenberg.org/policy/robot_access.html` says the website is for human users
only, and that automated access can lead to an IP block. Its allowed routes
for scripts are a private mirror, the `/robot/harvest` endpoint (with a pause
between requests) and the public-domain offline catalog.

`import_gutenberg_full_texts.js` therefore fetches only from the PGLAF mirror
(`https://gutenberg.pglaf.org`):

- the catalog record: `cache/epub/<id>/pg<id>.rdf`
- the UTF-8 plain text: `cache/epub/<id>/pg<id>.txt`, falling back to the
  posted `<id>-0.txt` file

`assertAllowedFetch` refuses any other host, and a refusal stops the run. The
importer makes one request at a time, with a one-second pause after each.
Covers and page images load in the reader's browser from gutenberg.org, the
same way a person viewing the site would load them.

Earlier versions read metadata from Gutendex (a third-party API) and text
from www.gutenberg.org directly. `add_gutenberg_page_images.js` and
`add_gutenberg_covers.js` still do, and should move to the mirror before they
are run again.

## Promoting catalog cards

`node reading_library/import_gutenberg_full_texts.js --from-cards` turns every
remaining Gutenberg catalog card into a full in-app text. Promoted books carry
`indexTier: 'lazy'`, so `mirror_books.js` keeps them in `index_cards.json`.
They therefore appear on the same shelves as before, and the core index does
not grow.

After an import, run:

1. `node reading_library/assign_levels.js` (measures English reading levels)
2. `node reading_library/mirror_books.js --fetch` (rebuilds both indexes)
3. copy the indexes and changed book files to `desktop/web-app/public/reading_library/`
