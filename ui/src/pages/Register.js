import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Leaf, Mail, Lock, ArrowRight, Eye, EyeOff, Check, X } from 'lucide-react';
import './Register.css';

const PASSWORD_RULES = [
  { key: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { key: 'digit', label: 'One number', test: (p) => /\d/.test(p) },
  { key: 'special', label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const ruleResults = useMemo(
    () => PASSWORD_RULES.map((r) => ({ ...r, passed: r.test(password) })),
    [password],
  );

  const allRulesPassed = ruleResults.every((r) => r.passed);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canSubmit = allRulesPassed && passwordsMatch && agreed && email.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);

    try {
      await register(email, password);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((d) => d.msg).join('. '));
      } else {
        setError(detail || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-glow" />
      <div className="login-bg-glow-2" />

      <div className="register-container animate-fade-in-up">
        <div className="login-logo">
          <div className="login-logo-icon">
            <Leaf size={28} strokeWidth={2.5} />
          </div>
          <h1 className="login-brand">CarbonQ</h1>
          <p className="login-tagline">Create your account</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {/* Email */}
          <div className="login-input-group">
            <Mail size={18} className="login-input-icon" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="login-input"
            />
          </div>

          {/* Password */}
          <div className="login-input-group">
            <Lock size={18} className="login-input-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="login-input"
            />
            <button
              type="button"
              className="login-password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Password rules */}
          {password.length > 0 && (
            <ul className="register-rules animate-fade-in">
              {ruleResults.map((r) => (
                <li key={r.key} className={`register-rule ${r.passed ? 'passed' : ''}`}>
                  {r.passed ? <Check size={14} /> : <X size={14} />}
                  {r.label}
                </li>
              ))}
            </ul>
          )}

          {/* Confirm Password */}
          <div className="login-input-group">
            <Lock size={18} className="login-input-icon" />
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="login-input"
            />
            <button
              type="button"
              className="login-password-toggle"
              onClick={() => setShowConfirm(!showConfirm)}
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {confirmPassword.length > 0 && !passwordsMatch && (
            <p className="register-mismatch animate-fade-in">Passwords do not match</p>
          )}

          {/* Data agreement */}
          <label className="register-agreement">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="register-checkbox"
            />
            <span className="register-agreement-text">
              I understand that CarbonQ will store my <strong>email address</strong> and a
              securely hashed password; track which <strong>AI platform</strong> I query,
              the <strong>estimated carbon emissions</strong>, and <strong>timestamp</strong> of
              each query. CarbonQ does <strong>not</strong> collect query content, IP
              addresses, or any other personal data, and does not share data with third
              parties.
            </span>
          </label>

          {error && (
            <div className="login-error animate-fade-in">{error}</div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={!canSubmit || loading}
          >
            {loading ? (
              <div className="login-spinner" />
            ) : (
              <>
                Create Account
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="login-switch">
          <span className="login-switch-text">Already have an account?</span>
          <button className="login-switch-btn" onClick={() => navigate('/login')}>
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
