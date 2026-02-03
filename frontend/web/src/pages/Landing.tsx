/**
 * ITF - Income. Tax. Financials - Landing Page
 * Professional Tax Solutions
 */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, ArrowLeft, CheckCircle, Shield, Zap, DollarSign,
  Star, Users, FileText, Sparkles, Calculator,
  ChevronDown, Play
} from 'lucide-react';

// ITF Logo Component
const ITFLogo = ({ size = 64, showText = true }: { size?: number; showText?: boolean }) => (
  <div className="flex items-center gap-3">
    <svg viewBox="0 0 120 80" width={size} height={size * 0.67}>
      <defs>
        <linearGradient id="itfBlue" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2c4a7c" />
          <stop offset="100%" stopColor="#1e3a5f" />
        </linearGradient>
        <linearGradient id="itfGreen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6BBF59" />
          <stop offset="100%" stopColor="#4CAF50" />
        </linearGradient>
      </defs>
      {/* Letter I */}
      <rect x="10" y="15" width="14" height="45" rx="2" fill="url(#itfBlue)" />
      {/* Letter T */}
      <rect x="32" y="22" width="14" height="38" rx="2" fill="url(#itfBlue)" />
      <rect x="26" y="15" width="26" height="12" rx="2" fill="url(#itfBlue)" />
      {/* Checkmark */}
      <path d="M28 30 L37 42 L58 12" stroke="url(#itfGreen)" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Letter F */}
      <rect x="65" y="15" width="14" height="45" rx="2" fill="url(#itfBlue)" />
      <rect x="65" y="15" width="22" height="10" rx="2" fill="url(#itfBlue)" />
      <rect x="65" y="32" width="18" height="8" rx="2" fill="url(#itfBlue)" />
      {/* Swooshes */}
      <ellipse cx="50" cy="67" rx="45" ry="9" fill="none" stroke="url(#itfGreen)" strokeWidth="3" />
      <ellipse cx="50" cy="71" rx="38" ry="7" fill="none" stroke="url(#itfBlue)" strokeWidth="2" />
    </svg>
    {showText && (
      <div className="hidden sm:block">
        <div className="text-xs font-bold tracking-wider" style={{ color: '#1e3a5f' }}>INCOME. TAX.</div>
        <div className="text-xs font-bold tracking-wider" style={{ color: '#1e3a5f' }}>FINANCIALS</div>
      </div>
    )}
  </div>
);

// Feature Card Component
const FeatureCard = ({
  icon: Icon,
  title,
  description,
  highlight
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  highlight?: boolean;
}) => (
  <div className={`
    p-6 rounded-2xl transition-all duration-300 hover:scale-105
    ${highlight
      ? 'bg-gradient-to-br from-[#1e3a5f] to-[#2c4a7c] text-white shadow-xl shadow-[#1e3a5f]/25'
      : 'bg-white shadow-lg hover:shadow-xl'
    }
  `}>
    <div className={`
      w-12 h-12 rounded-xl flex items-center justify-center mb-4
      ${highlight ? 'bg-white/20' : 'bg-[#e8f5e9]'}
    `}>
      <Icon className={`w-6 h-6 ${highlight ? 'text-white' : 'text-[#4CAF50]'}`} />
    </div>
    <h3 className={`text-xl font-bold mb-2 ${highlight ? 'text-white' : 'text-gray-900'}`}>
      {title}
    </h3>
    <p className={highlight ? 'text-blue-100' : 'text-gray-600'}>
      {description}
    </p>
  </div>
);

// OBBBA Benefit Component
const OBBBABenefit = ({ amount, title, description }: { amount: string; title: string; description: string }) => (
  <div className="flex items-start gap-4 p-4 bg-white/10 backdrop-blur rounded-xl">
    <div className="text-2xl font-bold" style={{ color: '#6BBF59' }}>{amount}</div>
    <div>
      <h4 className="font-semibold text-white">{title}</h4>
      <p className="text-sm text-blue-200">{description}</p>
    </div>
  </div>
);

// Testimonial Component
const Testimonial = ({ quote, author, role, rating }: { quote: string; author: string; role: string; rating: number }) => (
  <div className="bg-white p-6 rounded-2xl shadow-lg">
    <div className="flex gap-1 mb-3">
      {[...Array(rating)].map((_, i) => (
        <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
      ))}
    </div>
    <p className="text-gray-700 mb-4">"{quote}"</p>
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: 'linear-gradient(135deg, #1e3a5f, #4CAF50)' }}>
        {author[0]}
      </div>
      <div>
        <p className="font-semibold text-gray-900">{author}</p>
        <p className="text-sm text-gray-500">{role}</p>
      </div>
    </div>
  </div>
);

export default function Landing() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStat, setCurrentStat] = useState(0);

  const stats = [
    { value: '$8,059', label: 'Average Refund with OBBBA' },
    { value: '2.5M+', label: 'Returns Filed' },
    { value: '99.9%', label: 'Accuracy Rate' },
    { value: '4.9/5', label: 'Customer Rating' },
  ];

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentStat((prev) => (prev + 1) % stats.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900 transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <ITFLogo size={50} />
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#obbba" className="text-gray-600 hover:text-gray-900 transition-colors">OBBBA Savings</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
              <Link to="/login" className="text-gray-600 hover:text-gray-900 transition-colors">Sign In</Link>
              <Link
                to="/register"
                className="text-white px-4 py-2 rounded-lg font-medium transition-colors"
                style={{ backgroundColor: '#4CAF50' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#43a047'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4CAF50'}
              >
                Start Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #f0f7f0 0%, #e8f5e9 50%, #fff 100%)' }} />
        <div className="absolute top-0 right-0 w-1/2 h-full" style={{ background: 'linear-gradient(to left, rgba(76,175,80,0.1), transparent)' }} />

        {/* Floating Elements */}
        <div className="absolute top-40 left-10 w-20 h-20 rounded-full blur-2xl animate-pulse" style={{ backgroundColor: 'rgba(76,175,80,0.2)' }} />
        <div className="absolute bottom-40 right-20 w-32 h-32 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: 'rgba(30,58,95,0.2)' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text */}
            <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="inline-flex items-center gap-2 text-white px-4 py-2 rounded-full text-sm font-medium mb-6" style={{ background: 'linear-gradient(90deg, #1e3a5f, #4CAF50)' }}>
                <Sparkles className="w-4 h-4" />
                New 2025 OBBBA Tax Savings Available
              </div>

              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                <span style={{ color: '#1e3a5f' }}>Income.</span>{' '}
                <span style={{ color: '#4CAF50' }}>Tax.</span>{' '}
                <span style={{ color: '#1e3a5f' }}>Financials.</span>
                <br />
                <span className="text-3xl lg:text-4xl text-gray-600 font-normal">
                  Maximum Refunds, Guaranteed.
                </span>
              </h1>

              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Professional tax preparation powered by AI. We find every deduction you deserve.
                With new OBBBA provisions, you could save thousands more this year.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg transition-all hover:scale-105"
                  style={{ backgroundColor: '#4CAF50', boxShadow: '0 10px 25px rgba(76,175,80,0.3)' }}
                >
                  Start Filing Free <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/quick-calc"
                  className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg border-2 border-gray-200 transition-all hover:border-[#4CAF50]"
                >
                  <Calculator className="w-5 h-5" /> Quick Estimate
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5" style={{ color: '#4CAF50' }} />
                  <span>IRS Authorized e-File</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" style={{ color: '#4CAF50' }} />
                  <span>100% Accuracy Guarantee</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5" style={{ color: '#f59e0b' }} />
                  <span>Fastest Refunds</span>
                </div>
              </div>
            </div>

            {/* Right Column - Stats Card */}
            <div className={`transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="relative">
                {/* Main Card */}
                <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
                  <div className="text-center mb-8">
                    <div className="text-6xl font-bold mb-2" style={{ background: 'linear-gradient(90deg, #1e3a5f, #4CAF50)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      {stats[currentStat].value}
                    </div>
                    <p className="text-gray-500">{stats[currentStat].label}</p>
                  </div>

                  {/* Stat Indicators */}
                  <div className="flex justify-center gap-2 mb-8">
                    {stats.map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          i === currentStat ? 'w-8' : 'w-2 bg-gray-200'
                        }`}
                        style={i === currentStat ? { backgroundColor: '#4CAF50' } : {}}
                      />
                    ))}
                  </div>

                  {/* Quick Benefits */}
                  <div className="space-y-3">
                    {[
                      'No Tax on Tips (up to $25,000)',
                      'No Tax on Overtime (up to $10,000)',
                      'Enhanced Child Tax Credit ($2,200)',
                      'Senior Deduction ($6,000 for 65+)',
                    ].map((benefit, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#4CAF50' }} />
                        <span className="text-gray-700">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Floating Badge */}
                <div className="absolute -top-4 -right-4 text-white px-4 py-2 rounded-full font-bold shadow-lg animate-bounce" style={{ background: 'linear-gradient(90deg, #f59e0b, #ef4444)' }}>
                  NEW 2025!
                </div>
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="flex justify-center mt-16">
            <button
              onClick={scrollToFeatures}
              className="flex flex-col items-center text-gray-400 hover:text-gray-600 transition-colors animate-bounce"
            >
              <span className="text-sm mb-2">Discover More</span>
              <ChevronDown className="w-6 h-6" />
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Professional Tax Solutions for Everyone
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powered by AI and built by tax experts, ITF makes filing easy, accurate, and maximized.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Sparkles}
              title="AI Deduction Finder"
              description="Our AI scans 200+ deduction categories to find every tax break you qualify for."
              highlight
            />
            <FeatureCard
              icon={Zap}
              title="Instant Calculations"
              description="See your refund update in real-time as you enter information."
            />
            <FeatureCard
              icon={Shield}
              title="Audit Protection"
              description="100% accuracy guarantee with free audit support if the IRS has questions."
            />
            <FeatureCard
              icon={FileText}
              title="All Forms Supported"
              description="1040, Schedules A-F, 1099s, W-2s, self-employment, and business returns."
            />
            <FeatureCard
              icon={DollarSign}
              title="Maximum Refund"
              description="We guarantee the biggest refund possible or your filing fees back."
            />
            <FeatureCard
              icon={Users}
              title="Expert Help Available"
              description="Get unlimited support from tax professionals when you need it."
            />
          </div>
        </div>
      </section>

      {/* OBBBA Section */}
      <section id="obbba" className="py-20" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2c4a7c 50%, #1e3a5f 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              One Big Beautiful Bill Act
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">
              New 2025 Tax Savings You Don't Want to Miss
            </h2>
            <p className="text-xl text-blue-200 max-w-2xl mx-auto">
              The OBBBA introduces major tax benefits. ITF automatically applies all eligible savings.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <OBBBABenefit
              amount="$25K"
              title="No Tax on Tips"
              description="Service workers can deduct up to $25,000 in tip income"
            />
            <OBBBABenefit
              amount="$10K"
              title="No Tax on Overtime"
              description="Overtime pay deductible for workers earning under $100K"
            />
            <OBBBABenefit
              amount="$2,200"
              title="Child Tax Credit"
              description="Per qualifying child under 17, with $1,700 refundable"
            />
            <OBBBABenefit
              amount="$6,000"
              title="Senior Deduction"
              description="Additional deduction for taxpayers 65 and older"
            />
            <OBBBABenefit
              amount="$40K"
              title="SALT Cap Increased"
              description="State and local tax deduction cap raised from $10K"
            />
            <OBBBABenefit
              amount="$10K"
              title="Auto Loan Interest"
              description="Deduct interest on American-made vehicle loans"
            />
          </div>

          <div className="text-center mt-12">
            <Link
              to="/quick-calc"
              className="inline-flex items-center gap-2 bg-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-colors"
              style={{ color: '#1e3a5f' }}
            >
              Calculate Your OBBBA Savings <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Trusted by Thousands of Clients
            </h2>
            <p className="text-xl text-gray-600">
              See why customers choose Income. Tax. Financials year after year
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Testimonial
              quote="The AI found $3,000 in deductions I would have missed. Best tax software I've ever used!"
              author="Sarah M."
              role="Freelance Designer"
              rating={5}
            />
            <Testimonial
              quote="Finally got my tips and overtime tax-free with OBBBA. Refund was $2,000 more than last year!"
              author="Marcus J."
              role="Restaurant Server"
              rating={5}
            />
            <Testimonial
              quote="As a senior, the extra $6,000 deduction made a huge difference. So grateful for this platform."
              author="Dorothy L."
              role="Retired Teacher"
              rating={5}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <ITFLogo size={100} showText={false} />
          <h2 className="text-4xl font-bold text-gray-900 mt-6 mb-4">
            Ready to Maximize Your Refund?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands who trust ITF. File professionally, file smart, file now.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg transition-all hover:scale-105"
              style={{ backgroundColor: '#4CAF50' }}
            >
              Start Filing Free <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg transition-colors"
            >
              Sign In to Continue
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12" style={{ backgroundColor: '#1e3a5f' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <ITFLogo size={40} showText={false} />
              <div>
                <span className="font-bold text-white">Income. Tax. Financials</span>
                <p className="text-xs text-gray-400">Professional Tax Solutions</p>
              </div>
            </div>
            <p className="text-sm text-gray-400">
              IRS Authorized e-File Provider | &copy; 2025 All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
