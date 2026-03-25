/**
 * Generate a detailed project proposal using AI
 * @param {Object} projectData - Project data including AI assessment and client info
 * @returns {Promise<Object>} - Structured proposal JSON
 */
import { callAIJson } from '../ai/callAI';

export async function generateProposal(projectData) {
    const {
        businessName,
        projectDescription,
        projectType,
        complexity,
        estimatedDays,
        suggestedPrice,
        downpayment,
        finalPayment,
        scopeSummary,
        technologiesNeeded,
        warnings
    } = projectData;

    const prompt = `You are an expert project manager and proposal writer for a Filipino web development agency. Generate a detailed, project-specific proposal based on the following client information.

CLIENT INFORMATION:
- Business Name: ${businessName || 'Not specified'}
- Project Description: ${projectDescription || 'Not specified'}

AI ASSESSMENT RESULTS:
- Project Type: ${projectType || 'Not specified'}
- Complexity: ${complexity || 'Not specified'}
- Estimated Days: ${estimatedDays || 'Not specified'}
- Suggested Price: ₱${suggestedPrice || 0}
- Downpayment (50%): ₱${downpayment || 0}
- Final Payment (50%): ₱${finalPayment || 0}
- Scope Summary: ${scopeSummary || 'Not specified'}
- Technologies: ${Array.isArray(technologiesNeeded) ? technologiesNeeded.join(', ') : 'Not specified'}
- Warnings/Notes: ${Array.isArray(warnings) && warnings.length > 0 ? warnings.join('; ') : 'None'}

IMPORTANT INSTRUCTIONS:
1. Generate realistic, project-specific modules and milestones based on the project type and description above
2. Do NOT use generic placeholders - tailor every detail to this specific project
3. The pricing breakdown should add up to the total cost specified
4. Timeline milestones should be realistic for the estimated duration
5. Use Filipino business context where appropriate

Return this exact JSON structure with all fields populated:
{
  "projectTitle": (string - catchy title for the project),
  "subtitle": (string - brief 1-2 sentence description),
  "investmentSummary": {
    "totalCost": (number - the total project cost),
    "downpayment": (number - 50% for start),
    "finalPayment": (number - 50% upon completion),
    "paymentMethods": "GCash / Maya / Bank Transfer"
  },
  "pricingBreakdown": [
    { "module": (string - name of work module), "price": (number - cost for this module) }
  ],
  "timeline": [
    { "milestone": (string - phase name), "duration": (string - e.g., "3 days" or "1 week") }
  ],
  "scopeOfWork": [
    { "category": (string - category name), "icon": (string - emoji icon), "items": (array of strings - specific deliverables) }
  ],
  "outOfScope": [
    { "category": (string - category name), "items": (array of strings - items not included) }
  ],
  "revisionPolicy": {
    "roundsIncluded": (number - typically 2-3),
    "revisionWindow": (string - e.g., "14 days after delivery"),
    "additionalCost": (string - cost per additional round)
  },
  "bugPolicy": [
    { "type": (string - e.g., "Critical Bugs"), "freePeriod": (string), "afterFree": (string) },
    { "type": (string - e.g., "Minor Bugs"), "freePeriod": (string), "afterFree": (string) }
  ],
  "assumptions": (array of strings - project assumptions),
  "termsAndConditions": (array of strings - key terms)
}`;

    try {
        const proposal = await callAIJson(prompt, { max_tokens: 2048 });
        return proposal;
    } catch (error) {
        console.error('AI proposal generation failed:', error);
        // Return sensible fallback structure
        return {
            projectTitle: `${businessName || 'Project'} - Web Development`,
            subtitle: scopeSummary || 'Custom web solution for your business',
            investmentSummary: {
                totalCost: suggestedPrice || 15000,
                downpayment: downpayment || 7500,
                finalPayment: finalPayment || 7500,
                paymentMethods: 'GCash / Maya / Bank Transfer'
            },
            pricingBreakdown: [
                { module: 'Design & Development', price: Math.round((suggestedPrice || 15000) * 0.5) },
                { module: 'Testing & QA', price: Math.round((suggestedPrice || 15000) * 0.2) },
                { module: 'Deployment & Training', price: Math.round((suggestedPrice || 15000) * 0.2) },
                { module: 'Project Management', price: Math.round((suggestedPrice || 15000) * 0.1) }
            ],
            timeline: [
                { milestone: 'Discovery & Planning', duration: '3-5 days' },
                { milestone: 'Design Phase', duration: '5-7 days' },
                { milestone: 'Development', duration: `${estimatedDays || 14} days` },
                { milestone: 'Testing & Revisions', duration: '5-7 days' },
                { milestone: 'Launch & Handover', duration: '2-3 days' }
            ],
            scopeOfWork: [
                { category: 'Frontend Development', icon: '🎨', items: ['Responsive website design', 'UI/UX implementation', 'Interactive elements'] },
                { category: 'Backend Development', icon: '⚙️', items: ['Database setup', 'API integration', 'User authentication'] },
                { category: 'Testing & QA', icon: '🔍', items: ['Cross-browser testing', 'Mobile responsiveness check', 'Performance optimization'] }
            ],
            outOfScope: [
                { category: 'Content', items: ['Content writing', 'Photography', 'Logo design'] },
                { category: 'Marketing', items: ['SEO optimization', 'Social media setup', 'Ad campaign management'] }
            ],
            revisionPolicy: {
                roundsIncluded: 2,
                revisionWindow: '14 days after delivery',
                additionalCost: '₱500 per round'
            },
            bugPolicy: [
                { type: 'Critical Bugs', freePeriod: '30 days', afterFree: 'Free fix or ₱1,000/day urgent' },
                { type: 'Minor Bugs', freePeriod: '14 days', afterFree: '₱500 per fix' }
            ],
            assumptions: [
                'Client will provide content and assets within 3 days',
                'Client will provide feedback within 2 business days',
                'Domain and hosting will be provided by client or purchased separately',
                'Project scope remains as defined in the inquiry'
            ],
            termsAndConditions: [
                '50% downpayment required to start work',
                'Final payment due upon project completion before launch',
                'Revisions limited to scope defined in pricing breakdown',
                'Additional features quoted separately',
                'Project timeline may extend if client feedback is delayed'
            ]
        };
    }
}
