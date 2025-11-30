import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserPlus, Mail, Lock, User } from 'lucide-react'
import { toast } from 'sonner'

export function SignupForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [username, setUsername] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (!supabase) throw new Error('Supabase client not initialized')

            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username,
                    },
                },
            })

            if (error) throw error

            toast.success('Registration Successful', {
                description: 'Check your email to verify your identity.',
            })
        } catch (error: unknown) {
            const err = error as Error
            toast.error('Registration Failed', {
                description: err.message || 'Could not create account.',
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <CardHeader>
                <CardTitle className="text-2xl font-mono text-secondary flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    NEW_OPERATIVE
                </CardTitle>
                <CardDescription className="text-magenta-200/70 font-mono">
                    Register your identity in the mainframe.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-mono text-magenta-100">CODENAME</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-magenta-500/50" />
                            <Input
                                type="text"
                                placeholder="Neon_Rider"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="pl-9 bg-black/50 border-secondary/30 text-magenta-50 placeholder:text-magenta-900/50 focus-visible:ring-secondary/50 font-mono"
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-mono text-magenta-100">EMAIL</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-magenta-500/50" />
                            <Input
                                type="email"
                                placeholder="operative@network.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-9 bg-black/50 border-secondary/30 text-magenta-50 placeholder:text-magenta-900/50 focus-visible:ring-secondary/50 font-mono"
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-mono text-magenta-100">PASSWORD</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-magenta-500/50" />
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-9 bg-black/50 border-secondary/30 text-magenta-50 placeholder:text-magenta-900/50 focus-visible:ring-secondary/50 font-mono"
                                required
                            />
                        </div>
                    </div>
                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-secondary hover:bg-magenta-600 text-white font-bold font-mono shadow-[0_0_15px_rgba(217,70,239,0.5)] transition-all hover:shadow-[0_0_25px_rgba(217,70,239,0.7)]"
                    >
                        {loading ? 'PROCESSING...' : 'INITIATE_REGISTRATION'}
                    </Button>
                </form>
            </CardContent>
        </>
    )
}
