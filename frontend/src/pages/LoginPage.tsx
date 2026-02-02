import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

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

      const response = await api.post('auth/token', formData);
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
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="glass p-10 rounded-3xl w-full max-w-md border border-glass-border">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center font-bold text-white text-3xl shadow-2xl mx-auto mb-4">
            A
          </div>
          <h2 className="text-3xl font-extrabold text-gradient mb-2">Welcome Back</h2>
          <p className="text-text-muted">Sign in to access the AI Dev-Hub</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2 ml-1">Email Address</label>
            <input 
              type="email" 
              required
              disabled={isLoading}
              className="w-full bg-bg-dark border border-glass-border rounded-xl py-3 px-4 text-text-main focus:outline-none focus:border-primary transition-all disabled:opacity-50"
              placeholder="name@alshawwaf.ca"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-2 ml-1">Password</label>
            <input 
              type="password" 
              required
              disabled={isLoading}
              className="w-full bg-bg-dark border border-glass-border rounded-xl py-3 px-4 text-text-main focus:outline-none focus:border-primary transition-all disabled:opacity-50"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="btn btn-primary w-full py-4 text-base mt-4 transition-all"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Authenticating...
              </div>
            ) : 'Authorize Access'}
          </button>
        </form>

        <p className="mt-8 text-center text-text-dim text-xs">
          Internal system. Unauthorized access is monitored and logged.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
