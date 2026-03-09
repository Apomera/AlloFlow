/**
 * AlloFlow Web Search Provider
 * 
 * Provides web search results for non-Gemini AI backends (Ollama, LocalAI, etc.)
 * using DuckDuckGo Instant Answers API (free, no API key required).
 * 
 * Returns Gemini-compatible groundingMetadata so existing citation rendering works unchanged.
 */

const WebSearchProvider = {

    /**
     * Search the web and return results with Gemini-compatible grounding metadata.
     * @param {string} query - The search query
     * @param {number} [maxResults=5] - Maximum number of results to return
     * @returns {Promise<{results: Array, contextPrompt: string, groundingMetadata: Object|null}>}
     */
    async search(query, maxResults = 5) {
        if (!query || query.trim().length < 3) {
            return { results: [], contextPrompt: '', groundingMetadata: null };
        }

        try {
            // Extract a focused search query from the prompt (first ~200 chars or key phrases)
            const searchQuery = this._extractSearchQuery(query);
            console.log(`[WebSearch] Searching for: "${searchQuery}"`);

            const results = await this._fetchDuckDuckGo(searchQuery, maxResults);

            if (results.length === 0) {
                console.log('[WebSearch] No results found');
                return { results: [], contextPrompt: '', groundingMetadata: null };
            }

            console.log(`[WebSearch] Found ${results.length} results`);

            // Build context prompt for injection into LLM
            const contextPrompt = this._buildContextPrompt(results);

            // Build Gemini-compatible grounding metadata
            const groundingMetadata = this._buildGroundingMetadata(results);

            return { results, contextPrompt, groundingMetadata };

        } catch (err) {
            console.warn('[WebSearch] Search failed (falling back to no-grounding):', err.message);
            return { results: [], contextPrompt: '', groundingMetadata: null };
        }
    },

    /**
     * Extract a focused search query from a long prompt.
     * Prompts can be very long (1000+ chars) but search queries should be short.
     */
    _extractSearchQuery(prompt) {
        // If prompt is short enough, use it directly
        if (prompt.length <= 100) return prompt;

        // Try to find the actual topic/question in the prompt
        // Look for common patterns like "about X", "topic: X", or just use first sentence
        const patterns = [
            /(?:about|regarding|topic[:\s]+|subject[:\s]+|research[:\s]+)\s*["""]?([^""".\n]{10,80})/i,
            /(?:write|generate|create|explain|describe)\s+(?:a\s+)?(?:lesson|text|content|article|report)?\s*(?:about|on|for)\s+["""]?([^""".\n]{10,80})/i,
        ];

        for (const pattern of patterns) {
            const match = prompt.match(pattern);
            if (match && match[1]) return match[1].trim();
        }

        // Fallback: first meaningful sentence
        const firstSentence = prompt.split(/[.!?\n]/).filter(s => s.trim().length > 10)[0] || '';
        return firstSentence.trim().slice(0, 100);
    },

    /**
     * Fetch search results from DuckDuckGo Instant Answers API.
     * This API is free and requires no key.
     */
    async _fetchDuckDuckGo(query, maxResults) {
        // DuckDuckGo Instant Answers API endpoint
        const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;

        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
            throw new Error(`DuckDuckGo API returned ${response.status}`);
        }

        const data = await response.json();
        const results = [];

        // Abstract (main answer)
        if (data.Abstract && data.AbstractURL) {
            results.push({
                title: data.Heading || query,
                url: data.AbstractURL,
                snippet: data.Abstract,
                source: data.AbstractSource || 'DuckDuckGo',
            });
        }

        // Related topics (more results)
        if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
            for (const topic of data.RelatedTopics) {
                if (results.length >= maxResults) break;
                if (topic.Text && topic.FirstURL) {
                    results.push({
                        title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 60),
                        url: topic.FirstURL,
                        snippet: topic.Text,
                        source: 'DuckDuckGo',
                    });
                }
                // Handle nested topic groups
                if (topic.Topics && Array.isArray(topic.Topics)) {
                    for (const sub of topic.Topics) {
                        if (results.length >= maxResults) break;
                        if (sub.Text && sub.FirstURL) {
                            results.push({
                                title: sub.Text.split(' - ')[0] || sub.Text.slice(0, 60),
                                url: sub.FirstURL,
                                snippet: sub.Text,
                                source: 'DuckDuckGo',
                            });
                        }
                    }
                }
            }
        }

        // Results (direct answers)
        if (data.Results && Array.isArray(data.Results)) {
            for (const r of data.Results) {
                if (results.length >= maxResults) break;
                if (r.Text && r.FirstURL) {
                    results.push({
                        title: r.Text.split(' - ')[0] || r.Text.slice(0, 60),
                        url: r.FirstURL,
                        snippet: r.Text,
                        source: 'DuckDuckGo',
                    });
                }
            }
        }

        // Answer (computation/fact)
        if (data.Answer && results.length === 0) {
            results.push({
                title: query,
                url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
                snippet: data.Answer,
                source: 'DuckDuckGo',
            });
        }

        return results;
    },

    /**
     * Build a context prompt to inject search results into the LLM prompt.
     */
    _buildContextPrompt(results) {
        if (!results.length) return '';

        const sources = results.map((r, i) =>
            `[Source ${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`
        ).join('\n\n');

        return `The following web search results provide context for your response. Use them to provide accurate, well-sourced information. Reference specific sources when possible using [Source N] notation.\n\n--- WEB SEARCH RESULTS ---\n${sources}\n--- END SEARCH RESULTS ---\n\n`;
    },

    /**
     * Build Gemini-compatible groundingMetadata from search results.
     * This ensures existing citation rendering code (processGrounding, etc.) works unchanged.
     */
    _buildGroundingMetadata(results) {
        if (!results.length) return null;

        // Build groundingChunks (Gemini format)
        const groundingChunks = results.map(r => ({
            web: {
                uri: r.url,
                title: r.title,
            },
        }));

        // Build groundingSupports (maps text segments to chunk indices)
        // Since we can't predict exactly where the LLM will use each source,
        // we create a simple mapping: each source supports the full response
        const groundingSupports = results.map((r, i) => ({
            groundingChunkIndices: [i],
            segment: {
                startIndex: 0,
                endIndex: 0, // Will be filled by the caller if needed
                text: r.snippet.slice(0, 100),
            },
        }));

        return {
            groundingChunks,
            groundingSupports,
            searchEntryPoint: {
                renderedContent: `<a href="https://duckduckgo.com/?q=${encodeURIComponent(results[0]?.title || '')}" target="_blank">Search on DuckDuckGo</a>`,
            },
        };
    },

    /**
     * Test if the DuckDuckGo API is reachable.
     */
    async testConnection() {
        try {
            const { results } = await this.search('test', 1);
            return results.length > 0;
        } catch {
            return false;
        }
    },
};

// Export for use in AIProvider
if (typeof window !== 'undefined') {
    window.WebSearchProvider = WebSearchProvider;
}
