/**
 * build-backbone.mjs — generate a bundled OFFLINE backbone for the hazard taxa.
 *
 * If the Canvas sandbox can't reach GBIF, the tool must still fail toward
 * caution: the category nets ("no wild fungus is safe"), the taxonomic ladder,
 * and the confusion/direct rules should all still fire for dangerous organisms.
 * That needs a lineage even without the network. This script queries GBIF once
 * for a representative species of every hazard genus/family and writes their
 * verified lineages to local-backbone.json, which the resolver falls back to.
 *
 *   node build-backbone.mjs
 *
 * Re-run when the hazard taxa change. (Network — not part of the unit suite.)
 */
import { writeFile } from "node:fs/promises";

// One reliable species binomial per hazard taxon (bare genus names match poorly).
// Category families/classes/kingdoms come for free inside these lineages.
const REPRESENTATIVES = {
  // Fungi
  Amanita: "Amanita phalloides", Agaricus: "Agaricus bisporus", Lycoperdon: "Lycoperdon perlatum",
  Calvatia: "Calvatia gigantea", Armillaria: "Armillaria mellea", Galerina: "Galerina marginata",
  Morchella: "Morchella esculenta", Gyromitra: "Gyromitra esculenta", Macrolepiota: "Macrolepiota procera",
  Chlorophyllum: "Chlorophyllum molybdites", Lepiota: "Lepiota cristata", Cantharellus: "Cantharellus cibarius",
  Omphalotus: "Omphalotus olearius", Volvariella: "Volvariella volvacea", Lepista: "Lepista nuda",
  Clitocybe: "Clitocybe nebularis", Cortinarius: "Cortinarius rubellus", Boletus: "Boletus edulis",
  Rubroboletus: "Rubroboletus satanas", Suillellus: "Suillellus luridus", Pleurotus: "Pleurotus ostreatus",
  // Plants
  Daucus: "Daucus carota", Cicuta: "Cicuta maculata", Conium: "Conium maculatum", Heracleum: "Heracleum mantegazzianum",
  Allium: "Allium sativum", Toxicoscordion: "Toxicoscordion venenosum", Convallaria: "Convallaria majalis",
  Veratrum: "Veratrum viride", Atropa: "Atropa belladonna", Phytolacca: "Phytolacca americana",
  Solanum: "Solanum dulcamara", Nerium: "Nerium oleander", Datura: "Datura stramonium", Brugmansia: "Brugmansia arborea",
  Ricinus: "Ricinus communis", Abrus: "Abrus precatorius", Hippomane: "Hippomane mancinella",
  Digitalis: "Digitalis purpurea", Symphytum: "Symphytum officinale", Vitis: "Vitis vinifera",
  Menispermum: "Menispermum canadense", Sambucus: "Sambucus nigra", Toxicodendron: "Toxicodendron radicans",
  // Animals
  Micrurus: "Micrurus fulvius", Lampropeltis: "Lampropeltis triangulum", Cemophora: "Cemophora coccinea",
  Crotalus: "Crotalus atrox", Megalopyge: "Megalopyge opercularis", Acharia: "Acharia stimulea",
  Danaus: "Danaus plexippus", Limenitis: "Limenitis archippus", Latrodectus: "Latrodectus mactans",
  Loxosceles: "Loxosceles reclusa", Hapalochlaena: "Hapalochlaena maculosa", Conus: "Conus geographus",
  Rhinella: "Rhinella marina", Pterois: "Pterois volitans", Physalia: "Physalia physalis",
  Takifugu: "Takifugu rubripes", // representative of family Tetraodontidae (pufferfish)
};

const RANKS = ["kingdom", "phylum", "class", "order", "family", "genus", "species"];
const lineageOf = (rec) => RANKS.filter((r) => rec[r]).map((r) => ({ rank: r, name: rec[r], key: rec[`${r}Key`] ?? null }));

async function match(name) {
  const res = await fetch(`https://api.gbif.org/v1/species/match?name=${encodeURIComponent(name)}`, { headers: { "User-Agent": "AlloFlow-OrganismID-backbone/0.1" } });
  return res.ok ? res.json() : { __err: res.status };
}

const items = Object.entries(REPRESENTATIVES);
const species = {}, genera = {}, problems = [];
let i = 0;
async function worker() {
  while (i < items.length) {
    const [genus, sp] = items[i++];
    const rec = await match(sp);
    if (rec.__err || !rec.usageKey || rec.matchType === "NONE") { problems.push(`${genus} (${sp}): ${rec.matchType || rec.__err}`); continue; }
    const lin = lineageOf(rec);
    species[sp.toLowerCase()] = { canonicalName: rec.canonicalName, rank: rec.rank, key: rec.usageKey, lineage: lin };
    const g = genus.toLowerCase();
    if (!genera[g]) {
      const gi = lin.findIndex((n) => n.rank === "genus");
      genera[g] = { lineage: gi >= 0 ? lin.slice(0, gi + 1) : lin.filter((n) => n.rank !== "species") };
    }
  }
}
await Promise.all(Array.from({ length: 8 }, worker));

const out = { generatedFrom: "GBIF backbone (species/match)", taxa: Object.keys(genera).length, genera, species };
await writeFile(new URL("./local-backbone.json", import.meta.url), JSON.stringify(out, null, 0) + "\n");
console.log(`✓ local-backbone.json: ${Object.keys(genera).length} genera, ${Object.keys(species).length} species`);
if (problems.length) console.log(`⚠ ${problems.length} unresolved: ${problems.join("; ")}`);
