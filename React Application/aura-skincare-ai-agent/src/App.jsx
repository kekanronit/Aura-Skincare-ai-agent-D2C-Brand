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
  const isCallActiveRef = useRef(false);
  const playbackIdRef = useRef(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [agentStatus, setAgentStatus] = useState("Ready");
  const [messages, setMessages] = useState([]);
  const [callSummary, setCallSummary] = useState(defaultSummary);
  const [conversationLanguage, setConversationLanguage] = useState("english");

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

  const speakReply = useCallback((reply, language) => {
    if (!isCallActiveRef.current) return;

    const playbackId = ++playbackIdRef.current;
    const finishSpeaking = () => {
      if (playbackIdRef.current !== playbackId || !isCallActiveRef.current) return;
      recognitionRef.current?.setSpeaking(false);
      setAgentStatus("Listening");
    };

    setAgentStatus("Speaking");
    speakAgentReply(reply, {
      language,
      onStart: () => {
        if (playbackIdRef.current === playbackId && isCallActiveRef.current) {
          recognitionRef.current?.setSpeaking(true);
        }
      },
      onFinish: finishSpeaking,
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
        body: JSON.stringify({
          message: customerText,
          history,
          language: conversationLanguage,
        }),
      });

      const data = await response.json();
      const reply = data?.reply || (
        conversationLanguage === "hinglish"
          ? "मैं Aura Skincare के orders और policies में आपकी help कर सकती हूँ।"
          : "I can help with Aura Skincare orders and policy questions."
      );

      if (!isCallActiveRef.current) return;
      updateMessages([...history, { role: "agent", text: reply }]);
      speakReply(reply, conversationLanguage);
    } catch (error) {
      console.error("Chat request failed:", error);
      if (!isCallActiveRef.current) return;
      const fallback = conversationLanguage === "hinglish"
        ? "Support service से connect नहीं हो पाया। Please दोबारा try करें, या Aura Skincare के orders और policies के बारे में पूछें।"
        : "I couldn’t reach the support service. Please try again or ask a question about Aura Skincare orders or policy.";
      updateMessages([...history, { role: "agent", text: fallback }]);
      speakReply(fallback, conversationLanguage);
    }
  }, [conversationLanguage, speakReply, updateMessages]);

  const handleToolAction = useCallback(async (toolName) => {
    setAgentStatus("Using tool");

    try {
      const response = await fetch("http://localhost:3001/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolName,
          language: conversationLanguage,
          payload: { orderId: "ORD-101" },
        }),
      });

      const data = await response.json();
      const reply = data?.reply || "I’m ready to help with order and policy questions.";
      const nextMessages = [...messagesRef.current, { role: "agent", text: reply }];
      updateMessages(nextMessages);
      speakReply(reply, conversationLanguage);
      setAgentStatus("Ready");
    } catch (error) {
      console.error("Tool lookup failed:", error);
      const fallback = conversationLanguage === "hinglish"
        ? "Tool lookup fail हो गई। कृपया फिर से कोशिश करें।"
        : "The tool lookup failed. Please try again.";
      updateMessages([...messagesRef.current, { role: "agent", text: fallback }]);
      speakReply(fallback, conversationLanguage);
      setAgentStatus("Ready");
    }
  }, [conversationLanguage, speakReply, updateMessages]);

  const handleStartCall = async () => {
    try {
      updateMessages([]);
      messagesRef.current = [];
      setCallSummary(defaultSummary);
      isCallActiveRef.current = true;
      setIsCallActive(true);
      setAgentStatus("Connecting");

      const voiceSession = await startVoiceSession({
        language: conversationLanguage,
        onStatusChange: setAgentStatus,
        onCustomerText: sendToAgent,
        onInterrupt: () => {
          playbackIdRef.current += 1;
          window.speechSynthesis.cancel();
          setAgentStatus("Listening");
        },
      });

      if (isCallActiveRef.current) {
        recognitionRef.current = voiceSession;
      } else {
        stopVoiceSession(voiceSession);
      }
    } catch (error) {
      console.error("Failed to start voice session:", error);
      isCallActiveRef.current = false;
      setIsCallActive(false);
      setAgentStatus("Error");
    }
  };

  const handleEndCall = () => {
    isCallActiveRef.current = false;
    playbackIdRef.current += 1;
    stopVoiceSession(recognitionRef.current);
    recognitionRef.current = null;
    setIsCallActive(false);
    setAgentStatus("Call Ended");
    summarizeCall(messagesRef.current);
  };

  useEffect(() => {
    return () => {
      isCallActiveRef.current = false;
      playbackIdRef.current += 1;
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
          language={conversationLanguage}
          onLanguageChange={setConversationLanguage}
          onToolAction={handleToolAction}
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
