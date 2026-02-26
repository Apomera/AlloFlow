"""
Fix Timer Leaks in AlloFlowANTI.txt
=====================================
After manual review of 14 flagged setInterval/setTimeout in useEffect:

GENUINE LEAKS to fix (3):
  L6680  - setTimeout for prefetch in useEffect, no cleanup
  L6704  - setTimeout for lesson plan auto-start, no cleanup  
  L8409  - setTimeout for spelling bee auto-play, no cleanup (has return but no clearTimeout)

BORDERLINE (2) - fixing for safety:
  L35106 - recursive auth retry setTimeout, could orphan on unmount
  L37835 - nested delayed AlloBot speak, low risk but should clean up

FALSE POSITIVES (9):
  L3441  - in useCallback, not useEffect
  L6467  - already has clearTimeout cleanup at L6516
  L6794  - inside async IIFE with cancelled flag (proper pattern)
  L18099 - stored in ref with proper clear at L18094-18096
  L21746 - in event handler (handleDrop), not useEffect
  L33008 - in useCallback (updateTourMetrics), not useEffect
  L33532 - inside async IIFE in useEffect (proper pattern)
  L37827 - stored in ref with proper clear at L37815-37817
  L46399 - in regular function (performHighlight), not useEffect
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()
original_len = len(content.split('\n'))
fixes = 0

# --- FIX 1: L6680 - prefetch setTimeout needs cleanup ---
# The useEffect starting around L6650 has the setTimeout at L6680 but no cleanup  
# Add cleanup: store timer in variable, return cleanup function
old1 = """            setTimeout(() => {
                prefetchNextWords();
                // FIX: Also call preloadInitialBatch if not already running
                if (typeof preloadInitialBatch === 'function') {
                    preloadInitialBatch();
                }
            }, 100);
        }
    }, [wordPool, currentWordSoundsWord, wordSoundsActivity, startActivity, isLoadingPhonemes, prefetchNextWords, showReviewPanel, preloadedWords.length]);"""
new1 = """            const prefetchTimer = setTimeout(() => {
                prefetchNextWords();
                // FIX: Also call preloadInitialBatch if not already running
                if (typeof preloadInitialBatch === 'function') {
                    preloadInitialBatch();
                }
            }, 100);
            return () => clearTimeout(prefetchTimer);
        }
    }, [wordPool, currentWordSoundsWord, wordSoundsActivity, startActivity, isLoadingPhonemes, prefetchNextWords, showReviewPanel, preloadedWords.length]);"""
if old1 in content:
    content = content.replace(old1, new1)
    fixes += 1
    print('[OK] Fix 1: L6680 prefetch timer - added cleanup')
else:
    print('[SKIP] Fix 1: L6680 pattern not found')

# --- FIX 2: L6704 - lesson plan auto-start setTimeout needs cleanup ---
old2 = """            setTimeout(() => {
                startActivity(activitySequence[0]);
            }, 100);
        }
    }, [activitySequence, wordSoundsActivity, preloadedWords.length, startActivity, showReviewPanel]);"""
new2 = """            const autoStartTimer = setTimeout(() => {
                startActivity(activitySequence[0]);
            }, 100);
            return () => clearTimeout(autoStartTimer);
        }
    }, [activitySequence, wordSoundsActivity, preloadedWords.length, startActivity, showReviewPanel]);"""
if old2 in content:
    content = content.replace(old2, new2)
    fixes += 1
    print('[OK] Fix 2: L6704 lesson plan auto-start - added cleanup')
else:
    print('[SKIP] Fix 2: L6704 pattern not found')

# --- FIX 3: L8409 - spelling bee auto-play - has return but clears ref not timer ---
# The effect already has `return () => { spellingBeeInitRef.current = false; };`
# But the setTimeout itself orphans. Need to store + clear it.
old3 = """    React.useEffect(() => {
        if (wordSoundsActivity === 'spelling_bee' && currentWordSoundsWord && !spellingBeeInitRef.current) {
            spellingBeeInitRef.current = true;
            setTimeout(() => handleAudio(currentWordSoundsWord), 300);
        }
        if (wordSoundsActivity !== 'spelling_bee') {
            spellingBeeInitRef.current = false;
        }
        return () => { spellingBeeInitRef.current = false; };
    }, [currentWordSoundsWord, wordSoundsActivity]);"""
new3 = """    React.useEffect(() => {
        let sbTimer = null;
        if (wordSoundsActivity === 'spelling_bee' && currentWordSoundsWord && !spellingBeeInitRef.current) {
            spellingBeeInitRef.current = true;
            sbTimer = setTimeout(() => handleAudio(currentWordSoundsWord), 300);
        }
        if (wordSoundsActivity !== 'spelling_bee') {
            spellingBeeInitRef.current = false;
        }
        return () => { spellingBeeInitRef.current = false; if (sbTimer) clearTimeout(sbTimer); };
    }, [currentWordSoundsWord, wordSoundsActivity]);"""
if old3 in content:
    content = content.replace(old3, new3)
    fixes += 1
    print('[OK] Fix 3: L8409 spelling bee timer - added cleanup')
else:
    print('[SKIP] Fix 3: L8409 pattern not found')

# --- FIX 4: L35106 - recursive auth retry ---
# The setTimeout for initAuth retry could orphan on unmount
# Effect already returns `() => unsubscribe()` - need to also track retry timer
old4 = """    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);"""
new4 = """    let authRetryTimer = null;
    const originalSetTimeout = (fn, delay) => { authRetryTimer = setTimeout(fn, delay); };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => { unsubscribe(); if (authRetryTimer) clearTimeout(authRetryTimer); };
  }, []);"""

# Actually, a cleaner approach: use a ref-like variable in the closure
# Let me re-check: the setTimeout is inside initAuth which is defined inside useEffect
# The simplest safe approach: use a cancelled flag
old4 = """  useEffect(() => {
    const initAuth = async (retryCount = 0) => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        warnLog(`Firebase Auth Error (Attempt ${retryCount + 1}):`, error);
        const isNetworkError = error.code === 'auth/network-request-failed' || error.message?.includes('network');
        if (retryCount < 5 && isNetworkError) {
          const delay = Math.pow(2, retryCount) * 1000; 
          debugLog(`Retrying auth in ${delay}ms...`);
          setTimeout(() => initAuth(retryCount + 1), delay);
        }
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);"""
new4 = """  useEffect(() => {
    let authRetryTimer = null;
    const initAuth = async (retryCount = 0) => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        warnLog(`Firebase Auth Error (Attempt ${retryCount + 1}):`, error);
        const isNetworkError = error.code === 'auth/network-request-failed' || error.message?.includes('network');
        if (retryCount < 5 && isNetworkError) {
          const delay = Math.pow(2, retryCount) * 1000; 
          debugLog(`Retrying auth in ${delay}ms...`);
          authRetryTimer = setTimeout(() => initAuth(retryCount + 1), delay);
        }
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => { unsubscribe(); if (authRetryTimer) clearTimeout(authRetryTimer); };
  }, []);"""
if old4 in content:
    content = content.replace(old4, new4)
    fixes += 1
    print('[OK] Fix 4: L35106 auth retry timer - added cleanup')
else:
    print('[SKIP] Fix 4: L35106 pattern not found')

# --- FIX 5: L37835 - nested delayed AlloBot speak ---
# This is a setTimeout inside a .then() inside another setTimeout (ref-managed)
# Low risk but should add cleanup via the existing ref pattern
# The outer timer at L37827 is already ref-managed. The inner one at L37835 is not.
# Best approach: store inner timer in a variable and clear in the effect cleanup
# But since these are nested callbacks, the simplest safe approach is to check component mount
# Actually the effect at L37811 doesn't have a cleanup return at all!
old5 = """               }, 12000);
          }
      }
  }, [generatedContent, history, runGlossaryHealthCheck]);"""
new5 = """               }, 12000);
          }
      }
      return () => { if (glossaryHealthCheckTimerRef.current) { clearTimeout(glossaryHealthCheckTimerRef.current); glossaryHealthCheckTimerRef.current = null; } };
  }, [generatedContent, history, runGlossaryHealthCheck]);"""
if old5 in content:
    content = content.replace(old5, new5)
    fixes += 1
    print('[OK] Fix 5: L37848 glossary health check effect - added cleanup return')
else:
    print('[SKIP] Fix 5: L37848 pattern not found')

# Write result
new_len = len(content.split('\n'))
print(f'\nApplied {fixes}/5 fixes')
print(f'Lines: {original_len} -> {new_len}')

if fixes > 0:
    open('AlloFlowANTI.txt', 'w', encoding='utf-8', newline='\n').write(content)
    print('File saved.')
else:
    print('No changes made.')
