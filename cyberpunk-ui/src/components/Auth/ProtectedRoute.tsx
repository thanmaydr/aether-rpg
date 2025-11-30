import { useAuth } from '@/hooks/useAuth'
import { Navigate, Outlet } from 'react-router-dom'
import { Spinner } from '@/components/ui/Spinner'

interface ProtectedRouteProps {
    children?: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-950">
                <Spinner size="lg" variant="cyan" />
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/auth" replace />
    }

    return children ? <>{children}</> : <Outlet />
}
