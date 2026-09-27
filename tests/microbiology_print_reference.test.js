import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let tool, root, container;
const act = React.act;
const priorAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  tool = loadTool('stem_lab/stem_tool_microbiology.js', 'microbiology');
});
afterEach(() => {
  if (root) act(() => root.unmount());
  if (container) container.remove();
  root = container = null;
  globalThis.IS_REACT_ACT_ENVIRONMENT = priorAct;
  vi.restoreAllMocks();
});
function mount(t) {
  container = document.createElement('div'); document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);
  function Host() {
    const [data, setData] = React.useState({ microbiology: { tab: 'print' } });
    return tool.render(makeCtx({ toolData: data, setToolData: setData, ...(t ? { t } : {}) }));
  }
  act(() => root.render(React.createElement(Host)));
  return container.querySelector('#micro-print-region');
}

describe('Microbiology printable reference', { timeout: 20000 }, () => {
  it('uses risk-assessed biosafety descriptions even when obsolete translation keys exist', () => {
    const obsoleteKeys = new Set([
      'stem.microbiology.non_pathogenic_e_coli_k_12_bacillus_su',
      'stem.microbiology.moderate_risk_human_pathogens_salmonel',
      'stem.microbiology.serious_airborne_pathogens_m_tuberculo',
      'stem.microbiology.lethal_no_vaccine_ebola_marburg_lassa_',
      'stem.microbiology.school_labs_operate_at_bsl_1_anything_',
      'stem.microbiology.wash_hands_before_and_after_every_micr',
      'stem.microbiology.microbiome_what_helps_and_what_hurts',
      'stem.microbiology.excessive_sanitation_esp_in_kids',
      'stem.microbiology.most_artificial_sweeteners_research_ev'
    ]);
    const reference = mount((key, fallback) => obsoleteKeys.has(key) ? 'OBSOLETE CLAIM' : fallback);
    const text = reference.textContent;
    expect(text).toContain('organism, procedure, and possible exposure');
    expect(text).toContain('Low risk does not mean zero risk');
    expect(text).toContain('Cultured unknown samples require BSL-2 handling');
    expect(text).toContain('Vaccine availability alone does not determine containment');
    expect(text).toContain('approved activity and waste-disposal procedures');
    expect(text).not.toMatch(/OBSOLETE CLAIM|Autoclave or bleach all materials|Lethal, no vaccine|School labs operate at BSL-1/);
  });

  it('provides host-specific virus effects, complete habitat text, and accessible table relationships', () => {
    const reference = mount();
    const table = reference.querySelector('table');
    expect(table.caption.textContent).toContain('strain, host, and context');
    expect(table.querySelectorAll('thead th[scope="col"]')).toHaveLength(4);
    const rows = [...table.querySelectorAll('tbody tr')];
    expect(rows.length).toBeGreaterThan(10);
    expect(rows.every(row => row.firstElementChild.matches('th[scope="row"]'))).toBe(true);
    const phage = rows.find(row => row.textContent.includes('Bacteriophage (T4)'));
    expect(phage.cells[2].textContent).toBe('Bacterial hosts, including E. coli');
    expect(phage.cells[3].textContent).toBe('Infects bacteria');
    expect(phage.textContent).not.toMatch(/pathogen|no risk to humans/);
    const ecoli = rows.find(row => row.firstElementChild.textContent.includes('Escherichia coli'));
    expect(ecoli.cells[2].textContent).toBe('Lives in the gut of most mammals including humans. About 0.1% of human gut bacteria.');
    const covid = rows.find(row => row.textContent.includes('SARS-CoV-2'));
    expect(covid.cells[2].textContent).toBe('Humans and other mammals, including cats, dogs, and deer');
    expect(covid.textContent).not.toContain('crossover from bats');
    expect(covid.cells[3].textContent).toBe('Can cause human disease');
    const region = table.parentElement;
    expect(region.getAttribute('role')).toBe('region');
    expect(region.tabIndex).toBe(0);
    expect(document.getElementById(region.getAttribute('aria-labelledby'))).toBe(table.caption);
    expect(document.getElementById(region.getAttribute('aria-describedby')).textContent).toContain('arrow keys');
    expect(region.style.overflowX).toBe('auto');
  });

  it('distinguishes microbiome observations from health judgments and includes usable sources', () => {
    const reference = mount();
    expect(reference.textContent).toContain('Different communities can still be healthy');
    expect(reference.textContent).toContain('A change alone does not prove benefit or harm');
    expect(reference.textContent).toContain('Handwashing with soap helps prevent infection');
    expect(reference.textContent).toContain('not a score for judging those choices');
    expect(reference.textContent).not.toMatch(/Vaginal birth \+ breastfeeding|Excessive sanitation|Most artificial sweeteners/);
    const headings = [...reference.querySelectorAll('h3')].map(node => node.textContent);
    expect(headings).toContain('Microbiome: influences and evidence limits');
    expect(headings).toContain('Sources and further reading');
    const sources = [...reference.querySelectorAll('.micro-print-source a')];
    expect(sources.some(a => a.href === 'https://www.cdc.gov/labs/bmbl/index.html')).toBe(true);
    expect(sources.some(a => a.href.includes('asm-biosafety-guidelines.pdf'))).toBe(true);
    expect(sources.some(a => a.href.includes('microbiome_508.pdf'))).toBe(true);
    expect(sources.every(a => a.textContent.length > 10 && a.rel.includes('noopener'))).toBe(true);
  });

  it('opens browser print from a native button and keeps the reference table printable', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    mount();
    const button = [...container.querySelectorAll('button')].find(node => node.textContent.includes('Print / Save as PDF'));
    expect(button.type).toBe('button');
    act(() => button.click());
    expect(print).toHaveBeenCalledTimes(1);
    const styles = [...container.querySelectorAll('style')].map(node => node.textContent).join('\n');
    expect(styles).toContain('.micro-print-table-scroll { overflow: visible !important; }');
    expect(styles).toContain('min-width: 0 !important');
    expect(styles).toContain('display: table-header-group');
    expect(styles).toContain('attr(href)');
  });
});
