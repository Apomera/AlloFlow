import { beforeAll, afterEach, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';
beforeAll(() => { loadAlloModule('ai_backend_module.js'); loadAlloModule('udl_chat_module.js'); loadAlloModule('gemini_api_module.js'); });
afterEach(() => { delete window.callGemini; delete window.__alloActiveAIBackend; delete window.ALLOFLOW_MANAGED_AI_POLICY; localStorage.clear(); vi.restoreAllMocks(); });
it('reads active object descriptors without changing them into strings', () => {
 window.__alloActiveAIBackend = { backend: 'custom', baseUrl: 'https://district.test/v1' };
 expect(window.AlloFlowChatPrivacy.destination()).toMatchObject({backend:'custom', label:'Custom AI', origin:'https://district.test', active:true});
});
it('prefers the installed function over stale local metadata and saved settings', () => {
 window.__alloActiveAIBackend = { backend:'ollama', baseUrl:'http://localhost:11434' };
 localStorage.setItem('alloflow_ai_config', JSON.stringify({backend:'custom',baseUrl:'https://old.test'}));
 const api = window.AlloModules.createGeminiAPI({apiKey:'synthetic',GEMINI_MODELS:{default:'fixture'}});
 window.callGemini = api.callGemini;
 expect(window.AlloFlowChatPrivacy.destination()).toMatchObject({backend:'gemini',origin:'https://generativelanguage.googleapis.com',active:true});
 expect(api.callGeminiSingleAttempt._alloflowBackend).toBe('gemini');
});
it('strips credentials, paths, queries and fragments from the indicator', () => {
 window.__alloActiveAIBackend = { backend:'custom',baseUrl:'https://private-user:private-key@district.test/private-path?student=private-id#private-note' };
 const destination = window.AlloFlowChatPrivacy.destination();
 expect(destination.origin).toBe('https://district.test'); expect(JSON.stringify(destination)).not.toContain('private');
});
it('labels saved configuration as configured, without claiming active or district approved', () => {
 localStorage.setItem('alloflow_ai_config',JSON.stringify({backend:'ollama',baseUrl:'https://remote.test'}));
 expect(window.AlloFlowChatPrivacy.destination()).toMatchObject({backend:'ollama',origin:'https://remote.test',active:false,managed:false});
});
it('does not render malformed endpoint values or stored provider labels', () => {
 localStorage.setItem('alloflow_ai_config',JSON.stringify({backend:'private-student-label',baseUrl:'javascript:private-key'}));
 expect(window.AlloFlowChatPrivacy.destination()).toMatchObject({label:'Other AI',origin:''});
});
it('routes Gemini object descriptors to native grounding', async () => {
 window.__alloActiveAIBackend = {backend:'gemini'};
 const callGemini = vi.fn(async()=>({text:'Evidence',groundingMetadata:{groundingChunks:[{web:{uri:'https://udlguidelines.cast.org/',title:'CAST'}}]}}));
 const result=await window.AlloModules.UdlChat.evidence.retrieve('Check UDL',{callGemini});
 expect(callGemini).toHaveBeenCalledOnce();expect(result.basis).toBe('google-grounding');
});
it('preserves research opt-in for an active non-Gemini object descriptor', async () => {
 window.__alloActiveAIBackend = {backend:'custom',baseUrl:'https://district.test'};
 const callGemini=vi.fn();
 expect((await window.AlloModules.UdlChat.evidence.retrieve('Check UDL',{callGemini})).status).toBe('disabled');expect(callGemini).not.toHaveBeenCalled();
});
