/**
 * Assess a client inquiry using AI with automatic provider fallback
 * Acts as a Project Manager — knows every detail, ensures completeness,
 * and notes anything unclear or missing.
 * @param {Object} inquiryData - Client inquiry data
 * @returns {Promise<Object>} - Assessment results
 */
import { callAIJson } from './callAI';

export const assessInquiry = async (inquiryData) => {
  const prompt = `You are a SENIOR PROJECT MANAGER for a Filipino freelance web development agency. You know EVERY detail about project management, development workflows, and client requirements.

YOUR ROLE:
- Analyze every detail of the client inquiry thoroughly
- Identify ANY unclear, vague, or missing information
- Note potential risks, scope creep, and red flags
- Ensure the project scope is COMPLETE and CLEAR
- If something is unclear or incomplete, you MUST note it in the "unclearItems" array
- If the project description is too vague, flag it
- If requirements conflict with budget/timeline, flag it

Client Inquiry:
Business Type: ${inquiryData.businessType || 'Not specified'}
Services Needed: ${(inquiryData.servicesNeeded || []).join(', ') || 'Not specified'}
Project Description: ${inquiryData.projectDescription || 'Not provided'}
Timeline: ${inquiryData.preferredTimeline || 'Not specified'}
Payment Preference: ${inquiryData.paymentPreference || 'Not specified'}
Monthly Revenue: ${inquiryData.monthlyRevenue || 'Not disclosed'}
Client Budget: ${inquiryData.budgetRange || 'Not specified'}
Selected SaaS Tier: ${inquiryData.selectedTier || 'N/A'}

PRICING GUIDELINES (Philippine Market - Small Business):
- Landing Page / Simple Website: ₱3,000 - ₱8,000
- Business Website (5-10 pages): ₱8,000 - ₱15,000
- Inventory System (simple): ₱8,000 - ₱15,000
- Appointment Booking System: ₱8,000 - ₱20,000
- Paper to Digital Forms: ₱3,000 - ₱8,000
- Payroll / HR System (simple): ₱15,000 - ₱35,000
- POS System: ₱15,000 - ₱40,000
- Custom Automation: ₱10,000 - ₱30,000

COMPLEXITY MULTIPLIERS:
- simple: use minimum of range
- medium: use middle of range
- complex: use maximum of range

REVENUE-BASED ADJUSTMENT:
- Below ₱50,000 monthly: use minimum prices
- ₱50,000 - ₱200,000: use middle prices
- ₱200,000 - ₱500,000: use upper middle prices
- ₱500,000+: use maximum prices

BUDGET-BASED PRICING:
- Below ₱5,000: Suggest minimum prices from range
- ₱5,000 - ₱15,000: Suggest ₱5,000 - ₱15,000
- ₱15,000 - ₱30,000: Suggest ₱15,000 - ₱30,000
- ₱30,000 - ₱50,000: Suggest ₱30,000 - ₱50,000
- ₱50,000 - ₱100,000: Suggest ₱50,000 - ₱100,000
- ₱100,000+: Suggest based on revenue tier
- Not sure yet: Use monthly revenue as basis for pricing

IMPORTANT RULES:
- Base the suggestedPrice on the client's budget range. Never suggest a price higher than their maximum budget.
- If budget is 'Not sure yet', use the monthly revenue as basis for pricing instead.
- Never recommend: PHP, MySQL, WordPress, Laravel, or any server-side languages
- Always recommend modern, easy-to-deploy tech stack using React + Firebase + Vercel only
- Follow these pricing ranges strictly. Do not suggest prices outside these ranges.
- You MUST identify unclear items — if the description is vague, if features are not well-defined, if there are potential misunderstandings
- Be thorough like a real project manager who needs to deliver a complete project

Return this exact JSON structure:
{
  "projectType": (string - main category of project),
  "complexity": (string - simple/medium/complex),
  "estimatedDays": (number - realistic working days),
  "suggestedPrice": (number - in Philippine Peso, MUST follow pricing guidelines above),
  "downpayment": (number - 50% of suggestedPrice),
  "finalPayment": (number - 50% of suggestedPrice),
  "recommendedSaasTier": (string - starter/growth/business/enterprise or null if build-only),
  "monthlySaasPrice": (number - monthly fee or 0 if build-only),
  "scopeSummary": (string - detailed 3-5 sentence summary of project scope, be specific about what will be built),
  "technologiesNeeded": (array of strings - MUST use React + Firebase + Vercel stack only),
  "warnings": (array of strings - any concerns, risks, or red flags),
  "unclearItems": (array of strings - things that need clarification from the client before proceeding. e.g. "Client did not specify how many product categories needed", "No mention of user roles/permissions", "Payment gateway preference not specified"),
  "requiredClarifications": (array of strings - questions that MUST be answered before the project can start),
  "projectCompleteness": (number 1-100 - how complete/clear is the project requirement? 100 = perfectly clear, below 70 = needs more info)
}`;

  try {
    return await callAIJson(prompt, { max_tokens: 2048 });
  } catch (error) {
    console.error('AI assessment failed:', error);
    throw new Error(`AI assessment failed: ${error.message}`);
  }
};
