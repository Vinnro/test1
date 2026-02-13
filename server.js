require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));


const GEMINI_API_KEY = process.env.GEMINI_API_KEY;


const MODEL = "gemini-2.5-flash";

if (!GEMINI_API_KEY) {
  console.warn("⚠ GEMINI_API_KEY не задан. Укажи его в .env");
}

app.post("/api/chat", async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    if (!message) {
      return res.status(400).json({ reply: "Введите сообщение." });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        reply: "На сервере не задан GEMINI_API_KEY."
      });
    }

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: message }]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 512
      }
    };

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await r.json();

    if (!r.ok) {
      console.error("Gemini API error:", data);
      return res.status(r.status).json({
        reply: `Gemini error ${r.status}: ${data?.error?.message || "unknown error"}`
      });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p?.text || "")
        .join("")
        .trim();

    if (!reply) {
      console.error("Gemini empty response:", data);
      return res.status(502).json({
        reply: "Модель не вернула текст. Попробуйте переформулировать вопрос."
      });
    }

    return res.json({ reply });
  } catch (err) {
    console.error("Server crash:", err);
    return res.status(500).json({
      reply: "Внутренняя ошибка сервера. Проверьте логи backend."
    });
  }
});

app.get("/api/health", (_, res) => {
  res.json({ ok: true, model: MODEL, hasKey: Boolean(GEMINI_API_KEY) });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server started: http://localhost:${PORT}`);
  console.log(`🤖 Model: ${MODEL}`);
});
