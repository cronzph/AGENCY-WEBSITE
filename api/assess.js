export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { businessType, servicesNeeded, projectDescription, preferredTimeline, paymentPreference, monthlyRevenue, budgetRange } = req.body;

  const apiKey = process.env.VITE_GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Groq API key not configured' });
  }

  const prompt = `You are an expert web developer and business analyst for a Filipino freelance agency. Analyze this client inquiry and return a JSON response only, no other text.

Client Inquiry:
Business Type: ${businessType}
Services Needed: ${servicesNeeded.join(', ')}
Project Description: ${projectDescription}
Timeline: ${preferredTimeline}
Payment Preference: ${paymentPreference}
Monthly Revenue: ${monthlyRevenue}
Client Budget: ${budgetRange}
Selected SaaS Tier: ${selectedTier || 'N/A'}

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
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: errorData.error?.message || 'API request failed' });
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      return res.status(500).json({ error: 'Invalid response from Groq API' });
    }

    const content = data.choices[0].message.content;

    // Parse the JSON response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return res.status(500).json({ error: 'No JSON found in response' });
      }
      const assessment = JSON.parse(jsonMatch[0]);
      return res.status(200).json(assessment);
    } catch (parseError) {
      return res.status(500).json({ error: 'Failed to parse AI response as JSON' });
    }
  } catch (error) {
    console.error('Groq API Error:', error);
    return res.status(500).json({ error: `AI assessment failed: ${error.message}` });
  }
}
