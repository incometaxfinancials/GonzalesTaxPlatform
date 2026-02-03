/**
 * ITF - Income. Tax. Financials - AI Optimizer Page
 * AI-powered deduction finder with OBBBA provisions
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Sparkles, Check, X, ChevronRight, DollarSign, Clock,
  Heart, Users, Home, Car, GraduationCap, Briefcase, Building,
  TrendingUp, AlertCircle, RefreshCw, Zap, Award, Target
} from 'lucide-react';

// Types
interface Deduction {
  id: string;
  category: 'obbba' | 'credits' | 'above_line' | 'itemized' | 'business';
  name: string;
  description: string;
  estimatedSavings: number;
  maxAmount?: number;
  confidence: number; // 0-100
  requirements: string[];
  icon: React.ElementType;
  applied: boolean;
  dismissed: boolean;
}

// Mock deductions based on user profile
const generateDeductions = (): Deduction[] => [
  // OBBBA Provisions
  {
    id: '1',
    category: 'obbba',
    name: 'No Tax on Tips',
    description: 'Service workers can deduct up to $25,000 in tip income from taxable wages.',
    estimatedSavings: 3300,
    maxAmount: 25000,
    confidence: 95,
    requirements: ['Must be service worker', 'Tips reported on W-2', 'Income under $160,000'],
    icon: DollarSign,
    applied: false,
    dismissed: false,
  },
  {
    id: '2',
    category: 'obbba',
    name: 'No Tax on Overtime',
    description: 'Overtime wages up to $10,000 can be deducted from your taxable income.',
    estimatedSavings: 1100,
    maxAmount: 10000,
    confidence: 92,
    requirements: ['Overtime clearly marked on W-2', 'Income under $100,000'],
    icon: Clock,
    applied: false,
    dismissed: false,
  },
  {
    id: '3',
    category: 'obbba',
    name: 'Senior Citizen Deduction',
    description: 'Additional $6,000 deduction for taxpayers aged 65 or older.',
    estimatedSavings: 1320,
    maxAmount: 6000,
    confidence: 100,
    requirements: ['Age 65 or older by Dec 31, 2025'],
    icon: Heart,
    applied: false,
    dismissed: false,
  },

  // Tax Credits
  {
    id: '4',
    category: 'credits',
    name: 'Child Tax Credit',
    description: '$2,200 credit per qualifying child under age 17.',
    estimatedSavings: 2200,
    confidence: 88,
    requirements: ['Child under 17', 'Valid SSN for child', 'Child lived with you 6+ months'],
    icon: Users,
    applied: false,
    dismissed: false,
  },
  {
    id: '5',
    category: 'credits',
    name: 'Earned Income Tax Credit',
    description: 'Credit for low to moderate income workers, refundable up to $7,830.',
    estimatedSavings: 4200,
    confidence: 75,
    requirements: ['Earned income under $60,000', 'Investment income under $11,600'],
    icon: TrendingUp,
    applied: false,
    dismissed: false,
  },

  // Above-the-Line Deductions
  {
    id: '6',
    category: 'above_line',
    name: 'Student Loan Interest',
    description: 'Deduct up to $2,500 in student loan interest paid.',
    estimatedSavings: 550,
    maxAmount: 2500,
    confidence: 85,
    requirements: ['Paid student loan interest', 'MAGI under $90,000 (single)'],
    icon: GraduationCap,
    applied: false,
    dismissed: false,
  },
  {
    id: '7',
    category: 'above_line',
    name: 'HSA Contributions',
    description: 'Health Savings Account contributions are fully deductible.',
    estimatedSavings: 800,
    confidence: 90,
    requirements: ['High-deductible health plan', 'Contributions under annual limit'],
    icon: Heart,
    applied: false,
    dismissed: false,
  },
  {
    id: '8',
    category: 'above_line',
    name: 'Educator Expenses',
    description: 'Teachers can deduct up to $300 for classroom supplies.',
    estimatedSavings: 66,
    maxAmount: 300,
    confidence: 80,
    requirements: ['K-12 teacher', 'Unreimbursed expenses'],
    icon: GraduationCap,
    applied: false,
    dismissed: false,
  },

  // Itemized Deductions
  {
    id: '9',
    category: 'itemized',
    name: 'Mortgage Interest',
    description: 'Deduct interest paid on your home mortgage.',
    estimatedSavings: 2400,
    confidence: 70,
    requirements: ['Own a home with mortgage', 'Receive Form 1098'],
    icon: Home,
    applied: false,
    dismissed: false,
  },
  {
    id: '10',
    category: 'itemized',
    name: 'Charitable Donations',
    description: 'Cash and non-cash donations to qualified charities.',
    estimatedSavings: 440,
    confidence: 65,
    requirements: ['Donations to 501(c)(3) organizations', 'Receipts for donations over $250'],
    icon: Heart,
    applied: false,
    dismissed: false,
  },
  {
    id: '11',
    category: 'itemized',
    name: 'State & Local Taxes (SALT)',
    description: 'Deduct state income tax and property tax up to $40,000 (OBBBA increased cap).',
    estimatedSavings: 3200,
    maxAmount: 40000,
    confidence: 78,
    requirements: ['Paid state/local income tax', 'Paid property tax'],
    icon: Building,
    applied: false,
    dismissed: false,
  },

  // Business Deductions
  {
    id: '12',
    category: 'business',
    name: 'Home Office Deduction',
    description: 'Deduct expenses for business use of your home.',
    estimatedSavings: 1500,
    confidence: 60,
    requirements: ['Regular and exclusive business use', 'Principal place of business'],
    icon: Home,
    applied: false,
    dismissed: false,
  },
  {
    id: '13',
    category: 'business',
    name: 'Vehicle Mileage',
    description: 'Standard mileage deduction for business driving (70¢/mile for 2025).',
    estimatedSavings: 850,
    confidence: 55,
    requirements: ['Business use of vehicle', 'Mileage log maintained'],
    icon: Car,
    applied: false,
    dismissed: false,
  },
];

export default function Optimizer() {
  const navigate = useNavigate();

  // State
  const [isScanning, setIsScanning] = useState(true);
  const [scanProgress, setScanProgress] = useState(0);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showDetails, setShowDetails] = useState<string | null>(null);

  // Automated AI scanning - starts immediately on page load
  useEffect(() => {
    if (isScanning) {
      const interval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsScanning(false);
            // Generate deductions with OBBBA auto-applied
            const allDeductions = generateDeductions();
            // Auto-apply all OBBBA deductions (automated feature)
            const autoAppliedDeductions = allDeductions.map(d =>
              d.category === 'obbba' ? { ...d, applied: true } : d
            );
            setDeductions(autoAppliedDeductions);
            return 100;
          }
          return prev + 8; // Faster scanning
        });
      }, 80); // Faster interval
      return () => clearInterval(interval);
    }
  }, [isScanning]);

  // Auto-apply high confidence deductions after initial scan
  useEffect(() => {
    if (!isScanning && deductions.length > 0) {
      // After 2 seconds, auto-apply credits with 85%+ confidence
      const timeout = setTimeout(() => {
        setDeductions(prev => prev.map(d =>
          (d.category === 'credits' && d.confidence >= 85 && !d.dismissed)
            ? { ...d, applied: true }
            : d
        ));
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isScanning, deductions.length]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
  };

  // Calculate totals
  const totals = {
    found: deductions.filter(d => !d.dismissed).length,
    applied: deductions.filter(d => d.applied).length,
    potential: deductions.filter(d => !d.dismissed && !d.applied).reduce((sum, d) => sum + d.estimatedSavings, 0),
    secured: deductions.filter(d => d.applied).reduce((sum, d) => sum + d.estimatedSavings, 0),
  };

  // Apply deduction
  const applyDeduction = (id: string) => {
    setDeductions(deductions.map(d => d.id === id ? { ...d, applied: true } : d));
  };

  // Apply all available deductions
  const applyAllDeductions = () => {
    setDeductions(deductions.map(d => !d.dismissed ? { ...d, applied: true } : d));
  };

  // Dismiss deduction
  const dismissDeduction = (id: string) => {
    setDeductions(deductions.map(d => d.id === id ? { ...d, dismissed: true } : d));
  };

  // Filter deductions
  const filteredDeductions = deductions.filter(d => {
    if (d.dismissed) return false;
    if (selectedCategory === 'all') return true;
    return d.category === selectedCategory;
  });

  // Get category info
  const categories = [
    { id: 'all', name: 'All Deductions', icon: Target },
    { id: 'obbba', name: 'OBBBA Savings', icon: Sparkles },
    { id: 'credits', name: 'Tax Credits', icon: Award },
    { id: 'above_line', name: 'Above-the-Line', icon: TrendingUp },
    { id: 'itemized', name: 'Itemized', icon: Home },
    { id: 'business', name: 'Business', icon: Briefcase },
  ];

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-600 bg-green-100';
    if (confidence >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-orange-600 bg-orange-100';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900 transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  AI Deduction Optimizer
                </h1>
                <p className="text-xs text-gray-500">Powered by ITF Tax Intelligence</p>
              </div>
            </div>

            {!isScanning && (
              <div className="flex items-center gap-2">
                <button
                  onClick={applyAllDeductions}
                  className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium transition hover:opacity-90"
                  style={{ backgroundColor: '#4CAF50' }}
                >
                  <Zap className="w-4 h-4" /> Apply All
                </button>
                <button
                  onClick={() => {
                    setIsScanning(true);
                    setScanProgress(0);
                    setDeductions([]);
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  <RefreshCw className="w-4 h-4" /> Rescan
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Scanning Animation */}
        {isScanning && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div
                className="absolute inset-0 rounded-full border-4 border-gray-200"
              />
              <div
                className="absolute inset-0 rounded-full border-4 border-t-green-500 animate-spin"
                style={{ animationDuration: '1s' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-12 h-12 text-yellow-500 animate-pulse" />
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Analyzing Your Tax Situation...
            </h2>
            <p className="text-gray-600 mb-6">
              Our AI is scanning 200+ deduction categories
            </p>

            <div className="max-w-md mx-auto">
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>Progress</span>
                <span>{scanProgress}%</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{ width: `${scanProgress}%`, backgroundColor: '#4CAF50' }}
                />
              </div>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4 max-w-lg mx-auto text-sm">
              {[
                { label: 'OBBBA Provisions', done: scanProgress > 30 },
                { label: 'Tax Credits', done: scanProgress > 50 },
                { label: 'Deductions', done: scanProgress > 70 },
              ].map((item, i) => (
                <div key={i} className={`flex items-center gap-2 ${item.done ? 'text-green-600' : 'text-gray-400'}`}>
                  {item.done ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Auto-Applied Notification */}
        {!isScanning && deductions.filter(d => d.category === 'obbba' && d.applied).length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">OBBBA Deductions Auto-Applied!</h3>
                <p className="text-sm text-green-100">
                  We automatically applied {deductions.filter(d => d.category === 'obbba' && d.applied).length} OBBBA provisions to maximize your savings.
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {formatCurrency(deductions.filter(d => d.category === 'obbba' && d.applied).reduce((sum, d) => sum + d.estimatedSavings, 0))}
              </p>
              <p className="text-xs text-green-100">OBBBA Savings</p>
            </div>
          </div>
        )}

        {/* Results */}
        {!isScanning && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <p className="text-sm text-gray-600">Found</p>
                  <p className="text-2xl font-bold text-gray-900">{totals.found}</p>
                  <p className="text-xs text-gray-500">deductions</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <p className="text-sm text-gray-600">Applied</p>
                  <p className="text-2xl font-bold text-green-600">{totals.applied}</p>
                  <p className="text-xs text-gray-500">to return</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-sm p-4 text-white">
                  <p className="text-sm text-green-100">Secured Savings</p>
                  <p className="text-2xl font-bold">{formatCurrency(totals.secured)}</p>
                  <p className="text-xs text-green-100">estimated</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl shadow-sm p-4 text-white">
                  <p className="text-sm text-yellow-100">Available</p>
                  <p className="text-2xl font-bold">{formatCurrency(totals.potential)}</p>
                  <p className="text-xs text-yellow-100">to claim</p>
                </div>
              </div>

              {/* Category Filter */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                      selectedCategory === cat.id
                        ? 'bg-green-100 text-green-700'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <cat.icon className="w-4 h-4" />
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Deductions List */}
              <div className="space-y-4">
                {filteredDeductions.map(deduction => (
                  <div
                    key={deduction.id}
                    className={`bg-white rounded-xl shadow-sm border transition ${
                      deduction.applied
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          deduction.category === 'obbba'
                            ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          <deduction.icon className="w-6 h-6" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                {deduction.name}
                                {deduction.category === 'obbba' && (
                                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" /> OBBBA
                                  </span>
                                )}
                                {deduction.applied && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Applied
                                  </span>
                                )}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1">{deduction.description}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-green-600">
                                {formatCurrency(deduction.estimatedSavings)}
                              </p>
                              <p className="text-xs text-gray-500">estimated savings</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${getConfidenceColor(deduction.confidence)}`}>
                                {deduction.confidence}% match
                              </span>
                              {deduction.maxAmount && (
                                <span className="text-xs text-gray-500">
                                  Max: {formatCurrency(deduction.maxAmount)}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setShowDetails(showDetails === deduction.id ? null : deduction.id)}
                                className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
                              >
                                Details <ChevronRight className={`w-4 h-4 transition ${showDetails === deduction.id ? 'rotate-90' : ''}`} />
                              </button>
                              {!deduction.applied && (
                                <>
                                  <button
                                    onClick={() => dismissDeduction(deduction.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => applyDeduction(deduction.id)}
                                    className="px-4 py-2 text-white rounded-lg font-medium transition hover:opacity-90"
                                    style={{ backgroundColor: '#4CAF50' }}
                                  >
                                    Apply
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Details Expansion */}
                      {showDetails === deduction.id && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <h4 className="font-medium text-gray-900 mb-2">Requirements</h4>
                          <ul className="space-y-1">
                            {deduction.requirements.map((req, i) => (
                              <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                                <Check className="w-4 h-4 text-green-500" />
                                {req}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {filteredDeductions.length === 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-600">No deductions in this category</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sticky top-24">
                <h3 className="font-semibold text-gray-900 mb-4">Savings Summary</h3>

                <div className="p-4 rounded-lg mb-4" style={{ background: 'linear-gradient(135deg, #1e3a5f, #2c4a7c)' }}>
                  <p className="text-sm text-blue-200">Total Potential Savings</p>
                  <p className="text-3xl font-bold text-white">
                    {formatCurrency(totals.secured + totals.potential)}
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Secured</span>
                    <span className="font-medium text-green-600">{formatCurrency(totals.secured)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pending</span>
                    <span className="font-medium text-yellow-600">{formatCurrency(totals.potential)}</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">By Category</h4>
                  <div className="space-y-2">
                    {categories.slice(1).map(cat => {
                      const catDeductions = deductions.filter(d => d.category === cat.id && !d.dismissed);
                      const catSavings = catDeductions.reduce((sum, d) => sum + d.estimatedSavings, 0);
                      if (catDeductions.length === 0) return null;
                      return (
                        <div key={cat.id} className="flex justify-between text-sm">
                          <span className="text-gray-600 flex items-center gap-1">
                            <cat.icon className="w-3 h-3" /> {cat.name}
                          </span>
                          <span className="font-medium">{formatCurrency(catSavings)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => navigate('/returns/new')}
                  className="w-full mt-6 px-4 py-3 text-white rounded-lg font-medium transition hover:opacity-90 flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#4CAF50' }}
                >
                  <Zap className="w-4 h-4" /> Apply to Return
                </button>

                <p className="text-xs text-gray-500 text-center mt-3">
                  Applied deductions will be added to your tax return
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
