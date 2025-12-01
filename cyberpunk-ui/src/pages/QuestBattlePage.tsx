import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useXP } from '@/hooks/useXP'
import LevelUpModal from '@/components/Animations/LevelUpModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Send, BookOpen, ChevronLeft, Brain, Shield, Trophy, Mic, MicOff, Lightbulb, Volume2 } from 'lucide-react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
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

    const [isNodeRestored, setIsNodeRestored] = useState(false)
    const [, setHintsUsed] = useState(0)
    const [currentHint, setCurrentHint] = useState<string | null>(null)
    const [requestingHint, setRequestingHint] = useState(false)
    const [attempts, setAttempts] = useState(0)

    const scrollRef = useRef<HTMLDivElement>(null)
    const hasGreeting = useRef(false)

    const { isListening, transcript, startListening, stopListening, hasRecognitionSupport, resetTranscript } = useSpeechRecognition()

    // Sync transcript to input
    useEffect(() => {
        if (transcript) {
            setInput(transcript)
        }
    }, [transcript])

    // Fetch Quest Data
    useEffect(() => {
        if (!user || !supabase || !questId) return

        const fetchQuestData = async () => {
            if (!supabase) return
            try {
                setLoading(true)

                // Fetch Quest details
                const { data: questData, error: questError } = await supabase
                    .from('quests')
                    .select('id, node_id, xp_reward, scenario_prompt')
                    .eq('id', questId)
                    .single()

                if (questError) throw questError

                // Fetch associated Node details
                const { data: nodeData, error: nodeError } = await supabase
                    .from('knowledge_nodes')
                    .select('id, title, description, concept_content')
                    .eq('id', questData.node_id)
                    .single()

                if (nodeError) throw nodeError

                // Check if node is already restored and get progress
                const { data: progressData } = await supabase
                    .from('user_progress')
                    .select('status, hints_used, attempts')
                    .eq('user_id', user.id)
                    .eq('node_id', nodeData.id)
                    .single()

                if (progressData) {
                    setIsNodeRestored(progressData.status === 'restored')
                    setHintsUsed(progressData.hints_used || 0)
                    setAttempts(progressData.attempts || 0)
                }

                setQuest({
                    id: questData.id,
                    node_id: questData.node_id,
                    xp_reward: questData.xp_reward,
                    scenario_prompt: questData.scenario_prompt,
                    title: nodeData.title,
                    description: nodeData.description,
                    concept_content: nodeData.concept_content
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
    }, [messages, isThinking, currentHint])

    const handleSendMessage = async () => {
        if (!input.trim() || !quest || !user || !supabase) return

        const userMsg: Message = { role: 'user', content: input }
        setMessages(prev => [...prev, userMsg])
        setInput('')
        resetTranscript() // Reset transcript after sending
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

            // Update attempts locally if not restored
            if (grade.overall_score < 8) {
                setAttempts(prev => prev + 1)
            }

            if (grade.overall_score >= 8) {
                // Handle XP Gain locally + sync
                setIsNodeRestored(true)

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
            // Log full error details for debugging
            if (typeof error === 'object' && error !== null) {
                try {
                    console.error('Error details:', JSON.stringify(error, null, 2))
                } catch (e) {
                    console.error('Could not stringify error:', e)
                }
            }
            toast.error('Connection to Guardian interrupted')
        } finally {
            setIsThinking(false)
        }
    }

    const handleRequestHint = async () => {
        if (!quest || !supabase) return
        setRequestingHint(true)
        try {
            const { data, error } = await supabase.functions.invoke('quest-hint', {
                body: {
                    questId: quest.id,
                    userExplanation: input
                }
            })

            if (error) throw error
            setCurrentHint(data.hint)
            setHintsUsed(data.hintsUsed)
            toast.success('Hint received! XP reward reduced by 20%.')
        } catch (error) {
            console.error('Error fetching hint:', error)
            toast.error('Failed to retrieve hint.')
        } finally {
            setRequestingHint(false)
        }
    }

    const handleSpeak = (text: string) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text)
            // Optional: Select a specific voice if desired
            // const voices = window.speechSynthesis.getVoices()
            // utterance.voice = voices.find(voice => voice.name.includes('Google US English')) || null
            window.speechSynthesis.speak(utterance)
        } else {
            toast.error('Text-to-Speech not supported in this browser.')
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

            {/* Left Panel - Study Material */}
            <div className={`
                absolute md:relative inset-0 z-20 bg-slate-950 md:bg-transparent md:flex-1 md:flex flex-col border-r border-cyan-500/20 transition-transform duration-300
                ${showStudy ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="p-4 border-b border-cyan-500/20 flex justify-between items-center bg-slate-900/50 backdrop-blur">
                    <div className="flex items-center gap-2 text-cyan-400">
                        <BookOpen className="w-5 h-5" />
                        <span className="font-mono font-bold">ARCHIVE_DATA</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden text-slate-400"
                        onClick={() => setShowStudy(false)}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-2 font-mono">{quest.title}</h1>
                        <p className="text-slate-400">{quest.description}</p>
                    </div>

                    <Card className="bg-slate-900/50 border-cyan-500/30">
                        <CardHeader>
                            <CardTitle className="text-sm font-mono text-cyan-400 uppercase flex items-center gap-2">
                                <Brain className="w-4 h-4" />
                                Core Concept
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="prose prose-invert max-w-none">
                            {/* In a real app, render markdown here */}
                            {isNodeRestored ? (
                                <div className="whitespace-pre-wrap text-slate-300 font-mono text-sm leading-relaxed">
                                    {quest.concept_content}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                                    <Shield className="w-12 h-12 text-red-500/50 animate-pulse" />
                                    <div className="space-y-2">
                                        <h3 className="text-red-400 font-mono font-bold">DATA CORRUPTED</h3>
                                        <p className="text-slate-500 text-sm max-w-xs mx-auto">
                                            Archive access restricted. Restore this node to decrypt the full knowledge base.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Right Panel - Chat Interface */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-950/80 h-full overflow-hidden">
                {/* Mobile Header */}
                <div className="md:hidden p-4 border-b border-cyan-500/20 flex items-center justify-between bg-slate-900/50 backdrop-blur">
                    <span className="font-mono text-cyan-400 font-bold">UPLINK_ESTABLISHED</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 gap-2"
                        onClick={() => setShowStudy(true)}
                    >
                        <BookOpen className="w-4 h-4" />
                        ARCHIVES
                    </Button>
                </div>

                {/* Chat History */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth pb-4">
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`
                                max-w-[85%] md:max-w-[75%] rounded-lg p-4 font-mono text-sm leading-relaxed shadow-lg relative group
                                ${msg.role === 'user'
                                    ? 'bg-cyan-950/40 text-cyan-100 border border-cyan-500/30 rounded-tr-none'
                                    : 'bg-slate-900 text-slate-300 border border-slate-800 rounded-tl-none'
                                }
                            `}>
                                <div className="whitespace-pre-wrap">{msg.content}</div>

                                {msg.role === 'assistant' && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute -right-10 top-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-cyan-400"
                                        onClick={() => handleSpeak(msg.content)}
                                        title="Read Aloud"
                                    >
                                        <Volume2 className="w-4 h-4" />
                                    </Button>
                                )}

                                {msg.metrics && (
                                    <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-2 text-xs">
                                        <div className="text-center">
                                            <div className="text-slate-500 mb-1">ACCURACY</div>
                                            <div className={`font-bold ${msg.metrics.accuracy >= 8 ? 'text-green-400' : 'text-yellow-400'}`}>
                                                {msg.metrics.accuracy}/10
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-slate-500 mb-1">CLARITY</div>
                                            <div className={`font-bold ${msg.metrics.clarity >= 8 ? 'text-green-400' : 'text-yellow-400'}`}>
                                                {msg.metrics.clarity}/10
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-slate-500 mb-1">DEPTH</div>
                                            <div className={`font-bold ${msg.metrics.completeness >= 8 ? 'text-green-400' : 'text-yellow-400'}`}>
                                                {msg.metrics.completeness}/10
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {currentHint && (
                        <div className="flex justify-center animate-in fade-in slide-in-from-bottom-2">
                            <div className="bg-yellow-950/20 border border-yellow-500/30 rounded-lg p-4 max-w-lg text-yellow-200 font-mono text-sm flex gap-3 items-start">
                                <Lightbulb className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-bold text-yellow-500 mb-1">HINT_RECEIVED</div>
                                    {currentHint}
                                </div>
                            </div>
                        </div>
                    )}

                    {isThinking && (
                        <div className="flex justify-start animate-pulse">
                            <div className="bg-slate-900/50 text-cyan-400 border border-cyan-500/20 rounded-lg p-4 rounded-tl-none flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-xs font-mono">ANALYZING_INPUT...</span>
                            </div>
                        </div>
                    )}

                    {/* Hint Button */}
                    {!isNodeRestored && attempts >= 3 && !currentHint && (
                        <div className="flex justify-center py-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRequestHint}
                                disabled={requestingHint}
                                className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-950/30 font-mono text-xs gap-2"
                            >
                                {requestingHint ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lightbulb className="w-3 h-3" />}
                                REQUEST_HINT (-20% XP)
                            </Button>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-3 md:p-4 bg-slate-900/95 border-t border-cyan-500/20 backdrop-blur sticky bottom-0 z-10">
                    <div className="max-w-4xl mx-auto relative flex gap-2 items-end">
                        <div className="relative flex-1">
                            <Textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Explain the concept to the Guardian..."
                                className="min-h-[60px] max-h-[120px] bg-black/50 border-slate-700 focus:border-cyan-500/50 pr-12 font-mono text-sm resize-none text-slate-200"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        handleSendMessage()
                                    }
                                }}
                            />
                            {hasRecognitionSupport && (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className={`absolute right-2 bottom-2 h-8 w-8 transition-colors ${isListening
                                        ? 'text-red-500 hover:text-red-400 hover:bg-red-950/20 animate-pulse'
                                        : 'text-slate-400 hover:text-cyan-400 hover:bg-cyan-950/20'
                                        }`}
                                    onClick={isListening ? stopListening : startListening}
                                    title={isListening ? "Stop Recording" : "Start Voice Input"}
                                >
                                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                </Button>
                            )}
                        </div>
                        <Button
                            onClick={handleSendMessage}
                            disabled={!input.trim() || isThinking}
                            className="h-[60px] w-[60px] bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                        >
                            {isThinking ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                        </Button>
                    </div>
                    <div className="text-center mt-2">
                        <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">
                            Aether Link Status: {isThinking ? 'TRANSMITTING' : 'STABLE'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
