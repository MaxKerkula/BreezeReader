
import { GoogleGenAI, Type } from "@google/genai";

export interface DefinitionResult {
  definition: string;
  examples: string[];
  alternatives?: { pos: string; def: string }[];
  source: 'ai' | 'standard';
}

export class GeminiService {
  
  async rewrite(text: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Rewrite the following text to optimize it for "Bionic Reading" and RSVP (Rapid Serial Visual Presentation). 
        
        Goals:
        1. Summarize slightly to remove fluff, but keep all key information.
        2. Break long, complex sentences into shorter, punchy sentences.
        3. Use active voice.
        4. Maintain the original tone/sophistication, just make the flow better.
        
        Text to rewrite:\n\n${text.substring(0, 5000)}`,
        config: { temperature: 0.3 }
      });
      return response.text || "Failed to rewrite text.";
    } catch (e) {
      console.error("Gemini rewrite error:", e);
      throw e;
    }
  }

  async defineWord(word: string, context: string, mode: 'ai' | 'standard' = 'ai'): Promise<DefinitionResult> {
    
    // STANDARD MODE (Free Dictionary API)
    // Also acts as fallback if AI fails or no key
    if (mode === 'standard') {
      try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        if (!response.ok) throw new Error('Word not found');
        
        const data = await response.json();
        const entry = data[0];
        
        // Extract all meanings to help user context switch manually
        const alternatives = entry.meanings.map((m: any) => ({
             pos: m.partOfSpeech,
             def: m.definitions[0]?.definition
        }));

        return {
          definition: alternatives[0]?.def || "No definition found.",
          examples: entry.meanings[0]?.definitions[0]?.example ? [entry.meanings[0]?.definitions[0]?.example] : [],
          alternatives: alternatives,
          source: 'standard'
        };
      } catch (e) {
        return { definition: "Definition not available in standard mode.", examples: [], source: 'standard' };
      }
    }

    // AI MODE (Gemini)
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Define the word "${word}" as it is used in the following context: "...${context}...". Provide a clear definition and a new example sentence.`,
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
        examples: [data.example],
        source: 'ai'
      };

    } catch (e) {
      console.warn("Gemini definition failed or no key, falling back to standard:", e);
      // Auto fallback to standard
      return this.defineWord(word, context, 'standard');
    }
  }
}

export const geminiService = new GeminiService();
