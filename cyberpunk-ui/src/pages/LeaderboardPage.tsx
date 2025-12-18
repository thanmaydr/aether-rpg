import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy, Medal, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

interface LeaderboardEntry {
    id: string
    username: string
    xp_total: number
    level: number
    character_class: string
    avatar_url: string | null
    is_public: boolean
}

export default function LeaderboardPage() {
    const [leaders, setLeaders] = useState<LeaderboardEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchLeaderboard = async () => {
            if (!supabase) return
            try {
                const { data, error } = await supabase.rpc('get_leaderboard')
                if (error) throw error
                console.log('Leaderboard data:', data) // Debug log
                setLeaders(data || [])
            } catch (error: any) {
                console.error('Error fetching leaderboard:', error)
                setError(error.message || 'Failed to fetch leaderboard')
            } finally {
                setLoading(false)
            }
        }

        fetchLeaderboard()
    }, [])

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="h-full flex items-center justify-center p-8 text-center bg-red-950/20">
                <div className="space-y-2">
                    <h2 className="text-xl font-bold text-red-500 font-mono">SYSTEM_ERROR</h2>
                    <p className="text-slate-400 font-mono text-sm max-w-md">{error}</p>
                    <p className="text-slate-500 text-xs mt-4">Check database migration for 'get_leaderboard' RPC.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 space-y-6 h-full overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
                <Trophy className="w-8 h-8 text-yellow-400" />
                <h1 className="text-2xl font-mono font-bold text-white tracking-wider">GLOBAL_LEADERBOARD</h1>
            </div>

            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-sm font-mono text-slate-400 uppercase">Top Operatives</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {leaders.map((leader, index) => (
                            <div
                                key={leader.id}
                                className="flex items-center justify-between p-4 rounded bg-slate-950/50 border border-slate-800 hover:border-cyan-500/30 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 flex items-center justify-center font-mono font-bold text-slate-500">
                                        {index + 1 <= 3 ? (
                                            <Medal className={`w-6 h-6 ${index === 0 ? 'text-yellow-400' :
                                                index === 1 ? 'text-slate-300' :
                                                    'text-amber-600'
                                                }`} />
                                        ) : (
                                            `#${index + 1}`
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden">
                                            {leader.avatar_url ? (
                                                <img src={leader.avatar_url} alt={leader.username} className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-5 h-5 text-slate-500" />
                                            )}
                                        </div>
                                        <div>
                                            {leader.is_public ? (
                                                <Link
                                                    to={`/agent/${leader.id}`}
                                                    className="font-mono font-bold text-cyan-400 hover:underline"
                                                >
                                                    {leader.username}
                                                </Link>
                                            ) : (
                                                <span className="font-mono font-bold text-slate-500 italic">
                                                    {leader.username}
                                                </span>
                                            )}
                                            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                                                <span>LVL {leader.level}</span>
                                                <span>•</span>
                                                <span>{leader.character_class || 'Novice'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="font-mono font-bold text-white">{leader.xp_total.toLocaleString()} XP</div>
                                    <div className="text-xs text-slate-500 font-mono uppercase">Total Score</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
