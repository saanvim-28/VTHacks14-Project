let currentAudio: HTMLAudioElement | null = null;
let currentAudioUrl: string | null = null;

export function playAudioBlob(blob: Blob) {
  stopSpeech();

  const url = URL.createObjectURL(blob);

  const audio = new Audio(url);

  currentAudio = audio;
  currentAudioUrl = url;

  audio.onended = () => {
    cleanupAudio();
  };

  audio.onerror = () => {
    cleanupAudio();
  };

  void audio.play();

  return audio;
}

export function pauseSpeech() {
  currentAudio?.pause();
}

export function resumeSpeech() {
  if (currentAudio) {
    void currentAudio.play();
  }
}

export function stopSpeech() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }

  cleanupAudio();
}

function cleanupAudio() {
  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
  }

  currentAudio = null;
  currentAudioUrl = null;
}
