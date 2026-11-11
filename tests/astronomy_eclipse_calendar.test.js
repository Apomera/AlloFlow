// The Eclipses tab modelled the geometry but never said when the next eclipse is. It now has a small
// dated table that hides rows once their date has passed, so it can never show a past eclipse as upcoming.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

vi.setConfig({ testTimeout: 30000, hookTimeout: 45000 });
let P;
beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy'); P = window.__alloAstroPure; });
afterEach(() => { vi.useRealTimers(); });
const doc = state => new DOMParser().parseFromString(renderTool('astronomy', { astronomy: { observingList: [], tab: 'eclipses', ...state } }), 'text/html');
const at = (y, m, d, h = 12) => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(Date.UTC(y, m - 1, d, h))); };

describe('upcomingEclipses', () => {
  it('lists the calendar in date order with well-formed rows', () => {
    const dates = P.ECLIPSE_CALENDAR.map(row => row.date);
    expect(dates).toEqual([...dates].sort());
    for (const row of P.ECLIPSE_CALENDAR) {
      expect(row.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['solar-total', 'solar-annular', 'lunar-total']).toContain(row.body + '-' + row.type);
    }
  });
  it('pins the dates against published predictions', () => {
    const find = (body, type) => P.ECLIPSE_CALENDAR.filter(row => row.body === body && row.type === type).map(row => row.date);
    expect(find('solar', 'total')).toEqual(['2027-08-02', '2028-07-22', '2030-11-25']);
    expect(find('solar', 'annular')).toEqual(['2027-02-06', '2028-01-26', '2030-06-01']);
    expect(find('lunar', 'total')).toEqual(['2028-12-31', '2029-06-26', '2029-12-20']);
  });
  it('every listed eclipse falls at a New Moon (solar) or Full Moon (lunar) according to the engine', () => {
    for (const row of P.ECLIPSE_CALENDAR) {
      const [y, m, d] = row.date.split('-').map(Number);
      const illum = [0, 6, 12, 18, 24].map(hour => P.moonPhaseAt(P.astroDayNumber(y, m, d, hour)).illum);
      if (row.body === 'solar') expect(Math.min(...illum)).toBeLessThan(0.005);
      else expect(Math.max(...illum)).toBeGreaterThan(0.995);
    }
  });
  it('hides a row once its date has passed and keeps it on the day itself', () => {
    expect(P.upcomingEclipses('2026-11-09')).toHaveLength(P.ECLIPSE_CALENDAR.length);
    expect(P.upcomingEclipses('2027-08-02')[0].date).toBe('2027-08-02');
    expect(P.upcomingEclipses('2027-08-03')[0].date).toBe('2028-01-26');
    expect(P.upcomingEclipses('2030-11-26')).toEqual([]);
    for (const bad of ['', 'tomorrow', null, undefined, 20261109, '2026-1-9']) expect(P.upcomingEclipses(bad)).toEqual([]);
  });
});

describe('the Eclipses tab calendar', () => {
  it('shows the next eclipses, soonest first, with where they can be seen', () => {
    at(2026, 11, 9);
    const section = doc({ obsSite: 'portland' }).querySelector('#astronomy-eclipse-calendar');
    const rows = [...section.querySelectorAll('tr[data-eclipse-date]')];
    expect(rows[0].getAttribute('data-eclipse-date')).toBe('2027-02-06');
    expect(rows[1].textContent).toContain('2027-08-02');
    expect(rows[1].textContent).toContain('Total solar eclipse');
    expect(rows[1].textContent).toContain('Spain, North Africa, Egypt');
    expect(section.textContent).toContain('Why not every month?');
    expect(section.textContent).toContain('never look at the Sun without certified eclipse glasses');
  });
  it('drops past eclipses by the date at the chosen place', () => {
    at(2027, 8, 3);
    const first = d => d.querySelector('tr[data-eclipse-date]').getAttribute('data-eclipse-date');
    expect(first(doc({ obsSite: 'portland' }))).toBe('2028-01-26');
    // 2028-07-22 23:00 UTC is already 23 July in Sydney but still 22 July in Los Angeles.
    at(2028, 7, 22, 23);
    expect(first(doc({ obsSite: 'sydney' }))).toBe('2028-12-31');
    expect(first(doc({ obsSite: 'la' }))).toBe('2028-07-22');
  });
  it('says the list has ended instead of showing an empty table', () => {
    at(2031, 1, 1);
    const section = doc({ obsSite: 'portland' }).querySelector('#astronomy-eclipse-calendar');
    expect(section.querySelector('table')).toBeNull();
    expect(section.querySelector('#astronomy-eclipse-calendar-empty').textContent).toContain('This list ends in 2030');
  });
});
