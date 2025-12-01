import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { questId, userExplanation } = await req.json()

        // 1. Get User
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) throw new Error('Unauthorized')

        // 2. Fetch Quest & Node Data
        const { data: quest, error: questError } = await supabaseClient
            .from('quests')
            .select('*, knowledge_nodes(*)')
            .eq('id', questId)
            .single()

        if (questError || !quest) throw new Error('Quest not found')

        // 3. Increment hints_used
        // We use an RPC or just raw SQL if possible, but standard update is fine.
        // First get current progress to be safe
        const { data: progress, error: progressError } = await supabaseClient
            .from('user_progress')
            .select('hints_used')
            .eq('user_id', user.id)
            .eq('node_id', quest.node_id)
            .single()

        const currentHints = progress?.hints_used || 0
        const newHints = currentHints + 1

        await supabaseClient
            .from('user_progress')
            .update({ hints_used: newHints })
            .eq('user_id', user.id)
            .eq('node_id', quest.node_id)

        // 4. Generate Hint with Groq
        const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
        if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not found')

        const systemPrompt = `
        You are a Socratic Tutor for a Cyberpunk RPG learning game.
        The user is stuck on a quest to explain: "${quest.knowledge_nodes.title}".
        
        Concept: ${quest.knowledge_nodes.concept_content}
        Scenario: ${quest.scenario_prompt}
        
        Your goal: Provide a subtle, guiding hint. Do NOT give the answer.
        Ask a leading question or point out a specific part of the concept they might be missing.
        Keep it short (under 2 sentences).
        Tone: Helpful, cryptic but encouraging AI construct.
        `

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userExplanation || "I'm stuck." }
                ],
                model: 'llama3-8b-8192',
                temperature: 0.7,
                max_tokens: 150,
            }),
        })

        const aiData = await response.json()
        const hintText = aiData.choices[0]?.message?.content || "Focus on the core concept."

        return new Response(
            JSON.stringify({
                hint: hintText,
                hintsUsed: newHints
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error: any) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
