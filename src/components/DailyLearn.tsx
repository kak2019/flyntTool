"use client";

import { useState } from "react";
import { getDailyLearn, shuffleLearn } from "@/lib/daily-learn";

export function DailyLearn() {
  const [{ poem, sentence }, setLearn] = useState(() => getDailyLearn());

  return (
    <footer className="border-t border-zinc-200">
      <div className="mx-auto flex max-w-6xl items-start gap-4 px-4 py-3 text-sm leading-6">
        <div className="min-w-0 flex-1 space-y-1">
          <p>
            <span className="text-zinc-400">诗</span>
            <span className="ml-2 text-zinc-700">{poem.line}</span>
            <span className="ml-2 text-zinc-400">— {poem.author}</span>
          </p>
          <p>
            <span className="text-zinc-700">{sentence.en}</span>
            <span className="ml-2 text-zinc-400">— {sentence.from}</span>
            <span className="ml-2 text-zinc-400">{sentence.zh}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setLearn((current) => ({ ...current, ...shuffleLearn(current) }))}
          className="shrink-0 text-sm text-teal-700 hover:text-teal-800"
        >
          换一条
        </button>
      </div>
    </footer>
  );
}
