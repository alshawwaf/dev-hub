import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Mail, Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('auth/login', formData);
      const { access_token, user } = response.data;
      
      login(access_token, user);
      navigate("/");
    } catch (err: any) {
      console.error("Login failed:", err);
      setError(err.response?.data?.detail || "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="login-card">
        {/* Logo */}
        <div className="logo-icon overflow-hidden">
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="w-full h-full object-cover" 
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                const span = parent.querySelector('span');
                if (span) span.style.display = 'flex';
              }
            }}
          />
          <span style={{ fontFamily: 'Outfit, sans-serif', display: 'none' }}>A</span>
        </div>
        
        {/* Header */}
        <h2 className="text-gradient">Welcome Back</h2>
        <p className="subtitle">Sign in to access the AI Dev Hub</p>

        {/* Error Message */}
        {error && (
          <div className="error-message flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <label>
            <Mail size={12} style={{ display: 'inline', marginRight: '6px', opacity: 0.7 }} />
            Email Address
          </label>
          <input 
            type="email" 
            required
            disabled={isLoading}
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label>
            <Lock size={12} style={{ display: 'inline', marginRight: '6px', opacity: 0.7 }} />
            Password
          </label>
          <input 
            type="password" 
            required
            disabled={isLoading}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button 
            type="submit"
            disabled={isLoading}
            className="btn btn-primary w-full py-3.5 text-sm mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Authenticating...
              </>
            ) : (
              <>
                Authorize Access
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <p className="disclaimer">
          Internal system. Unauthorized access is monitored and logged.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
