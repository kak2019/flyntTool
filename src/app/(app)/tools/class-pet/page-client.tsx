"use client";

import { useEffect, useState } from "react";
import type { ClassPetState, GrowthEvent, PetDef, RuleResult } from "@/lib/class-pet";
import { loadClassPet, saveClassPet } from "@/lib/class-pet-store";
import { btnClass } from "@/lib/styles";
import { CareScreen } from "./care-screen";
import { HomeScreen } from "./home-screen";
import { ParentScreen } from "./parent-screen";
import { ShopScreen } from "./shop-screen";
import { PetPortrait, type PetScreenId } from "./ui";
import { TeacherScreen } from "./teacher-screen";
import { WallScreen } from "./wall-screen";

const TABS: { id: PetScreenId; label: string }[] = [
  { id: "home", label: "首页" },
  { id: "wall", label: "宠物墙" },
  { id: "care", label: "培养" },
  { id: "shop", label: "商店" },
];

export default function ClassPetPage() {
  const [state, setState] = useState<ClassPetState | null>(null);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<PetScreenId>("home");
  const [toast, setToast] = useState<string | null>(null);
  const [reward, setReward] = useState<GrowthEvent | null>(null);
  const [queue, setQueue] = useState<GrowthEvent[]>([]);

  useEffect(() => {
    setState(loadClassPet());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !state) return;
    saveClassPet(state);
  }, [ready, state]);

  function show(result: RuleResult) {
    setState(result.state);
    if (result.message) {
      const message = result.message;
      setToast(message);
      window.setTimeout(() => setToast((current) => (current === message ? null : current)), 2400);
    }
    if (result.events.length) {
      setReward(result.events[0]);
      setQueue(result.events.slice(1));
    }
  }

  function closeReward() {
    setReward(queue[0] ?? null);
    setQueue((items) => items.slice(1));
  }

  if (!state) return <p className="text-sm text-zinc-500">正在打开乐园…</p>;

  return (
    <div className="space-y-4">
      <style>{`@keyframes pet-pop{0%{transform:translateY(0)}40%{transform:translateY(-12px) scale(1.04)}100%{transform:translateY(0)}}.pet-pop{animation:pet-pop .6s ease}`}</style>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-teal-700">班级</p>
          <h1 className="text-2xl font-semibold">班级宠物乐园</h1>
        </div>
        <div className="flex gap-2">
          <button type="button" className={screen === "parent" ? "rounded-full bg-zinc-900 px-4 py-2 text-sm text-white" : btnClass} onClick={() => setScreen("parent")}>家长端</button>
          <button type="button" className={screen === "teacher" ? "rounded-full bg-zinc-900 px-4 py-2 text-sm text-white" : btnClass} onClick={() => setScreen("teacher")}>教师后台</button>
        </div>
      </div>
      <nav className="flex flex-wrap gap-2" aria-label="页面切换">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`rounded-full px-4 py-2 text-sm ${screen === tab.id ? "bg-teal-700 text-white" : "bg-zinc-100 text-zinc-700"}`}
            aria-current={screen === tab.id ? "page" : undefined}
            onClick={() => setScreen(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {screen === "home" ? <HomeScreen state={state} onNavigate={setScreen} /> : null}
      {screen === "wall" ? <WallScreen state={state} onResult={show} onNavigate={setScreen} /> : null}
      {screen === "care" ? <CareScreen state={state} onResult={show} onNavigate={setScreen} /> : null}
      {screen === "shop" ? <ShopScreen state={state} onResult={show} /> : null}
      {screen === "teacher" ? <TeacherScreen state={state} onResult={show} /> : null}
      {screen === "parent" ? <ParentScreen state={state} onResult={show} /> : null}
      {reward ? <Reward event={reward} onClose={closeReward} /> : null}
      {toast ? <p className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</p> : null}
    </div>
  );
}

function Reward({ event, onClose }: { event: GrowthEvent; onClose: () => void }) {
  const pet: PetDef = {
    id: "reward",
    speciesId: event.speciesId,
    stage: event.stage,
    name: event.petName,
    trait: "",
    price: 0,
    color: event.color,
    copy: "",
    skin: event.skin,
    customImage: event.image,
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="reward-title" className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl" onClick={(click) => click.stopPropagation()}>
        <p className="text-xs font-medium text-teal-700">成长能量已经送达</p>
        <p className="mt-3 text-sm font-semibold">LV.{event.level}</p>
        <PetPortrait pet={pet} className="mx-auto h-40 w-40" />
        <h2 id="reward-title" className="text-2xl font-semibold">{event.title}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">{event.message}</p>
        <button type="button" className="mt-5 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white" onClick={onClose}>继续</button>
      </div>
    </div>
  );
}
