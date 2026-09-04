export const CHINA_LIFE_EXPECTANCY = 79;
export const CHINA_LIFE_NOTE = "国家卫健委《2024年我国卫生健康事业发展统计公报》：人均预期寿命 79 岁。";

export type FiInput = {
  age: number;
  lifespan: number;
  netWorthWan: number;
  monthlySalary: number;
  monthlyInvest: number;
  monthlySpend: number;
  returnRate: number;
  inflation: number;
  salaryGrowth: number;
  withdrawRate: number;
  targetWan: number;
  workHours: number;
  sleepHours: number;
};

export type FiYearPoint = {
  year: number;
  age: number;
  netWorthWan: number;
  spendWan: number;
  saveWan: number;
  fiNumberWan: number;
  reached: boolean;
};

export type FiResult = {
  saveRate: number;
  fiNumberNowWan: number;
  fiAge: number | null;
  yearsToFi: number | null;
  yearsAfterFi: number | null;
  points: FiYearPoint[];
  never: boolean;
};

export const defaultFiInput = (): FiInput => ({
  age: 30,
  lifespan: CHINA_LIFE_EXPECTANCY,
  netWorthWan: 20,
  monthlySalary: 20000,
  monthlyInvest: 0,
  monthlySpend: 10000,
  returnRate: 0.06,
  inflation: 0.02,
  salaryGrowth: 0.03,
  withdrawRate: 0.04,
  targetWan: 0,
  workHours: 8,
  sleepHours: 8,
});

export function simulateFi(input: FiInput): FiResult {
  const age = clamp(input.age, 0, 110);
  const lifespan = clamp(input.lifespan, age + 1, 120);
  const r = clamp(input.returnRate, -0.2, 0.3);
  const inf = clamp(input.inflation, -0.05, 0.2);
  const g = clamp(input.salaryGrowth, -0.2, 0.3);
  const w = clamp(input.withdrawRate, 0.01, 0.1);
  const horizon = Math.ceil(lifespan - age);

  const annualSpend0 = Math.max(0, input.monthlySpend) * 12;
  const annualSalary0 = Math.max(0, input.monthlySalary) * 12;
  const annualInvest0 = Math.max(0, input.monthlyInvest) * 12;
  const income0 = annualSalary0 + annualInvest0;
  const saveRate = income0 <= 0 ? 0 : (income0 - annualSpend0) / income0;
  const fiNumberNowWan = w === 0 ? 0 : annualSpend0 / w / 10_000;

  let portfolio = Math.max(0, input.netWorthWan) * 10_000;
  const points: FiYearPoint[] = [];
  let fiAge: number | null = null;

  for (let i = 0; i <= horizon; i += 1) {
    const spend = annualSpend0 * (1 + inf) ** i;
    const salary = annualSalary0 * (1 + g) ** i;
    const invest = annualInvest0 * (1 + inf) ** i;
    const save = salary + invest - spend;
    const fiNumber = spend / w;
    const customTarget =
      input.targetWan > 0 ? input.targetWan * 10_000 * (1 + inf) ** i : fiNumber;
    if (i > 0) portfolio = Math.max(0, portfolio * (1 + r) + save);
    const reached = portfolio >= customTarget;
    points.push({
      year: i,
      age: age + i,
      netWorthWan: portfolio / 10_000,
      spendWan: spend / 10_000,
      saveWan: save / 10_000,
      fiNumberWan: customTarget / 10_000,
      reached,
    });
    if (reached && fiAge === null) fiAge = age + i;
  }

  const yearsToFi = fiAge === null ? null : fiAge - age;
  const yearsAfterFi = fiAge === null ? null : Math.max(0, lifespan - fiAge);
  return {
    saveRate,
    fiNumberNowWan,
    fiAge,
    yearsToFi,
    yearsAfterFi,
    points,
    never: fiAge === null,
  };
}

export type LifeSlice = {
  id: "lived" | "sleep" | "weekend" | "weekdayFree" | "weekdayWork";
  label: string;
  weeks: number;
  hours: number;
  years: number;
};

export type LifeNested = {
  totalWeeks: number;
  remainingWeeks: number;
  lived: LifeSlice;
  remaining: {
    weeks: number;
    awake: {
      weeks: number;
      weekend: LifeSlice;
      weekday: {
        weeks: number;
        work: LifeSlice;
        free: LifeSlice;
      };
    };
    sleep: LifeSlice;
  };
};

export function nestLife(input: FiInput, yearsToFi: number | null): LifeNested {
  const age = clamp(input.age, 0, 110);
  const lifespan = clamp(input.lifespan, age, 120);
  const sleep = clamp(input.sleepHours, 0, 16);
  const work = clamp(input.workHours, 0, 16);
  const awake = Math.max(0, 24 - sleep);
  const workInAwake = awake === 0 ? 0 : Math.min(work, awake);

  const totalYears = lifespan;
  const livedYears = Math.min(age, lifespan);
  const remainYears = Math.max(0, lifespan - age);
  const weeksPerYear = 52.1775;
  const hoursPerWeek = 24 * 7;

  const livedWeeks = livedYears * weeksPerYear;
  const remainWeeks = remainYears * weeksPerYear;
  const totalWeeks = totalYears * weeksPerYear;

  const sleepShare = sleep / 24;
  const weekendShare = 2 / 7;
  const weekdayShare = 5 / 7;

  const sleepWeeks = remainWeeks * sleepShare;
  const awakeWeeks = remainWeeks - sleepWeeks;
  const weekendWeeks = awakeWeeks * weekendShare;
  const weekdayWeeks = awakeWeeks * weekdayShare;

  const workShareOfWeekday = awake === 0 ? 0 : workInAwake / awake;
  const workingYears =
    yearsToFi === null
      ? Math.min(Math.max(60 - age, 0), remainYears)
      : Math.min(Math.max(yearsToFi, 0), remainYears);
  const workingWeekdayWeeks = workingYears * weeksPerYear * (1 - sleepShare) * weekdayShare * workShareOfWeekday;
  const weekdayWorkWeeks = Math.min(workingWeekdayWeeks, weekdayWeeks);
  const weekdayFreeWeeks = Math.max(0, weekdayWeeks - weekdayWorkWeeks);

  const toSlice = (id: LifeSlice["id"], label: string, weeks: number): LifeSlice => ({
    id,
    label,
    weeks,
    hours: weeks * hoursPerWeek,
    years: weeks / weeksPerYear,
  });

  return {
    totalWeeks,
    remainingWeeks: remainWeeks,
    lived: toSlice("lived", "已经过的", livedWeeks),
    remaining: {
      weeks: remainWeeks,
      awake: {
        weeks: awakeWeeks,
        weekend: toSlice("weekend", "周末清醒", weekendWeeks),
        weekday: {
          weeks: weekdayWeeks,
          work: toSlice("weekdayWork", "工作日还要上班", weekdayWorkWeeks),
          free: toSlice("weekdayFree", "工作日清醒（自由）", weekdayFreeWeeks),
        },
      },
      sleep: toSlice("sleep", "睡眠", sleepWeeks),
    },
  };
}

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function formatWan(n: number) {
  if (Math.abs(n) >= 10000) return `${(n / 10000).toFixed(2)} 亿`;
  if (Math.abs(n) >= 1) return `${n.toFixed(1)} 万`;
  return `${(n * 10000).toFixed(0)} 元`;
}

export function formatYears(n: number) {
  if (n < 0.1) return `${(n * 52).toFixed(0)} 周`;
  return `${n.toFixed(1)} 年`;
}
