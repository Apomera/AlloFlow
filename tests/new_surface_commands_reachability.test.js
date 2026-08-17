// Voice/palette doors for the surfaces that joined the coverage baseline on
// 2026-08-16 (fleet wave 3, X6).
//
// The commands are the easy half. The standing lesson (W3, C5; the
// silent-announcer class) is that a command can exist, look right, and do
// nothing, because the ctx capability it calls was never defined, or the
// state it sets is not the state the view renders on. Every link in each
// chain is asserted here, the math_fluency_palette_reachability way:
//
//   use_gemini_canvas       -> c.setShowAIBackendModal (host-supplied everywhere)
//   open_brainstorm_modes   -> c.openBrainstormActivity -> expands 'brainstorm'
//   open_discussion_builder -> ... -> window.__alloSetBrainstormActivityMode('discussion')
//   open_jigsaw_builder     -> ... -> bridge('jigsaw') -> panel state gates the config UI
//   jump_to_lesson_plan     -> c.jumpToLatestLessonPlan -> handleRestoreView(latestLessonPlan)
//   open_block_suggestions  -> c.openExportPreview (the suggestions panel is open by default)

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const commands = read('allo_commands_source.jsx');
const commandsModule = read('allo_commands_module.js');
const commandsMirror = read('desktop/web-app/public/allo_commands_module.js');
const anti = read('AlloFlowANTI.txt');
const sidebar = read('view_sidebar_panels_source.jsx');
const exportPreview = read('view_export_preview_source.jsx');

const NEW_IDS = ['use_gemini_canvas', 'open_brainstorm_modes', 'open_discussion_builder',
  'open_jigsaw_builder', 'jump_to_lesson_plan', 'open_block_suggestions'];

const commandBlock = (id) => {
  const at = commands.indexOf(`{ id: '${id}'`);
  expect(at, `command ${id} is registered`).toBeGreaterThan(-1);
  return commands.slice(at, commands.indexOf('\n', at));
};

describe('the commands exist, guarded and grouped', () => {
  it('registers all six with when-guards on the capability they call', () => {
    for (const id of NEW_IDS) {
      const block = commandBlock(id);
      expect(block, `${id} must carry a when guard`).toContain('when: (c) =>');
    }
  });
  it('every new id is in CMD_GROUP (the step W3 learned the hard way)', () => {
    const groupAt = commands.indexOf('const CMD_GROUP = {');
    const groupBlock = commands.slice(groupAt, commands.indexOf('const GROUP_ORDER', groupAt));
    for (const id of NEW_IDS) {
      expect(groupBlock, `${id} must be explicitly grouped`).toContain(`${id}:'`);
    }
    // And only to groups GROUP_ORDER actually renders.
    const order = commands.match(/const GROUP_ORDER = \[([^\]]+)\]/)[1];
    for (const id of NEW_IDS) {
      const g = groupBlock.match(new RegExp(`${id}:'([a-z]+)'`))[1];
      expect(order, `${id}'s group ${g} must be renderable`).toContain(`'${g}'`);
    }
  });
  it('built module and mirror carry the commands', () => {
    for (const id of NEW_IDS) {
      expect(commandsModule).toContain(`"${id}"`);
    }
    expect(commandsMirror).toBe(commandsModule);
  });
});

describe('the capability chain: brainstorm activity', () => {
  it('the host defines openBrainstormActivity and expands the right accordion', () => {
    const at = anti.indexOf('openBrainstormActivity: (mode) =>');
    expect(at).toBeGreaterThan(-1);
    const body = anti.slice(at, at + 1200);
    expect(body).toContain("prev.includes('brainstorm') ? prev : ['brainstorm', ...prev]");
    expect(body).toContain('window.__alloSetBrainstormActivityMode');
    expect(body).toContain("setActiveSidebarTab('create')");
  });
  it('the panel registers the bridge while mounted and validates the mode', () => {
    const at = sidebar.indexOf('window.__alloSetBrainstormActivityMode = (mode)');
    expect(at).toBeGreaterThan(-1);
    const body = sidebar.slice(at, at + 400);
    expect(body).toContain("['ideas', 'discussion', 'jigsaw', 'simulation'].includes(mode)");
    expect(body).toContain('setActivityMode(mode)');
    // and it cleans up so a collapsed accordion never keeps a stale setter.
    expect(sidebar.slice(at, at + 600)).toContain('delete window.__alloSetBrainstormActivityMode');
  });
  it('the modes the bridge accepts are exactly the modes the picker renders', () => {
    expect(sidebar).toContain("const ACTIVITY_MODES = ['ideas', 'discussion', 'jigsaw', 'simulation']");
    // discussion/jigsaw config blocks render on those exact strings
    expect(sidebar).toContain("activityMode === 'discussion' &&");
    expect(sidebar).toContain("activityMode === 'jigsaw' &&");
  });
});

describe('the capability chain: Leadership Hub door (2026-08-17 leadership pass)', () => {
  it('open_leadership_hub is registered, guarded, grouped, and teacher-scoped', () => {
    const block = commandBlock('open_leadership_hub');
    expect(block).toContain('when: (c) => typeof c.openLeadershipHub === ');
    // roles 'teacher' matches X7's Educator Hub card scoping: parent and
    // independent audiences resolve to their own role strings and are excluded.
    expect(block).toContain("roles: 'teacher'");
    const groupAt = commands.indexOf('const CMD_GROUP = {');
    expect(commands.slice(groupAt, commands.indexOf('const GROUP_ORDER', groupAt)))
      .toContain("open_leadership_hub:'navigate'");
  });
  it('the host capability lazy-loads the hub module before opening', () => {
    const at = anti.indexOf('openLeadershipHub: () =>');
    expect(at).toBeGreaterThan(-1);
    const body = anti.slice(at, at + 500);
    expect(body).toContain('window.__alloLazyAdminHub');
    expect(body).toContain('setIsAdminHubOpen(true)');
  });
  it('the hub it opens really lists the nine tools and the guide link', () => {
    const hub = read('admin_hub_source.jsx');
    const ids = (hub.match(/^\s*id: '([a-zA-Z]+)'/gm) || []).length;
    expect(ids).toBe(9);
    expect(hub).toContain('data-help-key="adminhub_guide_link"');
    expect(hub).toContain('guide/for-school-leaders.html');
    // built module + mirror carry both
    const built = read('admin_hub_module.js');
    expect(built).toContain('adminhub_guide_link');
    expect(read('desktop/web-app/public/admin_hub_module.js')).toBe(built);
  });
  it('the guide chapter the link points at exists and is wired into the guide', () => {
    const guide = JSON.parse(read('docs/teacher-guide/guide.json'));
    expect(guide.chapters.some((c) => c.slug === 'for-school-leaders')).toBe(true);
    const rollout = guide.paths.find((p) => p.title === 'I am leading a school rollout');
    expect(rollout.chapterSlugs).toContain('for-school-leaders');
  });
});

describe('the capability chain: lesson plan jump', () => {
  it('the host supplies jumpToLatestLessonPlan only when a plan exists', () => {
    expect(anti).toContain('jumpToLatestLessonPlan: latestLessonPlan ?');
    expect(anti).toContain('handleRestoreView(latestLessonPlan)');
  });
});

describe('the capability chain: canvas doorway and block suggestions', () => {
  it('use_gemini_canvas opens the settings surface where the Canvas card leads', () => {
    expect(commandBlock('use_gemini_canvas')).toContain('c.setShowAIBackendModal(true)');
    // the Canvas card really is in that modal (pinned in detail by
    // tests/ai_capability_gating.test.js)
    expect(read('view_misc_modals_source.jsx')).toContain('guided_card_canvas_title');
  });
  it("open_block_suggestions' destination panel exists and is open by default", () => {
    const at = exportPreview.indexOf('data-help-key="doc_builder_block_suggestions"');
    expect(at).toBeGreaterThan(-1);
    expect(exportPreview.slice(at - 200, at)).toContain('<details open');
  });
});
