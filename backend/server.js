const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();
const rateLimit = require("express-rate-limit");

const app = express();
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json({ limit: "10mb" }));
console.log(
  "Gemini API KEY LOADED:",
  !!process.env.GEMINI_API_KEY
);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.get("/", (req, res) => {
  res.json({
    message: "CalorieAI Backend is running 🚀",
  });
});
app.use("/api/ai-coach", aiLimiter);
app.use("/api/meal-generator", aiLimiter);
app.use("/api/food-recognition", aiLimiter);

app.post("/api/ai-coach", async (req, res) => {
  try {
    const { profile, meals, nutrition } = req.body;

if (
  typeof profile !== "object" ||
  profile === null ||
  Array.isArray(profile) ||
  !Array.isArray(meals) ||
  typeof nutrition !== "object" ||
  nutrition === null ||
  Array.isArray(nutrition)
) {
  return res.status(400).json({
    success: false,
    message: "Invalid profile, meals or nutrition data.",
  });
}
    const prompt = `
You are an AI nutrition coach for a calorie tracking application.

Analyze the user's information below.

PROFILE:
${JSON.stringify(profile, null, 2)}

TODAY'S MEALS:
${JSON.stringify(meals, null, 2)}

NUTRITION:
${JSON.stringify(nutrition, null, 2)}

Give a concise personalized nutrition analysis.

Include:
1. Overall assessment
2. Calorie status
3. Protein/macronutrient status
4. What the user should eat next
5. One practical tip

Keep the response friendly, simple and actionable.
Do not diagnose medical conditions.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    res.json({
      success: true,
      analysis: response.text,
    });

  } catch (error) {
    console.error("GEMINI ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message || "AI analysis failed",
    });
  }
});

app.post("/api/meal-generator", async (req, res) => {
  try {
    const { profile, nutrition } = req.body;

   if (
  typeof profile !== "object" ||
  profile === null ||
  Array.isArray(profile) ||
  typeof nutrition !== "object" ||
  nutrition === null ||
  Array.isArray(nutrition)
) {
  return res.status(400).json({
    success: false,
    message: "Invalid profile or nutrition data.",
  });
}

    const prompt = `
You are an AI meal planner.

Create ONE practical meal recommendation for this user.

PROFILE:
${JSON.stringify(profile, null, 2)}

CURRENT NUTRITION:
${JSON.stringify(nutrition, null, 2)}

Focus on:
- Remaining calories
- Remaining protein
- User's fitness goal
- A realistic Indian-friendly meal

Give:
1. Meal name
2. Ingredients
3. Approximate calories
4. Protein
5. Why this meal is suitable

Keep it concise and practical.
Do not use Markdown symbols like # or **.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    res.json({
      success: true,
      meal: response.text,
    });

  } catch (error) {
    console.error("MEAL GENERATOR ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Meal generation failed",
    });
  }
});

app.post("/api/food-recognition", async (req, res) => {
  try {
if (!req.body || typeof req.body !== "object") {
  return res.status(400).json({
    success: false,
    message: "Invalid request data.",
  });
}

    const { image, mimeType } = req.body;


    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

  if (
  typeof image !== "string" ||
  typeof mimeType !== "string" ||
  image.trim() === "" ||
  !mimeType.trim()
) {
  return res.status(400).json({
    success: false,
    message: "Valid food image and MIME type are required.",
  });
}

    if (!allowedMimeTypes.includes(mimeType)) {
      return res.status(400).json({
        success: false,
        message: "Only JPEG, PNG and WEBP images are allowed",
      });
    }

    if (
      typeof image !== "string" ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(image) ||
      image.length > 8 * 1024 * 1024
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or oversized image",
      });
    }

    const prompt = `
Analyze this food image for a calorie tracking application.

Identify the most likely food or meal and estimate its nutritional values.

Return ONLY this information:

Food Name:
Calories:
Protein:
Carbs:
Fats:

Use reasonable approximate values for one visible serving.
If multiple foods are visible, estimate the complete meal.
Do not use Markdown symbols like # or **.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
            {
              inlineData: {
                mimeType: mimeType,
                data: image,
              },
            },
          ],
        },
      ],
    });

    res.json({
      success: true,
      result: response.text,
    });

  } catch (error) {
    console.error("FOOD RECOGNITION ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Food recognition failed",
    });
  }
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});