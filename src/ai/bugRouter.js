/**
 * Bug Router - AI-powered bug classification and analysis
 * Routes bugs to the appropriate AI based on type
 * Uses shared callAI utility with automatic provider fallback
 */
import { callAI, callAIJson } from './callAI';

// Classify bug type using AI with fallback
export const classifyBug = async (bugReport) => {
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
        return await callAIJson(prompt, { max_tokens: 256 });
    } catch (error) {
        console.error('Classification error:', error);
        return { bugType: 'unclear', confidence: 0.5, reasoning: `Classification failed: ${error.message}` };
    }
};

// Analyze bug using AI with fallback (for code bugs)
const analyzeWithGroq = async (bugReport) => {
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

    // No longer Groq-specific — uses fallback chain
    const content = await callAI(prompt, { max_tokens: 1024 });
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not parse AI response');
    return JSON.parse(jsonMatch[0]);
};

// Analyze bug using AI with fallback (for UI bugs)
const analyzeWithOpenRouter = async (bugReport) => {
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

    // Now routes through shared fallback utility
    const content = await callAI(prompt, { max_tokens: 1024 });
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not parse AI response');
    return JSON.parse(jsonMatch[0]);
};

// Fallback analysis using AI with fallback
const fallbackAnalysis = async (bugReport) => {
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
        return await callAIJson(prompt, { max_tokens: 512 });
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
            // Route to AI for code analysis
            console.log('Routing to AI for code analysis...');
            analysis = await analyzeWithGroq(bugReport);
        } else if (bugType === 'ui') {
            // Route to AI for UI analysis
            console.log('Routing to AI for UI analysis...');
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
