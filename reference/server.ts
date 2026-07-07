import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { PrismaClient } from "@prisma/client";
import { GoogleGenAI, Type } from "@google/genai";
import { fileURLToPath } from "url";

const prisma = new PrismaClient();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/recipes", async (req, res) => {
    try {
      const recipes = await prisma.recipe.findMany({
        include: { tags: true, ingredients: { include: { ingredient: true } } },
        orderBy: { score: "desc" },
      });
      res.json(recipes);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "DB Error" });
    }
  });

  app.get("/api/ingredients", async (req, res) => {
    try {
      const ingredients = await prisma.ingredient.findMany({
        include: { tags: true, recipeIngredients: { include: { recipe: true } } },
      });
      res.json(ingredients);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "DB Error" });
    }
  });

  app.post("/api/plan/auto", async (req, res) => {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });
    try {
      // Mock retrieving logic to Gemini and generating list
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: "Suggest exactly 7 distinct meals for a weekly planner (dinner). Just return the list.",
      });
      res.json({ result: response.text });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "AI Error" });
    }
  });

  // Handle image generation using Gemini 2.5 Flash Image 
  // (Assuming user's reference to "小云雀" is handled via standard integration here as instructed)
  app.post("/api/image", async (req, res) => {
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });
      const prompt = `A hand-drawn sketch, crayon colored, magazine illustration style, abstract, of ${req.body.query}. Bright pastel colors, simple white background.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
          }
        }
      });
      let imageUrl = null;
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
      res.json({ imageUrl });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "AI Error" });
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
    // Fallback to Express router for SPA
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
