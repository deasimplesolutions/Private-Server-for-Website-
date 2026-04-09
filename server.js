// ============================================
// CHAT PROXY SERVER
// ============================================
// This server sits between your website and the
// Anthropic API so your API key stays private.
//
// The API key is read from an environment variable
// called ANTHROPIC_API_KEY (set in Render dashboard
// or in a .env file for local testing).
// ============================================

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Configuration ──

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 1024;

// System prompt — edit this to change the chatbot's personality
const SYSTEM_PROMPT =
  "You are a helpful assistant for Simple Solutions. Answer questions about our services, pricing, and availability. Be friendly and concise.";

// CORS — replace the wildcard with your actual domain in production
// e.g. "https://www.simplesolutions.com"
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || "*";

// ── Middleware ──

app.use(express.json());
app.use(
  cors({
    origin: ALLOWED_ORIGINS === "*" ? "*" : ALLOWED_ORIGINS.split(","),
    methods: ["POST"],
  })
);

// ── Health check ──

app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "Simple Solutions Chat Proxy" });
});

// ── Chat endpoint ──

app.post("/api/chat", async (req, res) => {
  // Validate API key is configured
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: "Server misconfigured — ANTHROPIC_API_KEY not set.",
    });
  }

  // Validate request body
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: "Request must include a non-empty 'messages' array.",
    });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const msg = errBody?.error?.message || `Anthropic API error (${response.status})`;
      return res.status(response.status).json({ error: msg });
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || "";

    res.json({ reply });
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Failed to reach the AI service." });
  }
});

// ── Start ──

app.listen(PORT, () => {
  console.log(`Chat proxy running on port ${PORT}`);
});
