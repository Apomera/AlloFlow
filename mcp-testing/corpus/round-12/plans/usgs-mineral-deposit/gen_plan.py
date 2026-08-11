#!/usr/bin/env python3
"""Round-12 plan generator: USGS GIP-17, "The Life Cycle of a Mineral
Deposit - A Teacher's Guide for Hands-On Mineral Education Activities".

The corpus file is named usgs-water-cycle.pdf; that name is a MISNOMER (the
manifest URL's "gip" path and the word "cycle" evidently suggested the USGS
water-cycle poster). The document itself is the 40-page mineral-deposit
teacher's guide, and everything below was authored from a full read of all
40 rendered pages plus the extracted per-page text layer.

This is the corpus's first alt-text-at-volume exercise: 17 image blocks, all
content-bearing, each with alt text written from looking at the actual image.
Two figures carry text that exists NOWHERE in the PDF text layer (the
Activity 6 tin-man element labels and the Activity 7 cosmetic-word labels),
so their alt text is the only accessible carrier of that content.

Like every corpus generator, this script ASSERTS ITS WAY TO A PLAN: it
refuses to write output unless its own gates pass.

Usage: python gen_plan.py [out.json]
"""
import hashlib
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "usgs-mineral-deposit.plan.json")
SOURCE_SHA256 = "d0a3b06606378733a2ec96cfa01e3b12c111d13059d070e3e039b751347a4529"

B = []


def h(page, level, text):
    B.append({"type": "heading", "level": level, "text": text, "source_page": page})


def p(page, text, runs=None):
    block = {"type": "paragraph", "text": text, "source_page": page}
    if runs:
        block["runs"] = runs
    B.append(block)


def bq(page, text):
    B.append({"type": "blockquote", "text": text, "source_page": page})


def ul(page, items, ordered=False):
    B.append({"type": "list", "ordered": ordered, "items": items, "source_page": page})


def img(page, path, alt, caption=None):
    block = {"type": "image", "alt": alt, "decorative": False,
             "path": "assets/" + path, "source_page": page}
    if caption:
        block["caption"] = caption
    B.append(block)


def tbl(page, caption, columns, rows, row_headers=True):
    B.append({"type": "table", "caption": caption, "columns": columns,
              "rows": rows, "row_headers": row_headers, "source_page": page})


def mk_runs(text, marks):
    """Build a runs overlay: marks = [(substring, style, href-or-None), ...]
    applied left-to-right; everything between marks is a normal run. Asserts
    every mark is found so a typo cannot silently drop styling."""
    style_names = {"bold": "strong", "italic": "emphasis",
                   "normal": "normal"}
    runs = []
    pos = 0
    for mark in marks:
        sub, style = mark[0], style_names[mark[1]]
        href = mark[2] if len(mark) > 2 else None
        at = text.index(sub, pos)  # raises ValueError on a bad mark
        if at > pos:
            runs.append({"text": text[pos:at], "style": "normal"})
        run = {"text": sub, "style": style}
        if href:
            run["href"] = href
        runs.append(run)
        pos = at + len(sub)
    if pos < len(text):
        runs.append({"text": text[pos:], "style": "normal"})
    assert "".join(r["text"] for r in runs) == text
    return runs


TITLE = ("The Life Cycle of a Mineral Deposit—A Teacher’s Guide for "
         "Hands-On Mineral Education Activities")

# ---------------------------------------------------------------- page 1 (cover)
h(1, 1, TITLE)
img(1, "cover-thin-section.jpg",
    "A thin slice of an igneous rock viewed under a polarizing microscope, "
    "filling the whole cover. Interlocking mineral grains appear in vivid "
    "polarization colors: large purple-red and orange-brown crystals, a "
    "bright blue grain along the right edge, and smaller tan, gray, and "
    "black grains, many crossed by fine fracture lines. The imprint page "
    "notes this rock is from South Africa, contains economically important "
    "deposits of Platinum Group Elements (PGE), and that similar rock types "
    "are used as decorative facing for buildings and countertops. The USGS "
    "logo and the report title are overprinted on the photograph.")
p(1, "General Information Product 17")
p(1, "U.S. Department of the Interior")
p(1, "U.S. Geological Survey")

# ---------------------------------------------------------------- page 2 (title)
p(2, TITLE, runs=mk_runs(TITLE, [(TITLE, "bold")]))
p(2, "By Dave Frank, John Galloway, and Ken Assmus")
p(2, "General Information Product 17")
p(2, "U.S. Department of the Interior")
p(2, "U.S. Geological Survey")

# ---------------------------------------------------------------- page 3 (imprint)
p(3, "U.S. Department of the Interior", runs=mk_runs(
    "U.S. Department of the Interior", [("U.S. Department of the Interior", "bold")]))
p(3, "Gale A. Norton, Secretary")
p(3, "U.S. Geological Survey", runs=mk_runs(
    "U.S. Geological Survey", [("U.S. Geological Survey", "bold")]))
p(3, "P. Patrick Leahy , Acting Director")
p(3, "U.S. Geological Survey, Reston, Virginia: 2005")
p(3, "For sale by U.S. Geological Survey Information Services Box 25286, "
     "Denver Federal Center Denver, CO 80225")
_t = ("This report and any updates to it are available online at: "
      "http://pubs.usgs.gov/gip/2005/17/")
p(3, _t, runs=mk_runs(_t, [("http://pubs.usgs.gov/gip/2005/17/", "normal",
                            "http://pubs.usgs.gov/gip/2005/17/")]))
p(3, "For additional information write to: U.S. Geological Survey Box 25046, "
     "Mail Stop 421, Denver Federal Center Denver, CO 80225-0046")
_t = ("Additional USGS publications can be found at: "
      "http://geology.usgs.gov/products.html")
p(3, _t, runs=mk_runs(_t, [("http://geology.usgs.gov/products.html", "normal",
                            "http://geology.usgs.gov/products.html")]))
_t = ("For more information about the USGS and its products: Telephone: "
      "1–888–ASK–USGS (1–888–275–8747) "
      "World Wide Web: http://www.usgs.gov/")
p(3, _t, runs=mk_runs(_t, [("http://www.usgs.gov/", "normal", "http://www.usgs.gov/")]))
p(3, "Any use of trade, product, or firm names in this publication is for "
     "descriptive purposes only and does not imply endorsement of the U.S. "
     "Government.")
p(3, "Although this report is in the public domain, it contains copyrighted "
     "materials that are noted in the text. Permission to reproduce those "
     "items must be secured from the individual copyright owners.")
_t = ("Cataloging-in-publication data are on file with the Library of "
      "Congress (URL http://www.loc.gov/).")
p(3, _t, runs=mk_runs(_t, [(_t, "bold")]))
p(3, "Produced in the Western Region, Menlo Park, California")
p(3, "Manuscript approved for publication, Text edited by James W. Hendley II "
     "Layout and design by Judy Weathers and Susan Mayfield")
# "Cover." prints in the same roman face as the note body (independent
# verification 2026-08-10, emphasis-008: an added bold here was the only
# emphasis discrepancy in the first reading).
p(3, "Cover. A thin slice of an igneous rock viewed under a polarizing "
     "microscope. The colors and textures can be used to identify minerals "
     "and the rock type. This rock is from South Africa and contains "
     "economically important deposits of Platinum Group Elements (PGE). "
     "Similar rock types are used as decorative facing for buildings and "
     "also for countertops.")

# ---------------------------------------------------------------- page 4 (contents, iii)
h(4, 2, "Contents")
ul(4, [
    "Preface v",
    "Introduction 1",
    "What is a Mineral Deposit? 1",
    "Where and How Do Mineral Deposits Occur? 1",
    "The Rock Cycle and Plate Tectonics 1",
    "Mineral Deposits 2",
    "Mineral Deposit Models 4",
    "How are Mineral Deposits Found? 4",
    "Geology 4",
    "Geophysics 4",
    "Geochemistry 4",
    "Satellite imagery 4",
    "How Big is the Deposit and How Much is it Worth? 5",
    "Examples of Mining Methods 5",
    "Recovery Methods 6",
    "Reclamation Processes 6",
    "Hands-on Activities 7",
    "Note to Teachers—Safety Issues 7",
    "Activity 1—Orange Peel Plate Tectonics 9",
    "Activity 2—Peanut Butter and Jelly Geology 10",
    "Activity 3—Cupcake Core Sampling 11",
    "Activity 4—Chocolate Chip Cookie Mining 13",
    "Activity 5—Extracting Metal (Copper) From A Rock 14",
    "Activity 6—Minerals in Your Body 15",
    "Activity 7—The Mineral Talc or “Rocks on Your Face” 17",
    "Activity 8—Make Your Own Toothpaste 18",
    "Activity 9—Mineral Flash Cards 19",
    "Activity 10—Personal Mineral Consumption 22",
    "How to Obtain Mineral Specimens 27",
    "Selected References 27",
    "Appendix 1—Glossary 30",
    "Appendix 2—Minerals and Their Uses 32",
])
h(4, 3, "Figures")
ul(4, [
    "1. Cross sections of Earth’s crust and mantle, showing the (A) "
    "plate tectonic cycle and (B) rock cycle 2",
    "2. Gold nuggets from Lucky Gulch, Valdez Creek district, Cook Inlet "
    "region, Alaska, 1910 5",
    "3. Wooley Valley Mine, Idaho, which operated from 1955 to 1989 6",
    "4. Template for drawing cupcake core-drilling cross section 12",
    "5. Examples of flash cards for use in Activity 9 20",
])

# ---------------------------------------------------------------- page 5 (contents, iv)
ul(5, [
    "6. Every American born will need. 22",
    "7. Worksheet 1 Activity 10—personal mineral consumption 24",
    "8. Worksheet 2 Activity 10—personal mineral consumption 25",
    "9. Examples of completed worksheets for Activity 10 26",
])
h(5, 3, "Tables")
ul(5, [
    "1. Abundances of the elements in the Earth’s crust 3",
    "2. Average abundance of geochemically scarce metals from ore deposits "
    "in continental crust 4",
    "3. National Science Standards matrix for grades 5 through 8 8",
    "4. The most common elements in the human body 16",
])
h(5, 3, "Appendixes")
ul(5, [
    "Appendix 1—Glossary 30",
    "Appendix 2—Minerals and Their Uses 32",
])

# ---------------------------------------------------------------- page 6 (preface, v)
h(6, 2, "Preface")
p(6, "This teacher’s guide defines what a mineral deposit is and how a "
     "mineral deposit is identified and measured, how the mineral resources "
     "are extracted, and how the mining site is reclaimed; how minerals and "
     "mineral resources are processed; and how we use mineral resources in "
     "our every day lives. Included are 10 activity-based learning exercises "
     "that educate students on basic geologic concepts; the processes of "
     "finding, identifying, and extracting the resources from a mineral "
     "deposit; and the uses of minerals. The guide is intended for grades 5 "
     "through 8 science teachers and students and is designed to meet the "
     "National Science Content Standards as defined by the National Research "
     "Council (1996). Several of these activities can be modified to meet "
     "the National Science Content Standards for grades 9 through 12. To "
     "assist in the understanding of some of the geology and mineral terms, "
     "see the Glossary (appendix 1) and Minerals and Their Uses "
     "(appendix 2).")

# ---------------------------------------------------------------- page 7 (printed 1)
p(7, TITLE, runs=mk_runs(TITLE, [(TITLE, "bold")]))
p(7, "By Dave Frank, John Galloway, and Ken Assmus")
h(7, 2, "Introduction")
p(7, "The process of finding or exploring for a mineral deposit, extracting "
     "or mining the resource, recovering the resource, also known as "
     "beneficiation, and reclaiming the land mined can be described as the "
     "“life cycle” of a mineral deposit. The complete process is "
     "time consuming and expensive, requiring the use of modern technology "
     "and equipment, and may take many years to complete. Sometimes one "
     "entity or company completes the entire process from discovery to "
     "reclamation, but often it requires multiple groups with specialized "
     "experience working together.")
p(7, "Mineral deposits are the source of many important commodities, such as "
     "copper and gold, used by our society, but it is important to realize "
     "that mineral deposits are a nonrenewable resource. Once mined, they "
     "are exhausted, and another source must be found. New mineral deposits "
     "are being continuously created by the Earth but may take millions of "
     "years to form. Mineral deposits differ from renewable resources, such "
     "as agricultural and timber products, which may be replenished within a "
     "few months to several years.")
h(7, 2, "What is a Mineral Deposit?")
p(7, "The technical definition of a mineral is a naturally occurring, "
     "inorganic, homogeneous solid with a definite chemical composition and "
     "an ordered atomic arrangement. In more general terms, a mineral is a "
     "substance that is (1) made of a single element like gold (Au) or a "
     "compound of elements like salt (NaCl) and (or) (2) a building block of "
     "rock (for example, granite is composed primarily of the minerals "
     "quartz and feldspar). Minerals may be metallic, like gold, or "
     "nonmetallic, such as talc. Oil, natural gas, and coal are generally "
     "considered to be “energy minerals” and are not discussed in "
     "this report. Additional mineral resource terms are:")
_defs = [
    ("Aggregate", "1. Aggregate—A rock or mineral material used "
     "separately and as filler in cement, asphalt, plaster, and other "
     "materials."),
    ("Alloy", "2. Alloy—A substance having metallic properties and "
     "composed of two or more chemical elements, of which at least one is a "
     "metal."),
    ("Element", "3. Element—A substance whose atoms have the same "
     "atomic number."),
    ("Metal", "4. Metal—A class of chemical elements, such as iron, "
     "gold, and aluminum, that have a characteristic luster, are good "
     "conductors of heat and electricity, and are opaque, fusible, and "
     "generally malleable and ductile."),
    ("Ore", "5. Ore—The naturally occurring material from which a "
     "mineral or minerals of economic value can be extracted."),
    ("Rock", "6. Rock—A naturally formed material composed of a mineral "
     "or minerals; any hard consolidated material derived from the Earth "
     "(Kesler, 1994; Hudson, Fox, and Plumlee, 1999)."),
]
B.append({"type": "list", "ordered": False,
          "items": [t for (_term, t) in _defs],
          "item_runs": [mk_runs(t, [(term, "italic")]) for (term, t) in _defs],
          "source_page": 7})
p(7, "Minerals occur in a range of concentrations, not all of which have "
     "economic significance:")
ul(7, [
    "A mineral occurrence is a concentration of a mineral (usually "
    "considered in terms of some commodity, such as copper, barite, or "
    "gold) that is considered valuable by someone somewhere or that is of "
    "scientific or technical interest.",
    "A mineral deposit is a mineral occurrence of sufficient size and grade "
    "(concentration) to enable extraction under the most favorable "
    "conditions.",
    "An ore deposit is a mineral deposit that has been tested and is known "
    "to be of sufficient size, grade, and accessibility to be mined at a "
    "profit. Testing commonly consists of surface mapping and sampling, as "
    "well as drilling through the deposit.",
])
h(7, 2, "Where and How Do Mineral Deposits Occur?")
h(7, 3, "The Rock Cycle and Plate Tectonics")
p(7, "Two cycles determine how mineral deposits are formed—the rock "
     "cycle and the tectonic cycle (fig. 1). Heat from the Earth’s "
     "interior melts some of the rocks in the crust (the upper part of the "
     "lithosphere). Molten rocks lower in density than the surrounding "
     "cooler material rise toward the Earth’s surface and eventually "
     "cool and harden near to or on the surface. The composition, "
     "temperature, pressure, and cooling process of the molten material "
     "determine the minerals and rock types formed. These are called "
     "igneous rocks and contain original or primary minerals. When these "
     "rocks are subjected to chemical and physical processes, such as "
     "freezing and thawing, they break apart into smaller fragments forming "
     "sediments. These smaller particles that compose the sediments can be "
     "physically transported and redeposited by gravity, water, and wind. "
     "If the redeposited particles are bound together by compaction or "
     "cementation (formation of new secondary minerals in the spaces "
     "between the loose particles), sedimentary rocks are formed. In "
     "regions where the Earth’s interior temperature and pressure are "
     "high enough to change the chemical composition and mineralogy of "
     "buried igneous or sedimentary rocks, without completely melting them, "
     "metamorphic rocks are formed. Distinct groups or assemblages of "
     "minerals are typically associated with the formation of each of the "
     "three major rock types—igneous, sedimentary, and metamorphic "
     "rocks.")

# ---------------------------------------------------------------- page 8 (printed 2)
p(8, "Plate tectonics (see fig. 1) play a major role in the processes of "
     "mineral and rock formation. In geologic terms, a plate is a large, "
     "“rigid” slab of solid rock. The word tectonics comes from "
     "the Greek root “to build.” The term plate tectonics refers "
     "to the process by which the Earth’s crust is formed and moved. "
     "The theory of plate tectonics states that the Earth’s outermost "
     "layer, the crust, is fragmented into a dozen or more plates of "
     "various sizes that are moving relative to one another as they are "
     "slowly transported on top of and by hotter, more mobile material "
     "(Kious and Tilling, 1996). Scientists now have a fairly good "
     "understanding of how the plates move and how earthquake activity "
     "relates to such movement. Most movement occurs along narrow zones "
     "between plates where the effects of tectonic forces are most "
     "evident.")
p(8, "There are four types of plate boundaries:")
ul(8, [
    "Divergent boundaries—where new crust is generated as the plates "
    "pull away from each other.",
    "Convergent boundaries—where crust is destroyed as one plate dives "
    "under another.",
    "Transform boundaries—where crust is neither produced nor "
    "destroyed as the plates slide horizontally past each other.",
    "Plate boundary zones—broad belts in which boundaries are not well "
    "defined and the effects of plate interaction are unclear (Kious and "
    "Tilling, 1996).",
])
img(8, "fig1a-plate-tectonics.jpg",
    "Panel A: a color cross-section of the Earth’s crust and upper "
    "mantle from open ocean to a continent, with three small block diagrams "
    "above it showing plates sliding past each other, pulling apart, and "
    "colliding over the asthenosphere. Across the main section, labeled "
    "features are: a convergent plate boundary at an island arc with a "
    "trench and strato-volcano; a transform plate boundary; a divergent "
    "plate boundary at an oceanic spreading ridge; a shield volcano over a "
    "hot spot; a second convergent plate boundary where an oceanic plate "
    "subducts beneath the continent at a trench (labeled subducting plate); "
    "and a continental rift zone (a young divergent plate boundary) inside "
    "the continent. The rigid lithosphere, including oceanic crust and "
    "continental crust, rides on the plastic asthenosphere, shown in "
    "oranges and yellows below; white arrows show relative plate motion, "
    "and red conduits show magma rising under volcanoes and ridges.",
    caption="Figure 1.—Cross sections of Earth’s crust and mantle, "
            "showing the (A) plate tectonic cycle (Kious, and Tilling, "
            "1996) and (B) rock cycle (Stoffer, 2002).")

# ---------------------------------------------------------------- page 9 (printed 3)
h(9, 3, "Mineral Deposits")
tbl(9, "Table 1. Abundances of the elements in the Earth’s crust "
       "(modified from Nave, 2000).",
    ["Element", "Approximate percent by weight"],
    [["Oxygen", "46.6"], ["Silicon", "27.7"], ["Aluminum", "8.1"],
     ["Iron", "5.0"], ["Calcium", "3.6"], ["Sodium", "2.8"],
     ["Potassium", "2.6"], ["Magnesium", "2.1"], ["All others", "1.5"]])
p(9, "The Earth’s crust contains more than 100 naturally occurring "
     "elements. The crust, which ranges from 6 to 30 miles (10 to 50 km) "
     "thick, can be subdivided into two distinctly different parts—the "
     "oceanic crust and the continental crust—which differ in "
     "composition. Some of the common elements that make up the crust are "
     "in order of abundance oxygen (O), silicon (Si), aluminum (Al), iron "
     "(Fe), calcium (Ca), sodium (Na), potassium (K), and magnesium (Mg) "
     "(table 1). Although the same elements are present in both types of "
     "crusts, their concentrations are slightly different. The first eight "
     "elements listed in table 1 constitute more than 98 percent of all "
     "crustal material. Thus, one can refer to the distribution of elements "
     "in terms of their average crustal abundance. Many useful mineral "
     "commodities in the crust are present in very low abundances (table "
     "2.). The mining industry cannot use most rocks in the Earth’s "
     "crust as sources of metals or other elements because concentrations "
     "are too low to warrant extraction. Instead, the mining geologist "
     "looks for rocks where the desired mineral has been concentrated by "
     "some natural process.")
p(9, "Mineral deposits occur in various tectonic and geologic settings "
     "(fig. 1. and activity 1). Some mineral deposits may be formed in one "
     "place but be transported to another geographic location as a result "
     "of tectonic forces or other geologic processes. Thus, the study of "
     "tectonic processes and regional geology is important in "
     "understanding the distribution of mineral deposits.")
p(9, "Gold, for example, can be concentrated with other minerals in veins "
     "that form in fractures in rocks deep underground (typically, igneous "
     "rocks). Tectonic forces uplift these rocks forming mountain ranges "
     "where weathering and erosion expose the veins at the Earth’s "
     "surface. Because mountain ranges are constantly worn down by erosion "
     "caused by water, ice, and wind, some of the gold veins are eventually "
     "deposited as nuggets (see fig. 2), flakes, or flour-size material in "
     "sediments in streams and rivers. The gold, along with other minerals "
     "like platinum and garnet, is sometimes extracted directly from "
     "gravels (sedimentary rocks) in the streambed. Mineral deposits also "
     "form when preexisting rocks are deeply buried and changed over "
     "geologic time by heat and pressure (metamorphic rocks); for example, "
     "limestone is changed by metamorphism into marble.")
img(9, "fig1b-rock-cycle.jpg",
    "Panel B: a diagram titled “The Rock Cycle” showing five "
    "stations connected by double-headed arrows. At the top, loose "
    "sediments (gravel, sand, silt, mud, clay, soil) form from weathering "
    "and erosion and from mineral dissolution and mineral precipitation "
    "(which also yield vein quartz, vein calcite, chert, and travertine). "
    "Transport and deposition carry material to sediments; compaction and "
    "cementation turn sediments into sedimentary rocks (conglomerate, "
    "sandstone, siltstone, mudstone, graywacke, marl, shale, chert, coal, "
    "salt, gypsum, limestone, dolostone). Heat and pressure (metamorphism) "
    "turn sedimentary rocks into metamorphic rocks (slate, argillite, "
    "gneiss, marble, metasandstone, quartzite, greenstone, greenschist, "
    "blueschist, serpentinite, metachert). Melting produces magma, and "
    "crystallization of magma produces igneous rocks, either by volcanism "
    "(rhyolite, dacite, andesite, basalt) or by plutonism (granite, "
    "granodiorite, diorite, gabbro, pyroxenite, peridotite). Arrows also "
    "connect igneous and metamorphic rocks back to weathering, erosion, "
    "and burial, so every rock type can become any other.",
    caption="Figure 1.—Continued")

# ---------------------------------------------------------------- page 10 (printed 4)
tbl(10, "Table 2. Average abundance of geochemically scarce metals from "
        "ore deposits in continental crust (modified from Skinner, 1976).",
    ["Element", "Average abundance in continental crust, in percent"],
    [["Copper", "0.0058"], ["Gold", "0.0000002"], ["Lead", "0.0010"],
     ["Mercury", "0.0000002"], ["Molybdenum", "0.00012"],
     ["Nickel", "0.0072"], ["Silver", "0.000008"], ["Tin", "0.00015"],
     ["Tungsten", "0.00010"], ["Uranium", "0.00016"]])
h(10, 2, "Mineral Deposit Models")
p(10, "To better understand and predict how and where mineral deposits "
      "might occur, scientists develop mineral deposit models. These "
      "models are based on existing knowledge of regional geology and the "
      "characteristics of known mineral deposits. Similar mineral deposit "
      "types can be grouped together under a particular deposit model. "
      "Mineral deposit models can aid in identifying areas favorable for "
      "finding valuable deposits (Singer, 1995). There are hundreds of "
      "deposit models, and new models are being constructed as new types "
      "of deposits are identified. The U.S. Geological Survey (USGS) has "
      "produced a number of publications describing various mineral "
      "deposit types (Cox and Singer, 1986; Stoeser and Heran, 2000). A "
      "few examples of deposit model types are (1) deposits related to "
      "mafic and ultramafic intrusions in stable environments, (2) "
      "deposits related to marine mafic extrusive rocks, (3) deposits in "
      "clastic sedimentary rocks, (4) deposits related to regionally "
      "metamorphosed rocks, and (5) deposits related to surfical "
      "processes and unconformities.")
h(10, 2, "How Are Mineral Deposits Found?")
p(10, "Finding a mineral deposit is the first step in the mining life "
      "cycle. Technologies used include, but are not limited to, "
      "exploration geology, geophysics, geochemistry, and satellite "
      "imagery.")
h(10, 3, "Geology")
p(10, "Geology is the study of the planet Earth—the materials of "
      "which our planet is made, the processes that act on these "
      "materials, the products formed, and the history of the planet and "
      "its life forms since its origin (Neuendorf and others, 2005, see "
      "activity 2). Geologic investigations include reviews of the "
      "geologic literature, field surveys, and geologic mapping to "
      "determine areas favorable for mineral deposits.")
h(10, 3, "Geophysics")
p(10, "Geophysical exploration involves searching for favorable mineral "
      "deposits using the physical properties of rocks, such as magnetic "
      "intensity and electrical conductivity. Geophysical investigations "
      "may include aeromagnetic or gravity surveys, ground-penetrating "
      "radar studies, or the use of seismic waves to show contrasting "
      "rock types. The selected rock units of interest might then be "
      "mapped and sampled to identify areas favorable for mineral "
      "deposits, and adjoining areas may also be investigated for the "
      "presence of mineral deposits.")
h(10, 3, "Geochemistry")
p(10, "Geochemistry is the study of the distribution and amounts of "
      "elements in minerals, ores, rocks, soil, water, and the atmosphere "
      "and the study of the circulation of the elements in nature on the "
      "basis of the properties of their atoms and ions. Geochemical "
      "investigations commonly include soil sampling, stream sediment "
      "sampling, and rock sampling; even plants are also sampled in some "
      "studies. Various techniques are used to examine and measure the "
      "abundance, or concentration, of elements contained in the sample. "
      "The results may be used to define favorable areas for "
      "mineralization.")
h(10, 3, "Satellite Imagery")
p(10, "The use of satellite imagery has become a valuable tool for "
      "exploration geologists. Geologists are now able to perform "
      "large-scale surveys of remote unexplored regions for the presence "
      "of geologic structures and key minerals that may indicate areas "
      "favorable for mineral deposits. Ground-based surveys are "
      "expensive, and one can often experience difficulty in mapping "
      "large-scale structures. However, large geological structures are "
      "often readily visible on satellite imagery. The National "
      "Aeronautics and Space Administration (NASA) presents an excellent "
      "tutorial on the use of remote sensing that can be found at "
      "http://rst.gsfc.nasa.gov/Homepage/Homepage.html (section 5 is "
      "titled Geological Applications II—Minerals and Petroleum "
      "Exploration).")

# ---------------------------------------------------------------- page 11 (printed 5)
h(11, 2, "How Big is the Deposit and How Much is it Worth?")
p(11, "The next step in the mining life-cycle is to identify and measure "
      "the known resources in order to determine if the mineral deposit "
      "has enough value to be mined. Identifying the size and grade of "
      "the deposit is accomplished by collecting drill-core samples of "
      "the ore body (see activity 3). These samples are analyzed for the "
      "concentration of elements of economic value. For a metallic "
      "commodity like gold, analyses are usually reported in ounces of "
      "pure gold (Au) per ton of rock. In other words, for every ton of "
      "rock removed, one can expect to retrieve a predetermined number of "
      "ounces of the desired commodity based on the results of an average "
      "sampling over the entire ore body. This measurement is called "
      "“grade of ore.” Ore grades for metals such as iron, "
      "copper, lead, and zinc are often expressed in weight percent. A "
      "higher grade means more of the commodity per ton of rock.")
p(11, "For a nonmetallic commodity, such as sand and gravel or limestone, "
      "the resource is identified in terms of volume (cubic yards or "
      "meters) or weight (short or metric tons). The quality of ore is "
      "based on the amount and distribution of various grain sizes, from "
      "fine sand to gravel and boulders, or for limestone, the percent of "
      "calcium.")
h(11, 2, "Examples of Mining Methods")
p(11, "Three main types of mining methods used to recover metallic and "
      "nonmetallic minerals are (1) underground mining, (2) surface (open "
      "pit) mining, and (3) placer mining. The location and shape of the "
      "deposit, strength of the rock, ore grade, mining costs, and "
      "current market price of the commodity are some of the determining "
      "factors for selecting which mining method is used.")
p(11, "Higher-grade metallic ores found in veins deep under the "
      "Earth’s surface can be profitably mined using underground "
      "methods, which tend to be more expensive. Large tabular-shaped ore "
      "bodies, having long vertical or horizontal dimensions, or ore "
      "bodies lying more than 1,000 feet (300 m) below the surface are "
      "generally mined using underground methods as well. The underground "
      "mining method is accomplished by drilling and blasting rock, in "
      "order to access and separate ore from the surrounding waste rock. "
      "The blasted material is called muck. The muck is moved to the "
      "surface by truck, belt conveyor, or elevator. Once at the surface, "
      "the material is sent to a mill.")
p(11, "Lower grade metal ores found closer to the surface may be "
      "profitably mined using surface mining methods, which generally "
      "cost less than underground methods. Many industrial minerals are "
      "also mined using surface mining methods, as these ores are usually "
      "low in value and were deposited at or near the Earth’s "
      "surface. Generally in a surface mine, hard rock must be drilled "
      "and blasted, although some minerals, such as diatomite, are soft "
      "enough to mine without blasting. Large mechanical shovels fill "
      "trucks with the broken rock that is then trucked out of the mine "
      "for processing.")
p(11, "Placer mining is used to recover valuable minerals from sediments "
      "in present-day river channels, beach sands, or ancient stream "
      "deposits. More than half of the world’s titanium comes from "
      "placer mining of beach dunes and sands (Kesler, 1994). In placer "
      "operations, the mined material is washed through a trommel to "
      "eliminate the coarse materials and a sluice box to concentrate the "
      "“heavies.” A trommel is a revolving cylindrical sieve "
      "used to size rock, and the bottom of the sluice has ridges (called "
      "riffles) and depressions to trap heavy minerals, such as gold, one "
      "of the heaviest minerals. Platinum and tin can also be recovered "
      "in this manner.")
img(11, "fig2-gold-panning.jpg",
    "A black-and-white photograph from 1910. A metal gold pan holding "
    "several rough nuggets sits propped upright on a cloth-covered box or "
    "table in a mining camp, with canvas tent walls behind it and a large "
    "metal triangle (a camp dinner gong) hanging above the pan.",
    caption="Figure 2. Gold nuggets from Lucky Gulch, Valdez Creek "
            "district, Cook Inlet region, Alaska, 1910. Inset shows a "
            "gold nugget. (USGS photos.)")
img(11, "fig2-nugget-inset.jpg",
    "Inset: a close-up color photograph of a single gold nugget with a "
    "rough, lumpy surface, shown against a black background.")

# ---------------------------------------------------------------- page 12 (printed 6)
img(12, "fig3-wooley-valley.jpg",
    "A color aerial photograph of a phosphate mining area set in "
    "forested mountains. Benched cuts and gray waste-rock slopes step "
    "down a hillside on the left; the surrounding slopes are green with "
    "regrowth and conifer forest, small ponds sit in the valley floor, "
    "and a dirt road winds through the site toward mountains on the "
    "horizon.",
    caption="Figure 3. Wooley Valley Mine, Idaho, which operated from "
            "1955 to 1989 (USGS photograph by Phil Moyle).")
h(12, 2, "Recovery Methods")
p(12, "Regardless of the deposit type and mining process, one must "
      "separate the ore from the waste rock, once it has been removed "
      "from the ground (see activity 4). The mineral commodity can be "
      "separated from the waste rock by using one or more methods, and "
      "the separation is usually done in a mill.")
p(12, "One type of milling or recovery method is called floatation. The "
      "ore is crushed into a very fine powder, and the powder is put into "
      "an agitated, frothy slurry. Minerals may sink to the bottom or "
      "stick to the bubbles and rise to the top, where they are skimmed "
      "off. This process is used to separate the valuable metals from "
      "waste rock, after which the recovered metals are sent on for "
      "further processing. The waste material is either used as backfill "
      "in the mine or sent to a tailings pond, where the water is "
      "removed.")
p(12, "Cyanide heap leaching is one method used to extract low-grade gold "
      "from rock mined using open-pit methods. Again the rock is crushed "
      "and placed on a “leach pile” on a lined pad. A cyanide "
      "solution is sprayed or dripped on top of the pile. As the leach "
      "solution percolates down through the rock, the gold dissolves into "
      "the solution. This “pregnant” solution is then captured, "
      "and the gold is recovered by further processing. After the waste "
      "rock is cleaned, it may be used to backfill in the mine pit, when "
      "the mineral deposit is exhausted.")
h(12, 2, "Reclamation Processes")
p(12, "The reclamation process takes place throughout the mining life "
      "cycle. The process of reclamation includes maintaining water and "
      "air quality and minimizing flooding, erosion, and damage to "
      "wildlife and habitat caused during the mining life cycle. The "
      "final step in the reclamation process is often topsoil replacement "
      "and revegetation with suitable plant species (California Office of "
      "Mine Reclamation, 2004). Habitats must be maintained or restored "
      "to their prior condition once the mining process is completed. If "
      "displaced, native flora and fauna are reintroduced. Water used "
      "during the milling process is collected and reused or cleaned "
      "before being restored to the hydrosphere. Underground mines may be "
      "backfilled or sealed or may be preserved for bat habitat. To take "
      "a trip through a mine see Bat Conservation International (2004). "
      "Open-pit mines are often backfilled or reshaped to become natural "
      "areas or pit lakes suitable for waterfowl and fish (fig. 3). "
      "Tailings ponds may be drained, covered and planted with "
      "vegetation, or turned into wetlands. See activity 4 for an example "
      "of reclamation cost. An overview of how the mining industry "
      "recognizes the potential impacts of mining operations on the "
      "environment can be found in Hudson, Fox, and Plumlee (1999).")

# ---------------------------------------------------------------- page 13 (printed 7)
h(13, 2, "Hands-On Activities")
_t = ("This section contains activity-based teaching guides designed to "
      "educate students about geology, plate tectonics, and mineral "
      "resources and how mineral resources are found, extracted, "
      "processed, and used. The teaching guides are suited for the entire "
      "K-12 grade level range, but some may be best suited for the 5-8 or "
      "9-12 grade levels (table 3). Each activity includes a required "
      "list of materials (most of which can be found in the home), "
      "instructions, discussion questions, and summaries of the "
      "activities¹. The activities are as follows:")
p(13, _t)
_cats = [
    ("Basic Geology—Concepts",
     ["Activity 1—Orange Peel Plate Tectonics",
      "Activity 2—Peanut Butter and Jelly Geology"]),
    ("Exploring for Minerals",
     ["Activity 3—Cupcake Core Sampling"]),
    ("Extracting Minerals",
     ["Activity 4—Chocolate Chip Cookie Mining",
      "Activity 5—Extracting Metal (copper) from a Rock"]),
    ("Uses of Minerals",
     ["Activity 6—Minerals in your Body",
      "Activity 7—The Mineral Talc or “Rocks on Your Face”",
      "Activity 8—Make Your Own Toothpaste",
      "Activity 9—Mineral Flash Cards",
      "Activity 10—Personal Mineral Consumption"]),
    ("Mineral Resources and Economics",
     ["Activity 4—Chocolate Chip Cookie Mining",
      "Activity 9—Mineral Flash Cards",
      "Activity 10—Personal Mineral Consumption"]),
]
for _cat, _acts in _cats:
    p(13, _cat, runs=mk_runs(_cat, [(_cat, "bold")]))
    ul(13, _acts)
p(13, "¹ Many of these activities were modified from Women in Mining "
      "Education Foundation (2004), American Geological Institute (2005), "
      "Schneider (2004), and Stalter (2003).")
h(13, 3, "Note to Teachers—Safety Issues")
p(13, "Foods are commonly used as instructional tools and in many "
      "hands-on activities presented here. A review of food use to "
      "demonstrate Earth-science concepts is presented by Francek and "
      "Winstanley (2004); however, they also note that there are "
      "potential problems associated with using food as an instructional "
      "tool. One of the main safety issues is that some foods, such as "
      "chocolate or peanut butter, could cause a student to have an "
      "allergic reaction. It is important that the instructor inform "
      "students and parents that you will be conducting a class activity "
      "that involves food, so that they can tell you if there are any "
      "health problems that should be addressed. Students with allergies "
      "to certain food groups may participate in the activities through "
      "observation, as long as their allergies are not induced by touch "
      "or smell of the food items used.")
p(13, "Remember, when doing any activity that involves the use of "
      "chemicals, be sure to use the proper Personal Protective Equipment "
      "(PPE), such as gloves, safety glasses, and laboratory coats.")

# ---------------------------------------------------------------- page 14 (printed 8)
# The source's two-row header spans "National Science Content Standards"
# over columns A-G; the caption's final sentence carries that spanner
# (independent verification 2026-08-10, table-003 - dropping it silently
# was a discrepancy). The extension is disclosed in the review notes.
tbl(14, "Table 3. National Science Standards matrix for grades 5 through "
        "8, showing the content standard(s) addressed by each activity; "
        "the complete standards are available from the National Research "
        "Council (1996). Columns A through G are the National Science "
        "Content Standards.",
    ["Name of Activity", "A", "B", "C", "D", "E", "F", "G",
     "Other Content Standards"],
    [["Orange Peel Plate Tectonics", "+", "", "", "+", "*", "*", "", ""],
     ["Peanut Butter and Jelly Geology", "+", "", "", "+", "*", "*", "*", ""],
     ["Cupcake Core Sampling", "+", "", "", "+", "*", "+", "", ""],
     ["Chocolate Chip Cookie Mining", "+", "", "", "+", "*", "", "", "Math"],
     ["Extracting Metal (Copper) from a Rock", "+", "+", "+", "+", "+", "+", "", ""],
     ["Minerals in Your Body", "+", "+", "+", "", "", "+", "",
      "Life Science/English"],
     ["The Mineral Talc or “Rocks on Your Face”", "", "+", "", "", "", "", "", ""],
     ["Making your own Toothpaste", "", "+", "", "", "", "", "", ""],
     ["Mineral Flash Cards", "+", "+", "+", "*", "*", "+", "",
      "Life Science/English"],
     ["Personal Mineral Consumption", "+", "", "", "+", "", "+", "+",
      "Math/English/Economics"]])
p(14, "KEY: + = Major Emphasis in Content")
p(14, "* = Minor Emphasis in Content")
_std = [
    ("A = Science as Inquiry",
     ["Abilities necessary to do scientific inquiry",
      "Understandings about scientific inquiry"]),
    ("B = Physical Science",
     ["Properties and changes of properties in matter"]),
    ("C = Life Science",
     ["Structure and function in living systems"]),
    ("D = Earth and Space Science",
     ["Structure of the earth system", "Earth’s history"]),
    ("E = Science and Technology",
     ["Abilities of technological design",
      "Understandings about science and technology"]),
    ("F = Science in Personal and Social Perspectives",
     ["Populations, resources, and environments", "Natural hazards",
      "Risks and benefits", "Science and technology in society"]),
    ("G = History and Nature of Science",
     ["Science as a human endeavor", "Nature of science",
      "History of science"]),
]
for _label, _subs in _std:
    p(14, _label)
    ul(14, _subs)
p(14, "(Note: Activities may only address one of the listed subheadings "
      "of each lettered standard.)")

# ---------------------------------------------------------------- page 15 (printed 9)
h(15, 3, "Activity 1—Orange Peel Plate Tectonics")
_t = "Suggested Grade Level: 5 through 8"
p(15, _t, runs=mk_runs(_t, [(_t, "bold")]))
img(15, "act1-orange-peel.jpg",
    "A peeled orange reassembled from several pieces of its own peel, "
    "with a small pile of round toothpicks lying in front of it.")
_t = ("Objective: Students will learn that the Earth’s surface is "
      "made up of tectonic plates, which collide and shift causing "
      "earthquakes and producing volcanoes.")
p(15, _t, runs=mk_runs(_t, [("Objective:", "bold")]))
_t = ("Materials: One orange for each student and 1 box of round "
      "toothpicks")
p(15, _t, runs=mk_runs(_t, [("Materials:", "bold")]))
_t = "Instructions:"
p(15, _t, runs=mk_runs(_t, [(_t, "bold")]))
_steps = [
    "STEP 1. Discuss with the students that the Earth is spherical like "
    "an orange, but because the Earth is so large we cannot see the "
    "roundness of our own planet unless we see it from outer space.",
    "STEP 2. Instruct the students to peel the orange without the use of "
    "a knife and to peel it into at least five pieces. This peel "
    "represents the part of the Earth called the crust. Each segment of "
    "the peel represents a tectonic plate.",
    "STEP 3. Discuss the “flatness” of each section of peel. "
    "The peel does not appear to be as round as when it was wrapped "
    "around the orange in one piece.",
    "STEP 4. Have the students replace the peel on the orange, securing "
    "it with toothpicks. Think of this as a spherical jigsaw puzzle.",
    "STEP 5. Once the pieces of the peel are placed back on the orange, "
    "it can be pointed out that this is now a more accurate "
    "representation of the Earth’s crust. This is a good time to "
    "discuss the concept of plate tectonics. The cracks in the orange "
    "peel represent plate boundaries, “faults” or "
    "“spreading centers” or “subduction zones” "
    "where the Earth’s plates (pieces of orange peel) shift and "
    "collide. Now is also the time to discuss the relationship between "
    "plate boundaries and the present-day distribution of earthquake and "
    "volcanic activity.",
]
B.append({"type": "list", "ordered": False, "items": _steps,
          "item_runs": [mk_runs(s, [(s.split(".")[0] + ".", "bold")])
                        for s in _steps],
          "source_page": 15})
_t = "Evaluation and Discussion:"
p(15, _t, runs=mk_runs(_t, [(_t, "bold")]))
ul(15, [
    "1. The Earth’s surface is divided into more than 12 rigid "
    "crustal plates. Have students list the names of these tectonic "
    "plates.",
    "2. What types of boundaries does each crustal plate have?",
    "3. In which oceans are ocean ridges or spreading centers found?",
    "4. In which oceans are convergent or collisional boundaries found?",
    "5. What is the relationship between plate boundaries and the "
    "distribution of earthquakes?",
    "6. What is the relationship between plate boundaries and the "
    "distribution of volcanoes?",
])
_t = ("Answers to these questions and additional information on plate "
      "tectonics can be found in “This Dynamic Planet” (Simkin "
      "and others, 1994) a USGS map (http://pubs.usgs.gov/pdf/planet.html) "
      "and in “This Dynamic Earth: the Story of Plate "
      "Tectonics” (Kious and Tilling, 1996) "
      "(http://pubs.usgs.gov/publications/text/dynamic.html). The map "
      "“This Dynamic Planet” shows the Earth’s "
      "physiographic features, the current movements of its major "
      "tectonic plates, and the locations of its volcanoes, earthquakes, "
      "and impact craters. The use of color and shaded relief helps the "
      "reader to identify significant features of the land surface and "
      "the ocean floor. More than 1,500 volcanoes active during the past "
      "10,000 years are plotted on the map in four age categories. The "
      "locations (epicenters) of more than 24,000 earthquakes, largely "
      "from 1960 through 1990, are plotted in three magnitude categories "
      "and in two depth ranges.")
p(15, _t, runs=mk_runs(_t, [
    ("http://pubs.usgs.gov/pdf/planet.html", "bold",
     "http://pubs.usgs.gov/pdf/planet.html"),
    ("http://pubs.usgs.gov/publications/text/dynamic.html", "bold",
     "http://pubs.usgs.gov/publications/text/dynamic.html"),
]))

def step_list(page, steps):
    B.append({"type": "list", "ordered": False, "items": steps,
              "item_runs": [mk_runs(s, [(s.split(".")[0] + ".", "bold")])
                            for s in steps],
              "source_page": page})


def bold_p(page, text, label=None):
    p(page, text, runs=mk_runs(text, [(label or text, "bold")]))


# ---------------------------------------------------------------- page 16 (printed 10)
h(16, 3, "Activity 2—Peanut Butter and Jelly Geology")
bold_p(16, "Suggested Grade Level: 5 through 8")
img(16, "act2-sandwich.jpg",
    "A three-layer sandwich seen from the side: a slice of white bread "
    "on the bottom, a layer of chunky peanut butter, a slice of whole "
    "wheat bread, a dark layer of jam, and a slice of dark rye bread on "
    "top, standing in for layered rock strata.")
bold_p(16, "Objective: In this project students will learn how natural "
           "forces shape the rock layers of the Earth’s crust. It "
           "usually takes 45 to 60 minutes to complete this activity.",
       label="Objective:")
bold_p(16, "Materials (for each pair of students):",)
ul(16, [
    "One slice of white bread",
    "One slice of whole wheat bread",
    "One slice of dark rye bread",
    "Two tablespoons of jam or jelly",
    "Two tablespoons of peanut butter (crunchy) mixed with raisins",
    "Two paper plates",
    "Wooden tongue depressor or plastic knife",
    "Measuring spoons for serving jelly",
])
bold_p(16, "Instructions:")
step_list(16, [
    "STEP 1. Have students work in pairs. Each pair will need a paper "
    "plate with the above ingredients.",
    "STEP 2. Tell the students you will show them how to make and "
    "manipulate a sandwich in the same way that natural forces shape "
    "layers of rock.",
    "STEP 3. Have all students place the white bread on a paper plate. "
    "Next, spread the peanut butter on the white bread. Next, add the "
    "whole wheat bread and cover with jelly. Next, add the rye bread.",
    "STEP 4. Have the students call the layers just what they are. If "
    "you have been studying rocks and the students are familiar with the "
    "various rock types, have them name the various layers of the "
    "sandwich. They can use imaginative rock names such as "
    "“wholesome shale” for whole wheat bread or "
    "“sticky conglomerate” for chunky peanut butter.",
    "STEP 5. As the students add the various parts to their sandwich, "
    "which represent various layers of the crust, keep track of their "
    "progress by drawing a diagram on the chalkboard of the various "
    "layers. All students should have identical three layer sandwiches.",
])
bold_p(16, "Evaluation and Discussion:")
ul(16, [
    "1. When all the sandwiches are assembled, discuss the concept of "
    "how some rocks in the Earth’s crust are layered. Note that "
    "geologists rarely find rocks as flat and horizontal layers. Often "
    "they will see layers that are bent or broken. To illustrate these "
    "structures, have the students gently bend their sandwich to form an "
    "arch. (Always keep the oldest layer, white bread, on the bottom). "
    "This structural form is called an “anticline.”",
    "2. Now, have students bend the sandwich to form a trough. This "
    "structure is called a “syncline.” Adding pressure to a "
    "horizontal layer can cause it to bend up or down, one-way in which "
    "mountains and valleys are formed.",
    "3. Sometimes blocks of the Earth’s crust move up or down "
    "along major fractures or “faults.” This type of movement "
    "can cause earthquakes. Have the students cut their sandwich in half "
    "and move one half up or down. Have the students determine which "
    "side moved up or down? Either the left side moved up and the right "
    "side moved down or the other way around. You can see this movement "
    "because of the different layers of the sandwich. This is called a "
    "“vertical fault.” Have students draw a picture of this "
    "type of fault movement. You can also create another type of fault, "
    "a “lateral fault.” Have the students slide the two parts "
    "of the sandwich past each other (sideways) on the same level to "
    "produce lateral fault movement. This type of movement causes "
    "earthquakes on the San Andreas Fault in California.",
])
p(16, "This project has other ways to demonstrate how the Earth is "
      "layered and how the various layers can be deformed; be creative "
      "and have fun! Some of the questions that can be addressed are:")
ul(16, [
    "1. What is the oldest part of your sandwich? (bottom layer, white "
    "bread, first piece used)",
    "2. What is the youngest layer? (top piece, rye bread, last piece to "
    "be put on)",
    "3. If the middle of the sandwich layers bend upward, what type of "
    "structure do you have? (anticline)",
    "4. If the middle layers of the sandwich layers bend downward, what "
    "type of structure do you have? (syncline)",
    "5. If the sandwich is broken (cut), look at the relationship of the "
    "various layers to tell what type of fault movement you have.",
])
bold_p(16, "Additional Resources:")
_t = ("Alpha, T.A., and Lahr, J.C., 1990, Seven paper models that "
      "describe faulting in the Earth: U.S. Geological Survey Open-File "
      "Report 90-257 [URL: "
      "http://wrgis.wr.usgs.gov/docs/parks/deform/7modelsa.html].")
p(16, _t, runs=mk_runs(_t, [
    ("http://wrgis.wr.usgs.gov/docs/parks/deform/7modelsa.html", "normal",
     "http://wrgis.wr.usgs.gov/docs/parks/deform/7modelsa.html")]))
_t = ("U.S. Geological Survey, 2002, A Model of three faults: U.S. "
      "Geological Survey Learning Web [URL: "
      "http://interactive2.usgs.gov/learningweb/teachers/faults.htm].")
p(16, _t, runs=mk_runs(_t, [
    ("http://interactive2.usgs.gov/learningweb/teachers/faults.htm",
     "normal",
     "http://interactive2.usgs.gov/learningweb/teachers/faults.htm")]))

# ---------------------------------------------------------------- page 17 (printed 11)
h(17, 3, "Activity 3—Cupcake Core Sampling")
bold_p(17, "Suggested Grade Level: 5 through 8")
img(17, "act3-cupcake.jpg",
    "A frosted cupcake in a foil baking cup with a clear plastic straw "
    "stuck into the top of the white frosting.")
bold_p(17, "Objective: To demonstrate how geologists can find (discover) "
           "mineral deposits that are buried in the Earth’s crust "
           "and determine what their distribution is by collecting and "
           "analyzing cores.",
       label="Objective:")
bold_p(17, "Materials:")
ul(17, [
    "White cupcake mix", "Foil baking cups", "Drawing paper", "Frosting",
    "Plastic knives", "Food coloring", "Toothpicks",
    "Plastic transparent straws",
])
bold_p(17, "Instructions:")
p(17, "Make white batter cupcakes with at least three layers of colored "
      "batter. You can use red for “zinc,” blue for "
      "“copper,” and yellow for “gold.” Thickness "
      "differences and irregularities in the layers are encouraged. "
      "Frost each cupcake. Provide each student with a cupcake, clear "
      "straw, toothpick, and drawing paper. Foil baking cups and "
      "frosting will prevent the students from seeing the interior of "
      "the cupcakes in much the same way that a geologist can’t "
      "see the interior of the Earth.")
step_list(17, [
    "STEP 1. Give each student a cupcake and a piece of drawing paper or "
    "photocopies of figure 4.",
    "STEP 2. If drawing paper is used, ask the students to fold it into "
    "four sections (see fig. 4). Have them draw on one of the sections "
    "what they think the inside of the cupcake would look like if there "
    "were three different layers present (use fig. 4A).",
    "STEP 3. Ask the students how they might get more information about "
    "the internal structure of the cupcake without peeling the foil or "
    "cutting it open with a knife. (Discussion)",
    "STEP 4. Someone may suggest using the straw to take a “core "
    "sample.” Demonstrate to the students how to rotate and push "
    "the straw to “drill” into the cupcake and pull out a "
    "sample (straws can be cut to a length slightly longer than the "
    "depth of the cupcake).",
    "STEP 5. Have the students take a core sample from the center of the "
    "cupcake.",
    "STEP 6. The students should make a second drawing of their cupcake "
    "based on the information from the core sample (use fig. 4B). This "
    "would represent the first exploration drill hole.",
    "STEP 7. Have the students take two additional core samples either "
    "side of the center hole (line up the drill holes across the "
    "cupcake). The students should make a new drawing based upon this "
    "new data (use fig. 4C).",
    "STEP 8. Have the students cut open their cupcakes, bisecting the "
    "drill holes. Have the students make a final cross section of the "
    "inside of their cupcake and compare it to their previous drawings "
    "(use fig. 4D). Discuss how additional drill holes give a better "
    "understanding of the “mineral deposit.”",
])
p(17, "[Hint: Keep relating what the students are doing to what "
      "real-life geologists do. Nobody eats until the discussion is "
      "complete!]")
bold_p(17, "Evaluation and Discussion:")
p(17, "Questions to have the students answer are:")
ul(17, [
    "1. How are your cross sections different from the initial cross "
    "section you made before collecting core samples? Does the "
    "collection of additional information help determine where the "
    "various layers are?",
    "2. Were the mineral deposits—red layers for zinc, blue layer "
    "for copper, and yellow layer for gold—evenly distributed in "
    "the cupcake?",
    "3. If you could collect two, three, or four cores from the cupcake, "
    "where would you drill your cores and why?",
    "4. Can the cores tell you how deep the various layers are?",
    "5. If you could not collect cores, discuss another method for "
    "collecting data to determine what the subsurface material would be "
    "like.",
])

# ---------------------------------------------------------------- page 18 (printed 12, landscape)
img(18, "fig4-cupcake-core-template.jpg",
    "A full-page worksheet template titled “Cupcake Core "
    "Drilling,” divided into four equal panels, each containing "
    "the same empty cupcake outline in cross section. Panel A, "
    "“Imagine Section,” is blank for drawing a first guess. "
    "Panel B, “One Drill Hole Section,” shows one dashed "
    "vertical core hole labeled 1 through the center. Panel C, "
    "“Three Drill Hole Section,” shows three dashed core "
    "holes labeled 2, 1, and 3 across the cupcake. Panel D, “Cut "
    "Section,” is blank again for drawing the real interior after "
    "cutting the cupcake open. The source page is bound sideways "
    "(landscape); the image is shown upright here.",
    caption="Figure 4. Template for drawing cupcake core-drilling cross "
            "sections.")

# ---------------------------------------------------------------- page 19 (printed 13)
h(19, 3, "Activity 4—Chocolate Chip Cookie Mining")
bold_p(19, "Suggested Grade Level: 5 through 8")
img(19, "act4-cookies.jpg",
    "Three chocolate chip cookies of different brands stacked in an "
    "overlapping pile: a small light-brown cookie, a large pale rough "
    "cookie, and a dark chocolate cookie.")
bold_p(19, "Objective: The purpose of this game is to give the students "
           "an introduction to the economics of mining. Each student buys "
           "“property,” purchases the “mining "
           "equipment,” pays for the “mining operation "
           "cost,” and completes “reclamation” of his or "
           "her property while receiving money for the “ore "
           "mined.”",
       label="Objective:")
p(19, "Students must make decisions on which property to buy and which "
      "tools to use, some of the same decisions that must be made in the "
      "mining industry. The objective of the game is to learn how to run "
      "a profitable mining operation that is environmentally sound.")
bold_p(19, "Materials:")
ul(19, [
    "Play money", "Large square graph paper",
    "3 different brands of chocolate chip cookies", "Flat toothpicks",
    "Round toothpicks", "Paper clips", "Pencils",
])
bold_p(19, "Instructions:")
ul(19, [
    "Each student starts with $19 of cookie mining money.",
    "Each student receives a sheet of graph paper.",
    "Each student must buy his/her own “mining property” "
    "(cookie); only one property per student.",
])
bold_p(19, "Cookies for sale are:")
ul(19, ["Brand 1—$3.00", "Brand 2—$5.00", "Brand 3—$7.00"])
step_list(19, [
    "STEP 1. Have the students purchase a “mining property” "
    "(cookie).",
    "STEP 2. After the cookie is bought, the student places the cookie "
    "on the graph paper and using a pencil traces the outline of the "
    "cookie. The student must then count each square that falls inside "
    "the circle. (Note: Count squares that are one-half or more inside "
    "the circle as a full square. Do not count squares having less than "
    "one-half of their area inside the circle.)",
    "STEP 3. Now each student must buy his/her own “mining "
    "equipment.” More than one piece of equipment may be "
    "purchased. (Note: Equipment may not be shared between players.)",
])
p(19, "Mining equipment costs:")
ul(19, ["Flat toothpick—$2.00", "Round toothpick—$4.00",
        "Paper clip—$6.00"])
step_list(19, [
    "STEP 4. Have the students mine their property, removing the "
    "chocolate chips, following the rules below.",
])
bold_p(19, "Rules:")
ul(19, [
    "(1) No student can use his or her fingers to hold the cookie. The "
    "only things that can touch the cookie are the mining tools and the "
    "paper the cookie is sitting on.",
    "(2) Students should be allowed a maximum of 5 minutes to "
    "“mine” their cookie. Players that finish before the 5 "
    "minutes are up should only use the actual time spent "
    "“mining” to calculate mining cost ($1.00 per minute).",
    "(3) A student can purchase as many mining tools as he or she "
    "desires, and the tools can be of different types.",
    "(4) If the mining tools break, they are no longer useable, and a "
    "new tool must be purchased.",
    "(5) Sale of the chocolate chips brings $2.00 per chip; broken chips "
    "can be combined to make 1 whole chip.",
    "(6) After the cookie has been “mined,” what is left of "
    "the cookie must be placed back into the circled area on the graph "
    "paper. This can only be accomplished using the mining "
    "tools—no fingers or hands allowed.",
    "(7) Reclamation cost is $1.00 per graph-paper square.",
    "(8) Apply profit calculation: Revenue (chips mined at $2.00 each) "
    "minus Costs (property, tools, mining, and reclamation costs) = "
    "Profit.",
    "(9) The player with the largest net profit at the end of the game "
    "wins.",
    "(10) All players WIN at the end, because they get to eat "
    "what’s left of their cookie!",
])
bold_p(19, "Evaluation and Discussion:")
p(19, "Have the students discuss the following:")
ul(19, [
    "1. Which cookie gives you the best return (profit) for your mining "
    "efforts?",
    "2. What is the best mining equipment?",
    "3. What is the total cost of reclamation?",
    "4. Would you use different mining equipment with different types of "
    "cookies?",
    "5. Is the type of equipment you use related to your mining cost?",
    "6. What would you do if you owned properties with different types "
    "of resources (cookies)? What decisions would you make?",
    "7. What economic choices did you make as you mined your property?",
])

# ---------------------------------------------------------------- page 20 (printed 14)
h(20, 3, "Activity 5—Extracting Metal (Copper) From A Rock")
bold_p(20, "Suggested Grade Level: 5 through 8")
img(20, "act5-pennies.jpg",
    "Two overlapping United States pennies, shown heads side up, each "
    "with Abraham Lincoln’s profile in bright copper.")
bold_p(20, "Objective: The lesson objective is to demonstrate how metal "
           "(copper) can be extracted from mined rock through a process "
           "called “solvent extraction.”",
       label="Objective:")
bold_p(20, "Materials:")
ul(20, [
    "Small plastic container",
    "2 tablespoons of crushed oxide copper ore",
    "2 to 4 oz. of diluted (5% solution) sulfuric acid (H2SO4)",
    "2 clean iron nails (not galvanized roofing nails or coated finish "
    "nails)",
    "Steel wool", "Safety goggles", "Rubber gloves", "Laboratory coat",
])
bold_p(20, "Instructions:")
step_list(20, [
    "STEP 1. Put approximately two tablespoons of crushed oxide copper "
    "ore into the plastic container.",
    "STEP 2. Completely cover the crushed rock with diluted (5% "
    "solution) sulfuric acid (H2SO4).",
    "STEP 3. Wait 5 to 10 minutes for the copper to dissolve and a blue "
    "solution to appear.",
    "STEP 4. Next dip a clean iron nail into the solution. The iron "
    "nails should be cleaned before use with steel wool to remove any "
    "residual wax.",
    "STEP 5. Through ion exchange, the positive iron ions attract the "
    "copper ions in solution and copper instantly plates onto the iron "
    "nail.",
])
bq(20, "Note: Perform this activity in a well ventilated area, avoid "
       "breathing any fumes produced. Remember, when doing any activity "
       "that involves the use of chemicals, be sure to use the proper "
       "Personal Protective Equipment (PPE), such as gloves, safety "
       "glasses, and laboratory coats. Although relatively dilute, every "
       "precaution should be taken to keep the acid from touching skin "
       "or clothing. If you get some acid on your skin, rinse the skin "
       "immediately with plenty of cold water. Remember to dispose of "
       "the remaining blue solution properly; be sure to dilute the "
       "solution with 1 gallon of water, and wash the plastic container "
       "thoroughly.")
bold_p(20, "Evaluation and Discussion:")
p(20, "Extraction of metals from ores is usually a two-step process. "
      "Step one is to produce a concentrate of the ore mineral. This is "
      "what you did by adding the crushed copper ore that contains both "
      "copper carbonate (CuCO3) and copper hydroxide (Cu(OH)2) minerals. "
      "The next step is to use a caustic solution (acid) to leach "
      "(dissolve) the metal from the ore or concentrate. The metal is "
      "recovered from solution by an electrolytic process known as "
      "electrowinning. This is where a pure metal is precipitated onto "
      "the cathode of an electrochemical cell. Many types of metals are "
      "recovered using this system referred to as solvent "
      "extraction-electrowinning (SX-EW). With the help of electricity, "
      "copper can be electroplated onto large (4 foot by 4 foot) "
      "stainless-steel plates, producing approximately 200 pounds of "
      "copper on each side of a plate in 3 to 5 days.")
p(20, "The activity you preformed involved crushing the copper ore and "
      "treating it with a weak solution of sulfuric acid. The acid "
      "solution resulting from this treatment contained a high "
      "concentration of dissolved copper sulfate. To precipitate the "
      "copper an iron nail was added. The iron nail reacts with "
      "dissolved copper sulfate to produce solid copper and dissolved "
      "iron sulfate. The remaining iron sulfate is a by product that "
      "must be either used or disposed of. As mentioned above, copper "
      "can also be extracted from an acid solution through the use of "
      "electrolytic methods.")
bold_p(20, "Group questions:")
ul(20, [
    "1. Where is copper ore found?",
    "2. How is copper recovered and processed?",
    "3. How much energy is involved in processing copper ore?",
    "4. Think about the cost of finding, crushing, and transporting the "
    "ore to a processing plant and the cost of electricity.",
    "5. How would our daily lives be affected if all the copper on "
    "Earth disappeared? (Hint: Copper is a good conductor of both heat "
    "and electricity. More than 70% of the copper consumed in the "
    "United States is used for electrical purposes. Copper is used in "
    "many industrial processes, airplane and automobile manufacturing, "
    "plumbing, and in major communications systems that use copper "
    "circuits and wires.)",
])
bold_p(20, "Additional Resources:")
_t = ("Brown, Phil, 2004, Extraction of Metals: [URL: "
      "http://www.wpbschoolhouse.btinternet.co.uk/page04/"
      "Mextract.htm#copper/].")
p(20, _t, runs=mk_runs(_t, [
    ("http://www.wpbschoolhouse.btinternet.co.uk/page04/Mextract.htm#copper/",
     "normal",
     "http://www.wpbschoolhouse.btinternet.co.uk/page04/Mextract.htm#copper/")]))
_t = ("University of California, 2000, Material Resources: The Regents "
      "of the University of California [URL:http://www.sepup.com/docs1/"
      "SnS_print_samples.pdf/SnS_TG-24_Copier_Extraction.pdf].")
p(20, _t, runs=mk_runs(_t, [
    ("http://www.sepup.com/docs1/SnS_print_samples.pdf/"
     "SnS_TG-24_Copier_Extraction.pdf",
     "normal",
     "http://www.sepup.com/docs1/SnS_print_samples.pdf/"
     "SnS_TG-24_Copier_Extraction.pdf")]))
_t = ("U.S. Geological Survey, 2005a, Minerals Information: [URL: "
      "http://minerals.usgs.gov/minerals/].")
p(20, _t, runs=mk_runs(_t, [
    ("http://minerals.usgs.gov/minerals/", "normal",
     "http://minerals.usgs.gov/minerals/")]))

# ---------------------------------------------------------------- page 21 (printed 15)
h(21, 3, "Activity 6—Minerals in Your Body")
bold_p(21, "Suggested Grade Level: 5 through 8")
img(21, "act6-tin-man.png",
    "A cartoon tin man standing with hands on hips, drawn in shiny "
    "silver-gray metal with a small red heart on his chest, a funnel "
    "spout on his head, and rivets down his body. Ten element names in "
    "assorted decorative lettering surround him: Potassium above his "
    "head, then clockwise Carbon, Magnesium, Chromium, Iodine, Zinc, "
    "Nickel, Sulfur, Molybdenum, and Calcium. These labels appear only "
    "in this illustration; they name elements found in the human body.")
bold_p(21, "Objective: This is an exercise to help students learn about "
           "the distribution of elements in their bodies. Which elements "
           "are important for growth and development? Which of these "
           "elements are derived from minerals? Do the quantities of "
           "these elements change through time, as they grow?",
       label="Objective:")
bold_p(21, "Materials: Copy of table 4 for each student",
       label="Materials:")
bold_p(21, "Instructions:")
p(21, "Oxygen (O) is the most abundant element in the Earth’s "
      "crust and in your body. Remember, that an element is a substance "
      "whose atoms have the same atomic number, and a mineral may be "
      "composed of a single element like copper (Cu) or a compound of "
      "elements like halite or “salt” (NaCl). For a 66 pound "
      "(30 kg person) 40.3 pounds (18.3 kg) of oxygen (61% of total body "
      "weight) is found in the body in the form of water, proteins, "
      "nucleic acids, carbohydrates, and fats.")
p(21, "Minerals in their elemental form are important as they are used "
      "by protein “enzymes” to run most of the body’s "
      "chemical reactions. More than 30 elements play a key role in "
      "helping plants and animals live a healthy life. Elements are the "
      "basic building blocks of life. Our bodies use various elements "
      "such as calcium to build strong bones, iron to make tendons and "
      "ligaments, and iron to help blood carry oxygen. The greatest "
      "source of these elements is the food we eat. Sometimes we need to "
      "take additional dietary supplements, such as vitamins, to assure "
      "that we maintain the proper chemical balance in our body.")
step_list(21, [
    "STEP 1. Using table 4, have the student find the amount of "
    "minerals in their body, based on their weight.",
    "STEP 2. Assign an element (preferably a mineral) to each student "
    "or group of students to study. Have the students present their "
    "findings to the class as part of a group discussion or as part of "
    "a writing assignment.",
])
bold_p(21, "Evaluation and Discussion:")
p(21, "Once each student or group of students has obtained information "
      "on his/her element, have the student(s) present their findings to "
      "the class. Discussion items should include what biological "
      "functions (role) the element has for growth and development.")
p(21, "You can lead the class in a general discussion by asking the "
      "following questions:")
ul(21, [
    "1. Which elements are important for growth and development?",
    "2. Does the makeup (distribution) of these elements change as you "
    "get older?",
    "3. What is the biological role of these elements?",
    "4. For Grades 9 to 12, have the students discuss the role of "
    "(certain elements)—Mg, Ca, Zn—as they are used by "
    "protein “enzymes” to run most of the body’s "
    "chemical reactions.",
    "5. For Grades 9 to 12, have the students discuss the relation "
    "between minerals and vitamins.",
])
bold_p(21, "Additional Resources:")
_t = "American Salt Institute: [URL: http://www.saltinstitute.org/15.html]."
p(21, _t, runs=mk_runs(_t, [
    ("http://www.saltinstitute.org/15.html", "normal",
     "http://www.saltinstitute.org/15.html")]))
_t = ("Mineral Information Institute, 2004a, The role of elements in "
      "life processes: [URL: http://www.mii.org/periodic/"
      "LifeElement.html].")
p(21, _t, runs=mk_runs(_t, [
    ("http://www.mii.org/periodic/LifeElement.html", "normal",
     "http://www.mii.org/periodic/LifeElement.html")]))
_t = ("Winter, Mark, 2005, WebElementsTM Periodic Table: [URL: "
      "http://www.webelements.com/].")
p(21, _t, runs=mk_runs(_t, [
    ("http://www.webelements.com/", "normal",
     "http://www.webelements.com/")]))

# ---------------------------------------------------------------- page 22 (printed 16)
# The source spans "ELEMENT" over Name/Symbol; folded into the two column
# names (independent verification 2026-08-10, table-004).
tbl(22, "Table 4. The most common elements in the human body (data "
        "derived from Winters, 2005).",
    ["Element Name", "Element Symbol", "30 kg person¹ (Grams)",
     "40 kg person² (Grams)", "50 kg person³ (Grams)"],
    [["Oxygen", "O", "18,300", "24,400", "30,500"],
     ["Carbon", "C", "6,900", "9,200", "11,500"],
     ["Hydrogen", "H", "3,000", "4,000", "5,000"],
     ["Nitrogen", "N", "780", "1,040", "1,300"],
     ["Calcium", "Ca", "420", "560", "700"],
     ["Phosphorus", "P", "330", "440", "550"],
     ["Potassium", "K", "60", "80", "120"],
     ["Sodium", "Na", "42", "56", "70"],
     ["Chlorine", "Cl", "36", "48", "60"],
     ["Magnesium", "Mg", "8.1", "10.8", "13.5"],
     ["Silicon", "Si", "7.8", "10.4", "13"],
     ["Iron", "Fe", "1.8", "2.4", "3"],
     ["Zinc", "Zn", "0.99", "1.32", "1.65"],
     ["Copper", "Cu", "0.03", "0.04", "0.05"]])
p(22, "¹ 30 kg person = 67.5 pound person")
p(22, "² 40 kg person = 88 pound person")
p(22, "³ 50 kg person = 110 pound person")
p(22, "1 gram (g) = 0.03527 ounces")
p(22, "1 kilogram (kg) = 2.205 pounds")

# ---------------------------------------------------------------- page 23 (printed 17)
h(23, 3, "Activity 7—The Mineral Talc or “Rocks on Your "
         "Face”")
bold_p(23, "Suggested Grade Level: 5 through 8")
img(23, "act7-talc-mask.jpg",
    "A porcelain jester’s head with a white painted face, rouged "
    "cheeks and red lips, wearing a two-tone red and green jester’s "
    "hat with bells and a wide ruffled white collar, framed inside a "
    "black oval. Six cosmetic words in assorted decorative lettering "
    "curve around the oval: Blush, Eyeliner, Eyeshadow, Lipstick, "
    "Makeup, and Powder. These labels appear only in this illustration; "
    "they name cosmetic products that contain talc.")
bold_p(23, "Objective: Students will learn about the chemical "
           "characteristics of minerals. Talc may have been the first "
           "mineral that most students came into close contact with. "
           "Talc is the main ingredient in talcum powder, which is used "
           "to prevent diaper rash.",
       label="Objective:")
bold_p(23, "Materials:")
ul(23, [
    "Talc (solid piece)", "100-grit sandpaper", "220-grit sandpaper",
    "600-grit sandpaper", "No. 4 (0000) steel wool",
    "Old blue jean rag or soft cloth",
])
bold_p(23, "Instructions:")
step_list(23, [
    "STEP 1. The talc can be cut on a wood band saw to obtain a flat "
    "surface to polish.",
    "STEP 2. Start with the 100-grit sandpaper; sand the flat surface "
    "until you have made a small pile of talcum or “baby "
    "powder.” Remember, it doesn’t smell like baby powder "
    "because no fragrance has been added. Feel how soft and smooth the "
    "powder is.",
    "STEP 3. With the 220-grit sandpaper, continue to sand the same "
    "flat surface taking out all the deep scratches. You will notice "
    "that the powder is finer; it is the same as that used in cosmetics "
    "(this is why we call it “Rocks on your Face”).",
    "STEP 4. Use the 600-grit black sand paper to produce an even finer "
    "powder. Such fine powder is used in deodorants and in making "
    "paper, plastics, and paint.",
    "STEP 5. With the no. 4 (0000) steel wool you will be able to take "
    "out the last of the scratches on the talc block and produce a very "
    "fine powder like that used on the outside of chewing gum. "
    "Remember, its not powdered sugar but talc that keeps the gum from "
    "sticking to the wrapper.",
    "STEP 6. With an old blue jean rag or soft cloth you can rub really "
    "hard to polish the talc surface by hand to a gloss.",
])
bold_p(23, "Evaluation and Discussion:")
p(23, "Below is a list of mineralogical and physical characteristics of "
      "talc.")
p(23, "Mineralogical characteristics:")
ul(23, [
    "Chemistry—Magnesium Silicate Hydroxide, Mg3Si4O10(OH)2",
    "Class—Silicates",
    "Group—Clays (the Montmorillonite/Smectite Group)",
])
p(23, "Physical characteristics (see Plante, Peck, and von Bargen, 2003 "
      "for an on-line description of the basic properties of minerals):")
ul(23, [
    "Color—green, gray and white to almost silver.",
    "Luster—dull to pearly or greasy.",
    "Hardness—1 (can leave mark on paper and be scratched with a "
    "fingernail).",
    "Specific Gravity—2.7 to 2.8 (average).",
    "Streak—white.",
    "Other Characteristics—cleavage flakes are slightly flexible "
    "but not elastic, and talc has a soapy feel to the touch (talc is "
    "sometimes called soapstone).",
    "Best Field Indicators—softness, color, soapy feel, luster, "
    "and cleavage.",
])
bold_p(23, "Evaluation and Discussion:")
p(23, "Talc is an important industrial mineral. Its resistance to heat, "
      "electricity, and acids make it an ideal surface for laboratory "
      "counters tops, electrical switchboards, and artwork (soapstone "
      "carvings). Talc is used as an ingredient in paints, plastics, "
      "paper, rubber products, roofing materials, ceramics, and "
      "insecticides. It is most commonly known as the primary ingredient "
      "in talcum powder. Talc is also used in deodorants and cosmetics "
      "and is even found on chewing gum. Have the students read the "
      "labels from a variety of cosmetic products. Is talc listed as one "
      "of the ingredients? Have the students discuss how talc is used in "
      "their daily lives.")
bold_p(23, "Additional Resources:")
_t = ("Plante, Alan, Peck, Donald, and von Bargen, Donald, 2003, "
      "Mineral Identification Key II: [URL: http://www.minsocam.org/MSA/"
      "collectors_corner/id/mineral_id_keyi1.htm].")
p(23, _t, runs=mk_runs(_t, [
    ("http://www.minsocam.org/MSA/collectors_corner/id/"
     "mineral_id_keyi1.htm", "normal",
     "http://www.minsocam.org/MSA/collectors_corner/id/"
     "mineral_id_keyi1.htm")]))
_t = ("U.S. Geological Survey, 2005a, Minerals Information: [URL: "
      "http://minerals.usgs.gov/minerals/].")
p(23, _t, runs=mk_runs(_t, [
    ("http://minerals.usgs.gov/minerals/", "normal",
     "http://minerals.usgs.gov/minerals/")]))
_t = ("Weisgarber, S.L., and Van Doren, Lisa, 2004, Rocks and minerals "
      "everywhere: Ohio Department of Natural Resources Hands on Earth "
      "Science No. 6 [URL: "
      "http://www.dnr.state.oh.us/geosurvey/pdf/ho06.pdf].")
p(23, _t, runs=mk_runs(_t, [
    ("http://www.dnr.state.oh.us/geosurvey/pdf/ho06.pdf", "normal",
     "http://www.dnr.state.oh.us/geosurvey/pdf/ho06.pdf")]))

# ---------------------------------------------------------------- page 24 (printed 18)
h(24, 3, "Activity 8—Make Your Own Toothpaste")
bold_p(24, "Suggested Grade Level: 5 through 8")
img(24, "act8-mortar-pestle.jpg",
    "A small tan mortar and pestle heaped with pastel-colored antacid "
    "tablets in pink, yellow, green, and orange, with more tablets "
    "scattered around its base.")
bold_p(24, "Objective: The Earth is made of materials that have distinct "
           "properties and provide resources for human activities. "
           "Students will learn about the basic composition of a product "
           "(toothpaste) that they use on a daily basis. This activity "
           "can lead to a discussion of what products we use on a daily "
           "basis and the importance of minerals in our environment "
           "(refer to the following: Frank and others, 2001; Weathers "
           "and others, 2001).",
       label="Objective:")
bold_p(24, "Materials:")
ul(24, [
    "3 colored antacid tablets (about 1 tsp of powder)",
    "1/8 tsp baking soda",
    "3 to 4 drops of water",
    "Small paper or plastic cup (like the kind you put ketchup in at "
    "fast-food restaurants)",
    "Small mortar and pestle",
])
bold_p(24, "Instructions:")
step_list(24, [
    "STEP 1. Pick an antacid color to use to make white, green, or pink "
    "toothpaste.",
    "STEP 2. Grind 3 antacid tablets into powder using a mortar and "
    "pestle (coffee grinder will work for bulk amounts).",
    "STEP 3. Place powder in plastic/paper cup.",
    "STEP 4. Add baking soda and water.",
    "STEP 5. Stir using toothpick until a paste forms.",
])
bold_p(24, "Evaluation and Discussion:")
p(24, "Ask your students the following questions:")
ul(24, [
    "1. What ingredients are listed on a container of toothpaste?",
    "2. How do the ingredients you used to make your own toothpaste "
    "compare with what is listed on the container of store bought "
    "toothpaste?",
    "3. What are the active ingredients in toothpaste?",
    "4. Antacid tablets contain silica and calcium carbonates, which "
    "work as abrasives keeping plaque from building up on teeth. "
    "Calcium carbonate is derived from mined and processed limestone, "
    "and baking soda is obtained from the mineral trona. When the right "
    "amount of water is combined with the powered minerals, it forms a "
    "paste. The average toothpaste purchased by consumers today "
    "contains some or all of the above ingredients. The toothpaste tube "
    "contains aluminum, from bauxite, and plastics, derived from "
    "petroleum products.",
    "5. Was toothpaste always put into a tube container? Have "
    "student’s research antique toothpaste containers. Modern "
    "toothpaste was developed in the 1800s. Soap was added to "
    "toothpaste in 1824. By the 1850s, chalk was added to toothpaste. "
    "Colgate was the first company to mass-produce toothpaste in jars. "
    "The first collapsible tube of toothpaste was manufactured in "
    "1896.",
])
bold_p(24, "Additional Resources:")
_t = ("Prencipe, M., Masters, J.G., Thomas, K.P., and Novfleet, J., "
      "1995, Squeezing out a better toothpaste: American Chemical "
      "Society, Chemtech, Dec. 1995 "
      "[http://pubs.acs.org/hotartcl/chemtech/95/dec/dec.html].")
p(24, _t, runs=mk_runs(_t, [
    ("http://pubs.acs.org/hotartcl/chemtech/95/dec/dec.html", "normal",
     "http://pubs.acs.org/hotartcl/chemtech/95/dec/dec.html")]))
_t = ("Weisgarber, S.L., and Van Doren, Lisa, 2004, Rocks and minerals "
      "everywhere: Ohio Department of Natural Resources Hands on Earth "
      "Science No. 6 [URL: "
      "http://www.dnr.state.oh.us/geosurvey/pdf/ho06.pdf].")
p(24, _t, runs=mk_runs(_t, [
    ("http://www.dnr.state.oh.us/geosurvey/pdf/ho06.pdf", "normal",
     "http://www.dnr.state.oh.us/geosurvey/pdf/ho06.pdf")]))

# ---------------------------------------------------------------- page 25 (printed 19)
h(25, 3, "Activity 9—Mineral Flash Cards")
bold_p(25, "Suggested Grade Level: 5 through 8")
img(25, "act9-flash-cards.jpg",
    "Three 5 by 7 inch flash cards fanned out in a pile. Two show an "
    "ornate orange sunburst card-back pattern around a photograph of a "
    "purple mineral specimen; the top card is turned face up with "
    "handwritten text reading “#26 Fe Iron, essential to plant and "
    "animal life.”")
bold_p(25, "Objective: Every segment of society uses minerals or a "
           "product of mineral resources everyday. The roads on which "
           "we drive and the buildings in which we live, learn, and "
           "work all contain minerals. The student will gain a better "
           "understanding of the importance of minerals to our economy "
           "and environment by understanding how commonly used metallic "
           "and nonmetallic minerals, ore minerals, mineral byproducts, "
           "and rock types are used to make products we use in our "
           "daily lives.",
       label="Objective:")
bold_p(25, "Materials: Flash cards (5 × 7 inch); number of cards "
           "required will vary depending on the assignment. (Refer to "
           "appendix 2, Minerals and Their Uses.)",
       label="Materials:")
bold_p(25, "Instructions:")
p(25, "Give each student one to five cards. For Grades 9 to 12 each "
      "student will have 2 cards for each assigned mineral or "
      "commodity. Figure 5 is an example of a template you can use.")
step_list(25, [
    "STEP 1. From appendix 2, randomly assign each student one to five "
    "minerals or commodities.",
    "STEP 2. At the top of each card, have the student write the name "
    "of the assigned mineral or commodity.",
    "STEP 3. Assign the following:",
])
bold_p(25, "For grades 5 to 8 have the students answer the following "
           "five questions, which should be listed on each card.")
ul(25, [
    "1. What is the chemical composition of the resource?",
    "2. What is the source of the mineral/commodity?",
    "3. How is it obtained (mined)?",
    "4. Where is it mined, and is it mined in your state?",
    "5. What are two uses for this resource?",
])
bold_p(25, "For grades 9 to 12, have the students use an additional "
           "card and answer the following 6 questions.")
ul(25, [
    "1. What is the domestic (United States) production of this "
    "resource?",
    "2. How much does the United States consume on a yearly basis?",
    "3. How much does the United States import on a yearly basis?",
    "4. What is the current world distribution of the resource? (major "
    "countries producing the resource)",
    "5. What is the current market price of this resource? Has the "
    "market price changed over time?",
    "6. Can this mineral be recycled?",
])
bold_p(25, "Evaluation and Discussion:")
p(25, "Each student (cards can be assigned to a group of students) "
      "should think about and answer the questions and be able to "
      "present the information to the class. You can also have students "
      "write an essay based on what they have learned about the "
      "assigned commodities. Examples of completed cards are shown in "
      "figure 5.")
bold_p(25, "Additional Resources:")
_t = ("Barthelmy, David, 2005, Mineralogy Database: [URL: "
      "http://webmineral.com/index.shtml]. (This mineral database "
      "contains 4,442 individual mineral species descriptions with "
      "links and a comprehensive image library.)")
p(25, _t, runs=mk_runs(_t, [
    ("http://webmineral.com/index.shtml", "normal",
     "http://webmineral.com/index.shtml")]))
_t = ("Winter, Mark, 2005, WebElementsTM Periodic Table: [URL: "
      "http://www.webelements.com/].")
p(25, _t, runs=mk_runs(_t, [
    ("http://www.webelements.com/", "normal",
     "http://www.webelements.com/")]))
p(25, "Kesler, S.E., 1994, Mineral resources, economics, and the "
      "environment: New York, N.Y., MacMillan College Publishing "
      "Company, 391 p.")
_t = ("U.S. Geological Survey, 2005a, Minerals Information: [URL: "
      "http://minerals.usgs.gov/minerals/].")
p(25, _t, runs=mk_runs(_t, [
    ("http://minerals.usgs.gov/minerals/", "normal",
     "http://minerals.usgs.gov/minerals/")]))

# ---------------------------------------------------------------- page 26 (printed 20)
p(26, "Figure 5. Examples of flash cards used in activity 9. A, an "
      "example of questions to use for card 1 (grades 5-12); B, an "
      "example of questions to use for card 2 (grades 9-12); C, an "
      "example of a completed card 1; D, an example of a completed "
      "card 2.")
bq(26, "(A) CARD 1\n"
       "Assigned mineral or commodity:\n"
       "1. CHEMICAL COMPOSITION:\n"
       "2. SOURCE:\n"
       "3. HOW IS IT MINED?\n"
       "4. WHERE IS IT FOUND?\n"
       "5. NAME TWO USES.\n"
       "(a)\n"
       "(b)\n"
       "6. SOURCE OF YOUR INFORMATION:")
bq(26, "(B) CARD 2\n"
       "Assigned mineral or commodity:\n"
       "1. DOMESTIC PRODUCTION:\n"
       "2. DOMESTIC CONSUMPTION:\n"
       "3. U.S. IMPORTS:\n"
       "4. CURRENT MARKET VALUE:\n"
       "5. WORLD or UNITED STATES DISTRIBUTION:\n"
       "6. RECYCLED:\n"
       "7. SOURCE OF YOUR INFORMATION:")

# ---------------------------------------------------------------- page 27 (printed 21)
bq(27, "(C) CARD 1\n"
       "Assigned mineral or commodity: CADMIUM\n"
       "1. CHEMICAL COMPOSITION: Symbol Cd.\n"
       "2. SOURCE: Ore mineral, Greenockite CdS, and Sphalerite "
       "(Zn,Cd)S. Cadium is associated with zinc deposits. Sphalerite "
       "is found almost entirely in hydrothermal deposits. "
       "“Sedimentary exhalative (sedex) deposits consist of layers "
       "of lead-zinc-iron sulfide that were precipitated by submarine "
       "hot springs that flowed into basins filled with fine-grained, "
       "clastic sediments” (Kesler, 1994, p. 215).\n"
       "3. HOW IS IT MINED? Extracted as a byproduct of the mining and "
       "processing of zinc ores. “Primary cadmium metal in the "
       "United States is produced by two companies, one in Illinois and "
       "one in Tennessee, as a byproduct of smelting and refining of "
       "zinc metals from sulfide ore concentrates” (USGS, 2005a).\n"
       "4. WHERE IS IT FOUND? Cadmium is refined in 27 countries. The "
       "United States is the world’s second largest refiner.\n"
       "5. NAME TWO USES:\n"
       "(a) Seventy-five percent of the cadium consumed goes into "
       "nickel cadium (NiCd) batteries.\n"
       "(b) Twelve percent of the cadium consumed is used as pigments "
       "for glass, plastics, and paints.\n"
       "6. SOURCE OF YOUR INFORMATION. Kesler, 1994; Butterman and "
       "Plachy, 2004.")
bq(27, "(D) CARD 2\n"
       "Assigned mineral or commodity: CADMIUM\n"
       "1. DOMESTIC PRODUCTION: 700 metric tons (2002 data).\n"
       "2. DOMESTIC CONSUMPTION: 2,250 metric tons (2002 data). The "
       "United States is the third largest world consumer of cadmium.\n"
       "3. U.S. IMPORTS: 25 metric tons (2002 data).\n"
       "4. CURRENT MARKET VALUE: $639.00/metric ton (2002 data).\n"
       "5: WORLD or UNITED STATES DISTRIBUTION: Refined in 27 "
       "countries.\n"
       "6. RECYCLED: In the United States the recycling of NiCd "
       "batteries provides a source of secondary cadmium (Plachy, "
       "2003).\n"
       "7. SOURCE OF YOUR INFORMATION: Kesler, 1994; Kelley and others, "
       "2004; Plachy, 2003; USGS, 2004 and 2005a.")

# ---------------------------------------------------------------- page 28 (printed 22)
h(28, 3, "Activity 10—Personal Mineral Consumption")
bold_p(28, "Suggested Grade Level: 5 through 8")
bold_p(28, "Objective: Students will calculate the total amount of "
           "selected minerals they consume in a lifetime. The exercise "
           "will look at mineral production from the “demand "
           "side”—what we consume on a yearly basis. The "
           "exercise will also help students learn to critically think "
           "about how their lives may be affected if the supply "
           "(availability) of a mineral resource changes.",
       label="Objective:")
bold_p(28, "Materials:")
ul(28, ["Figure 6", "Copy of worksheet 1 and 2 (figs. 7, 8)"])
bold_p(28, "Instructions:")
p(28, "This exercise can be done on an individual basis or as a class "
      "project. Have the students find the current cost for the "
      "commodities listed on worksheet 1 and complete worksheets 1 and "
      "2. Mineral and economic information can be obtained from the "
      "following sources:")
ul(28, [
    "Business section of most major newspapers, such as the New York "
    "Times, Wall Street Journal, Financial Times.",
    "Mineral and Economic information from the USGS (2004 and 2005c).",
    "Doing an on-line search for a specific commodity.",
])
img(28, "fig6-every-american.jpg",
    "A black-and-white cartoon titled “Every American Born Will "
    "Need . . .” of a baby lying on its back, surrounded by "
    "fifteen labeled quantities of minerals, metals, and fuels: 1,390 "
    "lbs. Copper; 20,226 lbs. Clays; 29,336 lbs. Salt; 772 lbs. Zinc; "
    "1.55 million lbs. Stone, Sand, & Gravel; 81,518 gallons "
    "Petroleum; 65,543 lbs. Cement; 1.279 Troy oz. Gold; 573,056 lbs. "
    "Coal; +48,096 lbs. Other Minerals & Metals; 21,848 lbs. "
    "Phosphate Rock; 4,864 lbs. Bauxite (Aluminum); 849 lbs. Lead; "
    "32,810 lbs. Iron Ore; and 5.78 million cu. ft. of Natural Gas. A "
    "line beneath the drawing reads “3.5 million pounds of "
    "minerals, metals, and fuels in a lifetime,” with the credit "
    "“© 2004 Mineral Information Institute Golden, "
    "Colorado.”",
    caption="Figure 6. Every American Born Will Need...(from Mineral "
            "Information Institute, 2004b; used with permission).")
bold_p(28, "Using Worksheet 1:")
step_list(28, [
    "STEP 1. Our society is based on mineral resources. Column A lists "
    "eight minerals or commodities that we use on a daily basis, "
    "whether metals for machinery, mineral fertilizers for agriculture, "
    "or aggregates for construction. Have the students look at the list "
    "and have them name several products which are made from the "
    "minerals or commodities listed in column A. (Refer to appendix 2, "
    "Minerals and Their Uses.) The values obtained for this exercise "
    "are the values listed for each commodity in fig. 9. (Note: For the "
    "purpose of this exercise, we have combined the 1.55 million pounds "
    "of stone, sand, and gravel (fig. 9) as one entry—1.55 "
    "million pounds of sand/gravel (construction)).",
    "STEP 2. Column B lists the estimated number of pounds (or metric "
    "ton equivalent) of each commodity that a person will use in "
    "his/her lifetime. Determine the cost per pound or metric ton for "
    "each commodity and enter the number in the appropriate "
    "column—column C, cost per pound, or column D, cost per "
    "metric ton. Note that the cost for aluminum, copper, and lead is "
    "usually quoted in dollars per pound ($/pound); cost for cement, "
    "iron ore, phosphate, salt, and sand/gravel is usually quoted in "
    "dollars per metric ton ($/ton).",
    "STEP 3. Multiply the price in column B (pounds or metric ton) "
    "times either column C (Cost $/pound) or D (Cost $/metric ton) and "
    "enter the number in column E. Column E will give you the total "
    "value ($) of the commodity you consumed in your lifetime.",
    "STEP 4. Next divide column E by 75 (estimated life expectancy) and "
    "enter the number in column F. Column F will give you the dollar "
    "value for each commodity you use per year.",
    "STEP 5. Total the values for column E and column F and enter them "
    "at the bottom right of the worksheet.",
])
bold_p(28, "Using Worksheet 2:")
step_list(28, [
    "STEP 1. Write the total value obtained from worksheet 1, column "
    "F, in column A of worksheet 2.",
    "STEP 2. Write your age in column B.",
    "STEP 3. Multiply column A (Total $ Value used/year) times column "
    "B (Your age) and enter the number in column C. Column C "
    "represents the dollar amount of the selected commodities you have "
    "used since you were born (Total $ Value used).",
    "STEP 4. Subtract your age from 75. Multiply this value with the "
    "value in column A and enter it in column D. This will give you "
    "the Total future $ Value used.",
    "STEP 5. Add the values from column C and D together and enter it "
    "in column E. Column E represents the $ Value used in a lifetime. "
    "(Note: this should be the same value, to the nearest dollar, as "
    "the total value for column E on worksheet 1.)",
])
p(28, "Examples of completed worksheets 1 and 2 are given in figure 9.")
bold_p(28, "Evaluation and Discussion:")
p(28, "Have students study one resource and write an essay on how "
      "their lives would change if that resource were no longer "
      "available. Have the students think about the following:")
ul(28, [
    "1. Why would a resource become rare?",
    "2. Is it renewable or nonrenewable?",
])

# ---------------------------------------------------------------- page 29 (printed 23)
# The source's own numbering runs ...7, then 9, 10 - there is no item 8.
# Carried verbatim.
ul(29, [
    "3. What is its global distribution, and what nations have the "
    "most of the resource?",
    "4. What are the costs related to extraction and processing of the "
    "resource? How does cost affect the demand for the resource?",
    "5. What is the relationship between the value of the resource and "
    "gross domestic productivity?",
    "6. What has happened to the price of the resource through time",
    "7. What would happen to demand if the population increased or "
    "decreased?",
    "9. What would happen to demand if the resource was found only in "
    "one or two nations?",
    "10. What would happen to demand if a “substitute” "
    "commodity was found?",
])
p(29, "An excellent source for understanding how the United States "
      "nonfuel mineral industry has changed through time is presented "
      "by the USGS (2005b):")
bq(29, "At the beginning of the [20th] century, some minerals and "
       "metals industries were well established, such as those of "
       "copper, gold, lead, lime, and salt; some industries were just "
       "beginning, such as aluminum and lithium; and some materials, "
       "such as germanium, magnesium, and titanium, had not been "
       "commercially produced. Mining was labor intensive and could be "
       "dangerous. In 1900, U.S. minerals consumption was less than "
       "100 million metric tons. By 2000, U.S. minerals consumption "
       "had increased to more than 3.3 billion metric tons, and "
       "included not only the materials that constitute the bulk of "
       "consumption—crushed stone and steel—but some of "
       "the materials for which there were no uses in 1900. Improved "
       "safety measures and technological advancements in mining and "
       "processing methods have made mining safer and increased "
       "efficiency. The time line showing events that have affected "
       "the U.S. minerals industry during the 20th century is a "
       "representative list of individual events that have influenced "
       "the production and/or consumption of a single commodity or a "
       "group of commodities. In many cases, changes to the U.S. "
       "minerals industry were evolutionary and not marked by a "
       "single event. For example, the development of the electrical "
       "power generation and distribution industries throughout the "
       "first half of the 20th century provided new markets for "
       "aluminum, copper, and steel, but no one event in this time "
       "period is considered to be pivotal.")
p(29, "An additional source of historical information is presented by "
      "Moyer (2004) as an on-line PowerPoint digital movie package "
      "that displays patterns of Nevada mineral activity from 1851 to "
      "1995 and historical factors that influenced these patterns. The "
      "digital package consists of a full length educational movie "
      "with text and two short animations showing the evolving "
      "patterns of significant Nevada mineral deposits and mining "
      "districts over selected decades.")

# ---------------------------------------------------------------- page 30 (printed 24, landscape)
# Figure 7 is a cut-out worksheet drawn as vector art. Rebuilt as a real
# table so the content is machine-readable; the spanned source header
# "Amount used per American in a lifetime" over Pounds/Metric tons is
# flattened into the two column names.
tbl(30, "Figure 7. Worksheet 1 Activity 10—personal mineral "
        "consumption.",
    ["A: Mineral/commodity",
     "B: Pounds (Amount used per American in a lifetime)",
     "B: Metric tons (Amount used per American in a lifetime)",
     "C: Cost $/pound", "D: Cost $/metric ton",
     "E: $ Value used in a lifetime", "F: $ Value used per year"],
    # The "$" cells are the worksheet's preprinted currency prompts
    # (independent verification 2026-08-10, table-005: dropping them was
    # a discrepancy). Column C has no preprinted "$" in the source.
    [["Aluminum", "4864", "2.4", "", "$", "$", "$"],
     ["Cement", "65,543", "32.7", "", "$", "$", "$"],
     ["Copper", "1390", "0.69", "", "$", "$", "$"],
     ["Iron ore", "32,810", "16.4", "", "$", "$", "$"],
     ["Lead", "849", "0.42", "", "$", "$", "$"],
     ["Phosphate", "21,848", "10.92", "", "$", "$", "$"],
     ["Salt", "32,061", "16.03", "", "$", "$", "$"],
     ["Sand/gravel (construction)", "1,550,000", "775.00", "", "$", "$",
      "$"],
     ["TOTAL", "", "", "", "", "$", "$"]])

# ---------------------------------------------------------------- page 31 (printed 25, landscape)
tbl(31, "Figure 8. Worksheet 2 Activity 10—personal mineral "
        "consumption.",
    ["A: Total $ Value used/year", "B: Your age", "C: Total $ Value used",
     "D: Total future $ Value used", "E: $ Value used in a lifetime"],
    # Preprinted "$" prompts carried (verification 2026-08-10, table-006);
    # the age column has none.
    [["$", "", "$", "$", "$"],
     ["$", "", "$", "$", "$"],
     ["$", "", "$", "$", "$"],
     ["$", "", "$", "$", "$"]],
    row_headers=False)

# ---------------------------------------------------------------- page 32 (printed 26)
bold_p(32, "Worksheet 1")
tbl(32, "Worksheet 1 (completed example)",
    ["A: Mineral/commodity",
     "B: Pounds (Amount used per American in a lifetime)",
     "B: Metric tons (Amount used per American in a lifetime)",
     "C: Cost $/pound", "D: Cost $/metric ton",
     "E: $ Value used in a lifetime", "F: $ Value used per year"],
    [["Aluminum", "4864", "2.4", "", "$1,550.00", "$3,720.00", "$49.60"],
     ["Cement", "65,543", "32.7", "", "$76.00", "$2,485.20", "$33.14"],
     ["Copper", "1390", "0.69", "", "$1,559.00", "$1,075.71", "$14.34"],
     ["Iron ore", "32,810", "16.4", "", "$25.83", "$423.61", "$5.65"],
     ["Lead", "849", "0.42", "", "$961.00", "$403.62", "$5.38"],
     ["Phosphate", "21,848", "10.92", "", "$28.75", "$313.95", "$4.19"],
     ["Salt", "32,061", "16.03", "", "$26.29", "$421.43", "$5.62"],
     ["Sand/gravel (construction)", "1,550,000", "775.00", "", "$5.07",
      "$3,929.25", "$52.39"],
     ["TOTAL", "", "", "", "", "$12,772.77", "$170.30"]])
bold_p(32, "Worksheet 2")
tbl(32, "Worksheet 2 (completed example)",
    ["A: Total $ Value use/year", "B: Your age", "C: Total $ Value used",
     "D: Total future $ Value used", "E: $ Value used in a lifetime"],
    [["$170.30", "8", "$1,362.40", "$11,410.10", "$12,772.50"],
     ["$170.30", "10", "$1,703.00", "$11,069.50", "$12,772.50"],
     ["$170.30", "12", "$2,043.60", "$10,728.90", "$12,772.50"],
     ["$170.30", "14", "$2,384.20", "$10,388.30", "$12,772.50"]],
    row_headers=False)
bold_p(32, "Values set at 1992 prices. Current prices can be found at "
           "http://minerals.usgs.gov/minerals/pubs/mcs/.")
p(32, "Figure 9. Examples of completed worksheets for Activity 10.")

# ---------------------------------------------------------------- page 33 (printed 27)
h(33, 2, "How to Obtain Mineral Specimens")
_t = ("There are many sources for mineral specimens. Check your local "
      "yellow pages under lapidary, rock or gem shop, or mineral "
      "specimens. Many operating mines and mining companies have "
      "websites, and some active mines will send ore if you request it. "
      "To find a location of a mine, go to the U.S. Geological Survey "
      "Minerals Web Site (http://minerals.usgs.gov/minerals) and select "
      "the Mine and Mineral Processing Plant Locations link. The "
      "Association of American State Geologists "
      "(http://www.stategeologists.org/) lists individual state "
      "geological surveys that may have additional information on mines "
      "and mining in their states.")
p(33, _t, runs=mk_runs(_t, [
    ("http://minerals.usgs.gov/minerals", "normal",
     "http://minerals.usgs.gov/minerals"),
    ("http://www.stategeologists.org/", "normal",
     "http://www.stategeologists.org/"),
]))
h(33, 2, "Selected References")
for _ref in [
    "Alpha, T.A., and Lahr, J.C., 1990, Seven paper models that "
    "describe faulting in the Earth: U.S. Geological Survey Open-File "
    "Report 90-257. [URL: "
    "http://wrgis.wr.usgs.gov/docs/parks/deform/7modelsa.html].",
    "American Geological Institute, 2005, Earth Science "
    "Week—Plan an activity for your class or group: [URL: "
    "http://www.earthsciweek.org/forteachers/index.html].",
    "Barthelmy, David, 2005, Mineralogy Database: [URL: "
    "http://webmineral.com/index.shtml].",
    "Bat Conservation International, 2004, Bat and Mines "
    "(Introduction) [To tour a mine click on “Idaho Mine "
    "Survey”]: [URL: http://www.batcon.org/mines/].",
    "Brown, Phil, 2004, Extraction of Metals: [URL: "
    "http://www.wpbschoolhouse.btinternet.co.uk/page04/"
    "Mextract.htm#copper/].",
    "Butterman, W.C., and Plachy, Jozef, 2004, Mineral commodity "
    "profiles—Cadmium: U.S. Geological Survey Open-File Report "
    "02-238 [URL: http://pubs.usgs.gov/of/2002/of02-238/].",
    "California Office of Mine Reclamation, 2004:[URL: "
    "http://www.consrv.ca.gov/omr/reclamation/index.htm].",
    "Cox, D.P., and Singer, D.A., eds., 1986, Mineral deposit models: "
    "U.S. Geological Survey Bulletin 1693, 379 p. [URL: "
    "http://pubs.usgs.gov/bul/b1693/html/bullfrms.htm].",
    "Francek, M.A., and Winstanley, J.D.W., 2004, Using food to "
    "demonstrate earth science concepts—A review: Journal of "
    "Geoscience Education, v. 52, no. 2, p. 154-160.",
    "Frank, Dave, Weathers, Judy, and Galloway, John, 2001, Mineral "
    "resources out of the ground into our daily lives: U.S. Geological "
    "Survey Open-File Report 01-360 [URL: "
    "http://geopubs.wr.usgs.gov/open-file/of01-360/].",
    "Goonan, T.G., 1999, Recycled aggregates—profitable "
    "resource conservation: U.S. Geological Survey, Fact Sheet "
    "FS-181-99 [URL: http://pubs.usgs.gov/fs/fs-0181-99/].",
    "Hudson, T.L., Fox, F.D., and Plumlee, G.S., 1999, Metal mining "
    "and the environment: Alexandria, Virginia, American Geological "
    "Institute, AGI Environmental Awareness Series 3, 64 p.",
    "Kelly, Thomas, Buckingham, David, DiFrancesco, Carl, Porter, "
    "Kenneth, Goonan, Thomas, Sznopek, John, Berry, Cyrus, and Crane, "
    "Melissa, 2004, Historical statistics for mineral and material "
    "commodities in the United States: U.S. Geological Survey "
    "Open-File Report 01-006: [URL: "
    "http://minerals.usgs.gov/minerals/pubs/of01-006/].",
    "Kesler, S.E., 1994, Mineral resources, economics, and the "
    "environment: New York, N.Y., MacMillan College Publishing "
    "Company, 391 p.",
    "Kious, W.J., and Tilling, R.I., 1996, This dynamic "
    "planet—The story of plate tectonics: U.S. Geological "
    "Survey, 77 p. [URL: "
    "http://pubs.usgs.gov/publications/text/dynamic.html].",
    "MacLaren, D.C., and White, M.A., 2003, Cement—Its "
    "chemistry and properties: Journal of Chemical Education, v. 80, "
    "no. 6, p. 623-635.",
    "Mineral Information Institute, 2004a, The Role of Elements in "
    "Life Processes: [URL: "
    "http://www.mii.org/periodic/LifeElement.html].",
    "Mineral Information Institute, 2004b, Every American born will "
    "need...: [URL: http://www.mii.org/].",
    "Moyer, L.A., 2004, Mining activity in Nevada 1851-1995: [URL: "
    "http://pubs.usgs.gov/of/2004/1244/]",
    "National Research Council, 1996, National Science Education "
    "Standards: [URL: "
    "http://www.nap.edu/readingroom/books/nses/html/].",
    "Nave, C.R., 2000, HyperPhysics CD-ROM, Department of Physics and "
    "Astronomy, Georgia State University [URL: "
    "http://hyperphysics.phy-astr.gsu.edu/hbase/hframe.html]. (Click "
    "“Geophysics,” then on “Minerals,” and "
    "“abundances of elements.”)",
    "Neuendorf, K.K.E., Mehl, J.P., Jr., and Jackson, J.A., eds., "
    "1997, Glossary of Geology, 5th ed.: Washington, D.C., American "
    "Geological Institute, 800 p.",
    "Plachy, Jozef, 2003 Cadmium recycling in the United States in "
    "2000: U.S. Geological Survey Circular 1196: Online only version "
    "1.0 [URL: http://pubs.usgs.gov/circ/c1196o/].",
    "Plante, Alan, Peck, Donald, and von Bargen, Donald, 2003, "
    "Mineral Identification Key II: [URL: "
    "http://www.minsocam.org/MSA/collectors_corner/id/"
    "mineral_id_keyi1.htm].",
    "Prencipe, M., Masters, J.G., Thomas, K.P., and Novfleet, J., "
    "1995, Squeezing out a better toothpaste: American Chemical "
    "Society, Chemtech, Dec. 1995 "
    "[http://pubs.acs.org/hotartcl/chemtech/95/dec/dec.html].",
]:
    p(33, _ref)

# ---------------------------------------------------------------- page 34 (printed 28)
for _ref in [
    "Schneider, Mark, 2003, Cupcake core sample, Iowa 4-9 Science "
    "Project: [URL: "
    "http://www.aea10.k12.ia.us/curr/science/sci4-9/Geology/"
    "Geolo463.html].",
    "Simkin, Tom, Unger, J.D., Tilling, R.I., Vogt, P.R., and Spall, "
    "Henry, 1994, This Dynamic Planet: World map of volcanoes, "
    "earthquakes, impact craters, and plate tectonics: U.S. Geological "
    "Survey, scale 1:30,000,000, 1 sheet [URL: "
    "http://pubs.usgs.gov/pdf/planet.html].",
    "Singer, D.A., 1995, World-class base and precious metal "
    "deposits—A quantitative analysis: Economic Geology, v. 90, "
    "p. 88-104.",
    "Skinner, B.J., 1976, A second Iron Age ahead?: American "
    "Scientists, v. 64, no. 3, p. 258-269.",
    "Stalter, Pam, 2003, Peanut Butter/Jelly Geology, Iowa 4-9 "
    "Science Project: [URL: "
    "http://www.aea10.k12.ia.us/curr/science/sci4-9/Landform/"
    "LANDF481.html].",
    "Stoeser, D.B., and Heran, W.D., eds., 2000, USGS mineral deposit "
    "models: U.S. Geological Survey Digital Data Series DDS-64, "
    "CD-ROM [URL: http://minerals.cr.usgs.gov/team/depmod.html].",
    "Stoffer, Philip, 2002, Rocks and geology in the San Francisco "
    "Bay Region: U.S. Geological Survey Bulletin 2195 [URL "
    "http://geopubs.wr.usgs.gov/bulletin/b2195/].",
    "Tepordei, V.V., 1997, Natural aggregates—foundation of "
    "America’s future: U.S. Geological Survey, Fact Sheet "
    "FS-144-97 [URL: "
    "http://minerals.usgs.gov/minerals/pubs/commodity/aggregates/"
    "fs14497.pdf].",
    "University of California, 2000, Material Resources: The Regents "
    "of the University of Californian [URL: "
    "http://www.sepup.com/docs1/SnS_print_samples.pdf/SnS_TG-24_"
    "Copier_Extraction.pdf].",
    "U.S. Geological Survey, 2002, A Model of three faults: U.S. "
    "Geological Survey Learning Web [URL: "
    "http://interactive2.usgs.gov/learningweb/teachers/faults.htm].",
    "U.S. Geological Survey, 2004, Metal Prices in the United States "
    "through 1998: [URL: "
    "http://minerals.usgs.gov/minerals/pubs/metal_prices/].",
    "U.S. Geological Survey, 2005a, Minerals Information: [URL: "
    "http://minerals.usgs.gov/minerals/].",
    "U.S. Geological Survey, 2005b, Events Affecting the U.S. Nonfuel "
    "Minerals Industry 1900-2000: [URL: "
    "http://minerals.usgs.gov/minerals/pubs/commodity/timeline/].",
    "U.S. Geological Survey, 2005c, Mineral commodities summaries: "
    "[URL: http://minerals.usgs.gov/minerals/pubs/mcs/].",
    "Weathers, Judy, Galloway, John, and Frank, Dave, 2001, Minerals "
    "in our environment: U.S. Geological Survey Open-File Report "
    "00-144, print on demand version 1.0 [URL: "
    "http://geopubs.wr.usgs.gov/open-file/of00-144/].",
    "Weisgarber, S.L., and Van Doren, Lisa, 2004, Rocks and minerals "
    "everywhere: Ohio Department of Natural Resources Hands on Earth "
    "Science No. 6 [URL: "
    "http://www.dnr.state.oh.us/geosurvey/pdf/ho06.pdf].",
    "Winter, Mark, 2005, WebElementsTM Periodic Table: [URL: "
    "http://www.webelements.com/].",
    "Women in Mining Education Foundation, 2004, Classroom "
    "Activities: [URL: http://www.womeninmining.org/activity.htm]",
]:
    p(34, _ref)

# ---------------------------------------------------------------- page 35 (printed 29, divider)
h(35, 2, "Appendixes 1–2")

# ---------------------------------------------------------------- pages 36-37 (printed 30-31)
h(36, 2, "Appendix 1.—Glossary")


def gloss(page, term, definition):
    """Glossary entry: bold run-in term + definition, one paragraph, the
    i1040 'Definitions' precedent adapted to run-in style: term as h4 would
    bloat the outline (39 terms), so the term is a bold run instead."""
    text = term + " " + definition
    p(page, text, runs=mk_runs(text, [(term, "bold")]))


_GLOSSARY_36 = [
    ("Aggregates", "Particles of rocks. Natural sand, gravel, and "
     "crushed rock are important aggregates used in the construction "
     "industry."),
    ("Anticline", "Layers of rock folded into the shape of an arch. The "
     "youngest rock layers are on the outer layer of the arch, and the "
     "oldest layers are at the core of the fold. Anticlines with "
     "reservoir-quality rocks in their core and impermeable rocks in the "
     "outer layers of the fold are excellent traps for oil and gas and "
     "are therefore important in petroleum exploration and extraction. "
     "The opposite of a syncline."),
    ("Asthenosphere", "The layer of the Earth’s interior below the "
     "lithosphere. The “plastic-like”material in the "
     "asthenosphere is weak, able to flow and convect, and the rigid "
     "tectonic plates of the lithosphere rest on and move over the "
     "asthenosphere."),
    ("Average crustal abundance", "The average amount of an element "
     "contained in the Earth’s crust."),
    ("Bedrock", "Solid rock that underlies unconsolidated material "
     "(sediments) near the surface."),
    ("Beneficiation", "Improvement of the grade of ore by milling, "
     "floatation, sintering, gravity, concentration, or other process."),
    ("Byproduct", "A secondary or additional product; something "
     "produced, as in the course of a manufacture, in addition to the "
     "principal product."),
    ("Commodity", "An article of trade or commerce, especially an "
     "agricultural or mining product that can be processed and resold."),
    ("Covergent boundary", "A boundary where two of the Earth’s "
     "tectonic plates are moving toward one another. Most convergent "
     "plate boundaries are called “subduction zones” because "
     "one of the plates moves down, or is “subducted,” "
     "beneath the other. A subduction zone is usually marked by a deep "
     "trench on the sea floor. An example is the Cascadia Subduction "
     "Zone offshore of Washington, Oregon, and northern California. "
     "Earthquakes in subduction zones are common."),
    ("Divergent boundary", "A boundary where two of the Earth’s "
     "tectonic plates are moving away from each other. This generally "
     "occurs along “oceanic spreading ridges,” submarine "
     "features that are impressive mountain ranges. New ocean floor is "
     "produced along the spreading ridges as molten rock (magma) from "
     "the Earth’s mantle rises into their crests (axes) to form "
     "new oceanic crust. About an equal volume of old crust is lost each "
     "year along convergent plate boundaries, so the overall size of the "
     "Earth stays the same."),
    ("Erosion", "The general process by which the materials of the "
     "Earth’s crust are loosened, dissolved, or worn away and "
     "simultaneously moved from one place to another by natural "
     "agencies."),
    ("Fault", "A fracture or crack along which two blocks of rock slide "
     "past one another. Blocks can be displaced vertically (vertical "
     "fault) or horizontally (lateral or strike-slip fault). Movement on "
     "active faults may occur rapidly, in the form of an earthquake, or "
     "slowly."),
    ("Grade of ore", "The concentration of a desired commodity within "
     "an ore deposit."),
    ("Hydrosphere", "The hydrosphere includes all water on Earth."),
    ("Igneous rock", "Rock formed when molten rock has cooled and "
     "solidified, either intrusive (granite) cooling inside the Earth or "
     "extrusive (basalt) cooling on the surface."),
    ("Lithosphere", "The outermost shell of the Earth, which is "
     "composed of a mosaic of a dozen or so large, rigid slabs of rock "
     "called “lithospheric” or “tectonic” "
     "plates."),
    ("Mafic", "Dark-colored intrusive igneous rock, such as basalt, "
     "composed chiefly of minerals such as olivine and pyroxene that "
     "contain abundant magnesium and iron. The term mafic also applies "
     "to dark-colored minerals rich in iron and magnesium as a group and "
     "to metamorphic rocks composed of these minerals."),
    ("Metallic mineral", "A naturally occurring substance that has "
     "metallic properties, such as high luster, conductivity, "
     "opaqueness, and ductility; pertaining to minerals from which a "
     "metal or metals can be extracted."),
    ("Metamorphic rock", "Any rock derived from preexisting rocks by "
     "mineralogical, chemical, and (or) structural changes, essentially "
     "in the solid state, in response to marked changes in temperature, "
     "pressure, shearing stress, and chemical environment, generally at "
     "depth in the Earth’s crust."),
    ("Mineral", "A naturally occurring inorganic element or compound "
     "having an orderly internal structure and characteristic chemical "
     "composition, crystal form, and physical properties."),
    ("Mineralization", "The process or processes by which a mineral or "
     "minerals are introduced into a rock, resulting in a valuable or "
     "potentially valuable deposit."),
    ("Mineral deposit", "A mineral occurrence of sufficient size and "
     "grade (concentration) that it might, under the most favorable of "
     "circumstances, be considered to have economic potential."),
    ("Mineral occurrence", "A concentration of a mineral (usually "
     "considered in terms of some commodity, such as gold) that is "
     "considered valuable by someone somewhere or that is of scientific "
     "or technical interest. In rare instances, the commodity might not "
     "even be concentrated above its average crustal abundance."),
    ("Mining life-cycle", "The processes of deposit exploration and "
     "identification; quantitative and qualitative measurement of the "
     "deposit; extraction of material and ore beneficiation; and site "
     "reclamation."),
]
for _term, _definition in _GLOSSARY_36:
    gloss(36, _term, _definition)

_GLOSSARY_37 = [
    ("Muck", "The material left behind after blasting during the "
     "underground mining process."),
    ("Non-metallic mineral", "A naturally occurring substance that does "
     "not have metallic properties, such as high luster, conductivity, "
     "opaqueness, and ductility."),
    ("Ore deposit", "A mineral deposit that has been tested and is "
     "known to be of sufficient size, grade, and accessibility to be "
     "producible at a profit."),
    ("Reclamation", "The process of reestablishing stable soils and "
     "vegetation in disturbed areas."),
    ("Sedimentary rock", "A “clastic” rock resulting from "
     "the consolidation of loose fragments of mechanically formed "
     "fragments of older rocks (sandstone), a “chemical” "
     "rock formed by precipitation (salt), or an “organic” "
     "rock composed of the remains or secretions of plants and animals "
     "(certain limestones)."),
    ("Spreading center", "Associated with a divergent boundary. A "
     "spreading center is an area where new crust is formed."),
    ("Subduction zone", "Associated with a convergent boundary. A "
     "region where one crustal block descends beneath another crustal "
     "block"),
    ("Syncline", "Layers of rock folded into the shape of a trough or "
     "“U.” The youngest rock layers are at the core of the "
     "fold, and the oldest layers on the outer surface of the fold. "
     "Synclines do not usually form traps for oil and gas. The opposite "
     "of an anticline."),
    ("Tectonic plate", "One of the several large, relatively strong "
     "“plates” that constitute the Earth’s outer "
     "layer. Convection in the underlying astenoshere causes these "
     "plates to move relative to each other at an average rate of less "
     "than an inch per year. Movements on the faults that define plate "
     "boundaries produce most earthquakes."),
    ("Tectonics", "A branch of geology dealing with the broad "
     "architecture of the outer part of the Earth, that is, the regional "
     "assembling of structural or deformational features, a study of "
     "their mutual relations, origin and historical evolution."),
    ("Ultramafic", "Igneous rocks with very low silica content (less "
     "than 45%), usually composed of greater than 90 % mafic minerals. "
     "Such rocks are typical of the Earth’s mantle."),
    ("Unconformity", "A surface or break between layers of rock "
     "representing a substantial gap in geologic time. For example, such "
     "a break exists where a rock unit overlies the heavily eroded "
     "surface of an older rock unit."),
    ("Vein", "A fracture in rock that has been sealed with minerals "
     "precipitated from a solution."),
    ("Weight percent", "The percentage of a component relative to the "
     "total weight of an item. A common way to express concentrations of "
     "an element, sometimes referred to as mass percent."),
]
for _term, _definition in _GLOSSARY_37:
    gloss(37, _term, _definition)

# ---------------------------------------------------------------- page 38 (printed 32)
h(38, 2, "Appendix 2.—Minerals and Their Uses")
p(38, "Every segment of society uses minerals and mineral resources "
      "everyday. The roads we ride or drive on and the buildings we live "
      "learn and work in all contain minerals. Below is a selected list "
      "of commonly used metallic and nonmetallic minerals, ore minerals, "
      "mineral byproducts, aggregates, and rock types that are used to "
      "make products we use in our daily life (see Frank, Weathers, and "
      "Galloway, 2001; Weathers, Galloway, and Frank, 2001).")
_APPENDIX2_38 = [
    ("Aggregates", "Natural aggregates include sand, gravel, and "
     "crushed stone. Aggregates are composed of rock fragments that may "
     "be used in their natural state or after mechanical processing, "
     "such as crushing, washing, or sizing. Recycled aggregates consist "
     "mainly of crushed concrete and crushed asphalt pavement (Goonan, "
     "1999). For additional information on aggregates see Tepordei "
     "(1997)."),
    ("Aluminum", "Aluminum is the most abundant metallic element in "
     "the Earth’s crust. Bauxite ore is the main source of "
     "aluminum. Aluminum is used in automobiles and airplanes (36%), "
     "bottling and canning industries (25%), building and electrical "
     "(14%) and in other applications (25%)."),
    ("Asbestos", "Asbestos is a class of minerals that can be readily "
     "separated into thin, strong fibers that are flexible, heat "
     "resistant, and chemically inert. Asbestos minerals are used in "
     "fireproof fabrics, yarn, cloth, and paper and paint filler. "
     "Asbestos is used to make friction products, asbestos cement pipes "
     "and sheets, coatings and compounds, packing and gaskets, roofing "
     "and flooring products, paints and caulking, and chemical filters. "
     "Fibers are dangerous when breathed, so uses must protect against "
     "fibers becoming airborne."),
    ("Basalt", "Basalt is an extrusive igneous rock. Crushed basalt is "
     "used for railroad ballast, aggregate in highway construction, and "
     "is a major component of asphalt."),
    ("Barium", "Barium is an element, derived primarily from the "
     "mineral barite, and used as a heavy additive in "
     "oil-well-drilling mud, paints, rubber, plastic and paper; "
     "production of barium chemicals; and glass manufacturing."),
    ("Beryllium", "Beryllium, an element commonly associated with "
     "igneous rocks, has industrial and nuclear defense applications "
     "and is used in light, very strong alloys for the aircraft "
     "industry. Beryllium salts are used in x-ray tubes and as a "
     "deoxidizer in bronze metallurgy. The gemstones of beryl, a "
     "beryllium mineral, are emerald and aquamarine."),
    ("Bromine", "Bromine, recovered commercially through the treatment "
     "of seawater brines, is used in leaded gasoline, fire "
     "extinguishers and retardants, well-completion fluids, and "
     "sanitary preparations. Bromine is the only liquid nonmetallic "
     "element."),
    ("Cadmium", "Cadmium is used in plating and alloying, pigments, "
     "plastics, and batteries. Cadmium is obtained from the ore "
     "minerals Sphalerite (Zn,Cd)S and Greenockite (CdS)"),
    ("Cement", "Cement is used for building materials, stucco, and "
     "mortar. Cement is “a mixture of powdered lime, clay, and "
     "other minerals that crystallize to form a hard solid when water "
     "is added (hydraulic cement) or as a binding material in "
     "concrete” (Kesler, 1994). An excellent overview of cement, "
     "its chemistry, and properties can be found in MacLaren and White "
     "(2003)."),
    ("Chromium", "Chromium is used in the production of stainless and "
     "heat-resistant steel, full-alloy steel, super alloys and other "
     "alloys. Chromium is obtained from the ore mineral Chromite "
     "(Mg,Fe)(Cr,Al,Fe)2O4"),
    ("Clays", "There are many different clay minerals that are used "
     "for industrial applications. Clays are used in the manufacturing "
     "of paper, refractories, rubber, ball clay, dinnerware and "
     "pottery, floor and wall tile, sanitary wear, fire clay, "
     "firebricks, foundry sands, drilling mud, iron-ore pelletizing, "
     "absorbent and filtering materials, construction materials, and "
     "cosmetics."),
    ("Cobalt", "Half of the consumption of cobalt is used in "
     "corrosion- and abrasion-resistant alloys with steel, nickel, and "
     "other metals for the production of industrial engines. Other "
     "uses of cobalt metal include magnets and cutting tools. Cobalt "
     "salts are used to produce a blue color in paint pigments, "
     "porcelain, glass, and pottery. Cobalt is obtained from the ore "
     "minerals Linneaite (Co3S4), Cobaltite (Mg,Fe)(Cr,Al,Fe)2O4, and "
     "(Fe,Ni,Co)1-xSx."),
    ("Copper", "Copper is used in electric cables and wires, switches, "
     "plumbing; heating, electrical, and roofing materials; electronic "
     "components; industrial machinery and equipment; transportation; "
     "consumer and general products; coins; and jewelry."),
    ("Diatomite", "Diatomite is a rock composed of the skeletons of "
     "diatoms, single-celled organisms with skeletons made of silica, "
     "which are found in fresh and salt water. Diatomite is primarily "
     "used for filtration of drinks, such as juices and wines, but it "
     "is also being used as filler in paints and pharmaceuticals and "
     "environmental cleanup technologies."),
    ("Dolomite", "Dolomite is the near twin-sister rock to limestone. "
     "Like limestone, it typically forms in a marine environment but "
     "also as has a primary magnesium component. Dolomite is used in "
     "agriculture, chemical and industrial applications, cement "
     "construction, refractories, and environmental industries."),
    ("Feldspar", "Feldspar is a rock-forming mineral. It is used in "
     "glass and ceramic industries; pottery, porcelain and enamelware; "
     "soaps; bond for abrasive wheels; cement; glues; fertilizer; and "
     "tarred roofing materials and as a sizing, or filler, in textiles "
     "and paper applications."),
]
for _term, _definition in _APPENDIX2_38:
    gloss(38, _term, _definition)

# ---------------------------------------------------------------- page 39 (printed 33)
_APPENDIX2_39 = [
    ("Fluorite", "Fluorite is used in production of hydrofluoric acid, "
     "which is used in the pottery, ceramics, optical, electroplating, "
     "and plastics industries. It is also used in the metallurgical "
     "treatment of bauxite, as a flux in open-hearth steel furnaces, "
     "and in metal smelting, as well as in carbon electrodes, emery "
     "wheels, electric arc welders, and toothpaste as a source of "
     "fluorine."),
    ("Garnet", "Garnet is used in water filtration, electronic "
     "components, ceramics, glass, jewelry, and abrasives used in wood "
     "furniture and transport manufacturing. “Garnet is a common "
     "metamorphic mineral that becomes abundant enough to mine in a "
     "few rocks” (Kesler, 1994)."),
    ("Germanium", "“Most germanium is recovered as a byproduct "
     "of zinc smelting. It is also found in some copper ores” "
     "(Kesler, 1994). Applications include use in fiber-optic "
     "components, which are replacing copper in long-distance "
     "telecommunication lines, as well as in camera lenses and other "
     "glasses and infrared lenses."),
    ("Gold", "Gold is used in dentistry and medicine, jewelry and "
     "arts, medallions and coins, and in ingots. It is also used for "
     "scientific and electronic instruments, computer circuitry, as an "
     "electrolyte in the electroplating industry, and in many "
     "applications for the aerospace industry."),
    ("Granite", "Granite can be cut into large blocks and used as a "
     "building stone. When polished, it is used for monuments, "
     "headstones, countertops, statues, and facing on buildings. It is "
     "also suitable for railroad ballast and for road aggregate in "
     "highway construction."),
    ("Graphite", "Graphite is the crystal form of carbon. Graphite is "
     "used as a dry lubricant and steel hardener and for brake linings "
     "and the production of “lead” in pencils. Most graphite "
     "production comes from Korea, India, and Mexico."),
    ("Gypsum", "Processed gypsum is used in industrial or building "
     "plaster, prefabricated wallboard, cement manufacture, and for "
     "agriculture."),
    ("Halite", "Halite (salt) is used in the human and animal diet, "
     "primarily as food seasoning and as a food preservation. It is "
     "also used to prepare sodium hydroxide, soda ash, caustic soda, "
     "hydrochloric acid, chlorine, and metallic sodium, and it is used "
     "in ceramic glazes, metallurgy, curing of hides, mineral waters, "
     "soap manufacture, home water softeners, highway deicing, "
     "photography, and scientific equipment for optical parts. An "
     "excellent review of the salt industry can be found at "
     "http://www.saltinstitute.org/15.html."),
    ("Industrial Diamond", "Industrial diamonds are those that can "
     "not be used as gems. Large diamonds are used in tools and "
     "drilling bits to cut rock and small stone. Small diamonds, also "
     "known as dust or grit, are used for cutting and polishing stone "
     "and ceramic products."),
    ("Iron Ore", "Iron ore is used to manufacture steels of various "
     "types and other metallurgical products, such as magnets, auto "
     "parts, and catalysts. Most U.S. production is from Minnesota and "
     "Michigan. The Earth’s crust contains about 5% iron, the "
     "fourth most abundant element in the crust."),
    ("Lead", "Lead is used in batteries, construction, ammunition, "
     "television tubes, nuclear shielding, ceramics, weights, and "
     "tubes or containers. The United States is largest producer "
     "(mainly from Missouri), consumer, and recycler of lead metal."),
    ("Limestone", "“A sedimentary rock consisting largely of "
     "the minerals calcite and aragonite, which have the same "
     "composition CaCO3” (Kesler, 1994). Limestone, along with "
     "dolomite, is one of the basic building blocks of the "
     "construction industry. Limestone is used as aggregate, building "
     "stone, cement, and lime and in fluxes, glass, refractories, "
     "fillers, abrasives, soil conditioners, and a host of chemical "
     "processes."),
    ("Magnesium", "Magnesium (see dolomite) is used in cement, "
     "rubber, paper, insulation, chemicals and fertilizers, animal "
     "feed, and pharmaceuticals. Magnesium is obtained from the ore "
     "minerals Olivine (Fe,Mg)2SiO4, Magnesite MgCO3, and Dolomite "
     "CaMg(CO3)2."),
    ("Manganese", "Manganese is essential to iron and steel "
     "production. Manganese is obtained from the ore minerals "
     "Braunite (Mn,Si)2O3, Pyrolusite MnO2, and Psilomelane "
     "BaMn9O18•2H2O."),
    ("Mercury", "Mercury is extracted from the mineral cinnabar and "
     "is used in electrical products, electrolytic production of "
     "chlorine and caustic soda, paint, and industrial and control "
     "instruments (thermometers and thermostats)."),
    ("Mica", "Mica minerals commonly occur as flakes, scales, or "
     "shreds. Sheet muscovite (white) mica is used in electronic "
     "insulators, paints, as joint cement, as a dusting agent, in "
     "well-drilling mud and lubricants, and in plastics, roofing, "
     "rubber, and welding rods."),
    ("Molybdenum", "Molybdenum is used in stainless steels (21%), "
     "tool steels (9%), cast irons (7%), and chemical lubricants "
     "(8%), and in other applications (55%). It is commonly used to "
     "make automotive parts, construction equipment, gas transmission "
     "pipes, and as a pure metal molybdenum is used as filament "
     "supports in light bulbs, metalworking dies, and furnace parts "
     "because of its high melting temperature (2,623°C)."),
    ("Nickel", "Nickel is vital as an alloy to stainless steel, and "
     "it plays a key roll in the chemical and aerospace industries. "
     "Leading producers are Canada, Norway, and Russia."),
    ("Phosphate rock", "Primarily a sedimentary rock used to produce "
     "phosphoric acid and ammoniated phosphate fertilizers, feed "
     "additives for livestock, elemental phosphorus, and a variety of "
     "phosphate chemicals for industrial and home consumers. The "
     "majority of U.S. production comes from Florida, North Carolina, "
     "Idaho, and Utah."),
]
for _term, _definition in _APPENDIX2_39:
    gloss(39, _term, _definition)

# ---------------------------------------------------------------- page 40 (printed 34)
_APPENDIX2_40 = [
    ("Platinum Group Metals (PGMs)", "PGM’s include platinum, "
     "palladium, rhodium, iridium, osmium, and ruthenium. These "
     "elements commonly occur together in nature and are among the "
     "scarcest of the metallic elements. Platinum is used principally "
     "in catalytic converters for the control of automobile and "
     "industrial plant emissions; in jewelry; in catalysts to produce "
     "acids, organic chemicals, and pharmaceuticals; and in dental "
     "alloys used for making crowns and bridges."),
    ("Potash", "Potash is an industry term that refers to a group of "
     "water-soluble salts containing the element potassium, as well "
     "as to ores containing these salts (Kesler, 1994). Potash is "
     "used in fertilizer, medicine, the chemical industry, and to "
     "produce decorative color effects on brass, bronze, and nickel."),
    ("Pyrite", "Pyrite (fools gold) is used in the manufacture of "
     "sulfur, sulfuric acid, and sulfur dioxide; pellets of pressed "
     "pyrite dust are used to recover iron, gold, copper, cobalt, and "
     "nickel."),
    ("Quartz", "Quartz crystals are popular as a semiprecious "
     "gemstone; crystalline varieties include amethyst, citrine, rose "
     "quartz, and smoky quartz. Because of its piezoelectric "
     "properties (the ability to generate electricity under "
     "mechanical stress), quartz is used for pressure gauges, "
     "oscillators, resonators, and wave stabilizers. Quartz is also "
     "used in the manufacture of glass, paints, abrasives, "
     "refractories, and precision instruments."),
    ("Sandstone", "Sandstone is used as a building stone, road bases "
     "and coverings, construction fill, concrete, railroad ballast, "
     "and snow and ice control."),
    ("Silica", "Silica is used in the manufacture of computer chips, "
     "glass and refractory materials, ceramics, abrasives, and water "
     "filtration; and is a component of hydraulic cements, a filler "
     "in cosmetics, pharmaceuticals, paper, and insecticides; as an "
     "anti-caking agent in foods; a flatting agent in paint, and as a "
     "thermal insulator."),
    ("Silicon", "Silicon is used in iron, steel, and aluminum, as "
     "well as in the chemical and electronic industries."),
    ("Silver", "Silver is used in photography, chemistry, electrical "
     "and electronic products (because of its very high "
     "conductivity), fine silverware, electroplated wire, jewelry, "
     "coins, and brazing alloys and solders."),
    ("Sulfur", "Sulfur is widely used in manufacturing processes, "
     "drugs, and fertilizers."),
    ("Talc", "The primary use for talc is in the production of paper. "
     "Ground talc is used as filler in ceramics, paint, paper, "
     "roofing, plastics, cosmetics, and in agriculture. Talc is found "
     "in many common household products, such as baby (talcum) "
     "powder, deodorant, and makeup. Very pure talc is used in fine "
     "arts and is called soapstone. It is often used to carve "
     "figurines."),
    ("Tin", "Tin is used in the manufacture of cans and containers, "
     "electrical equipment, and chemicals."),
    ("Titanium", "Titanium is a metal used mostly in jet engines, "
     "airframes, and space and missile applications. In powdered "
     "form, titanium is used as a white pigment for paints, paper, "
     "plastics, rubber, and other materials."),
    ("Trona", "Trona is used in glass container manufacture, "
     "fiberglass, specialty glass, flat glass, liquid detergents, "
     "medicine, food additives, photography, cleaning and boiler "
     "compounds, and control of water pH. Trona is mined mainly in "
     "Wyoming."),
    ("Tungsten", "Tungsten is used in steel production, metalworking, "
     "cutting applications, construction electrical machinery and "
     "equipment, transportation equipment, light bulbs, carbide "
     "drilling equipment, heat and radiation shielding, textile dyes, "
     "enamels, paints, and for coloring glass."),
    ("Uranium", "Uranium is a radioactive material used in nuclear "
     "defense systems and for nuclear generation of electricity. It "
     "is also used in nuclear-medicine x-ray machines, atomic dating, "
     "and electronic instruments."),
    ("Zeolites", "Some of the uses of zeolite minerals include "
     "aquaculture (for removing ammonia from the water in fish "
     "hatcheries), water softener, catalysts, cat litter, odor "
     "control, and removing radioactive ions from nuclear-plant "
     "effluent."),
    ("Zinc", "Zinc is used as protective coating on steel, as die "
     "casting, as an alloying metal with copper to make brass, and as "
     "chemical compounds in rubber and paint. Additional uses include "
     "galvanizing iron, electroplating, metal spraying, automotive "
     "parts, electrical fuses, anodes, dry-cell batteries, nutrition, "
     "chemicals, roof gutters, cable wrapping, and pennies. Zinc "
     "oxide is used in medicine, paints, vulcanizing rubber, and "
     "sun-block lotions."),
    ("Zirconium", "Zirconium is a metal recovered from zircon. "
     "“Zircon is used in mineral form in refractory products, "
     "where it is valued for its high melting temperature of "
     "2,550°C. Some zircon is processed by chemical leaching to "
     "yield elemental zirconium. The best known use for zirconium "
     "metal is in nuclear reactors, where zirconium contains the "
     "fuel” (Kesler, 1994)."),
]
for _term, _definition in _APPENDIX2_40:
    gloss(40, _term, _definition)

# ---------------------------------------------------------------- review notes
REVIEW_NOTES = [
    "SOURCE IDENTITY. The corpus file is catalogued as usgs-water-cycle."
    "pdf, but the document itself is USGS General Information Product 17, "
    "“The Life Cycle of a Mineral Deposit—A Teacher’s "
    "Guide for Hands-On Mineral Education Activities” (Frank, "
    "Galloway, and Assmus, 2005). The rebuild reflects the actual "
    "document.",

    "PAGE FURNITURE EXCLUDED BY DESIGN. Running heads (the report title "
    "on even pages, the current section name on odd pages), page folio "
    "numbers, and the Contents pages’ dot leaders are not carried. "
    "Every content-bearing line is.",

    "IMAGES REUSED FROM THE SOURCE. All photographs and raster figures "
    "are the source PDF’s own images, downscaled from print "
    "resolution to screen resolution to fit the embedded-image budget. "
    "Images the source paints through luminosity soft masks (the gold-pan "
    "photograph, the orange, the pennies, the talc-activity mask, the "
    "flash cards, and figure 6) were composited with their masks and "
    "flattened onto white, matching their printed appearance. The figure "
    "4 raster is stored rotated in the PDF and was rotated upright; its "
    "page (and the figure 7/8 pages) are landscape in the source.",

    "TWO FIGURES CARRY TEXT THAT EXISTS NOWHERE IN THE PDF TEXT LAYER. "
    "The Activity 6 tin-man element labels (Potassium, Calcium, Carbon, "
    "Molybdenum, Magnesium, Sulfur, Chromium, Nickel, Iodine, Zinc) and "
    "the Activity 7 cosmetic labels (Blush, Eyeliner, Eyeshadow, "
    "Lipstick, Makeup, Powder) are artwork only. Their alt text is the "
    "only machine-readable carrier of those words in this rebuild, and "
    "each alt text lists them exhaustively. The tin-man is vector art in "
    "the source with no embedded raster; it is the one figure "
    "re-rasterized from a rendered page rather than extracted.",

    "FIGURE 6 IS COPYRIGHTED THIRD-PARTY MATERIAL. The source states "
    "“© 2004 Mineral Information Institute” and “used "
    "with permission.” The credit is preserved in the caption and "
    "inside the alt text; the image is reused here exactly as the source "
    "embeds it, consistent with the imprint page’s notice that "
    "copyrighted items are noted in the text.",

    "FIGURES 5, 7, 8, AND 9 ARE PICTURES OF TEXT AND TABLES in the "
    "source (vector line art). They are rebuilt as real blockquotes and "
    "real tables so their content is machine-readable instead of being "
    "re-embedded as images. The spanned worksheet headers (“Amount "
    "used per American in a lifetime” over Pounds/Metric tons; the "
    "column-letter row) are flattened into the column names as “A: "
    "…” through “F: …”. The worksheets’ "
    "decorative cut-out affordance (dashed border and scissors icon) is "
    "not carried.",

    "TABLE HEADER FLATTENING IS A GLOBAL POLICY, and every flattened "
    "spanner is still carried: table 3’s “National Science "
    "Content Standards” spanner over columns A–G is carried by "
    "the caption’s final sentence (a disclosed one-sentence caption "
    "extension; the rest of the caption is verbatim); table 4’s "
    "“ELEMENT” spanner over Name/Symbol is folded into the "
    "column names “Element Name”/“Element Symbol”; "
    "the worksheet spanners are folded into the “A: …” "
    "column names as already noted. The blank worksheets’ "
    "preprinted “$” currency prompts are carried as "
    "“$” cell values (columns D/E/F and the TOTAL row of "
    "worksheet 1; columns A/C/D/E of worksheet 2).",

    "TWO CAPTIONS ARE COMPOSED, NOT VERBATIM: “Worksheet 1 "
    "(completed example)” and “Worksheet 2 (completed "
    "example)” on printed page 26 distinguish the figure 9 examples "
    "from the blank figure 7/8 worksheets; the source’s own labels "
    "“Worksheet 1”/“Worksheet 2” also appear as "
    "bold paragraphs immediately above each table, and the verbatim "
    "figure 9 caption follows them.",

    "SUBSCRIPTS AND SUPERSCRIPTS ARE RENDERED AS PLAIN CHARACTERS: "
    "chemical formulas (H2SO4, CuCO3, Cu(OH)2, Mg3Si4O10(OH)2, CaCO3, "
    "(Fe,Mg)2SiO4, MgCO3, CaMg(CO3)2, (Mn,Si)2O3, MnO2, BaMn9O18•2H2O, "
    "Co3S4, (Fe,Ni,Co)1-xSx, (Mg,Fe)(Cr,Al,Fe)2O4) and the trademark "
    "sign in WebElementsTM. Exceptions kept as Unicode superscripts: the "
    "table 4 footnote markers (¹ ² ³) and the page 7 (printed page 13) "
    "footnote marker on “activities¹”.",

    "SOURCE NUMBERING CARRIED VERBATIM. Numbered lists embed the "
    "source’s own numerals (lists are marked unordered) so renderer "
    "numbering can never diverge from the source. This matters: the "
    "Activity 10 evaluation list runs …6, 7, 9, 10 — the "
    "source itself has no item 8. Activity 7 likewise has two "
    "“Evaluation and Discussion:” labels, as printed.",

    "SOURCE DATA INCONSISTENCY, CARRIED AS PRINTED: figure 6 gives Salt "
    "29,336 lbs per lifetime while worksheet 1 (figures 7 and 9) lists "
    "Salt 32,061 pounds. Only stone/sand/gravel is documented (Activity "
    "10, STEP 1) as deliberately combined; the salt difference is "
    "unexplained in the source and both values are preserved where they "
    "appear.",

    "SOURCE TYPOS PRESERVED (fidelity over correction), including: "
    "“Covergent boundary” (glossary), “astenoshere” "
    "(glossary, Tectonic plate), “surfical processes” "
    "(Mineral Deposit Models), “preformed” (Activity 5), "
    "“cadium” (figure 5 cards), “sanitary wear” "
    "(Clays), “Californian” (references), and “P. "
    "Patrick Leahy , Acting Director” (imprint spacing).",

    "LINKS. URLs in the imprint, the activities, and How to Obtain "
    "Mineral Specimens are live links (line-wrap hyphenation joined). "
    "The Selected References URLs are carried verbatim as text.",

    "STYLING OVERLAY IS PARTIAL AND DELIBERATE. Structural labels "
    "(Objective/Materials/Instructions/STEP markers, category labels), "
    "glossary and appendix run-in terms, and the page 7 definition terms "
    "carry bold/italic runs. Incidental typography that could not be "
    "re-verified against the print was left unstyled rather than "
    "guessed.",

    "THE COVER TITLE IS PART OF THE COVER ARTWORK and is also the "
    "document’s single H1. The cover alt text incorporates the "
    "source’s own cover description from the imprint page.",
]

# ---------------------------------------------------------------- gates
def _fail(msg):
    raise SystemExit("GATE FAILED: " + msg)


# Gate 1: heading discipline.
_levels = [b["level"] for b in B if b["type"] == "heading"]
if _levels.count(1) != 1:
    _fail("exactly one h1 required, found %d" % _levels.count(1))
for _prev, _cur in zip(_levels, _levels[1:]):
    if _cur > _prev + 1:
        _fail("heading ladder skips h%d -> h%d" % (_prev, _cur))

# Gate 2: every source page 1..40 contributes at least one block, and
# block page attribution never runs backwards.
_pages = [b.get("source_page") for b in B if b["type"] != "page_break"]
if sorted(set(_pages)) != list(range(1, 41)):
    _missing = sorted(set(range(1, 41)) - set(_pages))
    _fail("pages without blocks: %s" % _missing)
if _pages != sorted(_pages):
    _bad = [(a, b) for a, b in zip(_pages, _pages[1:]) if b < a]
    _fail("page attribution runs backwards at %s" % _bad[:5])

# Gate 3: image inventory - 17 content images, meaningful alt, real files.
_images = [b for b in B if b["type"] == "image"]
if len(_images) != 17:
    _fail("expected 17 image blocks, found %d" % len(_images))
for _b in _images:
    if _b["decorative"]:
        _fail("no image in this document is decorative: " + _b["path"])
    if len(_b["alt"]) < 80:
        _fail("alt too thin for " + _b["path"])
    _f = os.path.join(HERE, _b["path"].replace("/", os.sep))
    if not os.path.isfile(_f):
        _fail("missing asset file " + _b["path"])
_total_asset = sum(
    os.path.getsize(os.path.join(HERE, b["path"].replace("/", os.sep)))
    for b in _images)
if (_total_asset + 2) // 3 * 4 > 4 * 1024 * 1024 * 0.95:
    _fail("assets too large for the 4 MiB embedded budget: %d" % _total_asset)

# Gate 4: label-carrying alt text is exhaustive.
_alt_by_file = {b["path"].split("/")[-1]: b["alt"] for b in _images}
for _label in ["Potassium", "Calcium", "Carbon", "Molybdenum", "Magnesium",
               "Sulfur", "Chromium", "Nickel", "Iodine", "Zinc"]:
    if _label not in _alt_by_file["act6-tin-man.png"]:
        _fail("tin-man alt missing label " + _label)
for _label in ["Blush", "Eyeliner", "Eyeshadow", "Lipstick", "Makeup",
               "Powder"]:
    if _label not in _alt_by_file["act7-talc-mask.jpg"]:
        _fail("talc alt missing label " + _label)
for _qty in ["1,390", "20,226", "29,336", "772", "1.55 million", "81,518",
             "65,543", "1.279", "573,056", "+48,096", "21,848", "4,864",
             "849", "32,810", "5.78 million", "3.5 million pounds",
             "Mineral Information Institute"]:
    if _qty not in _alt_by_file["fig6-every-american.jpg"]:
        _fail("figure-6 alt missing " + _qty)
for _label in ["convergent", "transform", "divergent", "island arc",
               "trench", "strato-volcano", "shield volcano",
               "oceanic spreading ridge", "lithosphere", "asthenosphere",
               "hot spot", "oceanic crust", "continental crust",
               "subducting plate", "continental rift zone"]:
    if _label not in _alt_by_file["fig1a-plate-tectonics.jpg"].lower():
        _fail("figure-1A alt missing " + _label)
for _label in ["sediments", "sedimentary rocks", "metamorphic rocks",
               "magma", "igneous rocks", "weathering and erosion",
               "compaction and cementation", "heat and pressure",
               "crystallization"]:
    if _label not in _alt_by_file["fig1b-rock-cycle.jpg"].lower():
        _fail("figure-1B alt missing " + _label)

# Gate 5: table inventory and worksheet arithmetic.
_tables = [b for b in B if b["type"] == "table"]
_shapes = [(len(t["columns"]), len(t["rows"])) for t in _tables]
_expect = [(2, 9), (2, 10), (9, 10), (5, 14), (7, 9), (5, 4), (7, 9), (5, 4)]
if _shapes != _expect:
    _fail("table shapes %s != expected %s" % (_shapes, _expect))
_ws2 = _tables[7]["rows"]
for _row in _ws2:
    _a = float(_row[0].replace("$", "").replace(",", ""))
    _age = int(_row[1])
    _c = float(_row[2].replace("$", "").replace(",", ""))
    _d = float(_row[3].replace("$", "").replace(",", ""))
    _e = float(_row[4].replace("$", "").replace(",", ""))
    if abs(_a * _age - _c) > 0.005:
        _fail("worksheet 2: A*B != C for age %d" % _age)
    if abs(_c + _d - _e) > 0.005:
        _fail("worksheet 2: C+D != E for age %d" % _age)
_ws1 = _tables[6]["rows"]
_total_e = sum(float(r[5].replace("$", "").replace(",", ""))
               for r in _ws1[:-1])
if abs(_total_e - 12772.77) > 0.02:
    _fail("worksheet 1: column E does not total 12,772.77 (%.2f)" % _total_e)

# Gate 6: activity headings, glossary and appendix term counts.
_acts = [b for b in B if b["type"] == "heading"
         and b["text"].startswith("Activity ")]
if len(_acts) != 10:
    _fail("expected 10 activity headings, found %d" % len(_acts))
if len(_GLOSSARY_36) + len(_GLOSSARY_37) != 38:
    _fail("glossary term count drifted")
if len(_APPENDIX2_38) + len(_APPENDIX2_39) + len(_APPENDIX2_40) != 53:
    _fail("appendix 2 term count drifted")

# Gate 7: text hygiene.
for _i, _b in enumerate(B):
    for _t in ([_b.get("text", "")] + _b.get("items", [])
               + [c for r in _b.get("rows", []) for c in r]
               + _b.get("columns", []) + [_b.get("alt", ""), _b.get("caption", "")]):
        if _t is None:
            continue
        if "�" in _t or "­" in _t:
            _fail("mojibake or soft hyphen in block %d" % _i)
        if _t != _t.strip() and _t != "":
            _fail("unstripped text in block %d: %r" % (_i, _t[:40]))

# Gate 8: the source file, when present locally, must be the pinned bytes.
_SRC = os.path.normpath(os.path.join(
    HERE, "..", "..", "..", "figures", "usgs-water-cycle.pdf"))
if os.path.isfile(_SRC):
    _h = hashlib.sha256(open(_SRC, "rb").read()).hexdigest()
    if _h != SOURCE_SHA256:
        _fail("source sha256 mismatch: " + _h)

# ---------------------------------------------------------------- write
plan = {
    "schema_version": "1.0",
    "document": {
        "title": TITLE,
        "language": "en",
        "source_page_count": 40,
        "source_sha256": SOURCE_SHA256,
        "document_type": "booklet",
        "subject": "USGS General Information Product 17: a grades 5-8 "
                   "teacher’s guide to the life cycle of a mineral "
                   "deposit, with ten hands-on classroom activities, a "
                   "glossary, and a minerals-and-their-uses appendix.",
        "variant": "original",
    },
    "blocks": B,
    "review_notes": REVIEW_NOTES,
}

with open(OUT, "w", encoding="utf-8") as fh:
    json.dump(plan, fh, ensure_ascii=False, indent=1)
    fh.write("\n")
print("wrote %s: %d blocks, %d review notes, %d image blocks, "
      "%d bytes of assets"
      % (os.path.basename(OUT), len(B), len(REVIEW_NOTES), len(_images),
         _total_asset))
