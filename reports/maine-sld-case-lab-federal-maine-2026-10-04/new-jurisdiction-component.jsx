  const jurisdictionLink = (href, label) => <a href={href} target="_blank" rel="noopener noreferrer">{label}<span className="msld-hidden"> (opens in a new tab)</span></a>;
  const jurisdictionGuide = location => <div style={{ marginTop: 16 }}>
    <p className="msld-small"><strong>Federal foundation · Maine procedure</strong><br/>This lab practices Maine’s SLD procedure under the federal Individuals with Disabilities Education Act (IDEA).</p>
    <details className="msld-gap-prompts" data-testid={'jurisdiction-guide-' + location}>
      <summary>How IDEA and Maine requirements connect</summary>
      <div className="msld-prose" style={{ gap: 12 }}>
        <section><h4 style={{ margin: '0 0 6px', fontSize: 13 }}>Federal IDEA foundation</h4>
          <p className="msld-small">Use multiple assessment tools and sources, including parent information. No single test determines eligibility. Evaluation must be culturally and linguistically appropriate. See {jurisdictionLink('https://sites.ed.gov/idea/regs/b/d/300.304', '34 CFR 300.304')}.</p>
          <p className="msld-small" style={{ marginTop: 10 }}>States must adopt SLD criteria consistent with IDEA, permit a process based on response to scientific, research-based intervention, and must not require a severe IQ–achievement discrepancy. Districts must follow their state’s criteria. See {jurisdictionLink('https://sites.ed.gov/idea/regs/b/d/300.307', '34 CFR 300.307')}.</p>
          <p className="msld-small" style={{ marginTop: 10 }}>Federal SLD criteria address inadequate achievement, insufficient intervention progress or a relevant pattern of strengths and weaknesses, appropriate instruction and exclusionary factors. A disability finding also requires considering whether the child needs special education and related services because of that disability. See {jurisdictionLink('https://sites.ed.gov/idea/regs/b/d/300.309', '34 CFR 300.309')} and {jurisdictionLink('https://sites.ed.gov/idea/regs/b/a/300.8', '34 CFR 300.8(a)')}.</p>
        </section>
        <section><h4 style={{ margin: '0 0 6px', fontSize: 13 }}>Maine implementation</h4>
          <p className="msld-small">MUSER VII.2.L specifies Maine’s SLD procedure, including a relevant pattern of strengths and weaknesses considered with intervention response, classroom performance, achievement and psychological processing. The nine questions and branches practiced here follow the Maine DOE form; they are not a national form.</p>
          <p className="msld-small" style={{ marginTop: 10 }}>MUSER VII.3 excludes SLD from the separate adverse-effect determination procedure. Educational impact and the need for special education still matter. Consult {jurisdictionLink(sourceUrl(data.sources.find(s => s.id === 'muser')), 'current MUSER Chapter 101')} and the {jurisdictionLink(sourceUrl(data.sources.find(s => s.id === 'sld-form')), 'Maine DOE SLD form and checklist')}.</p>
        </section>
        <section><h4 style={{ margin: '0 0 6px', fontSize: 13 }}>Using the practice outside Maine</h4>
          <p className="msld-small">The case discussions can help participants practice weighing evidence, checking assessment validity and explaining instructional need. Before using the process in another state, match its SLD criteria, eligibility language and required documentation to that state’s current rules. Do not carry over Maine’s question numbers, branches or separate adverse-effect procedure automatically.</p>
          <p className="msld-small" style={{ marginTop: 10 }}><strong>Transfer prompt:</strong> Which evidence-weighing skills would you keep, and which state rules or forms would you need to check?</p>
        </section>
        <p className="msld-small">Jurisdiction note checked October 4, 2026. The cases remain fictional practice; actual eligibility decisions require the full evaluation record and the team’s determination.</p>
      </div>
    </details>
  </div>;
