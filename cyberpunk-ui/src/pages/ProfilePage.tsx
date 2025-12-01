import { useEffect, useState, useRef, lazy, Suspense } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    User,
    Shield,
    Target,
    Zap,
    Settings,
    Camera,
    Save,
    LogOut,
    Trash2,
    Award,
    Activity,
    Bell,
    Moon,
    BookOpen,
    AlertTriangle,
    Globe,
    Lock
} from 'lucide-react'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/Spinner'

// Lazy load Recharts component
const XPChart = lazy(() => import('@/components/Profile/XPChart'))

interface ProfileData {
    username: string
    avatar_url: string | null
    xp_total: number
    level: number
    character_class: string
    created_at: string
    is_public: boolean
}

interface UserStats {
    nodesRestored: number
    questsCompleted: number
    avgMastery: number
    daysActive: number
}

export default function ProfilePage() {
    const { user, signOut } = useAuth()
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<ProfileData | null>(null)
    const [stats, setStats] = useState<UserStats>({
        nodesRestored: 0,
        questsCompleted: 0,
        avgMastery: 0,
        daysActive: 1
    })
    const [isEditing, setIsEditing] = useState(false)
    const [newUsername, setNewUsername] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)

    // Mock XP Data for Chart (since we don't have historical XP logs yet)
    const xpData = [
        { name: 'Lvl 1', xp: 0 },
        { name: 'Lvl 2', xp: 1000 },
        { name: 'Lvl 3', xp: 2500 },
        { name: 'Lvl 4', xp: 5000 },
        { name: 'Lvl 5', xp: 10000 },
    ]

    // Calculate current progress for chart
    const chartData = xpData.map(d => ({
        ...d,
        userXp: profile && profile.xp_total >= d.xp ? d.xp : 0
    }))

    useEffect(() => {
        if (!user || !supabase) return

        const fetchProfile = async () => {
            try {
                setLoading(true)

                if (!supabase) return

                // 1. Fetch Profile
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                if (profileError) throw profileError
                setProfile(profileData)
                setNewUsername(profileData.username)

                // 2. Fetch Stats
                const { data: progressData, error: progressError } = await supabase
                    .from('user_progress')
                    .select('*')
                    .eq('user_id', user.id)

                if (progressError) throw progressError

                const restored = progressData?.filter(p => p.status === 'restored').length || 0
                const totalMastery = progressData?.reduce((acc, curr) => acc + (curr.mastery_score || 0), 0) || 0
                const avgMastery = progressData?.length ? Math.round(totalMastery / progressData.length) : 0

                // Fetch Quests Completed
                const { count: questsCount, error: questsError } = await supabase
                    .from('quest_logs')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .eq('completed', true)

                if (questsError) throw questsError

                // Calculate Days Active (Mock for now, or diff from created_at)
                const daysActive = Math.max(1, Math.floor((Date.now() - new Date(profileData.created_at).getTime()) / (1000 * 60 * 60 * 24)))

                setStats({
                    nodesRestored: restored,
                    questsCompleted: questsCount || 0,
                    avgMastery,
                    daysActive
                })

            } catch (error) {
                console.error('Error fetching profile:', error)
                toast.error('Failed to load profile')
            } finally {
                setLoading(false)
            }
        }

        fetchProfile()
    }, [user?.id])

    const handleUpdateProfile = async () => {
        if (!user || !supabase) return

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ username: newUsername })
                .eq('id', user.id)

            if (error) throw error

            setProfile(prev => prev ? { ...prev, username: newUsername } : null)
            setIsEditing(false)
            toast.success('Profile updated')
        } catch (error) {
            console.error('Error updating profile:', error)
            toast.error('Failed to update profile')
        }
    }

    const handleTogglePublic = async () => {
        if (!user || !supabase || !profile) return

        try {
            const newStatus = !profile.is_public
            const { error } = await supabase
                .from('profiles')
                .update({ is_public: newStatus })
                .eq('id', user.id)

            if (error) throw error

            setProfile(prev => prev ? { ...prev, is_public: newStatus } : null)
            toast.success(newStatus ? 'Profile is now public' : 'Profile is now private')
        } catch (error) {
            console.error('Error updating visibility:', error)
            toast.error('Failed to update visibility')
        }
    }

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0 || !user || !supabase) return

        try {
            setUploading(true)
            const file = event.target.files[0]
            const fileExt = file.name.split('.').pop()
            const filePath = `${user.id}/${Math.random()}.${fileExt}`

            // Upload to 'avatars' bucket
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) {
                // If bucket doesn't exist, this will fail. 
                // We can try to create it via SQL or just handle error.
                throw uploadError
            }

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            // Update Profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id)

            if (updateError) throw updateError

            setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null)
            toast.success('Avatar updated')

        } catch (error) {
            console.error('Error uploading avatar:', error)
            toast.error('Failed to upload avatar. Ensure "avatars" bucket exists.')
        } finally {
            setUploading(false)
        }
    }

    // Achievements Logic
    const achievements = [
        {
            id: 'first_step',
            title: 'First Step',
            description: 'Restore your first knowledge node',
            icon: Zap,
            unlocked: stats.nodesRestored >= 1
        },
        {
            id: 'scholar',
            title: 'Scholar',
            description: 'Restore 10 knowledge nodes',
            icon: BookOpen,
            unlocked: stats.nodesRestored >= 10
        },
        {
            id: 'master',
            title: 'Master',
            description: 'Achieve 90% average mastery',
            icon: Award,
            unlocked: stats.avgMastery >= 90 && stats.nodesRestored > 0
        },
        {
            id: 'veteran',
            title: 'Veteran',
            description: 'Complete 5 quests',
            icon: Shield,
            unlocked: stats.questsCompleted >= 5
        }
    ]

    if (loading) {
        return (
            <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
                <div className="text-cyan-400 font-mono animate-pulse">LOADING_PROFILE_DATA...</div>
            </div>
        )
    }

    return (
        <div className="space-y-8 pb-8">
            <h1 className="text-3xl md:text-4xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                OPERATIVE_PROFILE
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="space-y-8">
                    {/* Profile Card */}
                    <Card className="glass border-cyan-500/30 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-purple-500" />
                        <CardContent className="p-6 flex flex-col items-center text-center space-y-4 pt-8">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-full border-2 border-cyan-500/50 overflow-hidden bg-slate-900 relative">
                                    {profile?.avatar_url ? (
                                        <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-16 h-16 text-slate-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                                    )}
                                    {uploading && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                                        </div>
                                    )}
                                </div>
                                <Button
                                    size="icon"
                                    variant="secondary"
                                    className="absolute bottom-0 right-0 rounded-full h-8 w-8 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Camera className="w-4 h-4" />
                                </Button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                />
                            </div>

                            <div className="space-y-1 w-full">
                                {isEditing ? (
                                    <div className="flex items-center gap-2 justify-center">
                                        <Input
                                            value={newUsername}
                                            onChange={(e) => setNewUsername(e.target.value)}
                                            className="h-8 w-40 text-center font-mono bg-black/30 border-slate-600"
                                        />
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-400" onClick={handleUpdateProfile}>
                                            <Save className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 justify-center group">
                                        <h2 className="text-2xl font-bold text-white font-mono">
                                            {profile?.username || 'Unknown Operative'}
                                        </h2>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => setIsEditing(true)}
                                        >
                                            <Settings className="w-3 h-3" />
                                        </Button>
                                    </div>
                                )}
                                <Badge variant="outline" className="border-purple-500/50 text-purple-400 bg-purple-950/20">
                                    {profile?.character_class || 'Novice'}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-4 w-full pt-4 border-t border-slate-800">
                                <div>
                                    <div className="text-xs text-slate-500 font-mono">LEVEL</div>
                                    <div className="text-xl font-bold text-cyan-400 font-mono">{profile?.level || 1}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 font-mono">XP</div>
                                    <div className="text-xl font-bold text-purple-400 font-mono">{profile?.xp_total || 0}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stats Card */}
                    <Card className="glass border-slate-700/50">
                        <CardHeader>
                            <CardTitle className="text-lg font-mono text-slate-300 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-cyan-400" />
                                PERFORMANCE_METRICS
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded bg-slate-900/50 border border-slate-800">
                                <div className="text-xs text-slate-500 font-mono mb-1">NODES RESTORED</div>
                                <div className="text-2xl font-bold text-white font-mono">{stats.nodesRestored}</div>
                            </div>
                            <div className="p-3 rounded bg-slate-900/50 border border-slate-800">
                                <div className="text-xs text-slate-500 font-mono mb-1">QUESTS COMPLETED</div>
                                <div className="text-2xl font-bold text-white font-mono">{stats.questsCompleted}</div>
                            </div>
                            <div className="p-3 rounded bg-slate-900/50 border border-slate-800">
                                <div className="text-xs text-slate-500 font-mono mb-1">AVG MASTERY</div>
                                <div className="text-2xl font-bold text-white font-mono">{stats.avgMastery}%</div>
                            </div>
                            <div className="p-3 rounded bg-slate-900/50 border border-slate-800">
                                <div className="text-xs text-slate-500 font-mono mb-1">DAYS ACTIVE</div>
                                <div className="text-2xl font-bold text-white font-mono">{stats.daysActive}</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-2 space-y-8">
                    {/* XP Chart */}
                    <Card className="glass border-slate-700/50">
                        <CardHeader>
                            <CardTitle className="text-lg font-mono text-slate-300 flex items-center gap-2">
                                <Target className="w-5 h-5 text-purple-400" />
                                XP_PROGRESSION
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <Suspense fallback={
                                <div className="w-full h-full flex items-center justify-center">
                                    <Spinner size="lg" variant="cyan" />
                                </div>
                            }>
                                <XPChart data={chartData} />
                            </Suspense>
                        </CardContent>
                    </Card>

                    {/* Tabs: Achievements & Settings */}
                    <Tabs defaultValue="achievements" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-slate-900/50 border border-slate-800">
                            <TabsTrigger value="achievements" className="data-[state=active]:bg-cyan-950/30 data-[state=active]:text-cyan-400 font-mono">
                                ACHIEVEMENTS
                            </TabsTrigger>
                            <TabsTrigger value="settings" className="data-[state=active]:bg-purple-950/30 data-[state=active]:text-purple-400 font-mono">
                                SETTINGS
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="achievements" className="mt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {achievements.map((achievement) => (
                                    <Card
                                        key={achievement.id}
                                        className={`glass transition-all duration-300 ${achievement.unlocked
                                            ? 'border-cyan-500/30 bg-cyan-950/10'
                                            : 'border-slate-800 bg-slate-950/50 opacity-50 grayscale'
                                            }`}
                                    >
                                        <CardContent className="p-4 flex items-center gap-4">
                                            <div className={`p-3 rounded-full ${achievement.unlocked ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-600'
                                                }`}>
                                                <achievement.icon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className={`font-bold font-mono ${achievement.unlocked ? 'text-white' : 'text-slate-500'}`}>
                                                    {achievement.title}
                                                </h3>
                                                <p className="text-xs text-slate-400 font-mono">{achievement.description}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="settings" className="mt-4 space-y-4">
                            <Card className="glass border-slate-700/50">
                                <CardContent className="p-6 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded ${profile?.is_public ? 'bg-green-500/10 text-green-400' : 'bg-slate-800 text-slate-400'}`}>
                                                {profile?.is_public ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-200 font-mono">PROFILE_VISIBILITY</div>
                                                <div className="text-xs text-slate-500 font-mono">
                                                    {profile?.is_public ? 'Visible on Global Leaderboard' : 'Hidden from public view'}
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className={`border-slate-700 ${profile?.is_public ? 'text-green-400 border-green-900/50 bg-green-950/20' : 'text-slate-400'}`}
                                            onClick={handleTogglePublic}
                                        >
                                            {profile?.is_public ? 'PUBLIC' : 'PRIVATE'}
                                        </Button>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded bg-purple-500/10 text-purple-400">
                                                <Moon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-200 font-mono">THEME_MODE</div>
                                                <div className="text-xs text-slate-500 font-mono">Toggle between Focus and Overdrive</div>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" className="border-slate-700 text-slate-400">
                                            COMING_SOON
                                        </Button>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded bg-cyan-500/10 text-cyan-400">
                                                <Bell className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-200 font-mono">NOTIFICATIONS</div>
                                                <div className="text-xs text-slate-500 font-mono">Manage system alerts</div>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" className="border-slate-700 text-slate-400">
                                            CONFIGURE
                                        </Button>
                                    </div>

                                    <div className="border-t border-slate-800 pt-6 mt-6">
                                        <h3 className="text-red-400 font-mono font-bold mb-4 flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" />
                                            DANGER_ZONE
                                        </h3>
                                        <div className="space-y-4">
                                            <Button
                                                variant="destructive"
                                                className="w-full justify-start gap-2 bg-red-950/30 border border-red-900 hover:bg-red-900/50 text-red-400"
                                                onClick={() => signOut()}
                                            >
                                                <LogOut className="w-4 h-4" />
                                                DISCONNECT_SESSION (LOGOUT)
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                className="w-full justify-start gap-2 bg-red-950/30 border border-red-900 hover:bg-red-900/50 text-red-400"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                TERMINATE_ACCOUNT
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}
