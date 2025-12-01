import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { startTour } from './TourGuide'

export default function WelcomeModal() {
    const [open, setOpen] = useState(false)

    useEffect(() => {
        const hasSeenWelcome = localStorage.getItem('hasSeenWelcome')
        if (!hasSeenWelcome) {
            setOpen(true)
        }
    }, [])

    const handleStart = () => {
        setOpen(false)
        localStorage.setItem('hasSeenWelcome', 'true')
        // Small delay to allow modal to close before tour starts
        setTimeout(() => {
            startTour()
        }, 500)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="bg-slate-950 border-cyan-500/50 text-slate-200 sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-mono text-cyan-400">WELCOME_OPERATIVE</DialogTitle>
                    <DialogDescription className="text-slate-400 font-mono pt-4">
                        <p className="mb-4">
                            The Archives are corrupted. Knowledge is decaying.
                        </p>
                        <p className="mb-4">
                            Your mission is to restore them using the <strong>Feynman Protocol</strong>:
                            Learn, Teach, and Master.
                        </p>
                        <p>
                            Are you ready to begin your training?
                        </p>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="sm:justify-start">
                    <Button
                        onClick={handleStart}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-mono"
                    >
                        INITIATE_NEURAL_LINK
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
