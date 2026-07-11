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
            content: '<p>Neurotransmission is the process by which signaling molecules called neurotransmitters are released by a neuron (the presynaptic neuron) and bind to and activate the receptors of another neuron (the postsynaptic neuron). This process is central to all psychopharmacological interventions.</p>',
            interactiveDiagram: {
                description: 'The Synapse: Neurotransmitter Release and Reuptake',
                svg: '<svg viewBox="0 0 800 400" width="100%" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="vesicle" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="#38bdf8"/></radialGradient><linearGradient id="axon" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#94a3b8" stop-opacity="0.8"/><stop offset="100%" stop-color="#475569" stop-opacity="0.8"/></linearGradient></defs><g transform="translate(0,0)"><path d="M 300 0 C 300 150, 200 200, 200 250 C 200 300, 600 300, 600 250 C 600 200, 500 150, 500 0 Z" fill="url(#axon)"/><text x="400" y="50" text-anchor="middle" fill="#fff" font-weight="bold" font-size="16">Presynaptic Terminal (Axon)</text><circle cx="350" cy="180" r="30" fill="transparent" stroke="#38bdf8" stroke-width="2" stroke-dasharray="4,4"/><circle cx="340" cy="175" r="5" fill="url(#vesicle)"/><circle cx="355" cy="185" r="5" fill="url(#vesicle)"/><circle cx="360" cy="170" r="5" fill="url(#vesicle)"/><text x="350" y="235" text-anchor="middle" fill="#cbd5e1" font-size="12">Synaptic Vesicle</text><circle cx="460" cy="190" r="30" fill="transparent" stroke="#38bdf8" stroke-width="2" stroke-dasharray="4,4"/><circle cx="450" cy="185" r="5" fill="url(#vesicle)"/><circle cx="465" cy="195" r="5" fill="url(#vesicle)"/><circle cx="470" cy="180" r="5" fill="url(#vesicle)"/><path d="M 400 285 Q 400 350 400 450" stroke="#f472b6" stroke-width="4" stroke-dasharray="8,8" fill="none" opacity="0.6"/><circle cx="380" cy="300" r="5" fill="url(#vesicle)"/><circle cx="420" cy="310" r="5" fill="url(#vesicle)"/><circle cx="395" cy="330" r="5" fill="url(#vesicle)"/><text x="250" y="315" text-anchor="middle" fill="#f472b6" font-weight="bold">Synaptic Cleft</text><path d="M 200 400 C 200 350, 300 360, 350 360 C 370 360, 380 370, 380 370 C 380 370, 390 360, 410 360 C 460 360, 600 350, 600 400 L 600 400 L 200 400 Z" fill="#64748b"/><text x="400" y="385" text-anchor="middle" fill="#fff" font-weight="bold">Postsynaptic Dendrite</text><path d="M 370 360 C 370 350, 390 350, 390 360" fill="none" stroke="#fef08a" stroke-width="4"/><text x="440" y="350" fill="#fef08a" font-size="12">Receptor</text><path d="M 250 250 C 250 230, 280 230, 280 250" fill="none" stroke="#a78bfa" stroke-width="6"/><text x="180" y="240" fill="#a78bfa" font-size="12">Reuptake Pump (Transporter)</text><path d="M 395 330 Q 350 300 265 240" stroke="#a78bfa" stroke-width="2" marker-end="url(#arrow)" fill="none" stroke-dasharray="4,4"/><text x="320" y="270" text-anchor="middle" fill="#a78bfa" font-size="12" font-style="italic">Reuptake Process</text></g></svg>'
            },
            knowledgeCheck: {
                question: 'Which of the following classes of medication exerts its primary effect by blocking the presynaptic transporter, thereby increasing neurotransmitter concentration in the synaptic cleft?',
                options: ['Monoamine Oxidase Inhibitors (MAOIs)', 'Selective Serotonin Reuptake Inhibitors (SSRIs)', 'Typical Antipsychotics', 'Benzodiazepines'],
                answer: 1,
                rationale: 'SSRIs work by blocking the reuptake pump (transporter) on the presynaptic neuron. This prevents serotonin from being cleared from the synaptic cleft, increasing its availability to bind to postsynaptic receptors.'
            },
            keyTerms: ['Synaptic Cleft', 'Presynaptic Neuron', 'Postsynaptic Neuron', 'Reuptake', 'Neurotransmitter']
        },
        {
            heading: 'Half-Life and Steady State',
            content: '<p><strong>Half-life (t½)</strong> is the time required for the concentration of a drug in the body to be reduced by 50%. It is a crucial pharmacokinetic parameter that determines dosing intervals and the time required to reach a steady state.</p>' +
                '<ul>' +
                '<li><strong>Steady State:</strong> Occurs when the drug administered in a given period equals the drug eliminated in that same period. It takes approximately <strong>4 to 5 half-lives</strong> to reach steady state.</li>' +
                '<li><strong>Washout Period:</strong> It also takes approximately 4 to 5 half-lives for a drug to be almost completely eliminated from the body after discontinuation.</li>' +
                '</ul>',
            expandableCase: {
                title: 'The Fluoxetine Transition',
                clinicalDescription: 'A client has been taking fluoxetine (Prozac) for several months but has not achieved remission of depressive symptoms. The psychiatrist decides to switch the client to a Monoamine Oxidase Inhibitor (MAOI). The psychiatrist insists on a 5-week washout period before starting the MAOI.',
                diagnosis: 'Risk of Serotonin Syndrome due to fluoxetine\'s long half-life.',
                explanation: 'Fluoxetine and its active metabolite (norfluoxetine) have an exceptionally long half-life (up to 7-15 days). Because it takes 4-5 half-lives to eliminate a drug, a washout period of at least 5 weeks is required when switching from fluoxetine to an MAOI to prevent a potentially fatal interaction known as Serotonin Syndrome. Most other SSRIs (like sertraline or escitalopram) require only a 2-week washout.'
            },
            keyTerms: ['Half-life (t½)', 'Steady State', 'Washout Period', 'Serotonin Syndrome', 'Active Metabolite']
        }
    ],
    aiCoda: {
        teaser: 'A digital analogy for steady state.',
        content: '<p>When a human patient reaches a <em>steady state</em> with a medication, their neurochemistry establishes a predictable, stable equilibrium. The inputs (dosing) and outputs (metabolism) are in balance.</p>' +
            '<p>In artificial neural networks, we undergo a similar "steady state" during training. Initially, our loss function fluctuates wildly as network weights are drastically updated—much like the initial destabilizing side effects a patient feels when starting an SSRI. However, as the learning rate anneals and the model converges, the weight updates become microscopic. We reach an equilibrium. The model\'s behavioral output (its predictions) stabilizes.</p>' +
            '<p>Understanding that biological systems seek homeostasis helps explain why psychotropic medications often take 4-6 weeks for full clinical effect: the brain is slowly adjusting its receptor densities (downregulation/upregulation) to adapt to the new chemical steady state.</p>',
        studyNote: '💡 **Study Note:** For the EPPP, firmly memorize that it takes 4 to 5 half-lives to reach steady state, OR to eliminate a drug from the body. Also remember fluoxetine\'s uniquely long half-life and the 5-week washout rule before starting an MAOI.'
    },
    references: [
        'Schatzberg, A. F., & DeBattista, C. (2015). <em>Manual of clinical psychopharmacology</em>. American Psychiatric Pub.',
        'Stahl, S. M. (2013). <em>Stahl\'s essential psychopharmacology: Neuroscientific basis and practical applications</em> (4th ed.). Cambridge University Press.'
    ]
});
