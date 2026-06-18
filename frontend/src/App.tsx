import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { ParentDashboard } from './components/parent/ParentDashboard';
import { KidQuestBoard } from './components/kid/KidQuestBoard';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-quest-bg">
        <div className="text-center">
          <div className="text-7xl animate-bounce">🏰</div>
          <p className="text-xl text-gray-500 mt-4">Loading QuestKids...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (user.role === 'parent') {
    return <ParentDashboard />;
  }

  return <KidQuestBoard />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
