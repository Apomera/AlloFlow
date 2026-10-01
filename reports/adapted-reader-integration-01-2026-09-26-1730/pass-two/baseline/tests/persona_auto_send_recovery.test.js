import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const React = require(path.resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(path.resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(path.resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'desktop/web-app/src/AlloFlowANTI.txt'];
let root, container;
afterEach(() => { if (root) act(() => root.unmount()); container?.remove(); root = null; vi.useRealTimers(); });
function mountHost(file, initial) {
  const source = fs.readFileSync(file, 'utf8');
  const marker = source.indexOf('if (isPersonaChatOpen && isDictationMode && personaAutoSend');
  expect(marker).toBeGreaterThan(0);
  const start = source.lastIndexOf('useEffect(() => {', marker);
  const end = source.indexOf('  const handleSaveReflection', marker);
  const effect = source.slice(start, end);
  const View = new Function('React', `return function Fixture(props) {
    const { isPersonaChatOpen, isDictationMode, personaAutoSend, personaInput, personaState, isPersonaFreeResponse, handlePersonaChatSubmit } = props;
    const useEffect = React.useEffect, HESITATION_DELAY = 100;
    ${effect}
    return null;
  };`)(React);
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  const update = props => act(() => root.render(React.createElement(View, props)));
  update(initial); return update;
}
describe.each(hosts)('Persona voice recovery in %s', file => {
  it('does not automatically resend a restored question after failure', () => {
    vi.useFakeTimers();
    const send = vi.fn();
    const props = { isPersonaChatOpen: true, isDictationMode: true, personaAutoSend: true, personaInput: 'What evidence supports this?', isPersonaFreeResponse: true, personaState: { isLoading: false, turnError: null }, handlePersonaChatSubmit: send };
    const update = mountHost(file, props);
    act(() => vi.advanceTimersByTime(100)); expect(send).toHaveBeenCalledTimes(1);
    update({ ...props, personaInput: '', personaState: { isLoading: true, turnError: null } });
    update({ ...props, personaState: { isLoading: false, turnError: true } });
    act(() => vi.advanceTimersByTime(1000)); expect(send).toHaveBeenCalledTimes(1);
    update({ ...props, personaInput: 'A new question', personaState: { isLoading: false, turnError: null } });
    act(() => vi.advanceTimersByTime(100)); expect(send).toHaveBeenCalledTimes(2);
  });
  it('cancels a queued voice submission when response format or busy state changes', () => {
    vi.useFakeTimers(); const send = vi.fn();
    const props = { isPersonaChatOpen: true, isDictationMode: true, personaAutoSend: true, personaInput: 'My question', isPersonaFreeResponse: true, personaState: { isLoading: false }, handlePersonaChatSubmit: send };
    const update = mountHost(file, props);
    update({ ...props, isPersonaFreeResponse: false });
    act(() => vi.advanceTimersByTime(100)); expect(send).not.toHaveBeenCalled();
    update(props);
    update({ ...props, personaState: { isLoading: true } });
    act(() => vi.advanceTimersByTime(100)); expect(send).not.toHaveBeenCalled();
  });
});
