import { createDefaultState, normalizeState, type ClassPetState } from "@/lib/class-pet";

export const CLASS_PET_KEY = "flynt-class-pet-v1";

export function loadClassPet(): ClassPetState {
  if (typeof localStorage === "undefined") return createDefaultState();
  try {
    const raw = localStorage.getItem(CLASS_PET_KEY);
    if (!raw) return createDefaultState();
    return normalizeState(JSON.parse(raw)) ?? createDefaultState();
  } catch {
    return createDefaultState();
  }
}

export function saveClassPet(state: ClassPetState) {
  localStorage.setItem(CLASS_PET_KEY, JSON.stringify(state));
}

export function exportClassPet(state: ClassPetState) {
  return JSON.stringify(state, null, 2);
}

export function importClassPet(text: string) {
  try {
    return normalizeState(JSON.parse(text));
  } catch {
    return null;
  }
}
