"use client";

import { useState } from "react";
import {
  CARE_ACTIONS,
  care,
  energyProgress,
  facingPet,
  levelFor,
  petById,
  petEnergyOf,
  selectStudent,
  shopAction,
  type CareActionId,
  type ClassPetState,
  type RuleResult,
} from "@/lib/class-pet";
import { Meter, NameBadge, PetPortrait, PetFace, StudentPicker, type PetScreenId } from "./ui";

export function CareScreen({
  state,
  onResult,
  onNavigate,
}: {
  state: ClassPetState;
  onResult: (result: RuleResult) => void;
  onNavigate: (screen: PetScreenId) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pop, setPop] = useState(0);
  const [line, setLine] = useState("按一按，照顾现在的伙伴");
  const student = state.students.find((item) => item.id === state.selectedStudentId) ?? state.students[0];
  const pet = facingPet(state, student);
  const energy = petEnergyOf(student);
  const progress = energyProgress(energy);
  const owned = [...student.ownedPetIds, ...student.ownedSkinIds];

  function act(actionId: CareActionId) {
    const result = care(state, student.id, actionId);
    if (result.ok) {
      setPop((value) => value + 1);
      setLine(result.message);
    }
    onResult(result);
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[16rem_1fr_16rem]">
      <div className="rounded-3xl border border-zinc-200 bg-white p-4">
        <p className="text-xs font-medium text-teal-700">正在查看</p>
        <button type="button" className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-zinc-200 px-3 py-2 text-left" onClick={() => setOpen(true)}>
          <NameBadge name={student.name} />
          <span>
            <span className="block text-xs text-zinc-500">选择同学</span>
            <span className="font-semibold">{student.name}</span>
          </span>
        </button>
        <h2 className="mt-4 text-2xl font-semibold">{pet.name}</h2>
        <p className="text-sm text-zinc-500">{student.name}的伙伴 · {pet.trait}</p>
        <div className="mt-4">
          <div className="flex items-end justify-between">
            <span className="text-lg font-semibold">LV.{levelFor(energy)}</span>
            <span className="text-sm text-zinc-500">{progress} / 100</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full rounded-full bg-teal-600" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-xs text-zinc-400">累计 {energy}</p>
        </div>
        <div className="mt-4 space-y-3">
          <Meter label="饱食" value={student.hunger} tone="bg-amber-400" />
          <Meter label="清洁" value={student.clean} tone="bg-sky-400" />
          <Meter label="心情" value={student.mood} tone="bg-rose-400" />
        </div>
        <button type="button" className="mt-4 text-sm text-teal-800" onClick={() => onNavigate("wall")}>
          返回班级宠物墙
        </button>
      </div>

      <div className="flex flex-col items-center justify-center rounded-3xl border border-zinc-200 bg-gradient-to-b from-amber-50 to-white p-4">
        <p className="mb-2 rounded-full bg-white px-3 py-1 text-sm text-zinc-600 shadow-sm">{line}</p>
        <div key={pop} className={pop ? "pet-pop" : undefined}>
          <PetFace state={state} studentId={student.id} className="h-56 w-56" />
        </div>
        <div className="mt-4 grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(CARE_ACTIONS) as CareActionId[]).map((actionId) => {
            const action = CARE_ACTIONS[actionId];
            return (
              <button key={actionId} type="button" className="rounded-2xl border border-zinc-200 bg-white px-2 py-3 text-sm hover:border-teal-600" onClick={() => act(actionId)}>
                <span className="block font-medium">{action.label}</span>
                <span className="text-xs text-zinc-500">{action.cost} 星币</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold">已经拥有 {owned.length} 只</h3>
          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">{student.coins} 星币</span>
        </div>
        <ul className="mt-3 space-y-2">
          {owned.map((petId) => {
            const item = petById(state, petId);
            if (!item) return null;
            return (
              <li key={petId}>
                <button type="button" className="flex w-full items-center gap-2 rounded-2xl border border-zinc-200 px-2 py-1.5 text-left hover:border-teal-600" onClick={() => onResult(shopAction(state, student.id, petId))}>
                  <PetPortrait pet={item} className="h-12 w-12" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{item.name}</span>
                    <span className="block text-xs text-zinc-500">{item.trait}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" className="mt-4 w-full rounded-2xl bg-teal-700 px-4 py-2 text-sm font-medium text-white" onClick={() => onNavigate("shop")}>
          去宠物商店
        </button>
      </div>
      {open ? (
        <StudentPicker
          state={state}
          onClose={() => setOpen(false)}
          onPick={(studentId) => {
            onResult(selectStudent(state, studentId));
            setOpen(false);
            setLine("换一位同学，也换一只伙伴");
          }}
        />
      ) : null}
    </section>
  );
}
