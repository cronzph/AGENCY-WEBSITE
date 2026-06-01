import { db } from '../firebase/config';
import { collection, getDocs, doc, getDoc, query, orderBy } from 'firebase/firestore';

// Static imports for fallback/seed images
import ecommerceImg from '../assets/templates/ecommerce.png';
import posImg from '../assets/templates/pos.png';
import landingImg from '../assets/templates/landing.png';
import coffeeshopImg from '../assets/templates/coffeeshop.png';

// Map of template IDs to their bundled image assets
// This ensures images always resolve correctly regardless of environment
const templateImageMap = {
  'e-commerce': ecommerceImg,
  'pos': posImg,
  'landing': landingImg,
  'coffee-shop': coffeeshopImg,
};

/**
 * Resolve the image for a template — always use bundled assets for known IDs,
 * fall back to whatever is stored (URL string) for custom templates.
 */
const resolveTemplateImage = (template) => {
  // If we have a bundled asset for this template ID, always use it
  if (templateImageMap[template.id]) {
    return templateImageMap[template.id];
  }
  // Otherwise use whatever is stored (could be a URL for custom templates)
  return template.image || '';
};

// ── Static seed data (used for seeding Firestore + local fallback) ──
export const staticTemplates = [
  {
    id: 'e-commerce',
    name: 'E-Commerce Store',
    category: 'E-commerce',
    tagline: 'Full-featured online store with admin dashboard',
    description:
      'Complete e-commerce solution with product management, shopping cart, checkout flow, order tracking, customer inquiries, and a powerful admin panel. Ready to launch your online business in days, not months.',
    image: ecommerceImg,
    techStack: ['React', 'Node.js', 'Prisma', 'PostgreSQL'],
    setupTime: '1–3 days',
    price: '₱8,000 – ₱15,000',
    priceNote: 'One-time setup fee',
    color: '#8b5cf6', // purple
    demoUrl: null, // Coming soon — deploy and set the URL here
    demoCredentials: null,
    features: [
      'Product catalog with categories & search',
      'Shopping cart & checkout flow',
      'Order management & tracking',
      'Customer inquiry system',
      'Admin dashboard with analytics',
      'Responsive mobile-first design',
      'Product image gallery',
      'Inventory management',
    ],
    includes: [
      'Admin Dashboard',
      'Product Management',
      'Order System',
      'Customer Inquiries',
      'Responsive Design',
      'Database Setup',
      'Deployment & Hosting Config',
    ],
    idealFor: [
      'Online retail stores',
      'Small businesses going digital',
      'Dropshipping businesses',
      'Boutique & specialty shops',
    ],
    setupSteps: [
      { step: 1, title: 'Pay Setup Fee', desc: 'Settle the one-time setup fee via GCash, Maya, or bank transfer' },
      { step: 2, title: 'We Configure', desc: 'We set up your store, add your products, customize branding & deploy' },
      { step: 3, title: 'Go Live!', desc: 'Your store is live and ready to accept orders' },
    ],
    sortOrder: 0,
    active: true,
  },
  {
    id: 'pos',
    name: 'POS System',
    category: 'POS',
    tagline: 'Point of sale system for retail & restaurants',
    description:
      'Modern point-of-sale system with order management, menu/product catalog, real-time sales tracking, receipt printing, and multi-user support. Perfect for restaurants, retail shops, and service businesses.',
    image: posImg,
    techStack: ['React', 'Firebase', 'TailwindCSS'],
    setupTime: '2–4 days',
    price: '₱10,000 – ₱18,000',
    priceNote: 'One-time setup fee',
    color: '#f59e0b', // amber
    demoUrl: 'https://cph-pos-demo.vercel.app',
    demoCredentials: { email: 'admin@demo.com', password: 'demo1234' },
    features: [
      'Order creation & management',
      'Menu / product catalog with categories',
      'Real-time sales dashboard',
      'Daily & monthly reports',
      'Multi-user access (cashier, admin)',
      'Receipt generation',
      'Table / queue management',
      'Discount & promo support',
    ],
    includes: [
      'Admin Dashboard',
      'Cashier Interface',
      'Sales Reports',
      'Product/Menu Management',
      'User Roles',
      'Responsive Design',
      'Deployment & Hosting Config',
    ],
    idealFor: [
      'Restaurants & cafés',
      'Retail shops',
      'Food stalls & kiosks',
      'Service businesses',
    ],
    setupSteps: [
      { step: 1, title: 'Pay Setup Fee', desc: 'Settle the one-time setup fee via GCash, Maya, or bank transfer' },
      { step: 2, title: 'We Configure', desc: 'We load your menu/products, set up users, customize branding & deploy' },
      { step: 3, title: 'Go Live!', desc: 'Start taking orders and tracking sales immediately' },
    ],
    sortOrder: 1,
    active: true,
  },
  {
    id: 'landing',
    name: 'Business Landing Page',
    category: 'Landing Page',
    tagline: 'Professional landing page for any business',
    description:
      'Beautiful, conversion-optimized landing page with hero section, services showcase, testimonials, contact form, and SEO optimization. Launch your online presence in a single day.',
    image: landingImg,
    techStack: ['React', 'TailwindCSS', 'Firebase'],
    setupTime: '1 day',
    price: '₱3,500 – ₱6,000',
    priceNote: 'One-time setup fee',
    color: '#06b6d4', // cyan
    demoUrl: 'https://system-templates.vercel.app',
    demoCredentials: null,
    features: [
      'Hero section with CTA',
      'Services / features showcase',
      'About section',
      'Testimonials / reviews',
      'Contact form with email notification',
      'SEO optimized',
      'Mobile responsive',
      'Fast loading performance',
    ],
    includes: [
      'Custom Branding',
      'Contact Form',
      'SEO Setup',
      'Responsive Design',
      'Google Analytics',
      'Deployment & Hosting Config',
    ],
    idealFor: [
      'New businesses',
      'Freelancers & consultants',
      'Service providers',
      'Portfolio sites',
    ],
    setupSteps: [
      { step: 1, title: 'Pay Setup Fee', desc: 'Settle the one-time setup fee via GCash, Maya, or bank transfer' },
      { step: 2, title: 'We Customize', desc: 'We update your content, branding, images & deploy' },
      { step: 3, title: 'Go Live!', desc: 'Your professional website is live and ready' },
    ],
    sortOrder: 2,
    active: true,
  },
  {
    id: 'coffee-shop',
    name: 'Coffee Shop System',
    category: 'Coffee Shop',
    tagline: 'Online ordering system for cafés & food businesses',
    description:
      'Complete café management system with online ordering, menu management, order queue, customer accounts, and admin analytics. Let your customers order ahead and skip the line.',
    image: coffeeshopImg,
    techStack: ['React', 'Firebase', 'TailwindCSS'],
    setupTime: '2–3 days',
    price: '₱5,000 – ₱10,000',
    priceNote: 'One-time setup fee',
    color: '#d97706', // warm amber/brown
    demoUrl: 'https://cph-coffee-shop-demo.vercel.app',
    demoCredentials: { email: 'admin@demo.com', password: 'demo1234' },
    features: [
      'Online menu with customization options',
      'Order-ahead & pickup system',
      'Real-time order queue',
      'Customer accounts & order history',
      'Admin dashboard & analytics',
      'Menu management (add/edit/disable items)',
      'Promo & discount system',
      'Mobile-first responsive design',
    ],
    includes: [
      'Admin Dashboard',
      'Online Ordering',
      'Menu Management',
      'Order Queue',
      'Customer Accounts',
      'Responsive Design',
      'Deployment & Hosting Config',
    ],
    idealFor: [
      'Coffee shops & cafés',
      'Milk tea shops',
      'Bakeries',
      'Food delivery businesses',
    ],
    setupSteps: [
      { step: 1, title: 'Pay Setup Fee', desc: 'Settle the one-time setup fee via GCash, Maya, or bank transfer' },
      { step: 2, title: 'We Configure', desc: 'We load your menu, customize branding, set up orders & deploy' },
      { step: 3, title: 'Go Live!', desc: 'Customers can start ordering online right away' },
    ],
    sortOrder: 3,
    active: true,
  },
];

// ── Firestore-based functions ──

/**
 * Fetch all active templates from Firestore.
 * Falls back to static data if Firestore is empty or errors.
 */
export const fetchTemplates = async () => {
  try {
    const q = query(collection(db, 'templates'), orderBy('sortOrder', 'asc'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      // Fallback to static data
      return staticTemplates.filter(t => t.active !== false);
    }
    return snapshot.docs
      .map(d => {
        const t = { id: d.id, ...d.data() };
        return { ...t, image: resolveTemplateImage(t) };
      })
      .filter(t => t.active !== false);
  } catch (err) {
    console.error('Error fetching templates from Firestore:', err);
    return staticTemplates.filter(t => t.active !== false);
  }
};

/**
 * Fetch all templates (including inactive) for admin.
 */
export const fetchAllTemplates = async () => {
  try {
    const q = query(collection(db, 'templates'), orderBy('sortOrder', 'asc'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return staticTemplates;
    return snapshot.docs.map(d => {
      const t = { id: d.id, ...d.data() };
      return { ...t, image: resolveTemplateImage(t) };
    });
  } catch (err) {
    console.error('Error fetching templates:', err);
    return staticTemplates;
  }
};

/**
 * Fetch a single template by ID from Firestore.
 * Falls back to static data.
 */
export const fetchTemplateById = async (id) => {
  try {
    const docRef = doc(db, 'templates', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const t = { id: docSnap.id, ...docSnap.data() };
      return { ...t, image: resolveTemplateImage(t) };
    }
    // Fallback to static
    return staticTemplates.find(t => t.id === id) || null;
  } catch (err) {
    console.error('Error fetching template:', err);
    return staticTemplates.find(t => t.id === id) || null;
  }
};

/**
 * Get unique categories from a templates array.
 */
export const getTemplateCategoriesFromList = (templatesList) => {
  const cats = [...new Set(templatesList.map(t => t.category))];
  return ['All', ...cats];
};

// ── Legacy exports for backward compatibility ──
export const templates = staticTemplates;
export const getTemplateById = (id) => staticTemplates.find((t) => t.id === id);
export const getTemplateCategories = () => {
  const cats = [...new Set(staticTemplates.map((t) => t.category))];
  return ['All', ...cats];
};
