/**
 * Analyze discovery form data to generate build framework
 * @param {Object} discoveryData - Client discovery form data
 * @param {Object} projectData - Original project data
 * @returns {Promise<Object>} - Build framework with Kilo Code prompts
 */
export const analyzeDiscovery = async (discoveryData, projectData) => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;

    if (!apiKey) {
        throw new Error('Groq API key not configured. Please set VITE_GROQ_API_KEY in .env');
    }

    const services = projectData.servicesNeeded?.join(', ') || 'Unknown';
    const clientName = projectData.clientName || 'Client';
    const businessName = projectData.businessName || 'Business';

    const prompt = `You are an expert software architect and project manager for a Filipino freelance agency. Analyze this client discovery form and project data to generate a comprehensive build framework. Return JSON only, no other text.

PROJECT INFORMATION:
- Client: ${clientName}
- Business: ${businessName}
- Services: ${services}
- Payment Type: ${projectData.paymentPreference}
- Selected Tier: ${projectData.saasTier || 'N/A'}
- Budget: ${projectData.budgetRange || 'Not specified'}

DISCOVERY FORM DATA:

1. BUSINESS PROCESS:
- Current Process: ${discoveryData.currentProcess || 'Not specified'}
- Tools Used: ${(discoveryData.toolsUsed || []).join(', ') || 'None'}
- Pain Points: ${discoveryData.painPoints || 'Not specified'}

2. WORKFLOW DETAILS:
- Workflow Steps: ${(discoveryData.workflowSteps || []).filter(s => s).join(' -> ') || 'Not specified'}
- Roles & Tasks: ${(discoveryData.roles || []).map(r => `${r.role}: ${r.task}`).join(', ') || 'None'}
- Approval Flow: ${discoveryData.approvalFlowNeeded === 'yes' ? discoveryData.approvalFlowDescription : 'Not needed'}
- Emergency Handling: ${discoveryData.emergencyHandling || 'Not specified'}

3. TECHNICAL REQUIREMENTS:
- User Roles: ${(discoveryData.userRoles || []).join(', ') || 'Not specified'}
- Devices: ${(discoveryData.devicePreferences || []).join(', ') || 'Not specified'}
- Internet: ${discoveryData.internetAvailability || 'Not specified'}
- Data Volume: ${discoveryData.dataVolume || 'Not specified'}

4. FEATURE PRIORITIES:
${Object.entries(discoveryData.featurePriorities || {})
            .map(([feature, priority]) => `- ${feature}: ${priority}`)
            .join('\n') || 'None'}
- Additional Features: ${discoveryData.additionalFeatures || 'None'}

TECHNOLOGY STACK (Required):
- React + TailwindCSS for frontend
- Firebase (Firestore, Auth, Hosting) for backend
- Vercel for deployment

IMPORTANT INSTRUCTIONS:
- Always use modern tech stack: React + Firebase + Vercel
- NEVER suggest PHP, MySQL, WordPress, Laravel
- Generate actionable Kilo Code prompts that a developer can use directly
- Include exact file paths, component names, and Firestore collections in prompts
- Use TailwindCSS classes for styling

Return this exact JSON structure:
{
  "processMapping": {
    "currentProcess": ["Step 1...", "Step 2..."],
    "proposedDigital": ["Step 1...", "Step 2..."],
    "painPoints": ["..."],
    "improvements": ["..."]
  },
  "features": {
    "mustHave": [{ "name": "...", "description": "...", "complexity": "..." }],
    "niceToHave": [{ "name": "...", "description": "...", "complexity": "..." }]
  },
  "firestoreSchema": [
    { "collection": "...", "fields": ["..."], "description": "..." }
  ],
  "userRoles": [
    { "role": "...", "permissions": ["..."], "description": "..." }
  ],
  "buildPhases": [
    { "phase": 1, "name": "...", "tasks": ["..."], "estimatedDays": 5 }
  ],
  "kiloCodePrompts": [
    { "phase": 1, "step": 1, "title": "...", "prompt": "..." }
  ]
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
        throw new Error(`AI analysis failed: ${error.message}`);
    }
};

/**
 * Generate suggested features based on project services
 * @param {Array} services - List of services needed
 * @param {Object} aiAssessment - Previous AI assessment
 * @returns {Array} - List of suggested features
 */
export const getSuggestedFeatures = (services, aiAssessment) => {
    const featureMap = {
        'Website / Landing Page': [
            { id: 'homepage', name: 'Homepage with hero section', complexity: 'low' },
            { id: 'about', name: 'About Us page', complexity: 'low' },
            { id: 'services', name: 'Services/Pricing page', complexity: 'low' },
            { id: 'contact', name: 'Contact form', complexity: 'low' },
            { id: 'blog', name: 'Blog/News section', complexity: 'medium' },
            { id: 'gallery', name: 'Portfolio/Gallery', complexity: 'medium' },
            { id: 'faq', name: 'FAQ section', complexity: 'low' },
            { id: 'testimonials', name: 'Testimonials', complexity: 'low' },
        ],
        'Inventory System': [
            { id: 'dashboard', name: 'Dashboard with metrics', complexity: 'medium' },
            { id: 'products', name: 'Product management (CRUD)', complexity: 'medium' },
            { id: 'stock', name: 'Stock tracking', complexity: 'medium' },
            { id: 'suppliers', name: 'Supplier management', complexity: 'medium' },
            { id: 'orders', name: 'Purchase orders', complexity: 'high' },
            { id: 'alerts', name: 'Low stock alerts', complexity: 'medium' },
            { id: 'reports', name: 'Reports & analytics', complexity: 'high' },
            { id: 'barcode', name: 'Barcode scanning', complexity: 'high' },
        ],
        'Appointment Booking': [
            { id: 'calendar', name: 'Interactive calendar', complexity: 'high' },
            { id: 'booking', name: 'Online booking widget', complexity: 'high' },
            { id: 'slots', name: 'Time slot management', complexity: 'medium' },
            { id: 'reminders', name: 'SMS/Email reminders', complexity: 'medium' },
            { id: 'staff', name: 'Staff scheduling', complexity: 'high' },
            { id: 'cancellation', name: 'Cancellation policy', complexity: 'medium' },
            { id: 'reviews', name: 'Customer reviews', complexity: 'medium' },
            { id: 'packages', name: 'Service packages', complexity: 'medium' },
        ],
        'Payroll / HR System': [
            { id: 'employees', name: 'Employee database', complexity: 'medium' },
            { id: 'attendance', name: 'Attendance tracking', complexity: 'high' },
            { id: 'payroll', name: 'Payroll calculation', complexity: 'high' },
            { id: 'deductions', name: 'Benefits & deductions', complexity: 'high' },
            { id: 'leave', name: 'Leave management', complexity: 'medium' },
            { id: 'performance', name: 'Performance reviews', complexity: 'high' },
            { id: 'contracts', name: 'Contract management', complexity: 'medium' },
            { id: 'reports', name: 'HR reports', complexity: 'high' },
        ],
        'POS System': [
            { id: 'pos', name: 'POS interface', complexity: 'high' },
            { id: 'products', name: 'Product catalog', complexity: 'medium' },
            { id: 'cart', name: 'Cart management', complexity: 'medium' },
            { id: 'payments', name: 'Payment processing', complexity: 'high' },
            { id: 'receipts', name: 'Receipt generation', complexity: 'medium' },
            { id: 'inventory', name: 'Inventory sync', complexity: 'high' },
            { id: 'reports', name: 'Sales reports', complexity: 'high' },
            { id: 'loyalty', name: 'Customer loyalty', complexity: 'high' },
        ],
        'Paper to Digital Forms': [
            { id: 'forms', name: 'Digital form builder', complexity: 'high' },
            { id: 'submissions', name: 'Form submissions', complexity: 'medium' },
            { id: 'validation', name: 'Data validation', complexity: 'medium' },
            { id: 'approval', name: 'Approval workflow', complexity: 'high' },
            { id: 'export', name: 'Data export', complexity: 'medium' },
            { id: 'templates', name: 'Form templates', complexity: 'medium' },
            { id: 'signatures', name: 'E-signatures', complexity: 'high' },
            { id: 'notifications', name: 'Form notifications', complexity: 'medium' },
        ],
    };

    let features = [];
    services.forEach(service => {
        if (featureMap[service]) {
            features = [...features, ...featureMap[service]];
        }
    });

    // Deduplicate by id
    const unique = [];
    const seen = new Set();
    features.forEach(f => {
        if (!seen.has(f.id)) {
            seen.add(f.id);
            unique.push(f);
        }
    });

    return unique;
};