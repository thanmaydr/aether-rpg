import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useXP } from '@/hooks/useXP'
import { useLanguage } from '@/components/Auth/LanguageContext'
import { translateText } from '@/lib/translationService'
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
    const { language, t } = useLanguage()
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

    const [showOverview, setShowOverview] = useState(true)
    const [showRevise, setShowRevise] = useState(false)

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

                    // If already restored, skip overview? 
                    // User asked to "show them an overview... before user starts answering". 
                    // Let's keep it for immersion even if restored, or maybe auto-skip if they're reviewing.
                    // For now, keep it consistent: always show overview first traversal.
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
                    let greeting = questData.scenario_prompt || "Guardian initialized. Explain the concept to proceed."
                    if (language !== 'en') {
                        greeting = await translateText(greeting, language)
                    }

                    setMessages([
                        {
                            role: 'assistant',
                            content: greeting
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
    }, [questId, user, language]) // Added language dependency to re-fetch/translate if needed (though greeting is once)

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
            // Translate input to English if needed for the backend grader
            let textToGrade = input
            if (language !== 'en') {
                textToGrade = await translateText(input, 'en')
            }

            // Call Edge Function for Grading
            const { data, error } = await supabase.functions.invoke('feynman-grader', {
                body: {
                    questId: quest.id,
                    userExplanation: textToGrade
                }
            })

            if (error) throw error

            const { grade, aiResponse: guardianReply, xpGained } = data

            // Translate AI response back to user's language
            let finalReply = guardianReply
            if (language !== 'en') {
                finalReply = await translateText(guardianReply, language)
            }

            const aiMessage: Message = {
                role: 'assistant',
                content: finalReply,
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
                    userExplanation: input // Hint system might also need translation? Assuming it just gives a generic hint based on quest
                }
            })

            if (error) throw error

            let hintText = data.hint
            if (language !== 'en') {
                hintText = await translateText(hintText, language)
            }

            setCurrentHint(hintText)
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

    const handleStartQuest = () => {
        setShowOverview(false)
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
        <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row overflow-hidden bg-slate-950 relative select-none">
            {showLevelUp && (
                <LevelUpModal
                    newLevel={newLevel}
                    onClose={() => setShowLevelUp(false)}
                />
            )}

            {/* Revision Overlay */}
            {showRevise && (
                <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <Card className="w-full max-w-lg bg-slate-900 border-cyan-500/50 shadow-[0_0_50px_rgba(34,211,238,0.2)]">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-cyan-400 font-mono">
                                <Brain className="w-5 h-5 animate-pulse" />
                                MEMORY_RECALL
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <h3 className="text-white font-bold text-lg">{quest.title}</h3>
                                <p className="text-slate-400 leading-relaxed">
                                    {quest.description}
                                </p>
                            </div>
                            <div className="p-4 rounded bg-cyan-950/20 border border-cyan-500/20 text-xs font-mono text-cyan-300">
                                Retrieving basic neural patterns... Deeper knowledge remains encrypted until node restoration.
                            </div>
                            <Button
                                onClick={() => setShowRevise(false)}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                            >
                                CLOSE_FRAGMENT
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            {showOverview ? (
                // OVERVIEW SCREEN
                <div className="absolute inset-0 z-30 bg-slate-950 flex items-center justify-center p-4 animate-in fade-in duration-500">
                    <div className="max-w-2xl w-full space-y-8 text-center">
                        <div className="space-y-4">
                            <h1 className="text-4xl md:text-5xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 animate-pulse">
                                {quest.title}
                            </h1>
                            <p className="text-slate-400 text-lg md:text-xl leading-relaxed max-w-xl mx-auto">
                                {quest.description}
                            </p>
                        </div>

                        <div className="flex justify-center">
                            <div className="p-1 rounded-full bg-gradient-to-r from-cyan-500/50 to-blue-500/50">
                                <div className="bg-slate-950 rounded-full p-2">
                                    <Brain className="w-12 h-12 text-cyan-400" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900/50 border border-cyan-500/20 rounded-lg p-6 max-w-lg mx-auto backdrop-blur">
                            <h3 className="text-sm font-mono text-cyan-400 uppercase tracking-widest mb-2">MISSION BRIEFING</h3>
                            <p className="text-slate-300 font-mono text-sm">
                                {quest.scenario_prompt || "Explain the core concept to the Guardian to restore this neural node."}
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Button
                                onClick={handleStartQuest}
                                size="lg"
                                className="bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-lg px-8 py-6 h-auto shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:shadow-[0_0_50px_rgba(34,211,238,0.6)] transition-all duration-300 transform hover:scale-105"
                            >
                                INITIATE_PROTOCOL
                            </Button>

                            <Button
                                onClick={() => setShowRevise(true)}
                                size="lg"
                                variant="outline"
                                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-950/30 font-mono text-lg px-8 py-6 h-auto gap-2"
                            >
                                <BookOpen className="w-5 h-5" />
                                REVISE
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                // CHAT INTERFACE
                <>
                    {/* Left Panel - Study Material */}
                    <div className={`
                        absolute md:relative inset-0 z-20 bg-slate-950 md:bg-transparent md:flex-1 md:flex flex-col border-r border-cyan-500/20 transition-transform duration-300
                        ${showStudy ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                    `}>
                        <div className="p-4 border-b border-cyan-500/20 flex justify-between items-center bg-slate-900/50 backdrop-blur">
                            <div className="flex items-center gap-2 text-cyan-400">
                                <BookOpen className="w-5 h-5" />
                                <span className="font-mono font-bold">{t('quest.archives')}</span>
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
                            <span className="font-mono text-cyan-400 font-bold">{t('quest.uplink')}</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-slate-400 gap-2"
                                onClick={() => setShowStudy(true)}
                            >
                                <BookOpen className="w-4 h-4" />
                                {t('quest.archives')}
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
                                        onPaste={(e) => {
                                            e.preventDefault()
                                            toast.error("Security Protocol: Copy-Paste disabled. Use your own neural pathways.", {
                                                icon: <Shield className="w-4 h-4 text-red-400" />
                                            })
                                        }}
                                        placeholder={t('quest.input.placeholder')}
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
                                    Aether Link Status: {isThinking ? t('quest.sending') : t('quest.stable')}
                                </span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
