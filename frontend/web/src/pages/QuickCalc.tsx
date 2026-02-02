/**
 * GONZALES TAX PLATFORM - Quick Calculator Page
 * Agent Xiomara - Frontend/UX Master
 *
 * Fast tax estimate without creating a full return.
 * Includes OBBBA provisions (No Tax on Tips, Overtime, Senior Deduction).
 */
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calculator, DollarSign, Users, Sparkles } from 'lucide-react';

// Form validation schema
const quickCalcSchema = z.object({
  filingStatus: z.enum(['single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household']),
  w2Wages: z.number().min(0).default(0),
  federalWithheld: z.number().min(0).default(0),
  otherIncome: z.number().min(0).default(0),
  tipIncome: z.number().min(0).default(0),
  overtimeIncome: z.number().min(0).default(0),
  selfEmploymentIncome: z.number().min(0).default(0),
  numDependents: z.number().min(0).default(0),
  numChildrenCtc: z.number().min(0).default(0),
  itemizedDeductions: z.number().min(0).default(0),
  isSenior: z.boolean().default(false),
});

type QuickCalcForm = z.infer<typeof quickCalcSchema>;

interface CalcResult {
  grossIncome: number;
  adjustedGrossIncome: number;
  deductionAmount: number;
  deductionType: string;
  taxableIncome: number;
  taxLiability: number;
  childTaxCredit: number;
  tipsDeduction: number;
  overtimeDeduction: number;
  seniorDeduction: number;
  totalCredits: number;
  totalPayments: number;
  estimatedRefund: number;
  estimatedOwed: number;
  effectiveTaxRate: number;
  marginalTaxRate: number;
}

export default function QuickCalc() {
  const [result, setResult] = useState<CalcResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<QuickCalcForm>({
    resolver: zodResolver(quickCalcSchema),
    defaultValues: {
      filingStatus: 'single',
      w2Wages: 0,
      federalWithheld: 0,
      otherIncome: 0,
      tipIncome: 0,
      overtimeIncome: 0,
      selfEmploymentIncome: 0,
      numDependents: 0,
      numChildrenCtc: 0,
      itemizedDeductions: 0,
      isSenior: false,
    },
  });

  const watchedTips = watch('tipIncome');
  const watchedOvertime = watch('overtimeIncome');
  const watchedSenior = watch('isSenior');

  const onSubmit = async (data: QuickCalcForm) => {
    setIsCalculating(true);

    try {
      const response = await fetch('/api/v1/calculate/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filing_status: data.filingStatus,
          w2_wages: data.w2Wages,
          federal_withheld: data.federalWithheld,
          other_income: data.otherIncome,
          tip_income: data.tipIncome,
          overtime_income: data.overtimeIncome,
          self_employment_income: data.selfEmploymentIncome,
          num_dependents: data.numDependents,
          num_children_ctc: data.numChildrenCtc,
          itemized_deductions: data.itemizedDeductions,
          is_senior: data.isSenior,
        }),
      });

      const result = await response.json();
      setResult({
        grossIncome: result.gross_income,
        adjustedGrossIncome: result.adjusted_gross_income,
        deductionAmount: result.deduction_amount,
        deductionType: result.deduction_type,
        taxableIncome: result.taxable_income,
        taxLiability: result.tax_liability,
        childTaxCredit: result.child_tax_credit,
        tipsDeduction: result.tips_deduction,
        overtimeDeduction: result.overtime_deduction,
        seniorDeduction: result.senior_deduction,
        totalCredits: result.total_credits,
        totalPayments: result.total_payments,
        estimatedRefund: result.estimated_refund,
        estimatedOwed: result.estimated_owed,
        effectiveTaxRate: result.effective_tax_rate,
        marginalTaxRate: result.marginal_tax_rate,
      });
    } catch (error) {
      console.error('Calculation error:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Calculator className="w-8 h-8 text-blue-600" />
          Quick Tax Calculator
        </h1>
        <p className="mt-2 text-gray-600">
          Get a fast estimate of your tax refund or amount owed. Includes OBBBA provisions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Filing Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filing Status
              </label>
              <select
                {...register('filingStatus')}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="single">Single</option>
                <option value="married_filing_jointly">Married Filing Jointly</option>
                <option value="married_filing_separately">Married Filing Separately</option>
                <option value="head_of_household">Head of Household</option>
              </select>
            </div>

            {/* Income Section */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Income
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    W-2 Wages
                  </label>
                  <input
                    type="number"
                    {...register('w2Wages', { valueAsNumber: true })}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Federal Tax Withheld
                  </label>
                  <input
                    type="number"
                    {...register('federalWithheld', { valueAsNumber: true })}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Self-Employment Income
                  </label>
                  <input
                    type="number"
                    {...register('selfEmploymentIncome', { valueAsNumber: true })}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Other Income
                  </label>
                  <input
                    type="number"
                    {...register('otherIncome', { valueAsNumber: true })}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* OBBBA Section */}
            <div className="border-t pt-4 bg-gradient-to-r from-blue-50 to-green-50 -mx-6 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                OBBBA Tax Savings
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                One Big Beautiful Bill Act provisions - Save more on your taxes!
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tip Income (No Tax up to $25,000)
                  </label>
                  <input
                    type="number"
                    {...register('tipIncome', { valueAsNumber: true })}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  {watchedTips > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      Potential savings: {formatCurrency(Math.min(watchedTips, 25000) * 0.22)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Overtime Income (No Tax up to $10,000)
                  </label>
                  <input
                    type="number"
                    {...register('overtimeIncome', { valueAsNumber: true })}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  {watchedOvertime > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      Potential savings: {formatCurrency(Math.min(watchedOvertime, 10000) * 0.22)}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register('isSenior')}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Age 65 or older (+$6,000 Senior Deduction)
                  </span>
                </label>
                {watchedSenior && (
                  <p className="text-xs text-green-600 mt-1 ml-6">
                    Additional deduction: {formatCurrency(6000)}
                  </p>
                )}
              </div>
            </div>

            {/* Dependents */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Dependents
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Children under 17 (CTC: $2,200 each)
                  </label>
                  <input
                    type="number"
                    {...register('numChildrenCtc', { valueAsNumber: true })}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Other Dependents
                  </label>
                  <input
                    type="number"
                    {...register('numDependents', { valueAsNumber: true })}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Itemized Deductions (if greater than standard)
              </label>
              <input
                type="number"
                {...register('itemizedDeductions', { valueAsNumber: true })}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave at 0 to use standard deduction
              </p>
            </div>

            <button
              type="submit"
              disabled={isCalculating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-colors disabled:opacity-50"
            >
              {isCalculating ? 'Calculating...' : 'Calculate My Taxes'}
            </button>
          </form>
        </div>

        {/* Results */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Your Tax Estimate</h2>

          {result ? (
            <div className="space-y-6">
              {/* Refund/Owed Banner */}
              <div className={`p-6 rounded-xl ${
                result.estimatedRefund > 0
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                  : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
              }`}>
                <p className="text-sm opacity-90">
                  {result.estimatedRefund > 0 ? 'Estimated Refund' : 'Estimated Amount Owed'}
                </p>
                <p className="text-4xl font-bold mt-1">
                  {formatCurrency(result.estimatedRefund > 0 ? result.estimatedRefund : result.estimatedOwed)}
                </p>
              </div>

              {/* Income Breakdown */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Income</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gross Income</span>
                    <span className="font-medium">{formatCurrency(result.grossIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Adjusted Gross Income</span>
                    <span className="font-medium">{formatCurrency(result.adjustedGrossIncome)}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Deductions</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {result.deductionType === 'standard' ? 'Standard' : 'Itemized'} Deduction
                    </span>
                    <span className="font-medium">{formatCurrency(result.deductionAmount)}</span>
                  </div>
                  {result.tipsDeduction > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>No Tax on Tips (OBBBA)</span>
                      <span className="font-medium">{formatCurrency(result.tipsDeduction)}</span>
                    </div>
                  )}
                  {result.overtimeDeduction > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>No Tax on Overtime (OBBBA)</span>
                      <span className="font-medium">{formatCurrency(result.overtimeDeduction)}</span>
                    </div>
                  )}
                  {result.seniorDeduction > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Senior Deduction (OBBBA)</span>
                      <span className="font-medium">{formatCurrency(result.seniorDeduction)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tax Calculation */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Tax Calculation</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Taxable Income</span>
                    <span className="font-medium">{formatCurrency(result.taxableIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax Liability</span>
                    <span className="font-medium">{formatCurrency(result.taxLiability)}</span>
                  </div>
                  {result.childTaxCredit > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Child Tax Credit (OBBBA)</span>
                      <span className="font-medium">-{formatCurrency(result.childTaxCredit)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Payments</span>
                    <span className="font-medium">{formatCurrency(result.totalPayments)}</span>
                  </div>
                </div>
              </div>

              {/* Tax Rates */}
              <div className="flex justify-between text-sm bg-gray-50 rounded-lg p-4">
                <div>
                  <p className="text-gray-600">Effective Tax Rate</p>
                  <p className="text-xl font-bold text-gray-900">{result.effectiveTaxRate.toFixed(1)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-600">Marginal Tax Rate</p>
                  <p className="text-xl font-bold text-gray-900">{result.marginalTaxRate.toFixed(0)}%</p>
                </div>
              </div>

              <button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-colors">
                Start Full Tax Return
              </button>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Calculator className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>Enter your information and click Calculate to see your estimate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
