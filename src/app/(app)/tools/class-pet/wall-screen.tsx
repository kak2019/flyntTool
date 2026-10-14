"use client";

import { useState } from "react";
import { classEnergyTotal, classGoalPercent, energyProgress, facingPet, formatInt, levelFor, needsCare, petEnergyOf, selectStudent, type ClassPetState, type RuleResult } from "@/lib/class-pet";
import type { PetScreenId } from "./ui";
import { PetFace } from "./ui";

const GROUP = 9;

export function WallScreen({
  state,
  onResult,
  onNavigate,
}: {
  state: ClassPetState;
  onResult: (result: RuleResult) => void;
  onNavigate: (screen: PetScreenId) => void;
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(state.students.length / GROUP));
  const safePage = page % pages;
  const group = state.students.slice(safePage * GROUP, safePage * GROUP + GROUP);
  const goal = classGoalPercent(state);

  return (
    <section className="rounded-3xl border border-zinc-200 bg-gradient-to-b from-teal-50/80 to-white p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-teal-700">{state.className} · 前台乐园</p>
          <h2 className="text-2xl font-semibold">全班宠物大合照</h2>
        </div>
        <div className="min-w-56 flex-1">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">班级总能量 {formatInt(classEnergyTotal(state))}</span>
            <span>共同目标 {goal}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-teal-600" style={{ width: `${goal}%` }} />
          </div>
        </div>
      </div>
      <ul className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
        {group.map((student) => {
          const pet = facingPet(state, student);
          const energy = petEnergyOf(student);
          return (
            <li key={student.id}>
              <button
                type="button"
                className="flex h-full w-full flex-col rounded-3xl border border-white bg-white/90 p-3 text-left shadow-sm hover:border-teal-600"
                onClick={() => {
                  onResult(selectStudent(state, student.id));
                  onNavigate("care");
                }}
              >
                <PetFace state={state} studentId={student.id} className="mx-auto h-28 w-28" />
                <span className="mt-1 font-medium">{student.name}</span>
                <span className="text-sm text-zinc-600">
                  {pet.name} · LV.{levelFor(energy)}
                </span>
                <span className="text-xs text-zinc-500">
                  {formatInt(energy)} 成长能量 · {needsCare(student) ? "需要照顾" : "活力满满"}
                </span>
                <span className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                  <span className="block h-full bg-amber-400" style={{ width: `${energyProgress(energy)}%` }} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex justify-end">
        <button type="button" className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm disabled:opacity-40" disabled={pages < 2} onClick={() => setPage((value) => (value + 1) % pages)}>
          下一组 {safePage + 1}/{pages}
        </button>
      </div>
    </section>
  );
}
