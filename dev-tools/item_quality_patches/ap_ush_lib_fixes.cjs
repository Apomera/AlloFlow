'use strict';

// Surgical, single-match, idempotent historical, chronological, and statutory accuracy fixes for:
//   test_prep/ap_us_history_foundation_pilot_learning_library.json
//
// Each rule's `find` string matches EXACTLY ONCE in JSON.stringify(lib, null, 2).
// Applying a rule once replaces the exact error; re-applying finds 0 matches (idempotent).

module.exports = {
  ap_us_history_foundation_pilot: [
    // 1. quickReference[0].formulas[3] (ap-ush-reference-01): Valladolid Debate (1550-1551) cannot "lead to" New Laws of 1542
    {
      pathHint: 'quickReference[0].formulas[3] (ap-ush-reference-01)',
      find: '"Valladolid Debate (1550–1551): Bartolomé de las Casas challenged Juan Ginés de Sepúlveda over Indigenous humanity and harsh encomienda abuses, leading to the New Laws of 1542."',
      replace: '"New Laws of 1542 & Valladolid Debate (1550–1551): Bartolomé de las Casas\'s critique of harsh encomienda abuses spurred the New Laws of 1542, and he later debated Juan Ginés de Sepúlveda at Valladolid (1550–1551) over Indigenous humanity and Spanish conquest."',
      reason: 'Chronological and causal reversal: the Valladolid Debate took place in 1550–1551, eight years after Emperor Charles V enacted the New Laws of 1542; Las Casas\'s earlier advocacy spurred the New Laws of 1542, and colonial backlash led to the 1550–1551 Valladolid Debate.',
    },

    // 2. chapters[4].sections[0].workedExample.steps[1] (apush-ch-05-section-01): Mexican Cession (1848) did not provoke Wilmot Proviso (1846)
    {
      pathHint: 'chapters[4].sections[0].workedExample.steps[1] (apush-ch-05-section-01)',
      find: '"Step 2: Trace escalation: the Mexican Cession provoked the Wilmot Proviso and fragile Compromise of 1850 (with its harsh Fugitive Slave Act), while the 1854 Kansas-Nebraska Act repealed the Missouri Compromise line via popular sovereignty, triggering \\"Bleeding Kansas\\" and shattering the Second Party System."',
      replace: '"Step 2: Trace escalation: wartime territorial ambitions provoked the Wilmot Proviso (1846), and the 1848 Mexican Cession forced the fragile Compromise of 1850 (with its harsh Fugitive Slave Act), while the 1854 Kansas-Nebraska Act repealed the Missouri Compromise line via popular sovereignty, triggering \\"Bleeding Kansas\\" and shattering the Second Party System."',
      reason: 'Chronological reversal: Rep. David Wilmot introduced the Wilmot Proviso in August 1846 during the Mexican-American War to bar slavery in prospective territory acquired from Mexico—nearly 18 months before the February 1848 Treaty of Guadalupe Hidalgo created the Mexican Cession.',
    },

    // 3. quickReference[4].formulas[0] (ap-ush-reference-05): Treaty of Guadalupe Hidalgo / Mexican Cession (1848) did not spark Wilmot Proviso (1846)
    {
      pathHint: 'quickReference[4].formulas[0] (ap-ush-reference-05)',
      find: '"Expansion ignites crisis: Manifest Destiny, Texas annexation (1845), Mexican-American War (1846–1848) & Treaty of Guadalupe Hidalgo → Mexican Cession sparked Wilmot Proviso and Compromise of 1850 (California free, harsh Fugitive Slave Act)."',
      replace: '"Expansion ignites crisis: Manifest Destiny, Texas annexation (1845), and the Mexican-American War (1846–1848) sparked the Wilmot Proviso (1846), while the Treaty of Guadalupe Hidalgo (1848) and Mexican Cession forced the Compromise of 1850 (California free, harsh Fugitive Slave Act)."',
      reason: 'Chronological reversal: aligns Period 5 quick reference with the 1846 introduction of the Wilmot Proviso during the Mexican-American War prior to the 1848 Treaty of Guadalupe Hidalgo and Mexican Cession (also resolving internal inconsistency with misconceptionRemediationPlaybooks[1]).',
    },

    // 4. chapters[8].sections[2].workedExample.steps[1] (apush-ch-09-section-03): USA PATRIOT Act (2001) did not create the Department of Homeland Security (Homeland Security Act of 2002)
    {
      pathHint: 'chapters[8].sections[2].workedExample.steps[1] (apush-ch-09-section-03)',
      find: '"Step 2: Apply causation to post-9/11 policy: the 2001 attacks triggered the War on Terror—including invasions of Afghanistan (2001) and Iraq (2003)—and domestic legislation like the USA PATRIOT Act expanding surveillance powers and creating the Department of Homeland Security."',
      replace: '"Step 2: Apply causation to post-9/11 policy: the 2001 attacks triggered the War on Terror—including invasions of Afghanistan (2001) and Iraq (2003)—and domestic legislation including the USA PATRIOT Act (2001), which expanded surveillance powers, and the Homeland Security Act (2002), which created the Department of Homeland Security."',
      reason: 'Statutory conflation: the USA PATRIOT Act (October 2001) expanded federal surveillance and intelligence powers, whereas the Department of Homeland Security was established over a year later by a separate statute, the Homeland Security Act of 2002 (November 2002).',
    },
  ],
};
