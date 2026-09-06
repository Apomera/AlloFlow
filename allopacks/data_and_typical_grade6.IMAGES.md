# What Counts as Typical — image shot list (text-free policy)

Companion to `data_and_typical_grade6.allopack.json`. The pack ships text-only and renders fully without images. Illustrations, when generated (in-app or by a later ChatGPT/Codex pass following the Water Cycle illustrated pilot), go into a separate `allopacks/illustrated/` edition with WebP assets and a `manifest.json` under `allopacks/media/data_and_typical_grade6/`.

Policy: **no raster text, labels, numbers, captions or watermarks in the artwork.** Labels and captions live in AlloFlow's native fields. Alt text describes the final artwork and is reviewed against it before shipping. Style: clean, restrained, data-visual; flat colour, generous white space, no clip-art.

## The problem this pack has, which is the same problem the pack is about

**A statistics pack wants to draw numbered axes, and the text-free policy forbids every numeral.** This is the same constraint that shaped the grade 3 maths shot list, and it resolves the same way: the artwork carries **shape**, and the numbers live in AlloFlow's native labels anchored over the image.

Here it is not merely a workaround, it is the argument. The reading's whole claim is that a single reported number hides the shape of a distribution. A picture that shows the shape and leaves the numbers to the caption is doing precisely what the lesson asks a reader to do.

So: dot plots, not tables. Clusters and gaps, not values. A viewer should be able to see *tightly packed* or *scattered* or *one thing miles away from the rest* without a single character on the page.

## The mistakes this topic invites

1. **No truncated axes, and no axis marks at all.** A baseline is a plain horizontal rule with no ticks. The FAQ explicitly warns that starting an axis away from zero can turn a small change into a cliff, so a panel that does it accidentally teaches the opposite of its own pack.
2. **Dots must be countable.** Every dot plot below specifies an exact count. A generated smear of indeterminate dots makes the centre unfindable, which is the one thing these panels exist to show.
3. **The outlier must be genuinely far.** A generator will place it "a bit to the right" because that composes better. It has to sit far enough out that a viewer's eye objects, or panel 1 has no content.
4. **No thermometer-style infographics, no stock pie charts, no arrows sweeping upward.** Those are the visual language of the misleading statistic, not of reading one honestly.

## Glossary pictures (square, 480 px, one per term)

| slot | term | generator prompt (flat, clean, no text or numerals) | must show / must avoid |
|---|---|---|---|
| dg-term-data | Data | Fourteen small identical dots scattered without pattern on a plain ground | unordered on purpose; no baseline yet |
| dg-term-statistical | Statistical | A single question mark above fourteen dots spread along a horizontal rule | the spread is the point; the mark is a shape, not a character |
| dg-term-mean | Mean | A plank balanced on a triangular pivot with equal weights along it | pivot clearly off-centre toward the heavier side |
| dg-term-median | Median | Nine dots in a single ordered row, the fifth one filled and larger | count must read as nine at a glance |
| dg-term-mode | Mode | A dot plot where one column stands three dots tall and the others one or two | tallest column unmistakable |
| dg-term-range | Range | Two vertical end-marks on a baseline with dots between them | end-marks plain, no arrowheads, no ticks |
| dg-term-outlier | Outlier | Eight dots clustered at the left of a long baseline and one dot far to the right | the gap must dominate the composition |
| dg-term-spread | Spread | Two stacked baselines, one with dots tightly grouped, one with the same count scattered wide | identical dot counts on both lines |
| dg-term-centre | Centre | A cluster of dots with one small vertical mark through its middle | mark is thin and neutral, not a pointer |
| dg-term-sample | Sample | A large loose crowd of small dots with a circle drawn around a handful | circled subset clearly smaller than the whole |
| dg-term-typical | Typical | A dense cluster of dots with a soft shaded band over its middle | band covers the bulk, not the extremes |

`dg-term-spread` is the card that has to be exactly right: **identical dot counts on both baselines.** If one line has more dots, it illustrates sample size rather than spread, which is a different idea and a confusing one to meet first.

## Lesson panels (900 px wide; each carries native labels and a caption)

**Group A — What one number hides (after the reading)**

1. `dg-img-outlier` — *The number larger than almost everything it summarises.* One long horizontal baseline. Four dots clustered close together near the left. One dot far to the right, near the end of the line. Below the baseline, two small tick-free markers: a thin one under the cluster and a thicker one out in the empty space between the cluster and the far dot. The native labels name those as median and mean. The point lands the moment a viewer sees the mean marker sitting where **no dot is**. This is the pack's anchor image, and its acceptance test is that the mean marker must fall in visibly empty space.
2. `dg-img-same-centre` — *Same centre, nothing else in common.* Two baselines stacked with identical spacing and length. Top: four dots packed tightly around the middle. Bottom: four dots, two far left and two far right, with the middle empty. A single thin vertical line runs down through both, passing through the centre of each. Same centre, opposite pictures. Both rows must have exactly four dots.

**Group B — The kind of question (beside the sort)**

3. `dg-img-two-questions` — *One answer or a pile of them.* One frame, two halves separated by a soft gap. Left: a single dot on a baseline. Right: twenty-six dots spread along an identical baseline. Nothing else. The visual difference between "one measurement" and "expect variation" needs no words at all, and this panel is the sort activity's whole rule.

**Group C — Ordering and finding the middle (beside the maths)**

4. `dg-img-order-first` — *Put them in order before anything else.* Two rows of the same nine dots, drawn at different sizes to stand for different values. The top row is jumbled; the bottom row is the same nine sorted smallest to largest, with the fifth one filled in. Sizes must correspond exactly between the rows so a viewer can check the sort by eye.
5. `dg-img-even-count` — *Two middles.* A single row of four ordered dots of increasing size, with the second and third both filled and a small mark sitting in the gap between them. The mark belongs *between* the two dots and not on either one, which is the whole idea of averaging the two middles.

**Group D — Reading a claim critically (after the FAQ)**

6. `dg-img-axis-trick` — *The same data, twice.* Two small column charts side by side with identical column heights relative to each other, drawn from the same figures. The left chart's baseline sits at the bottom of the frame; the right chart's frame is cropped so it begins partway up, making the same differences look dramatic. No numbers anywhere. This is the one panel where a misleading picture is drawn deliberately, and the native caption must make clear which side is the honest one, because a viewer meeting the right-hand chart alone would be fooled exactly as intended.

## Alt text rules for this pack

Alt text describes **shape and position**, since that is the content: "four dots clustered near the left of a long baseline and a fifth dot far out to the right." It states counts, because a reader who cannot see the panel must be able to reason about the same set. It does not state the mean or median — the reader works those out, as the seeing student does. For `dg-img-outlier` the alt text must say that the mean marker sits in empty space with no dot near it, because that fact is the panel. For `dg-img-axis-trick` the alt text must state plainly that both charts show the same data and that the right-hand one begins partway up, since a reader who cannot compare them visually would otherwise be misled by the description itself.
