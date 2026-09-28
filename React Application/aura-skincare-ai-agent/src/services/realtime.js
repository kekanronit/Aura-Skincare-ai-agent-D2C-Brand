export function speakAgentReply(text) {
  if (!text) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-IN";
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;

  window.speechSynthesis.speak(utterance);
}

export function startVoiceSession({ onStatusChange, onCustomerText }) {
  const SpeechRecognitionCtor =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognitionCtor) {
    throw new Error("Speech recognition is not supported in this browser.");
  }

  const recognition = new SpeechRecognitionCtor();
  recognition.lang = "en-IN";
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onstart = () => {
    onStatusChange?.("Listening");
  };

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0]?.transcript ?? "")
      .join(" ")
      .trim();

    if (transcript) {
      onCustomerText?.(transcript);
    }
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    onStatusChange?.("Listening");
  };

  recognition.onend = () => {
    onStatusChange?.("Listening");
  };

  recognition.start();

  return recognition;
}

export function stopVoiceSession(recognition) {
  if (recognition) {
    try {
      recognition.stop();
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      console.warn("Speech recognition already stopped.");
    }
  }

  window.speechSynthesis.cancel();
}
