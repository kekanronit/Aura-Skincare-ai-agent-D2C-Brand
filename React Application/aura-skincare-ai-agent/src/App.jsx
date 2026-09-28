import { useCallback, useEffect, useRef, useState } from "react";

import Header from "./Components/Header";
import AgentPanel from "./Components/AgentPanel";
import OrderHelper from "./Components/OrderHelper";
import Transcript from "./Components/Transcript";

import { orders as order } from "./Data/order.js";
import {
  speakAgentReply,
  startVoiceSession,
  stopVoiceSession,
} from "./services/realtime";

const defaultSummary = {
  customer_intent: "UNKNOWN",
  order_id: null,
  resolution_status: "IN_PROGRESS",
  call_summary: "No summary available yet.",
};

function App() {
  const recognitionRef = useRef(null);
  const messagesRef = useRef([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [agentStatus, setAgentStatus] = useState("Ready");
  const [messages, setMessages] = useState([]);
  const [callSummary, setCallSummary] = useState(defaultSummary);

  const updateMessages = useCallback((updater) => {
    setMessages((previous) => {
      const next = typeof updater === "function" ? updater(previous) : updater;
      messagesRef.current = next;
      return next;
    });
  }, []);

  const summarizeCall = useCallback((conversation) => {
    if (!conversation.length) {
      setCallSummary(defaultSummary);
      return;
    }

    const text = conversation.map((entry) => entry.text).join(" ");
    const orderMatch = text.match(/ORD-\d{3}/i);
    const orderId = orderMatch ? orderMatch[0].toUpperCase() : null;

    let customerIntent = "GENERAL_SUPPORT";
    if (/track|delivery|status/.test(text.toLowerCase())) customerIntent = "ORDER_TRACKING";
    if (/cancel|return|refund/.test(text.toLowerCase())) customerIntent = "ORDER_POLICY";
    if (/shipping|cod|cash on delivery|delivery fee/.test(text.toLowerCase())) customerIntent = "SHIPPING_INFO";

    const summaryText = conversation
      .filter((entry) => entry.text)
      .map((entry) => `${entry.role === "customer" ? "Customer" : "Agent"}: ${entry.text}`)
      .join(" | ");

    setCallSummary({
      customer_intent: customerIntent,
      order_id: orderId,
      resolution_status: "RESOLVED",
      call_summary: summaryText.slice(0, 220),
    });
  }, []);

  const sendToAgent = useCallback(async (customerText) => {
    const customerMessage = { role: "customer", text: customerText };
    const history = [...messagesRef.current, customerMessage];

    updateMessages(history);
    setAgentStatus("Thinking");

    try {
      const response = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: customerText, history }),
      });

      const data = await response.json();
      const reply = data?.reply || "I can help with Aura Skincare orders and policy questions.";

      updateMessages([...history, { role: "agent", text: reply }]);
      setAgentStatus("Speaking");
      speakAgentReply(reply);

      window.speechSynthesis.onend = () => {
        setAgentStatus("Listening");
        try {
          recognitionRef.current?.start();
        } catch (error) {
          console.warn("Restarting speech recognition failed.", error);
        }
      };
    } catch (error) {
      console.error("Chat request failed:", error);
      const fallback = "I couldn’t reach the support service. Please try again or ask a question about Aura Skincare orders or policy.";
      updateMessages([...history, { role: "agent", text: fallback }]);
      setAgentStatus("Listening");
      speakAgentReply(fallback);
    }
  }, [updateMessages]);

  const handleStartCall = async () => {
    try {
      updateMessages([]);
      messagesRef.current = [];
      setCallSummary(defaultSummary);
      setIsCallActive(true);
      setAgentStatus("Connecting");

      recognitionRef.current = startVoiceSession({
        onStatusChange: setAgentStatus,
        onCustomerText: sendToAgent,
      });
    } catch (error) {
      console.error("Failed to start voice session:", error);
      setIsCallActive(false);
      setAgentStatus("Error");
    }
  };

  const handleEndCall = () => {
    stopVoiceSession(recognitionRef.current);
    recognitionRef.current = null;
    setIsCallActive(false);
    setAgentStatus("Call Ended");
    summarizeCall(messagesRef.current);
  };

  useEffect(() => {
    return () => {
      stopVoiceSession(recognitionRef.current);
    };
  }, []);

  return (
    <div className="app">
      <Header />

      <main className="main-content">
        <AgentPanel
          status={agentStatus}
          onStart={handleStartCall}
          onEnd={handleEndCall}
          isCallActive={isCallActive}
        />

        <div className="content-grid">
          <OrderHelper orders={order} />
          <Transcript messages={messages} summary={callSummary} />
        </div>
      </main>
    </div>
  );
}

export default App;
