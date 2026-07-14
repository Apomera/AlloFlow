/* ============================================================
   PasstheEPPP — Textbook Ch 49: Psychopharmacokinetics & Neurotransmission
   Domain: Biological Bases of Behavior
   Features: SVG Diagrams, Knowledge Checks, Expandable Cases
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-49',
    domain: 'Biological Bases of Behavior',
    domainNumber: 1,
    title: 'Psychopharmacokinetics & Neurotransmission',
    examWeight: '10%',
    sections: [
        {
            heading: 'The Synaptic Cleft and Neurotransmission',
            content: '<p>Neurotransmission is the process by which signaling molecules called neurotransmitters are released by a neuron (the presynaptic neuron) and bind to receptors on postsynaptic cells or presynaptic autoreceptors, producing excitatory, inhibitory, or modulatory effects. Reuptake, enzymatic degradation, diffusion, and glial uptake help terminate or shape signaling. Psychotropic medications can affect several of these steps, but not every intervention acts directly at the synaptic cleft.</p>',
            interactiveDiagram: {
                description: 'The Synapse: Neurotransmitter Release and Reuptake',
                svg: '<svg viewBox="0 0 920 440" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="synapseTitle synapseDesc"><title id="synapseTitle">Chemical synaptic transmission and signal termination</title><desc id="synapseDesc">An action potential opens presynaptic calcium channels, calcium triggers vesicle fusion, neurotransmitter crosses the cleft and binds postsynaptic receptors, autoreceptors provide presynaptic feedback, and reuptake, enzymatic metabolism, glial uptake, or diffusion terminate signaling.</desc><defs><marker id="synArrow49" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#334155"/></marker></defs><rect width="920" height="440" rx="24" fill="#f8fafc"/><text x="460" y="38" text-anchor="middle" font-family="system-ui" font-size="23" font-weight="700" fill="#172554">Chemical synapse: several control points</text><g font-family="system-ui"><rect x="250" y="65" width="420" height="120" rx="22" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/><text x="460" y="92" text-anchor="middle" font-size="18" font-weight="700" fill="#1e40af">Presynaptic terminal</text><text x="285" y="125" font-size="15" fill="#1e3a8a">1 Action potential</text><text x="285" y="153" font-size="15" fill="#1e3a8a">2 Ca2+ entry</text><circle cx="510" cy="130" r="27" fill="#fff" stroke="#0284c7" stroke-width="3"/><circle cx="500" cy="125" r="5" fill="#7c3aed"/><circle cx="516" cy="136" r="5" fill="#7c3aed"/><circle cx="523" cy="121" r="5" fill="#7c3aed"/><text x="580" y="127" font-size="15" fill="#1e3a8a">3 Vesicle fusion</text><text x="580" y="153" font-size="15" fill="#1e3a8a">and release</text><path d="M510 157V215" stroke="#334155" stroke-width="3" marker-end="url(#synArrow49)"/><rect x="145" y="215" width="630" height="80" rx="16" fill="#fef3c7" stroke="#d97706" stroke-width="3"/><text x="460" y="241" text-anchor="middle" font-size="17" font-weight="700" fill="#92400e">Synaptic cleft</text><circle cx="380" cy="267" r="7" fill="#7c3aed"/><circle cx="420" cy="261" r="7" fill="#7c3aed"/><circle cx="465" cy="271" r="7" fill="#7c3aed"/><circle cx="505" cy="258" r="7" fill="#7c3aed"/><circle cx="545" cy="270" r="7" fill="#7c3aed"/><text x="220" y="271" font-size="14" fill="#78350f">4 Diffusion and binding</text><rect x="250" y="325" width="420" height="80" rx="22" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/><text x="460" y="356" text-anchor="middle" font-size="18" font-weight="700" fill="#166534">Postsynaptic membrane</text><path d="M390 325q15-28 30 0M450 325q15-28 30 0M510 325q15-28 30 0" fill="none" stroke="#15803d" stroke-width="5"/><text x="460" y="389" text-anchor="middle" font-size="14" fill="#14532d">5 Ionotropic or metabotropic receptor effects</text><path d="M370 215Q250 180 270 125" fill="none" stroke="#7c3aed" stroke-width="3" marker-end="url(#synArrow49)"/><text x="120" y="160" font-size="14" font-weight="700" fill="#5b21b6">Autoreceptor feedback</text><text x="120" y="182" font-size="13" fill="#4c1d95">can alter further release</text><path d="M560 215Q720 180 690 125" fill="none" stroke="#dc2626" stroke-width="3" marker-end="url(#synArrow49)"/><text x="705" y="112" font-size="14" font-weight="700" fill="#991b1b">Signal termination</text><text x="705" y="136" font-size="13" fill="#7f1d1d">• reuptake</text><text x="705" y="158" font-size="13" fill="#7f1d1d">• enzymes</text><text x="705" y="180" font-size="13" fill="#7f1d1d">• glia/diffusion</text></g></svg>'
            },
            knowledgeCheck: {
                question: 'Which of the following classes of medication exerts its primary effect by blocking the presynaptic transporter, thereby increasing neurotransmitter concentration in the synaptic cleft?',
                options: ['Monoamine Oxidase Inhibitors (MAOIs)', 'Selective Serotonin Reuptake Inhibitors (SSRIs)', 'Typical Antipsychotics', 'Benzodiazepines'],
                answer: 1,
                rationale: 'SSRIs work by blocking the reuptake pump (transporter) on the presynaptic neuron. This inhibits the serotonin transporter and initially reduces serotonin reuptake. The downstream clinical effects are not explained by cleft concentration alone and develop through broader circuit and adaptive processes.'
            },
            keyTerms: ['Synaptic Cleft', 'Presynaptic Neuron', 'Postsynaptic Neuron', 'Reuptake', 'Neurotransmitter']
        },
        {
            heading: 'Half-Life and Steady State',
            content: '<p><strong>Half-life (t½)</strong> is the time for a measured drug concentration or amount to fall by half during the relevant elimination phase. For linear first-order kinetics, t1/2 relates to clearance and volume of distribution; dosing interval and clinical duration also depend on formulation, active metabolites, therapeutic window, pharmacodynamics, and patient factors.</p>' +
                '<ul>' +
                '<li><strong>Steady State:</strong> Occurs when the drug administered in a given period equals the drug eliminated in that same period. With repeated regular dosing or constant infusion and stable linear kinetics, concentration approaches about 94\u201397% of steady state after roughly 4\u20135 elimination half-lives. A loading dose can change the starting concentration but not the underlying time constant.</li>' +
                '<li><strong>Washout Period:</strong> For a single compartment with stable first-order elimination and no further input, about 3\u20136% remains after 4\u20135 half-lives. Active metabolites, multicompartment distribution, nonlinear kinetics, organ function, interactions, and detection thresholds can make real washout differ.</li>' +
                '</ul>',
            expandableCase: {
                title: 'The Fluoxetine Transition',
                clinicalDescription: 'A client has been taking fluoxetine (Prozac) for several months but has not achieved remission of depressive symptoms. The psychiatrist decides to switch the client to a Monoamine Oxidase Inhibitor (MAOI). The psychiatrist insists on a 5-week washout period before starting the MAOI.',
                diagnosis: 'Risk of Serotonin Syndrome due to fluoxetine\'s long half-life.',
                explanation: 'Fluoxetine and norfluoxetine have long and variable elimination. Current U.S. labeling requires at least five weeks\u2014potentially longer after chronic or higher-dose use\u2014between stopping fluoxetine and starting an MAOI because serious serotonin-toxicity reactions can occur. Do not infer another antidepressant\u2019s washout from a generic half-life mnemonic; follow the current labels and clinical context.'
            },
            keyTerms: ['Half-life (t1/2)', 'Steady State', 'Washout Period', 'Serotonin Syndrome', 'Active Metabolite'],
            knowledgeCheck: {
                question: 'In an idealized first-order model, no additional doses are given and a drug has an 8-hour elimination half-life. Approximately what fraction of the measured concentration remains after 32 hours?',
                options: ['50%', '25%', '12.5%', '6.25%'],
                answer: 3,
                rationale: 'Thirty-two hours equals four half-lives. Repeated halving gives 100% → 50% → 25% → 12.5% → 6.25%. This calculation assumes stable first-order kinetics and does not by itself establish clinical effect, safety, or a medication-specific washout.'
            }
        }
    ],
    aiCoda: {
        teaser: 'A contemporary extension: why pharmacokinetic metaphors for AI can mislead',
        content: '<p><strong>Reflective extension:</strong> Pharmacokinetic quantities describe measured drug concentration or amount under biological assumptions. Model-training loss, temperature, and weight updates do not have clearance, volume of distribution, active metabolites, or receptor occupancy, so calling model convergence a pharmacologic \u201csteady state\u201d is an analogy rather than a scientific equivalence.</p>' +
            '<p>For medication reasoning, separate pharmacokinetics\u2014what the body does to a drug\u2014from pharmacodynamics\u2014what the drug does at targets and systems. Reaching a concentration plateau does not guarantee full clinical benefit, and delayed benefit should not be reduced to one universal receptor-upregulation story.</p>' +
            '<p>AI can assist with calculations only when assumptions are explicit. Medication-specific labels, laboratory data, organ function, interactions, adherence, timing, active metabolites, and the clinical question still require qualified human interpretation.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> Under stable first-order kinetics, 4\u20135 half-lives means roughly 94\u201397% of the approach to steady state\u2014or roughly 3\u20136% remaining after input stops. This is an approximation, not a universal washout or clinical-effect rule. Fluoxetine\u2019s MAOI interval comes from its current label: at least five weeks, potentially longer in some circumstances.'
    },
    references: [
        'Schatzberg, A. F., & DeBattista, C. (2015). <em>Manual of clinical psychopharmacology</em>. American Psychiatric Pub.',
        'Stahl, S. M. (2013). <em>Stahl\'s essential psychopharmacology: Neuroscientific basis and practical applications</em> (4th ed.). Cambridge University Press.'
    ]
});
