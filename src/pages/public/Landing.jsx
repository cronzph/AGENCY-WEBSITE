import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';

const Landing = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedRevenue, setSelectedRevenue] = useState(null);
  const [recommendedTier, setRecommendedTier] = useState(null);
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [portfolioFilter, setPortfolioFilter] = useState('All');

  const tierData = {
    'below-50k': {
      icon: '🌱',
      name: 'Starter',
      price: '₱2,000-₱3,500/mo',
      features: [
        'Hosting & uptime',
        'Critical bug fixes',
        '1 minor update/month',
        'FB support (48hr)'
      ]
    },
    '50k-200k': {
      icon: '🚀',
      name: 'Growth',
      price: '₱5,000-₱8,000/mo',
      features: [
        'Everything in Starter',
        '3 minor updates/month',
        '1 major update/quarter',
        '24hr support',
        'Monthly analytics'
      ]
    },
    '200k-500k': {
      icon: '💼',
      name: 'Business',
      price: '₱15,000-₱25,000/mo',
      features: [
        'Everything in Growth',
        'Unlimited minor updates',
        '2 major updates/month',
        '12hr priority support',
        'AI features',
        '1 new feature/month'
      ]
    },
    '500k-plus': {
      icon: '🏢',
      name: 'Enterprise',
      price: '₱30,000-₱50,000/mo',
      features: [
        'Everything in Business',
        'Unlimited major updates',
        '7-day support',
        'Weekly reports',
        'Features on request',
        'DB backup'
      ]
    }
  };

  const handleRevenueSelect = (value) => {
    setSelectedRevenue(value);
    setRecommendedTier(tierData[value]);
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch portfolio items and testimonials from Firestore
  useEffect(() => {
    const fetchPortfolioAndTestimonials = async () => {
      try {
        // Fetch featured portfolio items
        const portfolioQuery = query(collection(db, 'portfolio'), where('featured', '==', true));
        const portfolioSnap = await getDocs(portfolioQuery);
        setPortfolioItems(portfolioSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch approved testimonials
        const ratingsQuery = query(collection(db, 'ratings'), where('showOnLanding', '==', true));
        const ratingsSnap = await getDocs(ratingsQuery);
        setTestimonials(ratingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error('Error fetching portfolio/testimonials:', err);
      }
    };
    fetchPortfolioAndTestimonials();
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  const services = [
    { icon: '🌐', title: 'Website / Landing Page', desc: 'Professional websites that convert visitors into customers' },
    { icon: '📦', title: 'Inventory System', desc: 'Track stock, manage suppliers, and automate reordering' },
    { icon: '📅', title: 'Appointment Booking', desc: 'Online scheduling for salons, clinics, and consultants' },
    { icon: '📋', title: 'Paper to Digital Forms', desc: 'Convert paper processes into efficient digital workflows' },
    { icon: '💰', title: 'Payroll / HR System', desc: 'Automated payroll processing and employee management' },
    { icon: '🏪', title: 'POS System', desc: 'Point of sale for retail and restaurant businesses' },
    { icon: '⚙️', title: 'Custom Automation', desc: 'Streamline your business processes with custom solutions' },
    { icon: '📊', title: 'Business Dashboard', desc: 'Real-time analytics and insights for smarter decisions' },
  ];

  const pricingTiers = [
    {
      icon: '🌱',
      name: 'Starter',
      price: '₱2,000-₱3,500/mo',
      features: [
        'Hosting & uptime',
        'Critical bug fixes',
        '1 minor update/month',
        'FB support (48hr)'
      ]
    },
    {
      icon: '🚀',
      name: 'Growth',
      price: '₱5,000-₱8,000/mo',
      features: [
        'Everything in Starter',
        '3 minor updates/month',
        '1 major update/quarter',
        '24hr support',
        'Monthly analytics'
      ],
      recommended: true
    },
    {
      icon: '💼',
      name: 'Business',
      price: '₱15,000-₱25,000/mo',
      features: [
        'Everything in Growth',
        'Unlimited minor updates',
        '2 major updates/month',
        '12hr priority support',
        'AI features',
        '1 new feature/month'
      ]
    },
    {
      icon: '🏢',
      name: 'Enterprise',
      price: '₱30,000-₱50,000/mo',
      features: [
        'Everything in Business',
        'Unlimited major updates',
        '7-day support',
        'Weekly reports',
        'Features on request',
        'DB backup'
      ]
    },
  ];

  const whyUs = [
    { icon: '⚡', title: 'Fast Delivery', desc: 'Get your project delivered in weeks, not months' },
    { icon: '💰', title: 'Budget-Friendly', desc: 'Transparent pricing that fits your business needs' },
    { icon: '🇵🇭', title: 'Filipino-Focused', desc: 'We understand local businesses and markets' },
    { icon: '🤖', title: 'AI-Powered', desc: 'Smart solutions that learn and adapt to your business' },
    { icon: '🔒', title: 'Secure & Reliable', desc: 'Enterprise-grade security for your peace of mind' },
    { icon: '📱', title: 'Mobile Responsive', desc: 'Works perfectly on all devices' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar - Full Width */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-gray-900/95 backdrop-blur-sm shadow-lg' : 'bg-transparent'}`}>
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="text-2xl font-bold text-white">
              Cronz<span className="text-blue-400">PH</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection('services')} className="text-gray-300 hover:text-white transition-colors">Services</button>
              <button onClick={() => scrollToSection('pricing')} className="text-gray-300 hover:text-white transition-colors">Pricing</button>
              <button onClick={() => scrollToSection('students')} className="text-gray-300 hover:text-white transition-colors">Students</button>
              <button onClick={() => scrollToSection('quick-fix')} className="text-gray-300 hover:text-white transition-colors">Quick Fix</button>
              <button onClick={() => scrollToSection('why-us')} className="text-gray-300 hover:text-white transition-colors">Why Us</button>
              <button onClick={() => scrollToSection('portfolio')} className="text-gray-300 hover:text-white transition-colors">Portfolio</button>
              <Link to="/inquiry" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors">
                Get Started
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-gray-800 border-t border-gray-700">
            <div className="px-4 py-4 space-y-3">
              <button onClick={() => scrollToSection('services')} className="block w-full text-left text-gray-300 hover:text-white py-2">Services</button>
              <button onClick={() => scrollToSection('pricing')} className="block w-full text-left text-gray-300 hover:text-white py-2">Pricing</button>
              <button onClick={() => scrollToSection('students')} className="block w-full text-left text-gray-300 hover:text-white py-2">Students</button>
              <button onClick={() => scrollToSection('quick-fix')} className="block w-full text-left text-gray-300 hover:text-white py-2">Quick Fix</button>
              <button onClick={() => scrollToSection('why-us')} className="block w-full text-left text-gray-300 hover:text-white py-2">Why Us</button>
              <button onClick={() => scrollToSection('portfolio')} className="block w-full text-left text-gray-300 hover:text-white py-2">Portfolio</button>
              <Link to="/inquiry" className="block w-full text-center px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium">
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section - Full Width */}
      <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900"></div>
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight text-white">
            We Turn Your Business Ideas{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Into Digital Reality
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto">
            From websites to full business systems — we build custom digital solutions for Filipino businesses.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/inquiry" className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-lg transition-all hover:scale-105">
              Start Your Project
            </Link>
            <button onClick={() => scrollToSection('services')} className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold text-lg border border-gray-700 transition-all">
              View Our Work
            </button>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4 text-white">What We Build</h2>
          <p className="text-gray-300 text-center mb-12 max-w-2xl mx-auto">
            Custom digital solutions tailored to your business needs
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, idx) => (
              <div
                key={idx}
                className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-blue-500/50 hover:transform hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className="text-4xl mb-4">{service.icon}</div>
                <h3 className="text-lg font-semibold mb-2 text-white group-hover:text-blue-400 transition-colors">{service.title}</h3>
                <p className="text-gray-400 text-sm">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16 text-white">How It Works</h2>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-0">
            {[
              { step: 1, icon: '📝', title: 'Submit Inquiry', desc: "Tell us about your project via our simple form" },
              { step: 2, icon: '📄', title: 'Get Proposal', desc: 'Receive a detailed proposal with pricing within 24 hours' },
              { step: 3, icon: '💳', title: 'Make Payment', desc: 'Pay via GCash, Maya, or bank transfer' },
              { step: 4, icon: '🚀', title: 'Get Delivered', desc: 'Your project gets built and deployed' },
            ].map((item, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg mb-4">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-lg mb-1 text-white">{item.step}. {item.title}</h3>
                <p className="text-gray-300 text-sm text-center max-w-[200px]">{item.desc}</p>
                {idx < 3 && (
                  <div className="hidden md:block w-24 h-0.5 bg-gradient-to-r from-blue-500 to-transparent mt-8"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4 text-white">Simple, Transparent Pricing</h2>
          <p className="text-gray-300 text-center mb-12">Choose what works best for your business</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {pricingTiers.map((tier, idx) => (
              <div
                key={idx}
                className={`relative bg-gray-800 border rounded-xl p-6 transition-all hover:transform hover:-translate-y-1 ${tier.recommended ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-700'}`}
              >
                {tier.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                    Recommended
                  </div>
                )}
                <div className="text-4xl mb-4">{tier.icon}</div>
                <h3 className="text-xl font-bold mb-1 text-white">{tier.name}</h3>
                <p className="text-2xl font-bold text-blue-400 mb-4">{tier.price}</p>
                <ul className="space-y-2">
                  {tier.features.map((feature, fIdx) => (
                    <li key={fIdx} className="text-gray-300 text-sm flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="text-center text-gray-300">
            Or choose <span className="text-white font-semibold">Build Only</span> — one-time payment, no monthly fees
          </p>
        </div>
      </section>

      {/* Why Choose Us */}
      <section id="why-us" className="py-20 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-white">Why CronzPH?</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {whyUs.map((item, idx) => (
              <div key={idx} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-blue-500/30 transition-colors">
                <div className="text-3xl mb-4">{item.icon}</div>
                <h3 className="text-lg font-semibold mb-2 text-white">{item.title}</h3>
                <p className="text-gray-300">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio Section */}
      <section id="portfolio" className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4 text-white">Our Portfolio</h2>
          <p className="text-gray-300 text-center mb-12 max-w-2xl mx-auto">
            Showcasing our featured projects and client work
          </p>

          {/* Filter Buttons */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            <button
              onClick={() => setPortfolioFilter('all')}
              className={`px-5 py-2 rounded-lg font-medium transition-colors ${portfolioFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
            >
              All
            </button>
            {['Website', 'POS', 'Inventory', 'Mobile App', 'Custom'].map(type => (
              <button
                key={type}
                onClick={() => setPortfolioFilter(type)}
                className={`px-5 py-2 rounded-lg font-medium transition-colors ${portfolioFilter === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Portfolio Grid */}
          {portfolioItems.length === 0 ? (
            <p className="text-center text-gray-400">No portfolio items to display</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {portfolioItems
                .filter(item => portfolioFilter === 'all' || item.projectType === portfolioFilter)
                .map(item => (
                  <div key={item.id} className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden hover:border-blue-500/30 transition-colors group">
                    {item.thumbnail && (
                      <div className="aspect-video bg-gray-700 overflow-hidden">
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium px-2 py-1 bg-blue-600/20 text-blue-400 rounded">
                          {item.projectType}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2 text-white">{item.title}</h3>
                      <p className="text-gray-300 text-sm mb-3">{item.description}</p>
                      {item.techStack && (
                        <p className="text-xs text-gray-400 mb-3">Tech: {item.techStack}</p>
                      )}
                      {item.clientName && (
                        <p className="text-xs text-gray-500 mb-3">Client: {item.clientName}</p>
                      )}
                      {item.liveUrl && (
                        <a
                          href={item.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-400 hover:text-blue-300 text-sm font-medium"
                        >
                          View Project
                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4 text-white">What Our Clients Say</h2>
          <p className="text-gray-300 text-center mb-12 max-w-2xl mx-auto">
            Client ratings and feedback from completed projects
          </p>

          {testimonials.length === 0 ? (
            <p className="text-center text-gray-400">No testimonials to display</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map(testimonial => (
                <div key={testimonial.id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-blue-500/30 transition-colors">
                  <div className="flex items-center mb-3">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-5 h-5 ${i < testimonial.rating ? 'text-yellow-400' : 'text-gray-600'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  {testimonial.feedback && (
                    <p className="text-gray-300 mb-4 italic">"{testimonial.feedback}"</p>
                  )}
                  {testimonial.clientName && (
                    <p className="text-white font-medium">— {testimonial.clientName}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Build Only Section */}
      <section id="build-only" className="py-20 bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4 text-white">Build Only Option</h2>
          <p className="text-gray-300 text-center mb-12 max-w-2xl mx-auto">
            One-time payment for clients who prefer to maintain their systems themselves
          </p>

          <div className="bg-gray-900 border border-gray-700 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-white mb-4">One-Time Payment Model</h3>
            <p className="text-gray-300 mb-6">
              Pay once for development and own the system outright. No monthly fees, no recurring costs.
            </p>

            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Why SaaS is Recommended</h3>
              <ul className="space-y-2 text-gray-300 list-disc pl-5">
                <li>Continuous updates and improvements</li>
                <li>Priority support when issues arise</li>
                <li>Regular security patches and maintenance</li>
                <li>Scalability as your business grows</li>
                <li>Access to new features as they're developed</li>
              </ul>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Per-Issue Pricing (After 30-Day Warranty)</h3>
              <p className="text-gray-400 text-sm mb-4">
                Issues fixed during the 30-day warranty period are FREE. After that:
              </p>
              <table className="w-full text-left text-gray-300">
                <thead>
                  <tr>
                    <th className="p-3 border-b">Bug Type</th>
                    <th className="p-3 border-b">Free Period</th>
                    <th className="p-3 border-b">After 30 Days</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-3 border-t">Minor (cosmetic)</td>
                    <td className="p-3 border-t">30 days ✅</td>
                    <td className="p-3 border-t">FREE always</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-t">Medium (broken feature)</td>
                    <td className="p-3 border-t">30 days ✅</td>
                    <td className="p-3 border-t">₱1,000-₱2,500</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-t">Major (core broken)</td>
                    <td className="p-3 border-t">30 days ✅</td>
                    <td className="p-3 border-t">₱2,500-₱5,000</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-t">Critical (system down)</td>
                    <td className="p-3 border-t">30 days ✅</td>
                    <td className="p-3 border-t">₱5,000+</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>



      {/* Students/Capstone Section */}
      <section id="students" className="py-20 bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4 text-white">Students & Capstone Projects</h2>
          <p className="text-gray-300 text-center mb-12 max-w-2xl mx-auto">
            Special pricing for academic projects and school activities
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {/* Simple Capstone */}
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-3">Simple Capstone</h3>
              <p className="text-gray-300 mb-2">₱3,000-₱8,000</p>
              <p className="text-gray-400 text-sm mb-3">Basic functionality, minimal features</p>
            </div>

            {/* Medium Capstone */}
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-3">Medium Capstone</h3>
              <p className="text-gray-300 mb-2">₱8,000-₱15,000</p>
              <p className="text-gray-400 text-sm mb-3">Standard features, moderate complexity</p>
            </div>

            {/* Complex Capstone */}
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-3">Complex Capstone</h3>
              <p className="text-gray-300 mb-2">₱15,000-₱25,000</p>
              <p className="text-gray-400 text-sm mb-3">Advanced features, high complexity</p>
            </div>

            {/* School Activity System */}
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-3">School Activity System</h3>
              <p className="text-gray-300 mb-2">₱1,500-₱5,000</p>
              <p className="text-gray-400 text-sm mb-3">Event management, attendance tracking, etc.</p>
            </div>
          </div>

          <div className="mt-8 p-6 bg-gray-900 border border-gray-700 rounded-xl">
            <h3 className="text-xl font-bold text-white mb-4">Important Notes</h3>
            <ul className="space-y-2 text-gray-300 list-disc pl-5">
              <li>Rush fees apply: +20% (1-2 weeks), +50% (&lt;1 week), +100% (&lt;3 days)</li>
              <li>Note: NO documentation included in standard packages</li>
              <li>Revisions limited to 3 rounds unless otherwise specified</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Quick Fix Services Section */}
      <section id="quick-fix" className="py-20 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4 text-white">Quick Fix Services</h2>
          <p className="text-gray-300 text-center mb-12 max-w-2xl mx-auto">
            Fast, affordable solutions for common website and system issues
          </p>

          <div className="overflow-x-auto">
            <table className="min-w-full bg-gray-800 border border-gray-700 rounded-xl">
              <thead>
                <tr>
                  <th className="p-4 border-b text-left text-gray-300">Service</th>
                  <th className="p-4 border-b text-left text-gray-300">Price</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="p-4 border-t text-gray-300">Minor bug fix</td>
                  <td className="p-4 border-t text-gray-300">₱300-₱500</td>
                </tr>
                <tr className="border-t">
                  <td className="p-4 border-t text-gray-300">UI/layout fix</td>
                  <td className="p-4 border-t text-gray-300">₱500-₱1,000</td>
                </tr>
                <tr className="border-t">
                  <td className="p-4 border-t text-gray-300">Content update</td>
                  <td className="p-4 border-t text-gray-300">₱200-₱500</td>
                </tr>
                <tr className="border-t">
                  <td className="p-4 border-t text-gray-300">Feature tweak</td>
                  <td className="p-4 border-t text-gray-300">₱1,000-₱2,500</td>
                </tr>
                <tr className="border-t">
                  <td className="p-4 border-t text-gray-300">Major bug fix</td>
                  <td className="p-4 border-t text-gray-300">₱2,500-₱5,000</td>
                </tr>
                <tr className="border-t">
                  <td className="p-4 border-t text-gray-300">Rush (same day)</td>
                  <td className="p-4 border-t text-gray-300">+50%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-center text-gray-400 text-sm">
            Rush service guarantees same-day resolution for critical issues affecting business operations.
          </p>
        </div>
      </section>

      {/* Smart Tier Recommender */}
      <section id="tier-recommender" className="py-20 bg-gradient-to-r from-blue-900/30 to-purple-900/30">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4 text-white">Find Your Perfect Plan</h2>
          <p className="text-gray-300 text-center mb-12 max-w-2xl mx-auto">
            Answer a few questions to get a personalized recommendation
          </p>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-4">What's your monthly business revenue?</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { value: 'below-50k', label: 'Below ₱50,000', recommended: 'Starter plan' },
                    { value: '50k-200k', label: '₱50,000 - ₱200,000', recommended: 'Growth plan' },
                    { value: '200k-500k', label: '₱200,000 - ₱500,000', recommended: 'Business plan' },
                    { value: '500k-plus', label: '₱500,000+', recommended: 'Enterprise plan' },
                  ].map((option, idx) => (
                    <button
                      key={option.value}
                      onClick={() => handleRevenueSelect(option.value)}
                      className={`cursor-pointer p-4 rounded-lg transition-all text-left ${selectedRevenue === option.value
                        ? 'bg-blue-600/20 border-2 border-blue-500'
                        : 'bg-gray-900 border border-gray-700 hover:border-blue-500'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-medium text-white">{option.label}</p>
                          <p className="text-gray-400 text-sm">{option.recommended} recommended</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {recommendedTier && (
                <div className="text-center py-8 bg-gray-900 border border-gray-700 rounded-xl">
                  <h3 className="text-2xl font-bold text-white mb-4">Your Recommended Plan</h3>
                  <div className="text-6xl mb-4">{recommendedTier.icon}</div>
                  <h3 className="text-xl font-bold text-blue-400 mb-2">{recommendedTier.name}</h3>
                  <p className="text-2xl font-bold text-white mb-4">{recommendedTier.price}</p>
                  <ul className="space-y-2 text-gray-300 text-left max-w-xl mx-auto mb-6">
                    {recommendedTier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link to="/inquiry" className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-all hover:scale-105">
                    Start Inquiry
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-900/50 to-purple-900/50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4 text-white">Ready to digitize your business?</h2>
          <p className="text-xl text-gray-300 mb-8">Get started today — free consultation!</p>
          <Link to="/inquiry" className="inline-block px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-lg transition-all hover:scale-105">
            Start Your Project
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-2xl font-bold mb-4 text-white">
                Cronz<span className="text-blue-400">PH</span>
              </h3>
              <p className="text-gray-400">We Build. You Grow.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Quick Links</h4>
              <div className="space-y-2">
                <Link to="/inquiry" className="block text-gray-400 hover:text-white transition-colors">Get Started</Link>
                <button onClick={() => scrollToSection('services')} className="block text-gray-400 hover:text-white transition-colors text-left">Services</button>
                <button onClick={() => scrollToSection('pricing')} className="block text-gray-400 hover:text-white transition-colors text-left">Pricing</button>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Contact</h4>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.77,7.46H14.5v-1.9c0-.9.6-1.1,1-1.1h3V.5H14.17c-2.76,0-3.33,1.66-3.33,3.36v1.7H7.5v2.6h3.34v7.39h4.32v-7.39h3.22l.72-2.6Z" />
                </svg>
                Facebook Page
              </a>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-500">
            © 2026 CronzPH. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
