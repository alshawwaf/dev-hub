import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import './App.css';

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !user.is_admin) return <Navigate to="/" replace />;

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen relative">
          <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,_#1e1b4b_0%,_#0a0b10_100%)] pointer-events-none"></div>
          
          <Navbar />
          
          <div className="relative z-10 pt-4">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute adminOnly>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </div>
          
          <footer className="relative z-10 py-12 text-center text-text-dim text-sm">
            <p>&copy; 2026 Dev-Hub • Crafted for Security Engineering Training</p>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
