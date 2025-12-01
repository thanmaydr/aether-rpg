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

    let userId: string | null = null
    let questId: string | null = null

    try {
        // Use service role for all database operations (bypasses RLS)
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get user ID from auth header
        const authHeader = req.headers.get('Authorization')

        console.log("Auth Header present:", !!authHeader)

        if (authHeader) {
            const userClient = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_ANON_KEY') ?? '',
                { global: { headers: { Authorization: authHeader } } }
            )
            const { data: { user }, error: userError } = await userClient.auth.getUser()

            if (userError) {
                console.error("Error getting user:", userError)
            }

            userId = user?.id ?? null
        }

        // Fallback to first user in database for demo/testing if no auth provided
        if (!userId) {
            console.log("No user found from auth header. Attempting fallback...")
            const { data: firstUser } = await supabaseClient
                .from('profiles')
                .select('id')
                .limit(1)
                .single()
            userId = firstUser?.id ?? null
        }

        if (!userId) {
            console.error("No user found after fallback.")
            return new Response(
                JSON.stringify({
                    error: 'No user found. Please ensure you are logged in.',
                    details: 'Authentication failed and no fallback user available.'
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 401,
                }
            )
        }

        console.log("User ID:", userId)

        // Self-healing: Ensure profile exists
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

        if (!profile) {
            console.log("Profile missing for user. Creating one...")
            // Fetch email if possible
            const { data: { user } } = await supabaseClient.auth.admin.getUserById(userId)
            const email = user?.email || `user_${userId.substring(0, 8)}`

            const { error: insertError } = await supabaseClient
                .from('profiles')
                .insert({
                    id: userId,
                    username: email,
                    xp_total: 0,
                    level: 1
                })

            if (insertError) {
                console.error("Failed to create profile:", insertError)
            } else {
                console.log("Profile created successfully.")
            }
        }

        const body = await req.json().catch(() => ({}))
        questId = body.questId
        const { userExplanation } = body

        if (!questId || !userExplanation) {
            throw new Error('Missing questId or userExplanation')
        }

        // Fetch Quest
        const { data: quest, error: questError } = await supabaseClient
            .from('quests')
            .select('id, xp_reward, node_id')
            .eq('id', questId)
            .single()

        if (questError || !quest) {
            throw new Error(`Quest not found: ${questError?.message}`)
        }

        // Fetch Node
        const { data: node, error: nodeError } = await supabaseClient
            .from('knowledge_nodes')
            .select('id, title, concept_content')
            .eq('id', quest.node_id)
            .single()

        if (nodeError || !node) {
            throw new Error(`Node not found: ${nodeError?.message}`)
        }

        // Call Groq AI
        const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
        if (!GROQ_API_KEY) {
            throw new Error('GROQ_API_KEY not configured')
        }

        const systemPrompt = `You are an automated pedagogical evaluator using the Feynman Technique.
   
Evaluate the user's explanation of ${node.title}.

IMPORTANT: If the user's input is a greeting (e.g., "hello", "hi"), a question, or irrelevant to the topic, return 0 for all scores and provide feedback asking them to explain the concept.
   
Rubric (0-10 each):
- Accuracy: Factual correctness
- Clarity: Simple language (explain like I'm 15)
- Completeness: Covers key mechanisms
- Analogy: Quality of analogies used
   
Ground truth: ${node.concept_content}
   
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

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text()
            throw new Error(`Groq API error: ${aiResponse.status} ${errorText}`)
        }

        const aiData = await aiResponse.json()

        if (!aiData.choices || !aiData.choices[0]?.message?.content) {
            throw new Error('Failed to get AI response')
        }

        let grade
        try {
            grade = JSON.parse(aiData.choices[0].message.content)
        } catch (e) {
            console.error("Failed to parse AI response:", aiData.choices[0].message.content)
            throw new Error("Invalid JSON from AI")
        }

        const overallScore = grade.overall_score || Math.round((grade.accuracy + grade.clarity + grade.completeness + grade.analogy) / 4)
        const isCompleted = overallScore >= 8

        // Log quest attempt
        await supabaseClient
            .from('quest_logs')
            .insert({
                user_id: userId,
                quest_id: questId,
                transcript: [
                    { role: 'user', content: userExplanation },
                    { role: 'assistant', content: grade.feedback }
                ],
                ai_grade_json: grade,
                completed: isCompleted
            })

        let xpGained = 0
        let leveledUp = false
        let newLevel = 0

        if (isCompleted) {
            // 5. Update Progress & XP
            // Fetch hints_used to calculate penalty
            const { data: progressData } = await supabaseClient
                .from('user_progress')
                .select('hints_used, attempts')
                .eq('user_id', userId)
                .eq('node_id', quest.node_id)
                .single()

            const hintsUsed = progressData?.hints_used || 0
            const penaltyMultiplier = Math.max(0.2, 1 - (hintsUsed * 0.2)) // Max 80% penalty (min 20% reward)

            // Check for Squad Membership (10% Bonus)
            const { data: squadMember } = await supabaseClient
                .from('squad_members')
                .select('squad_id')
                .eq('user_id', userId)
                .single()

            const squadBonusMultiplier = squadMember ? 1.1 : 1.0
            const xpReward = Math.round(quest.xp_reward * (overallScore / 10) * penaltyMultiplier * squadBonusMultiplier)
            xpGained = xpReward

            // Update User Progress
            await supabaseClient
                .from('user_progress')
                .upsert({
                    user_id: userId,
                    node_id: quest.node_id,
                    status: overallScore >= 8 ? 'restored' : 'corrupted',
                    mastery_score: Math.max(overallScore * 10, 0), // Store as percentage-ish
                    last_attempt_at: new Date().toISOString(),
                    attempts: (progressData?.attempts || 0) + 1
                }, { onConflict: 'user_id,node_id' })

            // Update profile XP
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('xp_total, level')
                .eq('id', userId)
                .single()

            if (profile) {
                const newXpTotal = (profile.xp_total || 0) + xpGained

                // Update Squad XP if in a squad
                if (squadMember) {
                    // We can do this async or just fire and forget, but let's await to be safe
                    // We need to increment the squad_xp. 
                    // Since we don't have a direct increment function exposed easily without RPC, 
                    // we'll just do a read-modify-write or use a custom RPC if we had one.
                    // For now, let's just try to update it. Ideally, we'd use an RPC for atomicity.
                    // But given the constraints, let's just do a simple update.
                    const { data: squad } = await supabaseClient
                        .from('squads')
                        .select('squad_xp')
                        .eq('id', squadMember.squad_id)
                        .single()

                    if (squad) {
                        await supabaseClient
                            .from('squads')
                            .update({ squad_xp: (squad.squad_xp || 0) + xpGained })
                            .eq('id', squadMember.squad_id)
                    }
                }
                const calculatedLevel = Math.floor(newXpTotal / 1000) + 1

                if (calculatedLevel > (profile.level || 1)) {
                    leveledUp = true
                    newLevel = calculatedLevel
                } else {
                    newLevel = profile.level || 1
                }

                await supabaseClient
                    .from('profiles')
                    .update({
                        xp_total: newXpTotal,
                        level: newLevel
                    })
                    .eq('id', userId)
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                grade,
                aiResponse: grade.feedback,
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
        console.error('Edge Function Error:', err)

        // Attempt to log error to DB
        try {
            const supabaseClient = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            )

            if (userId && questId) {
                await supabaseClient.from('quest_logs').insert({
                    user_id: userId,
                    quest_id: questId,
                    transcript: [{ role: 'system', content: `Error: ${err.message}` }],
                    completed: false,
                    ai_grade_json: { error: err.message, stack: err.stack }
                })
            }
        } catch (e) {
            console.error("Failed to log error to DB:", e)
        }

        return new Response(
            JSON.stringify({
                error: err.message,
                details: err.stack,
                timestamp: new Date().toISOString()
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
