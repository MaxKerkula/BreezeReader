
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async simplify(text: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Rewrite the following text to be extremely easy to read for someone with dyslexia. Use short sentences, clear vocabulary, and an active voice. Maintain the core meaning but make it highly accessible. Keep the same general length if possible. Text:\n\n${text.substring(0, 5000)}`,
        config: {
          temperature: 0.5,
        }
      });
      return response.text || "Failed to simplify text.";
    } catch (e) {
      console.error("Gemini simplify error:", e);
      return "Could not simplify text. Please check API key.";
    }
  }

  async defineWord(word: string, context: string): Promise<{ definition: string; examples: string[] }> {
    try {
      // Using the Free Dictionary API
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      
      if (!response.ok) {
        throw new Error('Word not found');
      }

      const data = await response.json();
      
      // Navigate the response structure to find the first definition
      const entry = data[0];
      const meaning = entry?.meanings?.[0];
      const defEntry = meaning?.definitions?.[0];

      if (!defEntry) return { definition: "No definition found.", examples: [] };

      return {
        definition: defEntry.definition,
        examples: defEntry.example ? [defEntry.example] : []
      };

    } catch (e) {
      console.warn("Dictionary lookup failed:", e);
      return { definition: "Definition not available.", examples: [] };
    }
  }
}

export const geminiService = new GeminiService();
