

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export async function translateText(text: string, targetLang: string): Promise<string> {
    if (!text) return '';
    if (targetLang === 'en' && /^[a-zA-Z0-9\s.,?!]*$/.test(text)) return text; // Simple check to avoid redundant translation

    try {
        if (!GROQ_API_KEY) {
            console.warn('VITE_GROQ_API_KEY is missing. Returning original text.');
            return text;
        }

        const systemPrompt = `You are a professional translator. Translate the user's text to ${targetLang === 'hi' ? 'Hindi' : targetLang}. 
        IMPORTANT: Return ONLY the translated text. Do not include any introductory phrases, notes, or quotes. 
        If the text is already in the target language, return it as is.`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text }
                ],
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(`Groq API Error: ${errData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const translatedText = data.choices[0]?.message?.content?.trim();
        return translatedText || text;
    } catch (error) {
        console.error('Translation error:', error);
        return text; // Fallback to original text
    }
}
