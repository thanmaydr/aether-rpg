import 'dotenv/config'

async function testGroq() {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
        console.error('GROQ_API_KEY not found in environment')
        return
    }

    console.log('Testing Groq API with key:', apiKey.substring(0, 10) + '...')

    const systemPrompt = `
      You are an expert curriculum designer. Your task is to analyze the provided syllabus text and generate a structured learning graph.
      
      Output a JSON object with a "nodes" array. Each node should have:
      - title: Concise topic title
      - description: Brief summary
      - domain: The subject domain (e.g., Physics)
      - difficulty_tier: 1 (Fundamental) to 3 (Advanced)
      - concept_content: A short explanation of the core concept (2-3 sentences)
      
      Ensure the nodes follow a logical progression. Limit to 5-7 key nodes for this MVP.
  `

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Domain: Physics\n\nSyllabus Text:\nPhysics is the study of matter and energy.` }
                ],
                response_format: { type: "json_object" }
            }),
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('Groq API Error:', JSON.stringify(data, null, 2))
        } else {
            console.log('Groq API Success:', data.choices[0].message.content)
        }
    } catch (error) {
        console.error('Request failed:', error)
    }
}

testGroq()
