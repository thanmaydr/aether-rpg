import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronRight, Lock, CheckCircle, AlertCircle, Play } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface GraphNode {
    id: string
    title: string
    status: 'locked' | 'corrupted' | 'restored'
    domain: string
    difficulty_tier: number
    quest_id?: string
}

interface NeuralListViewProps {
    nodes: GraphNode[]
    onNodeClick: (node: GraphNode) => void
}

export default function NeuralListView({ nodes, onNodeClick }: NeuralListViewProps) {
    const navigate = useNavigate()

    // Group nodes by domain
    const nodesByDomain = useMemo(() => {
        const groups: Record<string, GraphNode[]> = {}
        nodes.forEach(node => {
            if (!groups[node.domain]) {
                groups[node.domain] = []
            }
            groups[node.domain].push(node)
        })

        // Sort domains alphabetically
        // Sort nodes within domains by difficulty tier
        Object.keys(groups).forEach(domain => {
            groups[domain].sort((a, b) => a.difficulty_tier - b.difficulty_tier)
        })

        return Object.keys(groups).sort().reduce((acc, domain) => {
            acc[domain] = groups[domain]
            return acc
        }, {} as Record<string, GraphNode[]>)
    }, [nodes])

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'restored': return 'text-cyan-400 border-cyan-500/30'
            case 'corrupted': return 'text-red-400 border-red-500/30'
            case 'locked': return 'text-slate-500 border-slate-700/50'
            default: return 'text-slate-500'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'restored': return <CheckCircle className="w-4 h-4 text-cyan-400" />
            case 'corrupted': return <AlertCircle className="w-4 h-4 text-red-400" />
            case 'locked': return <Lock className="w-4 h-4 text-slate-500" />
            default: return <Lock className="w-4 h-4 text-slate-500" />
        }
    }

    return (
        <div className="w-full max-w-4xl mx-auto p-4 pt-28 pr-80 space-y-6 pb-20 overflow-y-auto h-full [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-950 [&::-webkit-scrollbar-thumb]:bg-cyan-900/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-cyan-500/50">
            {Object.entries(nodesByDomain).map(([domain, domainNodes]) => {
                const totalNodes = domainNodes.length
                const restoredCount = domainNodes.filter(n => n.status === 'restored').length
                const progress = Math.round((restoredCount / totalNodes) * 100)

                return (
                    <div key={domain} className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-end justify-between border-b border-slate-800 pb-2">
                            <div>
                                <h3 className="text-xl font-mono font-bold text-slate-200">{domain}</h3>
                                <div className="text-xs text-slate-500 font-mono mt-1">
                                    {restoredCount}/{totalNodes} NODES RESTORED ({progress}%)
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-3">
                            {domainNodes.map((node) => (
                                <Card
                                    key={node.id}
                                    className={`bg-slate-900/40 border transition-all duration-200 group ${getStatusColor(node.status)} hover:bg-slate-900/80 cursor-pointer`}
                                    onClick={() => onNodeClick(node)}
                                >
                                    <div className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="flex-shrink-0">
                                                {getStatusIcon(node.status)}
                                            </div>
                                            <div>
                                                <h4 className={`font-mono font-bold text-sm ${node.status === 'locked' ? 'text-slate-500' : 'text-slate-200 group-hover:text-white'
                                                    }`}>
                                                    {node.title}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-950/50 text-slate-400 border border-slate-800">
                                                        Tier {node.difficulty_tier}
                                                    </span>
                                                    {node.status === 'corrupted' && (
                                                        <span className="text-[10px] font-mono text-red-400 flex items-center gap-1 animate-pulse">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                                            ACTIVE THREAT
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {node.status === 'corrupted' && node.quest_id ? (
                                                <Button
                                                    size="sm"
                                                    className="bg-red-600 hover:bg-red-500 text-white font-mono text-xs h-8 gap-2"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        navigate(`/quest/${node.quest_id}`)
                                                    }}
                                                >
                                                    <Play className="w-3 h-3" />
                                                    START
                                                </Button>
                                            ) : (
                                                <ChevronRight className={`w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity ${node.status === 'locked' ? 'text-slate-600' : 'text-slate-400'
                                                    }`} />
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
