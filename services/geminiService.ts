
import { GoogleGenAI, Type } from "@google/genai";

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

  async defineWord(word: string, context: string, mode: 'ai' | 'standard' = 'ai'): Promise<{ definition: string; examples: string[] }> {
    // STANDARD MODE (Free Dictionary API)
    if (mode === 'standard') {
      try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        if (!response.ok) throw new Error('Word not found');
        
        const data = await response.json();
        const entry = data[0];
        // Just take the first definition of the first meaning since we lack context awareness in this mode
        const meaning = entry?.meanings?.[0];
        const defEntry = meaning?.definitions?.[0];

        if (!defEntry) return { definition: "No definition found.", examples: [] };

        return {
          definition: defEntry.definition,
          examples: defEntry.example ? [defEntry.example] : []
        };
      } catch (e) {
        return { definition: "Definition not available in standard mode.", examples: [] };
      }
    }

    // AI MODE (Gemini)
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Define the word "${word}" as it is used in the following context: "...${context}...". Provide a clear, simple definition and a new example sentence using the word in the same way.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              definition: { type: Type.STRING, description: "The definition of the word in context" },
              example: { type: Type.STRING, description: "An example sentence using the word" }
            },
            required: ["definition", "example"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");
      
      const data = JSON.parse(text);

      return {
        definition: data.definition,
        examples: [data.example]
      };

    } catch (e) {
      console.warn("Gemini definition failed:", e);
      return { 
        definition: "Could not retrieve context-aware definition. Check API Key.", 
        examples: [] 
      };
    }
  }
}

export const geminiService = new GeminiService();
