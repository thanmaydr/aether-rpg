import { useState, useEffect, useCallback } from 'react'

interface SpeechRecognition extends EventTarget {
    continuous: boolean
    interimResults: boolean
    lang: string
    start: () => void
    stop: () => void
    abort: () => void
    onresult: (event: any) => void
    onerror: (event: any) => void
    onend: () => void
}

declare global {
    interface Window {
        SpeechRecognition: any
        webkitSpeechRecognition: any
    }
}

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
    const [recognition, setRecognition] = useState<SpeechRecognition | null>(null)

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (SpeechRecognition) {
            const recognitionInstance = new SpeechRecognition()
            recognitionInstance.continuous = true
            recognitionInstance.interimResults = true
            recognitionInstance.lang = 'en-US'
            setRecognition(recognitionInstance)
        }
    }, [])

    useEffect(() => {
        if (!recognition) return

        recognition.onresult = (event: any) => {
            let finalTranscript = ''
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript
                } else {
                    // Optional: Handle interim results if needed
                    // finalTranscript += event.results[i][0].transcript
                }
            }
            // Append to existing transcript or just set it? 
            // For this use case, we probably want to append if continuous, 
            // but let's just grab the latest final result for simplicity in this snippet
            // actually, standard behavior is to accumulate.

            // Let's simplify: just get the latest text. 
            // The event.results contains all results for the session.
            const currentTranscript = Array.from(event.results)
                .map((result: any) => result[0].transcript)
                .join('')

            setTranscript(currentTranscript)
        }

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error)
            setIsListening(false)
        }

        recognition.onend = () => {
            setIsListening(false)
        }

    }, [recognition])

    const startListening = useCallback(() => {
        if (recognition && !isListening) {
            try {
                recognition.start()
                setIsListening(true)
            } catch (error) {
                console.error("Failed to start recognition:", error)
            }
        }
    }, [recognition, isListening])

    const stopListening = useCallback(() => {
        if (recognition && isListening) {
            recognition.stop()
            setIsListening(false)
        }
    }, [recognition, isListening])

    const resetTranscript = useCallback(() => {
        setTranscript('')
    }, [])

    return {
        isListening,
        transcript,
        startListening,
        stopListening,
        resetTranscript,
        hasRecognitionSupport: !!recognition
    }
}
