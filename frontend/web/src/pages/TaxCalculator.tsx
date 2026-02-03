import { useState, useEffect, useMemo } from 'react';

// Tax bracket data for 2025 with OBBBA updates
const TAX_BRACKETS_2025 = {
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
  married_filing_separately: [
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
};

const STANDARD_DEDUCTIONS_2025 = {
  single: 15000,
  married_filing_jointly: 30000,
  married_filing_separately: 15000,
  head_of_household: 22500,
};

// OBBBA 2025 Provisions
const OBBBA_2025 = {
  CHILD_TAX_CREDIT: 2200,
  TIPS_DEDUCTION_MAX: 25000,
  OVERTIME_DEDUCTION_MAX: 10000,
  SENIOR_DEDUCTION: 6000,
  SALT_CAP: 40000,
  SENIOR_ADDITIONAL_DEDUCTION: 1650, // Additional for 65+
};

interface TaxInput {
  // Personal Info
  filingStatus: keyof typeof TAX_BRACKETS_2025;
  age: number;
  spouseAge: number;
  dependents: number;
  childrenUnder17: number;

  // Income
  wages: number;
  tipIncome: number;
  overtimeWages: number;
  interestIncome: number;
  dividendIncome: number;
  capitalGains: number;
  businessIncome: number;
  socialSecurity: number;
  otherIncome: number;

  // Deductions
  useItemized: boolean;
  stateLocalTaxes: number;
  propertyTax: number;
  mortgageInterest: number;
  charitableCash: number;
  charitableNonCash: number;
  medicalExpenses: number;
  studentLoanInterest: number;
  educatorExpenses: number;
  hsaContributions: number;
  iraContributions: number;
  retirement401k: number;

  // Withholdings & Payments
  federalWithholding: number;
  estimatedPayments: number;

  // Bank Info for Refund
  routingNumber: string;
  accountNumber: string;
  accountType: 'checking' | 'savings';
}

interface TaxCalculation {
  grossIncome: number;
  adjustments: number;
  agi: number;
  deductions: number;
  obbbaSavings: {
    tipsDeduction: number;
    overtimeDeduction: number;
    seniorDeduction: number;
    total: number;
  };
  taxableIncome: number;
  taxBeforeCredits: number;
  credits: {
    childTaxCredit: number;
    earnedIncomeCredit: number;
    otherCredits: number;
    total: number;
  };
  totalTax: number;
  totalPayments: number;
  refundOrOwed: number;
  effectiveRate: number;
  marginalRate: number;
}

const initialInput: TaxInput = {
  filingStatus: 'single',
  age: 35,
  spouseAge: 0,
  dependents: 0,
  childrenUnder17: 0,
  wages: 0,
  tipIncome: 0,
  overtimeWages: 0,
  interestIncome: 0,
  dividendIncome: 0,
  capitalGains: 0,
  businessIncome: 0,
  socialSecurity: 0,
  otherIncome: 0,
  useItemized: false,
  stateLocalTaxes: 0,
  propertyTax: 0,
  mortgageInterest: 0,
  charitableCash: 0,
  charitableNonCash: 0,
  medicalExpenses: 0,
  studentLoanInterest: 0,
  educatorExpenses: 0,
  hsaContributions: 0,
  iraContributions: 0,
  retirement401k: 0,
  federalWithholding: 0,
  estimatedPayments: 0,
  routingNumber: '',
  accountNumber: '',
  accountType: 'checking',
};

function calculateTax(brackets: typeof TAX_BRACKETS_2025.single, income: number): number {
  let tax = 0;
  for (const bracket of brackets) {
    if (income <= bracket.min) break;
    const taxableInBracket = Math.min(income, bracket.max) - bracket.min;
    tax += taxableInBracket * bracket.rate;
  }
  return tax;
}

function getMarginalRate(brackets: typeof TAX_BRACKETS_2025.single, income: number): number {
  for (const bracket of brackets) {
    if (income <= bracket.max) {
      return bracket.rate;
    }
  }
  return brackets[brackets.length - 1].rate;
}

export default function TaxCalculator() {
  const [input, setInput] = useState<TaxInput>(initialInput);
  const [activeStep, setActiveStep] = useState(0);

  const calculation = useMemo((): TaxCalculation => {
    // Calculate Gross Income
    const grossIncome =
      input.wages +
      input.tipIncome +
      input.overtimeWages +
      input.interestIncome +
      input.dividendIncome +
      input.capitalGains +
      input.businessIncome +
      Math.max(0, input.socialSecurity * 0.85) + // Up to 85% taxable
      input.otherIncome;

    // Calculate Adjustments (Above-the-line deductions)
    const adjustments =
      Math.min(input.studentLoanInterest, 2500) +
      Math.min(input.educatorExpenses, 300) +
      input.hsaContributions +
      Math.min(input.iraContributions, 7000) + // 2025 limit
      input.retirement401k;

    // Calculate AGI
    const agi = Math.max(0, grossIncome - adjustments);

    // Calculate OBBBA Savings
    const obbbaSavings = {
      tipsDeduction: Math.min(input.tipIncome, OBBBA_2025.TIPS_DEDUCTION_MAX),
      overtimeDeduction: Math.min(input.overtimeWages, OBBBA_2025.OVERTIME_DEDUCTION_MAX),
      seniorDeduction: input.age >= 65 ? OBBBA_2025.SENIOR_DEDUCTION : 0,
      total: 0,
    };
    obbbaSavings.total =
      obbbaSavings.tipsDeduction +
      obbbaSavings.overtimeDeduction +
      obbbaSavings.seniorDeduction;

    // Calculate Deductions
    let standardDeduction = STANDARD_DEDUCTIONS_2025[input.filingStatus];

    // Add senior additional deduction
    if (input.age >= 65) {
      standardDeduction += OBBBA_2025.SENIOR_ADDITIONAL_DEDUCTION;
    }
    if (input.filingStatus === 'married_filing_jointly' && input.spouseAge >= 65) {
      standardDeduction += OBBBA_2025.SENIOR_ADDITIONAL_DEDUCTION;
    }

    // Calculate Itemized Deductions
    const saltCapped = Math.min(
      input.stateLocalTaxes + input.propertyTax,
      OBBBA_2025.SALT_CAP
    );
    const medicalDeductible = Math.max(0, input.medicalExpenses - agi * 0.075);
    const itemizedDeductions =
      saltCapped +
      input.mortgageInterest +
      input.charitableCash +
      input.charitableNonCash +
      medicalDeductible;

    const deductions = input.useItemized
      ? Math.max(itemizedDeductions, standardDeduction)
      : standardDeduction;

    // Calculate Taxable Income (with OBBBA deductions)
    const taxableIncome = Math.max(0, agi - deductions - obbbaSavings.total);

    // Calculate Tax
    const brackets = TAX_BRACKETS_2025[input.filingStatus];
    const taxBeforeCredits = calculateTax(brackets, taxableIncome);
    const marginalRate = getMarginalRate(brackets, taxableIncome);

    // Calculate Credits
    const childTaxCredit = input.childrenUnder17 * OBBBA_2025.CHILD_TAX_CREDIT;

    // Simplified EIC (would need full calculation tables in production)
    let earnedIncomeCredit = 0;
    const earnedIncome = input.wages + input.tipIncome + input.overtimeWages;
    if (input.filingStatus !== 'married_filing_separately' && agi < 60000) {
      if (input.childrenUnder17 >= 3 && earnedIncome < 60000) {
        earnedIncomeCredit = Math.min(7830, earnedIncome * 0.45);
      } else if (input.childrenUnder17 === 2 && earnedIncome < 55000) {
        earnedIncomeCredit = Math.min(6960, earnedIncome * 0.40);
      } else if (input.childrenUnder17 === 1 && earnedIncome < 50000) {
        earnedIncomeCredit = Math.min(4213, earnedIncome * 0.34);
      }
    }

    const credits = {
      childTaxCredit,
      earnedIncomeCredit,
      otherCredits: 0,
      total: childTaxCredit + earnedIncomeCredit,
    };

    // Calculate Final Tax
    const totalTax = Math.max(0, taxBeforeCredits - credits.total);

    // Calculate Payments
    const totalPayments = input.federalWithholding + input.estimatedPayments;

    // Calculate Refund or Amount Owed
    const refundOrOwed = totalPayments - totalTax;

    // Calculate Effective Rate
    const effectiveRate = grossIncome > 0 ? (totalTax / grossIncome) * 100 : 0;

    return {
      grossIncome,
      adjustments,
      agi,
      deductions,
      obbbaSavings,
      taxableIncome,
      taxBeforeCredits,
      credits,
      totalTax,
      totalPayments,
      refundOrOwed,
      effectiveRate,
      marginalRate: marginalRate * 100,
    };
  }, [input]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleInputChange = (field: keyof TaxInput, value: string | number | boolean) => {
    setInput(prev => ({
      ...prev,
      [field]: typeof value === 'string' && field !== 'filingStatus' && field !== 'routingNumber' && field !== 'accountNumber' && field !== 'accountType'
        ? parseFloat(value) || 0
        : value,
    }));
  };

  const steps = [
    { title: 'Personal Info', icon: '👤' },
    { title: 'Income', icon: '💰' },
    { title: 'Deductions', icon: '📋' },
    { title: 'Credits & Payments', icon: '💳' },
    { title: 'Review', icon: '✅' },
  ];

  const InputField = ({ label, field, prefix = '$', max }: {
    label: string;
    field: keyof TaxInput;
    prefix?: string;
    max?: number;
  }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-2 text-gray-500">{prefix}</span>
        )}
        <input
          type="number"
          value={input[field] as number || ''}
          onChange={(e) => handleInputChange(field, e.target.value)}
          max={max}
          className={`w-full border border-gray-300 rounded-lg py-2 ${prefix ? 'pl-8' : 'pl-3'} pr-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          placeholder="0"
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-6">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-2xl font-bold">Tax Calculator 2025</h1>
          <p className="text-blue-100">With OBBBA Tax Savings Provisions</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Input Forms */}
          <div className="lg:col-span-2">
            {/* Step Navigation */}
            <div className="flex justify-between mb-8">
              {steps.map((step, index) => (
                <button
                  key={index}
                  onClick={() => setActiveStep(index)}
                  className={`flex flex-col items-center p-2 rounded-lg transition ${
                    activeStep === index
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-2xl mb-1">{step.icon}</span>
                  <span className="text-xs font-medium">{step.title}</span>
                </button>
              ))}
            </div>

            {/* Step Content */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              {activeStep === 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Personal Information</h2>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filing Status</label>
                    <select
                      value={input.filingStatus}
                      onChange={(e) => handleInputChange('filingStatus', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="single">Single</option>
                      <option value="married_filing_jointly">Married Filing Jointly</option>
                      <option value="married_filing_separately">Married Filing Separately</option>
                      <option value="head_of_household">Head of Household</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="Your Age" field="age" prefix="" />
                    {input.filingStatus === 'married_filing_jointly' && (
                      <InputField label="Spouse Age" field="spouseAge" prefix="" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="Total Dependents" field="dependents" prefix="" />
                    <InputField label="Children Under 17" field="childrenUnder17" prefix="" max={input.dependents} />
                  </div>

                  {input.age >= 65 && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-green-800 font-medium">🎉 OBBBA Senior Benefit Unlocked!</p>
                      <p className="text-sm text-green-700">You qualify for the $6,000 Senior Citizens Deduction</p>
                    </div>
                  )}
                </div>
              )}

              {activeStep === 1 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Income</h2>

                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="W-2 Wages" field="wages" />
                    <InputField label="Tip Income" field="tipIncome" />
                  </div>

                  {input.tipIncome > 0 && (
                    <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-green-800 font-medium">💵 No Tax on Tips!</p>
                      <p className="text-sm text-green-700">
                        Up to ${Math.min(input.tipIncome, OBBBA_2025.TIPS_DEDUCTION_MAX).toLocaleString()} of your tips are tax-free under OBBBA
                      </p>
                    </div>
                  )}

                  <InputField label="Overtime Wages" field="overtimeWages" />

                  {input.overtimeWages > 0 && (
                    <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-green-800 font-medium">⏰ Overtime Tax Savings!</p>
                      <p className="text-sm text-green-700">
                        Up to ${Math.min(input.overtimeWages, OBBBA_2025.OVERTIME_DEDUCTION_MAX).toLocaleString()} overtime deduction under OBBBA
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="Interest Income" field="interestIncome" />
                    <InputField label="Dividend Income" field="dividendIncome" />
                    <InputField label="Capital Gains" field="capitalGains" />
                    <InputField label="Business Income" field="businessIncome" />
                    <InputField label="Social Security" field="socialSecurity" />
                    <InputField label="Other Income" field="otherIncome" />
                  </div>
                </div>
              )}

              {activeStep === 2 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Deductions</h2>

                  <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-blue-900">Standard Deduction</p>
                        <p className="text-sm text-blue-700">
                          {formatCurrency(STANDARD_DEDUCTIONS_2025[input.filingStatus])}
                          {input.age >= 65 && ` + ${formatCurrency(OBBBA_2025.SENIOR_ADDITIONAL_DEDUCTION)} (65+)`}
                        </p>
                      </div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={input.useItemized}
                          onChange={(e) => handleInputChange('useItemized', e.target.checked)}
                          className="mr-2 h-4 w-4 text-blue-600"
                        />
                        <span className="text-sm">Itemize Instead</span>
                      </label>
                    </div>
                  </div>

                  {input.useItemized && (
                    <>
                      <h3 className="font-medium text-gray-700 mb-3">State & Local Taxes (SALT - Capped at $40,000)</h3>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <InputField label="State/Local Income Tax" field="stateLocalTaxes" />
                        <InputField label="Property Tax" field="propertyTax" />
                      </div>

                      <h3 className="font-medium text-gray-700 mb-3">Other Itemized Deductions</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <InputField label="Mortgage Interest" field="mortgageInterest" />
                        <InputField label="Medical Expenses" field="medicalExpenses" />
                        <InputField label="Charitable (Cash)" field="charitableCash" />
                        <InputField label="Charitable (Non-Cash)" field="charitableNonCash" />
                      </div>
                    </>
                  )}

                  <h3 className="font-medium text-gray-700 mb-3 mt-6">Above-the-Line Deductions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="Student Loan Interest" field="studentLoanInterest" />
                    <InputField label="Educator Expenses" field="educatorExpenses" />
                    <InputField label="HSA Contributions" field="hsaContributions" />
                    <InputField label="IRA Contributions" field="iraContributions" />
                    <InputField label="401(k) Contributions" field="retirement401k" />
                  </div>
                </div>
              )}

              {activeStep === 3 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Withholdings & Payments</h2>

                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="Federal Tax Withheld (from W-2)" field="federalWithholding" />
                    <InputField label="Estimated Tax Payments" field="estimatedPayments" />
                  </div>

                  <h3 className="font-medium text-gray-700 mb-3 mt-6">Direct Deposit Info (for Refund)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Routing Number</label>
                      <input
                        type="text"
                        value={input.routingNumber}
                        onChange={(e) => handleInputChange('routingNumber', e.target.value)}
                        maxLength={9}
                        className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500"
                        placeholder="123456789"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                      <input
                        type="text"
                        value={input.accountNumber}
                        onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500"
                        placeholder="Account Number"
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                    <select
                      value={input.accountType}
                      onChange={(e) => handleInputChange('accountType', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                    </select>
                  </div>
                </div>
              )}

              {activeStep === 4 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Review Your Return</h2>

                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-medium text-gray-700 mb-2">Income Summary</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-gray-600">Gross Income:</span>
                        <span className="text-right font-medium">{formatCurrency(calculation.grossIncome)}</span>
                        <span className="text-gray-600">Adjustments:</span>
                        <span className="text-right font-medium">-{formatCurrency(calculation.adjustments)}</span>
                        <span className="text-gray-600 font-medium">AGI:</span>
                        <span className="text-right font-bold">{formatCurrency(calculation.agi)}</span>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-medium text-gray-700 mb-2">Deductions</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-gray-600">{input.useItemized ? 'Itemized' : 'Standard'} Deduction:</span>
                        <span className="text-right font-medium">{formatCurrency(calculation.deductions)}</span>
                      </div>
                    </div>

                    {calculation.obbbaSavings.total > 0 && (
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <h3 className="font-medium text-green-800 mb-2">🎉 OBBBA Tax Savings</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {calculation.obbbaSavings.tipsDeduction > 0 && (
                            <>
                              <span className="text-green-700">No Tax on Tips:</span>
                              <span className="text-right font-medium text-green-800">{formatCurrency(calculation.obbbaSavings.tipsDeduction)}</span>
                            </>
                          )}
                          {calculation.obbbaSavings.overtimeDeduction > 0 && (
                            <>
                              <span className="text-green-700">Overtime Deduction:</span>
                              <span className="text-right font-medium text-green-800">{formatCurrency(calculation.obbbaSavings.overtimeDeduction)}</span>
                            </>
                          )}
                          {calculation.obbbaSavings.seniorDeduction > 0 && (
                            <>
                              <span className="text-green-700">Senior Deduction:</span>
                              <span className="text-right font-medium text-green-800">{formatCurrency(calculation.obbbaSavings.seniorDeduction)}</span>
                            </>
                          )}
                          <span className="text-green-800 font-medium pt-2 border-t border-green-200">Total OBBBA Savings:</span>
                          <span className="text-right font-bold text-green-800 pt-2 border-t border-green-200">{formatCurrency(calculation.obbbaSavings.total)}</span>
                        </div>
                      </div>
                    )}

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-medium text-gray-700 mb-2">Tax Calculation</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-gray-600">Taxable Income:</span>
                        <span className="text-right font-medium">{formatCurrency(calculation.taxableIncome)}</span>
                        <span className="text-gray-600">Tax Before Credits:</span>
                        <span className="text-right font-medium">{formatCurrency(calculation.taxBeforeCredits)}</span>
                        <span className="text-gray-600">Credits:</span>
                        <span className="text-right font-medium text-green-600">-{formatCurrency(calculation.credits.total)}</span>
                        <span className="text-gray-600 font-medium">Total Tax:</span>
                        <span className="text-right font-bold">{formatCurrency(calculation.totalTax)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                  disabled={activeStep === 0}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  ← Previous
                </button>
                {activeStep < steps.length - 1 ? (
                  <button
                    onClick={() => setActiveStep(activeStep + 1)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    File Return
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Live Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-4">
              <h3 className="text-lg font-semibold mb-4">Tax Summary</h3>

              {/* Refund or Owed */}
              <div className={`p-4 rounded-lg mb-6 ${
                calculation.refundOrOwed >= 0
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`text-sm ${calculation.refundOrOwed >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {calculation.refundOrOwed >= 0 ? 'Estimated Refund' : 'Amount Owed'}
                </p>
                <p className={`text-3xl font-bold ${calculation.refundOrOwed >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(Math.abs(calculation.refundOrOwed))}
                </p>
              </div>

              {/* Key Metrics */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Effective Tax Rate</span>
                  <span className="font-medium">{calculation.effectiveRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Marginal Rate</span>
                  <span className="font-medium">{calculation.marginalRate.toFixed(0)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Tax</span>
                  <span className="font-medium">{formatCurrency(calculation.totalTax)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Payments Made</span>
                  <span className="font-medium">{formatCurrency(calculation.totalPayments)}</span>
                </div>
              </div>

              {/* Credits Breakdown */}
              {calculation.credits.total > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Credits Applied</h4>
                  <div className="space-y-1 text-sm">
                    {calculation.credits.childTaxCredit > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Child Tax Credit ({input.childrenUnder17})</span>
                        <span>{formatCurrency(calculation.credits.childTaxCredit)}</span>
                      </div>
                    )}
                    {calculation.credits.earnedIncomeCredit > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Earned Income Credit</span>
                        <span>{formatCurrency(calculation.credits.earnedIncomeCredit)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* OBBBA Savings */}
              {calculation.obbbaSavings.total > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <h4 className="text-sm font-medium text-green-700 mb-2">💰 OBBBA Savings</h4>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(calculation.obbbaSavings.total * calculation.marginalRate / 100)}
                  </p>
                  <p className="text-xs text-gray-500">in tax savings</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
