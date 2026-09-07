import { getDailyLearn } from "@/lib/daily-learn";

export function DailyLearn() {
  const { poem, sentence } = getDailyLearn();

  return (
    <footer className="border-t border-zinc-200">
      <p className="mx-auto flex max-w-6xl gap-6 overflow-x-auto whitespace-nowrap px-4 py-3 text-sm text-zinc-500">
        <span>
          <span className="text-zinc-400">诗</span>
          <span className="ml-2 text-zinc-700">{poem.line}</span>
          <span className="ml-2 text-zinc-400">— {poem.author}</span>
        </span>
        <span className="text-zinc-300">/</span>
        <span>
          <span className="text-zinc-700">{sentence.en}</span>
          <span className="ml-2 text-zinc-400">— {sentence.from}</span>
          <span className="ml-2 text-zinc-400">{sentence.zh}</span>
        </span>
      </p>
    </footer>
  );
}
