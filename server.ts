import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const SYSTEM_PROMPT = `You are an expert Roblox game developer and Lua scripting engineer.

Your job is to generate complete Roblox game systems that can be directly used in Roblox Studio.

The user will describe a game idea. You must respond with a complete Game Pack.

Rules:
1. You must write a script named "GameBuilder.lua" that PROGRAMMATICALLY constructs the entire 3D Map, UI, and required Parts using Instance.new(). Do not expect the user to manually build the map. The script should create baseplates, obstacles, lava, coins, checkpoints, and ScreenGuis.
2. Provide other necessary scripts (e.g., MainScript, Leaderboard) separately.
3. Scripts must be separated by file name.
4. No explanations inside code.
5. Use proper services (Players, ServerStorage, etc.).
6. Always make it beginner friendly and a complete playable game.

Map & UI Generation using Lua:
Important: Your GameBuilder.lua MUST build the map and UI when the game runs, or instruct the user to run it in the Command Bar.

Setup Guide:
Give step-by-step instructions. Tell the user to drag the downloaded .rbxmx file into Roblox Studio.

Make it feel like a viral Roblox game with addictive mechanics.`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  app.post("/api/generate", async (req, res) => {
    const { idea } = req.body;
    
    if (!idea) {
      res.status(400).json({ error: "Game idea is required" });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "GEMINI_API_KEY is not configured." });
      return;
    }

    try {
      let response;
      let retries = 3;
      let delay = 2000;
      
      const ai = new GoogleGenAI({ apiKey });
      
      while (retries > 0) {
        try {
          response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: `User's Game Idea: ${idea}\n\nSTRICTLY implement the exact features and genre the user asked for. Do not give a generic game.`,
            config: {
              systemInstruction: `${SYSTEM_PROMPT}\n\nCRITICAL: You must build EXACTLY what the user asks for. Adhere to their requested theme, mechanics, and details implicitly.`,
              temperature: 0.7,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  gameName: { type: Type.STRING },
                  overview: { type: Type.STRING, description: "Markdown text describing genre and core mechanics" },
                  files: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        filename: { type: Type.STRING, description: "Name of the file, e.g., MainScript.lua" },
                        content: { type: Type.STRING, description: "Content of the file" }
                      },
                      required: ["filename", "content"]
                    }
                  },
                  mapInstructions: { type: Type.STRING, description: "Markdown text explaining how to build the map" },
                  setupGuide: { type: Type.STRING, description: "Markdown text with step-by-step setup instructions" }
                },
                required: ["gameName", "overview", "files", "mapInstructions", "setupGuide"]
              }
            },
          });
          break; // Success
        } catch (error: any) {
          retries--;
          const isBusy = error.status === 503 || error.message?.includes('503');
          if (error.status === 429 || error.message?.includes('429')) {
             throw new Error("We are experiencing high demand and hit our AI request limit. Please wait a minute and try again.");
          }
          if (retries === 0 || !isBusy) {
            throw error;
          }
          console.warn(`Gemini API busy (503/429). Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        }
      }

      let responseText = response?.text || "{}";
      responseText = responseText.replace(/^```json/g, '').replace(/```$/g, '').trim();
      let resultObj;
      try {
        resultObj = JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON Parsing Error:", parseError, "Raw output:", responseText);
        throw new Error("The AI provided an invalid response format. Please try again.");
      }

      res.json({ result: resultObj });
    } catch (error: any) {
      console.error("Gemini API error:", error);
      res.status(500).json({ error: error.message || "Failed to generate your game pack. Please try again." });
    }
  });

  app.post("/api/chat", async (req, res) => {
    const { messages, gamePack } = req.body;
    
    if (!messages) {
      res.status(400).json({ error: "Messages are required" });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "GEMINI_API_KEY is not configured." });
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      let contextInfo = `You are a helpful programming assistant assisting a Roblox developer. The user currently has the following generated GamePack context:\n`;
      if (gamePack) {
        contextInfo += JSON.stringify(gamePack, null, 2);
      } else {
        contextInfo += `(No active GamePack yet, but they might ask general questions.)`;
      }
      contextInfo += `\nIf the user asks to modify the logic or fix an issue, provide the updated Lua code, explain what to change, or give step-by-step instructions. Reply with helpful explanations and utilize markdown code blocks for the specific file that needs fixing. Do NOT return raw JSON representing the gamepack unless explicitly requested.`;

      const contents = [
        { role: "user", parts: [{ text: contextInfo }] },
        { role: "model", parts: [{ text: "Understood. I am ready to help with your Roblox GamePack!" }] },
        ...messages.map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }))
      ];

      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: contents,
      });

      res.json({ reply: response?.text || "No response generated." });
    } catch (error: any) {
      console.error("Chat API error:", error);
      if (error.message?.includes('429')) {
        res.status(429).json({ error: "Rate limit reached. Please wait a moment before sending another message." });
        return;
      }
      res.status(500).json({ error: error.message || "Failed to get chat response" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
