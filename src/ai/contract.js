/**
 * Generate a formal contract from project data
 * @param {Object} projectData - Project data from Firestore
 * @returns {Promise<Object>} - Formal contract object
 */
export const generateContract = async (projectData) => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;

    if (!apiKey) {
        throw new Error('Groq API key not configured. Please set VITE_GROQ_API_KEY in .env');
    }

    const clientName = projectData.clientName || 'Client';
    const businessName = projectData.businessName || 'Business';
    const email = projectData.email || 'N/A';
    const phone = projectData.phone || 'N/A';
    const services = projectData.servicesNeeded?.join(', ') || 'Not specified';
    const price = projectData.aiAssessment?.suggestedPrice || projectData.budgetRange || 'Not specified';
    const projectType = projectData.aiAssessment?.projectType || 'Custom Software Development';
    const timeline = projectData.aiAssessment?.estimatedDays || 'To be determined';
    const tier = projectData.saasTier || 'None';

    const tierPricing = {
        starter: '₱2,000-₱3,500/month',
        growth: '₱5,000-₱8,000/month',
        business: '₱15,000-₱25,000/month',
        enterprise: '₱30,000-₱50,000/month',
    };

    const prompt = `You are a legal document writer specializing in software development contracts for a Filipino freelance agency. Generate a formal, professional contract based on the project details below. Return JSON only, no other text.

PROJECT DETAILS:
- Developer: CronzPH (Filipino freelance agency)
- Client Name: ${clientName}
- Business Name: ${businessName}
- Client Email: ${email}
- Client Phone: ${phone}
- Services Requested: ${services}
- Project Type: ${projectType}
- Total Price: ₱${typeof price === 'number' ? price.toLocaleString() : price}
- Estimated Timeline: ${timeline} working days
- SaaS Tier: ${tier !== 'None' ? tierPricing[tier] || tier : 'None'}

IMPORTANT:
- Write in formal, legal-sounding language appropriate for a Philippine context
- Include specific terms for software development projects
- Use professional formatting with numbered sections
- Keep it comprehensive but not overly long (8-12 key sections)
- Include all pricing details provided

Return this exact JSON structure:
{
  "contractTitle": "Software Development Agreement",
  "contractId": "Generate a unique contract ID like CONTRACT-YYYYMMDD-XXXX",
  "date": "Current date in Philippines format (e.g., March 24, 2026)",
  "parties": {
    "developer": {
      "name": "CronzPH",
      "address": "Philippines",
      "contact": "Via Facebook or Email"
    },
    "client": {
      "name": "${clientName}",
      "business": "${businessName}",
      "email": "${email}",
      "phone": "${phone}"
    }
  },
  "scopeOfWork": "Detailed description of the project and services to be provided",
  "deliverables": ["Deliverable 1", "Deliverable 2", "Deliverable 3"],
  "timeline": "Specific timeline in working days after payment confirmation",
  "paymentTerms": {
    "totalAmount": "₱XXX,XXX",
    "downpayment": "50% (₱XXX,XXX) due upon signing",
    "finalPayment": "50% (₱XXX,XXX) due upon completion",
    "paymentMethods": "GCash, Maya, or Bank Transfer"
  },
  "saasSubscription": "Monthly maintenance details if applicable",
  "perIssuePricing": "Pricing for bug fixes after 30-day warranty",
  "revisionPolicy": "2 rounds of revisions included, additional charged at hourly rate",
  "warranty": "30-day bug fix warranty after delivery",
  "intellectualProperty": "Client owns all deliverables upon full payment",
  "termination": "Either party may terminate with 7-day written notice, downpayment non-refundable",
  "disputeResolution": "Governed by Philippine laws",
  "generalTerms": ["Term 1", "Term 2", "Term 3"],
  "fullText": "Complete contract text formatted as a formal legal document with all sections"
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
                max_tokens: 4096,
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
            throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
        }

        const data = await response.json();

        if (!data.choices || !data.choices[0]) {
            throw new Error('Invalid response from Groq API');
        }

        const content = data.choices[0].message.content;

        // Parse the JSON response
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            return JSON.parse(jsonMatch[0]);
        } catch (parseError) {
            console.error('Failed to parse AI response:', parseError);
            throw new Error('Failed to parse AI response as JSON');
        }
    } catch (error) {
        console.error('Groq API Error:', error);
        throw new Error(`Contract generation failed: ${error.message}`);
    }
};