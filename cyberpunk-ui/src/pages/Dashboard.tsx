import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useXP } from '@/hooks/useXP'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Activity,
    Shield,
    Zap,
    ChevronRight,
    Network,
    BookOpen,
    Swords,
    Clock,
    Flame
} from 'lucide-react'
import WelcomeModal from '@/components/Onboarding/WelcomeModal'

interface DashboardStats {
    xpTotal: number
    level: number
    nodesRestored: number
    activeQuests: number
    streak: number
}

interface QuestLog {
    id: string
    created_at: string
    completed: boolean
    ai_grade_json: { score?: number } | null
    quests: {
        node_id: string
        knowledge_nodes: {
            title: string
        }
    }
}

export default function Dashboard() {
    const { user } = useAuth()
    const { checkStreak } = useXP()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<DashboardStats>({
        xpTotal: 0,
        level: 1,
        nodesRestored: 0,
        activeQuests: 0,
        streak: 0
    })
    const [recentActivity, setRecentActivity] = useState<QuestLog[]>([])

    useEffect(() => {
        async function fetchDashboardData() {
            if (!user || !supabase) return

            try {
                // Check Streak
                const currentStreak = await checkStreak(user.id) || 0

                // Fetch Profile Stats
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('xp_total, level')
                    .eq('id', user.id)
                    .single()

                // Fetch Nodes Restored Count
                const { count: restoredCount } = await supabase
                    .from('user_progress')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .eq('status', 'restored')

                // Fetch Recent Quest Logs
                const { data: logs } = await supabase
                    .from('quest_logs')
                    .select(`
            id,
            created_at,
            completed,
            ai_grade_json,
            quests (
              node_id,
              knowledge_nodes (
                title
              )
            )
          `)
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(5)

                setStats({
                    xpTotal: profile?.xp_total || 0,
                    level: profile?.level || 1,
                    nodesRestored: restoredCount || 0,
                    activeQuests: 0, // Placeholder
                    streak: currentStreak
                })

                if (logs) {
                    // @ts-expect-error - Supabase types might be tricky with deep joins
                    setRecentActivity(logs)
                }

            } catch (error) {
                console.error('Error fetching dashboard data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchDashboardData()
    }, [user?.id, checkStreak])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const StatCard = ({ icon: Icon, label, value, color }: any) => (
        <Card className={`glass border-${color}-500/30 shadow-lg shadow-${color}-500/10 hover:shadow-${color}-500/20 transition-all duration-300`}>
            <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <p className={`text-sm font-mono text-${color}-200/70 mb-1`}>{label}</p>
                    {loading ? (
                        <Skeleton className="h-8 w-16" />
                    ) : (
                        <p className="text-3xl font-bold font-mono text-white">{value}</p>
                    )}
                </div>
                <div className={`p-3 rounded-full bg-${color}-500/10 border border-${color}-500/20`}>
                    <Icon className={`w-6 h-6 text-${color}-400`} />
                </div>
            </CardContent>
        </Card>
    )

    return (
        <div className="space-y-8 pb-8">
            <WelcomeModal />
            {/* Hero Section */}
            <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-magenta-500">
                    WELCOME_BACK, {user?.email?.split('@')[0].toUpperCase()}
                </h1>
                <p className="text-slate-400 font-mono">Restore the Archives. Reclaim Knowledge.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Network} label="NODES_RESTORED" value={stats.nodesRestored} color="cyan" />
                <StatCard icon={Shield} label="MASTERY_LEVEL" value={stats.level} color="magenta" />
                <StatCard icon={Flame} label="DAILY_STREAK" value={stats.streak} color="orange" />
                <StatCard icon={Zap} label="TOTAL_XP" value={stats.xpTotal} color="purple" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-mono font-bold text-cyan-400 flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        RECENT_ACTIVITY
                    </h2>

                    <div className="space-y-4">
                        {loading ? (
                            Array(3).fill(0).map((_, i) => (
                                <Skeleton key={i} className="h-24 w-full" />
                            ))
                        ) : recentActivity.length > 0 ? (
                            recentActivity.map((log) => (
                                <Card key={log.id} className="glass border-slate-700/50 hover:border-cyan-500/30 transition-colors group">
                                    <CardContent className="p-4 flex items-center gap-4">
                                        <div className={`p-2 rounded border ${log.completed ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'}`}>
                                            {log.completed ? <Shield className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-mono font-bold text-slate-200 truncate group-hover:text-cyan-400 transition-colors">

                                                {log.quests?.knowledge_nodes?.title || 'Unknown Quest'}
                                            </h3>
                                            <div className="flex items-center gap-3 text-xs font-mono text-slate-500 mt-1">
                                                <span>{new Date(log.created_at).toLocaleDateString()}</span>
                                                <span>•</span>
                                                <span>SCORE: {log.ai_grade_json?.score || 0}%</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-xs font-mono px-2 py-1 rounded border ${log.completed
                                                ? 'bg-green-950/30 border-green-500/30 text-green-400'
                                                : 'bg-yellow-950/30 border-yellow-500/30 text-yellow-400'
                                                }`}>
                                                {log.completed ? 'COMPLETE' : 'IN_PROGRESS'}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <Card className="glass border-dashed border-slate-700">
                                <CardContent className="p-8 text-center space-y-2">
                                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                                        <Swords className="w-6 h-6 text-slate-500" />
                                    </div>
                                    <p className="text-slate-300 font-mono">No quests attempted yet.</p>
                                    <p className="text-sm text-slate-500 font-mono">Begin your journey by exploring the Nexus.</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-6">
                    <h2 className="text-xl font-mono font-bold text-magenta-400 flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        QUICK_ACTIONS
                    </h2>

                    <div className="grid gap-4">
                        <Button
                            className="h-auto p-4 bg-gradient-to-r from-cyan-900/50 to-cyan-800/50 border border-cyan-500/30 hover:border-cyan-400 hover:from-cyan-900/70 hover:to-cyan-800/70 justify-between group"
                            onClick={() => navigate('/nexus')}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded bg-cyan-500/20 text-cyan-400">
                                    <Network className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <div className="font-mono font-bold text-cyan-100">EXPLORE_NEXUS</div>
                                    <div className="text-xs text-cyan-300/50 font-mono">View Knowledge Graph</div>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-cyan-500/50 group-hover:text-cyan-400 transition-colors" />
                        </Button>

                        <Button
                            className="h-auto p-4 bg-gradient-to-r from-magenta-900/50 to-magenta-800/50 border border-magenta-500/30 hover:border-magenta-400 hover:from-magenta-900/70 hover:to-magenta-800/70 justify-between group"
                            onClick={() => navigate('/quests')}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded bg-magenta-500/20 text-magenta-400">
                                    <Swords className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <div className="font-mono font-bold text-magenta-100">ACTIVE_QUESTS</div>
                                    <div className="text-xs text-magenta-300/50 font-mono">Continue Challenges</div>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-magenta-500/50 group-hover:text-magenta-400 transition-colors" />
                        </Button>

                        <Button
                            className="h-auto p-4 bg-gradient-to-r from-purple-900/50 to-purple-800/50 border border-purple-500/30 hover:border-purple-400 hover:from-purple-900/70 hover:to-purple-800/70 justify-between group"
                            onClick={() => navigate('/archives')}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded bg-purple-500/20 text-purple-400">
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <div className="font-mono font-bold text-purple-100">ARCHIVES</div>
                                    <div className="text-xs text-purple-300/50 font-mono">Review Knowledge</div>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-purple-500/50 group-hover:text-purple-400 transition-colors" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
