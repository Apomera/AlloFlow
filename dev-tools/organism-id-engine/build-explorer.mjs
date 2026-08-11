/**
 * build-explorer.mjs — regenerate taxonomy-explorer.html's data block from
 * taxonomy-data.mjs (the single source of truth). Run after editing the data:
 *
 *   node build-explorer.mjs
 *
 * It replaces everything between /*__DATA_START__*​/ and /*__DATA_END__*​/ with
 * the serialized TREE / EDGES / EXPLAIN, so the published artifact can never
 * drift from the data the tests guard.
 */
import { readFile, writeFile } from "node:fs/promises";
import { TREE, EDGES, EXPLAIN } from "./taxonomy-data.mjs";

const file = new URL("./taxonomy-explorer.html", import.meta.url);
let html = await readFile(file, "utf8");

const block =
  `/*__DATA_START__*/\n` +
  `  const TREE = ${JSON.stringify(TREE)};\n` +
  `  const EDGES = ${JSON.stringify(EDGES)};\n` +
  `  const EXPLAIN = ${JSON.stringify(EXPLAIN)};\n` +
  `  /*__DATA_END__*/`;

const re = /\/\*__DATA_START__\*\/[\s\S]*?\/\*__DATA_END__\*\//;
if (!re.test(html)) throw new Error("data markers not found in taxonomy-explorer.html");
html = html.replace(re, block);
await writeFile(file, html);
console.log("✓ taxonomy-explorer.html rebuilt from taxonomy-data.mjs");
