"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  PARENT_AMOUNTS,
  PARENT_REASONS,
  energyProgress,
  facingPet,
  findParentStudent,
  formatInt,
  levelFor,
  parentDailyStatus,
  parentGrant,
  parentTodayLogs,
  petEnergyOf,
  type ClassPetState,
  type RuleResult,
} from "@/lib/class-pet";
import { fieldClass, primaryBtnClass } from "@/lib/styles";
import { Meter, PetFace } from "./ui";

export function ParentScreen({ state, onResult }: { state: ClassPetState; onResult: (result: RuleResult) => void }) {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [reason, setReason] = useState<string>(PARENT_REASONS[0]);
  const [amount, setAmount] = useState(1);
  const [note, setNote] = useState("");
  const student = state.students.find((item) => item.id === studentId) ?? null;

  const daily = student ? parentDailyStatus(student) : null;
  const logs = useMemo(() => (student ? parentTodayLogs(state, student.id) : []), [state, student]);

  function login(event: FormEvent) {
    event.preventDefault();
    const found = findParentStudent(state, name, password);
    if (!found) {
      setError("姓名或密码不正确");
      setStudentId(null);
      return;
    }
    setError("");
    setStudentId(found.id);
  }

  if (!student || !daily) {
    return (
      <section className="mx-auto max-w-xl rounded-3xl border border-zinc-200 bg-white p-6">
        <p className="text-xs font-medium text-teal-700">家庭成长伙伴</p>
        <h2 className="mt-1 text-2xl font-semibold">家长端</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">输入孩子的姓名和家长密码，记录今天在家的闪光表现。每位孩子每天最多 10 分。演示密码是 1234。</p>
        <form className="mt-5 space-y-3" onSubmit={login}>
          <label className="block text-sm">
            孩子姓名
            <input className={`${fieldClass} mt-1`} value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：林小溪" autoComplete="name" required />
          </label>
          <label className="block text-sm">
            家长密码
            <input className={`${fieldClass} mt-1`} value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="请输入密码" autoComplete="current-password" required />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button className={primaryBtnClass} type="submit">
            进入孩子的成长页
          </button>
        </form>
      </section>
    );
  }

  const energy = petEnergyOf(student);
  const pet = facingPet(state, student);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-teal-700">家长端 · 今日成长</p>
          <h2 className="text-2xl font-semibold">{student.name}的闪光时刻</h2>
        </div>
        <button type="button" className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" onClick={() => setStudentId(null)}>
          退出登录
        </button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[16rem_1fr_16rem]">
        <div className="rounded-3xl border border-zinc-200 bg-white p-4">
          <PetFace state={state} studentId={student.id} className="mx-auto h-36 w-36" />
          <p className="text-center text-xs text-teal-700">LV.{levelFor(energy)}</p>
          <h3 className="text-center text-lg font-semibold">{pet.name}</h3>
          <p className="text-center text-sm text-zinc-500">{formatInt(energy)} 成长能量</p>
          <div className="mt-4">
            <Meter label={`今日家庭成长分 ${daily.used} / 10`} value={daily.used * 10} tone="bg-teal-600" />
            <p className="mt-1 text-xs text-zinc-500">{daily.remaining ? `今天还可以加 ${daily.remaining} 分` : "今日 10 分额度已全部用完"}</p>
          </div>
        </div>
        <div className="rounded-3xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium text-teal-700">今天想表扬什么？</p>
          <h3 className="font-semibold">选择一个家庭成长理由</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {PARENT_REASONS.map((item) => (
              <button key={item} type="button" className={`rounded-full px-3 py-1.5 text-sm ${reason === item ? "bg-zinc-900 text-white" : "bg-zinc-100"}`} onClick={() => setReason(item)}>
                {item}
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-zinc-500">选择分值</p>
          <div className="mt-2 flex gap-2">
            {PARENT_AMOUNTS.map((item) => (
              <button key={item} type="button" className={`rounded-xl px-3 py-2 text-sm ${amount === item ? "bg-teal-700 text-white" : "bg-zinc-100"}`} onClick={() => setAmount(item)}>
                +{item}
              </button>
            ))}
          </div>
          <label className="mt-4 block text-sm">
            补充说明
            <input className={`${fieldClass} mt-1`} value={note} maxLength={30} placeholder="可选：记录一句具体表现" onChange={(event) => setNote(event.target.value)} />
          </label>
          <button
            type="button"
            className={`${primaryBtnClass} mt-4`}
            onClick={() => onResult(parentGrant(state, student.id, amount, reason, note))}
          >
            送出成长分 +{amount}
          </button>
          <p className="mt-3 text-xs text-zinc-400">本级进度 {energyProgress(energy)} / 100</p>
        </div>
        <aside className="rounded-3xl border border-zinc-200 bg-white p-4">
          <h3 className="font-semibold">今日记录</h3>
          <ul className="mt-3 space-y-2">
            {logs.length ? logs.map((item) => (
              <li key={item.id} className="rounded-2xl bg-zinc-50 px-3 py-2 text-sm">
                <span className="font-medium text-teal-800">+{item.delta}</span> {item.reason}
                <span className="mt-1 block text-xs text-zinc-400">{item.time}</span>
              </li>
            )) : <li className="text-sm text-zinc-400">今天还没有家庭加分</li>}
          </ul>
        </aside>
      </div>
    </section>
  );
}
