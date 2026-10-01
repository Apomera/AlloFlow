import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const toolPath = process.env.ART_STUDIO_ARTIST_SOURCE || 'stem_lab/stem_tool_artstudio.js';

describe('Art Studio artist search and repeated selection', () => {
  let root, host, config;
  beforeEach(() => {
    resetStemLab();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
    config = loadTool(toolPath, 'artStudio');
    host = document.createElement('div'); document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
  async function mount(artist = {}, t = (_key, fallback) => fallback) {
    function Harness() {
      const [toolData, setToolData] = React.useState({ artStudio: { tab: 'artistExplorer', studioHome: false, ...artist } });
      return config.render(makeCtx({ toolData, setToolData, t }));
    }
    await act(async () => { root.render(React.createElement(Harness)); await Promise.resolve(); });
  }
  async function select(id) {
    const button = host.querySelector('#artist-profile-button-' + id);
    expect(button).not.toBeNull();
    await act(async () => {
      button.focus();
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
  }
  it('finds names and places without accents and matches all words across visible profile fields', () => {
    const ids = query => Array.from(window.ArtStudioArtistExplorer.filter({ query })).map(p => p.id);
    expect(ids('kathe')).toContain('kathe-kollwitz');
    expect(ids('maori')).toContain('lisa-reihana');
    expect(ids('  hokusai   printmaking ')).toEqual(['hokusai']);
    expect(ids('kollwitz kathe')).toEqual(['kathe-kollwitz']);
    expect(ids('hokusai nonexistentword')).toEqual([]);
    expect(Array.from(window.ArtStudioArtistExplorer.filter({ query: 'kathe', region: 'Asia' }))).toEqual([]);
  });
  it('finds translated visible categories while retaining canonical filter identities and original names', async () => {
    await mount({ artistQuery: 'gravure', artistRegion: 'Asia' }, (_key, fallback) => fallback === 'Printmaking' ? 'Gravure' : fallback);
    const cards = host.querySelectorAll('[id^="artist-profile-button-"]');
    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe('artist-profile-button-hokusai');
    expect(cards[0].textContent).toContain('Hokusai');
    expect(host.querySelector('select[aria-label="Filter artists by region"]').value).toBe('Asia');
    const search = host.querySelector('input[type="search"]');
    const help = document.getElementById(search.getAttribute('aria-describedby'));
    expect(help?.textContent).toContain('Accents are optional');
  });
  it('focuses study details every time a profile is explicitly selected, including the current profile', async () => {
    await mount({ artistProfileId: 'hokusai' });
    await select('hokusai');
    expect(document.activeElement).toBe(host.querySelector('#artist-selected-detail'));
    expect(document.activeElement.textContent).toContain('Hokusai');
    await select('alma-thomas');
    expect(document.activeElement).toBe(host.querySelector('#artist-selected-detail'));
    expect(document.activeElement.querySelector('h4').textContent).toBe('Alma Thomas');
    await select('alma-thomas');
    expect(document.activeElement).toBe(host.querySelector('#artist-selected-detail'));
  });
});
