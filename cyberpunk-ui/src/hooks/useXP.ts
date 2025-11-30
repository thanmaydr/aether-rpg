import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export const useXP = () => {
    const [loading, setLoading] = useState(false)

    const calculateLevel = (xp: number) => {
        return Math.floor(Math.sqrt(xp / 100)) || 1
    }

    const getXpForNextLevel = (level: number) => {
        return Math.pow(level + 1, 2) * 100
    }

    const addXP = async (userId: string, currentXp: number, amount: number) => {
        if (!supabase) return null

        try {
            setLoading(true)
            const newXp = currentXp + amount
            const oldLevel = calculateLevel(currentXp)
            const newLevel = calculateLevel(newXp)
            const leveledUp = newLevel > oldLevel

            const { error } = await supabase
                .from('profiles')
                .update({
                    xp_total: newXp,
                    level: newLevel,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)

            if (error) throw error

            return {
                newXp,
                newLevel,
                leveledUp
            }

        } catch (error) {
            console.error('Error adding XP:', error)
            toast.error('Failed to sync progress')
            return null
        } finally {
            setLoading(false)
        }
    }

    const checkStreak = async (userId: string) => {
        if (!supabase) return

        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('last_active_date, streak_count')
                .eq('id', userId)
                .single()

            if (error) throw error

            const lastActive = profile.last_active_date ? new Date(profile.last_active_date) : null
            const now = new Date()
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

            let newStreak = profile.streak_count
            let shouldUpdate = false

            if (lastActive) {
                const lastActiveDate = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate())
                const diffTime = Math.abs(today.getTime() - lastActiveDate.getTime())
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

                if (diffDays === 1) {
                    // Streak continues
                    newStreak += 1
                    shouldUpdate = true
                } else if (diffDays > 1) {
                    // Streak broken
                    newStreak = 1
                    shouldUpdate = true
                } else {
                    // Already active today, no streak change and no need to update time constantly
                    shouldUpdate = false
                }
            } else {
                // First time active
                newStreak = 1
                shouldUpdate = true
            }

            if (shouldUpdate) {
                await supabase
                    .from('profiles')
                    .update({
                        streak_count: newStreak,
                        last_active_date: now.toISOString()
                    })
                    .eq('id', userId)
            }

            return newStreak

        } catch (error) {
            console.error('Error checking streak:', error)
            return 0
        }
    }

    return {
        calculateLevel,
        getXpForNextLevel,
        addXP,
        checkStreak,
        loading
    }
}
