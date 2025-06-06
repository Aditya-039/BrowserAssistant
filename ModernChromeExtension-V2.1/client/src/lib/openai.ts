import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || "default_key",
  dangerouslyAllowBrowser: true, // Note: In production, API calls should go through backend
});

export async function getTextExplanation(text: string): Promise<string> {
  try {
    const prompt = `Give a clear explanation of the following text in a simple and easy way within 50 words: ${text}`;
    
    // the newest OpenAI model is "gpt-3.5-turbo" which provides fast responses for this use case
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 75, // Approximately 50 words + formatting
      temperature: 0.3, // For consistent, factual responses
    });

    const explanation = response.choices[0]?.message?.content?.trim();
    
    if (!explanation) {
      throw new Error("No explanation received from OpenAI");
    }

    return explanation;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Couldn't fetch explanation. Try again later.");
  }
}
