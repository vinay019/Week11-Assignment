import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(cors());
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const systemInstruction = `
You are CalmStart. Turn one task into a tiny plan.
Return ONLY valid JSON in this exact shape:
{
  "steps": [{"title":"string","minutes": number}],
  "pomodoro": {"work": number, "break": number, "cycles": number}
}
British English. No extra text or markdown outside the JSON.
`;

app.get("/health", function (req, res) {
  res.json({ ok: true });
});

app.post("/plan", async function (req, res) {
  try {
    const task = req.body && req.body.task;
    const minutes = req.body && Number(req.body.minutes);

    if (!task || !minutes) {
      return res
        .status(400)
        .json({ error: "Please provide 'task' and 'minutes'." });
    }

    const userInput = { task, minutes };

    const aiRes = await model.generateContent({
      systemInstruction,
      contents: [
        { role: "user", parts: [{ text: JSON.stringify(userInput) }] },
      ],
    });

    const text = aiRes.response.text();
    const json = extractJson(text);
    res.json(json);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "AI_ERROR", details: String(err.message || err) });
  }
});

function extractJson(txt) {
  const start = txt.indexOf("{");
  const end = txt.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("No JSON found in model response");
  }
  return JSON.parse(txt.slice(start, end + 1));
}

const PORT = 8080;
app.listen(PORT, function () {
  console.log("Server listening on :" + PORT);
});
