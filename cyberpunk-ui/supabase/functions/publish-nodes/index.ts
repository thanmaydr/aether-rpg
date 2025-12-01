import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { nodes } = await req.json()

        // Use Service Role Key to bypass RLS
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Insert Nodes
        const { data: insertedNodes, error: nodeError } = await supabaseAdmin
            .from('knowledge_nodes')
            .insert(nodes)
            .select()

        if (nodeError) throw nodeError

        // 2. Generate default quests for these nodes
        if (insertedNodes && insertedNodes.length > 0) {
            const quests = insertedNodes.map((node: any) => ({
                node_id: node.id,
                quest_type: 'feynman',
                scenario_prompt: `You are a mentor explaining ${node.title} to a curious student. Verify their understanding of: ${node.description}`,
                win_condition: { rubric: "Clear explanation, accurate terminology, covers core concept" },
                xp_reward: 100
            }))

            const { error: questError } = await supabaseAdmin
                .from('quests')
                .insert(quests)

            if (questError) {
                console.error('Failed to create quests:', questError)
            }
        }

        return new Response(
            JSON.stringify(insertedNodes),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    }
})
