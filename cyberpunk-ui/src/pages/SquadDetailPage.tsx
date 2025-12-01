import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Users, Trophy, Loader2, LogOut, Crown, User } from 'lucide-react'
import { toast } from 'sonner'

interface SquadMember {
    user_id: string
    role: string
    joined_at: string
    profiles: {
        username: string
        avatar_url: string | null
        level: number
        character_class: string
    }
}

interface SquadDetail {
    id: string
    name: string
    description: string
    squad_xp: number
    created_by: string
}

export default function SquadDetailPage() {
    const { squadId } = useParams()
    const { user } = useAuth()
    const navigate = useNavigate()
    const [squad, setSquad] = useState<SquadDetail | null>(null)
    const [members, setMembers] = useState<SquadMember[]>([])
    const [loading, setLoading] = useState(true)
    const [isMember, setIsMember] = useState(false)

    useEffect(() => {
        if (squadId) {
            fetchSquadDetails()
        }
    }, [squadId, user])

    const fetchSquadDetails = async () => {
        if (!supabase) return
        try {
            setLoading(true)
            // Fetch Squad Info
            const { data: squadData, error: squadError } = await supabase
                .from('squads')
                .select('*')
                .eq('id', squadId)
                .single()

            if (squadError) throw squadError
            setSquad(squadData)

            // Fetch Members
            const { data: membersData, error: membersError } = await supabase
                .from('squad_members')
                .select(`
                    user_id,
                    role,
                    joined_at,
                    profiles (
                        username,
                        avatar_url,
                        level,
                        character_class
                    )
                `)
                .eq('squad_id', squadId)

            if (membersError) throw membersError

            // Transform data to match interface (flatten profiles)
            const formattedMembers = membersData.map((m: any) => ({
                user_id: m.user_id,
                role: m.role,
                joined_at: m.joined_at,
                profiles: m.profiles
            }))

            setMembers(formattedMembers)

            // Check if current user is member
            if (user) {
                const isUserMember = formattedMembers.some(m => m.user_id === user.id)
                setIsMember(isUserMember)
            }

        } catch (error) {
            console.error('Error fetching squad details:', error)
            toast.error('Failed to load squad details')
            navigate('/squads')
        } finally {
            setLoading(false)
        }
    }

    const handleLeaveSquad = async () => {
        if (!supabase) return
        if (!confirm('Are you sure you want to leave this squad?')) return

        try {
            const { error } = await supabase.rpc('leave_squad')
            if (error) throw error

            toast.success('You have left the squad.')
            navigate('/squads')
        } catch (error: any) {
            console.error('Error leaving squad:', error)
            toast.error(error.message || 'Failed to leave squad')
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
        )
    }

    if (!squad) return null

    return (
        <div className="space-y-8 pb-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-cyan-500/20 pb-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-mono font-bold text-white">
                            {squad.name}
                        </h1>
                        <div className="flex items-center gap-1 text-sm text-yellow-400 bg-yellow-950/30 px-3 py-1 rounded-full border border-yellow-500/30">
                            <Trophy className="w-4 h-4" />
                            <span>{squad.squad_xp} XP</span>
                        </div>
                    </div>
                    <p className="text-slate-400 font-mono max-w-2xl">
                        {squad.description}
                    </p>
                </div>

                {isMember && (
                    <Button
                        variant="destructive"
                        onClick={handleLeaveSquad}
                        className="bg-red-950/50 border-red-500/30 text-red-400 hover:bg-red-900/50 font-mono gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        LEAVE_SQUAD
                    </Button>
                )}
            </div>

            {/* Members Grid */}
            <div>
                <h2 className="text-xl font-mono font-bold text-cyan-400 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    SQUAD_ROSTER ({members.length})
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {members.map((member) => (
                        <Card key={member.user_id} className="bg-slate-900/50 border-slate-800">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full border border-cyan-500/30 overflow-hidden bg-slate-800 flex items-center justify-center">
                                    {member.profiles.avatar_url ? (
                                        <img src={member.profiles.avatar_url} alt={member.profiles.username} className="h-full w-full object-cover" />
                                    ) : (
                                        <User className="w-6 h-6 text-cyan-400" />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-slate-200 truncate">
                                            {member.profiles.username}
                                        </span>
                                        {member.role === 'leader' && (
                                            <Crown className="w-3 h-3 text-yellow-400" />
                                        )}
                                    </div>
                                    <div className="text-xs font-mono text-slate-500 flex items-center gap-2">
                                        <span>Lvl {member.profiles.level}</span>
                                        <span>•</span>
                                        <span>{member.profiles.character_class}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
