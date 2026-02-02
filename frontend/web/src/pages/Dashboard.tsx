/**
 * GONZALES TAX PLATFORM - Dashboard
 * Agent Xiomara - Frontend/UX Master
 */
import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Calculator, Upload, Sparkles,
  ArrowRight, Plus, Clock, CheckCircle
} from 'lucide-react';

export default function Dashboard() {
  const returns = [
    { id: '1', year: 2025, status: 'in_progress', refund: 3250.00, updated: '2 hours ago' },
    { id: '2', year: 2024, status: 'accepted', refund: 2890.00, updated: 'Jan 15, 2025' },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome Back!</h1>
        <p className="mt-2 text-gray-600">
          Ready to maximize your refund? Let's get started.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link
          to="/returns/new"
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-6 transition-colors"
        >
          <Plus className="w-8 h-8 mb-3" />
          <h3 className="font-semibold text-lg">Start New Return</h3>
          <p className="text-blue-100 text-sm mt-1">File your 2025 taxes</p>
        </Link>

        <Link
          to="/quick-calc"
          className="bg-white hover:bg-gray-50 border-2 border-gray-200 rounded-xl p-6 transition-colors"
        >
          <Calculator className="w-8 h-8 mb-3 text-blue-600" />
          <h3 className="font-semibold text-lg text-gray-900">Quick Calculator</h3>
          <p className="text-gray-500 text-sm mt-1">Estimate your refund</p>
        </Link>

        <Link
          to="/documents"
          className="bg-white hover:bg-gray-50 border-2 border-gray-200 rounded-xl p-6 transition-colors"
        >
          <Upload className="w-8 h-8 mb-3 text-green-600" />
          <h3 className="font-semibold text-lg text-gray-900">Upload Documents</h3>
          <p className="text-gray-500 text-sm mt-1">W-2s, 1099s, and more</p>
        </Link>

        <Link
          to="/optimizer"
          className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white rounded-xl p-6 transition-colors"
        >
          <Sparkles className="w-8 h-8 mb-3" />
          <h3 className="font-semibold text-lg">AI Optimizer</h3>
          <p className="text-yellow-100 text-sm mt-1">Find missed deductions</p>
        </Link>
      </div>

      {/* OBBBA Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 mb-8 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6" />
              New for 2025: OBBBA Tax Savings
            </h2>
            <ul className="mt-3 space-y-1 text-blue-100">
              <li>• No Tax on Tips (up to $25,000)</li>
              <li>• No Tax on Overtime (up to $10,000)</li>
              <li>• Enhanced Child Tax Credit ($2,200/child)</li>
              <li>• Senior Deduction ($6,000 for 65+)</li>
              <li>• SALT Cap Increased to $40,000</li>
            </ul>
          </div>
          <Link
            to="/quick-calc"
            className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2"
          >
            Calculate Savings <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Tax Returns */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Your Tax Returns
          </h2>
          <Link
            to="/returns/new"
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> New Return
          </Link>
        </div>

        <div className="space-y-4">
          {returns.map((taxReturn) => (
            <Link
              key={taxReturn.id}
              to={`/returns/${taxReturn.id}`}
              className="block border rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${
                    taxReturn.status === 'accepted'
                      ? 'bg-green-100'
                      : 'bg-yellow-100'
                  }`}>
                    {taxReturn.status === 'accepted' ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <Clock className="w-6 h-6 text-yellow-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Tax Year {taxReturn.year}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {taxReturn.status === 'accepted' ? 'Accepted by IRS' : 'In Progress'}
                      {' • '}Updated {taxReturn.updated}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Estimated Refund</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(taxReturn.refund)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {returns.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No tax returns yet. Start your first one!</p>
          </div>
        )}
      </div>
    </div>
  );
}
