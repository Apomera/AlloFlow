import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const moduleDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React;
let ReactDOMClient;
let act;
let LivePolling;
let root;
let host;

beforeAll(() => {
  React = require(resolve(moduleDir, 'react'));
  ReactDOMClient = require(resolve(moduleDir, 'react-dom/client'));
  ({ act } = require(resolve(moduleDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('live_polling_module.js');
  LivePolling = window.AlloModules.LivePolling;
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  if (host) {
    host.remove();
    host = null;
  }
  window.__alloFocusTrapStack = [];
  vi.restoreAllMocks();
});

function click(element) {
  act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true })));
}

function findButton(text) {
  return Array.from(host.querySelectorAll('button'))
    .find((button) => button.textContent.includes(text));
}

async function renderTargetedHost(type, extraProps = {}) {
  const startSpy = vi.spyOn(LivePolling.PollingHost.prototype, 'start')
    .mockResolvedValue(undefined);
  const broadcastSpy = vi.spyOn(LivePolling.PollingHost.prototype, 'broadcastPoll');
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(LivePolling.HostPanel, {
      sessionCode: `TARGET-${type}`,
      isOpen: true,
      onClose: () => {},
      initialPoll: {
        type,
        prompt: `Targeted ${type}`,
        options: type === 'mcq' ? 'A\nB' : undefined,
        audienceMode: 'group',
        audienceId: 'g1',
      },
      roster: {
        u1: { groupId: 'g1' },
        u2: { groupId: 'g2' },
      },
      sessionGroups: {
        g1: { name: 'Discussion Crew' },
        g2: { name: 'Research Crew' },
      },
      ...extraProps,
    }));
    await Promise.resolve();
  });
  const transport = startSpy.mock.instances.at(-1);
  await act(async () => {
    transport.onGuestConnected('u1', 'Blue Fox');
    transport.onGuestConnected('u2', 'Gold Finch');
    await Promise.resolve();
  });
  return { transport, broadcastSpy };
}

describe('universal live polling audience helpers', () => {
  const guests = [
    { uid: 'u1', codename: 'One' },
    { uid: 'u2', codename: 'Two' },
    { uid: 'u1', codename: 'Reconnect duplicate' },
  ];
  const roster = {
    u1: { groupId: 'g1' },
    u2: { groupId: 'g2' },
  };
  const groups = [{ id: 'g1' }, { id: 'g2' }];

  it('bounds presets and rejects unknown or incomplete selections', () => {
    expect(LivePolling.normalizeLivePollingAudienceSelection(' CLASS ', 'ignored')).toEqual({
      audienceMode: 'class',
      audienceId: '',
      valid: true,
    });
    const bounded = LivePolling.normalizeLivePollingAudienceSelection(
      'group',
      `  ${'x'.repeat(300)}  `,
    );
    expect(bounded.audienceId).toHaveLength(LivePolling.LIVE_POLLING_AUDIENCE_ID_MAX_LENGTH);
    expect(bounded.valid).toBe(true);
    expect(LivePolling.normalizeLivePollingAudienceSelection('group', '').valid).toBe(false);
    expect(LivePolling.normalizeLivePollingAudienceSelection('everyone', 'g1')).toEqual({
      audienceMode: '',
      audienceId: 'g1',
      valid: false,
    });
    expect(LivePolling.normalizeLivePollingAudienceSelection(undefined, 'u1')).toEqual({
      audienceMode: '',
      audienceId: 'u1',
      valid: false,
    });
    expect(LivePolling.normalizeLivePollingAudienceSelection('', '')).toEqual({
      audienceMode: '',
      audienceId: '',
      valid: false,
    });
    expect(LivePolling.normalizeLivePollingAudienceSelection(undefined, undefined)).toEqual({
      audienceMode: 'class',
      audienceId: '',
      valid: true,
    });
  });

  it('resolves connected class, group, and individual audiences and fails closed for stale targets', () => {
    expect(LivePolling.resolveLivePollingAudienceUids(guests, roster, 'class', '', groups))
      .toEqual(['u1', 'u2']);
    expect(LivePolling.resolveLivePollingAudienceUids(guests, roster, 'group', 'g1', groups))
      .toEqual(['u1']);
    expect(LivePolling.resolveLivePollingAudienceUids(guests, roster, 'individual', 'u2', groups))
      .toEqual(['u2']);
    expect(LivePolling.resolveLivePollingAudienceUids(guests, roster, 'group', 'stale', groups))
      .toEqual([]);
    expect(LivePolling.resolveLivePollingAudienceUids(guests, roster, 'everyone', 'g1', groups))
      .toEqual([]);
  });
});

describe('universal live polling audience composer', () => {
  it.each(['rating', 'mcq', 'freetext', 'wordcloud'])(
    'honors the bounded initialPoll audience for %s',
    async (type) => {
      const { broadcastSpy } = await renderTargetedHost(type);

      expect(host.querySelector('select[aria-label="Poll audience"]').value).toBe('group');
      expect(host.querySelector('select[aria-label="Choose poll group"]').value).toBe('g1');
      const broadcast = findButton('Broadcast to');
      expect(broadcast.textContent).toContain('Broadcast to 1 guest');
      expect(broadcast.disabled).toBe(false);

      click(broadcast);
      expect(broadcastSpy).toHaveBeenCalledTimes(1);
      expect(broadcastSpy.mock.calls[0][0]).toMatchObject({ type });
      expect(broadcastSpy.mock.calls[0][1]).toEqual(['u1']);
    },
  );

  it('keeps absent presets class-wide but fails closed for an ID-only current preset', async () => {
    await renderTargetedHost('rating', {
      initialPoll: {
        type: 'rating',
        prompt: 'Legacy class preset',
      },
    });

    let audience = host.querySelector('select[aria-label="Poll audience"]');
    let broadcast = findButton('Broadcast to');
    expect(audience.value).toBe('class');
    expect(broadcast.textContent).toContain('Broadcast to 2 guests');
    expect(broadcast.disabled).toBe(false);

    await act(async () => {
      root.render(React.createElement(LivePolling.HostPanel, {
        sessionCode: 'TARGET-rating',
        isOpen: true,
        onClose: () => {},
        initialPoll: {
          type: 'rating',
          prompt: 'Malformed targeted preset',
          audienceId: 'u1',
          feedbackAudienceMode: 'individual',
        },
        roster: {
          u1: { groupId: 'g1' },
          u2: { groupId: 'g2' },
        },
        sessionGroups: {
          g1: { name: 'Discussion Crew' },
          g2: { name: 'Research Crew' },
        },
      }));
      await Promise.resolve();
    });

    audience = host.querySelector('select[aria-label="Poll audience"]');
    broadcast = findButton('Broadcast to');
    expect(audience.value).toBe('');
    expect(broadcast.textContent).toContain('Broadcast to 0 guests');
    expect(broadcast.disabled).toBe(true);
  });

  it('defaults only absent audience keys to class and rejects explicit blank modes', async () => {
    await renderTargetedHost('rating');

    await act(async () => {
      root.render(React.createElement(LivePolling.HostPanel, {
        sessionCode: 'TARGET-rating',
        isOpen: true,
        onClose: () => {},
        initialPoll: {
          type: 'rating',
          prompt: 'Legacy preset with no audience keys',
        },
        roster: {
          u1: { groupId: 'g1' },
          u2: { groupId: 'g2' },
        },
        sessionGroups: {
          g1: { name: 'Discussion Crew' },
          g2: { name: 'Research Crew' },
        },
      }));
      await Promise.resolve();
    });
    expect(host.querySelector('select[aria-label="Poll audience"]').value).toBe('class');
    expect(findButton('Broadcast to').textContent).toContain('Broadcast to 2 guests');

    for (const initialPoll of [
      { type: 'rating', prompt: 'Blank current audience', audienceMode: '', audienceId: '' },
      { type: 'rating', prompt: 'Undefined legacy audience', feedbackAudienceMode: undefined },
    ]) {
      await act(async () => {
        root.render(React.createElement(LivePolling.HostPanel, {
          sessionCode: 'TARGET-rating',
          isOpen: true,
          onClose: () => {},
          initialPoll,
          roster: { u1: { groupId: 'g1' }, u2: { groupId: 'g2' } },
          sessionGroups: { g1: { name: 'Discussion Crew' }, g2: { name: 'Research Crew' } },
        }));
        await Promise.resolve();
      });
      expect(host.querySelector('select[aria-label="Poll audience"]').value).toBe('');
      expect(findButton('Broadcast to').textContent).toContain('Broadcast to 0 guests');
      expect(findButton('Broadcast to').disabled).toBe(true);
    }
  });

  it('uses the launch audience for progress, shared results, reconnects, and Activity Pulse', async () => {
    const onActivitySnapshot = vi.fn();
    const resultsSpy = vi.spyOn(LivePolling.PollingHost.prototype, 'broadcastPollResults');
    const { transport, broadcastSpy } = await renderTargetedHost('rating', {
      onActivitySnapshot,
    });

    click(findButton('Broadcast to'));
    const poll = broadcastSpy.mock.calls[0][0];
    expect(host.textContent).toContain('0 / 1 responded');
    expect(Array.from(transport.activeAudienceUids)).toEqual(['u1']);

    await act(async () => {
      transport.onGuestLeft('u1');
      await Promise.resolve();
    });
    expect(host.textContent).toContain('0 / 1 responded');
    expect(onActivitySnapshot.mock.calls.at(-1)[0]).toMatchObject({
      audienceUids: ['u1'],
      counts: { connected: 0 },
    });

    await act(async () => {
      transport.onGuestConnected('u1', 'Blue Fox');
      transport.onResponse('u1', 'Blue Fox', {
        pollId: poll.id,
        response: 4,
        timestamp: 10,
      });
      await Promise.resolve();
    });
    expect(host.textContent).toContain('1 / 1 responded');
    const pulse = onActivitySnapshot.mock.calls.at(-1)[0];
    expect(pulse).toMatchObject({
      audienceUids: ['u1'],
      participantStatus: { u1: 'submitted' },
      counts: { connected: 1 },
    });
    expect(JSON.stringify(pulse)).not.toContain('Blue Fox');
    expect(JSON.stringify(pulse)).not.toContain('"response":4');

    click(findButton('Share anonymous results'));
    expect(resultsSpy).toHaveBeenCalledTimes(1);
    expect(resultsSpy.mock.calls[0][1]).toMatchObject({
      totalResponses: 1,
      guestCount: 1,
    });
  });

  it('removes revoked responses from UI, Activity Pulse, and every shared aggregate', async () => {
    const onActivitySnapshot = vi.fn();
    const resultsSpy = vi.spyOn(LivePolling.PollingHost.prototype, 'broadcastPollResults');
    const { transport, broadcastSpy } = await renderTargetedHost('freetext', {
      initialPoll: {
        type: 'freetext',
        prompt: 'Class reflection',
        audienceMode: 'class',
      },
      allowedUids: ['u1', 'u2'],
      onActivitySnapshot,
    });

    click(findButton('Broadcast to'));
    const poll = broadcastSpy.mock.calls[0][0];
    await act(async () => {
      transport.onResponse('u1', 'Blue Fox', {
        pollId: poll.id,
        response: 'revoked-only-sentinel',
        timestamp: 10,
      });
      transport.onResponse('u2', 'Gold Finch', {
        pollId: poll.id,
        response: 'retained-response',
        timestamp: 11,
      });
      await Promise.resolve();
    });
    expect(host.textContent).toContain('2 / 2 responded');
    expect(host.textContent).toContain('revoked-only-sentinel');
    click(findButton('Share anonymous results'));
    expect(resultsSpy.mock.calls.at(-1)[1]).toMatchObject({ totalResponses: 2, guestCount: 2 });

    await act(async () => {
      root.render(React.createElement(LivePolling.HostPanel, {
        sessionCode: 'TARGET-freetext',
        isOpen: true,
        onClose: () => {},
        initialPoll: {
          type: 'freetext',
          prompt: 'Class reflection',
          audienceMode: 'class',
        },
        roster: {
          u1: { groupId: 'g1' },
          u2: { groupId: 'g2' },
        },
        sessionGroups: {
          g1: { name: 'Discussion Crew' },
          g2: { name: 'Research Crew' },
        },
        allowedUids: ['u2'],
        onActivitySnapshot,
      }));
      await Promise.resolve();
    });

    expect(Array.from(transport.activeAudienceUids)).toEqual(['u2']);
    expect(host.textContent).toContain('1 / 1 responded');
    expect(host.textContent).not.toContain('revoked-only-sentinel');
    expect(host.textContent).toContain('retained-response');
    expect(transport.activePollResults).toMatchObject({ totalResponses: 1, guestCount: 1 });
    expect(JSON.stringify(transport.activePollResults)).not.toContain('revoked-only-sentinel');

    const pulse = onActivitySnapshot.mock.calls.at(-1)[0];
    expect(pulse).toMatchObject({
      audienceUids: ['u2'],
      participantStatus: { u2: 'submitted' },
      counts: { connected: 1 },
    });
    expect(pulse.participantStatus.u1).toBeUndefined();

    click(findButton('Share updated results'));
    expect(resultsSpy.mock.calls.at(-1)[1]).toMatchObject({ totalResponses: 1, guestCount: 1 });
    expect(JSON.stringify(resultsSpy.mock.calls.at(-1)[1])).not.toContain('revoked-only-sentinel');
  });

  it('clears local round state when the polling transport stops and reopens', async () => {
    const onActivitySnapshot = vi.fn();
    const panelProps = {
      sessionCode: 'RESET-POLL',
      onClose: () => {},
      onActivitySnapshot,
      initialPoll: {
        type: 'rating',
        prompt: 'Reset this round',
        audienceMode: 'group',
        audienceId: 'g1',
      },
      roster: {
        u1: { groupId: 'g1' },
        u2: { groupId: 'g2' },
      },
      sessionGroups: {
        g1: { name: 'Discussion Crew' },
        g2: { name: 'Research Crew' },
      },
    };

    const { broadcastSpy } = await renderTargetedHost('rating', panelProps);
    click(findButton('Broadcast to'));
    const pollId = broadcastSpy.mock.calls[0][0].id;
    expect(findButton('Close poll')).toBeTruthy();
    expect(onActivitySnapshot.mock.calls.at(-1)[0]).toMatchObject({ activityId: pollId, phase: 'collecting' });

    await act(async () => {
      root.render(React.createElement(LivePolling.HostPanel, { ...panelProps, isOpen: false }));
      await Promise.resolve();
    });
    const closedSnapshot = onActivitySnapshot.mock.calls.at(-1)[0];
    expect(closedSnapshot).toMatchObject({ activityId: pollId, phase: 'closed' });
    expect(closedSnapshot.endedAt).toBeGreaterThan(0);
    const closedCallCount = onActivitySnapshot.mock.calls.length;
    await act(async () => {
      root.render(React.createElement(LivePolling.HostPanel, { ...panelProps, isOpen: true }));
      await Promise.resolve();
    });

    expect(findButton('Close poll')).toBeUndefined();
    expect(findButton('Broadcast to')).toBeTruthy();
    expect(onActivitySnapshot.mock.calls.slice(closedCallCount).some(([snapshot]) => (
      snapshot.activityId === pollId && (snapshot.phase === 'collecting' || snapshot.phase === 'review')
    ))).toBe(false);
  });

  it('settles when a parent rebuilds the same allowed UID array after every Activity Pulse update', async () => {
    const startSpy = vi.spyOn(LivePolling.PollingHost.prototype, 'start')
      .mockResolvedValue(undefined);
    const onActivitySnapshot = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const roster = { u1: { groupId: 'g1' } };
    const sessionGroups = { g1: { name: 'Discussion Crew' } };
    const initialPoll = {
      type: 'rating',
      prompt: 'Stable roster membership',
      audienceMode: 'class',
    };

    function ParentHarness() {
      const [, forceParentRender] = React.useState(0);
      const handleSnapshot = React.useCallback((snapshot) => {
        onActivitySnapshot(snapshot);
        forceParentRender((value) => value + 1);
      }, []);
      return React.createElement(LivePolling.HostPanel, {
        sessionCode: 'INLINE-ROSTER',
        isOpen: true,
        onClose: () => {},
        initialPoll,
        roster,
        sessionGroups,
        // Mirrors the production shell: Object.keys returns a fresh array on
        // every parent render even when membership is unchanged.
        allowedUids: Object.keys(roster),
        onActivitySnapshot: handleSnapshot,
      });
    }

    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => {
      root.render(React.createElement(ParentHarness));
      await Promise.resolve();
    });
    const transport = startSpy.mock.instances.at(-1);
    await act(async () => {
      transport.onGuestConnected('u1', 'Blue Fox');
      await Promise.resolve();
    });
    click(findButton('Broadcast to'));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onActivitySnapshot.mock.calls.length).toBeGreaterThan(0);
    expect(onActivitySnapshot.mock.calls.length).toBeLessThanOrEqual(4);
    expect(consoleError.mock.calls.flat().join(' ')).not.toContain('Maximum update depth exceeded');
    expect(host.textContent).toContain('0 / 1 responded');
  });

  it('disables broadcasting for an invalid or stale prepared audience', async () => {
    await renderTargetedHost('rating');
    await act(async () => {
      root.render(React.createElement(LivePolling.HostPanel, {
        sessionCode: 'TARGET-rating',
        isOpen: true,
        onClose: () => {},
        initialPoll: {
          type: 'rating',
          prompt: 'Do not leak this prompt',
          audienceMode: 'group',
          audienceId: 'deleted-group',
        },
        roster: {
          u1: { groupId: 'deleted-group' },
        },
        sessionGroups: {
          g1: { name: 'Current group' },
        },
      }));
      await Promise.resolve();
    });
    const broadcast = findButton('Broadcast to');
    expect(broadcast.textContent).toContain('Broadcast to 0 guests');
    expect(broadcast.disabled).toBe(true);
  });
});
