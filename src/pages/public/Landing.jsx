import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Landing = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
    { icon: '🌱', name: 'Starter', price: '₱500-800/mo', features: ['Basic website', 'Email support', 'Monthly updates'] },
    { icon: '🚀', name: 'Growth', price: '₱1,000-2,000/mo', features: ['Full website', 'Priority support', 'Weekly updates', 'Basic analytics'], recommended: true },
    { icon: '💼', name: 'Business', price: '₱3,000-5,000/mo', features: ['E-commerce ready', '24/7 support', 'Daily updates', 'Advanced analytics', 'API integrations'] },
    { icon: '🏢', name: 'Enterprise', price: '₱8,000-15,000/mo', features: ['Custom solutions', 'Dedicated manager', 'Real-time sync', 'Custom integrations', 'SLA guarantee'] },
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
              <button onClick={() => scrollToSection('why-us')} className="text-gray-300 hover:text-white transition-colors">Why Us</button>
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
              <button onClick={() => scrollToSection('why-us')} className="block w-full text-left text-gray-300 hover:text-white py-2">Why Us</button>
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
                  <path d="M18.77,7.46H14.5v-1.9c0-.9.6-1.1,1-1.1h3V.5H14.17c-2.76,0-3.33,1.66-3.33,3.36v1.7H7.5v2.6h3.34v7.39h4.32v-7.39h3.22l.72-2.6Z"/>
                </svg>
                Facebook Page
              </a>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-500">
            © 2025 CronzPH. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
