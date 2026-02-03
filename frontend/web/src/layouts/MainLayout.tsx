/**
 * ITF - Income. Tax. Financials - Main Layout
 * Full ITF branding with authentication state
 */
import React, { useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Home, FileText, Calculator, Upload, Sparkles,
  User, LogOut, HelpCircle, Menu, Bell, Settings, Shield, X
} from 'lucide-react';

// ITF Logo Component
const ITFLogo = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const dimensions = {
    sm: { width: 32, height: 20 },
    md: { width: 48, height: 30 },
    lg: { width: 64, height: 40 },
  };
  const { width, height } = dimensions[size];

  return (
    <svg viewBox="0 0 100 60" width={width} height={height}>
      <defs>
        <linearGradient id="blueGradMain" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#2c4a7c' }} />
          <stop offset="100%" style={{ stopColor: '#1e3a5f' }} />
        </linearGradient>
        <linearGradient id="greenGradMain" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#6BBF59' }} />
          <stop offset="100%" style={{ stopColor: '#4CAF50' }} />
        </linearGradient>
      </defs>
      {/* I */}
      <rect x="5" y="10" width="12" height="40" rx="2" fill="url(#blueGradMain)" />
      {/* T */}
      <rect x="25" y="18" width="12" height="32" rx="2" fill="url(#blueGradMain)" />
      <rect x="18" y="10" width="26" height="10" rx="2" fill="url(#blueGradMain)" />
      {/* Checkmark on T */}
      <path
        d="M22 22 L30 32 L52 8"
        stroke="url(#greenGradMain)"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* F */}
      <rect x="58" y="10" width="12" height="40" rx="2" fill="url(#blueGradMain)" />
      <rect x="58" y="10" width="22" height="9" rx="2" fill="url(#blueGradMain)" />
      <rect x="58" y="26" width="18" height="7" rx="2" fill="url(#blueGradMain)" />
      {/* Swoosh */}
      <ellipse cx="50" cy="55" rx="45" ry="6" fill="none" stroke="url(#greenGradMain)" strokeWidth="2.5" />
    </svg>
  );
};

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);

  // Auth state (loaded from localStorage)
  const [isAuthenticated, setIsAuthenticated] = React.useState(true);
  const [user, setUser] = React.useState({
    firstName: 'User',
    lastName: '',
    email: '',
    avatar: null as string | null,
  });

  // Check auth on mount
  useEffect(() => {
    const token = localStorage.getItem('itf_auth_token');
    const savedUser = localStorage.getItem('itf_user');
    if (!token) {
      // For demo, we'll allow access but in production redirect to login
      // navigate('/login');
    }
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        // Invalid user data
      }
    }
  }, [navigate]);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Tax Returns', href: '/returns', icon: FileText },
    { name: 'Quick Calculator', href: '/quick-calc', icon: Calculator },
    { name: 'Documents', href: '/documents', icon: Upload },
    { name: 'AI Optimizer', href: '/optimizer', icon: Sparkles },
  ];

  const notifications = [
    { id: '1', title: 'OBBBA Savings Found', message: '$5,720 in potential savings detected', time: '2 min ago', unread: true },
    { id: '2', title: 'Document Processed', message: 'W-2 from Olive Garden ready', time: '1 hour ago', unread: true },
    { id: '3', title: 'Tax Return Saved', message: 'Draft auto-saved successfully', time: '3 hours ago', unread: false },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  const isActive = (href: string) => location.pathname.startsWith(href);

  const handleLogout = () => {
    localStorage.removeItem('itf_auth_token');
    localStorage.removeItem('itf_user');
    setIsAuthenticated(false);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b">
            <ITFLogo size="md" />
            <div>
              <h1 className="font-bold" style={{ color: '#1e3a5f' }}>
                Income<span style={{ color: '#4CAF50' }}>.</span> Tax<span style={{ color: '#4CAF50' }}>.</span> Financials
              </h1>
              <p className="text-xs text-gray-500">Professional Tax Solutions</p>
            </div>
          </div>

          {/* User Profile Quick View */}
          <div className="px-4 py-4 border-b bg-gray-50">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: '#1e3a5f' }}
              >
                {user.firstName[0]}{user.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors
                  ${isActive(item.href)
                    ? 'text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                  }
                `}
                style={isActive(item.href) ? { backgroundColor: '#1e3a5f' } : {}}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
                {item.name === 'AI Optimizer' && (
                  <span
                    className="ml-auto text-xs px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: '#4CAF50' }}
                  >
                    NEW
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* Compliance Badge */}
          <div className="px-4 py-3 mx-4 mb-4 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center gap-2 text-green-700">
              <Shield className="w-4 h-4" />
              <span className="text-xs font-medium">IRS Authorized e-File</span>
            </div>
            <p className="text-xs text-green-600 mt-1">SOC-2 Compliant | AES-256</p>
          </div>

          {/* Bottom Menu */}
          <div className="border-t px-4 py-4">
            <Link
              to="/settings"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">Settings</span>
            </Link>
            <Link
              to="/help"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <HelpCircle className="w-5 h-5" />
              <span className="font-medium">Help & Support</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors w-full"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden lg:flex items-center gap-2">
              <ITFLogo size="sm" />
              <span className="font-bold text-gray-900">ITF</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-lg hover:bg-gray-100 relative"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {unreadCount > 0 && (
                  <span
                    className="absolute top-1 right-1 w-4 h-4 text-xs text-white rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#4CAF50' }}
                  >
                    {unreadCount}
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
                        className={`px-4 py-3 border-b hover:bg-gray-50 cursor-pointer ${notif.unread ? 'bg-blue-50' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-2 h-2 rounded-full mt-2"
                            style={{ backgroundColor: notif.unread ? '#4CAF50' : 'transparent' }}
                          />
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{notif.title}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{notif.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t bg-gray-50">
                    <button className="text-sm font-medium w-full text-center" style={{ color: '#1e3a5f' }}>
                      View All Notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tax Year Badge */}
            <div
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-medium"
              style={{ backgroundColor: '#1e3a5f' }}
            >
              <span>Tax Year 2025</span>
              <span
                className="px-1.5 py-0.5 rounded text-xs"
                style={{ backgroundColor: '#4CAF50' }}
              >
                OBBBA
              </span>
            </div>

            {/* User Avatar */}
            <button
              onClick={() => navigate('/settings')}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: '#1e3a5f' }}
            >
              {user.firstName[0]}{user.lastName[0]}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-screen">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="bg-white border-t py-4 px-6 text-center text-xs text-gray-500">
          <p>Income. Tax. Financials (ITF) | IRS Authorized e-File Provider | EFIN: XXXXXX</p>
          <p className="mt-1">SOC-2 Type II Certified | AES-256 Encryption | TLS 1.3</p>
        </footer>
      </div>
    </div>
  );
}
