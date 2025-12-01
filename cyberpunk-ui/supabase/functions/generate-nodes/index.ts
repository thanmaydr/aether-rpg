import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { text, domain, ping } = await req.json()
        const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')

        if (ping) {
            return new Response(
                JSON.stringify({ pong: true, hasKey: !!GROQ_API_KEY }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            )
        }

        if (!GROQ_API_KEY) {
            throw new Error('GROQ_API_KEY is not set')
        }

        const systemPrompt = `
      You are an expert curriculum designer. Your task is to analyze the provided syllabus text and generate a structured learning graph.
      
      Output a JSON object with a "nodes" array. Each node should have:
      - title: Concise topic title
      - description: Brief summary
      - domain: The subject domain (e.g., ${domain})
      - difficulty_tier: 1 (Fundamental) to 3 (Advanced)
      - concept_content: A short explanation of the core concept (2-3 sentences)
      
      Ensure the nodes follow a logical progression. Limit to 5-7 key nodes for this MVP.
    `

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Domain: ${domain}\n\nSyllabus Text:\n${text.substring(0, 6000)}` } // Truncate to avoid token limits
                ],
                response_format: { type: "json_object" }
            }),
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('Groq API Error:', data)
            throw new Error(data.error?.message || 'Failed to generate nodes')
        }

        const generatedContent = JSON.parse(data.choices[0].message.content)

        return new Response(
            JSON.stringify(generatedContent),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    } catch (error) {
        // Return 200 with error to bypass Supabase client generic error
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    }
})
