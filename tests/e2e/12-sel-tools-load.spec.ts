import { test, expect } from '@playwright/test';

/**
 * Verify every SEL Hub tool's CDN module is reachable + valid JS.
 * 70 tools — one test per tool.
 */
const SEL_TOOLS = [
  'advocacy', 'anxietytoolkit', 'behavioralactivation', 'bigfeelings', 'bodystory',
  'careconstellations', 'careercompass', 'circlesofsupport', 'civicaction', 'community',
  'compassion', 'conflict', 'conflicttheater', 'coping', 'costbenefit',
  'crewprotocols', 'crisiscompanion', 'cultureexplorer', 'dearman', 'decisions',
  'digitalwellbeing', 'disabilityvoices', 'ecomap', 'emotions', 'ethicalreasoning',
  'execfunction', 'friendship', 'genogram', 'goals', 'griefloss',
  'growthmindset', 'healthyrelationships', 'howl', 'identitysupport', 'journal',
  'landplace', 'maps', 'mindfulness', 'motivationalinterviewing', 'onepageprofile',
  'orientations', 'path', 'peersupport', 'perma', 'perspective',
  'quietquestions', 'restorativecircle', 'safety', 'selfadvocacy', 'sensoryregulation',
  'sfbt', 'sleep', 'social', 'sociallab', 'sourcesofstrength',
  'strengths', 'stressbucket', 'substancepsychoed', 'teamwork', 'thoughtrecord',
  'tipp', 'transitions', 'traumapsychoed', 'upstander', 'valuescommittedaction',
  'viastrengths', 'voicedetective', 'wheeloflife', 'windowoftolerance', 'zones',
];

test.describe('Every SEL Hub tool CDN file is reachable + valid', () => {
  for (const id of SEL_TOOLS) {
    test(`sel_tool_${id}.js`, async ({ request }) => {
      const url = `https://alloflow-cdn.pages.dev/sel_hub/sel_tool_${id}.js`;
      const resp = await request.get(url);
      expect(resp.ok(), `${id}: HTTP ${resp.status()}`).toBeTruthy();
      const body = await resp.text();
      expect(body.length, `${id}: response too small`).toBeGreaterThan(300);
      expect(/window\.SelHub|registerTool|React|createElement|module/i.test(body), `${id}: doesn't look like a SEL tool`).toBeTruthy();
    });
  }
});
