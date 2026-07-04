import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Desktop from './os/Desktop';
import LoginPage from './pages/LoginPage';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary mb-4" />
        <p className="text-text-muted">Authenticating...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

// Everything lives on the desktop now: the old /guide and /admin pages became
// system windows, so those routes just deep-link into the desktop (?open=<key>
// is consumed once by Desktop, admin-gated there).
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<ProtectedRoute><Desktop /></ProtectedRoute>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/guide" element={<Navigate to="/?open=guide" replace />} />
          <Route path="/admin" element={<Navigate to="/?open=admin" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
