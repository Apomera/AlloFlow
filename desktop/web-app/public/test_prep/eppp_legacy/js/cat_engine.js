/* ============================================================
   PasstheEPPP — Computerized Adaptive Testing (CAT) Engine
   Simplified IRT-based adaptive algorithm for EPPP prep
   ============================================================ */

const CATEngine = {
    // Difficulty mapping: text → numeric theta values
    DIFFICULTY_MAP: { easy: 1.0, medium: 2.0, hard: 3.0 },
    DIFFICULTY_LABELS: { easy: 'Easy', medium: 'Medium', hard: 'Hard' },

    // Ability level descriptors
    ABILITY_LEVELS: [
        { min:0,   max:1.2, label:'Needs Focus',  color:'#EF4444', icon:'🔴' },
        { min:1.2, max:1.8, label:'Developing',    color:'#F59E0B', icon:'🟡' },
        { min:1.8, max:2.4, label:'Proficient',    color:'#3B82F6', icon:'🔵' },
        { min:2.4, max:3.5, label:'Strong',        color:'#10B981', icon:'🟢' }
    ],

    /**
     * Initialize a new CAT session
     * @param {number} questionsPerDomain - questions to ask per domain (default 5)
     * @returns {object} session state
     */
    createSession(questionsPerDomain = 5) {
        const domains = EPPPData.domains.map(d => d.id);
        const domainState = {};

        // Load prior ability estimates from localStorage if available
        const store = App.getStore();
        const priorThetas = store.catAbility || {};

        domains.forEach(id => {
            domainState[id] = {
                theta: priorThetas[id] || 2.0,  // start at medium or use prior
                answered: 0,
                correct: 0,
                target: questionsPerDomain,
                history: [],   // [{difficulty, correct, theta_after}]
                seenIds: new Set()
            };
        });

        return {
            domainState,
            allSeenQuestions: new Set(),
            currentQuestion: null,
            currentDomainId: null,
            totalAnswered: 0,
            totalTarget: domains.length * questionsPerDomain,
            finished: false,
            endless: false,
            startTime: Date.now()
        };
    },

    /**
     * Create an endless CAT session — goes through ALL questions
     * @returns {object} session state with endless flag
     */
    createEndlessSession() {
        const domains = EPPPData.domains.map(d => d.id);
        const domainState = {};

        const store = App.getStore();
        const priorThetas = store.catAbility || {};

        // Count total questions available
        let totalAvailable = 0;
        domains.forEach(id => {
            const domain = EPPPData.getDomain(id);
            const poolSize = domain ? domain.questions.length : 0;
            totalAvailable += poolSize;
            domainState[id] = {
                theta: priorThetas[id] || 2.0,
                answered: 0,
                correct: 0,
                target: poolSize, // all questions in the domain
                history: [],
                seenIds: new Set()
            };
        });

        return {
            domainState,
            allSeenQuestions: new Set(),
            currentQuestion: null,
            currentDomainId: null,
            totalAnswered: 0,
            totalTarget: totalAvailable,
            finished: false,
            endless: true,
            startTime: Date.now()
        };
    },

    /**
     * Select the next question adaptively
     * @param {object} session - CAT session state
     * @returns {object|null} next question with domainId, or null if done
     */
    selectNextQuestion(session) {
        // Find domain with fewest answered that hasn't reached target
        const eligible = Object.entries(session.domainState)
            .filter(([, s]) => s.answered < s.target)
            .sort((a, b) => a[1].answered - b[1].answered);

        if (eligible.length === 0) {
            session.finished = true;
            return null;
        }

        // Pick the least-questioned domain (ties broken by lowest theta = weakest)
        const minAnswered = eligible[0][1].answered;
        const tiedDomains = eligible.filter(([, s]) => s.answered === minAnswered);
        tiedDomains.sort((a, b) => a[1].theta - b[1].theta);
        const [domainIdStr, domainSt] = tiedDomains[0];
        const domainId = parseInt(domainIdStr);

        // Get question pool for this domain
        const domain = EPPPData.getDomain(domainId);
        if (!domain) return null;

        const pool = domain.questions
            .map((q, idx) => ({...EPPPData._normalize(q, domainId, domain.name), _poolIdx: idx}))
            .filter(q => !session.allSeenQuestions.has(this._questionId(q)));

        if (pool.length === 0) {
            // No more unseen questions — mark domain as done
            domainSt.target = domainSt.answered;
            return this.selectNextQuestion(session);
        }

        // Score each question by closeness to current theta
        const targetTheta = domainSt.theta;
        const masteredSet = App.getMasteredQuestionsSet();
        
        const scored = pool.map(q => {
            const qDiff = this.DIFFICULTY_MAP[q.difficulty] || 2.0;
            let distance = Math.abs(qDiff - targetTheta);
            
            // Apply a severe penalty to mastered questions so they are only picked if no unmastered questions exist
            const isMastered = masteredSet.has(App.getQuestionId(q));
            if (isMastered) distance += 10.0;
            
            // Add small random jitter to prevent always picking the same question
            return { q, distance: distance + Math.random() * 0.15 };
        }).sort((a, b) => a.distance - b.distance);

        // Pick from top 3 closest (with randomization)
        const topN = Math.min(3, scored.length);
        const pick = scored[Math.floor(Math.random() * topN)].q;

        session.currentQuestion = pick;
        session.currentDomainId = domainId;
        session.allSeenQuestions.add(this._questionId(pick));

        return pick;
    },

    /**
     * Process an answer and update ability estimate
     * @param {object} session - CAT session
     * @param {number} selectedAnswer - index the user chose
     * @returns {object} result info {correct, oldTheta, newTheta, difficulty}
     */
    processAnswer(session, selectedAnswer) {
        const q = session.currentQuestion;
        const domainId = session.currentDomainId;
        const domainSt = session.domainState[domainId];
        const correct = selectedAnswer === (q.answer !== undefined ? q.answer : q.correct);

        const qDifficulty = this.DIFFICULTY_MAP[q.difficulty] || 2.0;
        const oldTheta = domainSt.theta;

        // Adaptive theta update — larger adjustments early, smaller later
        const nAnswered = domainSt.answered + 1;
        const stepSize = Math.max(0.15, 0.5 / Math.sqrt(nAnswered));

        if (correct) {
            App.markQuestionMastered(q);
            // Correct at or above theta → increase theta
            if (qDifficulty >= oldTheta - 0.3) {
                domainSt.theta = Math.min(3.5, oldTheta + stepSize);
            } else {
                // Easy question answered correctly — minimal theta change
                domainSt.theta = Math.min(3.5, oldTheta + stepSize * 0.3);
            }
        } else {
            // Incorrect at or below theta → decrease theta
            if (qDifficulty <= oldTheta + 0.3) {
                domainSt.theta = Math.max(0.5, oldTheta - stepSize);
            } else {
                // Hard question missed — smaller penalty
                domainSt.theta = Math.max(0.5, oldTheta - stepSize * 0.5);
            }
        }

        domainSt.answered++;
        if (correct) domainSt.correct++;
        domainSt.history.push({
            difficulty: q.difficulty,
            difficultyNum: qDifficulty,
            correct,
            thetaBefore: oldTheta,
            thetaAfter: domainSt.theta
        });

        session.totalAnswered++;

        // Check if we're done
        const allDone = Object.values(session.domainState)
            .every(s => s.answered >= s.target);
        if (allDone) session.finished = true;

        return {
            correct,
            oldTheta,
            newTheta: domainSt.theta,
            difficulty: q.difficulty,
            difficultyNum: qDifficulty,
            domainId
        };
    },

    /**
     * Get ability level descriptor for a theta value
     */
    getAbilityLevel(theta) {
        for (const level of this.ABILITY_LEVELS) {
            if (theta >= level.min && theta < level.max) return level;
        }
        return this.ABILITY_LEVELS[this.ABILITY_LEVELS.length - 1];
    },

    /**
     * Generate comprehensive results from a completed session
     */
    generateResults(session) {
        const domainResults = Object.entries(session.domainState).map(([id, state]) => {
            const domain = EPPPData.getDomain(parseInt(id));
            const level = this.getAbilityLevel(state.theta);
            const pct = state.answered > 0 ? Math.round((state.correct / state.answered) * 100) : 0;

            // Recommended study hours based on theta
            const weight = domain?.weight || 10;
            let hours;
            if (state.theta >= 2.6) hours = Math.round(weight * 1);
            else if (state.theta >= 2.0) hours = Math.round(weight * 2);
            else if (state.theta >= 1.5) hours = Math.round(weight * 3.5);
            else hours = Math.round(weight * 5);

            return {
                domainId: parseInt(id),
                domainName: domain?.name || `Domain ${id}`,
                color: domain?.color || '#888',
                weight: domain?.weight || 10,
                theta: Math.round(state.theta * 100) / 100,
                correct: state.correct,
                total: state.answered,
                pct,
                level,
                recommendedHours: hours,
                history: state.history
            };
        }).sort((a, b) => a.theta - b.theta); // weakest first

        const totalCorrect = domainResults.reduce((s, d) => s + d.correct, 0);
        const totalQuestions = domainResults.reduce((s, d) => s + d.total, 0);
        const overallTheta = domainResults.reduce((s, d) => s + d.theta * d.weight, 0) /
                            domainResults.reduce((s, d) => s + d.weight, 0);
        const overallLevel = this.getAbilityLevel(overallTheta);

        // Readiness score (0-100 scale)
        // theta 0.5..3.5 maps to 0..100
        const readiness = Math.round(Math.min(100, Math.max(0, (overallTheta - 0.5) / 3.0 * 100)));

        const timeSpent = Math.round((Date.now() - session.startTime) / 1000);

        return {
            domainResults,
            totalCorrect,
            totalQuestions,
            overallTheta: Math.round(overallTheta * 100) / 100,
            overallLevel,
            readiness,
            timeSpent,
            date: new Date().toISOString(),
            weakest: domainResults.slice(0, 3),
            strongest: domainResults.slice(-2)
        };
    },

    /**
     * Save results to localStorage
     */
    saveResults(results) {
        const store = App.getStore();

        // Save ability estimates for future sessions
        if (!store.catAbility) store.catAbility = {};
        results.domainResults.forEach(d => {
            store.catAbility[d.domainId] = d.theta;
        });

        // Save to history
        if (!store.catHistory) store.catHistory = [];
        store.catHistory.push({
            date: results.date,
            readiness: results.readiness,
            overallTheta: results.overallTheta,
            totalCorrect: results.totalCorrect,
            totalQuestions: results.totalQuestions,
            timeSpent: results.timeSpent,
            domains: results.domainResults.map(d => ({
                id: d.domainId,
                name: d.domainName,
                theta: d.theta,
                correct: d.correct,
                total: d.total,
                level: d.level.label
            }))
        });

        // Also push into quiz history for readiness tracking
        results.domainResults.forEach(d => {
            store.quizHistory.push({
                date: results.date,
                domainId: d.domainId,
                score: d.correct,
                total: d.total,
                source: 'cat'
            });
        });

        App.saveStore(store);
    },

    /**
     * Get previous CAT results for comparison
     */
    getPreviousResults() {
        const store = App.getStore();
        return store.catHistory || [];
    },

    /**
     * Get saved ability estimates
     */
    getSavedAbilities() {
        const store = App.getStore();
        return store.catAbility || {};
    },

    /**
     * Generate a weak-areas exam weighting bottom domains 2x
     * @param {number} totalQuestions - total questions for the exam
     * @returns {Array} weighted question pool
     */
    generateWeakAreasExam(totalQuestions = 50) {
        const abilities = this.getSavedAbilities();
        const domains = EPPPData.domains.map(d => ({
            ...d,
            theta: abilities[d.id] || 2.0
        })).sort((a, b) => a.theta - b.theta);

        // Bottom 3 get 2x weight, rest get 1x
        const weakIds = new Set(domains.slice(0, 3).map(d => d.id));
        const totalWeight = domains.reduce((s, d) => s + d.weight * (weakIds.has(d.id) ? 2 : 1), 0);

        const questions = [];
        domains.forEach(d => {
            const multiplier = weakIds.has(d.id) ? 2 : 1;
            const count = Math.round(totalQuestions * (d.weight * multiplier / totalWeight));
            const pool = d.questions.map(q => EPPPData._normalize(q, d.id, d.name));
            // Shuffle
            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pool[i], pool[j]] = [pool[j], pool[i]];
            }
            questions.push(...pool.slice(0, count));
        });

        // Shuffle all
        for (let i = questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questions[i], questions[j]] = [questions[j], questions[i]];
        }

        return questions.slice(0, totalQuestions);
    },

    /**
     * Generate a domain-specific exam
     */
    generateDomainExam(domainId, totalQuestions = 50) {
        const domain = EPPPData.getDomain(domainId);
        if (!domain) return [];
        const pool = domain.questions.map(q => EPPPData._normalize(q, domainId, domain.name));
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        return pool.slice(0, Math.min(totalQuestions, pool.length));
    },

    // Internal: create a unique-ish ID for a question to track seen questions
    _questionId(q) {
        return (q.q || '').substring(0, 60) + '|' + (q.domainId || 0);
    }
};
