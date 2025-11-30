import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Search,
    Download,
    Bookmark,
    Eye,
    RotateCcw,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    Loader2
} from 'lucide-react'
import { toast } from 'sonner'

interface ArchiveNode {
    id: string
    title: string
    description: string
    domain: string
    concept_content: string
    status: 'locked' | 'corrupted' | 'restored'
    mastery_score: number
    attempts: number
    last_attempt_at: string | null
    is_bookmarked: boolean
    quest_id?: string
}

export default function ArchivesPage() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [nodes, setNodes] = useState<ArchiveNode[]>([])
    const [filteredNodes, setFilteredNodes] = useState<ArchiveNode[]>([])

    // Filters
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('All')
    const [domainFilter, setDomainFilter] = useState<string>('All')
    const [domains, setDomains] = useState<string[]>([])
    const [sortBy, setSortBy] = useState<'title' | 'mastery' | 'date'>('title')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 20

    // Modal
    const [selectedNode, setSelectedNode] = useState<ArchiveNode | null>(null)

    useEffect(() => {
        if (!user || !supabase) return

        const fetchData = async () => {
            try {
                setLoading(true)

                if (!supabase) return

                // 1. Fetch Knowledge Nodes
                const { data: knowledgeData, error: knowledgeError } = await supabase
                    .from('knowledge_nodes')
                    .select('*')

                if (knowledgeError) throw knowledgeError

                // 2. Fetch User Progress
                const { data: progressData, error: progressError } = await supabase
                    .from('user_progress')
                    .select('*')
                    .eq('user_id', user.id)

                if (progressError) throw progressError

                // 3. Fetch Quest IDs for re-attempt
                const { data: questData, error: questError } = await supabase
                    .from('quests')
                    .select('id, node_id')

                if (questError) throw questError

                // Map data
                const progressMap = new Map(progressData?.map(p => [p.node_id, p]) || [])
                const questMap = new Map(questData?.map(q => [q.node_id, q.id]) || [])

                const mergedNodes: ArchiveNode[] = (knowledgeData || []).map(node => {
                    const progress = progressMap.get(node.id)
                    return {
                        id: node.id,
                        title: node.title,
                        description: node.description,
                        domain: node.domain,
                        concept_content: node.concept_content,
                        status: progress?.status || 'locked',
                        mastery_score: progress?.mastery_score || 0,
                        attempts: progress?.attempts || 0,
                        last_attempt_at: progress?.last_attempt_at || null,
                        is_bookmarked: progress?.is_bookmarked || false,
                        quest_id: questMap.get(node.id)
                    }
                })

                setNodes(mergedNodes)
                setDomains(Array.from(new Set(mergedNodes.map(n => n.domain))))

            } catch (error) {
                console.error('Error fetching archives:', error)
                toast.error('Failed to load archives')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [user])

    // Filtering & Sorting Effect
    useEffect(() => {
        let result = [...nodes]

        // Search
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            result = result.filter(n =>
                n.title.toLowerCase().includes(query) ||
                n.description?.toLowerCase().includes(query)
            )
        }

        // Status Filter
        if (statusFilter !== 'All') {
            result = result.filter(n => n.status === statusFilter.toLowerCase())
        }

        // Domain Filter
        if (domainFilter !== 'All') {
            result = result.filter(n => n.domain === domainFilter)
        }

        // Sort
        result.sort((a, b) => {
            let comparison = 0
            if (sortBy === 'title') {
                comparison = a.title.localeCompare(b.title)
            } else if (sortBy === 'mastery') {
                comparison = a.mastery_score - b.mastery_score
            } else if (sortBy === 'date') {
                const dateA = a.last_attempt_at ? new Date(a.last_attempt_at).getTime() : 0
                const dateB = b.last_attempt_at ? new Date(b.last_attempt_at).getTime() : 0
                comparison = dateA - dateB
            }
            return sortOrder === 'asc' ? comparison : -comparison
        })

        setFilteredNodes(result)
        setCurrentPage(1) // Reset to page 1 on filter change
    }, [nodes, searchQuery, statusFilter, domainFilter, sortBy, sortOrder])

    // Pagination Logic
    const totalPages = Math.ceil(filteredNodes.length / itemsPerPage)
    const paginatedNodes = filteredNodes.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    const handleBookmark = async (node: ArchiveNode) => {
        if (!user || !supabase) return

        try {
            const newStatus = !node.is_bookmarked

            // Optimistic update
            setNodes(prev => prev.map(n =>
                n.id === node.id ? { ...n, is_bookmarked: newStatus } : n
            ))

            const { error: upsertError } = await supabase
                .from('user_progress')
                .upsert({
                    user_id: user.id,
                    node_id: node.id,
                    is_bookmarked: newStatus,
                    status: node.status === 'locked' ? 'locked' : node.status,
                    mastery_score: node.mastery_score,
                    attempts: node.attempts
                })

            if (upsertError) throw upsertError

            toast.success(newStatus ? 'Bookmarked' : 'Removed bookmark')

        } catch (error) {
            console.error('Error bookmarking:', error)
            toast.error('Failed to update bookmark')
            // Revert optimistic update
            setNodes(prev => prev.map(n =>
                n.id === node.id ? { ...n, is_bookmarked: !node.is_bookmarked } : n
            ))
        }
    }

    const handleExport = () => {
        const headers = ['Title', 'Domain', 'Status', 'Mastery Score', 'Last Studied', 'Bookmarked']
        const csvContent = [
            headers.join(','),
            ...filteredNodes.map(n => [
                `"${n.title}"`,
                `"${n.domain}"`,
                n.status,
                n.mastery_score,
                n.last_attempt_at || 'Never',
                n.is_bookmarked ? 'Yes' : 'No'
            ].join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `aether_archives_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    if (loading) {
        return (
            <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-cyan-400" />
                <div className="text-cyan-400 font-mono animate-pulse">ACCESSING_ARCHIVES...</div>
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                        ARCHIVES
                    </h1>
                    <p className="text-slate-400 font-mono text-sm">
                        Total Nodes: {nodes.length} | Mastered: {nodes.filter(n => n.status === 'restored').length} | Bookmarked: {nodes.filter(n => n.is_bookmarked).length}
                    </p>
                </div>
                <Button
                    variant="outline"
                    className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-950/30 font-mono gap-2"
                    onClick={handleExport}
                >
                    <Download className="w-4 h-4" />
                    EXPORT_DATA
                </Button>
            </div>

            {/* Toolbar */}
            <Card className="glass border-slate-700/50">
                <CardContent className="p-4 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Search archives..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-black/30 border-slate-700 text-slate-200 font-mono focus-visible:ring-cyan-500/50"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                        <select
                            className="h-10 px-3 rounded-md bg-black/30 border border-slate-700 text-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                            value={domainFilter}
                            onChange={(e) => setDomainFilter(e.target.value)}
                        >
                            <option value="All">All Domains</option>
                            {domains.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>

                        <select
                            className="h-10 px-3 rounded-md bg-black/30 border border-slate-700 text-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="All">All Status</option>
                            <option value="locked">Locked</option>
                            <option value="corrupted">Corrupted</option>
                            <option value="restored">Restored</option>
                        </select>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                if (sortBy === 'title') {
                                    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
                                } else {
                                    setSortBy(prev => prev === 'title' ? 'mastery' : prev === 'mastery' ? 'date' : 'title')
                                    setSortOrder('asc')
                                }
                            }}
                            className="text-slate-400 hover:text-cyan-400"
                            title={`Sort by: ${sortBy.toUpperCase()}`}
                        >
                            <ArrowUpDown className="w-4 h-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Data Table */}
            <div className="rounded-md border border-slate-800 bg-black/20 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 font-mono">
                            <tr>
                                <th className="px-6 py-3">Title / Domain</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Mastery</th>
                                <th className="px-6 py-3">Last Studied</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {paginatedNodes.length > 0 ? (
                                paginatedNodes.map((node) => (
                                    <tr key={node.id} className="hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-200">{node.title}</div>
                                            <div className="text-xs text-slate-500 font-mono">{node.domain}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className={`
                                                ${node.status === 'restored' ? 'border-cyan-500/30 text-cyan-400 bg-cyan-950/10' :
                                                    node.status === 'corrupted' ? 'border-red-500/30 text-red-400 bg-red-950/10' :
                                                        'border-slate-600 text-slate-500'}
                                            `}>
                                                {node.status.toUpperCase()}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="w-full bg-slate-800 rounded-full h-1.5 mb-1">
                                                <div
                                                    className="bg-cyan-500 h-1.5 rounded-full transition-all duration-500"
                                                    style={{ width: `${node.mastery_score}%` }}
                                                ></div>
                                            </div>
                                            <div className="text-xs text-slate-500 font-mono">{node.mastery_score}%</div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-slate-400">
                                            {node.last_attempt_at ? new Date(node.last_attempt_at).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={`h-8 w-8 ${node.is_bookmarked ? 'text-yellow-400' : 'text-slate-500 hover:text-yellow-400'}`}
                                                    onClick={() => handleBookmark(node)}
                                                >
                                                    <Bookmark className={`w-4 h-4 ${node.is_bookmarked ? 'fill-current' : ''}`} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-500 hover:text-cyan-400"
                                                    onClick={() => setSelectedNode(node)}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                {node.status !== 'locked' && node.quest_id && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-500 hover:text-green-400"
                                                        onClick={() => navigate(`/quest/${node.quest_id}`)}
                                                        title="Re-attempt Quest"
                                                    >
                                                        <RotateCcw className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 font-mono">
                                        NO_DATA_FOUND
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
                    <div className="text-xs text-slate-500 font-mono">
                        Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredNodes.length)} - {Math.min(currentPage * itemsPerPage, filteredNodes.length)} of {filteredNodes.length}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="h-8 w-8 p-0 border-slate-700 text-slate-400 hover:text-white"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="h-8 w-8 p-0 border-slate-700 text-slate-400 hover:text-white"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Review Modal */}
            {selectedNode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-2xl glass border-cyan-500/30 max-h-[80vh] overflow-hidden flex flex-col">
                        <CardHeader className="border-b border-slate-700/50">
                            <CardTitle className="text-xl font-mono text-cyan-400 flex justify-between items-center">
                                {selectedNode.title}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedNode(null)}
                                    className="text-slate-500 hover:text-white"
                                >
                                    CLOSE
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 overflow-y-auto">
                            <div className="prose prose-invert max-w-none">
                                <h3 className="text-lg font-bold text-white mb-2">Concept Overview</h3>
                                <p className="text-slate-300 leading-relaxed">
                                    {selectedNode.concept_content || "No content available for this node."}
                                </p>
                                <div className="mt-6 p-4 bg-slate-900/50 rounded border border-slate-700/50">
                                    <h4 className="text-sm font-mono text-slate-400 mb-2">METADATA</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-slate-500">Domain:</span> <span className="text-slate-300">{selectedNode.domain}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500">Status:</span> <span className="text-slate-300 capitalize">{selectedNode.status}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
