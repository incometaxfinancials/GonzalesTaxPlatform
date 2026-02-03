/**
 * ITF - Income. Tax. Financials - Tax Return Page
 * Full interactive tax return wizard with OBBBA provisions
 */
import React, { useState, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Save, Trash2, Send, CheckCircle, AlertCircle,
  User, DollarSign, FileText, CreditCard, Sparkles, Home, Building,
  Clock, Heart, Users, Calculator, ChevronRight, X, Check, RefreshCw
} from 'lucide-react';

// Types
interface PersonalInfo {
  firstName: string;
  lastName: string;
  ssn: string;
  dateOfBirth: string;
  filingStatus: string;
  occupation: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

interface Spouse {
  firstName: string;
  lastName: string;
  ssn: string;
  dateOfBirth: string;
  occupation: string;
}

interface Dependent {
  id: string;
  firstName: string;
  lastName: string;
  ssn: string;
  relationship: string;
  dateOfBirth: string;
  monthsLived: number;
}

interface IncomeData {
  w2Wages: number;
  w2Withheld: number;
  tipIncome: number;
  overtimeWages: number;
  interest: number;
  dividends: number;
  businessIncome: number;
  capitalGains: number;
  socialSecurity: number;
  unemployment: number;
  otherIncome: number;
}

interface DeductionData {
  useItemized: boolean;
  mortgageInterest: number;
  propertyTax: number;
  stateLocalTax: number;
  charitableCash: number;
  charitableNonCash: number;
  medicalExpenses: number;
  studentLoanInterest: number;
  educatorExpenses: number;
  hsaContributions: number;
  iraContributions: number;
}

interface TaxReturnData {
  personalInfo: PersonalInfo;
  spouse: Spouse | null;
  dependents: Dependent[];
  income: IncomeData;
  deductions: DeductionData;
  bankRouting: string;
  bankAccount: string;
  accountType: 'checking' | 'savings';
}

// Initial state
const initialPersonalInfo: PersonalInfo = {
  firstName: '',
  lastName: '',
  ssn: '',
  dateOfBirth: '',
  filingStatus: 'single',
  occupation: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  zip: '',
};

const initialSpouse: Spouse = {
  firstName: '',
  lastName: '',
  ssn: '',
  dateOfBirth: '',
  occupation: '',
};

const initialIncome: IncomeData = {
  w2Wages: 0,
  w2Withheld: 0,
  tipIncome: 0,
  overtimeWages: 0,
  interest: 0,
  dividends: 0,
  businessIncome: 0,
  capitalGains: 0,
  socialSecurity: 0,
  unemployment: 0,
  otherIncome: 0,
};

const initialDeductions: DeductionData = {
  useItemized: false,
  mortgageInterest: 0,
  propertyTax: 0,
  stateLocalTax: 0,
  charitableCash: 0,
  charitableNonCash: 0,
  medicalExpenses: 0,
  studentLoanInterest: 0,
  educatorExpenses: 0,
  hsaContributions: 0,
  iraContributions: 0,
};

// Tax calculation constants
const STANDARD_DEDUCTIONS = {
  single: 15000,
  married_filing_jointly: 30000,
  married_filing_separately: 15000,
  head_of_household: 22500,
};

const TAX_BRACKETS = {
  single: [
    { min: 0, max: 11925, rate: 0.10 },
    { min: 11925, max: 48475, rate: 0.12 },
    { min: 48475, max: 103350, rate: 0.22 },
    { min: 103350, max: 197300, rate: 0.24 },
    { min: 197300, max: 250525, rate: 0.32 },
    { min: 250525, max: 626350, rate: 0.35 },
    { min: 626350, max: Infinity, rate: 0.37 },
  ],
  married_filing_jointly: [
    { min: 0, max: 23850, rate: 0.10 },
    { min: 23850, max: 96950, rate: 0.12 },
    { min: 96950, max: 206700, rate: 0.22 },
    { min: 206700, max: 394600, rate: 0.24 },
    { min: 394600, max: 501050, rate: 0.32 },
    { min: 501050, max: 751600, rate: 0.35 },
    { min: 751600, max: Infinity, rate: 0.37 },
  ],
};

export default function TaxReturn() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === 'new';

  // State
  const [currentStep, setCurrentStep] = useState(0);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>(initialPersonalInfo);
  const [spouse, setSpouse] = useState<Spouse | null>(null);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [income, setIncome] = useState<IncomeData>(initialIncome);
  const [deductions, setDeductions] = useState<DeductionData>(initialDeductions);
  const [bankRouting, setBankRouting] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [accountType, setAccountType] = useState<'checking' | 'savings'>('checking');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Steps
  const steps = [
    { id: 0, title: 'Personal Info', icon: User, description: 'Your information' },
    { id: 1, title: 'Dependents', icon: Users, description: 'Family members' },
    { id: 2, title: 'Income', icon: DollarSign, description: 'W-2s, 1099s, etc.' },
    { id: 3, title: 'Deductions', icon: FileText, description: 'Reduce taxable income' },
    { id: 4, title: 'Review', icon: CheckCircle, description: 'Verify & submit' },
  ];

  // Calculate age from DOB
  const getAge = (dob: string): number => {
    if (!dob) return 0;
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Tax calculations
  const calculations = useMemo(() => {
    const grossIncome =
      income.w2Wages + income.tipIncome + income.overtimeWages +
      income.interest + income.dividends + income.businessIncome +
      income.capitalGains + (income.socialSecurity * 0.85) +
      income.unemployment + income.otherIncome;

    // OBBBA Deductions
    const tipsDeduction = Math.min(income.tipIncome, 25000);
    const overtimeDeduction = Math.min(income.overtimeWages, 10000);
    const age = getAge(personalInfo.dateOfBirth);
    const seniorDeduction = age >= 65 ? 6000 : 0;
    const totalOBBBA = tipsDeduction + overtimeDeduction + seniorDeduction;

    // Adjustments
    const adjustments =
      Math.min(deductions.studentLoanInterest, 2500) +
      Math.min(deductions.educatorExpenses, 300) +
      deductions.hsaContributions +
      Math.min(deductions.iraContributions, 7000);

    const agi = Math.max(0, grossIncome - adjustments);

    // Standard vs Itemized
    const filingStatus = personalInfo.filingStatus as keyof typeof STANDARD_DEDUCTIONS;
    const standardDeduction = STANDARD_DEDUCTIONS[filingStatus] || 15000;

    const saltCapped = Math.min(deductions.stateLocalTax + deductions.propertyTax, 40000);
    const medicalDeductible = Math.max(0, deductions.medicalExpenses - agi * 0.075);
    const itemizedTotal =
      saltCapped + deductions.mortgageInterest +
      deductions.charitableCash + deductions.charitableNonCash + medicalDeductible;

    const deductionAmount = deductions.useItemized
      ? Math.max(itemizedTotal, standardDeduction)
      : standardDeduction;

    const taxableIncome = Math.max(0, agi - deductionAmount - totalOBBBA);

    // Calculate tax
    const brackets = TAX_BRACKETS[filingStatus as keyof typeof TAX_BRACKETS] || TAX_BRACKETS.single;
    let tax = 0;
    for (const bracket of brackets) {
      if (taxableIncome <= bracket.min) break;
      const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
      tax += taxableInBracket * bracket.rate;
    }

    // Credits
    const childrenUnder17 = dependents.filter(d => {
      const age = getAge(d.dateOfBirth);
      return age < 17;
    }).length;
    const childTaxCredit = childrenUnder17 * 2200;
    const totalCredits = childTaxCredit;

    const totalTax = Math.max(0, tax - totalCredits);
    const refundOrOwed = income.w2Withheld - totalTax;

    return {
      grossIncome,
      agi,
      obbbaSavings: { tipsDeduction, overtimeDeduction, seniorDeduction, total: totalOBBBA },
      deductionAmount,
      taxableIncome,
      taxBeforeCredits: tax,
      childTaxCredit,
      totalCredits,
      totalTax,
      totalPayments: income.w2Withheld,
      refundOrOwed,
      effectiveRate: grossIncome > 0 ? (totalTax / grossIncome) * 100 : 0,
    };
  }, [personalInfo, dependents, income, deductions]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
  };

  // Handlers
  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLastSaved(new Date());
    setIsSaving(false);
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    navigate('/dashboard');
  };

  const handleSubmit = async () => {
    await handleSave();
    // In real app, submit to IRS
    navigate('/dashboard');
  };

  const addDependent = () => {
    setDependents([...dependents, {
      id: Date.now().toString(),
      firstName: '',
      lastName: '',
      ssn: '',
      relationship: 'child',
      dateOfBirth: '',
      monthsLived: 12,
    }]);
  };

  const removeDependent = (id: string) => {
    setDependents(dependents.filter(d => d.id !== id));
  };

  const updateDependent = (id: string, field: keyof Dependent, value: string | number) => {
    setDependents(dependents.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  // Progress percentage
  const progress = ((currentStep + 1) / steps.length) * 100;

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
                <h1 className="font-bold text-gray-900">
                  {isNew ? 'New Tax Return' : 'Tax Return 2025'}
                </h1>
                <p className="text-xs text-gray-500">
                  {lastSaved ? `Last saved ${lastSaved.toLocaleTimeString()}` : 'Not saved'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Draft
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-gray-200">
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${progress}%`, backgroundColor: '#4CAF50' }}
          />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Steps */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sticky top-24">
              <h3 className="font-semibold text-gray-900 mb-4">Progress</h3>
              <div className="space-y-2">
                {steps.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(index)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition text-left ${
                      currentStep === index
                        ? 'bg-green-50 border border-green-200'
                        : index < currentStep
                          ? 'bg-gray-50 text-gray-600'
                          : 'hover:bg-gray-50 text-gray-500'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      currentStep === index
                        ? 'bg-green-500 text-white'
                        : index < currentStep
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-200 text-gray-500'
                    }`}>
                      {index < currentStep ? <Check className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className={`font-medium text-sm ${currentStep === index ? 'text-green-700' : ''}`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-gray-500">{step.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {/* Step 0: Personal Info */}
              {currentStep === 0 && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Personal Information</h2>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input
                        type="text"
                        value={personalInfo.firstName}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, firstName: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={personalInfo.lastName}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, lastName: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Social Security Number</label>
                      <input
                        type="text"
                        value={personalInfo.ssn}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, ssn: e.target.value })}
                        placeholder="XXX-XX-XXXX"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={personalInfo.dateOfBirth}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, dateOfBirth: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filing Status</label>
                    <select
                      value={personalInfo.filingStatus}
                      onChange={(e) => {
                        setPersonalInfo({ ...personalInfo, filingStatus: e.target.value });
                        if (e.target.value === 'married_filing_jointly') {
                          setSpouse(initialSpouse);
                        } else {
                          setSpouse(null);
                        }
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="single">Single</option>
                      <option value="married_filing_jointly">Married Filing Jointly</option>
                      <option value="married_filing_separately">Married Filing Separately</option>
                      <option value="head_of_household">Head of Household</option>
                    </select>
                  </div>

                  {spouse && (
                    <div className="border-t pt-6 mt-6">
                      <h3 className="font-semibold text-gray-900 mb-4">Spouse Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                          <input
                            type="text"
                            value={spouse.firstName}
                            onChange={(e) => setSpouse({ ...spouse, firstName: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                          <input
                            type="text"
                            value={spouse.lastName}
                            onChange={(e) => setSpouse({ ...spouse, lastName: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">SSN</label>
                          <input
                            type="text"
                            value={spouse.ssn}
                            onChange={(e) => setSpouse({ ...spouse, ssn: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                          <input
                            type="date"
                            value={spouse.dateOfBirth}
                            onChange={(e) => setSpouse({ ...spouse, dateOfBirth: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {getAge(personalInfo.dateOfBirth) >= 65 && (
                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700">
                        <Sparkles className="w-5 h-5" />
                        <span className="font-semibold">OBBBA Senior Benefit Unlocked!</span>
                      </div>
                      <p className="text-sm text-green-600 mt-1">You qualify for the $6,000 Senior Citizen Deduction</p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 1: Dependents */}
              {currentStep === 1 && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Dependents</h2>
                    <button
                      onClick={addDependent}
                      className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition"
                      style={{ backgroundColor: '#4CAF50' }}
                    >
                      <Users className="w-4 h-4" /> Add Dependent
                    </button>
                  </div>

                  {dependents.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No dependents added yet</p>
                      <button
                        onClick={addDependent}
                        className="mt-4 text-green-600 hover:underline"
                      >
                        Add your first dependent
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {dependents.map((dep, index) => (
                        <div key={dep.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium text-gray-900">Dependent {index + 1}</h4>
                            <button
                              onClick={() => removeDependent(dep.id)}
                              className="p-1 text-gray-400 hover:text-red-500 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                              <input
                                type="text"
                                value={dep.firstName}
                                onChange={(e) => updateDependent(dep.id, 'firstName', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                              <input
                                type="text"
                                value={dep.lastName}
                                onChange={(e) => updateDependent(dep.id, 'lastName', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">SSN</label>
                              <input
                                type="text"
                                value={dep.ssn}
                                onChange={(e) => updateDependent(dep.id, 'ssn', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                              <input
                                type="date"
                                value={dep.dateOfBirth}
                                onChange={(e) => updateDependent(dep.id, 'dateOfBirth', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                              <select
                                value={dep.relationship}
                                onChange={(e) => updateDependent(dep.id, 'relationship', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              >
                                <option value="child">Child</option>
                                <option value="stepchild">Stepchild</option>
                                <option value="foster">Foster Child</option>
                                <option value="sibling">Sibling</option>
                                <option value="parent">Parent</option>
                                <option value="other">Other Relative</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Months Lived with You</label>
                              <input
                                type="number"
                                value={dep.monthsLived}
                                onChange={(e) => updateDependent(dep.id, 'monthsLived', parseInt(e.target.value) || 0)}
                                min="0"
                                max="12"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                          {getAge(dep.dateOfBirth) < 17 && (
                            <div className="mt-3 p-2 bg-green-50 rounded text-sm text-green-700">
                              <Sparkles className="w-4 h-4 inline mr-1" />
                              Eligible for $2,200 Child Tax Credit (OBBBA)
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Income */}
              {currentStep === 2 && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Income</h2>

                  <div className="space-y-6">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h3 className="font-semibold text-blue-900 mb-4">W-2 Employment Income</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Total W-2 Wages</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-gray-500">$</span>
                            <input
                              type="number"
                              value={income.w2Wages || ''}
                              onChange={(e) => setIncome({ ...income, w2Wages: parseFloat(e.target.value) || 0 })}
                              className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Federal Tax Withheld</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-gray-500">$</span>
                            <input
                              type="number"
                              value={income.w2Withheld || ''}
                              onChange={(e) => setIncome({ ...income, w2Withheld: parseFloat(e.target.value) || 0 })}
                              className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                        <Sparkles className="w-5 h-5" /> OBBBA Tax-Free Income
                      </h3>
                      <p className="text-sm text-green-700 mb-4">These income types are deductible under the One Big Beautiful Bill Act</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tip Income (Tax-free up to $25,000)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-gray-500">$</span>
                            <input
                              type="number"
                              value={income.tipIncome || ''}
                              onChange={(e) => setIncome({ ...income, tipIncome: parseFloat(e.target.value) || 0 })}
                              className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                          </div>
                          {income.tipIncome > 0 && (
                            <p className="text-xs text-green-600 mt-1">
                              Tax savings: {formatCurrency(Math.min(income.tipIncome, 25000) * 0.22)}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Overtime Wages (Tax-free up to $10,000)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-gray-500">$</span>
                            <input
                              type="number"
                              value={income.overtimeWages || ''}
                              onChange={(e) => setIncome({ ...income, overtimeWages: parseFloat(e.target.value) || 0 })}
                              className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                          </div>
                          {income.overtimeWages > 0 && (
                            <p className="text-xs text-green-600 mt-1">
                              Tax savings: {formatCurrency(Math.min(income.overtimeWages, 10000) * 0.22)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4">Other Income</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { key: 'interest', label: 'Interest Income' },
                          { key: 'dividends', label: 'Dividend Income' },
                          { key: 'businessIncome', label: 'Business Income' },
                          { key: 'capitalGains', label: 'Capital Gains' },
                          { key: 'socialSecurity', label: 'Social Security' },
                          { key: 'otherIncome', label: 'Other Income' },
                        ].map(({ key, label }) => (
                          <div key={key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-gray-500">$</span>
                              <input
                                type="number"
                                value={(income as any)[key] || ''}
                                onChange={(e) => setIncome({ ...income, [key]: parseFloat(e.target.value) || 0 })}
                                className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Deductions */}
              {currentStep === 3 && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Deductions</h2>

                  <div className="p-4 bg-blue-50 rounded-lg mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-blue-900">Standard Deduction</h3>
                        <p className="text-sm text-blue-700">
                          {formatCurrency(STANDARD_DEDUCTIONS[personalInfo.filingStatus as keyof typeof STANDARD_DEDUCTIONS] || 15000)}
                        </p>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={deductions.useItemized}
                          onChange={(e) => setDeductions({ ...deductions, useItemized: e.target.checked })}
                          className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm font-medium">Itemize Instead</span>
                      </label>
                    </div>
                  </div>

                  {deductions.useItemized && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-4">State & Local Taxes (SALT - Cap: $40,000)</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">State/Local Income Tax</label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-gray-500">$</span>
                              <input
                                type="number"
                                value={deductions.stateLocalTax || ''}
                                onChange={(e) => setDeductions({ ...deductions, stateLocalTax: parseFloat(e.target.value) || 0 })}
                                className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Property Tax</label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-gray-500">$</span>
                              <input
                                type="number"
                                value={deductions.propertyTax || ''}
                                onChange={(e) => setDeductions({ ...deductions, propertyTax: parseFloat(e.target.value) || 0 })}
                                className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Other Itemized Deductions</h3>
                        <div className="grid grid-cols-2 gap-4">
                          {[
                            { key: 'mortgageInterest', label: 'Mortgage Interest' },
                            { key: 'charitableCash', label: 'Charitable (Cash)' },
                            { key: 'charitableNonCash', label: 'Charitable (Non-Cash)' },
                            { key: 'medicalExpenses', label: 'Medical Expenses' },
                          ].map(({ key, label }) => (
                            <div key={key}>
                              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                              <div className="relative">
                                <span className="absolute left-3 top-2 text-gray-500">$</span>
                                <input
                                  type="number"
                                  value={(deductions as any)[key] || ''}
                                  onChange={(e) => setDeductions({ ...deductions, [key]: parseFloat(e.target.value) || 0 })}
                                  className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Above-the-Line Deductions</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { key: 'studentLoanInterest', label: 'Student Loan Interest (max $2,500)' },
                        { key: 'educatorExpenses', label: 'Educator Expenses (max $300)' },
                        { key: 'hsaContributions', label: 'HSA Contributions' },
                        { key: 'iraContributions', label: 'IRA Contributions (max $7,000)' },
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-gray-500">$</span>
                            <input
                              type="number"
                              value={(deductions as any)[key] || ''}
                              onChange={(e) => setDeductions({ ...deductions, [key]: parseFloat(e.target.value) || 0 })}
                              className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {currentStep === 4 && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Review & Submit</h2>

                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2">Personal Information</h3>
                      <p className="text-gray-600">
                        {personalInfo.firstName} {personalInfo.lastName} • {personalInfo.filingStatus.replace(/_/g, ' ')}
                      </p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2">Income Summary</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-gray-600">Gross Income:</span>
                        <span className="text-right font-medium">{formatCurrency(calculations.grossIncome)}</span>
                        <span className="text-gray-600">Adjusted Gross Income:</span>
                        <span className="text-right font-medium">{formatCurrency(calculations.agi)}</span>
                      </div>
                    </div>

                    {calculations.obbbaSavings.total > 0 && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                          <Sparkles className="w-5 h-5" /> OBBBA Tax Savings
                        </h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {calculations.obbbaSavings.tipsDeduction > 0 && (
                            <>
                              <span className="text-green-700">No Tax on Tips:</span>
                              <span className="text-right font-medium text-green-800">{formatCurrency(calculations.obbbaSavings.tipsDeduction)}</span>
                            </>
                          )}
                          {calculations.obbbaSavings.overtimeDeduction > 0 && (
                            <>
                              <span className="text-green-700">Overtime Deduction:</span>
                              <span className="text-right font-medium text-green-800">{formatCurrency(calculations.obbbaSavings.overtimeDeduction)}</span>
                            </>
                          )}
                          {calculations.obbbaSavings.seniorDeduction > 0 && (
                            <>
                              <span className="text-green-700">Senior Deduction:</span>
                              <span className="text-right font-medium text-green-800">{formatCurrency(calculations.obbbaSavings.seniorDeduction)}</span>
                            </>
                          )}
                          <span className="text-green-800 font-semibold pt-2 border-t border-green-200">Total OBBBA Savings:</span>
                          <span className="text-right font-bold text-green-800 pt-2 border-t border-green-200">{formatCurrency(calculations.obbbaSavings.total)}</span>
                        </div>
                      </div>
                    )}

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2">Tax Calculation</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-gray-600">Taxable Income:</span>
                        <span className="text-right font-medium">{formatCurrency(calculations.taxableIncome)}</span>
                        <span className="text-gray-600">Tax Before Credits:</span>
                        <span className="text-right font-medium">{formatCurrency(calculations.taxBeforeCredits)}</span>
                        <span className="text-gray-600">Credits:</span>
                        <span className="text-right font-medium text-green-600">-{formatCurrency(calculations.totalCredits)}</span>
                        <span className="text-gray-600 font-semibold">Total Tax:</span>
                        <span className="text-right font-bold">{formatCurrency(calculations.totalTax)}</span>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2">Direct Deposit</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Routing Number</label>
                          <input
                            type="text"
                            value={bankRouting}
                            onChange={(e) => setBankRouting(e.target.value)}
                            maxLength={9}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                          <input
                            type="text"
                            value={bankAccount}
                            onChange={(e) => setBankAccount(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t">
                <button
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  <ArrowLeft className="w-4 h-4" /> Previous
                </button>
                {currentStep < steps.length - 1 ? (
                  <button
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="flex items-center gap-2 px-6 py-2 text-white rounded-lg transition"
                    style={{ backgroundColor: '#4CAF50' }}
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    className="flex items-center gap-2 px-6 py-2 text-white rounded-lg transition"
                    style={{ backgroundColor: '#1e3a5f' }}
                  >
                    <Send className="w-4 h-4" /> Submit Return
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar - Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sticky top-24">
              <h3 className="font-semibold text-gray-900 mb-4">Tax Summary</h3>

              <div className={`p-4 rounded-lg mb-4 ${
                calculations.refundOrOwed >= 0
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`text-sm ${calculations.refundOrOwed >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {calculations.refundOrOwed >= 0 ? 'Estimated Refund' : 'Amount Owed'}
                </p>
                <p className={`text-3xl font-bold ${calculations.refundOrOwed >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(Math.abs(calculations.refundOrOwed))}
                </p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Gross Income</span>
                  <span className="font-medium">{formatCurrency(calculations.grossIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Deductions</span>
                  <span className="font-medium">{formatCurrency(calculations.deductionAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Taxable Income</span>
                  <span className="font-medium">{formatCurrency(calculations.taxableIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Tax</span>
                  <span className="font-medium">{formatCurrency(calculations.totalTax)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payments Made</span>
                  <span className="font-medium">{formatCurrency(calculations.totalPayments)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-gray-600">Effective Rate</span>
                  <span className="font-medium">{calculations.effectiveRate.toFixed(1)}%</span>
                </div>
              </div>

              {calculations.obbbaSavings.total > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                    <Sparkles className="w-4 h-4" /> OBBBA Savings
                  </h4>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(calculations.obbbaSavings.total * 0.22)}
                  </p>
                  <p className="text-xs text-gray-500">estimated tax savings</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Tax Return?</h3>
                <p className="text-gray-600">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
