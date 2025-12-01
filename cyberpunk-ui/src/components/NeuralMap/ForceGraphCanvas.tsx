import { useState, useRef, useEffect, memo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, Play, Lock, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Node {
    id: string
    title: string
    status: 'locked' | 'corrupted' | 'restored'
    domain: string
    difficulty_tier: number
    quest_id?: string
    x?: number
    y?: number
}

interface Link {
    source: string
    target: string
}

interface ForceGraphCanvasProps {
    nodes: Node[]
    links: Link[]
    onNodeClick: (nodeId: string) => void
}

const ForceGraphCanvas = memo(function ForceGraphCanvas({ nodes, links, onNodeClick }: ForceGraphCanvasProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fgRef = useRef<any>(null)
    const [selectedNode, setSelectedNode] = useState<Node | null>(null)
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
    const [isMobile, setIsMobile] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const navigate = useNavigate()

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                })
            }
            setIsMobile(window.innerWidth < 768)
        }

        window.addEventListener('resize', updateDimensions)
        updateDimensions()

        return () => window.removeEventListener('resize', updateDimensions)
    }, [])

    const handleNodeClick = (node: Node) => {
        setSelectedNode(node)
        onNodeClick(node.id)

        // Center view on node
        if (fgRef.current) {
            fgRef.current.centerAt(node.x, node.y, 1000)
            fgRef.current.zoom(isMobile ? 1.5 : 2, 1000)
        }
    }

    const handleZoomIn = () => {
        if (fgRef.current) {
            fgRef.current.zoom(fgRef.current.zoom() * 1.2, 400)
        }
    }

    const handleZoomOut = () => {
        if (fgRef.current) {
            fgRef.current.zoom(fgRef.current.zoom() / 1.2, 400)
        }
    }

    const handleReset = () => {
        if (fgRef.current) {
            fgRef.current.zoomToFit(400)
        }
    }

    const getNodeColor = (status: string) => {
        switch (status) {
            case 'restored': return '#22d3ee' // cyan-400
            case 'corrupted': return '#ef4444' // red-500
            case 'locked': return '#475569' // slate-600
            default: return '#475569'
        }
    }

    return (
        <div className="relative w-full h-full min-h-[600px] border border-cyan-500/20 rounded-lg overflow-hidden bg-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.05)]" ref={containerRef}>
            <ForceGraph2D
                ref={fgRef}
                width={dimensions.width}
                height={dimensions.height}
                graphData={{ nodes, links }}
                backgroundColor="#020617"
                nodeLabel="title"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                nodeColor={(node: any) => getNodeColor(node.status)}
                linkColor={() => '#1e293b'} // slate-800
                linkWidth={2}
                enableNodeDrag={false}
                dagMode={isMobile ? undefined : "td"}
                dagLevelDistance={isMobile ? 80 : 150} // Increased spacing
                d3VelocityDecay={0.3} // Stabilize faster
                cooldownTicks={100}
                onEngineStop={() => fgRef.current?.zoomToFit(400)}
                onNodeClick={(node: Node) => handleNodeClick(node)}
                linkDirectionalParticles={isMobile ? 1 : 2}
                linkDirectionalParticleSpeed={0.005}
                linkDirectionalParticleWidth={2}
                linkDirectionalParticleColor={() => '#38bdf8'} // sky-400
                d3AlphaDecay={0.02} // Slower decay for better settlement
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                    const n = node as Node
                    const label = n.title
                    const fontSize = (isMobile ? 14 : 12) / globalScale
                    const radius = Math.max(6, (n.difficulty_tier || 1) * 4) // Slightly larger nodes
                    const color = getNodeColor(n.status)
                    const isSelected = n === selectedNode

                    // Glow Effect
                    const glowColor = n.status === 'restored' ? 'rgba(34, 211, 238, 0.6)' :
                        n.status === 'corrupted' ? 'rgba(239, 68, 68, 0.6)' :
                            'rgba(71, 85, 105, 0.4)'

                    ctx.shadowColor = glowColor
                    ctx.shadowBlur = isSelected ? 30 : 15
                    ctx.shadowOffsetX = 0
                    ctx.shadowOffsetY = 0

                    // Draw pulsing effect for corrupted nodes
                    if (n.status === 'corrupted') {
                        const time = Date.now()
                        const pulse = (Math.sin(time / 200) + 1) / 2 // 0 to 1
                        ctx.beginPath()
                        ctx.arc(n.x!, n.y!, radius + (pulse * 6), 0, 2 * Math.PI, false)
                        ctx.fillStyle = `rgba(239, 68, 68, ${0.15 - (pulse * 0.05)})`
                        ctx.fill()
                    }

                    // Draw Node Circle
                    ctx.beginPath()
                    ctx.arc(n.x!, n.y!, radius, 0, 2 * Math.PI, false)
                    ctx.fillStyle = color
                    ctx.fill()

                    // Inner Ring for Restored
                    if (n.status === 'restored') {
                        ctx.beginPath()
                        ctx.arc(n.x!, n.y!, radius * 0.6, 0, 2 * Math.PI, false)
                        ctx.fillStyle = '#083344' // cyan-950
                        ctx.fill()

                        ctx.beginPath()
                        ctx.arc(n.x!, n.y!, radius * 0.3, 0, 2 * Math.PI, false)
                        ctx.fillStyle = '#22d3ee' // cyan-400
                        ctx.fill()
                    }

                    // Reset Shadow for Border
                    ctx.shadowBlur = 0

                    // Draw Border
                    ctx.strokeStyle = isSelected ? '#fff' : '#0f172a'
                    ctx.lineWidth = (isSelected ? 3 : 1.5) / globalScale
                    ctx.stroke()

                    // Draw Label (Only if selected or zoomed in enough)
                    if (isSelected || globalScale > 1.2) {
                        const textWidth = ctx.measureText(label).width
                        const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.6)

                        ctx.font = `bold ${fontSize}px 'JetBrains Mono', monospace`
                        ctx.textAlign = 'center'
                        ctx.textBaseline = 'middle'

                        // Glassmorphism Label Background
                        ctx.fillStyle = 'rgba(2, 6, 23, 0.85)'
                        ctx.roundRect(
                            n.x! - bckgDimensions[0] / 2,
                            n.y! + radius + 6,
                            bckgDimensions[0],
                            bckgDimensions[1],
                            6 / globalScale
                        )
                        ctx.fill()

                        // Border for label
                        ctx.strokeStyle = n.status === 'restored' ? 'rgba(34, 211, 238, 0.3)' : 'rgba(148, 163, 184, 0.3)'
                        ctx.lineWidth = 1 / globalScale
                        ctx.stroke()

                        // Label Text
                        ctx.fillStyle = n.status === 'restored' ? '#22d3ee' : n.status === 'corrupted' ? '#fca5a5' : '#e2e8f0'
                        ctx.fillText(label, n.x!, n.y! + radius + fontSize / 2 + 6)
                    }
                }}
            />

            {/* Controls */}
            <div className={`absolute flex gap-2 pointer-events-auto transition-all duration-300 ${isMobile
                ? 'bottom-24 right-4 flex-col'
                : 'bottom-4 right-4 flex-row'
                }`}>
                <Button variant="outline" size="icon" onClick={handleZoomIn} className="bg-black/50 border-cyan-500/30 text-cyan-400 hover:bg-cyan-950/50 h-10 w-10 md:h-9 md:w-9">
                    <ZoomIn className="w-5 h-5 md:w-4 md:h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleZoomOut} className="bg-black/50 border-cyan-500/30 text-cyan-400 hover:bg-cyan-950/50 h-10 w-10 md:h-9 md:w-9">
                    <ZoomOut className="w-5 h-5 md:w-4 md:h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleReset} className="bg-black/50 border-cyan-500/30 text-cyan-400 hover:bg-cyan-950/50 h-10 w-10 md:h-9 md:w-9">
                    <RefreshCw className="w-5 h-5 md:w-4 md:h-4" />
                </Button>
            </div>

            {/* Node Details Modal/Tooltip */}
            {selectedNode && (
                <div className={`absolute pointer-events-auto transition-all duration-300 z-20 ${isMobile
                    ? 'bottom-0 left-0 right-0 animate-in slide-in-from-bottom-full'
                    : 'top-4 left-4 w-80 animate-in slide-in-from-left-4'
                    }`}>
                    <Card className={`glass border-${selectedNode.status === 'corrupted' ? 'red' : selectedNode.status === 'restored' ? 'cyan' : 'slate'}-500/30 ${isMobile ? 'rounded-b-none border-b-0 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]' : ''
                        }`}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg font-mono font-bold truncate pr-4 text-white">
                                {selectedNode.title}
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-white"
                                onClick={() => setSelectedNode(null)}
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4 pb-6 md:pb-4">
                            <div className="flex items-center gap-2 text-xs font-mono uppercase">
                                <span className={`px-2 py-1 rounded border ${selectedNode.status === 'corrupted' ? 'bg-red-950/30 border-red-500/30 text-red-400' :
                                    selectedNode.status === 'restored' ? 'bg-cyan-950/30 border-cyan-500/30 text-cyan-400' :
                                        'bg-slate-800/50 border-slate-600/30 text-slate-400'
                                    }`}>
                                    {selectedNode.status}
                                </span>
                                <span className="text-slate-500">Tier {selectedNode.difficulty_tier}</span>
                            </div>

                            <div className="text-sm text-slate-300 font-mono">
                                Domain: <span className="text-white">{selectedNode.domain}</span>
                            </div>

                            <div className="pt-2">
                                {selectedNode.status === 'corrupted' && selectedNode.quest_id && (
                                    <Button
                                        className="w-full bg-red-600 hover:bg-red-500 text-white font-mono gap-2 h-12 md:h-10 text-base md:text-sm"
                                        onClick={() => navigate(`/quest/${selectedNode.quest_id}`)}
                                    >
                                        <Play className="w-4 h-4" />
                                        START_QUEST
                                    </Button>
                                )}
                                {selectedNode.status === 'restored' && (
                                    <div className="w-full p-3 bg-cyan-950/20 border border-cyan-500/20 rounded text-center">
                                        <div className="text-xs text-cyan-400 font-mono mb-1">MASTERY SCORE</div>
                                        <div className="text-2xl font-bold text-white font-mono">100%</div>
                                    </div>
                                )}
                                {selectedNode.status === 'locked' && (
                                    <div className="w-full p-3 bg-slate-900/50 border border-slate-700/50 rounded flex items-center justify-center gap-2 text-slate-500 font-mono text-sm">
                                        <Lock className="w-4 h-4" />
                                        PREREQUISITES_MISSING
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
})

export default ForceGraphCanvas
