"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  CHINA_LIFE_EXPECTANCY,
  CHINA_LIFE_NOTE,
  defaultFiInput,
  formatWan,
  formatYears,
  nestLife,
  simulateFi,
  type FiInput,
  type LifeSlice,
} from "@/lib/fi";
import { fieldClass } from "@/lib/styles";

const SLICE_COLOR: Record<LifeSlice["id"], string> = {
  lived: "bg-zinc-300",
  sleep: "bg-indigo-400",
  weekend: "bg-teal-400",
  weekdayWork: "bg-amber-400",
  weekdayFree: "bg-emerald-300",
};

function Field({
  label,
  value,
  onChange,
  suffix,
  step,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  step?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-zinc-600">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="number"
          step={step ?? "1"}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className={fieldClass}
        />
        {suffix ? <span className="shrink-0 text-zinc-400">{suffix}</span> : null}
      </span>
    </label>
  );
}

function Dots({ weeks, unit, color }: { weeks: number; unit: number; color: string }) {
  const n = Math.min(900, Math.round(weeks / unit));
  if (n <= 0) return null;
  return (
    <div className="flex flex-wrap gap-[2px]">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={`h-[7px] w-[7px] rounded-[1px] ${color}`} />
      ))}
    </div>
  );
}

function SliceBox({
  slice,
  unit,
  children,
}: {
  slice?: LifeSlice;
  unit: number;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white/80 p-2.5">
      {slice ? (
        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
          <span className="font-medium text-zinc-700">{slice.label}</span>
          <span className="text-zinc-400">
            {formatYears(slice.years)} · {Math.round(slice.weeks)} 周
          </span>
        </div>
      ) : null}
      {slice ? <Dots weeks={slice.weeks} unit={unit} color={SLICE_COLOR[slice.id]} /> : null}
      {children}
    </div>
  );
}

export default function FiPage() {
  const [form, setForm] = useState<FiInput>(defaultFiInput);
  const patch = (partial: Partial<FiInput>) => setForm((prev) => ({ ...prev, ...partial }));

  const result = useMemo(() => simulateFi(form), [form]);
  const life = useMemo(() => nestLife(form, result.yearsToFi), [form, result.yearsToFi]);
  const unit = Math.max(life.totalWeeks / 520, 1);

  const chart = result.points.filter((_, i) => i % Math.max(1, Math.floor(result.points.length / 40)) === 0 || i === result.points.length - 1);
  const maxY = Math.max(...chart.map((p) => Math.max(p.netWorthWan, p.fiNumberWan)), 1);

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight">财务自由</h1>
      <p className="mt-1 text-sm text-zinc-500">
        工资存下的钱进组合、按年复利。自由线默认是「年开支 ÷ 提取率」（4%
        法则）。下面的格子是同一套预期寿命，剩余时间再拆成睡眠 / 周末清醒 / 工作日。
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-sm font-medium">人</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="现在年龄" value={form.age} onChange={(age) => patch({ age })} suffix="岁" />
            <Field
              label="预期寿命"
              value={form.lifespan}
              onChange={(lifespan) => patch({ lifespan })}
              suffix="岁"
            />
          </div>
          <p className="text-xs leading-5 text-zinc-400">
            参考 {CHINA_LIFE_EXPECTANCY} 岁。{CHINA_LIFE_NOTE}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="每天睡眠"
              value={form.sleepHours}
              onChange={(sleepHours) => patch({ sleepHours })}
              suffix="小时"
            />
            <Field
              label="工作日工作"
              value={form.workHours}
              onChange={(workHours) => patch({ workHours })}
              suffix="小时"
            />
          </div>

          <p className="pt-2 text-sm font-medium">钱</p>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="已有本金"
              value={form.netWorthWan}
              onChange={(netWorthWan) => patch({ netWorthWan })}
              suffix="万"
            />
            <Field
              label="自定义目标"
              value={form.targetWan}
              onChange={(targetWan) => patch({ targetWan })}
              suffix="万"
            />
          </div>
          <p className="text-xs text-zinc-400">目标填 0 则按开支 ÷ 提取率自动算。</p>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="税后月薪"
              value={form.monthlySalary}
              onChange={(monthlySalary) => patch({ monthlySalary })}
              suffix="元"
            />
            <Field
              label="每月投资/租金"
              value={form.monthlyInvest}
              onChange={(monthlyInvest) => patch({ monthlyInvest })}
              suffix="元"
            />
            <Field
              label="每月开支"
              value={form.monthlySpend}
              onChange={(monthlySpend) => patch({ monthlySpend })}
              suffix="元"
            />
            <Field
              label="年化收益"
              value={Math.round(form.returnRate * 1000) / 10}
              onChange={(n) => patch({ returnRate: n / 100 })}
              suffix="%"
              step="0.1"
            />
            <Field
              label="通胀"
              value={Math.round(form.inflation * 1000) / 10}
              onChange={(n) => patch({ inflation: n / 100 })}
              suffix="%"
              step="0.1"
            />
            <Field
              label="薪资涨幅"
              value={Math.round(form.salaryGrowth * 1000) / 10}
              onChange={(n) => patch({ salaryGrowth: n / 100 })}
              suffix="%"
              step="0.1"
            />
            <Field
              label="提取率"
              value={Math.round(form.withdrawRate * 1000) / 10}
              onChange={(n) => patch({ withdrawRate: n / 100 })}
              suffix="%"
              step="0.1"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="储蓄率" value={`${(result.saveRate * 100).toFixed(0)}%`} />
            <Stat label="今天的自由金额" value={formatWan(result.fiNumberNowWan)} />
            <Stat
              label="预计自由年龄"
              value={result.fiAge === null ? "寿命内到不了" : `${result.fiAge} 岁`}
            />
            <Stat
              label="自由后还剩"
              value={result.yearsAfterFi === null ? "—" : formatYears(result.yearsAfterFi)}
            />
          </div>
          <svg viewBox="0 0 320 120" className="w-full rounded-2xl border border-zinc-200 bg-white">
            {chart.length > 1
              ? (() => {
                  const path = chart
                    .map((p, i) => {
                      const x = (i / (chart.length - 1)) * 300 + 10;
                      const y = 110 - (p.netWorthWan / maxY) * 96;
                      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
                    })
                    .join(" ");
                  const fi = chart
                    .map((p, i) => {
                      const x = (i / (chart.length - 1)) * 300 + 10;
                      const y = 110 - (p.fiNumberWan / maxY) * 96;
                      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
                    })
                    .join(" ");
                  return (
                    <>
                      <path d={fi} fill="none" stroke="#d4d4d8" strokeWidth="1.5" strokeDasharray="4 3" />
                      <path d={path} fill="none" stroke="#0f766e" strokeWidth="2" />
                    </>
                  );
                })()
              : null}
          </svg>
          <p className="text-xs text-zinc-400">实线净资产，虚线当年要达到的自由金额（随通胀抬升）。</p>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">人生格子</h2>
        <p className="mt-1 text-sm text-zinc-500">
          外框是预期寿命。已经过的在上面；剩下的时间全部嵌在里面：先去掉睡眠，清醒再分成周末和工作日。工作日里「还要上班」的格子到财务自由那年（若寿命内到不了，按 60 岁停）。
        </p>
        <p className="mt-1 text-xs text-zinc-400">每格约 {unit.toFixed(1)} 周。</p>

        <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="font-medium">预期寿命 {form.lifespan} 岁</span>
            <span className="text-zinc-400">一共 {Math.round(life.totalWeeks)} 周</span>
          </div>

          <SliceBox slice={life.lived} unit={unit} />

          <div className="mt-2 rounded-xl border-2 border-teal-700/30 bg-teal-50/40 p-2.5">
            <div className="mb-2 flex items-baseline justify-between text-xs">
              <span className="font-medium text-teal-900">剩下的 {formatYears(life.remaining.weeks / 52.1775)}</span>
              <span className="text-teal-800/70">{Math.round(life.remaining.weeks)} 周</span>
            </div>

            <div className="rounded-xl border border-teal-200 bg-white/70 p-2.5">
              <div className="mb-2 text-xs font-medium text-zinc-700">
                清醒 {formatYears(life.remaining.awake.weeks / 52.1775)}
              </div>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,5fr)]">
                <SliceBox slice={life.remaining.awake.weekend} unit={unit} />
                <div className="rounded-xl border border-zinc-200 bg-white p-2.5">
                  <div className="mb-1.5 text-xs font-medium text-zinc-700">工作日清醒</div>
                  <div className="space-y-2">
                    {life.remaining.awake.weekday.work.weeks > 0.2 ? (
                      <SliceBox slice={life.remaining.awake.weekday.work} unit={unit} />
                    ) : null}
                    <SliceBox slice={life.remaining.awake.weekday.free} unit={unit} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2">
              <SliceBox slice={life.remaining.sleep} unit={unit} />
            </div>
          </div>
        </div>

        <ul className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
          <Legend color={SLICE_COLOR.lived} text="已经过的" />
          <Legend color={SLICE_COLOR.weekend} text="周末清醒" />
          <Legend color={SLICE_COLOR.weekdayWork} text="还要上班" />
          <Legend color={SLICE_COLOR.weekdayFree} text="工作日自由" />
          <Legend color={SLICE_COLOR.sleep} text="睡眠" />
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function Legend({ color, text }: { color: string; text: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-sm ${color}`} />
      {text}
    </li>
  );
}
