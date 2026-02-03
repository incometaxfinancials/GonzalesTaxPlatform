import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Splash() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing...');
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const loadingSteps = [
      { progress: 15, text: 'Loading tax engine...' },
      { progress: 30, text: 'Connecting to IRS MeF...' },
      { progress: 50, text: 'Initializing security protocols...' },
      { progress: 70, text: 'Loading OBBBA provisions...' },
      { progress: 85, text: 'Preparing your dashboard...' },
      { progress: 100, text: 'Welcome to ITF!' },
    ];

    let currentStep = 0;

    const interval = setInterval(() => {
      if (currentStep < loadingSteps.length) {
        setProgress(loadingSteps[currentStep].progress);
        setLoadingText(loadingSteps[currentStep].text);
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setFadeOut(true);
          setTimeout(() => {
            navigate('/dashboard');
          }, 500);
        }, 500);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)',
      }}
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-96 h-96 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, #4CAF50 0%, transparent 70%)',
            top: '10%',
            left: '10%',
            animation: 'pulse 4s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-80 h-80 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, #1e3a5f 0%, transparent 70%)',
            bottom: '10%',
            right: '10%',
            animation: 'pulse 4s ease-in-out infinite 1s',
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* ITF Logo Animation */}
        <div className="mb-8 relative">
          <svg viewBox="0 0 300 180" className="w-80 h-48">
            <defs>
              <linearGradient id="blueGradSplash" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#2c4a7c' }} />
                <stop offset="100%" style={{ stopColor: '#1e3a5f' }} />
              </linearGradient>
              <linearGradient id="greenGradSplash" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#6BBF59' }} />
                <stop offset="100%" style={{ stopColor: '#4CAF50' }} />
              </linearGradient>
              <filter id="shadowSplash" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#1e3a5f" floodOpacity="0.3" />
              </filter>
            </defs>

            {/* Letter I - slides in from left */}
            <g style={{ animation: 'slideInLeft 0.6s ease-out forwards' }}>
              <rect x="50" y="30" width="35" height="100" rx="4" fill="url(#blueGradSplash)" filter="url(#shadowSplash)" />
            </g>

            {/* Letter T - slides in from top */}
            <g style={{ animation: 'slideInTop 0.6s ease-out 0.2s forwards', opacity: 0 }}>
              <rect x="110" y="45" width="35" height="85" rx="4" fill="url(#blueGradSplash)" filter="url(#shadowSplash)" />
              <rect x="95" y="30" width="65" height="28" rx="4" fill="url(#blueGradSplash)" filter="url(#shadowSplash)" />
            </g>

            {/* Checkmark - draws in */}
            <path
              d="M98 60 L120 90 L175 20"
              stroke="url(#greenGradSplash)"
              strokeWidth="16"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#shadowSplash)"
              style={{
                strokeDasharray: 200,
                strokeDashoffset: 200,
                animation: 'drawCheck 0.8s ease-out 0.5s forwards',
              }}
            />

            {/* Letter F - slides in from right */}
            <g style={{ animation: 'slideInRight 0.6s ease-out 0.3s forwards', opacity: 0 }}>
              <rect x="185" y="30" width="35" height="100" rx="4" fill="url(#blueGradSplash)" filter="url(#shadowSplash)" />
              <rect x="185" y="30" width="55" height="25" rx="4" fill="url(#blueGradSplash)" filter="url(#shadowSplash)" />
              <rect x="185" y="68" width="45" height="18" rx="4" fill="url(#blueGradSplash)" filter="url(#shadowSplash)" />
            </g>

            {/* Swooshes - fade in */}
            <g style={{ animation: 'fadeIn 0.8s ease-out 0.8s forwards', opacity: 0 }}>
              <ellipse cx="155" cy="145" rx="120" ry="22" fill="none" stroke="url(#greenGradSplash)" strokeWidth="7" />
              <ellipse cx="155" cy="152" rx="105" ry="17" fill="none" stroke="url(#blueGradSplash)" strokeWidth="4" />
            </g>
          </svg>
        </div>

        {/* Company Name */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-wide" style={{ color: '#1e3a5f' }}>
            INCOME<span style={{ color: '#4CAF50' }}>.</span> TAX<span style={{ color: '#4CAF50' }}>.</span> FINANCIALS
          </h1>
          <p className="text-gray-500 mt-2 text-lg">Professional Tax Solutions</p>
        </div>

        {/* Loading Bar */}
        <div className="w-80 mb-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #1e3a5f, #4CAF50)',
              }}
            />
          </div>
        </div>

        {/* Loading Text */}
        <p className="text-gray-600 text-sm animate-pulse">{loadingText}</p>

        {/* Tax Year Badge */}
        <div className="mt-8 px-4 py-2 bg-white rounded-full shadow-md">
          <span className="text-sm font-medium" style={{ color: '#1e3a5f' }}>
            Tax Year 2025 Ready
          </span>
          <span className="ml-2 px-2 py-0.5 text-xs font-bold text-white rounded-full" style={{ backgroundColor: '#4CAF50' }}>
            OBBBA
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 text-center">
        <p className="text-gray-400 text-xs">Professional Tax Solutions</p>
        <p className="text-gray-400 text-xs mt-1">IRS Authorized e-File Provider</p>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-50px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(50px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInTop {
          from { transform: translateY(-30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes drawCheck {
          to { stroke-dashoffset: 0; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.1; }
          50% { transform: scale(1.1); opacity: 0.15; }
        }
      `}</style>
    </div>
  );
}
