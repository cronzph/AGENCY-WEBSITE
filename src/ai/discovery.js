/**
 * Analyze discovery form data to generate build framework
 * Uses shared callAI utility with automatic provider fallback
 * @param {Object} discoveryData - Client discovery form data
 * @param {Object} projectData - Original project data
 * @returns {Promise<Object>} - Build framework with Kilo Code prompts
 */
import { callAIJson } from './callAI';

export const analyzeDiscovery = async (discoveryData, projectData) => {
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
        return await callAIJson(prompt, { max_tokens: 4096 });
    } catch (error) {
        console.error('AI analysis failed:', error);
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
            { id: 'contact', name: 'Contact form', complexity: 'low' },
            { id: 'services', name: 'Services page', complexity: 'low' },
        ],
        'Client Portal': [
            { id: 'dashboard', name: 'Client dashboard', complexity: 'medium' },
            { id: 'project-view', name: 'Project progress view', complexity: 'medium' },
            { id: 'file-upload', name: 'File upload/download', complexity: 'medium' },
            { id: 'messaging', name: 'Client messaging', complexity: 'medium' },
        ],
        'Booking System': [
            { id: 'calendar', name: 'Interactive calendar', complexity: 'high' },
            { id: 'slots', name: 'Available time slots', complexity: 'medium' },
            { id: 'confirmation', name: 'Booking confirmation', complexity: 'medium' },
            { id: 'reminders', name: 'Email/SMS reminders', complexity: 'medium' },
        ],
        'Inventory System': [
            { id: 'products', name: 'Product catalog', complexity: 'medium' },
            { id: 'stock', name: 'Stock management', complexity: 'high' },
            { id: 'orders', name: 'Order processing', complexity: 'high' },
            { id: 'reports', name: 'Sales reports', complexity: 'medium' },
        ],
    };

    let features = [];
    services.forEach(service => {
        if (featureMap[service]) {
            features = [...features, ...featureMap[service]];
        }
    });

    return features;
};
