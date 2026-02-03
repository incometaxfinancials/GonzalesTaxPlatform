/**
 * ITF - Income. Tax. Financials - Auth Layout
 * Full ITF branding for login/register pages
 */
import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Shield, Lock, CheckCircle } from 'lucide-react';

// ITF Logo Component
const ITFLogo = () => (
  <svg viewBox="0 0 200 120" className="w-32 h-20">
    <defs>
      <linearGradient id="blueGradAuth" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#2c4a7c' }} />
        <stop offset="100%" style={{ stopColor: '#1e3a5f' }} />
      </linearGradient>
      <linearGradient id="greenGradAuth" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#6BBF59' }} />
        <stop offset="100%" style={{ stopColor: '#4CAF50' }} />
      </linearGradient>
      <filter id="shadowAuth" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#1e3a5f" floodOpacity="0.3" />
      </filter>
    </defs>

    {/* Letter I */}
    <rect x="30" y="20" width="25" height="70" rx="3" fill="url(#blueGradAuth)" filter="url(#shadowAuth)" />

    {/* Letter T */}
    <rect x="70" y="32" width="25" height="58" rx="3" fill="url(#blueGradAuth)" filter="url(#shadowAuth)" />
    <rect x="55" y="20" width="55" height="18" rx="3" fill="url(#blueGradAuth)" filter="url(#shadowAuth)" />

    {/* Checkmark on T */}
    <path
      d="M62 42 L78 62 L118 14"
      stroke="url(#greenGradAuth)"
      strokeWidth="12"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      filter="url(#shadowAuth)"
    />

    {/* Letter F */}
    <rect x="125" y="20" width="25" height="70" rx="3" fill="url(#blueGradAuth)" filter="url(#shadowAuth)" />
    <rect x="125" y="20" width="40" height="17" rx="3" fill="url(#blueGradAuth)" filter="url(#shadowAuth)" />
    <rect x="125" y="48" width="32" height="12" rx="3" fill="url(#blueGradAuth)" filter="url(#shadowAuth)" />

    {/* Swooshes */}
    <ellipse cx="100" cy="102" rx="85" ry="14" fill="none" stroke="url(#greenGradAuth)" strokeWidth="5" />
    <ellipse cx="100" cy="108" rx="70" ry="10" fill="none" stroke="url(#blueGradAuth)" strokeWidth="3" />
  </svg>
);

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2c4a7c 50%, #1e3a5f 100%)' }}
      >
        <div>
          <Link to="/home">
            <ITFLogo />
          </Link>
          <h1 className="text-4xl font-bold text-white mt-8">
            Income<span style={{ color: '#4CAF50' }}>.</span> Tax<span style={{ color: '#4CAF50' }}>.</span> Financials
          </h1>
          <p className="text-blue-200 text-lg mt-2">Professional Tax Solutions</p>
        </div>

        <div className="space-y-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">OBBBA 2025 Ready</h3>
              <p className="text-blue-200 text-sm mt-1">
                No Tax on Tips, Overtime, and Senior benefits automatically applied
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">IRS Authorized e-File</h3>
              <p className="text-blue-200 text-sm mt-1">
                Direct submission to IRS with real-time acknowledgment
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <Lock className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Bank-Level Security</h3>
              <p className="text-blue-200 text-sm mt-1">
                SOC-2 Type II certified with AES-256 encryption
              </p>
            </div>
          </div>
        </div>

        <div className="text-blue-300 text-sm">
          <p>Trusted by 50,000+ taxpayers nationwide</p>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-blue-800 flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: `hsl(${i * 50}, 50%, 40%)` }}
                >
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <span className="text-blue-200">★★★★★ 4.9/5 rating</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50">
        {/* Mobile Logo */}
        <div className="lg:hidden mb-8">
          <Link to="/home" className="flex flex-col items-center">
            <ITFLogo />
            <h1 className="text-xl font-bold mt-4" style={{ color: '#1e3a5f' }}>
              Income<span style={{ color: '#4CAF50' }}>.</span> Tax<span style={{ color: '#4CAF50' }}>.</span> Financials
            </h1>
          </Link>
        </div>

        {/* Auth Form Container */}
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <Outlet />
          </div>

          {/* Security Badges */}
          <div className="mt-6 flex items-center justify-center gap-4">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Shield className="w-4 h-4 text-green-500" />
              <span>IRS Authorized</span>
            </div>
            <div className="w-1 h-1 bg-gray-300 rounded-full" />
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Lock className="w-4 h-4 text-green-500" />
              <span>256-bit SSL</span>
            </div>
            <div className="w-1 h-1 bg-gray-300 rounded-full" />
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>SOC-2</span>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-6 text-center text-xs text-gray-500">
            <p>By continuing, you agree to ITF's</p>
            <p className="mt-1">
              <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
              {' · '}
              <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
              {' · '}
              <a href="#" className="text-blue-600 hover:underline">IRC §7216 Disclosure</a>
            </p>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="mt-auto pt-8 text-center text-xs text-gray-400">
          <p>© 2025 Income. Tax. Financials (ITF). All rights reserved.</p>
          <p className="mt-1">IRS Authorized e-File Provider | EFIN: XXXXXX</p>
        </div>
      </div>
    </div>
  );
}
