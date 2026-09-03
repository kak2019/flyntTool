import Link from "next/link";
import { tools } from "@/lib/tools";

export default function HomePage() {
  return (
    <div>
      <p className="text-sm font-medium text-teal-700">tool.flynt.top</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">个人工具箱</h1>
      <p className="mt-2 max-w-xl text-zinc-500">
        给自己用的小工具。要加新的：新建页面，再在清单里登记一行。
      </p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <li key={tool.id}>
            <Link
              href={tool.href}
              className="block h-full rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-600/40 hover:shadow-md"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-teal-700">
                {tool.kicker}
              </p>
              <h2 className="mt-2 text-lg font-semibold">{tool.name}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                {tool.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
