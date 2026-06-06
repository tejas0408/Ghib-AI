import { createOpenAI } from '@ai-sdk/openai';

const apiKey = process.env.OPENAI_API_KEY || process.env.OPEN_AI_API_KEY;

if (!apiKey) {
  console.warn('WARNING: OpenAI API key is missing. AI operations will fail.');
}

export const hasOpenAIKey = Boolean(apiKey);

export const openaiProvider = createOpenAI({
  apiKey: apiKey || 'dummy-key',
  headers: {
    'X-App-Source': 'Ghib-AI',
  },
});
