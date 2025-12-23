import { useState, useEffect, useCallback, useRef } from 'react'

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

interface UseSpeechRecognitionReturn {
    isListening: boolean
    transcript: string
    startListening: () => void
    stopListening: () => void
    resetTranscript: () => void
    hasRecognitionSupport: boolean
}

export const useSpeechRecognition = (): UseSpeechRecognitionReturn => {
    const [isListening, setIsListening] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
    const chunksRef = useRef<BlobPart[]>([])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop()
            }
        }
    }, [mediaRecorder])

    const transcribeAudio = async (audioBlob: Blob) => {
        if (!GROQ_API_KEY) {
            console.error("No Groq API key found. Check VITE_GROQ_API_KEY.")
            return
        }

        const formData = new FormData()
        // Groq requires a filename with extension
        formData.append('file', audioBlob, 'recording.webm')
        formData.append('model', 'whisper-large-v3')
        // We don't specify language so it auto-detects (useful for Hindi/English)

        try {
            const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                },
                body: formData
            })

            if (!response.ok) {
                const errorText = await response.text()
                console.error("Groq STT Error:", errorText)
                throw new Error(`STT Failed: ${response.statusText}`)
            }

            const data = await response.json()
            if (data.text) {
                setTranscript(data.text)
            }
        } catch (err) {
            console.error("Transcription error:", err)
        }
    }

    const startListening = useCallback(async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error("Media Devices API not supported.")
            return
        }

        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data)
                }
            }

            recorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
                chunksRef.current = [] // reset chunks

                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop())

                // Process audio
                if (blob.size > 0) {
                    await transcribeAudio(blob)
                }
                setIsListening(false)
            }

            chunksRef.current = []
            recorder.start()
            setMediaRecorder(recorder)
            setIsListening(true)
            setTranscript('') // Clear previous transcript on new recording

        } catch (err) {
            console.error("Error accessing microphone:", err)
            setIsListening(false)
        }
    }, [])

    const stopListening = useCallback(() => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop()
            // State update to false happens in onstop
        }
    }, [mediaRecorder])

    const resetTranscript = useCallback(() => {
        setTranscript('')
    }, [])

    return {
        isListening,
        transcript,
        startListening,
        stopListening,
        resetTranscript,
        hasRecognitionSupport: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    }
}
