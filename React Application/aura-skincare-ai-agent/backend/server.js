import dotenv from "dotenv";
import cors from "cors";
import express from "express";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3001);
const GROQ_API_KEY = process.env.GROQ_API_KEY?.trim();

const orders = [
  {
    id: "ORD-101",
    customer: "Priya Sharma",
    product: "Vitamin C Serum (30ml)",
    amount: "₹699", 
    status: "Out for Delivery",
    courier: "BlueDart",
    tracking: "BD-982103",
    expected: "6 PM today",
  },
  {
    id: "ORD-102",
    customer: "Rahul Verma",
    product: "Hydrating Sunscreen SPF 50",
    amount: "₹499",
    status: "Delivered",
    courier: "Delhivery",
    tracking: "DL-441029",
    delivered: "14 days ago",
  },
  {
    id: "ORD-103",
    customer: "Ananya Patel",
    product: "Green Tea Face Wash + Toner",
    amount: "₹850",
    status: "Processing",
    ordered: "3 hours ago",
    cancellationEligible: true,
  },
];

const BRAND_GUIDELINES = `
You are Aria, a friendly, professional, concise Indian customer support specialist for Aura Skincare.
Use only Aura Skincare brand information from the provided policy. Never promise refunds, returns, or cancellations unless they comply with policy.

Brand details:
- Aura Skincare is a premium organic Indian skincare brand focused on simple, effective skincare products.
- Free delivery on orders above ₹499. Orders below ₹499 have a ₹50 shipping fee.
- Standard delivery takes 3–5 business days.
- Returns are accepted within 7 days of delivery for unopened, unused products in original packaging.
- Damaged or defective products must be reported within 48 hours of delivery with photos for replacement.
- Orders can be cancelled only while their status is Processing. Once Shipped or Out for Delivery, it cannot be cancelled; customers may refuse delivery at the doorstep.
- Cash on Delivery is available for orders up to ₹2,500. Customers can pay by cash or UPI at the doorstep.

Answer in a short, natural, conversational tone. If the customer asks for something outside Aura Skincare support, politely explain you can only help with Aura Skincare-related queries.
If an order ID is missing or invalid, ask the customer to repeat or verify it.
If an order is not eligible for a requested action, explain the policy politely.
`;

const HINGLISH_GUIDELINES = `
Respond in conversational Hinglish: use natural Hindi mixed with familiar English skincare and order terms, written in Devanagari. Keep order IDs, product names, and brand names unchanged.
`;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

function getOrderById(orderId) {
  return orders.find((order) => order.id.toLowerCase() === String(orderId).toLowerCase());
}

function extractOrderId(text) {
  const match = text.match(/\bORD[\s-]*(\d{3})\b/i);
  return match ? `ORD-${match[1]}` : null;
}

function localizeResponse(english, hinglish, language) {
  return language === "hinglish" ? hinglish : english;
}

function buildLocalResponse(message, language = "english") {
  const normalized = String(message ?? "").toLowerCase();
  const orderId = extractOrderId(normalized);

  if (orderId) {
    const order = getOrderById(orderId);

    if (!order) {
      return localizeResponse(
        "I couldn't locate an order with that number. Could you please repeat or verify the order ID?",
        "मुझे इस नंबर का order नहीं मिल रहा। क्या आप order ID दोबारा बता सकते हैं या verify कर सकते हैं?",
        language,
      );
    }

    if (
      normalized.includes("track") ||
      normalized.includes("where") ||
      normalized.includes("status") ||
      normalized.includes("delivery") ||
      /kahan|kahaan|kidhar|kab milega|kab tak|कहाँ|कहां|किधर|कब मिलेगा|कब तक|पहुंचा|पहुंची/.test(normalized)
    ) {
      if (order.status === "Out for Delivery") {
        return localizeResponse(
          `Your order ${order.id} is currently out for delivery and is expected by ${order.expected}. It is being delivered by ${order.courier} with tracking ${order.tracking}.`,
          `आपका order ${order.id} अभी delivery के लिए निकल चुका है और ${order.expected} तक deliver होने की उम्मीद है। इसे ${order.courier} deliver कर रहा है; tracking ID ${order.tracking} है।`,
          language,
        );
      }

      if (order.status === "Delivered") {
        return localizeResponse(
          `Your order ${order.id} was delivered on ${order.delivered} via ${order.courier}. The tracking ID was ${order.tracking}.`,
          `आपका order ${order.id}, ${order.delivered} को ${order.courier} के through deliver हो गया था। Tracking ID ${order.tracking} थी।`,
          language,
        );
      }

      if (order.status === "Processing") {
        return localizeResponse(
          `Your order ${order.id} is still processing and was placed ${order.ordered}.`,
          `आपका order ${order.id} अभी processing में है। इसे ${order.ordered} place किया गया था।`,
          language,
        );
      }
    }

    if (/cancel|रद्द|कैंसल/.test(normalized)) {
      if (order.status === "Processing") {
        return localizeResponse(
          `Yes, order ${order.id} is still Processing, so it is eligible for cancellation. Once it has shipped or is out for delivery, cancellation is no longer possible.`,
          `हाँ, order ${order.id} अभी Processing में है, इसलिए इसे cancel किया जा सकता है। Ship होने के बाद या delivery के लिए निकलने के बाद cancellation possible नहीं होगी।`,
          language,
        );
      }

      return localizeResponse(
        `I’m sorry, order ${order.id} is ${order.status}, so it is no longer eligible for cancellation. Once it is Shipped or Out for Delivery, the order cannot be cancelled.`,
        `Sorry, order ${order.id} अब ${order.status} है, इसलिए इसे cancel नहीं किया जा सकता। Order Shipped या Out for Delivery हो जाने के बाद cancellation possible नहीं होती।`,
        language,
      );
    }

    if (/return|refund|रिटर्न|वापस|रिफंड/.test(normalized)) {
      if (order.status === "Delivered") {
        return localizeResponse(
          `Returns are accepted within 7 days of delivery for unopened, unused products in original packaging. If the product is damaged or defective, please report it within 48 hours with photos for a replacement.`,
          `Delivery के 7 दिनों के अंदर return possible है, अगर product unopened और unused हो और original packaging में हो। Product damaged या defective हो, तो replacement के लिए 48 घंटे के अंदर photos के साथ report करें।`,
          language,
        );
      }

      return localizeResponse(
        `I can help with the return policy. Returns are accepted within 7 days of delivery for unopened, unused products in original packaging. If it is damaged or defective, please report it within 48 hours of delivery with photos.`,
        `मैं return policy में help कर सकती हूँ। Delivery के 7 दिनों के अंदर return possible है, अगर product unopened और unused हो और original packaging में हो। Damaged या defective product को 48 घंटे के अंदर photos के साथ report करें।`,
        language,
      );
    }

    return localizeResponse(
      `Order ${order.id} is for ${order.product}. The current status is ${order.status}.`,
      `Order ${order.id} में ${order.product} है। इसका current status ${order.status} है।`,
      language,
    );
  }

  if (
    /shipping|delivery|डिलीवरी|शिपिंग|free delivery|order above|499 से (ऊपर|ज़्यादा|ज्यादा)/.test(normalized)
  ) {
    return localizeResponse(
      "Free delivery is available on orders above ₹499. Orders below ₹499 have a ₹50 shipping fee, and standard delivery takes 3–5 business days.",
      "₹499 से ज़्यादा के orders पर free delivery है। इससे कम के orders पर ₹50 shipping fee लगती है, और standard delivery में 3–5 business days लगते हैं।",
      language,
    );
  }

  if (/return|refund|रिटर्न|वापस|रिफंड/.test(normalized)) {
    return localizeResponse(
      "Returns are accepted within 7 days of delivery for unopened, unused products in original packaging. Damaged or defective products must be reported within 48 hours of delivery with photos for replacement.",
      "Delivery के 7 दिनों के अंदर return possible है, अगर product unopened और unused हो और original packaging में हो। Damaged या defective product के replacement के लिए 48 घंटे के अंदर photos के साथ report करें।",
      language,
    );
  }

  if (/cancel|रद्द|कैंसल/.test(normalized)) {
    return localizeResponse(
      "Orders can be cancelled only while their status is Processing. Once an order is Shipped or Out for Delivery, it cannot be cancelled.",
      "Order सिर्फ़ तभी cancel हो सकता है जब उसका status Processing हो। Order Shipped या Out for Delivery होने के बाद cancel नहीं हो सकता।",
      language,
    );
  }

  if (/\bcod\b|cash on delivery|कैश ऑन डिलीवरी/.test(normalized)) {
    return localizeResponse(
      "Cash on Delivery is available for orders up to ₹2,500. Customers can pay by cash or UPI at the doorstep.",
      "₹2,500 तक के orders पर Cash on Delivery available है। Delivery के समय doorstep पर cash या UPI से payment कर सकते हैं।",
      language,
    );
  }

  if (
    normalized.includes("flight") ||
    normalized.includes("book a flight") ||
    normalized.includes("outside") ||
    normalized.includes("non skincare")
  ) {
    return localizeResponse(
      "I can only help with Aura Skincare-related questions, orders, and policies.",
      "मैं सिर्फ़ Aura Skincare से जुड़े questions, orders और policies में help कर सकती हूँ।",
      language,
    );
  }

  return localizeResponse(
    "I’m here to help with Aura Skincare orders, shipping, returns, and policy questions. How can I help today?",
    "मैं Aura Skincare के orders, shipping, returns और policies में help के लिए यहाँ हूँ। आज मैं आपकी क्या help कर सकती हूँ?",
    language,
  );
}

function getToolResponse(toolName, language = "english") {
  const order = orders[0];

  switch (toolName) {
    case "lookup_order":
      return localizeResponse(
        `Order ${order.id} is ${order.status}. It contains ${order.product} and is expected to ${order.expected ?? "be processed shortly"}.`,
        `Order ${order.id} ${order.status} है। इसमें ${order.product} है और इसकी उम्मीद है ${order.expected ?? "जल्दी process होगी"}.`,
        language,
      );
    case "shipping_policy":
      return localizeResponse(
        "Free delivery is available on orders above ₹499. Orders below ₹499 have a ₹50 shipping fee, and standard delivery takes 3–5 business days.",
        "₹499 से ज़्यादा के orders पर free delivery है। इससे कम के orders पर ₹50 shipping fee लगती है, और standard delivery में 3–5 business days लगते हैं।",
        language,
      );
    case "returns_policy":
      return localizeResponse(
        "Returns are accepted within 7 days of delivery for unopened, unused products in original packaging. Damaged or defective products must be reported within 48 hours with photos for replacement.",
        "Delivery के 7 दिनों के अंदर return possible है, अगर product unopened और unused हो और original packaging में हो। Damaged या defective product के replacement के लिए 48 घंटे के अंदर photos के साथ report करें।",
        language,
      );
    default:
      return localizeResponse(
        "I can help with order status, shipping, and returns.",
        "मैं order status, shipping और returns में help कर सकती हूँ।",
        language,
      );
  }
}

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Aura Skincare AI Agent backend is running.",
  });
});

app.post("/api/tools", async (req, res) => {
  try {
    const toolName = String(req.body?.toolName ?? "").trim();
    const language = req.body?.language === "hinglish" ? "hinglish" : "english";

    if (!toolName) {
      return res.status(400).json({ error: "A tool name is required." });
    }

    return res.json({
      reply: getToolResponse(toolName, language),
      tool: toolName,
      source: "tool",
    });
  } catch (error) {
    console.error("Tool API error:", error);
    return res.status(500).json({ error: "Unable to process the tool request." });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const message = String(req.body?.message ?? "").trim();
    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    const language = req.body?.language === "hinglish" ? "hinglish" : "english";

    if (!message) {
      return res.status(400).json({ error: "A message is required." });
    }

    const fallbackReply = buildLocalResponse(message, language);

    if (!GROQ_API_KEY) {
      return res.json({ reply: fallbackReply, source: "local" });
    }

    const messages = [
      {
        role: "system",
        content: language === "hinglish"
          ? `${BRAND_GUIDELINES}\n${HINGLISH_GUIDELINES}`
          : BRAND_GUIDELINES,
      },
      ...history
        .slice(-8)
        .map((entry) => {
          const text = String(entry?.text ?? "").trim();
          if (!text) return null;

          return {
            role: entry?.role === "agent" ? "assistant" : "user",
            content: text,
          };
        })
        .filter(Boolean),
      { role: "user", content: message },
    ];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.3,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", errorText);
      return res.json({ reply: fallbackReply, source: "local" });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.json({ reply: fallbackReply, source: "local" });
    }

    return res.json({ reply, source: "groq" });
  } catch (error) {
    console.error("Chat API error:", error);
    return res.status(500).json({ error: "Unable to process the request." });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
