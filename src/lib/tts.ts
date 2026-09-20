import { KokoroTTS } from "kokoro-js";

let ttsInstance: KokoroTTS | null = null;

/**
 * Loads Kokoro once and reuses it for future speech generation.
 *
 * The first call downloads the model into the browser cache.
 * Subsequent calls reuse the loaded model.
 */
export async function getTTS(): Promise<KokoroTTS> {
  if (ttsInstance) {
    return ttsInstance;
  }

  console.log("Loading Kokoro TTS...");

  ttsInstance = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
    dtype: "q8",
    device: "wasm",
  });

  console.log("Kokoro TTS loaded.");

  return ttsInstance;
}

/**
 * Converts text into speech.
 */
export async function generateSpeech(text: string) {
  if (!text.trim()) {
    throw new Error("Cannot generate speech from empty text.");
  }

  const tts = await getTTS();

  const audio = await tts.generate(text, {
    voice: "af_heart",
  });

  return audio;
}
