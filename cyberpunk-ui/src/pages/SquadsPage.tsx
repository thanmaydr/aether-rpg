import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Users, Plus, Shield, Trophy, Search, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

interface Squad {
    id: string
    name: string
    description: string
    squad_xp: number
    member_count: number
    is_open: boolean
}

export default function SquadsPage() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [squads, setSquads] = useState<Squad[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isCreating, setIsCreating] = useState(false)
    const [newSquadName, setNewSquadName] = useState('')
    const [newSquadDesc, setNewSquadDesc] = useState('')
    const [userSquadId, setUserSquadId] = useState<string | null>(null)

    useEffect(() => {
        fetchSquads()
        checkUserSquad()
    }, [user])

    const fetchSquads = async () => {
        if (!supabase) return
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('squads')
                .select('*')
                .order('squad_xp', { ascending: false })

            if (error) throw error
            setSquads(data || [])
        } catch (error) {
            console.error('Error fetching squads:', error)
            toast.error('Failed to load squads')
        } finally {
            setLoading(false)
        }
    }

    const checkUserSquad = async () => {
        if (!user || !supabase) return
        const { data } = await supabase
            .from('squad_members')
            .select('squad_id')
            .eq('user_id', user.id)
            .single()

        if (data) setUserSquadId(data.squad_id)
    }

    const handleCreateSquad = async () => {
        if (!newSquadName.trim() || !supabase) return
        setIsCreating(true)
        try {
            const { data, error } = await supabase.rpc('create_squad', {
                name: newSquadName,
                description: newSquadDesc
            })

            if (error) throw error

            toast.success('Squad created successfully!')
            setNewSquadName('')
            setNewSquadDesc('')
            if (data) {
                navigate(`/squads/${data}`)
            } else {
                fetchSquads()
                checkUserSquad()
            }
        } catch (error: any) {
            console.error('Error creating squad:', error)
            toast.error(error.message || 'Failed to create squad')
        } finally {
            setIsCreating(false)
        }
    }

    const handleJoinSquad = async (squadId: string) => {
        if (!supabase) return
        try {
            const { error } = await supabase.rpc('join_squad', {
                squad_id_input: squadId
            })

            if (error) throw error
            toast.success('Joined squad!')
            navigate(`/squads/${squadId}`)
        } catch (error: any) {
            console.error('Error joining squad:', error)
            toast.error(error.message || 'Failed to join squad')
        }
    }

    const filteredSquads = squads.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
        )
    }

    return (
        <div className="space-y-8 pb-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-magenta-500">
                        RESTORATION_SQUADS
                    </h1>
                    <p className="text-slate-400 mt-2 font-mono text-sm max-w-xl">
                        Join forces with other operatives. Collaborate on nodes and earn <span className="text-yellow-400">+10% XP Bonus</span> on all missions.
                    </p>
                </div>

                {userSquadId ? (
                    <Button
                        onClick={() => navigate(`/squads/${userSquadId}`)}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-mono gap-2"
                    >
                        <Shield className="w-4 h-4" />
                        MY_SQUAD
                    </Button>
                ) : (
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button className="bg-magenta-600 hover:bg-magenta-500 text-white font-mono gap-2">
                                <Plus className="w-4 h-4" />
                                FORM_SQUAD
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-900 border-cyan-500/30 text-slate-100">
                            <DialogHeader>
                                <DialogTitle className="font-mono text-cyan-400">INITIATE_SQUAD_PROTOCOL</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-mono text-slate-500 uppercase">Squad Name</label>
                                    <Input
                                        value={newSquadName}
                                        onChange={(e) => setNewSquadName(e.target.value)}
                                        placeholder="e.g. The Feynman Corps"
                                        className="bg-black/50 border-slate-700 font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-mono text-slate-500 uppercase">Mission Statement</label>
                                    <Textarea
                                        value={newSquadDesc}
                                        onChange={(e) => setNewSquadDesc(e.target.value)}
                                        placeholder="Our goal is to restore the entire network..."
                                        className="bg-black/50 border-slate-700 font-mono"
                                    />
                                </div>
                                <Button
                                    onClick={handleCreateSquad}
                                    disabled={isCreating || !newSquadName}
                                    className="w-full bg-cyan-600 hover:bg-cyan-500 font-mono"
                                >
                                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ESTABLISH_LINK'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                    placeholder="Search squads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-900/50 border-slate-800 focus:border-cyan-500/50 font-mono"
                />
            </div>

            {/* Squads Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSquads.map((squad) => (
                    <Card key={squad.id} className="bg-slate-900/50 border-cyan-500/20 hover:border-cyan-500/50 transition-all group">
                        <CardHeader>
                            <CardTitle className="font-mono text-lg text-cyan-400 flex justify-between items-start">
                                <span>{squad.name}</span>
                                <div className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-950/30 px-2 py-1 rounded">
                                    <Trophy className="w-3 h-3" />
                                    <span>{squad.squad_xp} XP</span>
                                </div>
                            </CardTitle>
                            <CardDescription className="font-mono text-xs text-slate-500 line-clamp-2">
                                {squad.description || "No description provided."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between items-center mt-4">
                                <div className="flex items-center gap-2 text-slate-400 text-sm font-mono">
                                    <Users className="w-4 h-4" />
                                    <span>Squad</span>
                                </div>
                                {!userSquadId && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-950/30 font-mono"
                                        onClick={() => handleJoinSquad(squad.id)}
                                    >
                                        JOIN_UNIT
                                    </Button>
                                )}
                                {userSquadId === squad.id && (
                                    <span className="text-xs font-mono text-green-400 bg-green-950/30 px-2 py-1 rounded">
                                        ACTIVE_UNIT
                                    </span>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {filteredSquads.length === 0 && (
                    <div className="col-span-full text-center py-12 text-slate-500 font-mono">
                        NO SQUADS FOUND. BE THE FIRST TO ESTABLISH A UNIT.
                    </div>
                )}
            </div>
        </div>
    )
}
