"use client";

import { useEffect, type ReactNode } from "react";
import { facingPet, type ClassPetState, type PetDef } from "@/lib/class-pet";
import { PetArt } from "./pet-art";

export type PetScreenId = "home" | "wall" | "care" | "shop" | "teacher" | "parent";

export function Modal({
  title,
  eyebrow,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 p-3 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[88vh] w-full overflow-auto rounded-3xl bg-white p-5 shadow-xl ${wide ? "max-w-4xl" : "max-w-lg"}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {eyebrow ? <p className="text-xs font-medium text-teal-700">{eyebrow}</p> : null}
            <h2 className="text-xl font-semibold">{title}</h2>
          </div>
          <button type="button" className="rounded-full px-2 text-2xl leading-none text-zinc-400 hover:text-zinc-700" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function NameBadge({ name }: { name: string }) {
  const hue = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  return (
    <span
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
      style={{ backgroundColor: `hsl(${hue} 42% 42%)` }}
    >
      {name.trim().slice(0, 1) || "生"}
    </span>
  );
}

export function Meter({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-zinc-500">
        <span>{label}</span>
        <span>{Math.round(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

export function StudentPicker({
  state,
  onPick,
  onClose,
}: {
  state: ClassPetState;
  onPick: (studentId: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal title="选择同学" eyebrow={state.className} onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {state.students.map((student) => {
          const pet = facingPet(state, student);
          const current = student.id === state.selectedStudentId;
          return (
            <button
              key={student.id}
              type="button"
              className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-left ${current ? "border-teal-700 bg-teal-50" : "border-zinc-200 hover:border-teal-600"}`}
              onClick={() => onPick(student.id)}
            >
              <NameBadge name={student.name} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{student.name}</span>
                <span className="block truncate text-xs text-zinc-500">{pet.name}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

export function PetPortrait({ pet, className }: { pet: PetDef; className?: string }) {
  return (
    <PetArt
      speciesId={pet.speciesId}
      stage={pet.stage === "skin" ? "adult" : pet.stage}
      skin={pet.skin}
      image={pet.customImage}
      color={pet.color}
      label={pet.name}
      className={className}
    />
  );
}

export function PetFace({
  state,
  studentId,
  className,
}: {
  state: ClassPetState;
  studentId: string;
  className?: string;
}) {
  const student = state.students.find((item) => item.id === studentId) ?? state.students[0];
  return <PetPortrait pet={facingPet(state, student)} className={className} />;
}
