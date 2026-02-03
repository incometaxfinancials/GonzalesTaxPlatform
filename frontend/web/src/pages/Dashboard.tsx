/**
 * ITF - Income. Tax. Financials - Interactive Dashboard
 * Personalized, automated, and user-adaptive
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, Calculator, Upload, Sparkles, ArrowRight, Plus, Clock, CheckCircle,
  ArrowLeft, Trash2, Edit, AlertCircle, User, DollarSign, TrendingUp,
  Bell, Settings, LogOut, ChevronRight, X, Check, RefreshCw, Zap,
  Calendar, CreditCard, Building, Briefcase, Home, Heart, GraduationCap, Users
} from 'lucide-react';

// User Profile Interface
interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  filingStatus: string;
  age: number;
  occupation: string;
  hasSpouse: boolean;
  dependents: number;
  childrenUnder17: number;
  isServiceWorker: boolean;
  hasTips: boolean;
  hasOvertime: boolean;
  isSenior: boolean;
  state: string;
  lastLogin: Date;
}

// Tax Return Interface
interface TaxReturn {
  id: string;
  year: number;
  status: 'draft' | 'in_progress' | 'review' | 'submitted' | 'accepted' | 'rejected';
  refund: number;
  amountOwed: number;
  updated: string;
  progress: number;
  obbbaSavings: number;
}

// Document Interface
interface Document {
  id: string;
  name: string;
  type: 'W2' | '1099' | 'K1' | 'Other';
  employer?: string;
  uploadedAt: string;
  processed: boolean;
  amount?: number;
}

// Notification Interface
interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'action';
  title: string;
  message: string;
  actionText?: string;
  actionLink?: string;
  dismissible: boolean;
  timestamp: Date;
}

// Mock initial data - would come from API in production
const mockUser: UserProfile = {
  id: '1',
  firstName: 'Alex',
  lastName: 'Johnson',
  email: 'alex.johnson@email.com',
  filingStatus: 'single',
  age: 32,
  occupation: 'Restaurant Server',
  hasSpouse: false,
  dependents: 0,
  childrenUnder17: 0,
  isServiceWorker: true,
  hasTips: true,
  hasOvertime: true,
  isSenior: false,
  state: 'TX',
  lastLogin: new Date()
};

export default function Dashboard() {
  const navigate = useNavigate();

  // State Management
  const [user, setUser] = useState<UserProfile>(mockUser);
  const [returns, setReturns] = useState<TaxReturn[]>([
    { id: '1', year: 2025, status: 'in_progress', refund: 4850.00, amountOwed: 0, updated: '2 hours ago', progress: 65, obbbaSavings: 2150 },
    { id: '2', year: 2024, status: 'accepted', refund: 2890.00, amountOwed: 0, updated: 'Jan 15, 2025', progress: 100, obbbaSavings: 0 },
  ]);
  const [documents, setDocuments] = useState<Document[]>([
    { id: '1', name: 'W-2 Olive Garden', type: 'W2', employer: 'Olive Garden', uploadedAt: '2 days ago', processed: true, amount: 42500 },
    { id: '2', name: '1099-NEC Freelance', type: '1099', uploadedAt: '1 week ago', processed: true, amount: 8500 },
  ]);
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: '1', type: 'success', title: 'OBBBA Savings Found!', message: 'Based on your tips income, you qualify for up to $25,000 in tax-free tips.', dismissible: true, timestamp: new Date() },
    { id: '2', type: 'action', title: 'Complete Your Return', message: 'Your 2025 return is 65% complete. Finish to see your final refund.', actionText: 'Continue', actionLink: '/returns/1', dismissible: false, timestamp: new Date() },
  ]);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'return' | 'document' | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Computed personalized recommendations
  const personalizedRecommendations = React.useMemo(() => {
    const recs: { icon: React.ElementType; title: string; description: string; savings?: number; action: string; link: string }[] = [];

    if (user.hasTips) {
      recs.push({
        icon: DollarSign,
        title: 'No Tax on Tips',
        description: 'As a service worker, your tips up to $25,000 are tax-free!',
        savings: Math.min(25000, 15000) * 0.22, // Assume $15k tips, 22% bracket
        action: 'Claim Deduction',
        link: '/returns/1'
      });
    }

    if (user.hasOvertime) {
      recs.push({
        icon: Clock,
        title: 'No Tax on Overtime',
        description: 'Your overtime wages up to $10,000 are deductible.',
        savings: Math.min(10000, 5000) * 0.22,
        action: 'Apply Savings',
        link: '/returns/1'
      });
    }

    if (user.isSenior) {
      recs.push({
        icon: Heart,
        title: 'Senior Citizen Deduction',
        description: 'You qualify for an additional $6,000 deduction.',
        savings: 6000 * 0.22,
        action: 'Add Deduction',
        link: '/returns/1'
      });
    }

    if (user.childrenUnder17 > 0) {
      recs.push({
        icon: User,
        title: 'Child Tax Credit',
        description: `$2,200 credit for each of your ${user.childrenUnder17} qualifying children.`,
        savings: user.childrenUnder17 * 2200,
        action: 'Claim Credit',
        link: '/returns/1'
      });
    }

    return recs;
  }, [user]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
  };

  // Handle delete
  const handleDelete = (id: string, type: 'return' | 'document') => {
    setShowDeleteModal(id);
    setDeleteType(type);
  };

  const confirmDelete = () => {
    if (deleteType === 'return') {
      setReturns(returns.filter(r => r.id !== showDeleteModal));
    } else if (deleteType === 'document') {
      setDocuments(documents.filter(d => d.id !== showDeleteModal));
    }
    setShowDeleteModal(null);
    setDeleteType(null);
  };

  // Dismiss notification
  const dismissNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  // Refresh all data
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      // Simulate fetching fresh data from API
      setReturns([
        { id: '1', year: 2025, status: 'in_progress', refund: 4850.00, amountOwed: 0, updated: 'Just now', progress: 65, obbbaSavings: 2150 },
        { id: '2', year: 2024, status: 'accepted', refund: 2890.00, amountOwed: 0, updated: 'Jan 15, 2025', progress: 100, obbbaSavings: 0 },
      ]);
      setDocuments([
        { id: '1', name: 'W-2 Olive Garden', type: 'W2', employer: 'Olive Garden', uploadedAt: '2 days ago', processed: true, amount: 42500 },
        { id: '2', name: '1099-NEC Freelance', type: '1099', uploadedAt: '1 week ago', processed: true, amount: 8500 },
      ]);
      setNotifications([
        { id: '1', type: 'success', title: 'OBBBA Savings Found!', message: 'Based on your tips income, you qualify for up to $25,000 in tax-free tips.', dismissible: true, timestamp: new Date(), actionText: 'View Savings', actionLink: '/optimizer' },
        { id: '2', type: 'action', title: 'Complete Your Return', message: 'Your 2025 return is 65% complete. Finish to see your final refund.', actionText: 'Continue', actionLink: '/returns/1', dismissible: false, timestamp: new Date() },
      ]);
      setIsRefreshing(false);
    }, 1000);
  };

  // Get status color
  const getStatusColor = (status: TaxReturn['status']) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-700';
      case 'submitted': return 'bg-blue-100 text-blue-700';
      case 'in_progress': return 'bg-yellow-100 text-yellow-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: TaxReturn['status']) => {
    switch (status) {
      case 'accepted': return 'Accepted by IRS';
      case 'submitted': return 'Submitted';
      case 'in_progress': return 'In Progress';
      case 'review': return 'Ready for Review';
      case 'rejected': return 'Rejected';
      default: return 'Draft';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left - Logo & Back */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900 transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Link to="/" className="flex items-center gap-2">
                <svg viewBox="0 0 60 40" className="w-10 h-7">
                  <defs>
                    <linearGradient id="dashBlue" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#2c4a7c" />
                      <stop offset="100%" stopColor="#1e3a5f" />
                    </linearGradient>
                    <linearGradient id="dashGreen" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6BBF59" />
                      <stop offset="100%" stopColor="#4CAF50" />
                    </linearGradient>
                  </defs>
                  <rect x="5" y="8" width="7" height="24" rx="1" fill="url(#dashBlue)" />
                  <rect x="16" y="12" width="7" height="20" rx="1" fill="url(#dashBlue)" />
                  <rect x="13" y="8" width="13" height="6" rx="1" fill="url(#dashBlue)" />
                  <path d="M14 15 L18 21 L29 6" stroke="url(#dashGreen)" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="33" y="8" width="7" height="24" rx="1" fill="url(#dashBlue)" />
                  <rect x="33" y="8" width="11" height="5" rx="1" fill="url(#dashBlue)" />
                  <rect x="33" y="17" width="9" height="4" rx="1" fill="url(#dashBlue)" />
                  <ellipse cx="25" cy="35" rx="22" ry="4" fill="none" stroke="url(#dashGreen)" strokeWidth="2" />
                </svg>
                <span className="font-bold text-lg" style={{ color: '#1e3a5f' }}>ITF</span>
              </Link>
            </div>

            {/* Right - User Menu */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleRefresh}
                className={`p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition ${isRefreshing ? 'animate-spin' : ''}`}
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 relative"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.map(notif => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            if (notif.actionLink) {
                              navigate(notif.actionLink);
                              setShowNotifications(false);
                            }
                          }}
                          className={`px-4 py-3 border-b hover:bg-gray-50 cursor-pointer ${
                            notif.type === 'success' ? 'bg-green-50' :
                            notif.type === 'action' ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-1.5 rounded-lg ${
                              notif.type === 'success' ? 'bg-green-100' :
                              notif.type === 'action' ? 'bg-blue-100' :
                              notif.type === 'warning' ? 'bg-yellow-100' : 'bg-gray-100'
                            }`}>
                              {notif.type === 'success' ? <CheckCircle className="w-4 h-4 text-green-600" /> :
                               notif.type === 'action' ? <Zap className="w-4 h-4 text-blue-600" /> :
                               notif.type === 'warning' ? <AlertCircle className="w-4 h-4 text-yellow-600" /> :
                               <Bell className="w-4 h-4 text-gray-600" />}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 text-sm">{notif.title}</p>
                              <p className="text-xs text-gray-600 mt-0.5">{notif.message}</p>
                              {notif.actionText && (
                                <p className="text-xs font-medium text-blue-600 mt-1">{notif.actionText} →</p>
                              )}
                            </div>
                            {notif.dismissible && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  dismissNotification(notif.id);
                                }}
                                className="p-1 hover:bg-gray-200 rounded text-gray-400"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {notifications.length === 0 && (
                        <div className="px-4 py-8 text-center text-gray-500">
                          <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No notifications</p>
                        </div>
                      )}
                    </div>
                    <div className="px-4 py-2 border-t bg-gray-50">
                      <button
                        onClick={() => {
                          navigate('/optimizer');
                          setShowNotifications(false);
                        }}
                        className="text-sm font-medium w-full text-center"
                        style={{ color: '#1e3a5f' }}
                      >
                        View AI Optimizer
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowProfileEdit(true)}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg, #1e3a5f, #4CAF50)' }}>
                  {user.firstName[0]}{user.lastName[0]}
                </div>
                <span className="hidden md:block font-medium text-gray-700">{user.firstName}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="space-y-3 mb-6">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`rounded-xl p-4 flex items-start gap-4 ${
                  notification.type === 'success' ? 'bg-green-50 border border-green-200' :
                  notification.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                  notification.type === 'action' ? 'bg-blue-50 border border-blue-200' :
                  'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  notification.type === 'success' ? 'bg-green-100' :
                  notification.type === 'warning' ? 'bg-yellow-100' :
                  notification.type === 'action' ? 'bg-blue-100' :
                  'bg-gray-100'
                }`}>
                  {notification.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-600" /> :
                   notification.type === 'warning' ? <AlertCircle className="w-5 h-5 text-yellow-600" /> :
                   notification.type === 'action' ? <Zap className="w-5 h-5 text-blue-600" /> :
                   <Bell className="w-5 h-5 text-gray-600" />}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{notification.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  {notification.actionText && notification.actionLink && (
                    <Link
                      to={notification.actionLink}
                      className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 mt-2"
                    >
                      {notification.actionText} <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
                {notification.dismissible && (
                  <button
                    onClick={() => dismissNotification(notification.id)}
                    className="p-1 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Personalized Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user.firstName}!
          </h1>
          <p className="mt-2 text-gray-600">
            {user.occupation} • {user.state} • Filing as {user.filingStatus.replace('_', ' ')}
            <button
              onClick={() => setShowProfileEdit(true)}
              className="ml-2 text-blue-600 hover:underline text-sm"
            >
              Edit Profile
            </button>
          </p>
        </div>

        {/* Personalized OBBBA Recommendations */}
        {personalizedRecommendations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              Your Personalized Tax Savings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {personalizedRecommendations.map((rec, idx) => (
                <div key={idx} className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                  <rec.icon className="w-8 h-8 text-green-600 mb-3" />
                  <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                  {rec.savings && (
                    <p className="text-lg font-bold text-green-600 mt-2">
                      Save {formatCurrency(rec.savings)}
                    </p>
                  )}
                  <Link
                    to={rec.link}
                    className="inline-flex items-center gap-1 text-sm font-medium text-green-700 hover:text-green-800 mt-3"
                  >
                    {rec.action} <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link
            to="/returns/new"
            className="text-white rounded-xl p-5 transition-all hover:scale-105 hover:shadow-lg"
            style={{ backgroundColor: '#4CAF50' }}
          >
            <Plus className="w-8 h-8 mb-3" />
            <h3 className="font-semibold">Start New Return</h3>
            <p className="text-green-100 text-sm mt-1">File your 2025 taxes</p>
          </Link>

          <Link
            to="/calculator"
            className="bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-300 rounded-xl p-5 transition-all hover:shadow-lg"
          >
            <Calculator className="w-8 h-8 mb-3" style={{ color: '#1e3a5f' }} />
            <h3 className="font-semibold text-gray-900">Tax Calculator</h3>
            <p className="text-gray-500 text-sm mt-1">Full calculation</p>
          </Link>

          <Link
            to="/documents"
            className="bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-green-300 rounded-xl p-5 transition-all hover:shadow-lg"
          >
            <Upload className="w-8 h-8 mb-3 text-green-600" />
            <h3 className="font-semibold text-gray-900">Upload Docs</h3>
            <p className="text-gray-500 text-sm mt-1">W-2s, 1099s</p>
          </Link>

          <Link
            to="/optimizer"
            className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white rounded-xl p-5 transition-all hover:scale-105 hover:shadow-lg"
          >
            <Sparkles className="w-8 h-8 mb-3" />
            <h3 className="font-semibold">AI Optimizer</h3>
            <p className="text-yellow-100 text-sm mt-1">Find deductions</p>
          </Link>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tax Returns Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5" style={{ color: '#1e3a5f' }} />
                  Your Tax Returns
                </h2>
                <Link
                  to="/returns/new"
                  className="text-white px-4 py-2 rounded-lg font-medium flex items-center gap-1 text-sm transition hover:opacity-90"
                  style={{ backgroundColor: '#4CAF50' }}
                >
                  <Plus className="w-4 h-4" /> New Return
                </Link>
              </div>

              <div className="divide-y divide-gray-100">
                {returns.map((taxReturn) => (
                  <div key={taxReturn.id} className="p-5 hover:bg-gray-50 transition">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`p-3 rounded-xl ${
                          taxReturn.status === 'accepted' ? 'bg-green-100' :
                          taxReturn.status === 'in_progress' ? 'bg-yellow-100' :
                          'bg-gray-100'
                        }`}>
                          {taxReturn.status === 'accepted' ? (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          ) : (
                            <Clock className="w-6 h-6 text-yellow-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">Tax Year {taxReturn.year}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(taxReturn.status)}`}>
                              {getStatusText(taxReturn.status)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">Updated {taxReturn.updated}</p>

                          {/* Progress Bar for in-progress returns */}
                          {taxReturn.status === 'in_progress' && (
                            <div className="mt-3">
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Progress</span>
                                <span>{taxReturn.progress}%</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${taxReturn.progress}%`, backgroundColor: '#4CAF50' }}
                                />
                              </div>
                            </div>
                          )}

                          {/* OBBBA Savings Badge */}
                          {taxReturn.obbbaSavings > 0 && (
                            <div className="mt-3 inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium">
                              <Sparkles className="w-3 h-3" />
                              OBBBA Savings: {formatCurrency(taxReturn.obbbaSavings)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right side - Amount and Actions */}
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {taxReturn.refund > 0 ? 'Estimated Refund' : 'Amount Owed'}
                        </p>
                        <p className={`text-xl font-bold ${taxReturn.refund > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(taxReturn.refund > 0 ? taxReturn.refund : taxReturn.amountOwed)}
                        </p>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 mt-3 justify-end">
                          <Link
                            to={`/returns/${taxReturn.id}`}
                            className="px-3 py-1.5 text-sm font-medium rounded-lg transition"
                            style={{ backgroundColor: '#e8f5e9', color: '#1e3a5f' }}
                          >
                            {taxReturn.status === 'in_progress' ? 'Continue' : 'View'}
                          </Link>
                          <button
                            onClick={() => handleDelete(taxReturn.id, 'return')}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {returns.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No tax returns yet.</p>
                    <Link
                      to="/returns/new"
                      className="inline-flex items-center gap-1 text-sm font-medium mt-2"
                      style={{ color: '#4CAF50' }}
                    >
                      Start your first return <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Left Section - Two Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Important Tax Deadlines */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-red-500" />
                    Important Deadlines
                  </h2>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <span className="text-red-600 font-bold text-sm">15</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">April 15, 2026</p>
                        <p className="text-xs text-gray-500">Federal Tax Filing Deadline</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded">73 days</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <span className="text-yellow-600 font-bold text-sm">15</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">January 15, 2026</p>
                        <p className="text-xs text-gray-500">Q4 Estimated Tax Payment</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">Passed</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-sm">31</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">January 31, 2026</p>
                        <p className="text-xs text-gray-500">W-2 & 1099 Forms Due</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">Passed</span>
                  </div>
                  <Link
                    to="/calendar"
                    className="block text-center text-sm font-medium py-2 text-blue-600 hover:text-blue-700"
                  >
                    View Full Tax Calendar →
                  </Link>
                </div>
              </div>

              {/* OBBBA 2025 Benefits */}
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-sm text-white">
                <div className="p-4 border-b border-white/20">
                  <h2 className="font-bold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-300" />
                    OBBBA 2025 Benefits
                  </h2>
                  <p className="text-green-100 text-xs mt-1">New tax savings available this year</p>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg">
                    <DollarSign className="w-8 h-8 text-yellow-300" />
                    <div>
                      <p className="font-semibold">No Tax on Tips</p>
                      <p className="text-xs text-green-100">Up to $25,000 tax-free</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg">
                    <Clock className="w-8 h-8 text-yellow-300" />
                    <div>
                      <p className="font-semibold">No Tax on Overtime</p>
                      <p className="text-xs text-green-100">Up to $10,000 deductible</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg">
                    <Heart className="w-8 h-8 text-yellow-300" />
                    <div>
                      <p className="font-semibold">Senior Bonus</p>
                      <p className="text-xs text-green-100">$6,000 extra deduction (65+)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg">
                    <Users className="w-8 h-8 text-yellow-300" />
                    <div>
                      <p className="font-semibold">Child Tax Credit</p>
                      <p className="text-xs text-green-100">$2,200 per qualifying child</p>
                    </div>
                  </div>
                  <Link
                    to="/optimizer"
                    className="block text-center text-sm font-semibold py-2 bg-white/20 rounded-lg hover:bg-white/30 transition mt-2"
                  >
                    Check My Eligibility →
                  </Link>
                </div>
              </div>
            </div>

            {/* Quick Tools Row */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mt-6">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5" style={{ color: '#1e3a5f' }} />
                Quick Tools
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Link
                  to="/quick-calc"
                  className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-blue-50 hover:border-blue-200 border border-transparent transition text-center"
                >
                  <Calculator className="w-8 h-8 mb-2" style={{ color: '#1e3a5f' }} />
                  <span className="text-sm font-medium text-gray-700">Quick Calc</span>
                  <span className="text-xs text-gray-500">Estimate refund</span>
                </Link>
                <Link
                  to="/documents"
                  className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-green-50 hover:border-green-200 border border-transparent transition text-center"
                >
                  <Upload className="w-8 h-8 mb-2 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">Upload W-2</span>
                  <span className="text-xs text-gray-500">Scan & import</span>
                </Link>
                <Link
                  to="/optimizer"
                  className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-yellow-50 hover:border-yellow-200 border border-transparent transition text-center"
                >
                  <Sparkles className="w-8 h-8 mb-2 text-yellow-500" />
                  <span className="text-sm font-medium text-gray-700">AI Optimizer</span>
                  <span className="text-xs text-gray-500">Find deductions</span>
                </Link>
                <a
                  href="https://www.irs.gov/refunds"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-purple-50 hover:border-purple-200 border border-transparent transition text-center"
                >
                  <CreditCard className="w-8 h-8 mb-2 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">Track Refund</span>
                  <span className="text-xs text-gray-500">IRS Where's My Refund</span>
                </a>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Documents Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-green-600" />
                  Documents
                </h2>
                <Link to="/documents" className="text-sm font-medium" style={{ color: '#4CAF50' }}>
                  View All
                </Link>
              </div>

              <div className="divide-y divide-gray-100">
                {documents.slice(0, 3).map(doc => (
                  <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${
                        doc.type === 'W2' ? 'bg-blue-100 text-blue-700' :
                        doc.type === '1099' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {doc.type}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{doc.name}</p>
                        <p className="text-xs text-gray-500">{doc.uploadedAt}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.processed && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                      <button
                        onClick={() => handleDelete(doc.id, 'document')}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {documents.length === 0 && (
                  <div className="p-6 text-center text-gray-500">
                    <Upload className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No documents uploaded</p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-100">
                <Link
                  to="/documents"
                  className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 text-sm font-medium flex items-center justify-center gap-2 hover:border-green-400 hover:text-green-600 transition"
                >
                  <Plus className="w-4 h-4" /> Upload New
                </Link>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2c4a7c] rounded-xl p-5 text-white">
              <h3 className="font-semibold mb-4">2025 Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-blue-200">Total Income</span>
                  <span className="font-semibold">{formatCurrency(51000)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-200">OBBBA Savings</span>
                  <span className="font-semibold text-green-400">{formatCurrency(2150)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-200">Deductions</span>
                  <span className="font-semibold">{formatCurrency(15000)}</span>
                </div>
                <div className="border-t border-white/20 pt-3 flex justify-between">
                  <span className="font-semibold">Est. Refund</span>
                  <span className="text-xl font-bold text-green-400">{formatCurrency(4850)}</span>
                </div>
              </div>
            </div>

            {/* Help Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="font-bold text-gray-900 mb-3">Need Help?</h3>
              <div className="space-y-2">
                <button className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Talk to a Tax Expert</span>
                </button>
                <button className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Tax Filing Guide</span>
                </button>
              </div>
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
                <h3 className="text-lg font-bold text-gray-900">Confirm Delete</h3>
                <p className="text-gray-600">
                  Are you sure you want to delete this {deleteType}?
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
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

      {/* Profile Edit Modal */}
      {showProfileEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Edit Profile</h3>
              <button
                onClick={() => setShowProfileEdit(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={user.firstName}
                    onChange={(e) => setUser({ ...user, firstName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={user.lastName}
                    onChange={(e) => setUser({ ...user, lastName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filing Status</label>
                <select
                  value={user.filingStatus}
                  onChange={(e) => setUser({ ...user, filingStatus: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="single">Single</option>
                  <option value="married_filing_jointly">Married Filing Jointly</option>
                  <option value="married_filing_separately">Married Filing Separately</option>
                  <option value="head_of_household">Head of Household</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
                <input
                  type="text"
                  value={user.occupation}
                  onChange={(e) => setUser({ ...user, occupation: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input
                    type="number"
                    value={user.age}
                    onChange={(e) => setUser({ ...user, age: parseInt(e.target.value) || 0, isSenior: parseInt(e.target.value) >= 65 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={user.state}
                    maxLength={2}
                    onChange={(e) => setUser({ ...user, state: e.target.value.toUpperCase() })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Children Under 17</label>
                <input
                  type="number"
                  value={user.childrenUnder17}
                  onChange={(e) => setUser({ ...user, childrenUnder17: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={user.hasTips}
                    onChange={(e) => setUser({ ...user, hasTips: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-gray-700">I receive tip income</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={user.hasOvertime}
                    onChange={(e) => setUser({ ...user, hasOvertime: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-gray-700">I work overtime</span>
                </label>
              </div>
            </div>
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex gap-3">
              <button
                onClick={() => setShowProfileEdit(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowProfileEdit(false)}
                className="flex-1 px-4 py-2 text-white rounded-lg font-medium transition hover:opacity-90"
                style={{ backgroundColor: '#4CAF50' }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
