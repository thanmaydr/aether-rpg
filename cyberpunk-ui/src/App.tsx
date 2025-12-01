import { Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { Toaster } from '@/components/ui/sonner'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { Spinner } from '@/components/ui/Spinner'
import ProtectedRoute from '@/components/Auth/ProtectedRoute'
import AppLayout from '@/components/Layout/AppLayout'

// Lazy load pages
const AuthPage = lazy(() => import('@/pages/AuthPage'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const NeuralMapPage = lazy(() => import('@/pages/NeuralMapPage'))
const QuestsPage = lazy(() => import('@/pages/QuestsPage'))
const QuestBattlePage = lazy(() => import('@/pages/QuestBattlePage'))
const ArchivesPage = lazy(() => import('@/pages/ArchivesPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const LeaderboardPage = lazy(() => import('@/pages/LeaderboardPage'))
const PublicProfilePage = lazy(() => import('@/pages/PublicProfilePage'))
const SquadsPage = lazy(() => import('@/pages/SquadsPage'))
const SquadDetailPage = lazy(() => import('@/pages/SquadDetailPage'))
const ContentGeneratorPage = lazy(() => import('@/pages/ContentGeneratorPage'))

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Suspense fallback={
            <div className="flex items-center justify-center h-screen bg-slate-950">
              <Spinner size="xl" variant="neon" />
            </div>
          }>
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
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/agent/:userId" element={<PublicProfilePage />} />
                <Route path="/squads" element={<SquadsPage />} />
                <Route path="/squads/:squadId" element={<SquadDetailPage />} />
                <Route path="/generator" element={<ContentGeneratorPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
          <Toaster />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App
