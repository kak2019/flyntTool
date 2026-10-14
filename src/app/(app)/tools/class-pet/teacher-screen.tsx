"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  COLOR_SWATCHES,
  TEACHER_AMOUNTS,
  TEACHER_REASONS,
  addCustomPet,
  allPets,
  applyEnergy,
  applyRoster,
  classEnergyTotal,
  createDefaultState,
  facingPet,
  formatInt,
  growthPets,
  levelFor,
  petEnergyOf,
  removeCustomPet,
  renameClass,
  todayEnergySummary,
  undoEnergy,
  type ClassPetState,
  type RosterDraft,
  type RuleResult,
} from "@/lib/class-pet";
import { exportClassPet, importClassPet } from "@/lib/class-pet-store";
import { btnClass, fieldClass, primaryBtnClass } from "@/lib/styles";
import { Modal, NameBadge, PetPortrait } from "./ui";

export function TeacherScreen({ state, onResult }: { state: ClassPetState; onResult: (result: RuleResult) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [classDraft, setClassDraft] = useState(state.className);
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"add" | "subtract">("add");
  const [amount, setAmount] = useState(5);
  const [reason, setReason] = useState<string>(TEACHER_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [rosterOpen, setRosterOpen] = useState(false);
  const [drafts, setDrafts] = useState<RosterDraft[]>([]);
  const [petsOpen, setPetsOpen] = useState(false);
  const today = todayEnergySummary(state);
  const visible = state.students.filter((student) => student.name.includes(query.trim()));
  const visibleIds = visible.map((student) => student.id);
  const allVisiblePicked = visibleIds.length > 0 && visibleIds.every((id) => picked.includes(id));

  useEffect(() => {
    setClassDraft(state.className);
  }, [state.className]);

  useEffect(() => {
    setPicked((ids) => ids.filter((id) => state.students.some((student) => student.id === id)));
  }, [state.students]);

  function toggleVisible() {
    setPicked((ids) => {
      const next = new Set(ids);
      if (allVisiblePicked) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return [...next];
    });
  }

  function openRoster() {
    setDrafts(
      state.students.map((student) => ({
        id: student.id,
        name: student.name,
        petId: student.petId,
        energy: petEnergyOf(student),
        parentPassword: student.parentPassword,
      })),
    );
    setRosterOpen(true);
  }

  function saveRoster() {
    const result = applyRoster(state, drafts);
    onResult(result);
    if (result.ok) setRosterOpen(false);
  }

  function download() {
    const blob = new Blob([exportClassPet(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${state.className || "班级宠物乐园"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function onImport(file: File) {
    const next = importClassPet(await file.text());
    onResult(next ? { state: next, events: [], message: "已导入班级数据", ok: true } : { state, events: [], message: "这份数据无法读取", ok: false });
  }

  function clearData() {
    if (!window.confirm("清空后会恢复示例班级，当前记录无法找回。确定清空？")) return;
    onResult({ state: createDefaultState(), events: [], message: "已恢复示例班级", ok: true });
    setPicked([]);
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-teal-700">教师后台 · {state.className}</p>
          <h2 className="text-2xl font-semibold">成长控制台</h2>
          <label className="mt-2 block text-xs text-zinc-500">
            班级名称
            <input
              className={`${fieldClass} mt-1 max-w-xs`}
              value={classDraft}
              maxLength={20}
              onChange={(event) => setClassDraft(event.target.value)}
              onBlur={() => {
                if (classDraft.trim() !== state.className) onResult(renameClass(state, classDraft));
              }}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnClass} onClick={() => setPetsOpen(true)}>宠物管理</button>
          <button type="button" className={btnClass} onClick={openRoster}>编辑学生与宠物</button>
          <button type="button" className={btnClass} onClick={download}>导出数据</button>
          <button type="button" className={btnClass} onClick={() => fileRef.current?.click()}>导入数据</button>
          <button type="button" className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-700" onClick={clearData}>清空当前数据</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void onImport(file);
            }}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="班级人数" value={String(state.students.length)} note="学生名单" />
        <Metric label="当前已选择" value={String(picked.length)} note="可批量操作" />
        <Metric label="今日能量变化" value={`${today.delta > 0 ? "+" : ""}${today.delta}`} note={`共 ${today.count} 次记录`} />
        <Metric label="班级总能量" value={formatInt(classEnergyTotal(state))} note="实时更新" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr_0.8fr]">
        <section className="rounded-3xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">学生与当前宠物</h3>
            <input className={`${fieldClass} max-w-40`} value={query} placeholder="搜索学生" onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" className={btnClass} onClick={toggleVisible}>{allVisiblePicked ? "取消全选" : "选择全班"}</button>
            <button type="button" className={btnClass} onClick={() => setPicked([])}>清空选择</button>
          </div>
          <ul className="mt-3 max-h-[28rem] space-y-2 overflow-auto">
            {visible.map((student) => {
              const pet = facingPet(state, student);
              const energy = petEnergyOf(student);
              const on = picked.includes(student.id);
              return (
                <li key={student.id}>
                  <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2 ${on ? "border-teal-700 bg-teal-50" : "border-zinc-200"}`}>
                    <input type="checkbox" checked={on} onChange={() => setPicked((ids) => (ids.includes(student.id) ? ids.filter((id) => id !== student.id) : [...ids, student.id]))} />
                    <NameBadge name={student.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{student.name}</span>
                      <span className="block truncate text-xs text-zinc-500">{pet.name} · LV.{levelFor(energy)} · {formatInt(energy)}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium text-teal-700">批量调整</p>
          <h3 className="font-semibold">成长能量</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className={mode === "add" ? primaryBtnClass : btnClass} onClick={() => setMode("add")}>＋ 增加</button>
            <button type="button" className={mode === "subtract" ? primaryBtnClass : btnClass} onClick={() => setMode("subtract")}>− 减少</button>
          </div>
          <p className="mt-4 text-xs text-zinc-500">能量数值</p>
          <div className="mt-2 flex gap-2">
            {TEACHER_AMOUNTS.map((item) => (
              <button key={item} type="button" className={`rounded-xl px-3 py-2 text-sm ${amount === item ? "bg-zinc-900 text-white" : "bg-zinc-100"}`} onClick={() => setAmount(item)}>{item}</button>
            ))}
          </div>
          <p className="mt-4 text-xs text-zinc-500">快捷原因</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TEACHER_REASONS.map((item) => (
              <button key={item} type="button" className={`rounded-full px-3 py-1.5 text-sm ${reason === item ? "bg-teal-700 text-white" : "bg-zinc-100"}`} onClick={() => setReason(item)}>{item}</button>
            ))}
          </div>
          <label className="mt-4 block text-sm">
            补充说明
            <input className={`${fieldClass} mt-1`} value={customReason} placeholder="也可以自己填写原因" onChange={(event) => setCustomReason(event.target.value)} />
          </label>
          <button type="button" className={`${primaryBtnClass} mt-4 w-full`} onClick={() => onResult(applyEnergy(state, picked, mode === "add" ? amount : -amount, customReason.trim() || reason))}>
            应用到已选学生 {picked.length} 人
          </button>
        </section>

        <aside className="rounded-3xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">能量记录</h3>
            <button type="button" className="text-sm text-teal-800 disabled:text-zinc-300" disabled={!state.history[0]?.undo} onClick={() => onResult(undoEnergy(state))}>撤销</button>
          </div>
          <ul className="mt-3 max-h-[28rem] space-y-2 overflow-auto">
            {state.history.map((item) => (
              <li key={item.id} className="rounded-2xl bg-zinc-50 px-3 py-2 text-sm">
                <span className={item.delta >= 0 ? "font-medium text-teal-800" : "font-medium text-red-700"}>{item.delta >= 0 ? `+${item.delta}` : item.delta}</span> {item.target}
                <span className="mt-1 block text-xs text-zinc-500">{item.reason} · {item.time}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {rosterOpen ? (
        <Modal title="编辑学生与宠物" eyebrow="教师后台" onClose={() => setRosterOpen(false)} wide>
          <div className="space-y-2">
            {drafts.map((draft, index) => (
              <div key={draft.id} className="grid gap-2 rounded-2xl border border-zinc-200 p-3 md:grid-cols-[1fr_9rem_6rem_7rem_auto] md:items-center">
                <input className={fieldClass} value={draft.name} placeholder="学生姓名" maxLength={20} onChange={(event) => updateDraft(setDrafts, index, { name: event.target.value })} />
                <select className={fieldClass} value={draft.petId} onChange={(event) => updateDraft(setDrafts, index, { petId: event.target.value })}>
                  {growthPets(state).map((pet) => (
                    <option key={pet.id} value={pet.id}>{pet.name}</option>
                  ))}
                </select>
                <input className={fieldClass} type="number" min={0} max={99999} value={draft.energy} onChange={(event) => updateDraft(setDrafts, index, { energy: Number(event.target.value) })} />
                <input className={fieldClass} value={draft.parentPassword} placeholder="家长密码" maxLength={20} onChange={(event) => updateDraft(setDrafts, index, { parentPassword: event.target.value })} />
                <button type="button" className={btnClass} disabled={drafts.length < 2} onClick={() => setDrafts((rows) => rows.filter((item) => item.id !== draft.id))}>移除</button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap justify-between gap-2">
            <button
              type="button"
              className={btnClass}
              onClick={() => setDrafts((rows) => [...rows, { id: `new-${Date.now()}`, name: "", petId: "egg", energy: 0, parentPassword: "1234" }])}
            >
              ＋ 添加学生
            </button>
            <button type="button" className={primaryBtnClass} onClick={saveRoster}>保存名单与匹配</button>
          </div>
        </Modal>
      ) : null}
      {petsOpen ? <PetManager state={state} onResult={onResult} onClose={() => setPetsOpen(false)} /> : null}
    </section>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-zinc-400">{note}</p>
    </div>
  );
}

function updateDraft(setDrafts: (value: RosterDraft[] | ((rows: RosterDraft[]) => RosterDraft[])) => void, index: number, patch: Partial<RosterDraft>) {
  setDrafts((rows) => rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
}

function PetManager({ state, onResult, onClose }: { state: ClassPetState; onResult: (result: RuleResult) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [trait, setTrait] = useState("");
  const [price, setPrice] = useState(180);
  const [color, setColor] = useState(COLOR_SWATCHES[0]);
  const [copy, setCopy] = useState("");
  const [image, setImage] = useState("");
  const [preview, setPreview] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      const next = await compressPetImage(file);
      setImage(next);
      setPreview(next);
    } catch (error) {
      onResult({ state, events: [], message: error instanceof Error ? error.message : "无法处理图片", ok: false });
    }
  }

  function create(event: FormEvent) {
    event.preventDefault();
    const result = addCustomPet(state, { name, trait, price, color, copy, image });
    onResult(result);
    if (!result.ok) return;
    setName("");
    setTrait("");
    setCopy("");
    setImage("");
    setPreview("");
    setPrice(180);
  }

  return (
    <Modal title="添加新的宠物伙伴" eyebrow="教师后台 · 宠物库" onClose={onClose} wide>
      <p className="mb-4 text-sm text-zinc-500">上传一张宠物图片，填写基础资料后，它会出现在商店和学生匹配列表中。</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <form className="space-y-3" onSubmit={create}>
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-zinc-300 p-3">
            <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void onFile(event.target.files?.[0])} />
            {preview ? <img src={preview} alt="新宠物预览" className="h-16 w-16 rounded-xl object-contain" /> : <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-zinc-100 text-2xl">＋</span>}
            <span>
              <span className="block text-sm font-medium">上传宠物图片</span>
              <span className="block text-xs text-zinc-500">PNG、JPG 或 WebP，系统会压到 120KB 以内</span>
            </span>
          </label>
          <label className="block text-sm">宠物名称<input className={`${fieldClass} mt-1`} value={name} maxLength={12} required onChange={(event) => setName(event.target.value)} /></label>
          <label className="block text-sm">成长类型<input className={`${fieldClass} mt-1`} value={trait} maxLength={10} required onChange={(event) => setTrait(event.target.value)} /></label>
          <label className="block text-sm">领养价格<input className={`${fieldClass} mt-1`} type="number" min={0} max={9999} value={price} required onChange={(event) => setPrice(Number(event.target.value))} /></label>
          <label className="block text-sm">宠物介绍<textarea className={`${fieldClass} mt-1`} value={copy} maxLength={42} required onChange={(event) => setCopy(event.target.value)} /></label>
          <fieldset>
            <legend className="text-sm">卡片颜色</legend>
            <div className="mt-2 flex gap-2">
              {COLOR_SWATCHES.map((swatch) => (
                <label key={swatch} className={`h-8 w-8 rounded-full ring-2 ring-offset-2 ${color === swatch ? "ring-zinc-900" : "ring-transparent"}`} style={{ backgroundColor: swatch }}>
                  <input className="sr-only" type="radio" name="petColor" checked={color === swatch} onChange={() => setColor(swatch)} />
                </label>
              ))}
            </div>
          </fieldset>
          <button className={`${primaryBtnClass} w-full`} type="submit">添加到宠物库</button>
        </form>
        <div>
          <h3 className="font-semibold">{allPets(state).length} 个形象</h3>
          <ul className="mt-3 max-h-96 space-y-2 overflow-auto">
            {allPets(state).map((pet) => (
              <li key={pet.id} className="flex items-center gap-2 rounded-2xl border border-zinc-200 px-2 py-1.5">
                <PetPortrait pet={pet} className="h-12 w-12" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{pet.name}</span>
                  <span className="block text-xs text-zinc-500">{pet.trait}{pet.price ? ` · ${pet.price} 星币` : ""}</span>
                </span>
                {pet.customImage || pet.id.startsWith("pet-") ? (
                  <button type="button" className="text-xs text-red-700" onClick={() => onResult(removeCustomPet(state, pet.id))}>移除</button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  );
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("无法读取图片"));
    image.src = url;
  });
}

async function compressPetImage(file: File) {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error("请上传 PNG、JPG 或 WebP");
  const url = URL.createObjectURL(file);
  try {
    const source = await loadImage(url);
    const max = 256;
    const scale = Math.min(1, max / Math.max(source.width, source.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(source.width * scale));
    canvas.height = Math.max(1, Math.round(source.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("无法处理图片");
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    let quality = 0.82;
    let data = canvas.toDataURL("image/jpeg", quality);
    while (data.length > 120_000 && quality > 0.4) {
      quality -= 0.1;
      data = canvas.toDataURL("image/jpeg", quality);
    }
    if (data.length > 120_000) throw new Error("图片太大，请换一张更小的图");
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}
