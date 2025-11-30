import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useXP } from '@/hooks/useXP'
import LevelUpModal from '@/components/Animations/LevelUpModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Send, BookOpen, ChevronLeft, ChevronRight, Brain, Shield, Trophy } from 'lucide-react'
import { toast } from 'sonner'

interface Message {
    role: 'user' | 'assistant'
    content: string
    metrics?: {
        accuracy: number
        clarity: number
        completeness: number
    }
}

interface QuestData {
    id: string
    node_id: string
    title: string
    description: string
    concept_content: string
    xp_reward: number
    scenario_prompt: string
}

export default function QuestBattlePage() {
    const { questId } = useParams()
    const { user } = useAuth()
    const { addXP } = useXP()
    const [quest, setQuest] = useState<QuestData | null>(null)
    const [loading, setLoading] = useState(true)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isThinking, setIsThinking] = useState(false)
    const [showStudy, setShowStudy] = useState(true)
    const [showLevelUp, setShowLevelUp] = useState(false)
    const [newLevel, setNewLevel] = useState(1)
    const scrollRef = useRef<HTMLDivElement>(null)
    const hasGreeting = useRef(false)

    // Fetch Quest Data
    useEffect(() => {
        if (!user || !supabase || !questId) return

        const fetchQuestData = async () => {
            if (!supabase) return
            try {
                setLoading(true)

                // Fetch Quest + Node details
                const { data: questData, error: questError } = await supabase
                    .from('quests')
                    .select(`
                        id,
                        node_id,
                        xp_reward,
                        scenario_prompt,
                        knowledge_nodes (
                            title,
                            description,
                            concept_content
                        )
                    `)
                    .eq('id', questId)
                    .single()

                if (questError) throw questError

                const node = (questData.knowledge_nodes as unknown as { title: string; description: string; concept_content: string })
                setQuest({
                    id: questData.id,
                    node_id: questData.node_id,
                    xp_reward: questData.xp_reward,
                    scenario_prompt: questData.scenario_prompt,
                    title: node.title,
                    description: node.description,
                    concept_content: node.concept_content
                })

                // Initial greeting from Guardian
                if (!hasGreeting.current) {
                    setMessages([
                        {
                            role: 'assistant',
                            content: questData.scenario_prompt || "Guardian initialized. Explain the concept to proceed."
                        }
                    ])
                    hasGreeting.current = true
                }

            } catch (error) {
                console.error('Error loading quest:', error)
                toast.error('Failed to load quest data')
            } finally {
                setLoading(false)
            }
        }

        fetchQuestData()
    }, [questId, user])

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isThinking])

    const handleSendMessage = async () => {
        if (!input.trim() || !quest || !user || !supabase) return

        const userMsg: Message = { role: 'user', content: input }
        setMessages(prev => [...prev, userMsg])
        setInput('')
        setIsThinking(true)

        try {
            // Call Edge Function for Grading
            const { data, error } = await supabase.functions.invoke('feynman-grader', {
                body: {
                    questId: quest.id,
                    userExplanation: input
                }
            })

            if (error) throw error

            const { grade, aiResponse: guardianReply, xpGained } = data

            const aiMessage: Message = {
                role: 'assistant',
                content: guardianReply,
                metrics: grade
            }

            setMessages(prev => [...prev, aiMessage])

            if (grade.overall_score >= 8) {
                // Handle XP Gain locally + sync
                // First fetch current XP to calculate level up locally if needed, 
                // but useXP hook handles it.

                // Fetch current profile to pass to addXP
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('xp_total')
                    .eq('id', user.id)
                    .single()

                if (profile) {
                    const result = await addXP(user.id, profile.xp_total, xpGained)

                    toast.success('NODE RESTORED', {
                        description: `+${xpGained} XP Gained`,
                        icon: <Trophy className="w-5 h-5 text-yellow-400" />
                    })

                    if (result && result.leveledUp) {
                        setNewLevel(result.newLevel)
                        setShowLevelUp(true)
                    }
                }
            }

        } catch (error) {
            console.error('Error grading:', error)
            toast.error('Connection to Guardian interrupted')
        } finally {
            setIsThinking(false)
        }
    }

    if (loading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-slate-950">
                <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mb-4" />
                <div className="text-cyan-400 font-mono animate-pulse">ESTABLISHING_NEURAL_LINK...</div>
            </div>
        )
    }

    if (!quest) return null

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row overflow-hidden bg-slate-950 relative">
            {showLevelUp && (
                <LevelUpModal
                    newLevel={newLevel}
                    onClose={() => setShowLevelUp(false)}
                />
            )}

            {/* Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-50 bg-[length:100%_2px,3px_100%] opacity-20" />

            {/* Left Panel: Briefing & Study Material (Collapsible on Mobile) */}
            <div className={`transition-all duration-300 ease-in-out border-b md:border-b-0 md:border-r border-cyan-500/20 bg-slate-900/50 backdrop-blur flex flex-col ${showStudy
                    ? 'h-[40vh] md:h-full md:w-[40%]'
                    : 'h-12 md:h-full md:w-12'
                }`}>
                <div className="p-4 border-b border-cyan-500/20 flex justify-between items-center shrink-0 h-12">
                    {showStudy ? (
                        <div className="flex items-center gap-2 text-cyan-400 font-mono font-bold truncate">
                            <Brain className="w-5 h-5 shrink-0" />
                            <span>MISSION_BRIEFING</span>
                        </div>
                    ) : (
                        <Button variant="ghost" size="icon" onClick={() => setShowStudy(true)} className="h-8 w-8">
                            <ChevronRight className="w-5 h-5 text-cyan-400 rotate-90 md:rotate-0" />
                        </Button>
                    )}
                    {showStudy && (
                        <Button variant="ghost" size="icon" onClick={() => setShowStudy(false)} className="h-8 w-8">
                            <ChevronLeft className="w-5 h-5 text-cyan-400 -rotate-90 md:rotate-0" />
                        </Button>
                    )}
                </div>

                {showStudy && (
                    <div className="flex-1 p-4 md:p-6 overflow-y-auto scroll-smooth">
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
                            <div>
                                <h1 className="text-xl md:text-2xl font-mono font-bold text-white mb-2">{quest.title}</h1>
                                <p className="text-slate-400 font-mono text-sm leading-relaxed">
                                    {quest.description}
                                </p>
                            </div>

                            <Card className="bg-cyan-950/20 border-cyan-500/30">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-mono text-cyan-400 flex items-center gap-2">
                                        <BookOpen className="w-4 h-4" />
                                        ARCHIVE_DATA
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="prose prose-invert prose-sm max-w-none font-mono text-slate-300">
                                        {quest.concept_content || "No archive data available for this node."}
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="p-4 rounded bg-slate-900 border border-slate-800">
                                <div className="text-xs font-mono text-slate-500 uppercase mb-2">Guardian Status</div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-red-400 font-mono text-sm">ACTIVE_MONITORING</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Panel: Chat Interface */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-950/80 h-full overflow-hidden">
                {/* Chat History */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth pb-4"
                >
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                        >
                            <div className={`max-w-[90%] md:max-w-[80%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                {/* Avatar & Name */}
                                <div className={`flex items-center gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`w-8 h-8 rounded border flex items-center justify-center shrink-0 ${msg.role === 'user'
                                        ? 'bg-cyan-950 border-cyan-500/50 text-cyan-400'
                                        : 'bg-magenta-950 border-magenta-500/50 text-magenta-400'
                                        }`}>
                                        {msg.role === 'user' ? <Brain className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                                    </div>
                                    <span className="text-xs font-mono text-slate-500 uppercase">
                                        {msg.role === 'user' ? 'OPERATIVE' : 'GUARDIAN'}
                                    </span>
                                </div>

                                {/* Message Bubble */}
                                <div className={`p-3 md:p-4 rounded-lg border font-mono text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-cyan-950/30 border-cyan-500/30 text-cyan-100 rounded-tr-none'
                                    : 'bg-slate-900/80 border-magenta-500/30 text-slate-200 rounded-tl-none shadow-[0_0_15px_rgba(217,70,239,0.1)]'
                                    }`}>
                                    {msg.content}
                                </div>

                                {/* Metrics Display (Only for Assistant) */}
                                {msg.metrics && (
                                    <div className="w-full p-3 bg-black/40 rounded border border-slate-800 space-y-2 animate-in fade-in duration-700 delay-300">
                                        <div className="flex justify-between text-[10px] font-mono uppercase text-slate-400">
                                            <span>Analysis_Result</span>
                                            <span className={msg.metrics.accuracy >= 8 ? "text-green-400" : "text-yellow-400"}>
                                                {msg.metrics.accuracy >= 8 ? 'PASS' : 'REVISE'}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="space-y-1">
                                                <div className="text-[9px] text-slate-500 uppercase">Accuracy</div>
                                                <div className="h-1 bg-slate-800 rounded overflow-hidden">
                                                    <div className="h-full bg-cyan-500" style={{ width: `${msg.metrics.accuracy * 10}%` }} />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-[9px] text-slate-500 uppercase">Clarity</div>
                                                <div className="h-1 bg-slate-800 rounded overflow-hidden">
                                                    <div className="h-full bg-magenta-500" style={{ width: `${msg.metrics.clarity * 10}%` }} />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-[9px] text-slate-500 uppercase">Completeness</div>
                                                <div className="h-1 bg-slate-800 rounded overflow-hidden">
                                                    <div className="h-full bg-yellow-500" style={{ width: `${msg.metrics.completeness * 10}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {isThinking && (
                        <div className="flex justify-start animate-in fade-in">
                            <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-900/50 border border-magenta-500/20">
                                <div className="flex gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-magenta-500 animate-bounce [animation-delay:-0.3s]" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-magenta-500 animate-bounce [animation-delay:-0.15s]" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-magenta-500 animate-bounce" />
                                </div>
                                <span className="text-xs font-mono text-magenta-400 animate-pulse">GUARDIAN_ANALYZING</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-3 md:p-4 bg-slate-900/95 border-t border-cyan-500/20 backdrop-blur sticky bottom-0 z-10">
                    <div className="relative max-w-4xl mx-auto">
                        <Textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Explain the concept..."
                            className="min-h-[60px] md:min-h-[80px] pr-12 bg-black/50 border-slate-700 text-slate-200 font-mono focus:border-cyan-500/50 focus:ring-cyan-500/20 resize-none text-base"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleSendMessage()
                                }
                            }}
                        />
                        <Button
                            size="icon"
                            className="absolute bottom-3 right-3 h-8 w-8 bg-cyan-600 hover:bg-cyan-500 text-white"
                            onClick={handleSendMessage}
                            disabled={!input.trim() || isThinking}
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="text-center mt-2 hidden md:block">
                        <span className="text-[10px] text-slate-600 font-mono">
                            PRESS ENTER TO SUBMIT // SHIFT+ENTER FOR NEW LINE
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
