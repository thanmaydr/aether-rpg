import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { Toaster } from '@/components/ui/sonner'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import AuthPage from '@/pages/AuthPage'
import Dashboard from '@/pages/Dashboard'
import NeuralMapPage from '@/pages/NeuralMapPage'
import QuestsPage from '@/pages/QuestsPage'
import QuestBattlePage from '@/pages/QuestBattlePage'
import ArchivesPage from '@/pages/ArchivesPage'
import ProfilePage from '@/pages/ProfilePage'
import ProtectedRoute from '@/components/Auth/ProtectedRoute'
import AppLayout from '@/components/Layout/AppLayout'

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/login" element={<Navigate to="/auth" replace />} />
            <Route path="/signup" element={<Navigate to="/auth" replace />} />

            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/nexus" element={<NeuralMapPage />} />
              <Route path="/quests" element={<QuestsPage />} />
              <Route path="/quest/:questId" element={<QuestBattlePage />} />
              <Route path="/archives" element={<ArchivesPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App
