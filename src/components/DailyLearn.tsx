import { getDailyLearn } from "@/lib/daily-learn";

export function DailyLearn() {
  const { poem, sentence } = getDailyLearn();

  return (
    <footer className="border-t border-zinc-200">
      <div className="mx-auto max-w-6xl space-y-1 px-4 py-3 text-sm leading-6">
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
    </footer>
  );
}
