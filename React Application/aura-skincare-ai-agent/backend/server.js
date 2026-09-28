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

app.use(cors());
app.use(express.json({ limit: "1mb" }));

function getOrderById(orderId) {
  return orders.find((order) => order.id.toLowerCase() === String(orderId).toLowerCase());
}

function extractOrderId(text) {
  const match = text.match(/ORD-\d{3}/i);
  return match ? match[0].toUpperCase() : null;
}

function buildLocalResponse(message) {
  const normalized = String(message ?? "").toLowerCase();
  const orderId = extractOrderId(normalized);

  if (orderId) {
    const order = getOrderById(orderId);

    if (!order) {
      return "I couldn't locate an order with that number. Could you please repeat or verify the order ID?";
    }

    if (
      normalized.includes("track") ||
      normalized.includes("where") ||
      normalized.includes("status") ||
      normalized.includes("delivery")
    ) {
      if (order.status === "Out for Delivery") {
        return `Your order ${order.id} is currently out for delivery and is expected by ${order.expected}. It is being delivered by ${order.courier} with tracking ${order.tracking}.`;
      }

      if (order.status === "Delivered") {
        return `Your order ${order.id} was delivered on ${order.delivered} via ${order.courier}. The tracking ID was ${order.tracking}.`;
      }

      if (order.status === "Processing") {
        return `Your order ${order.id} is still processing and was placed ${order.ordered}.`;
      }
    }

    if (normalized.includes("cancel")) {
      if (order.status === "Processing") {
        return `Yes, order ${order.id} is still Processing, so it is eligible for cancellation. Once it has shipped or is out for delivery, cancellation is no longer possible.`;
      }

      return `I’m sorry, order ${order.id} is ${order.status}, so it is no longer eligible for cancellation. Once it is Shipped or Out for Delivery, the order cannot be cancelled.`;
    }

    if (normalized.includes("return") || normalized.includes("refund")) {
      if (order.status === "Delivered") {
        return `Returns are accepted within 7 days of delivery for unopened, unused products in original packaging. If the product is damaged or defective, please report it within 48 hours with photos for a replacement.`;
      }

      return `I can help with the return policy. Returns are accepted within 7 days of delivery for unopened, unused products in original packaging. If it is damaged or defective, please report it within 48 hours of delivery with photos.`;
    }

    return `Order ${order.id} is for ${order.product}. The current status is ${order.status}.`;
  }

  if (
    normalized.includes("shipping") ||
    normalized.includes("delivery") ||
    normalized.includes("free delivery") ||
    normalized.includes("order above")
  ) {
    return "Free delivery is available on orders above ₹499. Orders below ₹499 have a ₹50 shipping fee, and standard delivery takes 3–5 business days.";
  }

  if (normalized.includes("return") || normalized.includes("refund")) {
    return "Returns are accepted within 7 days of delivery for unopened, unused products in original packaging. Damaged or defective products must be reported within 48 hours of delivery with photos for replacement.";
  }

  if (normalized.includes("cancel")) {
    return "Orders can be cancelled only while their status is Processing. Once an order is Shipped or Out for Delivery, it cannot be cancelled.";
  }

  if (normalized.includes("cod") || normalized.includes("cash on delivery")) {
    return "Cash on Delivery is available for orders up to ₹2,500. Customers can pay by cash or UPI at the doorstep.";
  }

  if (
    normalized.includes("flight") ||
    normalized.includes("book a flight") ||
    normalized.includes("outside") ||
    normalized.includes("non skincare")
  ) {
    return "I can only help with Aura Skincare-related questions, orders, and policies.";
  }

  return "I’m here to help with Aura Skincare orders, shipping, returns, and policy questions. How can I help today?";
}

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Aura Skincare AI Agent backend is running.",
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const message = String(req.body?.message ?? "").trim();
    const history = Array.isArray(req.body?.history) ? req.body.history : [];

    if (!message) {
      return res.status(400).json({ error: "A message is required." });
    }

    const fallbackReply = buildLocalResponse(message);

    if (!GROQ_API_KEY) {
      return res.json({ reply: fallbackReply, source: "local" });
    }

    const messages = [
      { role: "system", content: BRAND_GUIDELINES },
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
