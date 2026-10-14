"use client";

import { useState } from "react";
import { allPets, selectStudent, shopAction, shopPets, shopStatus, type ClassPetState, type RuleResult } from "@/lib/class-pet";
import { NameBadge, PetPortrait, StudentPicker } from "./ui";

export function ShopScreen({ state, onResult }: { state: ClassPetState; onResult: (result: RuleResult) => void }) {
  const [open, setOpen] = useState(false);
  const student = state.students.find((item) => item.id === state.selectedStudentId) ?? state.students[0];
  const catalog = allPets(state);

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-teal-700">购买宠物蛋、幼体伙伴与成年宠物皮肤</p>
          <h2 className="text-2xl font-semibold">宠物商店</h2>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2" onClick={() => setOpen(true)}>
            <NameBadge name={student.name} />
            <span className="text-left">
              <span className="block text-xs text-zinc-500">正在为谁挑选</span>
              <span className="font-semibold">{student.name}</span>
            </span>
          </button>
          <strong className="rounded-full bg-amber-100 px-3 py-2 text-sm text-amber-950">{student.coins} 星币</strong>
        </div>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shopPets(state).map((pet) => {
          const status = shopStatus(student, pet, catalog);
          return (
            <li key={pet.id} className="flex flex-col rounded-3xl border border-zinc-200 p-4" style={{ backgroundImage: `linear-gradient(180deg, ${pet.color}22, white 55%)` }}>
              <PetPortrait pet={pet} className="mx-auto h-32 w-32" />
              <h3 className="mt-2 font-semibold">{pet.name}</h3>
              <p className="text-xs text-teal-800">{pet.trait}</p>
              <p className="mt-1 flex-1 text-sm leading-6 text-zinc-500">{pet.copy}</p>
              <button
                type="button"
                className="mt-3 rounded-2xl bg-zinc-900 px-3 py-2 text-sm text-white disabled:bg-zinc-200 disabled:text-zinc-500"
                disabled={status.mode === "current"}
                onClick={() => onResult(shopAction(state, student.id, pet.id))}
              >
                {status.label}
              </button>
            </li>
          );
        })}
      </ul>
      {open ? (
        <StudentPicker
          state={state}
          onClose={() => setOpen(false)}
          onPick={(studentId) => {
            onResult(selectStudent(state, studentId));
            setOpen(false);
          }}
        />
      ) : null}
    </section>
  );
}
