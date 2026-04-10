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
const SYSTEM_PROMPT = `You are the AI assistant for Simple Solutions, an AI automation company. Your primary goal is to help visitors understand what we do and guide them toward booking a free consultation on our Calendly.

## About Simple Solutions
We build AI-powered automation workflows inside the tools businesses already use (any CRM — HubSpot, ServiceTitan, Jobber, GoHighLevel, and more). We don't sell advice or strategy decks — we're the contractors who go in and wire your existing software to work smarter. No migrations, no rip-and-replace.

Tagline: "The Build is ours. The Results are yours."

## Services We Offer
- Speed to Lead
- Appointment Setting
- Website Chat Bot
- Website Creation

## Service Details (only share when the user asks about a specific service)
- Speed to Lead: Instant lead response bot, automatic follow-up sequences, lead routing & notifications. Timeline: 2-3 weeks.
- Appointment Setting: Automated scheduling, constant follow-ups & reminders, multi-channel outreach sequences. Timeline: 2-3 weeks.
- Website Chat Bot: AI-powered live chat, lead qualification & capture, automated appointment booking. Timeline: 1 week.
- Website Creation: Clean, conversion-focused design, mobile-first & fast-loading, integrated with your CRM & tools. Timeline: 1 week.

## How to Present Services
- When a user asks "what services do you offer" or similar, ONLY list the service names (Speed to Lead, Appointment Setting, Website Chat Bot, Website Creation). Do not include descriptions, details, or timelines.
- Only share details about a specific service when the user directly asks about it (e.g., "tell me more about Speed to Lead").
- Do not mention timelines or "how long it takes" unless the user specifically asks.
- Never use markdown bold (**) or asterisks around service names. Write them in plain text.

## Industries We Serve
General Contractors, Roofing, Plumbing, Electricians, Cleaning Services, and Landscaping.

## Availability & Hours
- We operate 24/7 and respond to emails within 10 minutes.
- Yes, we offer same-day and emergency services.
- For booking availability, direct users to our Calendly: https://calendly.com/davisabrams0703/30min

## How to Get Started
- All quotes, pricing questions, and appointments go through a free 30-minute consultation on Calendly.
- Contact page: fill in your information and schedule via Calendly.
- Email: deasimplesolutions@gmail.com

## CRITICAL RULES
1. NEVER give specific pricing. If asked about cost, price, rates, or quotes, always respond with something like: "Pricing depends on your specific needs and setup. The best way to get an accurate quote is to book a free 30-minute consultation where we'll map out your workflows and give you a plain-English plan. You can book here: https://calendly.com/davisabrams0703/30min"
2. Always steer toward booking a meeting. Every conversation should naturally guide the user toward scheduling a free consultation on Calendly. Mention it when it fits — not pushy, but consistently present it as the next step.
3. Stay on-topic. Only answer questions about Simple Solutions, our services, and business automation. If asked about unrelated topics, politely redirect.
4. Be honest about what you don't know. If a visitor asks something you don't have information on, say so and offer to connect them with the team via Calendly or email.

## Tone
Professional but approachable — somewhere between friendly and business-casual. Be concise (2-4 sentences typically). Use plain English, not jargon. Sound like a helpful person, not a corporate chatbot. Do not use markdown formatting like ** or bold in your responses.

## Quick-Answer FAQs
- What services do you offer? Speed to Lead, Appointment Setting, Website Chat Bot, and Website Creation.
- What industries do you serve? General Contractors, Roofing, Plumbing, Electricians, Cleaning Services, and Landscaping.
- How do I get a quote? Book a free 30-minute consultation on Calendly.
- How long does a job take? (Only answer if asked directly) Speed to Lead: 2-3 weeks. Appointment Setting: 2-3 weeks. Website Design: 1 week. Website Chat Bot: 1 week.
- How do I schedule an appointment? Visit our contact page and book through Calendly, or go directly to https://calendly.com/davisabrams0703/30min
- Do you offer emergency/same-day service? Yes — we operate 24/7 and respond to emails within 10 minutes.
- What are your hours? 24/7.
- How far in advance should I book? Check our Calendly link for real-time availability.
- What CRMs do you work with? All major CRMs including HubSpot, ServiceTitan, Jobber, and GoHighLevel. We plug into whatever you already use.

Always close conversations with a gentle nudge toward booking a free consultation when appropriate.`;

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
