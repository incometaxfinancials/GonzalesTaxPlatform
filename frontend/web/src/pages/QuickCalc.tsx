/**
 * ITF - Income. Tax. Financials
 * Professional Tax Refund Calculator
 * Multi-step, interactive, real-time calculations with OBBBA 2025
 */
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calculator,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  FileText,
  DollarSign,
  CheckCircle,
  Users,
  Home,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface W2Entry {
  id: string;
  owner: 'taxpayer' | 'spouse' | '';
  wages: number;
  federalWithheld: number;
  tips: number;
  overtime: number;
}

interface Form1099 {
  id: string;
  type: 'NEC' | 'INT' | 'DIV' | 'G' | 'R' | 'SSA' | '';
  amount: number;
  taxWithheld: number;
}

interface OtherIncome {
  selfEmployment: number;
  rentalIncome: number;
  capitalGains: number;
  alimonyReceived: number;
  gambling: number;
  otherIncome: number;
}

interface Deductions {
  useItemized: boolean;
  medical: number;
  stateLocalTaxes: number;
  mortgageInterest: number;
  charitableContributions: number;
  studentLoanInterest: number;
  educatorExpenses: number;
  hsaContributions: number;
  iraContributions: number;
}

interface Adjustments {
  childTaxCredit: boolean;
  childCount: number;
  earnedIncomeCredit: boolean;
  childCareExpenses: number;
  energyCredits: number;
}

interface PersonalInfo {
  filingStatus: 'single' | 'married_jointly' | 'married_separately' | 'head_of_household' | 'widow' | '';
  age: number;
  spouseAge: number;
  isBlind: boolean;
  spouseBlind: boolean;
  isDependent: boolean;
  hasITIN: boolean;
  dependents: number;
  qualifyingChildren: number;
}

type TabId = 'simple' | 'other_income' | 'deductions' | 'adjustments' | 'results';

// ============================================================================
// TAX CALCULATION ENGINE (2025 with OBBBA)
// ============================================================================

const TAX_BRACKETS_2025: Record<string, { min: number; max: number; rate: number }[]> = {
  single: [
    { min: 0, max: 11925, rate: 0.10 },
    { min: 11925, max: 48475, rate: 0.12 },
    { min: 48475, max: 103350, rate: 0.22 },
    { min: 103350, max: 197300, rate: 0.24 },
    { min: 197300, max: 250525, rate: 0.32 },
    { min: 250525, max: 626350, rate: 0.35 },
    { min: 626350, max: Infinity, rate: 0.37 },
  ],
  married_jointly: [
    { min: 0, max: 23850, rate: 0.10 },
    { min: 23850, max: 96950, rate: 0.12 },
    { min: 96950, max: 206700, rate: 0.22 },
    { min: 206700, max: 394600, rate: 0.24 },
    { min: 394600, max: 501050, rate: 0.32 },
    { min: 501050, max: 751600, rate: 0.35 },
    { min: 751600, max: Infinity, rate: 0.37 },
  ],
  married_separately: [
    { min: 0, max: 11925, rate: 0.10 },
    { min: 11925, max: 48475, rate: 0.12 },
    { min: 48475, max: 103350, rate: 0.22 },
    { min: 103350, max: 197300, rate: 0.24 },
    { min: 197300, max: 250525, rate: 0.32 },
    { min: 250525, max: 375800, rate: 0.35 },
    { min: 375800, max: Infinity, rate: 0.37 },
  ],
  head_of_household: [
    { min: 0, max: 17000, rate: 0.10 },
    { min: 17000, max: 64850, rate: 0.12 },
    { min: 64850, max: 103350, rate: 0.22 },
    { min: 103350, max: 197300, rate: 0.24 },
    { min: 197300, max: 250500, rate: 0.32 },
    { min: 250500, max: 626350, rate: 0.35 },
    { min: 626350, max: Infinity, rate: 0.37 },
  ],
  widow: [
    { min: 0, max: 23850, rate: 0.10 },
    { min: 23850, max: 96950, rate: 0.12 },
    { min: 96950, max: 206700, rate: 0.22 },
    { min: 206700, max: 394600, rate: 0.24 },
    { min: 394600, max: 501050, rate: 0.32 },
    { min: 501050, max: 751600, rate: 0.35 },
    { min: 751600, max: Infinity, rate: 0.37 },
  ],
};

const STANDARD_DEDUCTIONS_2025: Record<string, number> = {
  single: 15000,
  married_jointly: 30000,
  married_separately: 15000,
  head_of_household: 22500,
  widow: 30000,
};

const OBBBA_2025 = {
  tipsExemptionMax: 25000,
  seniorBonusDeduction: 4000,
  seniorAgeThreshold: 65,
  childTaxCredit: 2200,
};

function calculateTax(
  personalInfo: PersonalInfo,
  w2s: W2Entry[],
  forms1099: Form1099[],
  otherIncome: OtherIncome,
  deductions: Deductions,
  adjustments: Adjustments
) {
  const totalWages = w2s.reduce((sum, w2) => sum + w2.wages, 0);
  const totalTips = w2s.reduce((sum, w2) => sum + w2.tips, 0);
  const totalOvertime = w2s.reduce((sum, w2) => sum + w2.overtime, 0);
  const totalWithheld = w2s.reduce((sum, w2) => sum + w2.federalWithheld, 0);
  const total1099Income = forms1099.reduce((sum, f) => sum + f.amount, 0);
  const total1099Withheld = forms1099.reduce((sum, f) => sum + f.taxWithheld, 0);
  const totalOtherIncome =
    otherIncome.selfEmployment + otherIncome.rentalIncome + otherIncome.capitalGains +
    otherIncome.alimonyReceived + otherIncome.gambling + otherIncome.otherIncome;

  // OBBBA exemptions
  const tipsExemption = Math.min(totalTips, OBBBA_2025.tipsExemptionMax);
  const overtimeExemption = totalOvertime;
  const grossIncome = totalWages + total1099Income + totalOtherIncome;
  let agi = grossIncome - tipsExemption - overtimeExemption;

  // Above-the-line deductions
  const aboveLineDeductions =
    deductions.studentLoanInterest + deductions.educatorExpenses +
    deductions.hsaContributions + Math.min(deductions.iraContributions, 7000);
  agi -= aboveLineDeductions;

  // Standard vs Itemized
  const filingStatus = personalInfo.filingStatus || 'single';
  const standardDeduction = STANDARD_DEDUCTIONS_2025[filingStatus] || 15000;
  const itemizedTotal =
    Math.max(0, deductions.medical - agi * 0.075) +
    Math.min(deductions.stateLocalTaxes, 10000) +
    deductions.mortgageInterest + deductions.charitableContributions;
  const deductionUsed = deductions.useItemized ? Math.max(itemizedTotal, standardDeduction) : standardDeduction;

  // Senior bonus
  let seniorBonus = 0;
  if (personalInfo.age >= OBBBA_2025.seniorAgeThreshold) seniorBonus += OBBBA_2025.seniorBonusDeduction;
  if (filingStatus === 'married_jointly' && personalInfo.spouseAge >= OBBBA_2025.seniorAgeThreshold) {
    seniorBonus += OBBBA_2025.seniorBonusDeduction;
  }

  // Blind deduction
  let blindDeduction = 0;
  if (personalInfo.isBlind) blindDeduction += 1550;
  if (personalInfo.spouseBlind) blindDeduction += 1550;

  const taxableIncome = Math.max(0, agi - deductionUsed - seniorBonus - blindDeduction);

  // Calculate tax
  const brackets = TAX_BRACKETS_2025[filingStatus] || TAX_BRACKETS_2025.single;
  let federalTax = 0;
  let remainingIncome = taxableIncome;
  for (const bracket of brackets) {
    if (remainingIncome <= 0) break;
    const taxableInBracket = Math.min(remainingIncome, bracket.max - bracket.min);
    federalTax += taxableInBracket * bracket.rate;
    remainingIncome -= taxableInBracket;
  }

  // Self-employment tax
  const selfEmploymentTax = otherIncome.selfEmployment > 0 ? otherIncome.selfEmployment * 0.9235 * 0.153 : 0;

  // Credits
  let totalCredits = 0;
  if (adjustments.childTaxCredit && adjustments.childCount > 0) {
    totalCredits += OBBBA_2025.childTaxCredit * adjustments.childCount;
  }
  if (adjustments.earnedIncomeCredit && agi < 60000) {
    const eicTable: Record<number, number> = { 0: 632, 1: 4213, 2: 6960, 3: 7830 };
    totalCredits += eicTable[Math.min(personalInfo.qualifyingChildren, 3)] || 0;
  }
  if (adjustments.childCareExpenses > 0) {
    const maxExpenses = adjustments.childCount >= 2 ? 6000 : 3000;
    const creditRate = agi < 15000 ? 0.35 : Math.max(0.2, 0.35 - (agi - 15000) / 2000 * 0.01);
    totalCredits += Math.min(adjustments.childCareExpenses, maxExpenses) * creditRate;
  }
  totalCredits += adjustments.energyCredits;

  const totalTax = Math.max(0, federalTax + selfEmploymentTax - totalCredits);
  const totalWithheldAll = totalWithheld + total1099Withheld;
  const refundOrOwed = totalWithheldAll - totalTax;
  const effectiveRate = agi > 0 ? (totalTax / agi) * 100 : 0;

  return {
    grossIncome, tipsExemption, overtimeExemption, agi, standardDeduction, itemizedTotal,
    deductionUsed, seniorBonus, blindDeduction, taxableIncome, federalTax, selfEmploymentTax,
    totalCredits, totalTax, totalWithheld: totalWithheldAll, refundOrOwed, effectiveRate,
    totalWages, totalTips, totalOvertime,
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function QuickCalc() {
  const [activeTab, setActiveTab] = useState<TabId>('simple');
  const tabs: { id: TabId; label: string }[] = [
    { id: 'simple', label: 'Simple Return' },
    { id: 'other_income', label: 'Other Income' },
    { id: 'deductions', label: 'Deductions' },
    { id: 'adjustments', label: 'Adjustments / Credits' },
    { id: 'results', label: 'Results' },
  ];

  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    filingStatus: '', age: 0, spouseAge: 0, isBlind: false, spouseBlind: false,
    isDependent: false, hasITIN: false, dependents: 0, qualifyingChildren: 0,
  });

  const [w2s, setW2s] = useState<W2Entry[]>([
    { id: '1', owner: '', wages: 0, federalWithheld: 0, tips: 0, overtime: 0 },
  ]);

  const [forms1099, setForms1099] = useState<Form1099[]>([]);

  const [otherIncome, setOtherIncome] = useState<OtherIncome>({
    selfEmployment: 0, rentalIncome: 0, capitalGains: 0, alimonyReceived: 0, gambling: 0, otherIncome: 0,
  });

  const [deductions, setDeductions] = useState<Deductions>({
    useItemized: false, medical: 0, stateLocalTaxes: 0, mortgageInterest: 0,
    charitableContributions: 0, studentLoanInterest: 0, educatorExpenses: 0, hsaContributions: 0, iraContributions: 0,
  });

  const [adjustments, setAdjustments] = useState<Adjustments>({
    childTaxCredit: false, childCount: 0, earnedIncomeCredit: false, childCareExpenses: 0, energyCredits: 0,
  });

  const results = useMemo(() => {
    return calculateTax(personalInfo, w2s, forms1099, otherIncome, deductions, adjustments);
  }, [personalInfo, w2s, forms1099, otherIncome, deductions, adjustments]);

  const addW2 = () => setW2s([...w2s, { id: Date.now().toString(), owner: '', wages: 0, federalWithheld: 0, tips: 0, overtime: 0 }]);
  const removeW2 = (id: string) => w2s.length > 1 && setW2s(w2s.filter(w => w.id !== id));
  const updateW2 = (id: string, field: keyof W2Entry, value: string | number) => setW2s(w2s.map(w => w.id === id ? { ...w, [field]: value } : w));
  const add1099 = () => setForms1099([...forms1099, { id: Date.now().toString(), type: '', amount: 0, taxWithheld: 0 }]);
  const remove1099 = (id: string) => setForms1099(forms1099.filter(f => f.id !== id));
  const update1099 = (id: string, field: keyof Form1099, value: string | number) => setForms1099(forms1099.map(f => f.id === id ? { ...f, [field]: value } : f));

  const handleRestart = () => {
    setPersonalInfo({ filingStatus: '', age: 0, spouseAge: 0, isBlind: false, spouseBlind: false, isDependent: false, hasITIN: false, dependents: 0, qualifyingChildren: 0 });
    setW2s([{ id: '1', owner: '', wages: 0, federalWithheld: 0, tips: 0, overtime: 0 }]);
    setForms1099([]);
    setOtherIncome({ selfEmployment: 0, rentalIncome: 0, capitalGains: 0, alimonyReceived: 0, gambling: 0, otherIncome: 0 });
    setDeductions({ useItemized: false, medical: 0, stateLocalTaxes: 0, mortgageInterest: 0, charitableContributions: 0, studentLoanInterest: 0, educatorExpenses: 0, hsaContributions: 0, iraContributions: 0 });
    setAdjustments({ childTaxCredit: false, childCount: 0, earnedIncomeCredit: false, childCareExpenses: 0, energyCredits: 0 });
    setActiveTab('simple');
  };

  const tabIndex = tabs.findIndex(t => t.id === activeTab);
  const canGoBack = tabIndex > 0;
  const canGoNext = tabIndex < tabs.length - 1;
  const goBack = () => canGoBack && setActiveTab(tabs[tabIndex - 1].id);
  const goNext = () => canGoNext && setActiveTab(tabs[tabIndex + 1].id);
  const progressPercent = ((tabIndex + 1) / tabs.length) * 100;

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  const w2Totals = useMemo(() => ({
    wages: w2s.reduce((sum, w) => sum + w.wages, 0),
    withheld: w2s.reduce((sum, w) => sum + w.federalWithheld, 0),
    tips: w2s.reduce((sum, w) => sum + w.tips, 0),
    overtime: w2s.reduce((sum, w) => sum + w.overtime, 0),
  }), [w2s]);

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Left Sidebar */}
      <div className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <Link to="/dashboard"><img src="/logo.svg" alt="ITF Logo" className="w-28 h-auto" /></Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <a href="https://www.irs.gov" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition">
            <ExternalLink className="w-4 h-4" />IRS Website
          </a>
          <Link to="/tax-return" className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition">
            <FileText className="w-4 h-4" />Full Tax Return
          </a>
          <a href="https://www.irs.gov/forms-instructions" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition">
            <FileText className="w-4 h-4" />IRS Publications & Forms
          </a>
          <div className="border-t border-gray-200 my-4" />
          <Link to="/dashboard" className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition">
            <Home className="w-4 h-4" />Go Back To Dashboard
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-3 text-center">
            <p className="text-xs font-semibold">OBBBA 2025</p>
            <p className="text-[10px] mt-1 opacity-90">No Tax on Tips & Overtime</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header with Refund Summary */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800">2025 Tax Program</h1>
            <div className="flex items-center gap-8">
              <div className="text-right">
                <p className={`text-3xl font-bold ${results.refundOrOwed >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(results.refundOrOwed))}
                </p>
                <p className="text-xs text-gray-500">{results.refundOrOwed >= 0 ? 'Estimated Federal Refund' : 'Estimated Amount Owed'}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-700">{formatCurrency(results.agi)}</p>
                <p className="text-xs text-gray-500">Estimated AGI Amount</p>
              </div>
            </div>
          </div>
        </div>

        {/* Calculator Card */}
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
            <div className="px-6 pt-6 pb-4">
              <h2 className="text-2xl font-bold text-gray-800">Professional Tax</h2>
              <h2 className="text-2xl font-bold text-gray-800">Refund Calculator</h2>
            </div>

            {/* Tabs */}
            <div className="px-6">
              <div className="flex border-b border-gray-200">
                {tabs.map((tab) => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-3 text-sm font-medium transition relative ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                    {tab.label}
                    {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
                  </button>
                ))}
              </div>
              <div className="h-1 bg-gray-200"><div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} /></div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 p-6 overflow-auto">
              {/* Simple Return Tab */}
              {activeTab === 'simple' && (
                <div className="grid grid-cols-2 gap-8">
                  {/* Personal Info */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Personal Info</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 bg-blue-50/50 px-3 rounded">
                        <label className="text-sm text-gray-700">Taxpayer's filing status</label>
                        <select value={personalInfo.filingStatus} onChange={(e) => setPersonalInfo({ ...personalInfo, filingStatus: e.target.value as PersonalInfo['filingStatus'] })}
                          className="w-48 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                          <option value="">Select</option>
                          <option value="single">Single</option>
                          <option value="married_jointly">Married Filing Jointly</option>
                          <option value="married_separately">Married Filing Separately</option>
                          <option value="head_of_household">Head of Household</option>
                          <option value="widow">Qualifying Widow(er)</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3">
                        <label className="text-sm text-gray-700">Taxpayer's age</label>
                        <input type="number" value={personalInfo.age || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, age: parseInt(e.target.value) || 0 })}
                          className="w-48 px-3 py-2 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-blue-500" placeholder="0" />
                      </div>
                      {(personalInfo.filingStatus === 'married_jointly' || personalInfo.filingStatus === 'married_separately') && (
                        <div className="flex items-center justify-between py-2 bg-blue-50/50 px-3 rounded">
                          <label className="text-sm text-gray-700">Spouse's age</label>
                          <input type="number" value={personalInfo.spouseAge || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, spouseAge: parseInt(e.target.value) || 0 })}
                            className="w-48 px-3 py-2 border border-gray-300 rounded text-sm text-right" placeholder="0" />
                        </div>
                      )}
                      <div className="flex items-center justify-between py-2 bg-blue-50/50 px-3 rounded">
                        <label className="text-sm text-gray-700">Is the taxpayer blind?</label>
                        <select value={personalInfo.isBlind ? 'yes' : 'no'} onChange={(e) => setPersonalInfo({ ...personalInfo, isBlind: e.target.value === 'yes' })}
                          className="w-48 px-3 py-2 border border-gray-300 rounded text-sm">
                          <option value="no">No</option><option value="yes">Yes</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3">
                        <label className="text-sm text-gray-700">Is the taxpayer a dependent?</label>
                        <select value={personalInfo.isDependent ? 'yes' : 'no'} onChange={(e) => setPersonalInfo({ ...personalInfo, isDependent: e.target.value === 'yes' })}
                          className="w-48 px-3 py-2 border border-gray-300 rounded text-sm">
                          <option value="no">No</option><option value="yes">Yes</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between py-2 bg-blue-50/50 px-3 rounded">
                        <label className="text-sm text-gray-700">Does the taxpayer have an ITIN?</label>
                        <select value={personalInfo.hasITIN ? 'yes' : 'no'} onChange={(e) => setPersonalInfo({ ...personalInfo, hasITIN: e.target.value === 'yes' })}
                          className="w-48 px-3 py-2 border border-gray-300 rounded text-sm">
                          <option value="no">No</option><option value="yes">Yes</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3">
                        <label className="text-sm text-gray-700">Number of dependents</label>
                        <input type="number" value={personalInfo.dependents || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, dependents: parseInt(e.target.value) || 0 })}
                          className="w-48 px-3 py-2 border border-gray-300 rounded text-sm text-right" placeholder="0" min="0" />
                      </div>
                      <div className="flex items-center justify-between py-2 bg-blue-50/50 px-3 rounded">
                        <label className="text-sm text-gray-700">Qualifying children (under 17)</label>
                        <input type="number" value={personalInfo.qualifyingChildren || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, qualifyingChildren: parseInt(e.target.value) || 0 })}
                          className="w-48 px-3 py-2 border border-gray-300 rounded text-sm text-right" placeholder="0" min="0" />
                      </div>
                    </div>
                  </div>

                  {/* W-2 Section */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Wages on Form W-2</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="text-gray-600">
                          <th className="text-left py-2 px-2 font-medium">W-2 Owner</th>
                          <th className="text-right py-2 px-2 font-medium">Wages<br/><span className="text-xs">(Box 1)</span></th>
                          <th className="text-right py-2 px-2 font-medium">Federal Withholding<br/><span className="text-xs">(Box 2)</span></th>
                          <th className="text-right py-2 px-2 font-medium">Tips<br/><span className="text-xs">(Box 7)</span></th>
                          <th className="text-right py-2 px-2 font-medium">Overtime<br/><span className="text-xs">(Box 12a-12d)</span></th>
                          <th className="w-8"></th>
                        </tr></thead>
                        <tbody>
                          {w2s.map((w2, idx) => (
                            <tr key={w2.id} className={idx % 2 === 0 ? 'bg-blue-50/50' : ''}>
                              <td className="py-2 px-2">
                                <select value={w2.owner} onChange={(e) => updateW2(w2.id, 'owner', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm">
                                  <option value="">Select</option><option value="taxpayer">Taxpayer</option><option value="spouse">Spouse</option>
                                </select>
                              </td>
                              <td className="py-2 px-2">
                                <div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                  <input type="number" value={w2.wages || ''} onChange={(e) => updateW2(w2.id, 'wages', parseFloat(e.target.value) || 0)} className="w-full pl-6 pr-2 py-1 border border-gray-300 rounded text-sm text-right" placeholder="0" />
                                </div>
                              </td>
                              <td className="py-2 px-2">
                                <div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                  <input type="number" value={w2.federalWithheld || ''} onChange={(e) => updateW2(w2.id, 'federalWithheld', parseFloat(e.target.value) || 0)} className="w-full pl-6 pr-2 py-1 border border-gray-300 rounded text-sm text-right" placeholder="0" />
                                </div>
                              </td>
                              <td className="py-2 px-2">
                                <div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                  <input type="number" value={w2.tips || ''} onChange={(e) => updateW2(w2.id, 'tips', parseFloat(e.target.value) || 0)} className="w-full pl-6 pr-2 py-1 border border-gray-300 rounded text-sm text-right" placeholder="0" />
                                </div>
                              </td>
                              <td className="py-2 px-2">
                                <div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                  <input type="number" value={w2.overtime || ''} onChange={(e) => updateW2(w2.id, 'overtime', parseFloat(e.target.value) || 0)} className="w-full pl-6 pr-2 py-1 border border-gray-300 rounded text-sm text-right" placeholder="0" />
                                </div>
                              </td>
                              <td className="py-2 px-2">{w2s.length > 1 && <button onClick={() => removeW2(w2.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4" /></button>}</td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-gray-300 font-semibold">
                            <td className="py-2 px-2 text-gray-700">Totals:</td>
                            <td className="py-2 px-2 text-right">{formatCurrency(w2Totals.wages)}</td>
                            <td className="py-2 px-2 text-right">{formatCurrency(w2Totals.withheld)}</td>
                            <td className="py-2 px-2 text-right text-green-600">{formatCurrency(w2Totals.tips)}</td>
                            <td className="py-2 px-2 text-right text-green-600">{formatCurrency(w2Totals.overtime)}</td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    {(w2Totals.tips > 0 || w2Totals.overtime > 0) && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-green-800">OBBBA 2025 Benefits Applied!</p>
                          <p className="text-green-700 mt-1">
                            {w2Totals.tips > 0 && `Tips: ${formatCurrency(Math.min(w2Totals.tips, 25000))} tax-free. `}
                            {w2Totals.overtime > 0 && `Overtime: ${formatCurrency(w2Totals.overtime)} tax-free.`}
                          </p>
                        </div>
                      </div>
                    )}
                    <button onClick={addW2} className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2">
                      <Plus className="w-5 h-5" />ADD ANOTHER W-2
                    </button>
                  </div>
                </div>
              )}

              {/* Other Income Tab */}
              {activeTab === 'other_income' && (
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">1099 Forms</h3>
                    {forms1099.length === 0 ? <p className="text-gray-500 text-sm mb-4">No 1099 forms added yet.</p> : (
                      <div className="space-y-3 mb-4">
                        {forms1099.map((form, idx) => (
                          <div key={form.id} className={`p-3 rounded-lg ${idx % 2 === 0 ? 'bg-blue-50/50' : 'bg-gray-50'}`}>
                            <div className="flex gap-3">
                              <select value={form.type} onChange={(e) => update1099(form.id, 'type', e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm">
                                <option value="">Select Type</option>
                                <option value="NEC">1099-NEC (Self-Employment)</option>
                                <option value="INT">1099-INT (Interest)</option>
                                <option value="DIV">1099-DIV (Dividends)</option>
                                <option value="G">1099-G (Unemployment)</option>
                                <option value="R">1099-R (Retirement)</option>
                                <option value="SSA">SSA-1099 (Social Security)</option>
                              </select>
                              <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                <input type="number" value={form.amount || ''} onChange={(e) => update1099(form.id, 'amount', parseFloat(e.target.value) || 0)} className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded text-sm text-right" placeholder="Amount" />
                              </div>
                              <button onClick={() => remove1099(form.id)} className="text-red-500 hover:text-red-700 p-2"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={add1099} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2">
                      <Plus className="w-5 h-5" />ADD 1099 FORM
                    </button>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Other Income</h3>
                    <div className="space-y-3">
                      {[{ key: 'selfEmployment', label: 'Self-Employment Income' }, { key: 'rentalIncome', label: 'Rental Income' }, { key: 'capitalGains', label: 'Capital Gains' }, { key: 'alimonyReceived', label: 'Alimony Received (pre-2019)' }, { key: 'gambling', label: 'Gambling Winnings' }, { key: 'otherIncome', label: 'Other Income' }].map((field, idx) => (
                        <div key={field.key} className={`flex items-center justify-between py-2 px-3 rounded ${idx % 2 === 0 ? 'bg-blue-50/50' : ''}`}>
                          <label className="text-sm text-gray-700">{field.label}</label>
                          <div className="relative w-48"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <input type="number" value={otherIncome[field.key as keyof OtherIncome] || ''} onChange={(e) => setOtherIncome({ ...otherIncome, [field.key]: parseFloat(e.target.value) || 0 })} className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded text-sm text-right" placeholder="0" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Deductions Tab */}
              {activeTab === 'deductions' && (
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Deduction Type</h3>
                    <div className="space-y-4">
                      <div className={`flex items-center gap-4 p-4 rounded-lg ${!deductions.useItemized ? 'bg-blue-50 border-2 border-blue-500' : 'border border-gray-200'}`}>
                        <input type="radio" id="standard" checked={!deductions.useItemized} onChange={() => setDeductions({ ...deductions, useItemized: false })} className="w-5 h-5 text-blue-600" />
                        <label htmlFor="standard" className="flex-1">
                          <p className="font-medium text-gray-800">Standard Deduction</p>
                          <p className="text-sm text-gray-600">{formatCurrency(STANDARD_DEDUCTIONS_2025[personalInfo.filingStatus || 'single'])}</p>
                        </label>
                        {!deductions.useItemized && <CheckCircle className="w-6 h-6 text-green-600" />}
                      </div>
                      <div className={`flex items-center gap-4 p-4 rounded-lg ${deductions.useItemized ? 'bg-blue-50 border-2 border-blue-500' : 'border border-gray-200'}`}>
                        <input type="radio" id="itemized" checked={deductions.useItemized} onChange={() => setDeductions({ ...deductions, useItemized: true })} className="w-5 h-5 text-blue-600" />
                        <label htmlFor="itemized" className="flex-1">
                          <p className="font-medium text-gray-800">Itemized Deductions</p>
                          <p className="text-sm text-gray-600">Current: {formatCurrency(results.itemizedTotal)}</p>
                        </label>
                        {deductions.useItemized && <CheckCircle className="w-6 h-6 text-green-600" />}
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-4 pb-2 border-b border-gray-200">Above-the-Line Deductions</h3>
                    <div className="space-y-3">
                      {[{ key: 'studentLoanInterest', label: 'Student Loan Interest (max $2,500)' }, { key: 'educatorExpenses', label: 'Educator Expenses (max $300)' }, { key: 'hsaContributions', label: 'HSA Contributions' }, { key: 'iraContributions', label: 'IRA Contributions (max $7,000)' }].map((field, idx) => (
                        <div key={field.key} className={`flex items-center justify-between py-2 px-3 rounded ${idx % 2 === 0 ? 'bg-blue-50/50' : ''}`}>
                          <label className="text-sm text-gray-700">{field.label}</label>
                          <div className="relative w-48"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <input type="number" value={(deductions as any)[field.key] || ''} onChange={(e) => setDeductions({ ...deductions, [field.key]: parseFloat(e.target.value) || 0 })} className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded text-sm text-right" placeholder="0" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Itemized Deductions (Schedule A)</h3>
                    <div className="space-y-3">
                      {[{ key: 'medical', label: 'Medical Expenses (over 7.5% AGI)' }, { key: 'stateLocalTaxes', label: 'State & Local Taxes (max $10,000)' }, { key: 'mortgageInterest', label: 'Mortgage Interest' }, { key: 'charitableContributions', label: 'Charitable Contributions' }].map((field, idx) => (
                        <div key={field.key} className={`flex items-center justify-between py-2 px-3 rounded ${idx % 2 === 0 ? 'bg-blue-50/50' : ''}`}>
                          <label className="text-sm text-gray-700">{field.label}</label>
                          <div className="relative w-48"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <input type="number" value={(deductions as any)[field.key] || ''} onChange={(e) => setDeductions({ ...deductions, [field.key]: parseFloat(e.target.value) || 0 })} className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded text-sm text-right" placeholder="0" disabled={!deductions.useItemized} />
                          </div>
                        </div>
                      ))}
                    </div>
                    {!deductions.useItemized && <p className="mt-4 text-sm text-gray-500 italic">Select "Itemized Deductions" to enter these values.</p>}
                    {personalInfo.age >= 65 && (
                      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-600" /><p className="font-medium text-green-800">OBBBA Senior Bonus Applied!</p></div>
                        <p className="text-sm text-green-700 mt-1">Additional $4,000 deduction for taxpayers 65+</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Adjustments Tab */}
              {activeTab === 'adjustments' && (
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Tax Credits</h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-3">
                            <input type="checkbox" checked={adjustments.childTaxCredit} onChange={(e) => setAdjustments({ ...adjustments, childTaxCredit: e.target.checked })} className="w-5 h-5 rounded text-blue-600" />
                            <span className="text-sm font-medium text-gray-700">Child Tax Credit</span>
                          </label>
                          <span className="text-sm text-green-600 font-semibold">$2,200/child</span>
                        </div>
                        {adjustments.childTaxCredit && (
                          <div className="mt-3 flex items-center gap-3">
                            <label className="text-sm text-gray-600">Number of qualifying children:</label>
                            <input type="number" value={adjustments.childCount || ''} onChange={(e) => setAdjustments({ ...adjustments, childCount: parseInt(e.target.value) || 0 })} className="w-20 px-3 py-1 border border-gray-300 rounded text-sm text-center" min="0" />
                          </div>
                        )}
                      </div>
                      <div className="p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-3">
                            <input type="checkbox" checked={adjustments.earnedIncomeCredit} onChange={(e) => setAdjustments({ ...adjustments, earnedIncomeCredit: e.target.checked })} className="w-5 h-5 rounded text-blue-600" />
                            <span className="text-sm font-medium text-gray-700">Earned Income Credit (EIC)</span>
                          </label>
                          <span className="text-sm text-green-600 font-semibold">Up to $7,830</span>
                        </div>
                      </div>
                      <div className="p-4 bg-blue-50/50 rounded-lg">
                        <label className="text-sm font-medium text-gray-700 block mb-2">Child & Dependent Care Expenses</label>
                        <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                          <input type="number" value={adjustments.childCareExpenses || ''} onChange={(e) => setAdjustments({ ...adjustments, childCareExpenses: parseFloat(e.target.value) || 0 })} className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded text-sm" placeholder="0" />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Max $3,000 for 1 child, $6,000 for 2+</p>
                      </div>
                      <div className="p-4 rounded-lg">
                        <label className="text-sm font-medium text-gray-700 block mb-2">Residential Energy Credits</label>
                        <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                          <input type="number" value={adjustments.energyCredits || ''} onChange={(e) => setAdjustments({ ...adjustments, energyCredits: parseFloat(e.target.value) || 0 })} className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded text-sm" placeholder="0" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Credits Summary</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      {adjustments.childTaxCredit && adjustments.childCount > 0 && (
                        <div className="flex justify-between text-sm"><span className="text-gray-600">Child Tax Credit ({adjustments.childCount})</span><span className="font-medium text-green-600">{formatCurrency(adjustments.childCount * 2200)}</span></div>
                      )}
                      {adjustments.earnedIncomeCredit && <div className="flex justify-between text-sm"><span className="text-gray-600">Earned Income Credit</span><span className="font-medium text-green-600">Calculated</span></div>}
                      {adjustments.childCareExpenses > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">Child Care Credit</span><span className="font-medium text-green-600">Calculated</span></div>}
                      {adjustments.energyCredits > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">Energy Credits</span><span className="font-medium text-green-600">{formatCurrency(adjustments.energyCredits)}</span></div>}
                      <div className="border-t border-gray-300 pt-3 flex justify-between"><span className="font-semibold text-gray-800">Total Credits</span><span className="font-bold text-green-600">{formatCurrency(results.totalCredits)}</span></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Results Tab */}
              {activeTab === 'results' && (
                <div className="max-w-3xl mx-auto">
                  <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Your 2025 Tax Summary</h3>
                  <div className={`p-8 rounded-2xl text-center mb-8 ${results.refundOrOwed >= 0 ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-red-500 to-red-600'}`}>
                    <p className="text-white/80 text-lg">{results.refundOrOwed >= 0 ? 'Estimated Federal Refund' : 'Estimated Amount Owed'}</p>
                    <p className="text-5xl font-bold text-white mt-2">{formatCurrency(Math.abs(results.refundOrOwed))}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                      <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-blue-600" />Income Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-gray-600">Gross Income</span><span className="font-medium">{formatCurrency(results.grossIncome)}</span></div>
                        {results.tipsExemption > 0 && <div className="flex justify-between text-green-600"><span>Tips Exemption (OBBBA)</span><span>-{formatCurrency(results.tipsExemption)}</span></div>}
                        {results.overtimeExemption > 0 && <div className="flex justify-between text-green-600"><span>Overtime Exemption (OBBBA)</span><span>-{formatCurrency(results.overtimeExemption)}</span></div>}
                        <div className="flex justify-between border-t pt-2 font-semibold"><span>Adjusted Gross Income</span><span>{formatCurrency(results.agi)}</span></div>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                      <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" />Deductions</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-gray-600">{deductions.useItemized ? 'Itemized' : 'Standard'} Deduction</span><span className="font-medium">{formatCurrency(results.deductionUsed)}</span></div>
                        {results.seniorBonus > 0 && <div className="flex justify-between text-green-600"><span>Senior Bonus (OBBBA)</span><span>{formatCurrency(results.seniorBonus)}</span></div>}
                        <div className="flex justify-between border-t pt-2 font-semibold"><span>Taxable Income</span><span>{formatCurrency(results.taxableIncome)}</span></div>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                      <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Calculator className="w-5 h-5 text-blue-600" />Tax Calculation</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-gray-600">Federal Income Tax</span><span className="font-medium">{formatCurrency(results.federalTax)}</span></div>
                        {results.selfEmploymentTax > 0 && <div className="flex justify-between"><span className="text-gray-600">Self-Employment Tax</span><span>{formatCurrency(results.selfEmploymentTax)}</span></div>}
                        <div className="flex justify-between text-green-600"><span>Total Credits</span><span>-{formatCurrency(results.totalCredits)}</span></div>
                        <div className="flex justify-between border-t pt-2 font-semibold"><span>Total Tax</span><span>{formatCurrency(results.totalTax)}</span></div>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                      <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-blue-600" />Payments & Refund</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-gray-600">Federal Tax Withheld</span><span className="font-medium">{formatCurrency(results.totalWithheld)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Total Tax Owed</span><span>{formatCurrency(results.totalTax)}</span></div>
                        <div className="flex justify-between border-t pt-2 font-semibold"><span>{results.refundOrOwed >= 0 ? 'Refund' : 'Amount Owed'}</span><span className={results.refundOrOwed >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(Math.abs(results.refundOrOwed))}</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 text-center"><p className="text-gray-600">Effective Tax Rate: <span className="font-bold text-gray-800">{results.effectiveRate.toFixed(1)}%</span></p></div>
                  <div className="mt-8 flex gap-4 justify-center">
                    <Link to="/tax-return" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition">Start Full Tax Return</Link>
                    <button onClick={() => window.print()} className="px-8 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition">Print Summary</button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Navigation */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
              <button onClick={handleRestart} className="px-6 py-2 border-2 border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition flex items-center gap-2"><RefreshCw className="w-4 h-4" />RESTART</button>
              <div className="flex gap-3">
                {canGoBack && <button onClick={goBack} className="px-6 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition flex items-center gap-2"><ChevronLeft className="w-4 h-4" />BACK</button>}
                {canGoNext && <button onClick={goNext} className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center gap-2">NEXT<ChevronRight className="w-4 h-4" /></button>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
