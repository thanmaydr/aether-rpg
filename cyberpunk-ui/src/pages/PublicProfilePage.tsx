import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Shield, User, Trophy, Calendar, Lock } from 'lucide-react'

interface PublicProfile {
    id: string
    username: string
    avatar_url: string | null
    xp_total: number
    level: number
    character_class: string
    created_at: string
    is_public: boolean
}

export default function PublicProfilePage() {
    const { userId } = useParams()
    const [profile, setProfile] = useState<PublicProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!userId) return

        const fetchProfile = async () => {
            if (!supabase) return
            try {
                // We can just select * because RLS will handle the privacy check 
                // (returning empty or error if not public/owned)
                // BUT we added a policy "Public profiles are viewable by everyone".
                // So if we fetch by ID and get nothing, it's either non-existent or private.

                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single()

                if (error) throw error
                setProfile(data)
            } catch (err: any) {
                console.error('Error fetching profile:', err)
                // If error code is likely "row not found" (PGRST116), it means private or invalid ID
                if (err.code === 'PGRST116') {
                    setError('Profile is private or does not exist.')
                } else {
                    setError('Failed to load profile.')
                }
            } finally {
                setLoading(false)
            }
        }

        fetchProfile()
    }, [userId])

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
        )
    }

    if (error || !profile) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4 text-center p-4">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                    <Lock className="w-8 h-8 text-slate-500" />
                </div>
                <h2 className="text-xl font-mono font-bold text-white">ACCESS DENIED</h2>
                <p className="text-slate-400 font-mono text-sm max-w-md">
                    {error || "This operative's profile is encrypted."}
                </p>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 h-full overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-lg bg-slate-900/50 border border-slate-800">
                <div className="w-24 h-24 rounded bg-slate-950 border-2 border-cyan-500/30 flex items-center justify-center overflow-hidden shrink-0">
                    {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                    ) : (
                        <User className="w-12 h-12 text-slate-500" />
                    )}
                </div>
                <div className="text-center md:text-left space-y-2">
                    <h1 className="text-3xl font-mono font-bold text-white">{profile.username}</h1>
                    <div className="flex items-center justify-center md:justify-start gap-3 text-sm font-mono text-slate-400">
                        <span className="px-2 py-0.5 rounded bg-cyan-950/50 text-cyan-400 border border-cyan-500/20">
                            LVL {profile.level}
                        </span>
                        <span>{profile.character_class || 'Novice'}</span>
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Joined {new Date(profile.created_at).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-mono text-slate-500 uppercase flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-yellow-400" />
                            Total XP
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-mono font-bold text-white">
                            {profile.xp_total.toLocaleString()}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-mono text-slate-500 uppercase flex items-center gap-2">
                            <Shield className="w-4 h-4 text-magenta-400" />
                            Class
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-mono font-bold text-white">
                            {profile.character_class || 'Novice'}
                        </div>
                    </CardContent>
                </Card>

                {/* Placeholder for future stats */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-mono text-slate-500 uppercase flex items-center gap-2">
                            <User className="w-4 h-4 text-cyan-400" />
                            Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-mono font-bold text-green-400">
                            ACTIVE
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
