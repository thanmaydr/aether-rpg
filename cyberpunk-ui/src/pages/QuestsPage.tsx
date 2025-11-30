import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Loader2, Zap, Shield, Star, Filter, ArrowUpDown, Play } from 'lucide-react'

interface Quest {
    id: string
    title: string // From knowledge_node
    domain: string // From knowledge_node
    difficulty_tier: number // From knowledge_node
    xp_reward: number // From quest table
    corruption_level: number // Mocked for now, or derived
    node_id: string
}

export default function QuestsPage() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [quests, setQuests] = useState<Quest[]>([])

    // Filters & Sort
    const [domainFilter, setDomainFilter] = useState<string>('All')
    const [difficultyFilter, setDifficultyFilter] = useState<string>('All')
    const [sortBy, setSortBy] = useState<string>('newest')
    const [domains, setDomains] = useState<string[]>([])

    useEffect(() => {
        if (!user || !supabase) return

        const fetchQuests = async () => {
            if (!supabase) return
            try {
                setLoading(true)

                // 1. Get corrupted nodes from user_progress
                const { data: progressData, error: progressError } = await supabase
                    .from('user_progress')
                    .select('node_id')
                    .eq('user_id', user.id)
                    .eq('status', 'corrupted')

                if (progressError) throw progressError

                if (!progressData || progressData.length === 0) {
                    setQuests([])
                    setLoading(false)
                    return
                }

                const nodeIds = progressData.map(p => p.node_id)

                // 2. Fetch knowledge nodes and their associated quests
                const { data: nodesData, error: nodesError } = await supabase
                    .from('knowledge_nodes')
                    .select(`
                        id,
                        title,
                        domain,
                        difficulty_tier,
                        quests (
                            id,
                            xp_reward
                        )
                    `)
                    .in('id', nodeIds)

                if (nodesError) throw nodesError

                // 3. Transform data
                const formattedQuests: Quest[] = nodesData.flatMap(node => {
                    // If a node has multiple quests, create a card for each (or just the first one?)
                    // Assuming 1-1 for now or taking the first available quest
                    const nodeQuests = node.quests as { id: string; xp_reward: number }[]
                    if (!nodeQuests || nodeQuests.length === 0) return []

                    return nodeQuests.map(q => ({
                        id: q.id,
                        title: node.title,
                        domain: node.domain,
                        difficulty_tier: node.difficulty_tier,
                        xp_reward: q.xp_reward,
                        corruption_level: Math.floor(Math.random() * 40) + 60, // Mock: 60-100%
                        node_id: node.id
                    }))
                })

                setQuests(formattedQuests)

                // Extract domains
                const uniqueDomains = Array.from(new Set(formattedQuests.map(q => q.domain)))
                setDomains(['All', ...uniqueDomains])

            } catch (error) {
                console.error('Error fetching quests:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchQuests()
    }, [user])

    // Filter Logic
    const filteredQuests = quests.filter(quest => {
        const matchesDomain = domainFilter === 'All' || quest.domain === domainFilter
        const matchesDifficulty = difficultyFilter === 'All' || quest.difficulty_tier === parseInt(difficultyFilter)
        return matchesDomain && matchesDifficulty
    }).sort((a, b) => {
        if (sortBy === 'highest_xp') return b.xp_reward - a.xp_reward
        if (sortBy === 'lowest_difficulty') return a.difficulty_tier - b.difficulty_tier
        // Default / Newest (mocking newest by ID or random for now as we don't have created_at on the joined object easily without more mapping)
        return 0
    })

    if (loading) {
        return (
            <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-cyan-400" />
                <div className="text-cyan-400 font-mono animate-pulse">SCANNING_SECTOR...</div>
            </div>
        )
    }

    return (
        <div className="space-y-8 p-4 md:p-8 min-h-screen">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center animate-in slide-in-from-top-4 duration-500">
                <div>
                    <h1 className="text-3xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-magenta-500">
                        ACTIVE_QUESTS
                    </h1>
                    <p className="text-slate-400 font-mono text-sm mt-1">
                        {filteredQuests.length} CORRUPTED_NODES_DETECTED
                    </p>
                </div>

                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    {/* Domain Filter */}
                    <Select value={domainFilter} onValueChange={setDomainFilter}>
                        <SelectTrigger className="w-[140px] bg-slate-900/50 border-cyan-500/30 text-cyan-400 font-mono text-xs">
                            <Filter className="w-3 h-3 mr-2" />
                            <SelectValue placeholder="DOMAIN" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-cyan-500/30">
                            {domains.map(d => (
                                <SelectItem key={d} value={d} className="font-mono text-xs text-slate-300 focus:text-cyan-400 focus:bg-cyan-950/30">
                                    {d.toUpperCase()}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Difficulty Filter */}
                    <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                        <SelectTrigger className="w-[140px] bg-slate-900/50 border-cyan-500/30 text-cyan-400 font-mono text-xs">
                            <Star className="w-3 h-3 mr-2" />
                            <SelectValue placeholder="DIFFICULTY" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-cyan-500/30">
                            <SelectItem value="All" className="font-mono text-xs text-slate-300">ALL_TIERS</SelectItem>
                            {[1, 2, 3, 4, 5].map(i => (
                                <SelectItem key={i} value={i.toString()} className="font-mono text-xs text-slate-300">
                                    TIER {i}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Sort */}
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-[160px] bg-slate-900/50 border-cyan-500/30 text-cyan-400 font-mono text-xs">
                            <ArrowUpDown className="w-3 h-3 mr-2" />
                            <SelectValue placeholder="SORT" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-cyan-500/30">
                            <SelectItem value="newest" className="font-mono text-xs text-slate-300">NEWEST_DETECTED</SelectItem>
                            <SelectItem value="highest_xp" className="font-mono text-xs text-slate-300">HIGHEST_REWARD</SelectItem>
                            <SelectItem value="lowest_difficulty" className="font-mono text-xs text-slate-300">LOWEST_DIFFICULTY</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Grid */}
            {filteredQuests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-in fade-in duration-700">
                    <div className="w-16 h-16 rounded-full bg-cyan-950/30 flex items-center justify-center border border-cyan-500/20">
                        <Shield className="w-8 h-8 text-cyan-500/50" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-mono font-bold text-cyan-400">SECTOR_SECURE</h3>
                        <p className="text-slate-500 max-w-md mx-auto font-mono text-sm">
                            All nodes restored in this sector. Explore the Neural Map to discover new challenges!
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-950/30 mt-4"
                        onClick={() => navigate('/nexus')}
                    >
                        OPEN_NEURAL_MAP
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredQuests.map((quest, index) => (
                        <Card
                            key={quest.id}
                            className="group relative overflow-hidden bg-slate-900/40 border-slate-800 hover:border-cyan-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(34,211,238,0.1)]"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            {/* Hover Glow */}
                            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant="outline" className="bg-cyan-950/30 border-cyan-500/30 text-cyan-400 font-mono text-[10px] tracking-wider">
                                        {quest.domain.toUpperCase()}
                                    </Badge>
                                    <div className="flex items-center gap-1 text-magenta-400 font-mono text-xs font-bold">
                                        <Zap className="w-3 h-3" />
                                        {quest.xp_reward} XP
                                    </div>
                                </div>
                                <CardTitle className="text-xl font-mono font-bold text-white group-hover:text-cyan-400 transition-colors truncate">
                                    {quest.title}
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                {/* Difficulty */}
                                <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`w-3 h-3 ${i < quest.difficulty_tier ? 'text-yellow-500 fill-yellow-500' : 'text-slate-700'}`}
                                        />
                                    ))}
                                </div>

                                {/* Corruption Level */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-[10px] font-mono uppercase text-slate-400">
                                        <span>Corruption_Level</span>
                                        <span className="text-red-400">{quest.corruption_level}%</span>
                                    </div>
                                    <Progress value={quest.corruption_level} className="h-1 bg-slate-800" />
                                </div>
                            </CardContent>

                            <CardFooter className="pt-2">
                                <Button
                                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold tracking-wider group-hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all"
                                    onClick={() => navigate(`/quest/${quest.id}`)}
                                >
                                    <Play className="w-4 h-4 mr-2 fill-current" />
                                    ENGAGE_PROTOCOL
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
