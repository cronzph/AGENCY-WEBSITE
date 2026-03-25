/**
 * Assess a client inquiry using AI with automatic provider fallback
 * @param {Object} inquiryData - Client inquiry data
 * @returns {Promise<Object>} - Assessment results
 */
import { callAIJson } from './callAI';

export const assessInquiry = async (inquiryData) => {
  const prompt = `You are an expert web developer and business analyst for a Filipino freelance agency. Analyze this client inquiry and return a JSON response only, no other text.

Client Inquiry:
Business Type: ${inquiryData.businessType}
Services Needed: ${inquiryData.servicesNeeded.join(', ')}
Project Description: ${inquiryData.projectDescription}
Timeline: ${inquiryData.preferredTimeline}
Payment Preference: ${inquiryData.paymentPreference}
Monthly Revenue: ${inquiryData.monthlyRevenue}
Client Budget: ${inquiryData.budgetRange}
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

IMPORTANT:
- Base the suggestedPrice on the client's budget range. Never suggest a price higher than their maximum budget.
- If budget is 'Not sure yet', use the monthly revenue as basis for pricing instead.
- Never recommend: PHP, MySQL, WordPress, Laravel, or any server-side languages
- Always recommend modern, easy-to-deploy tech stack using React + Firebase + Vercel only unless the project specifically requires something else
- Follow these pricing ranges strictly. Do not suggest prices outside these ranges.

Return this exact JSON structure:
{
  projectType: (string - main category of project),
  complexity: (string - simple/medium/complex),
  estimatedDays: (number - realistic working days),
  suggestedPrice: (number - in Philippine Peso, MUST follow pricing guidelines above),
  downpayment: (number - 50% of suggestedPrice),
  finalPayment: (number - 50% of suggestedPrice),
  recommendedSaasTier: (string - starter/growth/business/enterprise or null if build-only),
  monthlySaasPrice: (number - monthly fee or 0 if build-only),
  scopeSummary: (string - 2-3 sentence summary of project scope),
  technologiesNeeded: (array of strings - MUST use React + Firebase + Vercel stack only),
  warnings: (array of strings - any concerns or clarifications needed)
}`;

  try {
    return await callAIJson(prompt, { max_tokens: 1024 });
  } catch (error) {
    console.error('AI assessment failed:', error);
    throw new Error(`AI assessment failed: ${error.message}`);
  }
};
