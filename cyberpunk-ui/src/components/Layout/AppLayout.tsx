import { useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
    Home,
    Swords,
    BookOpen,
    User,
    LogOut,
    Menu,
    X,
    ChevronRight,
    Users,
    FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function AppLayout() {
    const { signOut, user } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    // Mock XP data - replace with real data later
    const xp = 750
    const nextLevelXp = 1000
    const progress = (xp / nextLevelXp) * 100
    const level = 5

    const navItems = [
        { name: 'NEXUS', path: '/dashboard', icon: Home },
        { name: 'QUESTS', path: '/quests', icon: Swords },
        { name: 'SQUADS', path: '/squads', icon: Users },
        { name: 'ARCHIVES', path: '/archives', icon: BookOpen },
        { name: 'PROFILE', path: '/profile', icon: User },
        { name: 'GENERATOR', path: '/generator', icon: FileText },
    ]

    const handleSignOut = async () => {
        await signOut()
        navigate('/auth')
    }

    return (
        <div className="min-h-screen bg-background flex overflow-hidden">
            {/* Sidebar / Drawer */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-[280px] bg-slate-900/95 backdrop-blur-md border-r border-cyan-500/20 transition-transform duration-300 ease-out md:translate-x-0 md:static md:shrink-0 shadow-2xl md:shadow-none",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="h-full flex flex-col">
                    {/* Logo / Header */}
                    <div className="h-16 flex items-center px-6 border-b border-cyan-500/20 justify-between">
                        <div className="text-2xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-magenta-500">
                            AETHER_RPG
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden text-cyan-400 hover:bg-cyan-950/30 h-10 w-10"
                            onClick={() => setIsSidebarOpen(false)}
                        >
                            <X className="w-6 h-6" />
                        </Button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => cn(
                                    "flex items-center gap-4 px-4 py-3.5 rounded-lg transition-all duration-200 group relative overflow-hidden min-h-[48px]", // Min height 48px for touch
                                    isActive
                                        ? "bg-cyan-950/30 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.1)]"
                                        : "text-slate-400 hover:text-cyan-200 hover:bg-white/5"
                                )}
                                onClick={() => setIsSidebarOpen(false)}
                            >
                                <item.icon className={cn("w-6 h-6 transition-colors",
                                    location.pathname === item.path ? "text-cyan-400" : "text-slate-500 group-hover:text-cyan-300"
                                )} />
                                <span className="font-mono text-base tracking-wider">{item.name}</span>
                                {location.pathname === item.path && (
                                    <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-pulse" />
                                )}
                            </NavLink>
                        ))}
                    </nav>

                    {/* User Info Footer */}
                    <div className="p-4 border-t border-cyan-500/20 bg-black/20">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded bg-gradient-to-br from-cyan-500 to-magenta-600 flex items-center justify-center text-white font-mono font-bold text-sm shadow-lg">
                                LV{level}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-mono text-cyan-300 truncate font-medium">
                                    {user?.email?.split('@')[0] || 'OPERATIVE'}
                                </div>
                                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Apprentice</div>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            className="w-full justify-start gap-3 border-red-900/30 text-red-400 hover:text-red-300 hover:bg-red-950/30 hover:border-red-500/50 h-12"
                            onClick={handleSignOut}
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="font-mono text-sm">DISCONNECT</span>
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Header */}
                <header className="h-16 border-b border-cyan-500/20 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden text-cyan-400 hover:bg-cyan-950/30 h-10 w-10"
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            <Menu className="w-6 h-6" />
                        </Button>

                        {/* Breadcrumbs */}
                        <div className="hidden md:flex items-center gap-2 text-sm font-mono text-slate-500">
                            <span>SYSTEM</span>
                            <ChevronRight className="w-4 h-4" />
                            <span className="text-cyan-400 uppercase tracking-wider">
                                {navItems.find(i => i.path === location.pathname)?.name || 'UNKNOWN'}
                            </span>
                        </div>
                    </div>

                    {/* XP Bar */}
                    <div className="flex items-center gap-4 w-full max-w-[200px] md:max-w-md ml-auto">
                        <div className="flex-1">
                            <div className="flex justify-between text-[10px] font-mono mb-1.5">
                                <span className="text-cyan-400 font-bold">XP</span>
                                <span className="text-magenta-400">{xp} / {nextLevelXp}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                                <div
                                    className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-magenta-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(34,211,238,0.3)]"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Scrollable Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth overscroll-none">
                    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
        </div>
    )
}
