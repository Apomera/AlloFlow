#!/usr/bin/env node
/**
 * import_curated_articles.js — reproducible importer for the hand-curated
 * science articles and public-domain excerpts (Frontiers for Young Minds
 * summaries, USGS/Wikisource excerpts). These 11 items were originally
 * hand-written into books/ with no importer; this script embeds them as data
 * so the books/ directory can be regenerated from scripts alone, matching the
 * pattern of the other import_* scripts. Idempotent: rewrites the book files
 * and ensures each is registered in open_catalog.json.
 *
 * To edit or add an article: edit the ENTRIES array here, then run
 *   node reading_library/import_curated_articles.js
 * then rebuild the index:  node reading_library/mirror_books.js --fetch
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OPEN_CATALOG_PATH = path.join(ROOT, "open_catalog.json");

const ENTRIES = [
  {
    "schema": "allo-reading-book@1",
    "slug": "frontiers-bacteria-greenhouse-gases-brief",
    "title": "Bacteria: The Unexpected Fans of Greenhouse Gases",
    "description": "A Frontiers for Young Minds science article seed about bacteria that use carbon dioxide and hydrogen.",
    "language": "English",
    "langCode": "en",
    "isRtl": false,
    "level": "5",
    "orientation": "portrait",
    "sourceId": "frontiers",
    "contentType": "science-article",
    "subjects": [
      "Earth science",
      "Climate",
      "Microbiology",
      "Energy"
    ],
    "authors": [
      "Paulina Nunez-Valenzuela",
      "Julian O. Ovis-Sanchez",
      "Elias Razo-Flores"
    ],
    "illustrators": [],
    "originalAuthors": [],
    "publisher": "Frontiers for Young Minds",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "source": {
      "id": "frontiers",
      "name": "Frontiers for Young Minds",
      "url": "https://kids.frontiersin.org/articles/10.3389/frym.2026.1653389"
    },
    "cover": null,
    "audio": null,
    "pages": [
      {
        "n": 1,
        "img": null,
        "text": "This Frontiers for Young Minds article introduces homoacetogenic bacteria, tiny organisms that can live where there is little or no oxygen. The article connects microbiology, greenhouse gases, and biofuels by asking how some bacteria use carbon dioxide and hydrogen to grow."
      },
      {
        "n": 2,
        "img": null,
        "text": "Students can trace a systems question: when humans release too much carbon dioxide, plants cannot absorb all of it. Scientists therefore study other carbon pathways, including bacteria that transform waste gases into useful chemicals such as acetate and ethanol."
      },
      {
        "n": 3,
        "img": null,
        "text": "Use this as an entry point for climate solutions, microbial metabolism, engineering design, and the limits of any single technology. The full article is CC BY 4.0 and includes glossary terms, figures, references, and young-reviewer notes."
      }
    ],
    "stats": {
      "pages": 3,
      "words": 125
    }
  },
  {
    "schema": "allo-reading-book@1",
    "slug": "frontiers-hidden-impacts-of-things-we-buy-brief",
    "title": "The Hidden Global Impacts of Things We Buy",
    "description": "A Frontiers for Young Minds article seed about consumption, supply chains, and environmental and social spillovers.",
    "language": "English",
    "langCode": "en",
    "isRtl": false,
    "level": "5",
    "orientation": "portrait",
    "sourceId": "frontiers",
    "contentType": "science-article",
    "subjects": [
      "Sustainability",
      "Economics",
      "Climate",
      "Systems thinking"
    ],
    "authors": [
      "Arunima Malik"
    ],
    "illustrators": [],
    "originalAuthors": [],
    "publisher": "Frontiers for Young Minds",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "source": {
      "id": "frontiers",
      "name": "Frontiers for Young Minds",
      "url": "https://kids.frontiersin.org/articles/10.3389/frym.2026.1783561"
    },
    "cover": null,
    "audio": null,
    "pages": [
      {
        "n": 1,
        "img": null,
        "text": "This article asks students to look behind a product and trace the wider system that made it. A purchase can connect to land, water, energy, labor, transportation, and communities far away."
      },
      {
        "n": 2,
        "img": null,
        "text": "The reading is a useful entry point for footprint thinking. Students can compare the visible cost of a product with hidden environmental and social effects that are spread across global supply chains."
      },
      {
        "n": 3,
        "img": null,
        "text": "Because the article is CC BY 4.0, it can support adapted classroom activities about data, equity, trade, and everyday decision-making."
      }
    ],
    "stats": {
      "pages": 3,
      "words": 101
    }
  },
  {
    "schema": "allo-reading-book@1",
    "slug": "frontiers-ocean-acidification-brief",
    "title": "Ocean Acidification, a Silent Threat to Life on Earth",
    "description": "A Frontiers for Young Minds article seed about ocean chemistry, carbon dioxide, and marine life.",
    "language": "English",
    "langCode": "en",
    "isRtl": false,
    "level": "5",
    "orientation": "portrait",
    "sourceId": "frontiers",
    "contentType": "science-article",
    "subjects": [
      "Earth science",
      "Ocean science",
      "Climate",
      "Chemistry"
    ],
    "authors": [
      "Jannine M. Lencina-Avila",
      "Andrea da Consolacao de Oliveira Carvalho",
      "Mariele Paiva"
    ],
    "illustrators": [],
    "originalAuthors": [],
    "publisher": "Frontiers for Young Minds",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "source": {
      "id": "frontiers",
      "name": "Frontiers for Young Minds",
      "url": "https://kids.frontiersin.org/articles/10.3389/frym.2026.1664365"
    },
    "cover": null,
    "audio": null,
    "pages": [
      {
        "n": 1,
        "img": null,
        "text": "Ocean acidification begins with a chemistry story: the ocean absorbs carbon dioxide from the air, and some of that carbon changes seawater chemistry. Those changes matter for animals that build shells and skeletons."
      },
      {
        "n": 2,
        "img": null,
        "text": "This article works well as a bridge between climate science and chemistry. Students can ask how a gas in the atmosphere becomes a change in ocean pH, and why that affects food webs."
      },
      {
        "n": 3,
        "img": null,
        "text": "The full Frontiers article is CC BY 4.0 and includes examples, figures, references, and reviewer support for younger readers moving into more advanced nonfiction."
      }
    ],
    "stats": {
      "pages": 3,
      "words": 115
    }
  },
  {
    "schema": "allo-reading-book@1",
    "slug": "frontiers-rice-without-harming-planet-brief",
    "title": "Can We Produce Rice Without Harming Our Planet?",
    "description": "A Frontiers for Young Minds article seed about rice, food systems, land, water, energy, and emissions.",
    "language": "English",
    "langCode": "en",
    "isRtl": false,
    "level": "5",
    "orientation": "portrait",
    "sourceId": "frontiers",
    "contentType": "science-article",
    "subjects": [
      "Food systems",
      "Climate",
      "Agriculture",
      "Sustainability"
    ],
    "authors": [
      "Awais Mahmood",
      "Hafiz Usman Ghani",
      "Shabbir H. Gheewala"
    ],
    "illustrators": [],
    "originalAuthors": [],
    "publisher": "Frontiers for Young Minds",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "source": {
      "id": "frontiers",
      "name": "Frontiers for Young Minds",
      "url": "https://kids.frontiersin.org/articles/10.3389/frym.2026.1756273"
    },
    "cover": null,
    "audio": null,
    "pages": [
      {
        "n": 1,
        "img": null,
        "text": "Rice feeds more than half of the people on Earth, so rice production is both a food-security issue and an environmental issue. This article invites students to study agriculture as a system."
      },
      {
        "n": 2,
        "img": null,
        "text": "Students can track tradeoffs among land, water, energy, fertilizer, and greenhouse gases. The guiding question is not whether rice matters, but how people can produce it more sustainably."
      },
      {
        "n": 3,
        "img": null,
        "text": "The full article is CC BY 4.0 and works well with life-cycle thinking, climate solutions, and design challenges about improving food systems."
      }
    ],
    "stats": {
      "pages": 3,
      "words": 102
    }
  },
  {
    "schema": "allo-reading-book@1",
    "slug": "frontiers-soil-microbes-microplastics-brief",
    "title": "An Invisible Fight in the Soil: Tiny Plastic vs. Soil Microbes!",
    "description": "A Frontiers for Young Minds article seed about soil microbes, microplastics, pollution, and ecosystem health.",
    "language": "English",
    "langCode": "en",
    "isRtl": false,
    "level": "5",
    "orientation": "portrait",
    "sourceId": "frontiers",
    "contentType": "science-article",
    "subjects": [
      "Biodiversity",
      "Microbiology",
      "Pollution",
      "Ecosystems"
    ],
    "authors": [
      "Alma L. Reyes",
      "Michelle E. Afkhami"
    ],
    "illustrators": [],
    "originalAuthors": [],
    "publisher": "Frontiers for Young Minds",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "source": {
      "id": "frontiers",
      "name": "Frontiers for Young Minds",
      "url": "https://kids.frontiersin.org/articles/10.3389/frym.2026.1666676"
    },
    "cover": null,
    "audio": null,
    "pages": [
      {
        "n": 1,
        "img": null,
        "text": "This article introduces soil microbes as tiny living systems that help plants grow, recycle nutrients, and support healthier ecosystems. The problem is that microplastics can enter soil and disrupt the conditions microbes need to do their work."
      },
      {
        "n": 2,
        "img": null,
        "text": "Students can use this reading to connect pollution, microbiomes, and systems thinking. A small plastic fragment is not just litter; it can change soil structure, water movement, and which microbes survive."
      },
      {
        "n": 3,
        "img": null,
        "text": "The full Frontiers article is useful for discussions about environmental choices, evidence, and scale. It includes glossary support and is published under CC BY 4.0."
      }
    ],
    "stats": {
      "pages": 3,
      "words": 105
    }
  },
  {
    "schema": "allo-reading-book@1",
    "slug": "usgs-science-of-earthquakes-excerpt",
    "title": "The Science of Earthquakes",
    "description": "A USGS public-domain excerpt explaining faults, plate boundaries, seismic waves, and earthquake measurement.",
    "language": "English",
    "langCode": "en",
    "isRtl": false,
    "level": "5",
    "orientation": "portrait",
    "sourceId": "usgs",
    "contentType": "nonfiction-excerpt",
    "subjects": [
      "Earth science",
      "Geology",
      "Natural hazards"
    ],
    "authors": [
      "Lisa Wald",
      "U.S. Geological Survey Earthquake Hazards Program"
    ],
    "illustrators": [],
    "originalAuthors": [],
    "publisher": "U.S. Geological Survey",
    "license": "Public Domain",
    "licenseUrl": "https://www.usgs.gov/programs/earthquake-hazards/science-earthquakes",
    "source": {
      "id": "usgs",
      "name": "U.S. Geological Survey",
      "url": "https://www.usgs.gov/programs/earthquake-hazards/science-earthquakes"
    },
    "cover": null,
    "audio": null,
    "pages": [
      {
        "n": 1,
        "img": null,
        "text": "An earthquake is what happens when two blocks of the Earth suddenly slip past one another. The surface where they slip is called the fault or fault plane. The location below Earth's surface where the earthquake starts is called the hypocenter, and the location directly above it on the surface is called the epicenter."
      },
      {
        "n": 2,
        "img": null,
        "text": "Earth has four major layers: the inner core, outer core, mantle, and crust. The crust and the top of the mantle make a thin skin on the planet, but this skin is broken into moving pieces called tectonic plates. Most earthquakes happen along the faults at plate boundaries."
      },
      {
        "n": 3,
        "img": null,
        "text": "When stuck fault edges finally unstick, stored energy is released. The energy travels outward as seismic waves, like ripples on a pond. Seismographs record those waves, and scientists use the recordings to estimate an earthquake's size and location."
      }
    ],
    "stats": {
      "pages": 3,
      "words": 152
    }
  },
  {
    "schema": "allo-reading-book@1",
    "slug": "usgs-volcanoes-affect-climate-excerpt",
    "title": "Volcanoes Can Affect Climate",
    "description": "A public-domain USGS excerpt about volcanic gases, sulfate aerosols, cooling, and carbon dioxide comparisons.",
    "language": "English",
    "langCode": "en",
    "isRtl": false,
    "level": "5",
    "orientation": "portrait",
    "sourceId": "usgs",
    "contentType": "nonfiction-excerpt",
    "subjects": [
      "Volcanoes",
      "Climate",
      "Geology",
      "Atmosphere"
    ],
    "authors": [
      "USGS Volcano Hazards Program"
    ],
    "illustrators": [],
    "originalAuthors": [],
    "publisher": "U.S. Geological Survey",
    "license": "Public Domain",
    "licenseUrl": "https://www.usgs.gov/programs/VHP/volcanoes-can-affect-climate",
    "source": {
      "id": "usgs",
      "name": "U.S. Geological Survey",
      "url": "https://www.usgs.gov/programs/VHP/volcanoes-can-affect-climate"
    },
    "cover": null,
    "audio": null,
    "pages": [
      {
        "n": 1,
        "img": null,
        "text": "Volcanoes can affect climate when major explosive eruptions inject volcanic gas, aerosol droplets, and ash into the stratosphere. Ash usually falls out quickly, but sulfur dioxide can form sulfate aerosols."
      },
      {
        "n": 2,
        "img": null,
        "text": "Sulfate aerosols reflect some incoming sunlight back to space, which can cool the lower atmosphere for a limited time. The 1991 eruption of Mount Pinatubo is a key example."
      },
      {
        "n": 3,
        "img": null,
        "text": "USGS also distinguishes volcanic carbon dioxide from human emissions. Present-day volcanoes release far less carbon dioxide than human activity, so volcanoes do not explain modern warming."
      }
    ],
    "stats": {
      "pages": 3,
      "words": 112
    }
  },
  {
    "schema": "allo-reading-book@1",
    "slug": "usgs-water-cycle-excerpt",
    "title": "The Water Cycle",
    "description": "A public-domain USGS Water Science School excerpt about where water is stored, how it moves, and how humans affect it.",
    "language": "English",
    "langCode": "en",
    "isRtl": false,
    "level": "5",
    "orientation": "portrait",
    "sourceId": "usgs",
    "contentType": "nonfiction-excerpt",
    "subjects": [
      "Water",
      "Earth science",
      "Climate",
      "Human impacts"
    ],
    "authors": [
      "USGS Water Science School"
    ],
    "illustrators": [],
    "originalAuthors": [],
    "publisher": "U.S. Geological Survey",
    "license": "Public Domain / some linked media may vary",
    "licenseUrl": "https://www.usgs.gov/water-science-school/water-cycle",
    "source": {
      "id": "usgs",
      "name": "U.S. Geological Survey",
      "url": "https://www.usgs.gov/water-science-school/water-cycle"
    },
    "cover": null,
    "audio": null,
    "pages": [
      {
        "n": 1,
        "img": null,
        "text": "The water cycle describes where water is on Earth and how it moves. Water is stored in the atmosphere, on land, below the ground, in oceans, rivers, lakes, glaciers, ice sheets, and living things."
      },
      {
        "n": 2,
        "img": null,
        "text": "Water changes form and moves between pools. It evaporates, condenses, falls as precipitation, runs across land, soaks into the ground, flows through aquifers, and returns to rivers or the ocean."
      },
      {
        "n": 3,
        "img": null,
        "text": "Human water use, land use, and climate change affect where water is stored, how quickly it moves, when it is available, and how clean it is."
      }
    ],
    "stats": {
      "pages": 3,
      "words": 103
    }
  },
  {
    "schema": "allo-reading-book@1",
    "slug": "wikisource-declaration-of-sentiments-excerpt",
    "title": "Declaration of Sentiments (Excerpt)",
    "description": "A public-domain primary-source excerpt from the 1848 Seneca Falls Convention.",
    "language": "English",
    "langCode": "en",
    "isRtl": false,
    "level": "6",
    "orientation": "portrait",
    "sourceId": "wikisource",
    "contentType": "primary-source-excerpt",
    "subjects": [
      "History",
      "Civics",
      "Women's rights",
      "Primary sources"
    ],
    "authors": [
      "Elizabeth Cady Stanton"
    ],
    "illustrators": [],
    "originalAuthors": [],
    "publisher": "Wikisource",
    "license": "Public Domain",
    "licenseUrl": "https://en.wikisource.org/wiki/Declaration_of_Sentiments",
    "source": {
      "id": "wikisource",
      "name": "Wikisource",
      "url": "https://en.wikisource.org/wiki/Declaration_of_Sentiments"
    },
    "cover": null,
    "audio": null,
    "pages": [
      {
        "n": 1,
        "img": null,
        "text": "When, in the course of human events, it becomes necessary for one portion of the family of man to assume among the people of the earth a position different from that which they have hitherto occupied, a decent respect to the opinions of mankind requires that they should declare the causes that impel them to such a course."
      },
      {
        "n": 2,
        "img": null,
        "text": "We hold these truths to be self-evident; that all men and women are created equal; that they are endowed by their Creator with certain inalienable rights; that among these are life, liberty, and the pursuit of happiness."
      },
      {
        "n": 3,
        "img": null,
        "text": "The history of mankind is a history of repeated injuries and usurpations on the part of man toward woman, having in direct object the establishment of an absolute tyranny over her. To prove this, let facts be submitted to a candid world."
      }
    ],
    "stats": {
      "pages": 3,
      "words": 142
    }
  },
  {
    "schema": "allo-reading-book@1",
    "slug": "wikisource-gettysburg-address-excerpt",
    "title": "Gettysburg Address",
    "description": "A public-domain primary-source text of Abraham Lincoln's 1863 Gettysburg Address.",
    "language": "English",
    "langCode": "en",
    "isRtl": false,
    "level": "6",
    "orientation": "portrait",
    "sourceId": "wikisource",
    "contentType": "primary-source-excerpt",
    "subjects": [
      "History",
      "Civics",
      "Civil War",
      "Primary sources"
    ],
    "authors": [
      "Abraham Lincoln"
    ],
    "illustrators": [],
    "originalAuthors": [],
    "publisher": "Wikisource",
    "license": "Public Domain",
    "licenseUrl": "https://en.wikisource.org/wiki/Gettysburg_Address",
    "source": {
      "id": "wikisource",
      "name": "Wikisource",
      "url": "https://en.wikisource.org/wiki/Gettysburg_Address"
    },
    "cover": null,
    "audio": null,
    "pages": [
      {
        "n": 1,
        "img": null,
        "text": "Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal."
      },
      {
        "n": 2,
        "img": null,
        "text": "Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure."
      },
      {
        "n": 3,
        "img": null,
        "text": "It is for us the living, rather, to be dedicated here to the unfinished work which they who fought here have thus far so nobly advanced."
      }
    ],
    "stats": {
      "pages": 3,
      "words": 84
    }
  },
  {
    "schema": "allo-reading-book@1",
    "slug": "wikisource-what-to-the-slave-fourth-july-excerpt",
    "title": "What to the Slave Is the Fourth of July? (Excerpt)",
    "description": "A public-domain excerpt from Frederick Douglass's 1852 oration.",
    "language": "English",
    "langCode": "en",
    "isRtl": false,
    "level": "6",
    "orientation": "portrait",
    "sourceId": "wikisource",
    "contentType": "primary-source-excerpt",
    "subjects": [
      "History",
      "Civics",
      "Slavery",
      "Primary sources"
    ],
    "authors": [
      "Frederick Douglass"
    ],
    "illustrators": [],
    "originalAuthors": [],
    "publisher": "Wikisource",
    "license": "Public Domain",
    "licenseUrl": "https://en.wikisource.org/wiki/What_to_the_Slave_Is_the_Fourth_of_July%3F",
    "source": {
      "id": "wikisource",
      "name": "Wikisource",
      "url": "https://en.wikisource.org/wiki/What_to_the_Slave_Is_the_Fourth_of_July%3F"
    },
    "cover": null,
    "audio": null,
    "pages": [
      {
        "n": 1,
        "img": null,
        "text": "This speech by Frederick Douglass was given on July 5, 1852, in Rochester, New York. Douglass spoke to an audience celebrating national independence while slavery still existed in the United States."
      },
      {
        "n": 2,
        "img": null,
        "text": "Douglass begins by acknowledging the difficulty of the task before him. He says the distance between the platform and the slave plantation from which he escaped is considerable."
      },
      {
        "n": 3,
        "img": null,
        "text": "The speech asks students to examine perspective, audience, patriotism, and contradiction. It is a powerful primary source for studying abolition, rhetoric, and civic ideals."
      }
    ],
    "stats": {
      "pages": 3,
      "words": 100
    }
  }
];

const catalog = JSON.parse(fs.readFileSync(OPEN_CATALOG_PATH, "utf8"));
catalog.items = catalog.items || [];
const have = new Set(catalog.items.map((i) => i.slug));
let wrote = 0, registered = 0;
for (const book of ENTRIES) {
  const file = "books/" + book.slug + ".json";
  // Keep hand-authored entries easy to edit without allowing stale, manually
  // counted totals to leak into the browse index.
  book.stats = {
    pages: book.pages.length,
    words: book.pages.reduce((sum, page) => sum + String(page.text || "").trim().split(/\s+/).filter(Boolean).length, 0),
  };
  fs.writeFileSync(path.join(ROOT, file), JSON.stringify(book));
  wrote++;
  if (!have.has(book.slug)) {
    catalog.items.push({ slug: book.slug, file });
    have.add(book.slug);
    registered++;
  }
}
fs.writeFileSync(OPEN_CATALOG_PATH, JSON.stringify(catalog, null, 1));
console.log("Wrote " + wrote + " curated articles (" + registered + " newly registered).");
console.log("Rebuild the index: node reading_library/mirror_books.js --fetch");
