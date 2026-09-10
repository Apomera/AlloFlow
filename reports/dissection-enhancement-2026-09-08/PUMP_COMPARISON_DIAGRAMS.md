# Visual circulatory-pump comparisons — September 9, 2026

The circulatory-pump comparison now includes a labeled SVG diagram on each of its five specimen cards, alongside the complete existing function description.

## Visuals

- Frog: two atria and one ventricle, with internal flow-directing structures explicitly omitted.
- Fetal pig: two atria and two ventricles; the caption explicitly says fetal shunts and placental circulation are not drawn.
- Perch: one atrium and one ventricle as the main pumping chambers, with associated inflow/outflow regions omitted.
- Crayfish: a labeled outward-flow route from the heart through arteries into tissue spaces. Gills and the return route are explicitly omitted.
- Earthworm: five paired vessel symbols representing five pairs of contractile aortic arches. The drawing is a count guide, not a body-position or connection map.

The visual key states that shapes are schematic, not body positions or scale, and colors distinguish structures rather than oxygen levels. Every SVG has a complete accessible description, and visible captions state the limits. These static graphics do not require animation or canvas. Other comparison groups retain their existing reference cards.

The comparison panel is now explicitly hidden during quizzes and practicals even if a stale compare-mode flag remains. Viewing the diagrams does not mark a structure inspected or write evidence.

## References checked

- [OpenStax: overview of circulation](https://openstax.org/books/biology/pages/40-1-overview-of-the-circulatory-system): vertebrate chamber arrangements and general circulation.
- [Merck Veterinary Manual: cardiac shunts](https://www.merckvetmanual.com/circulatory-system/congenital-and-inherited-anomalies-of-the-cardiovascular-system/cardiac-shunts-in-animals): fetal shunts and why a chamber-count sketch is not a fetal circulation map.
- [Lander University: Lumbricus dissection](https://lanwebs.lander.edu/faculty/rsfox/invertebrates/lumbricus.html): five pairs of contractile segmental vessels.
- [Clarendon College: crayfish lab (PDF)](https://programs.clarendoncollege.edu/programs/NatSci/Biology/Zoology/zoo%20online%20outlines/Crayfish_Lab.pdf): arteries empty into tissue sinuses.

These sources are also available in an expandable section within the comparison panel. Diagrams are authored from the stated concepts; no source artwork is copied.

## Verification

- Focused suite: **135 passed**.
- Browser suite: **10 passed** without retries, including all existing reference-workbench scenarios and the new 320-pixel diagram checks.
- Final enlarged typography: **2 additional comparison scenarios passed**; desktop and phone screenshots were regenerated.
- Zero scoped automated WCAG A/AA axe violations. SVG text stayed within its viewBox at 320 pixels; the panel had no horizontal overflow.
- Visually inspected the complete desktop comparison and narrow-phone fetal-pig and earthworm cards.
- Syntax, scoped whitespace, and canonical/desktop bundle parity checks passed.
- Diagram labels and captions are English; full translations and physical-device testing remain follow-up work.

## Artifacts

- [Focused checks](pump-diagrams-focused.log)
- [Browser checks](pump-diagrams-browser.log)
- [Desktop comparison](comparison-desktop.png)
- [Phone comparison](comparison-mobile.png)
- [Fetal-pig card at 320px](pump-diagram-pig-320.png)
- [Earthworm card at 320px](pump-diagram-earthworm-320.png)
