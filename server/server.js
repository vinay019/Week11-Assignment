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
Turn one task into a tiny, executable plan within the user's time budget.
Use any extra context (details, deadline window) to sequence steps sensibly.
Return ONLY valid JSON in this exact shape:
{
  "steps": [{"title":"string","minutes": number}],
  "pomodoro": {"work": number, "break": number, "cycles": number}
}
Constraints:
- British English.
- 3–6 steps.
- Sum of minutes <= user's minutes.
- No text or markdown outside the JSON.
`;

app.get("/health", function (req, res) {
  res.json({ ok: true });
});

app.post("/plan", async function (req, res) {
  try {
    const task = req.body && req.body.task;
    const details = req.body && req.body.details;
    const deadline = req.body && req.body.deadline;
    const minutes = Number(req.body && req.body.minutes);

    if (!task || !Number.isFinite(minutes) || minutes <= 0) {
      return res
        .status(400)
        .json({ error: "Please provide 'task' and a positive 'minutes'." });
    }

    const userInput = { task, details, deadline, minutes };

    const aiRes = await model.generateContent({
      systemInstruction,
      contents: [
        { role: "user", parts: [{ text: JSON.stringify(userInput) }] },
      ],
    });

    const text = aiRes.response.text();
    const json = extractJson(text);

    const sum = (json.steps || []).reduce(
      (a, s) => a + (Number(s.minutes) || 0),
      0
    );
    if (sum > minutes && json.steps && json.steps.length) {
      const over = sum - minutes;
      const last = json.steps[json.steps.length - 1];
      if (Number(last.minutes) > over)
        last.minutes = Number(last.minutes) - over;
      else json.steps.pop();
    }

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
  if (start === -1 || end === -1)
    throw new Error("No JSON found in model response");
  return JSON.parse(txt.slice(start, end + 1));
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, function () {
  console.log("Server listening on :" + PORT);
});
