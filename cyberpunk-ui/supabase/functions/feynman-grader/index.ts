import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // 1. Authenticate User
        const {
            data: { user },
        } = await supabaseClient.auth.getUser()

        if (!user) {
            throw new Error('Unauthorized')
        }

        const { questId, userExplanation } = await req.json()

        if (!questId || !userExplanation) {
            throw new Error('Missing required fields: questId, userExplanation')
        }

        // 2. Fetch Quest & Node Data
        const { data: questData, error: questError } = await supabaseClient
            .from('quests')
            .select(`
        id,
        xp_reward,
        knowledge_nodes (
          id,
          title,
          concept_content
        )
      `)
            .eq('id', questId)
            .single()

        if (questError || !questData) {
            throw new Error('Quest not found')
        }

        const node = questData.knowledge_nodes as unknown as { id: string; title: string; concept_content: string }
        const nodeTitle = node.title
        const nodeContent = node.concept_content

        // 3. Call Groq AI API
        const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
        if (!GROQ_API_KEY) {
            throw new Error('GROQ_API_KEY not configured')
        }

        const systemPrompt = `You are an automated pedagogical evaluator using the Feynman Technique.
   
    Evaluate the user's explanation of ${nodeTitle}.
   
    Rubric (0-10 each):
    - Accuracy: Factual correctness
    - Clarity: Simple language (explain like I'm 15)
    - Completeness: Covers key mechanisms
    - Analogy: Quality of analogies used
   
    Ground truth: ${nodeContent}
   
    Output ONLY valid JSON:
    {
      "accuracy": number,
      "clarity": number,
      "completeness": number,
      "analogy": number,
      "overall_score": number,
      "feedback": string,
      "misconceptions": string[]
    }`

        const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userExplanation }
                ],
                temperature: 0.3,
                response_format: { type: "json_object" }
            })
        })

        const aiData = await aiResponse.json()

        if (!aiData.choices || !aiData.choices[0]?.message?.content) {
            throw new Error('Failed to get response from AI')
        }

        const gradeJson = JSON.parse(aiData.choices[0].message.content)
        const overallScore = gradeJson.overall_score ||
            Math.round((gradeJson.accuracy + gradeJson.clarity + gradeJson.completeness + gradeJson.analogy) / 4)

        // 4. Log to Database
        const isCompleted = overallScore >= 8

        const { error: logError } = await supabaseClient
            .from('quest_logs')
            .insert({
                user_id: user.id,
                quest_id: questId,
                transcript: [{ role: 'user', content: userExplanation }, { role: 'assistant', content: gradeJson.feedback }],
                ai_grade_json: gradeJson,
                completed: isCompleted
            })

        if (logError) throw logError

        // 5. Handle Progression if Completed
        let xpGained = 0
        let leveledUp = false
        let newLevel = 0

        if (isCompleted) {
            xpGained = questData.xp_reward
            if (overallScore === 10) xpGained += 50 // Perfect score bonus

            // Update User Progress
            await supabaseClient
                .from('user_progress')
                .upsert({
                    user_id: user.id,
                    node_id: node.id,
                    status: 'restored',
                    mastery_score: overallScore * 10,
                    last_attempt_at: new Date().toISOString()
                })

            // Update Profile XP
            // Fetch current profile first to calculate level up
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('xp_total, level')
                .eq('id', user.id)
                .single()

            if (profile) {
                const newXpTotal = profile.xp_total + xpGained
                // Simple level formula: Level = floor(sqrt(XP / 100)) + 1
                // or just every 1000 XP. Let's stick to the one in AppLayout mock: 1000 XP per level for now?
                // Let's assume 1000 XP per level for simplicity as per previous context
                const calculatedLevel = Math.floor(newXpTotal / 1000) + 1

                if (calculatedLevel > profile.level) {
                    leveledUp = true
                    newLevel = calculatedLevel
                } else {
                    newLevel = profile.level
                }

                await supabaseClient
                    .from('profiles')
                    .update({
                        xp_total: newXpTotal,
                        level: newLevel
                    })
                    .eq('id', user.id)
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                grade: gradeJson,
                aiResponse: gradeJson.feedback,
                xpGained,
                leveledUp,
                newLevel
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error: unknown) {
        const err = error as Error
        return new Response(
            JSON.stringify({ error: err.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
