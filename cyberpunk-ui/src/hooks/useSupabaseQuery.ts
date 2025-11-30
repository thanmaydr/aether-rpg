import { useState, useCallback, useEffect } from 'react'
import { PostgrestError } from '@supabase/supabase-js'
import { toast } from 'sonner'

interface UseSupabaseQueryOptions<T> {
    queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>
    onSuccess?: (data: T) => void
    onError?: (error: PostgrestError) => void
    enabled?: boolean
}

interface UseSupabaseQueryResult<T> {
    data: T | null
    error: PostgrestError | null
    loading: boolean
    refetch: () => Promise<void>
}

export function useSupabaseQuery<T>({
    queryFn,
    onSuccess,
    onError,
    enabled = true
}: UseSupabaseQueryOptions<T>): UseSupabaseQueryResult<T> {
    const [data, setData] = useState<T | null>(null)
    const [error, setError] = useState<PostgrestError | null>(null)
    const [loading, setLoading] = useState(false)

    const fetchData = useCallback(async () => {
        if (!enabled) return

        setLoading(true)
        setError(null)

        try {
            const { data: result, error: queryError } = await queryFn()

            if (queryError) {
                throw queryError
            }

            if (result) {
                setData(result)
                onSuccess?.(result)
            }
        } catch (err) {
            const pgError = err as PostgrestError
            setError(pgError)
            onError?.(pgError)

            console.error('Supabase Query Error:', pgError)

            // User-friendly error handling
            if (pgError.code === 'PGRST116') {
                // No rows found (often not critical)
                // Don't toast for this one usually
            } else if (pgError.message === 'FetchError: Network request failed') {
                toast.error('Connection Lost', {
                    description: 'Please check your internet connection.',
                    action: {
                        label: 'Retry',
                        onClick: () => fetchData()
                    }
                })
            } else {
                toast.error('Data Fetch Error', {
                    description: pgError.message || 'An unexpected error occurred.',
                })
            }
        } finally {
            setLoading(false)
        }
    }, [queryFn, enabled, onSuccess, onError])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    return { data, error, loading, refetch: fetchData }
}
