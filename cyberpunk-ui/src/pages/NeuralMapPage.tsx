import { useEffect, useState, useCallback, Suspense, lazy } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Filter, Info, RefreshCw, AlertTriangle } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'

// Lazy load components
const ForceGraphCanvas = lazy(() => import('@/components/NeuralMap/ForceGraphCanvas'))
// Import direct component (lightweight) or lazy load if heavy
const NeuralListView = lazy(() => import('@/components/NeuralMap/NeuralListView'))

interface GraphNode {
    id: string
    title: string
    status: 'locked' | 'corrupted' | 'restored'
    domain: string
    difficulty_tier: number
    quest_id?: string
}

interface GraphLink {
    source: string
    target: string
}

export default function NeuralMapPage() {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [nodes, setNodes] = useState<GraphNode[]>([])
    const [links, setLinks] = useState<GraphLink[]>([])
    const [filterDomain, setFilterDomain] = useState<string>('All')
    const [domains, setDomains] = useState<string[]>([])
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map')

    const fetchData = useCallback(async () => {
        if (!user || !supabase) return

        try {
            setLoading(true)
            setError(null)

            // Fetch all nodes
            const { data: knowledgeNodes, error: nodesError } = await supabase
                .from('knowledge_nodes')
                .select('*')

            if (nodesError) throw nodesError

            // Fetch user progress
            const { data: userProgress, error: progressError } = await supabase
                .from('user_progress')
                .select('node_id, status')
                .eq('user_id', user.id)

            if (progressError) throw progressError

            // Fetch Quests to link nodes
            const { data: quests, error: questsError } = await supabase
                .from('quests')
                .select('node_id, id')

            if (questsError) throw questsError

            // Process data
            const progressMap = new Map(userProgress?.map(p => [p.node_id, p.status]) || [])
            const questMap = new Map(quests?.map(q => [q.node_id, q.id]) || [])

            const graphNodes: GraphNode[] = (knowledgeNodes || []).map(node => {
                let status = (progressMap.get(node.id) as 'locked' | 'corrupted' | 'restored')

                if (!status) {
                    // Default logic for nodes without progress
                    if (node.difficulty_tier === 1) {
                        status = 'corrupted' // Tier 1 is always available
                    } else if (node.parent_node_id) {
                        // Check if parent is restored
                        const parentStatus = progressMap.get(node.parent_node_id)
                        if (parentStatus === 'restored') {
                            status = 'corrupted' // Unlock if parent is restored
                        } else {
                            status = 'locked'
                        }
                    } else {
                        status = 'locked'
                    }
                }

                return {
                    id: node.id,
                    title: node.title,
                    status,
                    domain: node.domain,
                    difficulty_tier: node.difficulty_tier,
                    quest_id: questMap.get(node.id)
                }
            })

            const graphLinks: GraphLink[] = (knowledgeNodes || [])
                .filter(node => node.parent_node_id)
                .map(node => ({
                    source: node.parent_node_id!,
                    target: node.id
                }))

            setNodes(graphNodes)
            setLinks(graphLinks)

            // Extract unique domains
            const uniqueDomains = Array.from(new Set(graphNodes.map(n => n.domain)))
            setDomains(['All', ...uniqueDomains])

        } catch (err) {
            console.error('Error fetching neural map:', err)
            const errorMessage = (err as Error).message || 'Failed to load Neural Map data.'
            setError(errorMessage)
            toast.error('Neural Link Failed', {
                description: errorMessage,
            })
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        fetchData()

        // Real-time subscription for progress updates
        if (!supabase) return

        const subscription = supabase
            .channel('neural_map_updates')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'user_progress',
                filter: `user_id=eq.${user?.id}`
            }, () => {
                fetchData()
            })
            .subscribe()

        return () => {
            subscription.unsubscribe()
        }
    }, [fetchData, user?.id])

    const filteredNodes = filterDomain === 'All'
        ? nodes
        : nodes.filter(n => n.domain === filterDomain)

    const filteredLinks = links.filter(link => {
        const sourceNode = nodes.find(n => n.id === (typeof link.source === 'object' ? (link.source as GraphNode).id : link.source))
        const targetNode = nodes.find(n => n.id === (typeof link.target === 'object' ? (link.target as GraphNode).id : link.target))

        if (!sourceNode || !targetNode) return false

        if (filterDomain === 'All') return true
        return sourceNode.domain === filterDomain && targetNode.domain === filterDomain
    })

    if (loading) {
        return (
            <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center space-y-4 bg-slate-950">
                <Spinner size="xl" variant="cyan" />
                <div className="text-cyan-400 font-mono animate-pulse tracking-widest">INITIALIZING_NEURAL_LINK...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-950">
                <Alert variant="destructive" className="max-w-md border-red-500/50 bg-red-950/20">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>CONNECTION_ERROR</AlertTitle>
                    <AlertDescription className="mt-2 flex flex-col gap-4">
                        <p>{error}</p>
                        <Button onClick={fetchData} variant="outline" className="w-full border-red-500/50 hover:bg-red-900/50 text-red-400">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            RETRY_CONNECTION
                        </Button>
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    if (nodes.length === 0) {
        return (
            <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center space-y-4 bg-slate-950">
                <div className="text-slate-500 font-mono">No nodes in archive. Contact administrator.</div>
                <Button onClick={fetchData} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                </Button>
            </div>
        )
    }

    return (
        <div className="relative h-[calc(100vh-5rem)] w-full bg-slate-950 flex flex-col">
            {/* View Toggle Header */}
            <div className="absolute top-4 left-4 z-20 flex gap-2">
                <Card className="bg-slate-900/80 backdrop-blur border-cyan-500/30 p-1 flex gap-1">
                    <Button
                        variant={viewMode === 'map' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('map')}
                        className={`text-xs font-mono gap-2 ${viewMode === 'map' ? 'bg-cyan-600 hover:bg-cyan-500' : 'text-slate-400 hover:text-cyan-400'}`}
                    >
                        <RefreshCw className="w-3 h-3" /> {/* Reusing Icon for generic map node, ideally replace with Network/Share2 */}
                        MAP_VIEW
                    </Button>
                    <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className={`text-xs font-mono gap-2 ${viewMode === 'list' ? 'bg-cyan-600 hover:bg-cyan-500' : 'text-slate-400 hover:text-cyan-400'}`}
                    >
                        <Filter className="w-3 h-3" /> {/* Reusing Icon for list, ideally replace with List/LayoutList */}
                        LIST_VIEW
                    </Button>
                </Card>
            </div>

            <div className="flex-1 w-full h-full relative overflow-hidden">
                <Suspense fallback={
                    <div className="w-full h-full flex items-center justify-center bg-slate-950 border border-cyan-500/20 rounded-lg">
                        <Spinner size="lg" variant="neon" />
                    </div>
                }>
                    {viewMode === 'map' ? (
                        <ForceGraphCanvas
                            nodes={filteredNodes}
                            links={filteredLinks}
                            onNodeClick={(nodeId) => console.log('Clicked:', nodeId)}
                        />
                    ) : (
                        <NeuralListView
                            nodes={filteredNodes}
                            onNodeClick={(node) => console.log('Clicked:', node.id)}
                        />
                    )}
                </Suspense>
            </div>

            {/* Overlay UI (Visible in both modes) */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 pointer-events-none animate-in fade-in slide-in-from-right-4 duration-500">
                <Card className="w-64 bg-slate-900/80 backdrop-blur border-cyan-500/30 pointer-events-auto">
                    <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-cyan-400 font-mono font-bold text-sm flex items-center gap-2">
                                <Filter className="w-4 h-4" />
                                FILTER_DOMAIN
                            </h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {domains.map(domain => (
                                <Button
                                    key={domain}
                                    variant={filterDomain === domain ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFilterDomain(domain)}
                                    className={`text-xs font-mono ${filterDomain === domain
                                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white border-none'
                                        : 'border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 bg-transparent'
                                        }`}
                                >
                                    {domain}
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="w-64 bg-slate-900/80 backdrop-blur border-slate-700/50 pointer-events-auto">
                    <CardContent className="p-4">
                        <h3 className="text-slate-400 font-mono font-bold text-sm flex items-center gap-2 mb-2">
                            <Info className="w-4 h-4" />
                            LEGEND
                        </h3>
                        <div className="space-y-2 text-xs font-mono">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]"></div>
                                <span className="text-slate-300">RESTORED</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse"></div>
                                <span className="text-slate-300">CORRUPTED</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-slate-600"></div>
                                <span className="text-slate-500">LOCKED</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
