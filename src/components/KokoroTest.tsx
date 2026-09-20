import { useState } from "react";
import { generateSpeech } from "@/lib/tts";

export function KokoroTest() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function testVoice() {
    try {
      setLoading(true);
      setStatus("Loading AI voice...");

      const audio = await generateSpeech(
        "Welcome to medMatch. Your clinical briefing is ready. Several important patient updates may require your attention today.",
      );

      console.log("Kokoro audio result:", audio);

      setStatus("Voice generated successfully.");

      // Kokoro's RawAudio object provides playback.
      const blob = audio.toBlob();
      const url = URL.createObjectURL(blob);

      const player = new Audio(url);

      player.onended = () => {
        URL.revokeObjectURL(url);
      };

      await player.play();
    } catch (error) {
      console.error("Kokoro TTS error:", error);

      setStatus(error instanceof Error ? error.message : "Voice generation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={testVoice}
        disabled={loading}
        className="rounded-lg border px-4 py-2 disabled:opacity-50"
      >
        {loading ? "Loading voice..." : "Test AI Voice"}
      </button>

      {status && <p className="text-sm text-muted-foreground">{status}</p>}
    </div>
  );
}
