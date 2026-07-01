import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Desktop from './os/Desktop';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import GuidePage from './pages/GuidePage';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
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
  if (adminOnly && !user.is_admin) return <Navigate to="/" replace />;

  return <>{children}</>;
};

// Chrome layout for the secondary pages (login / admin / guide) that still use
// the classic navbar + animated background. The desktop route renders full-bleed.
const ChromeLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen relative">
    <div className="landing-bg"></div>
    <Navbar />
    <div className="relative z-10 pt-2">{children}</div>
    <footer>
      <p>© 2026 AI Dev Hub • Crafted for AI by AI</p>
    </footer>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<ProtectedRoute><Desktop /></ProtectedRoute>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/guide" element={<ChromeLayout><GuidePage /></ChromeLayout>} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <ChromeLayout><AdminDashboard /></ChromeLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
