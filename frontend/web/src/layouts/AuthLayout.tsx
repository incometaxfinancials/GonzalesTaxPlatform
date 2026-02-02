/**
 * GONZALES TAX PLATFORM - Auth Layout
 * Agent Xiomara - Frontend/UX Master
 */
import React from 'react';
import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-lg">
            <span className="text-3xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 bg-clip-text text-transparent">
              G
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-4">Gonzales Tax</h1>
          <p className="text-blue-200 mt-1">Tax Automation Platform</p>
        </div>

        {/* Auth Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <Outlet />
        </div>

        {/* Footer */}
        <p className="text-center text-blue-200 text-sm mt-6">
          Built in solidarity with the Gonzales legacy
        </p>
      </div>
    </div>
  );
}
