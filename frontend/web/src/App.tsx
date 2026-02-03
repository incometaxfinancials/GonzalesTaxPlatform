/**
 * ITF Tax Platform - Main App Component
 * Income. Tax. Financials.
 */
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { store } from './store';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import Splash from './pages/Splash';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import TaxReturn from './pages/TaxReturn';
import QuickCalc from './pages/QuickCalc';
import TaxCalculator from './pages/TaxCalculator';
import Documents from './pages/Documents';
import Optimizer from './pages/Optimizer';
import Login from './pages/Login';
import Register from './pages/Register';

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Splash/Loading Screen - Entry Point */}
            <Route path="/" element={<Splash />} />

            {/* Public Landing Page */}
            <Route path="/home" element={<Landing />} />

            {/* Public Quick Calculator */}
            <Route path="/quick-calc" element={<QuickCalc />} />
            <Route path="/calculator" element={<TaxCalculator />} />

            {/* Auth Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            {/* Protected App Routes */}
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/returns" element={<Dashboard />} />
              <Route path="/returns/:id" element={<TaxReturn />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/optimizer" element={<Optimizer />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
