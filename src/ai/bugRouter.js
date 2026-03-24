/**
 * Bug Router - AI-powered bug classification and analysis
 * Routes bugs to the appropriate AI based on type
 */

// Classify bug type using Groq
export const classifyBug = async (bugReport) => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;

    if (!apiKey) {
        throw new Error('Groq API key not configured. Please set VITE_GROQ_API_KEY in .env');
    }

    const prompt = `You are a bug classification expert. Analyze this bug report and classify it into one of these categories:
- "code" - Logic errors, functionality not working, crashes, data issues
- "ui" - Visual issues, layout problems, styling, responsiveness, colors
- "unclear" - Cannot determine from description, needs more info

Bug Report:
Title: ${bugReport.title}
Description: ${bugReport.description}
Expected Behavior: ${bugReport.expectedBehavior}
Bug Type Hint: ${bugReport.bugTypeHint || 'Not specified'}
Device: ${bugReport.device || 'Not specified'}
Browser: ${bugReport.browser || 'Not specified'}

Return JSON only:
{
  "bugType": "code|ui|unclear",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of why this classification was chosen"
}`;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                max_tokens: 256,
                messages: [{ role: 'user', content: prompt }],
            }),
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        const jsonMatch = content?.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return { bugType: 'unclear', confidence: 0.5, reasoning: 'Could not classify bug' };
        }
        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error('Classification error:', error);
        return { bugType: 'unclear', confidence: 0.5, reasoning: `Classification failed: ${error.message}` };
    }
};

// Analyze bug using Groq (for code bugs)
const analyzeWithGroq = async (bugReport) => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;

    if (!apiKey) {
        throw new Error('Groq API key not configured');
    }

    const prompt = `You are a senior software developer analyzing a bug report. Provide detailed analysis.

Bug Report:
Title: ${bugReport.title}
Description: ${bugReport.description}
Expected Behavior: ${bugReport.expectedBehavior}
Steps to Reproduce: ${(bugReport.stepsToReproduce || []).join(', ')}
Page/URL: ${bugReport.pageUrl || 'Not specified'}
Device: ${bugReport.device || 'Not specified'}
Browser: ${bugReport.browser || 'Not specified'}

Analyze and return JSON:
{
  "severity": "minor|medium|major|critical",
  "summary": "Brief 1-2 sentence summary",
  "rootCause": "Technical explanation of what's causing the bug",
  "suggestedFix": "Code or configuration fix suggestion",
  "affectedFiles": ["file1.js", "file2.js"],
  "estimatedTime": "1-2 hours",
  "pricingCategory": "minor|medium|major|critical"
}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }],
        }),
    });

    if (!response.ok) {
        throw new Error(`Groq API failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    const jsonMatch = content?.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
        throw new Error('Could not parse AI response');
    }
    return JSON.parse(jsonMatch[0]);
};

// Analyze bug using OpenRouter Gemini Flash (for UI bugs)
const analyzeWithOpenRouter = async (bugReport) => {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

    if (!apiKey) {
        throw new Error('OpenRouter API key not configured. Please set VITE_OPENROUTER_API_KEY in .env');
    }

    const prompt = `You are a UI/UX expert analyzing a bug report. Provide detailed analysis.

Bug Report:
Title: ${bugReport.title}
Description: ${bugReport.description}
Expected Behavior: ${bugReport.expectedBehavior}
Steps to Reproduce: ${(bugReport.stepsToReproduce || []).join(', ')}
Page/URL: ${bugReport.pageUrl || 'Not specified'}
Device: ${bugReport.device || 'Not specified'}
Browser: ${bugReport.browser || 'Not specified'}

Analyze and return JSON:
{
  "severity": "minor|medium|major|critical",
  "summary": "Brief 1-2 sentence summary",
  "rootCause": "Technical explanation of what's causing the visual issue",
  "suggestedFix": "CSS or component fix suggestion",
  "affectedFiles": ["App.css", "Button.jsx"],
  "estimatedTime": "30 mins - 1 hour",
  "pricingCategory": "minor|medium|major|critical"
}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': window.location.origin,
        },
        body: JSON.stringify({
            model: 'google/gemini-flash-1.5',
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }],
        }),
    });

    if (!response.ok) {
        throw new Error(`OpenRouter API failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    const jsonMatch = content?.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
        throw new Error('Could not parse AI response');
    }
    return JSON.parse(jsonMatch[0]);
};

// Fallback analysis using OpenRouter free model
const fallbackAnalysis = async (bugReport) => {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

    if (!apiKey) {
        // Return basic analysis without AI
        return {
            severity: 'medium',
            summary: 'Analysis pending - API key not configured',
            rootCause: 'Could not analyze - please configure VITE_OPENROUTER_API_KEY',
            suggestedFix: 'Manual analysis required',
            affectedFiles: [],
            estimatedTime: 'To be determined',
            pricingCategory: 'medium'
        };
    }

    const prompt = `Analyze this bug report and return JSON:

Title: ${bugReport.title}
Description: ${bugReport.description}
Expected: ${bugReport.expectedBehavior}

Return:
{
  "severity": "minor|medium|major|critical",
  "summary": "Brief summary",
  "rootCause": "Root cause",
  "suggestedFix": "Fix suggestion",
  "affectedFiles": ["file.js"],
  "estimatedTime": "time estimate",
  "pricingCategory": "minor|medium|major|critical"
}`;

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-3.2-3b-instruct:free',
                max_tokens: 512,
                messages: [{ role: 'user', content: prompt }],
            }),
        });

        if (!response.ok) {
            throw new Error('Fallback API failed');
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        const jsonMatch = content?.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            throw new Error('Could not parse fallback response');
        }
        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error('Fallback analysis error:', error);
        return {
            severity: 'medium',
            summary: 'Analysis completed with limited information',
            rootCause: 'Could not complete full analysis',
            suggestedFix: 'Manual review required',
            affectedFiles: [],
            estimatedTime: 'To be determined',
            pricingCategory: 'medium'
        };
    }
};

// Merge results from both AI analyses
const mergeResults = (groqResult, openRouterResult) => {
    // Use the more severe rating
    const severityMap = { minor: 1, medium: 2, major: 3, critical: 4 };
    const severity1 = severityMap[groqResult?.severity] || 2;
    const severity2 = severityMap[openRouterResult?.severity] || 2;
    const chosen = severity1 >= severity2 ? groqResult : openRouterResult;

    return {
        ...chosen,
        summary: `${groqResult?.summary || ''} ${openRouterResult?.summary ? `| UI: ${openRouterResult.summary}` : ''}`.trim(),
        rootCause: `${groqResult?.rootCause || ''}\n\n${openRouterResult?.rootCause ? `UI Analysis: ${openRouterResult.rootCause}` : ''}`.trim(),
        suggestedFix: groqResult?.suggestedFix && openRouterResult?.suggestedFix
            ? `Code Fix:\n${groqResult.suggestedFix}\n\nUI Fix:\n${openRouterResult.suggestedFix}`
            : groqResult?.suggestedFix || openRouterResult?.suggestedFix || '',
        affectedFiles: [...new Set([...(groqResult?.affectedFiles || []), ...(openRouterResult?.affectedFiles || [])])],
        estimatedTime: severity1 >= severity2
            ? groqResult?.estimatedTime
            : openRouterResult?.estimatedTime,
        pricingCategory: severity1 >= severity2
            ? groqResult?.pricingCategory
            : openRouterResult?.pricingCategory,
        dualAnalysis: {
            code: groqResult,
            ui: openRouterResult
        }
    };
};

// Main function - classify and analyze bug
export const analyzeBug = async (bugReport) => {
    // First classify the bug
    const classification = await classifyBug(bugReport);
    const bugType = classification.bugType || 'unclear';

    console.log('Bug classified as:', bugType);

    let analysis;

    try {
        if (bugType === 'code') {
            // Route to Groq for code analysis
            console.log('Routing to Groq for code analysis...');
            analysis = await analyzeWithGroq(bugReport);
        } else if (bugType === 'ui') {
            // Route to OpenRouter Gemini for UI analysis
            console.log('Routing to OpenRouter for UI analysis...');
            analysis = await analyzeWithOpenRouter(bugReport);
        } else {
            // Unclear - run both and merge
            console.log('Bug type unclear - running dual analysis...');
            try {
                const [groqResult, openRouterResult] = await Promise.allSettled([
                    analyzeWithGroq(bugReport),
                    analyzeWithOpenRouter(bugReport)
                ]);

                if (groqResult.status === 'fulfilled' && openRouterResult.status === 'fulfilled') {
                    analysis = mergeResults(groqResult.value, openRouterResult.value);
                } else if (groqResult.status === 'fulfilled') {
                    analysis = groqResult.value;
                } else if (openRouterResult.status === 'fulfilled') {
                    analysis = openRouterResult.value;
                } else {
                    throw new Error('Both analyses failed');
                }
            } catch (mergeError) {
                console.error('Dual analysis failed, using fallback:', mergeError);
                analysis = await fallbackAnalysis(bugReport);
            }
        }
    } catch (error) {
        console.error('Primary analysis failed, using fallback:', error);
        analysis = await fallbackAnalysis(bugReport);
    }

    return {
        bugType,
        classification: classification.reasoning,
        ...analysis
    };
};