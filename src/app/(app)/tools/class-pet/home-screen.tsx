"use client";

import { classEnergyTotal, classGoalPercent, formatInt, type ClassPetState } from "@/lib/class-pet";
import type { PetScreenId } from "./ui";
import { PetFace } from "./ui";

const SPOTS = ["student-1", "student-2", "student-5", "student-7", "student-8"];

export function HomeScreen({ state, onNavigate }: { state: ClassPetState; onNavigate: (screen: PetScreenId) => void }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-teal-50">
      <div className="relative min-h-[420px]">
        {SPOTS.map((id, index) => (
          <div
            key={id}
            className="absolute hidden w-24 sm:block"
            style={{
              left: `${6 + (index % 3) * 38}%`,
              top: index < 3 ? "8%" : "62%",
              width: index === 2 ? "7.5rem" : "6rem",
            }}
          >
            <PetFace state={state} studentId={id} />
          </div>
        ))}
        <div className="relative z-10 mx-auto flex min-h-[420px] max-w-md flex-col items-center justify-center px-6 text-center">
          <p className="text-sm font-medium text-teal-800">{state.className} · 前台乐园</p>
          <h2 className="mt-2 text-4xl font-semibold tracking-tight">一起进化吧</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600">能量让宠物孵化、升级、进化。星币用来照顾和去商店挑新伙伴。</p>
          <button type="button" className="mt-6 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-amber-300" onClick={() => onNavigate("shop")}>
            选择你的宠物
          </button>
          <dl className="mt-8 grid w-full grid-cols-2 gap-3 text-left">
            <div className="rounded-2xl bg-white/80 px-4 py-3">
              <dt className="text-xs text-zinc-500">班级总能量</dt>
              <dd className="text-xl font-semibold">{formatInt(classEnergyTotal(state))}</dd>
            </div>
            <div className="rounded-2xl bg-white/80 px-4 py-3">
              <dt className="text-xs text-zinc-500">共同目标</dt>
              <dd className="text-xl font-semibold">{classGoalPercent(state)}%</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
