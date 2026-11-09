import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Registration form state (Strictly STUDENT role)
  const [regForm, setRegForm] = useState({
    studentId: '',
    fullName: '',
    email: '',
    password: '',
    roomNumber: '',
    phoneNumber: '',
    guardianName: '',
    guardianPhone: '',
  });

  const demoAccounts = [
    {
      role: 'STUDENT',
      label: 'Student Portal',
      email: 'student@hall.edu',
      password: 'student123',
      name: 'Nusrat Jahan',
      color: 'from-pink-500/20 to-rose-500/20 border-pink-500/30 text-pink-300',
      badge: 'Resident',
    },
    {
      role: 'GATE_STAFF',
      label: 'Gate Staff',
      email: 'gatestaff@hall.edu',
      password: 'gatestaff123',
      name: 'Kamal Gate Officer',
      color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-300',
      badge: 'Main Gate',
    },
    {
      role: 'WARDEN',
      label: 'Hall Warden / Provost',
      email: 'warden@hall.edu',
      password: 'warden123',
      name: 'Dr. Sultana Razia',
      color: 'from-purple-500/20 to-indigo-500/20 border-purple-500/30 text-purple-300',
      badge: 'Administration',
    },
    {
      role: 'ADMIN',
      label: 'System Admin',
      email: 'admin@hall.edu',
      password: 'admin123',
      name: 'Administrator',
      color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-300',
      badge: 'Superuser',
    },
  ];

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const response = await api.login(email.trim(), password);
      onLoginSuccess(response.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async (acc: typeof demoAccounts[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await api.login(acc.email, acc.password);
      onLoginSuccess(response.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      await api.registerStudent(regForm);
      setSuccessMessage('Student registration successful! You can now sign in.');
      setMode('LOGIN');
      setEmail(regForm.email);
      setPassword(regForm.password);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please review your details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Decorative ambient background */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-hall-700/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main card */}
      <div className="w-full max-w-xl z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-hall-500 to-hall-700 shadow-glow-primary border border-hall-400/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Smart Hall Access & Safety
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Pritilata Waddedar Female Residential Hall • University Portal
          </p>
        </div>

        {/* Evaluation Personas Picker */}
        <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Quick Evaluation Personas (1-Click Authenticate)
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Bcrypt + JWT</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {demoAccounts.map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => handleQuickDemoLogin(acc)}
                disabled={isLoading}
                className={`p-2.5 rounded-xl border bg-gradient-to-br ${acc.color} text-left transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {acc.badge}
                  </span>
                  <ArrowRight className="w-3 h-3 opacity-60" />
                </div>
                <p className="font-bold text-xs text-white mt-1 truncate">{acc.label}</p>
                <p className="text-[10px] text-slate-300 truncate">{acc.email}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-lg transition ${
                mode === 'LOGIN'
                  ? 'bg-hall-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('REGISTER');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-lg transition ${
                mode === 'REGISTER'
                  ? 'bg-hall-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Resident Registration
            </button>
          </div>

          {/* Feedback messages */}
          {errorMessage && (
            <div className="p-3.5 bg-red-950/50 border border-red-800/70 rounded-xl text-xs text-red-300 flex items-start space-x-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-950/50 border border-emerald-800/70 rounded-xl text-xs text-emerald-300 flex items-start space-x-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Institutional Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. student@hall.edu or staff@hall.edu"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-hall-500 placeholder-slate-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <span className="text-[11px] text-slate-400">Server Encrypted (Bcrypt)</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-hall-500 placeholder-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-hall-600 hover:bg-hall-500 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-glow-primary transition flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isLoading ? 'Verifying Credentials...' : 'Sign In to Portal'}</span>
                </button>
              </div>

              <div className="text-center pt-2">
                <p className="text-xs text-slate-400">
                  New student resident?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('REGISTER');
                      setErrorMessage(null);
                    }}
                    className="text-hall-400 hover:underline font-semibold"
                  >
                    Create student account
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* REGISTRATION FORM (STUDENT ONLY) */}
          {mode === 'REGISTER' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="p-3 bg-blue-950/40 border border-blue-800/50 rounded-xl text-xs text-blue-300">
                <p className="font-semibold">Security Policy Notice</p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Public registration assigns the verified <strong>Student Resident</strong> role. Gate Staff, Warden, and Admin accounts are securely provisioned by hall administration.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Student ID / Roll *
                  </label>
                  <input
                    type="text"
                    required
                    value={regForm.studentId}
                    onChange={(e) => setRegForm({ ...regForm, studentId: e.target.value })}
                    placeholder="e.g. ASH2101001M"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs uppercase focus:outline-none focus:border-hall-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={regForm.fullName}
                    onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                    placeholder="e.g. Nusrat Jahan"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-hall-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Institutional Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    placeholder="student@hall.edu"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-hall-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Password (Min 6 chars) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                    placeholder="Create password"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-hall-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Room Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={regForm.roomNumber}
                    onChange={(e) => setRegForm({ ...regForm, roomNumber: e.target.value })}
                    placeholder="e.g. Room 304, Block B"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-hall-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Resident Phone *
                  </label>
                  <input
                    type="text"
                    required
                    value={regForm.phoneNumber}
                    onChange={(e) => setRegForm({ ...regForm, phoneNumber: e.target.value })}
                    placeholder="+8801711000000"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-hall-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Guardian Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={regForm.guardianName}
                    onChange={(e) => setRegForm({ ...regForm, guardianName: e.target.value })}
                    placeholder="Parent / Guardian Name"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-hall-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Guardian Phone *
                  </label>
                  <input
                    type="text"
                    required
                    value={regForm.guardianPhone}
                    onChange={(e) => setRegForm({ ...regForm, guardianPhone: e.target.value })}
                    placeholder="+8801711999999"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-hall-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-hall-600 hover:bg-hall-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-glow-primary transition disabled:opacity-50"
                >
                  {isLoading ? 'Creating Account...' : 'Complete Resident Registration'}
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMode('LOGIN')}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Already registered? Return to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
