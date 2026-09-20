let currentUtterance: SpeechSynthesisUtterance | null = null;

type SpeechCallbacks = {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
};

function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();

    // Already loaded
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    // Wait for Chrome to load them
    const handleVoicesChanged = () => {
      const loadedVoices = window.speechSynthesis.getVoices();

      if (loadedVoices.length > 0) {
        window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);

        resolve(loadedVoices);
      }
    };

    window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);

    // Don't wait forever.
    // Some browsers can speak with their default voice
    // even if getVoices() remains empty.
    setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);

      resolve(window.speechSynthesis.getVoices());
    }, 1500);
  });
}

function chooseVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) {
    return null;
  }

  // Prefer a US English voice.
  const usEnglish = voices.find((voice) => voice.lang.toLowerCase() === "en-us");

  if (usEnglish) {
    return usEnglish;
  }

  // Otherwise use any English voice.
  const english = voices.find((voice) => voice.lang.toLowerCase().startsWith("en"));

  if (english) {
    return english;
  }

  // Otherwise let the first available voice work.
  return voices[0] ?? null;
}

export async function playSpeech(text: string, callbacks: SpeechCallbacks = {}) {
  if (!text.trim()) {
    console.error("No text provided to speech synthesis.");
    callbacks.onError?.();
    return;
  }

  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    console.error("Speech synthesis is not supported.");

    callbacks.onError?.();
    return;
  }

  // Stop anything that may already be speaking.
  window.speechSynthesis.cancel();

  console.log("Waiting for browser voices...");

  const voices = await waitForVoices();

  console.log(
    "Available voices:",
    voices.map((voice) => ({
      name: voice.name,
      lang: voice.lang,
    })),
  );

  const utterance = new SpeechSynthesisUtterance(text);

  currentUtterance = utterance;

  utterance.lang = "en-US";
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;

  const voice = chooseVoice(voices);

  if (voice) {
    utterance.voice = voice;

    console.log("Using voice:", voice.name, voice.lang);
  } else {
    // This is okay.
    // Some browsers can still use their default voice.
    console.log("No explicit voice available. Trying browser default.");
  }

  utterance.onstart = () => {
    console.log("Speech started.");

    callbacks.onStart?.();
  };

  utterance.onend = () => {
    console.log("Speech finished.");

    currentUtterance = null;

    callbacks.onEnd?.();
  };

  utterance.onerror = (event) => {
    console.error("Speech synthesis failed:", event.error, event);

    currentUtterance = null;

    callbacks.onError?.();
  };

  window.speechSynthesis.speak(utterance);
}

export function pauseSpeech() {
  if (typeof window !== "undefined" && window.speechSynthesis.speaking) {
    window.speechSynthesis.pause();
  }
}

export function resumeSpeech() {
  if (typeof window !== "undefined" && window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }
}

export function stopSpeech() {
  if (typeof window !== "undefined") {
    window.speechSynthesis.cancel();
  }

  currentUtterance = null;
}
