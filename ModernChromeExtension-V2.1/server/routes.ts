import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Configuration, OpenAIApi } from 'openai';

const router = Router();

// API key configuration
let openaiConfig: Configuration | null = null;
let openaiClient: OpenAIApi | null = null;

// API key validation and setup
const setupOpenAI = (apiKey: string): boolean => {
  try {
    openaiConfig = new Configuration({ apiKey });
    openaiClient = new OpenAIApi(openaiConfig);
    return true;
  } catch (error) {
    console.error('Error setting up OpenAI:', error);
    return false;
  }
};

// API key management route
router.post('/api/config', async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    // Test the API key with a minimal request
    const config = new Configuration({ apiKey });
    const openai = new OpenAIApi(config);
    await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{ role: "system", content: "Test" }],
      max_tokens: 1
    });

    // If we get here, the API key is valid
    setupOpenAI(apiKey);
    res.json({ success: true });
  } catch (error: any) {
    console.error('API key validation error:', error);
    res.status(400).json({ 
      error: error?.response?.data?.error?.message || 'Invalid API key - please check your key and try again'
    });
  }
});

const explainRequestSchema = z.object({
  text: z.string().min(1).max(1000),
  question: z.string().optional(),
  analyze: z.boolean().optional(),
});

router.post('/api/explain', async (req: Request, res: Response) => {
  try {
    // Check if OpenAI is configured
    if (!openaiClient) {
      return res.status(400).json({ 
        error: 'OpenAI API not configured. Please set up your API key first.',
        needsConfiguration: true
      });
    }

    const { text, question, analyze } = explainRequestSchema.parse(req.body);
    
    if (analyze) {
      // For code analysis, we'll make two requests: one for explanation and one for improvements
      const [explanationCompletion, improvementCompletion] = await Promise.all([
        openaiClient.createChatCompletion({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a helpful coding assistant. Explain code clearly and concisely."
            },
            {
              role: "user",
              content: `Explain what this code does:\n${text}`
            }
          ],
          max_tokens: 150,
          temperature: 0.3,
        }),
        openaiClient.createChatCompletion({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are an expert code reviewer. Analyze the code and suggest specific improvements for better performance, readability, and best practices. If the code is already optimal, explain why no improvements are needed. Always provide concrete suggestions or explanations."
            },
            {
              role: "user",
              content: `Review this code and suggest improvements:\n${text}`
            }
          ],
          max_tokens: 250,
          temperature: 0.3,
        })
      ]);

      const explanation = explanationCompletion.data.choices[0]?.message?.content || "Could not generate explanation.";
      const improvements = improvementCompletion.data.choices[0]?.message?.content || "Could not analyze improvements.";
      
      res.json({ explanation, improvements });
      return;
    }
    
    // Handle regular questions about the code
    let prompt = question 
      ? `Given this code:\n${text}\n\nQuestion: ${question}\n\nAnswer:`
      : `Explain this concisely (max 50 words):\n${text}`;

    const completion = await openaiClient.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: question 
            ? "You are a helpful coding assistant. Provide clear, technical answers to questions about code."
            : "You are a helpful assistant. Explain concepts clearly and concisely in 50 words or less."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: question ? 500 : 100,
      temperature: 0.3,
    });

    const explanation = completion.data.choices[0]?.message?.content || "Could not generate explanation.";
    
    res.json({ explanation });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: error?.response?.data?.error?.message || 'Failed to generate explanation',
      needsConfiguration: !openaiClient
    });
  }
});

export default router;
