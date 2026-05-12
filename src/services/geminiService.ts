import { GoogleGenAI, Type } from "@google/genai";
import { RecommendationRequest, FertilizerRecommendation } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getFertilizerRecommendation(
  data: RecommendationRequest
): Promise<FertilizerRecommendation> {
  const prompt = `
    You are a Senior Agronomist and Soil Scientist specializing in the Indian agricultural landscape. Your recommendations MUST align with the scientific frameworks provided by the ICAR-Indian Institute of Soil Science (IISS) and the Soil Health Card (SHC) scheme by the Ministry of Agriculture & Farmers Welfare, Govt of India.
    
    ENVIRONMENTAL CONTEXT:
    - Target Crop: ${data.cropType}
    - Growth Stage: ${data.growthStage}
    - Soil Identity: ${data.soilType}
    - Current Sensor Readings (mg/kg): Nitrogen=${data.n}, Phosphorus=${data.p}, Potassium=${data.k}
    - Atmospheric Conditions: ${data.temperature}°C, ${data.humidity}% Humidity
    - Land Magnitude: ${data.area} ${data.areaUnit}
    
    CORE OBJECTIVES:
    1. NUTRIENT DEFICIT ANALYSIS: Using ICAR-standard STCR (Soil Test Crop Response) equations, calculate the exact gap for ${data.cropType}.
    2. CORRECTIVE FERTILIZER STRATEGY: Provide dosages for Urea (46% N), DAP (18% N, 46% P2O5), and MOP (60% K2O) to bridge the gap for the specified area.
    3. STRATEGIC SYNOPSIS: A 2-3 sentence brief analysis focusing on nutrient bioavailability and climate impact.
    
    JSON format:
    {
      "summary": "Expert summary describing bioavailability and strategic focus.",
      "deficits": {
        "n": "N deficit (e.g. '140 kg/ha')",
        "p": "P deficit",
        "k": "K deficit"
      },
      "fertilizerPlan": [
        { "name": "Fertilizer Name", "dosage": "Total quantity for ${data.area} ${data.areaUnit}" }
      ],
      "alerts": ["Critical alerts (max 2)"]
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { 
            type: Type.STRING,
            description: "CRITICAL: A 2-3 sentence strategic analysis of why these specific dosages were chosen based on crop stage and soil type."
          },
          deficits: {
            type: Type.OBJECT,
            properties: {
              n: { type: Type.STRING, description: "Calculated Nitrogen deficit with unit (e.g. '145 kg/ha')" },
              p: { type: Type.STRING, description: "Calculated Phosphorus deficit with unit" },
              k: { type: Type.STRING, description: "Calculated Potassium deficit with unit" }
            },
            required: ["n", "p", "k"]
          },
          fertilizerPlan: {
            type: Type.ARRAY,
            description: "MANDATORY: List at least 3 distinct fertilizers (Urea, DAP, MOP) with exact total quantities for the specified land area.",
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Fertilizer commercial name (e.g. Urea)" },
                dosage: { type: Type.STRING, description: "Total quantity with unit (e.g. '45.8 kg')" }
              },
              required: ["name", "dosage"]
            }
          },
          alerts: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Max 2 safety alerts regarding soil pH or leaching risks."
          }
        },
        required: ["summary", "deficits", "fertilizerPlan", "alerts"]
      }
    }
  });

  const rawText = response.text || "{}";
  const sanitizedText = rawText.replace(/```json|```/g, "").trim();
  try {
    const parsed = JSON.parse(sanitizedText);
    
    // Safety check for empty values
    if (!parsed.summary || parsed.summary.trim() === "") {
       parsed.summary = "Strategic focus on nutrient optimization to ensure maximum bioavailability and physiological development.";
    }
    
    if (!parsed.fertilizerPlan || parsed.fertilizerPlan.length === 0) {
       console.warn("AI returned empty fertilizer plan, raw response:", rawText);
    }
    
    return parsed;
  } catch (e) {
    console.error("Failed to parse Gemini response:", rawText, e);
    throw new Error(`Invalid AI response format: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}
