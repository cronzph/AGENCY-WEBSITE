/**
 * AI Testimonial Evaluator
 * Uses AI to assess if a client testimonial is good enough to display on the landing page.
 * Checks for: positivity, specificity, professionalism, and authenticity.
 */
import { callAI } from './callAI';

/**
 * Evaluate a testimonial using AI
 * @param {Object} params
 * @param {string} params.feedback - The client's testimonial text
 * @param {number} params.rating - Star rating (1-5)
 * @param {string} params.clientName - Client name
 * @param {string} params.businessName - Business name
 * @returns {Object} { approved: boolean, score: number, reason: string, displayText: string }
 */
export const evaluateTestimonial = async ({ feedback, rating, clientName, businessName }) => {
    const prompt = `You are a testimonial quality evaluator for a software development agency called CronzPH.

Evaluate the following client testimonial and determine if it's suitable to display on our landing page's "What Our Clients Say" section.

CLIENT INFO:
- Name: ${clientName}
- Business: ${businessName}
- Star Rating: ${rating}/5

TESTIMONIAL:
"${feedback}"

EVALUATION CRITERIA:
1. Positivity (is it positive/neutral or negative?)
2. Specificity (does it mention specific things about the service?)
3. Professionalism (is it written in a professional manner?)
4. Authenticity (does it feel genuine, not generic?)
5. Length (is it substantial enough? At least 1-2 sentences)
6. Appropriateness (no profanity, no inappropriate content)

SCORING:
- Score 1-10 (10 = perfect testimonial)
- Approved if score >= 7 AND rating >= 4 stars

RESPOND IN THIS EXACT JSON FORMAT ONLY (no markdown, no code blocks):
{
  "approved": true/false,
  "score": number,
  "reason": "brief explanation of why approved or rejected",
  "displayText": "cleaned up version of the testimonial suitable for display (fix minor grammar/spelling but keep authentic voice, or empty string if rejected)"
}`;

    try {
        const response = await callAI({
            messages: [
                { role: 'system', content: 'You are a testimonial quality evaluator. Respond ONLY with valid JSON, no markdown.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 500,
        });

        // Parse the AI response
        const text = response.trim();
        // Try to extract JSON from the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            return {
                approved: result.approved === true && rating >= 4,
                score: result.score || 0,
                reason: result.reason || 'No reason provided',
                displayText: result.displayText || feedback,
            };
        }

        // Fallback: if AI response isn't parseable, use simple heuristics
        return fallbackEvaluation({ feedback, rating });
    } catch (error) {
        console.error('AI testimonial evaluation failed:', error);
        // Fallback to simple heuristic evaluation
        return fallbackEvaluation({ feedback, rating });
    }
};

/**
 * Fallback evaluation when AI is unavailable
 */
const fallbackEvaluation = ({ feedback, rating }) => {
    const text = feedback.trim();
    const wordCount = text.split(/\s+/).length;

    // Simple heuristics
    const isPositive = rating >= 4;
    const isLongEnough = wordCount >= 5;
    const hasNoNegativeWords = !/(terrible|worst|scam|fraud|never|horrible|awful|waste)/i.test(text);
    const isClean = !/(fuck|shit|damn|ass|bitch)/i.test(text);

    const approved = isPositive && isLongEnough && hasNoNegativeWords && isClean;
    const score = (isPositive ? 3 : 0) + (isLongEnough ? 3 : 0) + (hasNoNegativeWords ? 2 : 0) + (isClean ? 2 : 0);

    return {
        approved,
        score,
        reason: approved
            ? 'Passed basic quality checks (positive rating, sufficient length, appropriate content)'
            : `Failed: ${!isPositive ? 'Low rating. ' : ''}${!isLongEnough ? 'Too short. ' : ''}${!hasNoNegativeWords ? 'Contains negative language. ' : ''}${!isClean ? 'Contains inappropriate language.' : ''}`,
        displayText: approved ? text : '',
    };
};
