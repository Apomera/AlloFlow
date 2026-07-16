import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { resolve } from "node:path";

const items = JSON.parse(fs.readFileSync(resolve(process.cwd(), "test_prep/eppp_native_items.json"), "utf8"));
const correctedIds = ["eppp-b008-professional-1","eppp-b008-intervention-1","eppp-b009-professional-1","eppp-b009-intervention-1","eppp-b010-professional-1","eppp-b010-intervention-1","eppp-b011-professional-1","eppp-b011-intervention-1","eppp-b012-professional-1","eppp-b012-intervention-1","eppp-b013-professional-1","eppp-b013-intervention-1","eppp-b014-professional-1","eppp-b014-intervention-1","eppp-b015-professional-1","eppp-b012-cognitive-2"];

describe("EPPP Practice Bank 2 answer-key consistency repair", () => {
  it("aligns every repaired key with its supported choice and supplies complete option feedback", () => {
    for (const id of correctedIds) {
      const item = items.find((candidate) => candidate.id === id);
      expect(item, id).toBeTruthy();
      expect(item.answerIndex, id).toBe(id === "eppp-b012-cognitive-2" ? 3 : 1);
      expect(item.choiceRationales, id).toHaveLength(item.choices.length);
      expect(item.choiceRationales.every((explanation) => explanation.length >= 55), id).toBe(true);
    }
  });

  it("gives the opponent-process item an actual opponent-process answer", () => {
    const item = items.find((candidate) => candidate.id === "eppp-b012-cognitive-2");
    expect(item.choices[item.answerIndex]).toContain("opposite in direction");
    expect(item.rationale).toContain("opponent process in the opposite direction");
    expect(item.choices).not.toContain("Judging a known outcome as having been obvious and predictable beforehand");
  });

  it("uses a directly relevant functional-analysis source rather than the unrelated pregnancy article", () => {
    const item = items.find((candidate) => candidate.id === "eppp-b012-intervention-1");
    expect(item.references).toEqual(["https://www.ncbi.nlm.nih.gov/sites/books/NBK459285/"]);
    expect(item.sourceDetails[0]).toMatchObject({ title: "Behavior Modification - StatPearls - NCBI Bookshelf", organization: "National Library of Medicine, National Institutes of Health" });
  });
});
