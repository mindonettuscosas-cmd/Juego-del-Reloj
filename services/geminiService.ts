
import { GoogleGenAI } from "@google/genai";

// Function to generate coach commentary using Gemini
export const getCoachCommentary = async (survivalTime: number, totalPlayers: number, difficulty: string) => {
  // Always initialize right before use to ensure the most up-to-date API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an arcade game coach for "El Juego del Reloj". 
      A player just finished a round. 
      Survival Time: ${survivalTime.toFixed(1)}s 
      Total Players: ${totalPlayers}
      Difficulty: ${difficulty}
      Provide a very short, punchy, motivational or funny taunt (max 15 words) in Spanish.`,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Gemini commentary failed", error);
    return "¡Buen intento! Sigue saltando.";
  }
};
