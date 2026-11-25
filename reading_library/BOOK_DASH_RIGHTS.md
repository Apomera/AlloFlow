# Book Dash catalog rights

All Book Dash books are published under the Creative Commons Attribution 4.0
International license. Book Dash also publishes source files so readers and
educators can print, translate, adapt, and redistribute the books with
attribution.

AlloFlow imports the full public WordPress catalog as discovery records. Each
record retains its official cover, language, Book Dash themes, writer,
illustrator, designer, editor, original book URL, and source-file URL whenever
those fields are present. The illustrated PDF itself is not flattened into an
OCR-only local copy; readers open the complete designed edition at Book Dash.

- Catalog: https://bookdash.org/books/
- Source files: https://bookdash.org/book-source-files/
- Book Dash reuse guidance: https://bookdash.org/about/what-we-do/our-books/
- License: https://creativecommons.org/licenses/by/4.0/

The importer fails closed if an edition page no longer exposes both its creator
credits and source-file link.

## Automated access (checked 2026-11-23)

`bookdash.org/robots.txt` disallows automated access to `/book-source-files/`
and to every `?view-file=`, `?download=` and `?download-folder=` link. Its CDN
also answers scripted file downloads with HTTP 403. The importer therefore
reads only the public WordPress API (`/wp-json/wp/v2/books`) and each
edition's own book page. It records the source-file link for people to follow
but never fetches it, and `assertCrawlAllowed` fails closed on a disallowed
URL. Earlier versions listed work keys from the `/book-source-files/` index;
that step was removed.

The license allows hosting the complete books. Getting their text into AlloFlow
needs either Book Dash's agreement to bulk access, or text taken from the page
images that the public book pages show.
