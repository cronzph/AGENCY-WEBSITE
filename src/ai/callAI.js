/**
 * callAI — Shared AI utility with automatic fallback across providers.
 * Tries providers in order. Skips on: 401, 403, 429, or network error.
 * Reads saved API keys and provider order from Firestore (adminSettings/apiKeySelection + apiKeys collection).
 */
import { db } from '../firebase/config';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';

// Provider endpoints (OpenAI-compatible)
const ENDPOINTS = {
    groq: 'https://api.groq.com/openai/v1/chat/completions',
    cerebras: 'https://api.cerebras.ai/v1/chat/completions',
    openrouter: 'https://openrouter.ai/api/v1/chat/completions',
};

// Default models per provider (used if key has no model set)
const DEFAULT_MODELS = {
    groq: 'llama-3.3-70b-versatile',
    cerebras: 'llama3.1-70b',
    openrouter: 'openai/gpt-4o',
};

// Env var fallback keys
const ENV_KEYS = {
    groq: import.meta.env.VITE_GROQ_API_KEY,
    cerebras: import.meta.env.VITE_CEREBRAS_API_KEY,
    openrouter: import.meta.env.VITE_OPENROUTER_API_KEY,
};

// Default provider priority order
const DEFAULT_ORDER = ['groq', 'cerebras', 'openrouter'];

// Fetch the best available key + model for each provider from Firestore
const getProviderConfigs = async () => {
    try {
        const [keysSnap, selectionDoc] = await Promise.all([
            getDocs(collection(db, 'apiKeys')),
            getDoc(doc(db, 'adminSettings', 'apiKeySelection'))
        ]);
        const apiKeys = keysSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const selection = selectionDoc.exists() ? selectionDoc.data() : {};

        const configs = {};
        for (const provider of DEFAULT_ORDER) {
            // Use selected key if set and still exists
            const selectedId = selection[provider];
            const selectedKey = selectedId ? apiKeys.find(k => k.id === selectedId) : null;

            // Fallback: first Firestore key for provider, then env var
            const firstKey = apiKeys.find(k => k.provider === provider);
            const chosenKey = selectedKey || firstKey;

            configs[provider] = {
                apiKey: chosenKey?.apiKey || ENV_KEYS[provider] || null,
                model: chosenKey?.model || DEFAULT_MODELS[provider],
                endpoint: ENDPOINTS[provider],
            };
        }
        return configs;
    } catch (e) {
        // If Firestore fails, fall back to env vars only
        const configs = {};
        for (const provider of DEFAULT_ORDER) {
            configs[provider] = {
                apiKey: ENV_KEYS[provider] || null,
                model: DEFAULT_MODELS[provider],
                endpoint: ENDPOINTS[provider],
            };
        }
        return configs;
    }
};

// Errors that should trigger fallback to next provider
const SHOULD_FALLBACK_STATUS = new Set([401, 403, 429, 500, 502, 503]);

/**
 * callAI — Main function. Tries providers in order until one succeeds.
 *
 * @param {string} prompt - The user prompt to send
 * @param {object} options
 * @param {number} options.max_tokens - Max tokens to generate (default: 1024)
 * @param {string[]} options.providerOrder - Override provider order (default: ['groq', 'cerebras', 'openrouter'])
 * @param {object[]} options.messages - Full messages array (overrides prompt if set)
 * @returns {Promise<string>} - Raw text content from the AI response
 */
export const callAI = async (prompt, options = {}) => {
    const {
        max_tokens = 1024,
        providerOrder = DEFAULT_ORDER,
        messages = null,
    } = options;

    const configs = await getProviderConfigs();
    const errors = [];

    for (const provider of providerOrder) {
        const config = configs[provider];
        if (!config?.apiKey) {
            errors.push(`${provider}: No API key configured`);
            continue;
        }

        try {
            const body = {
                model: config.model,
                max_tokens,
                messages: messages || [{ role: 'user', content: prompt }],
            };
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            };

            // OpenRouter requires HTTP-Referer
            if (provider === 'openrouter') {
                headers['HTTP-Referer'] = window.location.origin;
            }

            const response = await fetch(config.endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errText = await response.text().catch(() => response.statusText);
                if (SHOULD_FALLBACK_STATUS.has(response.status)) {
                    errors.push(`${provider}: HTTP ${response.status} — ${errText.substring(0, 100)}`);
                    console.warn(`[callAI] ${provider} failed (${response.status}), trying next provider...`);
                    continue; // Try next provider
                }
                throw new Error(`${provider} API error: HTTP ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            if (!content) throw new Error(`${provider}: Empty response`);

            console.log(`[callAI] Success via ${provider} (${config.model})`);
            return content; // ✅ Return on success
        } catch (error) {
            errors.push(`${provider}: ${error.message}`);
            console.warn(`[callAI] ${provider} threw:`, error.message);
            // Continue to next provider
        }
    }

    // All providers failed
    throw new Error(`All AI providers failed:\n${errors.join('\n')}`);
};

/**
 * callAIJson — Same as callAI but automatically parses the first JSON block from the response.
 */
export const callAIJson = async (prompt, options = {}) => {
    const content = await callAI(prompt, options);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in AI response');
    return JSON.parse(jsonMatch[0]);
};
