const CHUNK = 480;

function chunkText(text: string) {
  const pieces = text.split(/(?<=[。！？.!?；;:\n])/);
  const chunks: string[] = [];
  let buf = "";
  for (const piece of pieces) {
    if (!piece) continue;
    if (buf.length + piece.length > CHUNK && buf.trim()) {
      chunks.push(buf);
      buf = piece;
    } else {
      buf += piece;
    }
  }
  if (buf.trim()) chunks.push(buf);
  if (!chunks.length) return [text];
  return chunks.flatMap((chunk) => {
    if (chunk.length <= CHUNK) return [chunk];
    const parts: string[] = [];
    for (let i = 0; i < chunk.length; i += CHUNK) {
      parts.push(chunk.slice(i, i + CHUNK));
    }
    return parts;
  });
}

/** Start Qwen TTS playback. Returns a stop function. */
export function speakText(
  text: string,
  langId: string,
  onDone: () => void,
  onError: (message: string) => void,
) {
  const audio = new Audio();
  const ac = new AbortController();
  let objectUrl = "";
  let stopped = false;

  const revoke = () => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = "";
    }
  };

  const cleanup = () => {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    revoke();
  };

  const run = async () => {
    try {
      for (const chunk of chunkText(text.trim())) {
        if (stopped) return;
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: chunk, language: langId }),
          signal: ac.signal,
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || `朗读失败（${res.status}）`);
        }
        const blob = await res.blob();
        if (stopped) return;
        revoke();
        objectUrl = URL.createObjectURL(blob);
        audio.src = objectUrl;
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error("音频播放失败"));
          void audio.play().catch(reject);
        });
      }
      if (!stopped) onDone();
    } catch (err) {
      if (stopped || (err instanceof DOMException && err.name === "AbortError")) return;
      onError(err instanceof Error ? err.message : "朗读失败");
      onDone();
    } finally {
      cleanup();
    }
  };

  void run();

  return () => {
    stopped = true;
    ac.abort();
    cleanup();
  };
}
