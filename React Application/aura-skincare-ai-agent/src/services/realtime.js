export function speakAgentReply(text, { language = "english", onStart, onFinish } = {}) {
  if (!text) return null;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language === "hinglish" ? "hi-IN" : "en-IN";
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;
  utterance.onstart = onStart;
  utterance.onend = onFinish;
  utterance.onerror = onFinish;

  window.speechSynthesis.speak(utterance);
  return utterance;
}

export async function startVoiceSession({
  language = "english",
  onStatusChange,
  onCustomerText,
  onInterrupt,
}) {
  const SpeechRecognitionCtor =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognitionCtor) {
    throw new Error("Speech recognition is not supported in this browser.");
  }

  if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
    throw new Error("Automatic voice interruption is not supported in this browser.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  let audioContext;
  let microphoneSource;

  try {
    audioContext = new AudioContext();
    await audioContext.resume();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    microphoneSource = audioContext.createMediaStreamSource(stream);
    microphoneSource.connect(analyser);

    return createVoiceSession({
      SpeechRecognitionCtor,
      language,
      onStatusChange,
      onCustomerText,
      onInterrupt,
      stream,
      audioContext,
      microphoneSource,
      analyser,
    });
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    if (audioContext && audioContext.state !== "closed") {
      await audioContext.close();
    }
    throw error;
  }
}

function createVoiceSession({
  SpeechRecognitionCtor,
  language,
  onStatusChange,
  onCustomerText,
  onInterrupt,
  stream,
  audioContext,
  microphoneSource,
  analyser,
}) {
  const recognition = new SpeechRecognitionCtor();
  recognition.lang = language === "hinglish" ? "hi-IN" : "en-IN";
  recognition.interimResults = false;
  recognition.continuous = false;

  let active = true;
  let speaking = false;
  let recognitionActive = false;
  let voiceStartedAt = null;
  let animationFrameId;
  const audioSamples = new Float32Array(analyser.fftSize);

  const startListening = () => {
    if (!active || speaking || recognitionActive) return;

    try {
      recognition.start();
    } catch (error) {
      if (error.name !== "InvalidStateError") {
        console.error("Starting speech recognition failed:", error);
      }
    }
  };

  recognition.onstart = () => {
    recognitionActive = true;
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
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      onStatusChange?.("Error");
    }
  };

  recognition.onend = () => {
    recognitionActive = false;
  };

  const detectInterruption = () => {
    if (!active) return;

    if (speaking) {
      analyser.getFloatTimeDomainData(audioSamples);
      let sumSquares = 0;
      for (const sample of audioSamples) {
        sumSquares += sample * sample;
      }

      const volume = Math.sqrt(sumSquares / audioSamples.length);
      if (volume > 0.025) {
        voiceStartedAt ??= performance.now();
        if (performance.now() - voiceStartedAt >= 180) {
          speaking = false;
          voiceStartedAt = null;
          onInterrupt?.();
          startListening();
        }
      } else {
        voiceStartedAt = null;
      }
    }

    animationFrameId = requestAnimationFrame(detectInterruption);
  };

  animationFrameId = requestAnimationFrame(detectInterruption);
  startListening();

  return {
    setSpeaking(nextSpeaking) {
      if (!active || speaking === nextSpeaking) return;
      speaking = nextSpeaking;
      voiceStartedAt = null;

      if (speaking && recognitionActive) {
        recognition.stop();
      } else if (!speaking) {
        startListening();
      }
    },
    stop() {
      if (!active) return;
      active = false;
      cancelAnimationFrame(animationFrameId);
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;

      if (recognitionActive) {
        recognition.stop();
      }
      microphoneSource.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      audioContext.close().catch((error) => {
        console.error("Closing the audio context failed:", error);
      });
    },
  };
}

export function stopVoiceSession(session) {
  session?.stop();
  window.speechSynthesis.cancel();
}
