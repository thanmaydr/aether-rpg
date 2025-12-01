import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader2, Upload, FileText, AlertCircle, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Set worker source for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

interface GeneratedNode {
    title: string
    description: string
    domain: string
    difficulty_tier: number
    concept_content: string
}

export default function ContentGeneratorPage() {
    const [file, setFile] = useState<File | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [generatedNodes, setGeneratedNodes] = useState<GeneratedNode[]>([])
    const [domain, setDomain] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
        }
    }

    const extractTextFromPDF = async (file: File): Promise<string> => {
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        let fullText = ''

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const textContent = await page.getTextContent()
            const pageText = textContent.items.map((item: any) => item.str).join(' ')
            fullText += pageText + '\n'
        }

        return fullText
    }

    const handleGenerate = async () => {
        if (!file || !domain) {
            toast.error('Please provide both a file and a domain.')
            return
        }

        setIsProcessing(true)
        try {
            // 1. Extract Text
            const text = await extractTextFromPDF(file)

            // 2. Upload PDF to Storage (Archival)
            if (!supabase) throw new Error('Supabase client not initialized')
            const fileName = `${Date.now()}_${file.name}`
            const { error: uploadError } = await supabase.storage
                .from('syllabi')
                .upload(fileName, file)

            if (uploadError) {
                console.error('Upload error:', uploadError)
                toast.warning('Failed to archive PDF, but proceeding with generation.')
            }

            // 3. Call Edge Function
            const { data, error } = await supabase.functions.invoke('generate-nodes', {
                body: { text, domain }
            })

            if (error) throw error

            if (data?.error) {
                throw new Error(data.error)
            }

            if (data?.nodes) {
                setGeneratedNodes(data.nodes)
                toast.success('Content generated successfully!')
            } else {
                throw new Error('Invalid response format from AI')
            }

        } catch (error: any) {
            console.error('Generation error:', error)
            toast.error(error.message || 'Failed to generate content')
        } finally {
            setIsProcessing(false)
        }
    }

    const handlePublish = async () => {
        if (generatedNodes.length === 0) return

        setIsProcessing(true)
        try {
            if (!supabase) throw new Error('Supabase client not initialized')
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const nodesToInsert = generatedNodes.map(node => ({
                ...node,
                // status: 'published', // Column missing in DB
                // created_by: user.id // Column missing in DB
            }))

            const { error } = await supabase.functions.invoke('publish-nodes', {
                body: { nodes: nodesToInsert }
            })

            if (error) throw error

            toast.success(`Published ${generatedNodes.length} nodes to the graph!`)
            setGeneratedNodes([])
            setFile(null)
            setDomain('')
            if (fileInputRef.current) fileInputRef.current.value = ''

        } catch (error: any) {
            console.error('Publish error:', error)
            toast.error(error.message || 'Failed to publish nodes')
        } finally {
            setIsProcessing(false)
        }
    }

    const removeNode = (index: number) => {
        setGeneratedNodes(prev => prev.filter((_, i) => i !== index))
    }

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 h-full overflow-y-auto">
            <div>
                <h1 className="text-3xl font-mono font-bold text-white mb-2">NEURAL_GENERATOR</h1>
                <p className="text-slate-400">Upload syllabus data to generate new knowledge nodes.</p>
            </div>

            {/* Upload Section */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-cyan-400 font-mono text-sm uppercase flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Source Material
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <label className="text-sm font-mono text-slate-500">Target Domain</label>
                        <Input
                            placeholder="e.g., Quantum Physics, Renaissance Art..."
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            className="bg-black/50 border-slate-700 font-mono text-slate-200"
                        />
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-mono text-slate-500">Syllabus PDF</label>
                        <div className="flex gap-2">
                            <Input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                className="bg-black/50 border-slate-700 font-mono text-slate-200 file:bg-slate-800 file:text-cyan-400 file:border-0 file:rounded-sm file:mr-4 file:px-2 file:py-1 cursor-pointer"
                            />
                        </div>
                    </div>

                    <Button
                        onClick={handleGenerate}
                        disabled={!file || !domain || isProcessing}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-mono"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                PROCESSING_DATA...
                            </>
                        ) : (
                            <>
                                <FileText className="w-4 h-4 mr-2" />
                                GENERATE NODES
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Review Section */}
            {generatedNodes.length > 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-mono font-bold text-white flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-yellow-400" />
                            REVIEW_DRAFTS ({generatedNodes.length})
                        </h2>
                        <Button
                            onClick={handlePublish}
                            disabled={isProcessing}
                            className="bg-green-600 hover:bg-green-500 text-white font-mono"
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            PUBLISH TO GRAPH
                        </Button>
                    </div>

                    <div className="grid gap-4">
                        {generatedNodes.map((node, idx) => (
                            <Card key={idx} className="bg-slate-900/30 border-slate-800 hover:border-cyan-500/30 transition-colors">
                                <CardContent className="p-4 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-cyan-400 font-mono">{node.title}</h3>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-400 hover:text-red-300 hover:bg-red-950/20 h-8 w-8 p-0"
                                            onClick={() => removeNode(idx)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <p className="text-sm text-slate-300">{node.description}</p>
                                    <div className="flex gap-4 text-xs font-mono text-slate-500">
                                        <span>TIER: {node.difficulty_tier}</span>
                                        <span>DOMAIN: {node.domain}</span>
                                    </div>
                                    <div className="bg-black/30 p-2 rounded text-xs text-slate-400 font-mono mt-2">
                                        {node.concept_content}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
