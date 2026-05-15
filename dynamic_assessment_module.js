(function () {
  if (window.AlloModules && window.AlloModules.DynamicAssessment) {
    console.log("[CDN] DynamicAssessment already loaded, skipping duplicate");
    return;
  }

  // ═══════════════════════════════════════════════════════════
  // dynamic_assessment_module.js — Dynamic Assessment Studio
  //
  // Top-level clinical tool sibling to allohaven_module.js / symbol_studio.
  // Implements Vygotsky/Feuerstein dynamic-assessment methodology:
  // pretest → mediation → posttest with graduated prompt hierarchies +
  // modifiability scoring. Examiner-led by default; AI-mediated path
  // ships in Phase B (later).
  //
  // Core mechanic: each item ships with a 4-level prompt ladder.
  // Level 0 = no scaffold (student attempts alone).
  // Level 1 = declarative cue (general orientation).
  // Level 2 = leading question (interrogative scaffold).
  // Level 3 = modeling (show the move, then ask student to do it).
  // Level 4 = direct teach (give answer with explanation).
  //
  // Item scoring: 5 - (promptLevelReached); 0 if still wrong after L4.
  // Pretest baseline + Posttest score → Modifiability Index =
  //   (post - pre) / (maxPossible - pre)  — proportion of growth realized.
  //
  // Persistence: localStorage 'alloflow_dynamic_assessment_v1'.
  // No examiner free-text observations are ever synced to Firestore.
  // ═══════════════════════════════════════════════════════════

  var STORAGE_KEY = "alloflow_dynamic_assessment_v1";

  // ── Reduced-motion CSS (WCAG 2.3.3) ──
  (function () {
    if (typeof document === "undefined") return;
    if (document.getElementById("allo-da-motion-reduce-css")) return;
    var st = document.createElement("style");
    st.id = "allo-da-motion-reduce-css";
    st.textContent =
      "@media (prefers-reduced-motion: reduce) { .da-anim, .da-fade-in, .da-pop { animation: none !important; transition: none !important; } }";
    if (document.head) document.head.appendChild(st);
  })();

  // ── Accessibility live region (WCAG 4.1.3) ──
  (function () {
    if (typeof document === "undefined") return;
    if (document.getElementById("allo-live-da")) return;
    var lr = document.createElement("div");
    lr.id = "allo-live-da";
    lr.setAttribute("aria-live", "polite");
    lr.setAttribute("aria-atomic", "true");
    lr.setAttribute("role", "status");
    lr.className = "sr-only";
    lr.style.cssText =
      "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0";
    if (document.body) document.body.appendChild(lr);
  })();
  function announce(msg) {
    if (typeof document === "undefined") return;
    var lr = document.getElementById("allo-live-da");
    if (lr) {
      lr.textContent = "";
      setTimeout(function () { lr.textContent = msg; }, 30);
    }
  }

  // ── Module-level style block ──
  (function () {
    if (typeof document === "undefined") return;
    if (document.getElementById("allo-da-styles")) return;
    var st = document.createElement("style");
    st.id = "allo-da-styles";
    st.textContent = [
      "@keyframes da-fade-in { 0% { opacity:0; transform:translateY(6px); } 100% { opacity:1; transform:translateY(0); } }",
      "@keyframes da-pop { 0% { transform:scale(0.96); } 50% { transform:scale(1.04); } 100% { transform:scale(1); } }",
      ".da-fade-in { animation: da-fade-in 280ms ease-out; }",
      ".da-pop { animation: da-pop 320ms ease-out; }",
      ".da-root { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; line-height: 1.55; color: #0f172a; }",
      ".da-root button:focus-visible { outline: 3px solid #fbbf24; outline-offset: 2px; }",
      ".da-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(15,23,42,0.06); }",
      ".da-ladder-step { padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; transition: border-color 200ms ease, background 200ms ease; }",
      ".da-ladder-step.used { background: #fef3c7; border-color: #fbbf24; }",
      ".da-ladder-step.active { background: #dbeafe; border-color: #3b82f6; }"
    ].join("\n");
    if (document.head) document.head.appendChild(st);
  })();

  // ═════════════════════════════════════════════════════════
  // SECTION 1 — Item schema + content
  // ═════════════════════════════════════════════════════════
  // Each item:
  //   {
  //     id, domain, difficulty ('easy'|'medium'|'hard'),
  //     construct, gradeBand,
  //     prompt: string,                       // What the student sees
  //     correctAnswer: string,                // Canonical
  //     acceptableAnswers: [string],          // Case-insensitive partials accepted
  //     promptLadder: [                       // Always 4 levels
  //       { level:1, type:'cue', text:'...' },
  //       { level:2, type:'leading', text:'...' },
  //       { level:3, type:'model', text:'...' },
  //       { level:4, type:'directTeach', text:'...' }
  //     ],
  //     constructTags: [string],              // For aggregate reporting
  //     transferTwin?: { prompt, correctAnswer, acceptableAnswers }
  //       // Parallel-but-novel item; tests if learning generalized.
  //   }

  // ─── MATH REASONING ITEM BANK ───
  // 12 items × 3 difficulty levels = 36 items.
  // Grade bands roughly: easy = grades 2-3, medium = grades 4-5, hard = 6-7.
  // Prompt-ladder pattern for math word problems:
  //   L1 declarative cue: orient to the question being asked
  //   L2 leading question: nudge toward the operation/strategy
  //   L3 modeling: show a similar move, then ask student to apply
  //   L4 direct teach: give the move + answer with explanation
  var MATH_ITEMS = [
    // ─── EASY (grades 2-3): one-step word problems ───
    {
      id: "math-e-01", domain: "math", difficulty: "easy", gradeBand: "2-3",
      construct: "Subtraction word problem",
      prompt: "Sara had 12 apples. She gave 5 to her brother. How many apples does Sara have left?",
      correctAnswer: "7",
      acceptableAnswers: ["7", "seven", "7 apples", "seven apples"],
      promptLadder: [
        { level: 1, type: "cue", text: "What is the question asking you to find?" },
        { level: 2, type: "leading", text: "When you give something away, do you have more or fewer left?" },
        { level: 3, type: "model", text: "Let me show you: if I had 10 apples and gave 3 away, I'd do 10 - 3 = 7. Now try yours: 12 - 5 = ?" },
        { level: 4, type: "directTeach", text: "When someone 'gives away' apples, we subtract. So 12 - 5 = 7. Sara has 7 apples left." }
      ],
      constructTags: ["subtraction", "one-step"],
      transferTwin: { prompt: "Marco had 14 pencils. He gave 6 to his friend. How many pencils does Marco have left?", correctAnswer: "8", acceptableAnswers: ["8", "eight", "8 pencils", "eight pencils"] }
    },
    {
      id: "math-e-02", domain: "math", difficulty: "easy", gradeBand: "2-3",
      construct: "Addition word problem",
      prompt: "Liam read 8 pages on Monday and 6 pages on Tuesday. How many pages did he read in total?",
      correctAnswer: "14",
      acceptableAnswers: ["14", "fourteen", "14 pages", "fourteen pages"],
      promptLadder: [
        { level: 1, type: "cue", text: "We want the total. Total means putting things together." },
        { level: 2, type: "leading", text: "If you read some on one day and some on another, do you add or subtract?" },
        { level: 3, type: "model", text: "Like: 3 pages + 5 pages = 8 pages total. Now do yours: 8 + 6 = ?" },
        { level: 4, type: "directTeach", text: "Total means add. 8 + 6 = 14. Liam read 14 pages in total." }
      ],
      constructTags: ["addition", "one-step"],
      transferTwin: { prompt: "Mia drew 7 pictures in the morning and 9 in the afternoon. How many did she draw in total?", correctAnswer: "16", acceptableAnswers: ["16", "sixteen"] }
    },
    {
      id: "math-e-03", domain: "math", difficulty: "easy", gradeBand: "2-3",
      construct: "Comparison difference",
      prompt: "Jake has 15 stickers. Maya has 9 stickers. How many more stickers does Jake have than Maya?",
      correctAnswer: "6",
      acceptableAnswers: ["6", "six", "6 stickers"],
      promptLadder: [
        { level: 1, type: "cue", text: "'How many more' means we want the difference between two numbers." },
        { level: 2, type: "leading", text: "If Jake has more, what operation finds the difference?" },
        { level: 3, type: "model", text: "If one person has 10 and another has 4, the difference is 10 - 4 = 6. Try yours: 15 - 9 = ?" },
        { level: 4, type: "directTeach", text: "Difference = larger minus smaller. 15 - 9 = 6. Jake has 6 more stickers than Maya." }
      ],
      constructTags: ["subtraction", "comparison"]
    },
    {
      id: "math-e-04", domain: "math", difficulty: "easy", gradeBand: "2-3",
      construct: "Equal groups (multiplication concept)",
      prompt: "There are 4 boxes. Each box has 3 toys. How many toys are there in all?",
      correctAnswer: "12",
      acceptableAnswers: ["12", "twelve", "12 toys"],
      promptLadder: [
        { level: 1, type: "cue", text: "Each box has the same number. We want the total." },
        { level: 2, type: "leading", text: "If you have equal groups, you can add or you can multiply. Which would be faster?" },
        { level: 3, type: "model", text: "Like: 2 boxes with 3 toys each is 3 + 3 = 6 (or 2 × 3 = 6). Try yours: 3 + 3 + 3 + 3 = ?" },
        { level: 4, type: "directTeach", text: "4 groups of 3 is 4 × 3 = 12. There are 12 toys in all." }
      ],
      constructTags: ["multiplication", "equal-groups"]
    },
    {
      id: "math-e-05", domain: "math", difficulty: "easy", gradeBand: "2-3",
      construct: "Sharing (division concept)",
      prompt: "There are 18 cookies. Three friends share them equally. How many cookies does each friend get?",
      correctAnswer: "6",
      acceptableAnswers: ["6", "six", "6 cookies"],
      promptLadder: [
        { level: 1, type: "cue", text: "'Share equally' means each person gets the same amount." },
        { level: 2, type: "leading", text: "If you split 18 things into 3 equal groups, what operation does that?" },
        { level: 3, type: "model", text: "Like: 12 cookies, 4 friends → 12 ÷ 4 = 3 each. Try yours: 18 ÷ 3 = ?" },
        { level: 4, type: "directTeach", text: "Sharing equally is division. 18 ÷ 3 = 6. Each friend gets 6 cookies." }
      ],
      constructTags: ["division", "sharing"]
    },
    {
      id: "math-e-06", domain: "math", difficulty: "easy", gradeBand: "2-3",
      construct: "Money — making change (subtraction)",
      prompt: "A book costs $4. You pay with a $10 bill. How much change do you get back?",
      correctAnswer: "6",
      acceptableAnswers: ["6", "$6", "six", "$6.00", "six dollars"],
      promptLadder: [
        { level: 1, type: "cue", text: "Change is what's left over after paying." },
        { level: 2, type: "leading", text: "If you handed over $10 and the book cost $4, do you subtract or add to find the change?" },
        { level: 3, type: "model", text: "Like: pay $5 for a $2 thing → change = $5 - $2 = $3. Try yours: $10 - $4 = ?" },
        { level: 4, type: "directTeach", text: "Change = money paid - cost. $10 - $4 = $6. You get $6 back." }
      ],
      constructTags: ["subtraction", "money"]
    },
    // ─── MEDIUM (grades 4-5): two-step word problems ───
    {
      id: "math-m-01", domain: "math", difficulty: "medium", gradeBand: "4-5",
      construct: "Two-step (multiply then subtract)",
      prompt: "A baker made 6 trays of muffins with 8 muffins per tray. She sold 35 muffins. How many muffins does she have left?",
      correctAnswer: "13",
      acceptableAnswers: ["13", "thirteen", "13 muffins"],
      promptLadder: [
        { level: 1, type: "cue", text: "There are two steps here: how many total were made, then how many remain after selling." },
        { level: 2, type: "leading", text: "Step 1: 6 trays of 8 muffins each. What operation gets the total made?" },
        { level: 3, type: "model", text: "Step 1: 6 × 8 = 48 muffins total. Step 2: subtract what was sold. So 48 - 35 = ?" },
        { level: 4, type: "directTeach", text: "First find total made: 6 × 8 = 48. Then subtract sold: 48 - 35 = 13 muffins left." }
      ],
      constructTags: ["multiplication", "subtraction", "two-step"],
      transferTwin: { prompt: "A factory made 5 boxes of pens with 12 pens per box. They shipped 41 pens. How many pens are left?", correctAnswer: "19", acceptableAnswers: ["19", "nineteen"] }
    },
    {
      id: "math-m-02", domain: "math", difficulty: "medium", gradeBand: "4-5",
      construct: "Two-step (add then divide)",
      prompt: "Tomas had $24. His grandma gave him $12 more for his birthday. He wants to share all his money equally with his 3 cousins (himself + 3 = 4 people total). How much does each person get?",
      correctAnswer: "9",
      acceptableAnswers: ["9", "$9", "nine", "$9.00", "nine dollars"],
      promptLadder: [
        { level: 1, type: "cue", text: "Two steps: figure out total money, then split it equally." },
        { level: 2, type: "leading", text: "Step 1: he started with $24 and got $12 more. Total? Step 2: shared among 4 people. What operation?" },
        { level: 3, type: "model", text: "Step 1: $24 + $12 = $36 total. Step 2: $36 ÷ 4 = ? per person." },
        { level: 4, type: "directTeach", text: "Total = $24 + $12 = $36. Split 4 ways: $36 ÷ 4 = $9. Each person gets $9." }
      ],
      constructTags: ["addition", "division", "two-step", "money"]
    },
    {
      id: "math-m-03", domain: "math", difficulty: "medium", gradeBand: "4-5",
      construct: "Two-step (rate × time then compare)",
      prompt: "Ana types 25 words per minute. She types for 6 minutes. How many words has she typed?",
      correctAnswer: "150",
      acceptableAnswers: ["150", "one hundred fifty", "150 words"],
      promptLadder: [
        { level: 1, type: "cue", text: "Rate is 'how many per minute'. Time is how many minutes." },
        { level: 2, type: "leading", text: "If she does 25 words every minute, and she does that for 6 minutes, what operation gets the total?" },
        { level: 3, type: "model", text: "If she did 10 words/min for 4 min, that's 10 × 4 = 40 words. Try yours: 25 × 6 = ?" },
        { level: 4, type: "directTeach", text: "Rate × time = total. 25 × 6 = 150 words." }
      ],
      constructTags: ["multiplication", "rate"]
    },
    {
      id: "math-m-04", domain: "math", difficulty: "medium", gradeBand: "4-5",
      construct: "Two-step (subtract then multiply)",
      prompt: "A toy costs $15. It is on sale for $3 off. If you buy 4 of them, how much do you pay total?",
      correctAnswer: "48",
      acceptableAnswers: ["48", "$48", "forty-eight", "$48.00"],
      promptLadder: [
        { level: 1, type: "cue", text: "Two steps: find the sale price first, then total for 4." },
        { level: 2, type: "leading", text: "Step 1: $15 - $3 off = sale price. Step 2: 4 toys at that price." },
        { level: 3, type: "model", text: "Step 1: $15 - $3 = $12 sale price. Step 2: $12 × 4 = ?" },
        { level: 4, type: "directTeach", text: "Sale price = $15 - $3 = $12. Total = $12 × 4 = $48." }
      ],
      constructTags: ["subtraction", "multiplication", "two-step", "money"]
    },
    {
      id: "math-m-05", domain: "math", difficulty: "medium", gradeBand: "4-5",
      construct: "Fraction of a whole",
      prompt: "A pizza is cut into 8 slices. Tara eats 3 slices. What fraction of the pizza did she eat?",
      correctAnswer: "3/8",
      acceptableAnswers: ["3/8", "three eighths", "three-eighths", "3 out of 8"],
      promptLadder: [
        { level: 1, type: "cue", text: "A fraction has a top number (what you have) and a bottom number (the whole)." },
        { level: 2, type: "leading", text: "What is the whole? What part did she take?" },
        { level: 3, type: "model", text: "If a cake is cut into 6 pieces and you eat 2, that's 2/6 of the cake. Try yours." },
        { level: 4, type: "directTeach", text: "Whole = 8 slices. She ate 3. The fraction is 3/8." }
      ],
      constructTags: ["fractions", "part-whole"]
    },
    {
      id: "math-m-06", domain: "math", difficulty: "medium", gradeBand: "4-5",
      construct: "Time elapsed",
      prompt: "A movie starts at 3:45 PM and ends at 5:20 PM. How long is the movie?",
      correctAnswer: "1 hour 35 minutes",
      acceptableAnswers: ["1 hour 35 minutes", "1h 35m", "1:35", "95 minutes", "1 hr 35 min"],
      promptLadder: [
        { level: 1, type: "cue", text: "We want the time that passed between start and end." },
        { level: 2, type: "leading", text: "From 3:45 to 4:45 is one hour. How many more minutes from 4:45 to 5:20?" },
        { level: 3, type: "model", text: "Like: 2:30 PM to 4:00 PM is 1 hour 30 minutes. For yours, 3:45 → 4:45 = 1 hr, then 4:45 → 5:20 = 35 min." },
        { level: 4, type: "directTeach", text: "From 3:45 to 5:20 = 1 hour (3:45 to 4:45) + 35 minutes (4:45 to 5:20) = 1 hour 35 minutes." }
      ],
      constructTags: ["time", "elapsed"]
    },
    // ─── HARD (grades 6-7): multi-step with fractions/proportions/percents ───
    {
      id: "math-h-01", domain: "math", difficulty: "hard", gradeBand: "6-7",
      construct: "Percent of a quantity",
      prompt: "A jacket costs $80. It is 25% off. What is the sale price?",
      correctAnswer: "60",
      acceptableAnswers: ["60", "$60", "sixty", "$60.00"],
      promptLadder: [
        { level: 1, type: "cue", text: "Percent off means a discount. The sale price is less than the original." },
        { level: 2, type: "leading", text: "Step 1: How much is the discount in dollars? Step 2: subtract it from the original." },
        { level: 3, type: "model", text: "25% of $80: think 25% = 1/4. So $80 ÷ 4 = $20 discount. Then $80 - $20 = ?" },
        { level: 4, type: "directTeach", text: "Discount = 25% × $80 = $20. Sale price = $80 - $20 = $60." }
      ],
      constructTags: ["percent", "two-step", "money"],
      transferTwin: { prompt: "A backpack costs $40. It is 20% off. What is the sale price?", correctAnswer: "32", acceptableAnswers: ["32", "$32", "thirty-two"] }
    },
    {
      id: "math-h-02", domain: "math", difficulty: "hard", gradeBand: "6-7",
      construct: "Adding fractions with unlike denominators",
      prompt: "A recipe needs 1/2 cup of milk and 1/4 cup of cream. How much liquid total?",
      correctAnswer: "3/4",
      acceptableAnswers: ["3/4", "three quarters", "three-quarters", "3/4 cup", "0.75 cups"],
      promptLadder: [
        { level: 1, type: "cue", text: "To add fractions, the bottom numbers must match." },
        { level: 2, type: "leading", text: "1/2 and 1/4 have different bottoms. Can we rewrite 1/2 so both have the same bottom number?" },
        { level: 3, type: "model", text: "1/2 = 2/4 (same value, different name). Now you can add 2/4 + 1/4 = ?" },
        { level: 4, type: "directTeach", text: "Convert: 1/2 = 2/4. Then add: 2/4 + 1/4 = 3/4 cup total." }
      ],
      constructTags: ["fractions", "addition", "common-denominators"]
    },
    {
      id: "math-h-03", domain: "math", difficulty: "hard", gradeBand: "6-7",
      construct: "Ratio / proportion",
      prompt: "A recipe uses 3 cups of flour for every 2 cups of sugar. If you use 9 cups of flour, how much sugar do you need?",
      correctAnswer: "6",
      acceptableAnswers: ["6", "six", "6 cups", "six cups"],
      promptLadder: [
        { level: 1, type: "cue", text: "The ratio of flour to sugar stays the same. We just scale up." },
        { level: 2, type: "leading", text: "How many times bigger is 9 than 3? Whatever factor that is, apply it to sugar too." },
        { level: 3, type: "model", text: "9 ÷ 3 = 3. So everything is 3 times bigger. Sugar: 2 × 3 = ?" },
        { level: 4, type: "directTeach", text: "Scale factor = 9 ÷ 3 = 3. Sugar = 2 × 3 = 6 cups." }
      ],
      constructTags: ["ratio", "proportion"]
    },
    {
      id: "math-h-04", domain: "math", difficulty: "hard", gradeBand: "6-7",
      construct: "Average (mean)",
      prompt: "Marisol scored 80, 92, and 86 on three tests. What is her average score?",
      correctAnswer: "86",
      acceptableAnswers: ["86", "eighty-six", "86 points"],
      promptLadder: [
        { level: 1, type: "cue", text: "Average means 'spread out evenly'. Two steps: add them up, then divide." },
        { level: 2, type: "leading", text: "Step 1: 80 + 92 + 86 = ? Step 2: divide by how many tests (3)." },
        { level: 3, type: "model", text: "Sum: 80 + 92 + 86 = 258. Average: 258 ÷ 3 = ?" },
        { level: 4, type: "directTeach", text: "Average = (sum) ÷ (count). (80 + 92 + 86) ÷ 3 = 258 ÷ 3 = 86." }
      ],
      constructTags: ["mean", "multi-step"]
    },
    {
      id: "math-h-05", domain: "math", difficulty: "hard", gradeBand: "6-7",
      construct: "Distance = rate × time (find time)",
      prompt: "A train travels at 60 miles per hour. How long does it take to travel 180 miles?",
      correctAnswer: "3 hours",
      acceptableAnswers: ["3", "three", "3 hours", "three hours", "3 hr", "3h"],
      promptLadder: [
        { level: 1, type: "cue", text: "Distance = rate × time. We know distance and rate; we want time." },
        { level: 2, type: "leading", text: "If you rearrange: time = distance ÷ rate. So divide miles by miles per hour." },
        { level: 3, type: "model", text: "At 60 mph, in 1 hour you go 60 miles, in 2 hours 120 miles. So 180 miles takes 180 ÷ 60 = ?" },
        { level: 4, type: "directTeach", text: "Time = distance ÷ rate = 180 ÷ 60 = 3 hours." }
      ],
      constructTags: ["rate", "division", "physics"]
    },
    {
      id: "math-h-06", domain: "math", difficulty: "hard", gradeBand: "6-7",
      construct: "Percent increase",
      prompt: "A plant was 12 inches tall. It grew to 15 inches. What is the percent increase?",
      correctAnswer: "25%",
      acceptableAnswers: ["25%", "25", "25 percent", "twenty-five percent", "25 %"],
      promptLadder: [
        { level: 1, type: "cue", text: "Percent change compares the growth to the original size." },
        { level: 2, type: "leading", text: "Step 1: How much did it grow (in inches)? Step 2: That growth is what fraction of the original 12?" },
        { level: 3, type: "model", text: "Growth = 15 - 12 = 3 inches. As a fraction of original: 3/12 = 1/4 = 25%." },
        { level: 4, type: "directTeach", text: "Percent increase = (new - old) ÷ old × 100. (15 - 12) ÷ 12 × 100 = 25%." }
      ],
      constructTags: ["percent", "change"]
    }
  ];

  // Convenience lookups by id and by difficulty
  var ITEMS_BY_ID = {};
  MATH_ITEMS.forEach(function (it) { ITEMS_BY_ID[it.id] = it; });

  function getItemsByDomainAndDifficulty(domain, difficulty) {
    if (domain !== "math") return []; // Phase A: math only
    return MATH_ITEMS.filter(function (it) { return it.difficulty === difficulty; });
  }

  // ═════════════════════════════════════════════════════════
  // SECTION 2 — Scoring + modifiability
  // ═════════════════════════════════════════════════════════

  // Per-item score from the prompt level needed.
  // promptLevelReached = 0 → solved unprompted → 5 pts
  // promptLevelReached = 1 → solved with L1 cue → 4 pts
  // promptLevelReached = 4 → still wrong after direct teach → 0 pts
  function scoreForLevel(promptLevelReached, finalCorrect) {
    if (!finalCorrect) return 0;
    var l = promptLevelReached || 0;
    if (l < 0) l = 0;
    if (l > 4) l = 4;
    return Math.max(0, 5 - l);
  }

  function sumItemResultScores(itemResults) {
    if (!Array.isArray(itemResults)) return 0;
    return itemResults.reduce(function (s, r) { return s + (r.scoreAwarded || 0); }, 0);
  }
  function maxPossibleScore(itemCount) { return 5 * (itemCount || 0); }

  // Modifiability Index = (post - pre) / (max - pre).
  // Bounded to [-1, 1]. Negative would mean posttest was actually worse
  // than pretest — rare but possible (fatigue, regression).
  function computeModifiabilityIndex(pretestSum, posttestSum, itemCount) {
    var max = maxPossibleScore(itemCount);
    if (max <= 0) return 0;
    if (max === pretestSum) return 0; // Already at ceiling on pretest
    var idx = (posttestSum - pretestSum) / (max - pretestSum);
    if (idx > 1) idx = 1;
    if (idx < -1) idx = -1;
    return Math.round(idx * 100) / 100;
  }

  // Narrative tier from the index value.
  function modifiabilityTier(index) {
    if (index >= 0.6) return { id: "high", label: "Responsive to mediation",
      desc: "Substantial growth between pretest and posttest. The scaffolding strategies used were effective for this student in this construct domain. Continued instruction with similar mediation techniques is likely to be productive." };
    if (index >= 0.3) return { id: "moderate", label: "Moderately responsive — responds to mediation with continued practice",
      desc: "Some growth observed with scaffolding. The student benefited from mediation but may need repeated exposure and structured practice to consolidate gains. Consider targeted intervention with these scaffold types." };
    if (index >= 0) return { id: "low", label: "Limited modifiability under these mediation conditions",
      desc: "Minimal change between pretest and posttest. This may indicate that the scaffolds used were not well-matched to the student's profile, or that a different construct should be probed. Consider trying alternate mediation strategies before drawing conclusions about learning capacity." };
    return { id: "regression", label: "Posttest performance below pretest baseline",
      desc: "Posttest was actually lower than pretest. This often reflects fatigue, anxiety, motivation drop, or session-length issues rather than ability. Re-test on a different day with shorter session." };
  }

  // ═════════════════════════════════════════════════════════
  // SECTION 3 — Persistence helpers
  // ═════════════════════════════════════════════════════════
  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      var parsed = JSON.parse(raw);
      return Object.assign({}, defaultState(), parsed || {});
    } catch (e) { return defaultState(); }
  }
  function saveState(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }
    catch (e) { /* quota / unavailable */ }
  }
  function defaultState() {
    return {
      sessions: [],         // Completed sessions for the activeStudent
      activeSession: null,  // In-progress session (null = no active)
      onboardingSeen: false
    };
  }

  // ─── AI mediation prompt (Phase B) ───
  // Builds the Gemini prompt for one mediation attempt. Gemini sees the
  // item, the student's response, the scaffolds already delivered, and
  // returns strict JSON: { verdict, nextScaffoldLevel, observationHint }.
  //
  // We deliberately keep the canonical answer + canned scaffold texts
  // in the prompt so Gemini's role is DECISION (which scaffold next)
  // rather than CONTENT GENERATION (no hallucinated hints). Scaffold
  // text shown to the student is always the pre-authored ladder copy.
  function buildAiMediatePrompt(item, lastResponse, scaffoldsDelivered) {
    var ladderLines = item.promptLadder.map(function (step) {
      var was = scaffoldsDelivered.indexOf(step.level) >= 0 ? " [ALREADY DELIVERED]" : "";
      return "  L" + step.level + " (" + step.type + ")" + was + ": " + step.text;
    }).join("\n");
    return [
      "You are mediating one item in a dynamic assessment session for a student.",
      "Your job: evaluate the student's most recent response, then decide which scaffold level (if any) to deliver next.",
      "",
      "ITEM:",
      "  " + item.prompt,
      "  Canonical correct answer: " + item.correctAnswer,
      "  Acceptable variants: " + (item.acceptableAnswers || []).join(", "),
      "  Construct being assessed: " + item.construct,
      "",
      "SCAFFOLD LADDER (always 4 levels, pre-authored):",
      ladderLines,
      "",
      "STUDENT RESPONSE THIS ATTEMPT: \"" + String(lastResponse || "").replace(/"/g, '\\"').slice(0, 400) + "\"",
      "",
      "DECISION RULES:",
      "- If the response is correct (matches the canonical answer or an acceptable variant in meaning), verdict = 'correct'. nextScaffoldLevel must be the same level the student was just on (do not advance).",
      "- If the response is wrong or off-topic but the student attempted, verdict = 'incorrect'. nextScaffoldLevel = the SMALLEST level not yet delivered (escalate by exactly one step).",
      "- If the response shows partial understanding (right idea, wrong final answer), verdict = 'partial'. nextScaffoldLevel = smallest level not yet delivered.",
      "- Never skip levels — always escalate by one. Never deliver an already-delivered level.",
      "- If all 4 scaffolds have been delivered AND the student is still wrong, verdict = 'incorrect' and nextScaffoldLevel = 4 (the directTeach was already given; you cannot escalate further).",
      "",
      "Output STRICT JSON only (no markdown, no commentary), shaped exactly like:",
      '{ "verdict": "correct"|"partial"|"incorrect", "nextScaffoldLevel": 0|1|2|3|4, "observationHint": "<1 sentence, ≤25 words, observational note about the student\'s strategy or error pattern, neutral tone>" }'
    ].join("\n");
  }

  // Deterministic fallback when Gemini is unavailable.
  // Rules: try answer-match first. If wrong, escalate one level past the
  // highest already-delivered.
  function fallbackAiMediate(item, lastResponse, scaffoldsDelivered) {
    var isMatch = matchAnswer(item, lastResponse);
    if (isMatch) {
      var lvl = scaffoldsDelivered.length === 0 ? 0 : Math.max.apply(null, scaffoldsDelivered);
      return { verdict: "correct", nextScaffoldLevel: lvl, observationHint: "Solved with prior scaffolding." };
    }
    var nextLvl;
    if (scaffoldsDelivered.length === 0) nextLvl = 1;
    else {
      var maxSoFar = Math.max.apply(null, scaffoldsDelivered);
      nextLvl = Math.min(4, maxSoFar + 1);
    }
    return { verdict: "incorrect", nextScaffoldLevel: nextLvl, observationHint: "Response did not match the canonical answer; escalating scaffold." };
  }

  // Lightweight answer-matching: case-insensitive, whitespace-trim,
  // and any acceptable variant counts as correct.
  function matchAnswer(itemDef, response) {
    if (!response) return false;
    var r = String(response).trim().toLowerCase();
    if (!r) return false;
    var pool = (itemDef.acceptableAnswers || [])
      .concat([itemDef.correctAnswer || ""])
      .map(function (a) { return String(a).trim().toLowerCase(); })
      .filter(function (a) { return a.length > 0; });
    for (var i = 0; i < pool.length; i++) {
      var target = pool[i];
      if (r === target) return true;
      // Allow loose matches where the response contains the canonical answer
      // (e.g., "I think 7 apples" matches "7"). Avoid trivial single-char.
      if (target.length >= 2 && r.indexOf(target) !== -1) return true;
    }
    return false;
  }

  // ═════════════════════════════════════════════════════════
  // SECTION 4 — React component
  // ═════════════════════════════════════════════════════════
  function DynamicAssessment(props) {
    var React = props.React || window.React;
    var h = React.createElement;
    var useState = React.useState;
    var useEffect = React.useEffect;

    // ── Top-level state (loaded from localStorage) ──
    var stTuple = useState(loadState);
    var state = stTuple[0];
    var setState = stTuple[1];
    function patch(partial) {
      setState(function (prev) {
        var next = Object.assign({}, prev, partial);
        saveState(next);
        return next;
      });
    }
    function patchSession(partial) {
      setState(function (prev) {
        if (!prev.activeSession) return prev;
        var nextSess = Object.assign({}, prev.activeSession, partial);
        var next = Object.assign({}, prev, { activeSession: nextSess });
        saveState(next);
        return next;
      });
    }

    // ── Ephemeral UI state ──
    var responseDraftTuple = useState("");
    var responseDraft = responseDraftTuple[0];
    var setResponseDraft = responseDraftTuple[1];
    var observationDraftTuple = useState("");
    var observationDraft = observationDraftTuple[0];
    var setObservationDraft = observationDraftTuple[1];

    // ── Phase B — AI mediation transient state ──
    // attempts: log of this item's mediation cycle (only used in AI mode).
    // Cleared on each new item. Each attempt = { response, verdict,
    // levelAfter, scaffoldShown, observationHint }
    var aiAttemptsTuple = useState([]);
    var aiAttempts = aiAttemptsTuple[0];
    var setAiAttempts = aiAttemptsTuple[1];
    var aiBusyTuple = useState(false);
    var aiBusy = aiBusyTuple[0];
    var setAiBusy = aiBusyTuple[1];
    var aiErrorTuple = useState(null);
    var aiError = aiErrorTuple[0];
    var setAiError = aiErrorTuple[1];

    // ── Helpers ──
    var addToast = props.addToast || function (msg) { announce(msg); };

    function startSession(opts) {
      // opts: { studentNickname, domain, difficulty, mode }
      var pool = getItemsByDomainAndDifficulty(opts.domain || "math", opts.difficulty || "easy");
      // Slice the 6 items in this difficulty into halves: first 3 = pretest, last 3 = posttest
      // The student sees the SAME items in both phases — modifiability is about
      // the same construct re-tested after scaffolding. Mediation phase reuses
      // the pretest items with full scaffolding available.
      var itemIds = pool.map(function (it) { return it.id; });
      var sessionItems = itemIds.slice(0, 6); // up to 6 items at this difficulty
      var session = {
        id: "da-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        studentNickname: opts.studentNickname || "",
        domain: opts.domain || "math",
        difficulty: opts.difficulty || "easy",
        mode: opts.mode || "clinician",
        dateStarted: new Date().toISOString(),
        sessionItemIds: sessionItems,
        currentPhase: "pretest",     // 'pretest' | 'mediation' | 'posttest' | 'summary'
        currentItemIdx: 0,
        itemResults: [],             // Append-only log of attempts
        sessionNote: "",
        currentLadderLevel: 0        // For the active item during mediation
      };
      patch({ activeSession: session });
      setResponseDraft("");
      setObservationDraft("");
      announce("Session started. Pretest phase, item 1.");
    }

    function discardSession() {
      patch({ activeSession: null });
      setResponseDraft("");
      setObservationDraft("");
    }

    // Submit student's response on the current item.
    // For pretest/posttest phases: one attempt, score is 5 if right (level 0), 0 if wrong.
    // For mediation phase: examiner can escalate scaffolds and retry; score reflects
    // the highest level reached when the student succeeded (or 0 if never solved).
    function submitResponse(args) {
      // args: { phase, itemId, response, levelReached, finalCorrect, examinerObservation, supportType }
      if (!state.activeSession) return;
      var nowIso = new Date().toISOString();
      var result = {
        itemId: args.itemId,
        phase: args.phase,
        promptLevelReached: args.levelReached || 0,
        studentResponseText: String(args.response || "").trim().slice(0, 1000),
        examinerObservation: String(args.examinerObservation || "").trim().slice(0, 2000),
        supportType: args.supportType || null,
        finalCorrect: !!args.finalCorrect,
        scoreAwarded: scoreForLevel(args.levelReached || 0, !!args.finalCorrect),
        attemptedAt: nowIso
      };
      var prev = state.activeSession;
      var newResults = (prev.itemResults || []).concat([result]);
      var nextItemIdx = prev.currentItemIdx + 1;
      var totalInPhase = prev.sessionItemIds.length;
      var nextPhase = prev.currentPhase;
      var advanced = false;
      if (nextItemIdx >= totalInPhase) {
        // Phase complete — advance
        if (prev.currentPhase === "pretest") nextPhase = "mediation";
        else if (prev.currentPhase === "mediation") nextPhase = "posttest";
        else if (prev.currentPhase === "posttest") nextPhase = "summary";
        nextItemIdx = 0;
        advanced = true;
      }
      patchSession({
        itemResults: newResults,
        currentItemIdx: nextItemIdx,
        currentPhase: nextPhase,
        currentLadderLevel: 0
      });
      setResponseDraft("");
      setObservationDraft("");
      if (advanced) {
        announce(nextPhase === "summary"
          ? "All phases complete. Results ready."
          : (nextPhase + " phase started."));
      } else {
        announce("Item " + (nextItemIdx + 1) + " of " + totalInPhase);
      }
    }

    function finalizeSession() {
      // Mark complete + push into sessions list + clear active
      if (!state.activeSession) return;
      var s = state.activeSession;
      var pretestResults = s.itemResults.filter(function (r) { return r.phase === "pretest"; });
      var posttestResults = s.itemResults.filter(function (r) { return r.phase === "posttest"; });
      var pretestSum = sumItemResultScores(pretestResults);
      var posttestSum = sumItemResultScores(posttestResults);
      var modIdx = computeModifiabilityIndex(pretestSum, posttestSum, s.sessionItemIds.length);
      var tier = modifiabilityTier(modIdx);
      var record = Object.assign({}, s, {
        dateCompleted: new Date().toISOString(),
        pretestSum: pretestSum,
        posttestSum: posttestSum,
        modifiabilityIndex: modIdx,
        modifiabilityTier: tier
      });
      var newSessions = (state.sessions || []).concat([record]);
      patch({ activeSession: null, sessions: newSessions });
      announce("Session saved.");
    }

    function setLadderLevel(level) {
      if (!state.activeSession) return;
      patchSession({ currentLadderLevel: level });
      announce("Scaffold level " + level + " delivered.");
    }

    // ─── Phase B — AI mediation cycle ───
    // Called when student submits a response during AI-mediated mediation.
    // 1. Build prompt → call Gemini for verdict + nextScaffoldLevel.
    // 2. Apply fallback if Gemini missing/fails.
    // 3. Append attempt to aiAttempts; if verdict === 'correct' OR all
    //    scaffolds delivered + still wrong, finalize the item.
    // 4. Otherwise, advance currentLadderLevel and let student retry.
    function runAiMediate(itemDef, responseText) {
      var done = function () {}; // placeholder for any post-attempt UI work
      var attemptsSoFar = aiAttempts.slice();
      var scaffoldsDelivered = attemptsSoFar
        .map(function (a) { return a.levelAfter; })
        .filter(function (l) { return typeof l === "number" && l > 0; });
      // De-dupe scaffoldsDelivered
      var uniq = {};
      scaffoldsDelivered = scaffoldsDelivered.filter(function (l) {
        if (uniq[l]) return false;
        uniq[l] = true;
        return true;
      });

      setAiBusy(true);
      setAiError(null);

      // The "level reached so far" before this attempt's evaluation
      var levelBefore = scaffoldsDelivered.length === 0 ? 0 : Math.max.apply(null, scaffoldsDelivered);

      function applyVerdict(v) {
        // v: { verdict, nextScaffoldLevel, observationHint }
        var nextLevel = Math.max(0, Math.min(4, v.nextScaffoldLevel || levelBefore));
        var scaffoldText = "";
        if (v.verdict !== "correct" && nextLevel > 0) {
          var step = itemDef.promptLadder[nextLevel - 1];
          if (step) scaffoldText = step.text;
        }
        var newAttempt = {
          response: String(responseText || "").trim().slice(0, 600),
          verdict: v.verdict,
          levelAfter: v.verdict === "correct" ? levelBefore : nextLevel,
          scaffoldShown: scaffoldText,
          observationHint: String(v.observationHint || "").trim().slice(0, 240)
        };
        var nextAttempts = attemptsSoFar.concat([newAttempt]);
        setAiAttempts(nextAttempts);
        setAiBusy(false);
        setResponseDraft("");
        announce(v.verdict === "correct"
          ? "Correct."
          : ("Scaffold level " + nextLevel + " delivered."));

        // Finalize the item if correct OR exhausted (level 4 already given + still wrong)
        var alreadyHadL4 = scaffoldsDelivered.indexOf(4) >= 0;
        var exhausted = (v.verdict !== "correct") && alreadyHadL4;
        if (v.verdict === "correct" || exhausted) {
          finalizeAiItem(itemDef, nextAttempts, v.verdict === "correct");
        }
      }

      var callGeminiFn = props.callGemini;
      if (typeof callGeminiFn !== "function") {
        // No AI plumbing — use deterministic fallback immediately.
        applyVerdict(fallbackAiMediate(itemDef, responseText, scaffoldsDelivered));
        return;
      }

      var prompt = buildAiMediatePrompt(itemDef, responseText, scaffoldsDelivered);
      Promise.resolve()
        .then(function () { return callGeminiFn(prompt); })
        .then(function (out) {
          var raw = (typeof out === "string" ? out : (out && out.text) || "").trim();
          raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
          var parsed = null;
          try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
          if (!parsed || typeof parsed.verdict !== "string" ||
              typeof parsed.nextScaffoldLevel !== "number" ||
              ["correct", "partial", "incorrect"].indexOf(parsed.verdict) < 0) {
            // Bad shape — fall back deterministically
            applyVerdict(fallbackAiMediate(itemDef, responseText, scaffoldsDelivered));
            return;
          }
          // Clamp level to [0, 4]
          parsed.nextScaffoldLevel = Math.max(0, Math.min(4, parsed.nextScaffoldLevel));
          // If verdict is wrong but Gemini suggests an already-delivered level,
          // bump it forward by one (defense against bad outputs).
          if (parsed.verdict !== "correct" && scaffoldsDelivered.indexOf(parsed.nextScaffoldLevel) >= 0) {
            parsed.nextScaffoldLevel = Math.min(4, parsed.nextScaffoldLevel + 1);
          }
          applyVerdict(parsed);
        })
        .catch(function () {
          // Gemini call failed — fall back deterministically + flag error so
          // examiner knows AI plumbing had a hiccup.
          setAiError("AI step skipped — used built-in rule instead.");
          applyVerdict(fallbackAiMediate(itemDef, responseText, scaffoldsDelivered));
        });
    }

    // After an AI-mediated item resolves (correct or exhausted), commit
    // its result + advance to the next item. Mirrors submitResponse but
    // with attempts log baked in.
    function finalizeAiItem(itemDef, attempts, wasCorrect) {
      if (!state.activeSession) return;
      var prev = state.activeSession;
      // Final level reached = max levelAfter across attempts
      var finalLevel = 0;
      attempts.forEach(function (a) {
        if (typeof a.levelAfter === "number" && a.levelAfter > finalLevel) finalLevel = a.levelAfter;
      });
      var nowIso = new Date().toISOString();
      var lastResponse = attempts.length > 0 ? attempts[attempts.length - 1].response : "";
      // Concatenate AI observation hints into the examiner-observation field
      var aiHints = attempts
        .map(function (a) { return a.observationHint; })
        .filter(function (s) { return !!s; })
        .join(" · ");
      var combinedObservation = [observationDraft.trim(), aiHints ? "[AI: " + aiHints + "]" : ""]
        .filter(function (s) { return !!s; })
        .join(" ");
      var result = {
        itemId: itemDef.id,
        phase: "mediation",
        promptLevelReached: finalLevel,
        studentResponseText: lastResponse,
        examinerObservation: combinedObservation.slice(0, 2000),
        supportType: wasCorrect
          ? (finalLevel === 0 ? "none" : (itemDef.promptLadder[finalLevel - 1] || {}).type || "none")
          : "directTeach",
        finalCorrect: !!wasCorrect,
        scoreAwarded: scoreForLevel(finalLevel, !!wasCorrect),
        attemptedAt: nowIso,
        aiAttemptsLog: attempts.slice() // Persisted log of the cycle for the summary
      };
      var newResults = (prev.itemResults || []).concat([result]);
      var nextItemIdx = prev.currentItemIdx + 1;
      var totalInPhase = prev.sessionItemIds.length;
      var nextPhase = prev.currentPhase;
      var advanced = false;
      if (nextItemIdx >= totalInPhase) {
        nextPhase = prev.currentPhase === "mediation" ? "posttest" : "summary";
        nextItemIdx = 0;
        advanced = true;
      }
      patchSession({
        itemResults: newResults,
        currentItemIdx: nextItemIdx,
        currentPhase: nextPhase,
        currentLadderLevel: 0
      });
      setAiAttempts([]);
      setAiError(null);
      setObservationDraft("");
      setResponseDraft("");
      if (advanced) {
        announce(nextPhase === "summary"
          ? "All phases complete."
          : (nextPhase + " phase started."));
      } else {
        announce("Item " + (nextItemIdx + 1) + " of " + totalInPhase);
      }
    }

    // ── RENDER ──
    if (!state.activeSession) return renderStartScreen();
    var s = state.activeSession;
    if (s.currentPhase === "summary") return renderSummaryScreen();
    // AI mode only changes the MEDIATION phase. Pretest/posttest are
    // single-attempt regardless of mode (they're unprompted by design).
    if (s.currentPhase === "mediation" && s.mode === "ai") {
      return renderActivePhaseAI();
    }
    return renderActivePhase();

    // ─── Start screen ───
    function renderStartScreen() {
      var nicknameDraftTuple = useState("");
      var nicknameDraft = nicknameDraftTuple[0];
      var setNicknameDraft = nicknameDraftTuple[1];
      var difficultyDraftTuple = useState("easy");
      var difficultyDraft = difficultyDraftTuple[0];
      var setDifficultyDraft = difficultyDraftTuple[1];
      var modeDraftTuple = useState("clinician");
      var modeDraft = modeDraftTuple[0];
      var setModeDraft = modeDraftTuple[1];
      var hasGemini = typeof props.callGemini === "function";
      return h("div", { className: "da-root da-fade-in", style: { maxWidth: 720, margin: "0 auto", padding: 20 } },
        h("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14 } },
          props.onClose ? h("button", {
            onClick: props.onClose, "aria-label": "Close Dynamic Assessment Studio",
            style: { background: "transparent", border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }
          }, "← Back") : null,
          h("div", null,
            h("div", { style: { fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 } }, "Clinical tool · v1"),
            h("h1", { style: { margin: "2px 0 0", fontSize: 24, fontWeight: 800, color: "#0f172a" } }, "🔬 Dynamic Assessment Studio")
          )
        ),
        h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("p", { style: { margin: "0 0 8px", fontSize: 14, color: "#334155", lineHeight: 1.6 } },
            "Probes the student's ", h("strong", null, "modifiability"), " — how much their performance changes with structured scaffolding — rather than static ability alone. Following the Feuerstein / Vygotsky tradition: a pretest baseline, a mediation phase where you deliver graduated prompts, and a posttest re-measure."
          ),
          h("p", { style: { margin: 0, fontSize: 12, color: "#64748b", fontStyle: "italic", lineHeight: 1.6 } },
            "Examiner-led mode is the default. Sit beside the student, run the items, and choose which scaffold level to deliver when they struggle. Free-text observations stay on this device — never synced."
          )
        ),
        h("div", { className: "da-card" },
          h("h2", { style: { fontSize: 16, fontWeight: 800, margin: "0 0 10px", color: "#0f172a" } }, "Start a session"),
          // Nickname
          h("label", {
            htmlFor: "da-nickname",
            style: { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: 4 }
          }, "Student codename (optional)"),
          h("input", {
            id: "da-nickname", type: "text", value: nicknameDraft, maxLength: 30,
            onChange: function (e) { setNicknameDraft(e.target.value); },
            placeholder: "e.g., AmberSparrow",
            style: { width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontFamily: "inherit", fontSize: 14, boxSizing: "border-box", marginBottom: 12 }
          }),
          // Domain (Phase A: math only)
          h("div", { style: { marginBottom: 12 } },
            h("div", { style: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: 4 } }, "Domain"),
            h("div", {
              style: { padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#f1f5f9", fontSize: 13 }
            },
              h("span", { style: { fontWeight: 700 } }, "🧮 Math reasoning"),
              h("span", { style: { color: "#64748b", marginLeft: 8 } }, "· word problems with scaffolded ladders"),
              h("div", { style: { fontSize: 11, color: "#64748b", marginTop: 4, fontStyle: "italic" } },
                "Reading comprehension, working memory, and language production ship in Phase C.")
            )
          ),
          // Difficulty
          h("div", { style: { marginBottom: 14 } },
            h("div", { style: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: 4 } }, "Difficulty band"),
            h("div", { style: { display: "flex", gap: 8 } },
              [
                { id: "easy", label: "Easy", grade: "Grades 2–3", desc: "One-step word problems" },
                { id: "medium", label: "Medium", grade: "Grades 4–5", desc: "Two-step word problems" },
                { id: "hard", label: "Hard", grade: "Grades 6–7", desc: "Multi-step / fractions / proportions" }
              ].map(function (opt) {
                var active = difficultyDraft === opt.id;
                return h("button", {
                  key: "da-diff-" + opt.id,
                  onClick: function () { setDifficultyDraft(opt.id); },
                  "aria-pressed": active,
                  style: {
                    flex: 1, padding: "10px 12px", textAlign: "left",
                    border: active ? "2px solid #3b82f6" : "1px solid #cbd5e1",
                    borderRadius: 10, background: active ? "#eff6ff" : "#ffffff",
                    cursor: "pointer", fontFamily: "inherit"
                  }
                },
                  h("div", { style: { fontSize: 13, fontWeight: 700, color: "#0f172a" } }, opt.label),
                  h("div", { style: { fontSize: 11, color: "#64748b", marginTop: 2 } }, opt.grade),
                  h("div", { style: { fontSize: 11, color: "#64748b", marginTop: 2 } }, opt.desc)
                );
              })
            )
          ),
          // Mediation mode (Phase B)
          h("div", { style: { marginBottom: 14 } },
            h("div", { style: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: 4 } }, "Mediation mode"),
            h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
              [
                { id: "clinician", label: "Clinician-led", icon: "🧑‍⚕️", desc: "You pick which scaffold level to deliver. Full clinical control." },
                { id: "ai", label: "AI-mediated" + (hasGemini ? "" : " (unavailable)"), icon: "🤖", desc: "Gemini plays the examiner role: evaluates each response and chooses the next scaffold. For non-specialist settings." }
              ].map(function (opt) {
                var active = modeDraft === opt.id;
                var disabled = opt.id === "ai" && !hasGemini;
                return h("button", {
                  key: "da-mode-" + opt.id,
                  onClick: function () { if (!disabled) setModeDraft(opt.id); },
                  "aria-pressed": active,
                  disabled: disabled,
                  style: {
                    flex: "1 1 220px", padding: "10px 12px", textAlign: "left",
                    border: active ? "2px solid #3b82f6" : "1px solid #cbd5e1",
                    borderRadius: 10, background: active ? "#eff6ff" : disabled ? "#f1f5f9" : "#ffffff",
                    cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
                    opacity: disabled ? 0.55 : 1
                  }
                },
                  h("div", { style: { fontSize: 13, fontWeight: 700, color: "#0f172a" } }, opt.icon + " " + opt.label),
                  h("div", { style: { fontSize: 11, color: "#64748b", marginTop: 4, lineHeight: 1.5 } }, opt.desc)
                );
              })
            )
          ),
          h("button", {
            onClick: function () {
              startSession({
                studentNickname: nicknameDraft.trim(),
                domain: "math",
                difficulty: difficultyDraft,
                mode: modeDraft
              });
            },
            style: { padding: "10px 22px", borderRadius: 10, border: "none", background: "#1e3a8a", color: "#ffffff", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }
          }, "Begin pretest →")
        ),
        // Prior sessions list (collapsed when empty)
        Array.isArray(state.sessions) && state.sessions.length > 0 ? h("details", {
          style: { marginTop: 14 }
        },
          h("summary", { style: { fontSize: 12, fontWeight: 700, color: "#64748b", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em" } },
            "📁 Prior sessions · " + state.sessions.length),
          h("div", { style: { marginTop: 10, display: "flex", flexDirection: "column", gap: 6 } },
            state.sessions.slice().reverse().map(function (sn) {
              var dt = "";
              try { dt = new Date(sn.dateCompleted).toLocaleDateString(); } catch (e) {}
              return h("div", { key: "da-prev-" + sn.id, className: "da-card", style: { padding: 10 } },
                h("div", { style: { fontSize: 13, fontWeight: 700, color: "#0f172a" } },
                  (sn.studentNickname || "Anonymous") + " · " + sn.domain + " (" + sn.difficulty + ")"),
                h("div", { style: { fontSize: 11, color: "#64748b", marginTop: 2 } },
                  dt + " · pretest " + sn.pretestSum + " / posttest " + sn.posttestSum +
                  " · index " + (typeof sn.modifiabilityIndex === "number" ? sn.modifiabilityIndex.toFixed(2) : "—")),
                sn.modifiabilityTier ? h("div", { style: { fontSize: 11, color: "#475569", marginTop: 4, fontStyle: "italic" } },
                  sn.modifiabilityTier.label) : null
              );
            })
          )
        ) : null
      );
    }

    // ─── Active phase (pretest, mediation, or posttest) ───
    function renderActivePhase() {
      var s = state.activeSession;
      var phase = s.currentPhase;
      var idx = s.currentItemIdx;
      var itemId = s.sessionItemIds[idx];
      var item = ITEMS_BY_ID[itemId];
      if (!item) {
        // Shouldn't happen; safety guard
        return h("div", { className: "da-root", style: { padding: 20 } },
          h("p", null, "Item not found. Discard session?"),
          h("button", { onClick: discardSession }, "Discard"));
      }

      var phaseInfo = {
        pretest: { label: "Pretest", color: "#475569", hint: "No scaffolds. Record what the student does alone." },
        mediation: { label: "Mediation", color: "#3b82f6", hint: "Same items — use the scaffold ladder. Record what support produced success." },
        posttest: { label: "Posttest", color: "#16a34a", hint: "Re-test alone. Compare to pretest." }
      }[phase] || { label: phase, color: "#64748b", hint: "" };

      var totalInPhase = s.sessionItemIds.length;
      var pct = Math.round(((idx) / totalInPhase) * 100);
      var canScaffold = phase === "mediation";

      return h("div", { className: "da-root da-fade-in", style: { maxWidth: 820, margin: "0 auto", padding: 20 } },
        // Header
        h("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" } },
          h("button", {
            onClick: function () {
              if (window.confirm("Discard this session? Progress will be lost.")) discardSession();
            },
            style: { background: "transparent", border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }
          }, "✕ Discard"),
          h("div", { style: { flex: 1, minWidth: 220 } },
            h("div", { style: { fontSize: 11, color: phaseInfo.color, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800 } },
              phaseInfo.label + " phase · item " + (idx + 1) + " of " + totalInPhase),
            h("div", { style: { fontSize: 12, color: "#64748b", fontStyle: "italic", marginTop: 2 } }, phaseInfo.hint)
          ),
          s.studentNickname ? h("div", { style: { fontSize: 11, color: "#64748b" } },
            "Student: " + s.studentNickname) : null
        ),
        // Progress bar
        h("div", { style: { height: 4, background: "#e2e8f0", borderRadius: 2, overflow: "hidden", marginBottom: 14 } },
          h("div", { style: { width: pct + "%", height: "100%", background: phaseInfo.color, transition: "width 0.3s ease" } })
        ),

        // ─── ITEM CARD ───
        h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("div", { style: { fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 6 } },
            item.construct + " · " + item.difficulty + " · grades " + item.gradeBand),
          h("p", { style: { margin: 0, fontSize: 16, color: "#0f172a", lineHeight: 1.65 } }, item.prompt)
        ),

        // ─── SCAFFOLD LADDER (only in mediation phase) ───
        canScaffold ? h("div", { className: "da-card", style: { marginBottom: 14, background: "#fffbeb", borderColor: "#fbbf24" } },
          h("div", { style: { fontSize: 11, color: "#a16207", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800, marginBottom: 6 } },
            "Scaffold ladder · current level " + s.currentLadderLevel),
          h("div", { style: { fontSize: 11, color: "#92400e", fontStyle: "italic", marginBottom: 10 } },
            "Click a level to reveal it to yourself. You decide when to deliver each scaffold to the student. The level you record below should match the highest level needed."),
          h("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
            item.promptLadder.map(function (step) {
              var isActive = s.currentLadderLevel === step.level;
              var hasBeenUsed = s.currentLadderLevel >= step.level;
              var stepLabel = { cue: "Declarative cue", leading: "Leading question", model: "Modeling", directTeach: "Direct teach" }[step.type] || step.type;
              return h("div", {
                key: "da-step-" + step.level,
                className: "da-ladder-step" + (isActive ? " active" : "") + (hasBeenUsed && !isActive ? " used" : "")
              },
                h("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
                  h("span", { style: { fontSize: 12, fontWeight: 800, color: "#0f172a", minWidth: 30 } }, "L" + step.level),
                  h("span", { style: { flex: 1, fontSize: 12, fontWeight: 700, color: "#0f172a" } }, stepLabel),
                  h("button", {
                    onClick: function () { setLadderLevel(step.level); },
                    "aria-label": "Reveal level " + step.level + " scaffold",
                    style: {
                      padding: "4px 10px", borderRadius: 6, border: "1px solid " + (hasBeenUsed ? "#fbbf24" : "#cbd5e1"),
                      background: hasBeenUsed ? "#fef3c7" : "#ffffff", color: "#0f172a",
                      fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit"
                    }
                  }, hasBeenUsed ? "Re-show" : "Show")
                ),
                hasBeenUsed ? h("p", { style: { margin: "6px 0 0", fontSize: 12, color: "#334155", lineHeight: 1.55, paddingLeft: 38 } },
                  '"' + step.text + '"') : null
              );
            })
          )
        ) : null,

        // ─── STUDENT RESPONSE INPUT ───
        h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("label", {
            htmlFor: "da-response",
            style: { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: 4 }
          }, "Student response"),
          h("textarea", {
            id: "da-response", rows: 2, value: responseDraft,
            onChange: function (e) { setResponseDraft(e.target.value); },
            placeholder: "Type or paraphrase what the student said…",
            style: { width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontFamily: "inherit", fontSize: 13, boxSizing: "border-box", resize: "vertical" }
          })
        ),

        // ─── EXAMINER OBSERVATION ───
        h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("label", {
            htmlFor: "da-observation",
            style: { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: 4 }
          }, "Examiner observation (local only — not synced)"),
          h("textarea", {
            id: "da-observation", rows: 2, value: observationDraft,
            onChange: function (e) { setObservationDraft(e.target.value); },
            placeholder: "Strategy used, hesitation, affect, anything notable…",
            style: { width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontFamily: "inherit", fontSize: 13, boxSizing: "border-box", resize: "vertical" }
          })
        ),

        // ─── SCORING ROW ───
        h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" } },
          h("div", { style: { fontSize: 12, color: "#475569" } },
            canScaffold
              ? "Auto-detect or override below. Auto-check matches student response against canonical answer."
              : "Auto-check matches student response against the canonical answer."
          ),
          h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
            // Auto-check button
            h("button", {
              onClick: function () {
                var correct = matchAnswer(item, responseDraft);
                var level = canScaffold ? (s.currentLadderLevel || 0) : 0;
                submitResponse({
                  phase: phase, itemId: itemId,
                  response: responseDraft,
                  levelReached: level,
                  finalCorrect: correct,
                  examinerObservation: observationDraft,
                  supportType: canScaffold ? (item.promptLadder[level - 1] ? item.promptLadder[level - 1].type : "none") : "none"
                });
              },
              style: { padding: "8px 16px", borderRadius: 10, border: "none", background: "#1e3a8a", color: "#ffffff", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }
            }, "✓ Auto-check + record"),
            // Manual override
            h("button", {
              onClick: function () {
                var level = canScaffold ? (s.currentLadderLevel || 0) : 0;
                submitResponse({
                  phase: phase, itemId: itemId,
                  response: responseDraft,
                  levelReached: level,
                  finalCorrect: true,
                  examinerObservation: observationDraft,
                  supportType: canScaffold ? (item.promptLadder[level - 1] ? item.promptLadder[level - 1].type : "none") : "none"
                });
              },
              style: { padding: "8px 16px", borderRadius: 10, border: "1px solid #16a34a", background: "#f0fdf4", color: "#15803d", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }
            }, "Mark correct"),
            h("button", {
              onClick: function () {
                var level = canScaffold ? 4 : 0; // Wrong even after direct teach = level 4 with no credit
                submitResponse({
                  phase: phase, itemId: itemId,
                  response: responseDraft,
                  levelReached: level,
                  finalCorrect: false,
                  examinerObservation: observationDraft,
                  supportType: canScaffold ? "directTeach" : "none"
                });
              },
              style: { padding: "8px 16px", borderRadius: 10, border: "1px solid #dc2626", background: "#fef2f2", color: "#b91c1c", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }
            }, "Mark wrong"),
            // Skip — record as wrong, level 0
            h("button", {
              onClick: function () {
                submitResponse({
                  phase: phase, itemId: itemId,
                  response: responseDraft || "(skipped)",
                  levelReached: 0, finalCorrect: false,
                  examinerObservation: observationDraft,
                  supportType: "skipped"
                });
              },
              style: { padding: "8px 12px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#ffffff", color: "#475569", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }
            }, "Skip")
          )
        ),
        // Canonical answer reveal (collapsed by default)
        h("details", { style: { marginTop: 10 } },
          h("summary", { style: { fontSize: 11, color: "#64748b", cursor: "pointer", fontStyle: "italic" } },
            "Reveal canonical answer (examiner only)"),
          h("div", { style: { marginTop: 6, padding: 8, background: "#f1f5f9", borderRadius: 6, fontSize: 13, color: "#0f172a", fontFamily: "ui-monospace, monospace" } },
            item.correctAnswer)
        )
      );
    }

    // ─── Phase B — AI-mediated mediation phase ───
    // Multi-attempt loop: student types response → Gemini evaluates +
    // decides next scaffold → scaffold text shown → student retries →
    // loop until correct or directTeach delivered. Attempts log scrolls
    // below; final per-item score = 5 - finalLevel.
    function renderActivePhaseAI() {
      var s = state.activeSession;
      var idx = s.currentItemIdx;
      var itemId = s.sessionItemIds[idx];
      var item = ITEMS_BY_ID[itemId];
      if (!item) {
        return h("div", { className: "da-root", style: { padding: 20 } },
          h("p", null, "Item not found. Discard session?"),
          h("button", { onClick: discardSession }, "Discard"));
      }
      var totalInPhase = s.sessionItemIds.length;
      var pct = Math.round(((idx) / totalInPhase) * 100);
      var scaffoldsDelivered = aiAttempts
        .map(function (a) { return a.levelAfter; })
        .filter(function (l) { return typeof l === "number" && l > 0; });
      var deliveredUniq = {};
      scaffoldsDelivered.forEach(function (l) { deliveredUniq[l] = true; });
      var currentLevel = scaffoldsDelivered.length === 0 ? 0 : Math.max.apply(null, scaffoldsDelivered);
      var alreadyHadL4 = !!deliveredUniq[4];
      // Most recent scaffold text to display prominently
      var lastScaffoldText = "";
      for (var ai = aiAttempts.length - 1; ai >= 0; ai--) {
        if (aiAttempts[ai].scaffoldShown) { lastScaffoldText = aiAttempts[ai].scaffoldShown; break; }
      }

      return h("div", { className: "da-root da-fade-in", style: { maxWidth: 820, margin: "0 auto", padding: 20 } },
        // Header
        h("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" } },
          h("button", {
            onClick: function () {
              if (window.confirm("Discard this session? Progress will be lost.")) discardSession();
            },
            style: { background: "transparent", border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }
          }, "✕ Discard"),
          h("div", { style: { flex: 1, minWidth: 220 } },
            h("div", { style: { fontSize: 11, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800 } },
              "🤖 AI mediation · item " + (idx + 1) + " of " + totalInPhase),
            h("div", { style: { fontSize: 12, color: "#64748b", fontStyle: "italic", marginTop: 2 } },
              "Gemini evaluates each response and chooses the next scaffold. Examiner records observations alongside.")
          ),
          s.studentNickname ? h("div", { style: { fontSize: 11, color: "#64748b" } },
            "Student: " + s.studentNickname) : null
        ),
        // Progress bar
        h("div", { style: { height: 4, background: "#e2e8f0", borderRadius: 2, overflow: "hidden", marginBottom: 14 } },
          h("div", { style: { width: pct + "%", height: "100%", background: "#3b82f6", transition: "width 0.3s ease" } })
        ),
        // Item card
        h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("div", { style: { fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 6 } },
            item.construct + " · " + item.difficulty + " · grades " + item.gradeBand),
          h("p", { style: { margin: 0, fontSize: 16, color: "#0f172a", lineHeight: 1.65 } }, item.prompt)
        ),
        // Latest scaffold (if any)
        lastScaffoldText ? h("div", { className: "da-card da-fade-in", style: { marginBottom: 14, background: "#fffbeb", borderColor: "#fbbf24" } },
          h("div", { style: { fontSize: 11, color: "#a16207", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800, marginBottom: 4 } },
            "AI scaffold delivered · L" + currentLevel),
          h("p", { style: { margin: 0, fontSize: 14, color: "#92400e", lineHeight: 1.6, fontStyle: "italic" } },
            "“" + lastScaffoldText + "”")
        ) : null,
        // Error banner (when fallback kicked in)
        aiError ? h("div", { style: { marginBottom: 14, padding: "8px 12px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, fontSize: 12, color: "#b91c1c" } },
          aiError) : null,
        // Response input
        h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("label", {
            htmlFor: "da-ai-response",
            style: { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: 4 }
          }, aiAttempts.length === 0 ? "Student response (first attempt)" : "Student response (retry after L" + currentLevel + " scaffold)"),
          h("textarea", {
            id: "da-ai-response", rows: 2, value: responseDraft, disabled: aiBusy,
            onChange: function (e) { setResponseDraft(e.target.value); },
            placeholder: "Type or paraphrase what the student said…",
            style: { width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontFamily: "inherit", fontSize: 13, boxSizing: "border-box", resize: "vertical", opacity: aiBusy ? 0.6 : 1 }
          })
        ),
        // Examiner observation
        h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("label", {
            htmlFor: "da-ai-obs",
            style: { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: 4 }
          }, "Examiner observation (local only — appended to AI notes)"),
          h("textarea", {
            id: "da-ai-obs", rows: 2, value: observationDraft,
            onChange: function (e) { setObservationDraft(e.target.value); },
            placeholder: "Strategy, hesitation, affect, anything notable…",
            style: { width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontFamily: "inherit", fontSize: 13, boxSizing: "border-box", resize: "vertical" }
          })
        ),
        // Action row
        h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" } },
          h("div", { style: { fontSize: 12, color: "#475569" } },
            aiBusy ? "🤖 AI is evaluating…" :
            alreadyHadL4 ? "Direct teach already delivered. Mark as wrong to advance." :
            "Submit response → AI evaluates → next scaffold appears (if needed)."),
          h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
            h("button", {
              onClick: function () {
                if (aiBusy) return;
                if (!responseDraft.trim()) return;
                runAiMediate(item, responseDraft);
              },
              disabled: aiBusy || !responseDraft.trim(),
              style: {
                padding: "8px 16px", borderRadius: 10, border: "none",
                background: (aiBusy || !responseDraft.trim()) ? "#94a3b8" : "#1e3a8a",
                color: "#ffffff", fontWeight: 800, fontSize: 13,
                cursor: (aiBusy || !responseDraft.trim()) ? "not-allowed" : "pointer",
                fontFamily: "inherit"
              }
            }, aiBusy ? "…" : "Submit to AI mediator"),
            // Manual override — examiner can force-correct or force-wrong
            // without consuming another AI call.
            h("button", {
              onClick: function () {
                if (aiBusy) return;
                finalizeAiItem(item, aiAttempts.concat([{
                  response: responseDraft || "(examiner override: correct)",
                  verdict: "correct",
                  levelAfter: currentLevel,
                  scaffoldShown: "",
                  observationHint: "Examiner marked correct."
                }]), true);
              },
              disabled: aiBusy,
              style: { padding: "8px 14px", borderRadius: 10, border: "1px solid #16a34a", background: "#f0fdf4", color: "#15803d", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }
            }, "Mark correct"),
            h("button", {
              onClick: function () {
                if (aiBusy) return;
                finalizeAiItem(item, aiAttempts.concat([{
                  response: responseDraft || "(examiner override: wrong)",
                  verdict: "incorrect",
                  levelAfter: 4,
                  scaffoldShown: "",
                  observationHint: "Examiner marked wrong without further mediation."
                }]), false);
              },
              disabled: aiBusy,
              style: { padding: "8px 14px", borderRadius: 10, border: "1px solid #dc2626", background: "#fef2f2", color: "#b91c1c", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }
            }, "Mark wrong")
          )
        ),
        // Attempts log (this item's mediation cycle)
        aiAttempts.length > 0 ? h("details", { open: true, style: { marginTop: 14 } },
          h("summary", { style: { fontSize: 11, fontWeight: 700, color: "#475569", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em" } },
            "Mediation cycle · " + aiAttempts.length + " attempt" + (aiAttempts.length === 1 ? "" : "s")),
          h("div", { style: { marginTop: 8, display: "flex", flexDirection: "column", gap: 6 } },
            aiAttempts.map(function (a, ai) {
              var verdictColor = a.verdict === "correct" ? "#16a34a" : a.verdict === "partial" ? "#a16207" : "#b91c1c";
              return h("div", { key: "da-ai-att-" + ai, className: "da-card", style: { padding: 10 } },
                h("div", { style: { fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 4 } },
                  "Attempt " + (ai + 1) + " · ",
                  h("span", { style: { color: verdictColor } }, a.verdict),
                  " · L" + a.levelAfter),
                h("div", { style: { fontSize: 12, color: "#0f172a", marginBottom: 3 } },
                  h("strong", null, "Response: "), "“" + a.response + "”"),
                a.scaffoldShown ? h("div", { style: { fontSize: 11, color: "#92400e", fontStyle: "italic", marginBottom: 3 } },
                  "→ Scaffold: " + a.scaffoldShown) : null,
                a.observationHint ? h("div", { style: { fontSize: 11, color: "#64748b" } },
                  "AI note: " + a.observationHint) : null
              );
            })
          )
        ) : null,
        // Canonical answer (collapsed)
        h("details", { style: { marginTop: 10 } },
          h("summary", { style: { fontSize: 11, color: "#64748b", cursor: "pointer", fontStyle: "italic" } },
            "Reveal canonical answer (examiner only)"),
          h("div", { style: { marginTop: 6, padding: 8, background: "#f1f5f9", borderRadius: 6, fontSize: 13, color: "#0f172a", fontFamily: "ui-monospace, monospace" } },
            item.correctAnswer)
        )
      );
    }

    // ─── Summary screen ───
    function renderSummaryScreen() {
      var s = state.activeSession;
      var pretestResults = s.itemResults.filter(function (r) { return r.phase === "pretest"; });
      var mediationResults = s.itemResults.filter(function (r) { return r.phase === "mediation"; });
      var posttestResults = s.itemResults.filter(function (r) { return r.phase === "posttest"; });
      var pretestSum = sumItemResultScores(pretestResults);
      var posttestSum = sumItemResultScores(posttestResults);
      var modIdx = computeModifiabilityIndex(pretestSum, posttestSum, s.sessionItemIds.length);
      var tier = modifiabilityTier(modIdx);
      var max = maxPossibleScore(s.sessionItemIds.length);

      // Scaffold-type histogram (mediation phase only)
      var scaffoldTypes = { cue: 0, leading: 0, model: 0, directTeach: 0, none: 0, skipped: 0 };
      mediationResults.forEach(function (r) {
        var t = r.supportType || "none";
        scaffoldTypes[t] = (scaffoldTypes[t] || 0) + 1;
      });

      return h("div", { className: "da-root da-fade-in", style: { maxWidth: 820, margin: "0 auto", padding: 20 } },
        // Header
        h("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14 } },
          h("div", null,
            h("div", { style: { fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 } }, "Session complete"),
            h("h1", { style: { margin: "2px 0 0", fontSize: 22, fontWeight: 800, color: "#0f172a" } },
              "Modifiability profile · " + (s.studentNickname || "Anonymous"))
          )
        ),

        // Headline modifiability card
        h("div", {
          className: "da-card da-pop",
          style: {
            marginBottom: 14, padding: 18,
            background: tier.id === "high" ? "#f0fdf4" : tier.id === "moderate" ? "#fffbeb" : tier.id === "low" ? "#fef2f2" : "#f1f5f9",
            borderColor: tier.id === "high" ? "#86efac" : tier.id === "moderate" ? "#fbbf24" : tier.id === "low" ? "#fca5a5" : "#cbd5e1"
          }
        },
          h("div", { style: { fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800, marginBottom: 6 } },
            "Modifiability Index"),
          h("div", { style: { display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" } },
            h("div", { style: { fontSize: 42, fontWeight: 900, color: "#0f172a", lineHeight: 1 } },
              (modIdx >= 0 ? "+" : "") + modIdx.toFixed(2)),
            h("div", { style: { fontSize: 16, fontWeight: 700, color: "#0f172a" } }, tier.label)
          ),
          h("p", { style: { margin: "10px 0 0", fontSize: 13, color: "#334155", lineHeight: 1.65 } }, tier.desc)
        ),

        // Score breakdown
        h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 14 } },
          h("div", { className: "da-card", style: { textAlign: "center" } },
            h("div", { style: { fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 } }, "Pretest baseline"),
            h("div", { style: { fontSize: 26, fontWeight: 900, color: "#475569", marginTop: 4 } }, pretestSum + " / " + max),
            h("div", { style: { fontSize: 10, color: "#64748b" } }, "unprompted credit only")
          ),
          h("div", { className: "da-card", style: { textAlign: "center" } },
            h("div", { style: { fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 } }, "Posttest score"),
            h("div", { style: { fontSize: 26, fontWeight: 900, color: "#16a34a", marginTop: 4 } }, posttestSum + " / " + max),
            h("div", { style: { fontSize: 10, color: "#64748b" } }, "after mediation")
          ),
          h("div", { className: "da-card", style: { textAlign: "center" } },
            h("div", { style: { fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 } }, "Growth"),
            h("div", { style: { fontSize: 26, fontWeight: 900, color: posttestSum - pretestSum >= 0 ? "#16a34a" : "#b91c1c", marginTop: 4 } },
              (posttestSum - pretestSum >= 0 ? "+" : "") + (posttestSum - pretestSum) + " pts"),
            h("div", { style: { fontSize: 10, color: "#64748b" } }, "absolute change")
          )
        ),

        // Mediation scaffold histogram
        h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("h3", { style: { margin: "0 0 8px", fontSize: 14, fontWeight: 800, color: "#0f172a" } }, "Scaffolds used during mediation"),
          h("div", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#475569" } },
            ["cue", "leading", "model", "directTeach", "none", "skipped"].filter(function (k) { return scaffoldTypes[k] > 0; }).map(function (k) {
              var labels = { cue: "L1 — Declarative cues", leading: "L2 — Leading questions", model: "L3 — Modeling", directTeach: "L4 — Direct teaching", none: "L0 — Solved unprompted", skipped: "Skipped" };
              return h("div", { key: "da-hist-" + k, style: { display: "flex", justifyContent: "space-between" } },
                h("span", null, labels[k]),
                h("span", { style: { fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "#0f172a" } }, "×" + scaffoldTypes[k])
              );
            })
          )
        ),

        // Per-item table
        h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("h3", { style: { margin: "0 0 8px", fontSize: 14, fontWeight: 800, color: "#0f172a" } }, "Per-item results"),
          h("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 12 } },
            h("thead", null,
              h("tr", { style: { background: "#f1f5f9" } },
                h("th", { style: { textAlign: "left", padding: "6px 8px", border: "1px solid #cbd5e1" } }, "Item"),
                h("th", { style: { textAlign: "left", padding: "6px 8px", border: "1px solid #cbd5e1" } }, "Phase"),
                h("th", { style: { textAlign: "left", padding: "6px 8px", border: "1px solid #cbd5e1" } }, "Level"),
                h("th", { style: { textAlign: "left", padding: "6px 8px", border: "1px solid #cbd5e1" } }, "Score")
              )
            ),
            h("tbody", null,
              s.itemResults.map(function (r, ri) {
                var item = ITEMS_BY_ID[r.itemId];
                return h("tr", { key: "da-row-" + ri },
                  h("td", { style: { padding: "6px 8px", border: "1px solid #e2e8f0" } }, item ? item.construct : r.itemId),
                  h("td", { style: { padding: "6px 8px", border: "1px solid #e2e8f0", color: "#64748b" } }, r.phase),
                  h("td", { style: { padding: "6px 8px", border: "1px solid #e2e8f0", fontFamily: "ui-monospace, monospace" } }, "L" + r.promptLevelReached),
                  h("td", { style: { padding: "6px 8px", border: "1px solid #e2e8f0", fontFamily: "ui-monospace, monospace", fontWeight: 700 } },
                    r.scoreAwarded + (r.finalCorrect ? "" : " ✗"))
                );
              })
            )
          )
        ),
        // ── Phase B — AI mediation cycle transcripts ──
        // For each mediation item that has an aiAttemptsLog, render the
        // full Q-A-scaffold-retry transcript so the examiner has the
        // qualitative evidence behind the score for the report.
        (function () {
          var aiItems = (s.itemResults || []).filter(function (r) {
            return r.phase === "mediation" && Array.isArray(r.aiAttemptsLog) && r.aiAttemptsLog.length > 0;
          });
          if (aiItems.length === 0) return null;
          return h("div", { className: "da-card", style: { marginBottom: 14 } },
            h("h3", { style: { margin: "0 0 4px", fontSize: 14, fontWeight: 800, color: "#0f172a" } },
              "🤖 AI mediation transcripts"),
            h("p", { style: { margin: "0 0 10px", fontSize: 11, color: "#64748b", fontStyle: "italic" } },
              "Full Q-A-scaffold-retry log for each mediation item. Useful as qualitative evidence in the report."),
            h("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
              aiItems.map(function (r, ri) {
                var item = ITEMS_BY_ID[r.itemId];
                return h("details", { key: "da-ai-trans-" + ri, style: { padding: "8px 10px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8 } },
                  h("summary", { style: { fontSize: 12, fontWeight: 700, color: "#0f172a", cursor: "pointer" } },
                    (item ? item.construct : r.itemId) + " · " + r.aiAttemptsLog.length + " attempt" + (r.aiAttemptsLog.length === 1 ? "" : "s") + " · final L" + r.promptLevelReached + " · " + r.scoreAwarded + " pts"),
                  h("div", { style: { marginTop: 8, display: "flex", flexDirection: "column", gap: 6 } },
                    r.aiAttemptsLog.map(function (a, ai) {
                      var verdictColor = a.verdict === "correct" ? "#16a34a" : a.verdict === "partial" ? "#a16207" : "#b91c1c";
                      return h("div", { key: "da-ai-trans-" + ri + "-" + ai, style: { padding: 8, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11.5 } },
                        h("div", { style: { color: "#64748b", fontWeight: 700, marginBottom: 3 } },
                          "Attempt " + (ai + 1) + " · ",
                          h("span", { style: { color: verdictColor } }, a.verdict),
                          " · L" + a.levelAfter),
                        h("div", { style: { color: "#0f172a", marginBottom: 2 } }, h("strong", null, "Response: "), "“" + a.response + "”"),
                        a.scaffoldShown ? h("div", { style: { color: "#92400e", fontStyle: "italic", marginBottom: 2 } }, "→ Scaffold: " + a.scaffoldShown) : null,
                        a.observationHint ? h("div", { style: { color: "#64748b" } }, "AI note: " + a.observationHint) : null
                      );
                    })
                  )
                );
              })
            )
          );
        })(),

        // Action row
        h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
          h("button", {
            onClick: function () {
              finalizeSession();
              addToast("Session saved.");
            },
            style: { padding: "10px 18px", borderRadius: 10, border: "none", background: "#16a34a", color: "#ffffff", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }
          }, "✓ Save session"),
          h("button", {
            onClick: function () {
              if (window.confirm("Discard without saving?")) discardSession();
            },
            style: { padding: "10px 16px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#ffffff", color: "#475569", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }
          }, "Discard without saving")
        )
      );
    }
  }

  // ═════════════════════════════════════════════════════════
  // SECTION 5 — Export
  // ═════════════════════════════════════════════════════════
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.DynamicAssessment = DynamicAssessment;
  // Also expose constants for future host integrations / Report Writer.
  window.AlloModules.DynamicAssessment._meta = {
    version: "1.0.0-phaseA",
    storageKey: STORAGE_KEY,
    domains: ["math"],
    itemCounts: { math: MATH_ITEMS.length },
    scoreForLevel: scoreForLevel,
    computeModifiabilityIndex: computeModifiabilityIndex,
    modifiabilityTier: modifiabilityTier
  };
  console.log("[CDN] DynamicAssessment loaded (Phase A — math domain, " + MATH_ITEMS.length + " items)");
})();
