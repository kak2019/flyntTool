export type PetStage = "egg" | "baby" | "adult" | "skin";
export type SkinKind = "scarf" | "hat";
export type CareStat = "hunger" | "clean" | "mood";
export type CareActionId = "feed" | "wash" | "touch" | "play";

export type PetDef = {
  id: string;
  speciesId: string;
  stage: PetStage;
  name: string;
  trait: string;
  price: number;
  color: string;
  copy: string;
  evolvesTo?: string;
  requiredAdultId?: string;
  skin?: SkinKind;
  customImage?: string;
};

export type Student = {
  id: string;
  name: string;
  petId: string;
  ownedPetIds: string[];
  ownedSkinIds: string[];
  appliedSkinBySpecies: Record<string, string>;
  petEnergy: Record<string, number>;
  coins: number;
  hunger: number;
  clean: number;
  mood: number;
  parentPassword: string;
  parentDaily: { date: string; used: number };
};

export type UndoStudent = {
  studentId: string;
  petId: string;
  ownedPetIds: string[];
  ownedSkinIds: string[];
  appliedSkinBySpecies: Record<string, string>;
  petEnergy: Record<string, number>;
  coins: number;
  hunger: number;
  clean: number;
  mood: number;
  parentDaily: { date: string; used: number };
};

export type EnergyUndo = {
  students: UndoStudent[];
  parentLogId?: string;
};

export type EnergyLog = {
  id: string;
  date: string;
  time: string;
  target: string;
  delta: number;
  reason: string;
  undo?: EnergyUndo;
};

export type ParentLog = {
  id: string;
  date: string;
  time: string;
  studentId: string;
  studentName: string;
  delta: number;
  reason: string;
};

export type ClassPetState = {
  version: 1;
  className: string;
  students: Student[];
  customPets: PetDef[];
  selectedStudentId: string;
  history: EnergyLog[];
  parentHistory: ParentLog[];
};

export type GrowthEvent = {
  type: "hatch" | "evolve" | "level";
  studentId: string;
  studentName: string;
  title: string;
  message: string;
  petName: string;
  level: number;
  speciesId: string;
  stage: PetStage;
  skin?: SkinKind;
  image?: string;
  color: string;
};

export type RuleResult = {
  state: ClassPetState;
  events: GrowthEvent[];
  message: string;
  ok: boolean;
};

export type RosterDraft = {
  id: string;
  name: string;
  petId: string;
  energy: number;
  parentPassword: string;
};

export type CustomPetInput = {
  name: string;
  trait: string;
  price: number;
  color: string;
  copy: string;
  image: string;
};

export const EGG_ID = "egg";
export const EGG_HATCH_ENERGY = 100;
export const ADULT_EVOLUTION_ENERGY = 900;
export const MAX_LEVEL = 20;
export const LEVEL_STEP = 100;
export const EGG_PRICE = 100;
export const BABY_PRICE = 200;
export const PARENT_DAILY_CAP = 10;
export const NEW_STUDENT_COINS = 100;
export const DEFAULT_PARENT_PASSWORD = "1234";
export const CARE_RESET = 62;
export const CLASS_GOAL_PER_STUDENT = 1000;
export const MAX_CUSTOM_IMAGE = 120_000;

export const COLOR_SWATCHES = ["#E85D4E", "#C4D94E", "#C5B5E0", "#8BB4F7", "#F2D160", "#A8E6CF"];
export const TEACHER_AMOUNTS = [1, 3, 5, 10];
export const PARENT_AMOUNTS = [1, 2, 3, 5];
export const TEACHER_REASONS = ["积极发言", "认真专注", "合作互助", "作业完成"];
export const PARENT_REASONS = ["主动整理房间", "按时完成作业", "主动阅读", "帮助家人", "坚持运动", "礼貌沟通"];

export const CARE_ACTIONS: Record<
  CareActionId,
  { label: string; cost: number; stat: CareStat; amount: number; full: string; message: string }
> = {
  feed: { label: "喂食", cost: 5, stat: "hunger", amount: 20, full: "已经吃得饱饱啦！", message: "吃得饱饱，我有力气啦！" },
  wash: { label: "洗澡", cost: 6, stat: "clean", amount: 22, full: "已经干干净净啦！", message: "洗得香香的，舒服多啦！" },
  touch: { label: "抚摸", cost: 3, stat: "mood", amount: 14, full: "心情已经超级好啦！", message: "好喜欢你陪着我。" },
  play: { label: "玩耍", cost: 8, stat: "mood", amount: 20, full: "今天已经玩得很开心啦！", message: "再陪我跳一次吧！" },
};

export const BUILT_IN_PETS: PetDef[] = [
  {
    id: EGG_ID,
    speciesId: "egg",
    stage: "egg",
    name: "神秘宠物蛋",
    trait: "待孵化",
    price: EGG_PRICE,
    color: "#F6E7C1",
    copy: "积满 100 点成长能量后，会随机孵化一只还没有的幼体。",
  },
  baby("fox", "茸茸狐狸", "灵巧型", "#E07A3D", "爱观察也爱想问题，尾巴里藏着新点子。", "fox-adult"),
  adult("fox", "赤尾狐狸", "智慧型", "#D2693A", "灵活又聪明，总能想到下一步。"),
  skin("fox", "scarf", "围巾狐狸", "温暖皮肤", 160, "#E25B4A", "赤尾狐狸的红围巾，先拥有成年体才能换上。", "fox-adult"),
  baby("rabbit", "兔兔团子", "耐心型", "#E4E0DC", "一点点积累能量，长耳朵会慢慢舒展开。", "rabbit-adult"),
  adult("rabbit", "长耳灰兔", "敏捷型", "#C9C4C2", "动作轻快，遇到挑战也很快跟上。"),
  baby("cat", "煤球猫咪", "专注型", "#4A4E57", "安静盯住目标，不放过小细节。", "cat-adult"),
  adult("cat", "黑曜猫咪", "观察型", "#2F343C", "敏锐又沉稳，能把复杂的事看清楚。"),
  skin("cat", "hat", "帽子猫咪", "酷感皮肤", 140, "#3D8F7A", "黑曜猫咪的小帽子，先拥有成年体才能换上。", "cat-adult"),
  baby("seal", "糯糯海豹", "温和型", "#8AA4B5", "圆圆的，认真听完才会行动。", "seal-adult"),
  adult("seal", "糯米海豹", "温柔型", "#6E8EA3", "安静可靠，会接住旁边伙伴的情绪。"),
  baby("owl", "星眸猫头鹰", "想象型", "#C4A574", "眼睛亮亮的，喜欢把问题看成故事。", "owl-adult"),
  adult("owl", "森林猫头鹰", "观察型", "#A88858", "看得细，也愿意把发现讲给大家听。"),
  baby("tiger", "团团虎", "快乐型", "#F0A05A", "笑起来就有劲，喜欢和同伴一起完成任务。", "tiger-adult"),
  adult("tiger", "微笑虎", "自信型", "#E08A3C", "相信再试一次就会更接近答案。"),
];

const PET_BY_ID = new Map(BUILT_IN_PETS.map((pet) => [pet.id, pet]));

type Rng = () => number;
type Clock = { now?: Date; rng?: Rng };

const DEMO: Array<{
  name: string;
  petId: string;
  energy: number;
  coins: number;
  hunger: number;
  clean: number;
  mood: number;
}> = [
  { name: "林小溪", petId: "fox-baby", energy: 247, coins: 145, hunger: 76, clean: 68, mood: 91 },
  { name: "周安然", petId: "rabbit-adult", energy: 1138, coins: 180, hunger: 80, clean: 74, mood: 88 },
  { name: "陈一诺", petId: "cat-adult", energy: 980, coins: 260, hunger: 64, clean: 81, mood: 77 },
  { name: "高木子", petId: EGG_ID, energy: 90, coins: 120, hunger: 58, clean: 63, mood: 70 },
  { name: "宋可欣", petId: "seal-baby", energy: 421, coins: 80, hunger: 86, clean: 100, mood: 100 },
  { name: "刘景然", petId: "owl-baby", energy: 890, coins: 150, hunger: 72, clean: 48, mood: 66 },
  { name: "赵灿灿", petId: "tiger-adult", energy: 1560, coins: 90, hunger: 62, clean: 70, mood: 84 },
  { name: "孙悦宁", petId: "fox-adult", energy: 1900, coins: 300, hunger: 88, clean: 79, mood: 93 },
  { name: "苏语辰", petId: EGG_ID, energy: 0, coins: 100, hunger: 80, clean: 80, mood: 80 },
  { name: "许星遥", petId: "rabbit-baby", energy: 350, coins: 200, hunger: 44, clean: 58, mood: 71 },
  { name: "王子墨", petId: "owl-adult", energy: 1320, coins: 110, hunger: 36, clean: 52, mood: 61 },
  { name: "唐果果", petId: "seal-baby", energy: 132, coins: 175, hunger: 69, clean: 73, mood: 82 },
];

function baby(speciesId: string, name: string, trait: string, color: string, copy: string, evolvesTo: string): PetDef {
  return {
    id: `${speciesId}-baby`,
    speciesId,
    stage: "baby",
    name,
    trait,
    price: BABY_PRICE,
    color,
    copy,
    evolvesTo,
  };
}

function adult(speciesId: string, name: string, trait: string, color: string, copy: string): PetDef {
  return {
    id: `${speciesId}-adult`,
    speciesId,
    stage: "adult",
    name,
    trait,
    price: 0,
    color,
    copy,
  };
}

function skin(
  speciesId: string,
  kind: SkinKind,
  name: string,
  trait: string,
  price: number,
  color: string,
  copy: string,
  requiredAdultId: string,
): PetDef {
  return {
    id: `${speciesId}-${kind}`,
    speciesId,
    stage: "skin",
    name,
    trait,
    price,
    color,
    copy,
    skin: kind,
    requiredAdultId,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return clamp(Math.round(n), min, max);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function todayKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function clockTime(date = new Date()) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function formatInt(value: number) {
  return Math.round(value).toLocaleString("zh-CN");
}

export function levelFor(energy: number) {
  return Math.min(MAX_LEVEL, Math.floor(Math.max(0, energy) / LEVEL_STEP) + 1);
}

export function energyProgress(energy: number) {
  if (levelFor(energy) >= MAX_LEVEL) return 100;
  return Math.max(0, Math.round(energy)) % LEVEL_STEP;
}

export function petEnergyOf(student: Student) {
  return Math.max(0, Math.round(Number(student.petEnergy[student.petId]) || 0));
}

export function allPets(state: ClassPetState) {
  return [...BUILT_IN_PETS, ...state.customPets];
}

export function petById(state: ClassPetState, id: string) {
  return PET_BY_ID.get(id) ?? state.customPets.find((pet) => pet.id === id);
}

export function shopPets(state: ClassPetState) {
  return [...BUILT_IN_PETS.filter((pet) => pet.stage !== "adult"), ...state.customPets];
}

export function growthPets(state: ClassPetState) {
  return [...BUILT_IN_PETS.filter((pet) => pet.stage !== "skin"), ...state.customPets];
}

export function facingPet(state: ClassPetState, student: Student) {
  const pet = petById(state, student.petId) ?? BUILT_IN_PETS[0];
  if (pet.stage !== "adult") return pet;
  const skinId = student.appliedSkinBySpecies[pet.speciesId];
  const worn = skinId ? petById(state, skinId) : undefined;
  if (worn?.stage === "skin" && student.ownedSkinIds.includes(worn.id)) return worn;
  return pet;
}

export function classEnergyTotal(state: ClassPetState) {
  return state.students.reduce((sum, student) => sum + petEnergyOf(student), 0);
}

export function classGoalPercent(state: ClassPetState) {
  const goal = state.students.length * CLASS_GOAL_PER_STUDENT;
  if (!goal) return 0;
  return Math.min(100, Math.round((classEnergyTotal(state) / goal) * 100));
}

export function needsCare(student: Student) {
  return student.hunger < 45 || student.clean < 45 || student.mood < 45;
}

export function todayEnergySummary(state: ClassPetState, now = new Date()) {
  const day = todayKey(now);
  const rows = state.history.filter((item) => item.date === day);
  return {
    delta: rows.reduce((sum, item) => sum + item.delta, 0),
    count: rows.length,
  };
}

export function parentTodayLogs(state: ClassPetState, studentId: string, now = new Date()) {
  const day = todayKey(now);
  return state.parentHistory.filter((item) => item.studentId === studentId && item.date === day);
}

export function parentDailyStatus(student: Student, now = new Date()) {
  const day = todayKey(now);
  const used = student.parentDaily?.date === day ? clamp(student.parentDaily.used, 0, PARENT_DAILY_CAP) : 0;
  return { date: day, used, remaining: PARENT_DAILY_CAP - used };
}

export function createStudent(name: string, id = uid("student")): Student {
  return {
    id,
    name: name.trim() || "新同学",
    petId: EGG_ID,
    ownedPetIds: [EGG_ID],
    ownedSkinIds: [],
    appliedSkinBySpecies: {},
    petEnergy: { [EGG_ID]: 0 },
    coins: NEW_STUDENT_COINS,
    hunger: 80,
    clean: 80,
    mood: 80,
    parentPassword: DEFAULT_PARENT_PASSWORD,
    parentDaily: { date: "", used: 0 },
  };
}

export function createDefaultState(): ClassPetState {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const students = DEMO.map((item, index) => {
    const student = createStudent(item.name, `student-${index + 1}`);
    student.petId = item.petId;
    student.ownedPetIds = [item.petId];
    student.petEnergy = { [item.petId]: item.energy };
    student.coins = item.coins;
    student.hunger = item.hunger;
    student.clean = item.clean;
    student.mood = item.mood;
    return student;
  });
  return {
    version: 1,
    className: "三年二班",
    students,
    customPets: [],
    selectedStudentId: students[0].id,
    history: [
      { id: "seed-1", date: todayKey(yesterday), time: "08:32", target: "陈一诺", delta: 5, reason: "积极发言" },
      { id: "seed-2", date: todayKey(yesterday), time: "09:48", target: "全班同学", delta: 3, reason: "认真专注" },
      { id: "seed-3", date: todayKey(yesterday), time: "10:25", target: "4 人", delta: 8, reason: "合作互助" },
    ],
    parentHistory: [],
  };
}

function fail(state: ClassPetState, message: string): RuleResult {
  return { state, events: [], message, ok: false };
}

function ok(state: ClassPetState, message: string, events: GrowthEvent[] = []): RuleResult {
  return { state, events, message, ok: true };
}

function cloneState(state: ClassPetState) {
  return structuredClone(state);
}

function snapshot(student: Student): UndoStudent {
  return {
    studentId: student.id,
    petId: student.petId,
    ownedPetIds: [...student.ownedPetIds],
    ownedSkinIds: [...student.ownedSkinIds],
    appliedSkinBySpecies: { ...student.appliedSkinBySpecies },
    petEnergy: { ...student.petEnergy },
    coins: student.coins,
    hunger: student.hunger,
    clean: student.clean,
    mood: student.mood,
    parentDaily: { ...student.parentDaily },
  };
}

function findPet(pets: PetDef[], id: string) {
  return pets.find((pet) => pet.id === id);
}

function replacePet(student: Student, fromId: string, toId: string, energy: number) {
  student.ownedPetIds = student.ownedPetIds.filter((id) => id !== fromId);
  if (!student.ownedPetIds.includes(toId)) student.ownedPetIds.push(toId);
  delete student.petEnergy[fromId];
  student.petEnergy[toId] = Math.max(0, Math.round(energy));
  if (student.petId === fromId) student.petId = toId;
}

function hatchChoice(student: Student, pets: PetDef[], rng: Rng) {
  const babies = pets.filter((pet) => pet.stage === "baby" && !pet.customImage);
  const ownedSpecies = new Set(
    student.ownedPetIds
      .map((id) => findPet(pets, id))
      .filter((pet): pet is PetDef => Boolean(pet && pet.speciesId !== "egg"))
      .map((pet) => pet.speciesId),
  );
  const fresh = babies.filter((pet) => !ownedSpecies.has(pet.speciesId));
  const unowned = babies.filter((pet) => !student.ownedPetIds.includes(pet.id));
  const pool = fresh.length ? fresh : unowned.length ? unowned : babies;
  return pool[Math.floor(rng() * pool.length)] ?? babies[0];
}

function artOf(pet: PetDef, student: Student, pets: PetDef[]): Pick<GrowthEvent, "petName" | "speciesId" | "stage" | "skin" | "image" | "color"> {
  if (pet.stage === "adult") {
    const worn = findPet(pets, student.appliedSkinBySpecies[pet.speciesId] || "");
    if (worn?.skin && student.ownedSkinIds.includes(worn.id)) {
      return { petName: worn.name, speciesId: pet.speciesId, stage: "adult", skin: worn.skin, color: pet.color, image: pet.customImage };
    }
  }
  return {
    petName: pet.name,
    speciesId: pet.speciesId,
    stage: pet.stage,
    skin: pet.skin,
    image: pet.customImage,
    color: pet.color,
  };
}

function resolveEvolution(student: Student, pets: PetDef[], rng: Rng) {
  const events: GrowthEvent[] = [];
  for (let step = 0; step < 2; step += 1) {
    const pet = findPet(pets, student.petId);
    if (!pet) break;
    const energy = petEnergyOf(student);
    if (pet.stage === "egg" && energy >= EGG_HATCH_ENERGY) {
      const babyPet = hatchChoice(student, pets, rng);
      if (!babyPet) break;
      replacePet(student, pet.id, babyPet.id, energy - EGG_HATCH_ENERGY);
      events.push({
        type: "hatch",
        studentId: student.id,
        studentName: student.name,
        title: "孵化啦！",
        message: `${student.name} 的宠物蛋孵化成了${babyPet.name}。`,
        level: levelFor(petEnergyOf(student)),
        ...artOf(findPet(pets, student.petId) ?? babyPet, student, pets),
      });
      continue;
    }
    if (pet.stage === "baby" && pet.evolvesTo && energy >= ADULT_EVOLUTION_ENERGY) {
      const adultPet = findPet(pets, pet.evolvesTo);
      if (!adultPet) break;
      replacePet(student, pet.id, adultPet.id, energy);
      events.push({
        type: "evolve",
        studentId: student.id,
        studentName: student.name,
        title: "进化啦！",
        message: `${pet.name} 长成了${adultPet.name}。`,
        level: levelFor(petEnergyOf(student)),
        ...artOf(adultPet, student, pets),
      });
      continue;
    }
    break;
  }
  return events;
}

function applyDelta(student: Student, delta: number, pets: PetDef[], rng: Rng) {
  const before = petEnergyOf(student);
  const beforeLevel = levelFor(before);
  student.petEnergy[student.petId] = Math.max(0, before + delta);
  if (delta <= 0) return [];
  const evolved = resolveEvolution(student, pets, rng);
  if (evolved.length) return evolved;
  const afterLevel = levelFor(petEnergyOf(student));
  if (afterLevel <= beforeLevel) return [];
  const pet = findPet(pets, student.petId) ?? BUILT_IN_PETS[0];
  return [
    {
      type: "level" as const,
      studentId: student.id,
      studentName: student.name,
      title: "升级啦！",
      message: `${student.name} 的${artOf(pet, student, pets).petName}升到了 LV.${afterLevel}。`,
      level: afterLevel,
      ...artOf(pet, student, pets),
    },
  ];
}

function pushEnergy(state: ClassPetState, entry: EnergyLog) {
  state.history = [entry, ...state.history].slice(0, 40);
}

export function selectStudent(state: ClassPetState, studentId: string): RuleResult {
  if (!state.students.some((student) => student.id === studentId)) return fail(state, "找不到这位同学");
  if (state.selectedStudentId === studentId) return ok(state, "");
  return ok({ ...state, selectedStudentId: studentId }, "");
}

export function renameClass(state: ClassPetState, className: string): RuleResult {
  const name = className.trim().slice(0, 20);
  if (!name) return fail(state, "班级名称不能为空");
  if (name === state.className) return ok(state, "");
  return ok({ ...state, className: name }, "");
}

export function applyEnergy(state: ClassPetState, studentIds: string[], delta: number, reason: string, clock: Clock = {}): RuleResult {
  const amount = Math.round(delta);
  if (!amount) return fail(state, "请选择能量数值");
  const ids = state.students.map((student) => student.id).filter((id) => studentIds.includes(id));
  if (!ids.length) return fail(state, "请先选择学生");
  const next = cloneState(state);
  const pets = allPets(next);
  const rng = clock.rng ?? Math.random;
  const now = clock.now ?? new Date();
  const shots: UndoStudent[] = [];
  const events: GrowthEvent[] = [];
  let changed = 0;
  for (const id of ids) {
    const student = next.students.find((item) => item.id === id);
    if (!student || !findPet(pets, student.petId)) continue;
    const beforeEnergy = petEnergyOf(student);
    const beforePet = student.petId;
    const shot = snapshot(student);
    const grown = applyDelta(student, amount, pets, rng);
    if (petEnergyOf(student) === beforeEnergy && student.petId === beforePet) continue;
    shots.push(shot);
    events.push(...grown);
    changed += 1;
  }
  if (!changed) return fail(state, "能量没有变化");
  const changedIds = shots.map((shot) => shot.studentId);
  const target =
    changedIds.length === next.students.length
      ? "全班同学"
      : changedIds.length === 1
        ? next.students.find((student) => student.id === changedIds[0])?.name || "1 人"
        : `${changedIds.length} 人`;
  pushEnergy(next, {
    id: uid("energy"),
    date: todayKey(now),
    time: clockTime(now),
    target,
    delta: amount,
    reason: reason.trim().slice(0, 30) || "老师记录",
    undo: { students: shots },
  });
  const verb = amount > 0 ? "增加" : "减少";
  return ok(next, `已为${target}${verb} ${Math.abs(amount)} 点能量`, events);
}

export function undoEnergy(state: ClassPetState): RuleResult {
  const latest = state.history[0];
  if (!latest?.undo?.students.length) return fail(state, "没有可撤销的操作");
  const next = cloneState(state);
  for (const shot of latest.undo.students) {
    const student = next.students.find((item) => item.id === shot.studentId);
    if (!student) continue;
    student.petId = shot.petId;
    student.ownedPetIds = [...shot.ownedPetIds];
    student.ownedSkinIds = [...shot.ownedSkinIds];
    student.appliedSkinBySpecies = { ...shot.appliedSkinBySpecies };
    student.petEnergy = { ...shot.petEnergy };
    student.coins = shot.coins;
    student.hunger = shot.hunger;
    student.clean = shot.clean;
    student.mood = shot.mood;
    student.parentDaily = { ...shot.parentDaily };
  }
  if (latest.undo.parentLogId) {
    next.parentHistory = next.parentHistory.filter((item) => item.id !== latest.undo?.parentLogId);
  }
  next.history = next.history.slice(1);
  return ok(next, "已撤销最近一次能量变化");
}

export function care(state: ClassPetState, studentId: string, actionId: CareActionId, clock: Clock = {}): RuleResult {
  const action = CARE_ACTIONS[actionId];
  const current = state.students.find((student) => student.id === studentId);
  if (!current) return fail(state, "找不到这位同学");
  if (current[action.stat] >= 100) return fail(state, `${action.full}未消耗星币。`);
  if (current.coins < action.cost) return fail(state, `${current.name}还差 ${action.cost - current.coins} 星币`);
  const next = cloneState(state);
  const student = next.students.find((item) => item.id === studentId)!;
  const shot = snapshot(student);
  student.coins -= action.cost;
  student[action.stat] = clamp(student[action.stat] + action.amount, 0, 100);
  const ready = student.hunger >= 100 && student.clean >= 100 && student.mood >= 100;
  const level = levelFor(petEnergyOf(student));
  if (!ready) return ok(next, `${action.message} −${action.cost} 星币`);
  if (level >= MAX_LEVEL) return ok(next, "已经是最高等级啦！");
  const now = clock.now ?? new Date();
  const delta = level * LEVEL_STEP - petEnergyOf(student);
  const events = applyDelta(student, delta, allPets(next), clock.rng ?? Math.random);
  student.hunger = CARE_RESET;
  student.clean = CARE_RESET;
  student.mood = CARE_RESET;
  pushEnergy(next, {
    id: uid("energy"),
    date: todayKey(now),
    time: clockTime(now),
    target: student.name,
    delta,
    reason: "三项状态满格",
    undo: { students: [shot] },
  });
  return ok(next, "三项状态满格，升级啦！", events);
}

export type ShopMode = "current" | "switch" | "wear" | "buy" | "broke" | "locked";

export function shopStatus(student: Student, pet: PetDef, pets: PetDef[]): { label: string; mode: ShopMode } {
  if (pet.stage === "skin") {
    const adult = findPet(pets, pet.requiredAdultId || "");
    if (!adult || !student.ownedPetIds.includes(adult.id)) return { label: `需要${adult?.name ?? "成年体"}`, mode: "locked" };
    const wearing = student.ownedSkinIds.includes(pet.id) && student.appliedSkinBySpecies[pet.speciesId] === pet.id && student.petId === adult.id;
    if (student.ownedSkinIds.includes(pet.id)) return wearing ? { label: "正在使用", mode: "current" } : { label: "使用皮肤", mode: "wear" };
    if (student.coins < pet.price) return { label: `还差 ${pet.price - student.coins} 星币`, mode: "broke" };
    return { label: `${pet.price} 星币购买`, mode: "buy" };
  }
  if (student.ownedPetIds.includes(pet.id)) {
    const wearingSkin = pet.stage === "adult" && Boolean(student.appliedSkinBySpecies[pet.speciesId]);
    if (student.petId === pet.id && !wearingSkin) return { label: "当前伙伴", mode: "current" };
    return { label: "切换伙伴", mode: "switch" };
  }
  if (student.coins < pet.price) return { label: `还差 ${pet.price - student.coins} 星币`, mode: "broke" };
  return { label: `${pet.price} 星币购买`, mode: "buy" };
}

export function shopAction(state: ClassPetState, studentId: string, petId: string): RuleResult {
  const current = state.students.find((student) => student.id === studentId);
  const pet = petById(state, petId);
  if (!current || !pet) return fail(state, "找不到这只宠物");
  const pets = allPets(state);
  const status = shopStatus(current, pet, pets);
  if (status.mode === "current") return fail(state, "已经是当前伙伴");
  if (status.mode === "locked") return fail(state, status.label);
  if (status.mode === "broke") return fail(state, `${current.name}${status.label}`);
  const next = cloneState(state);
  const student = next.students.find((item) => item.id === studentId)!;
  const adult = pet.requiredAdultId ? petById(next, pet.requiredAdultId) : undefined;
  if (status.mode === "buy") {
    student.coins -= pet.price;
    if (pet.stage === "skin") {
      if (!student.ownedSkinIds.includes(pet.id)) student.ownedSkinIds.push(pet.id);
      student.appliedSkinBySpecies[pet.speciesId] = pet.id;
      if (adult) student.petId = adult.id;
      return ok({ ...next, selectedStudentId: student.id }, `${student.name}换上了${pet.name}`);
    }
    if (!student.ownedPetIds.includes(pet.id)) student.ownedPetIds.push(pet.id);
    if (student.petEnergy[pet.id] == null) student.petEnergy[pet.id] = 0;
    student.petId = pet.id;
    return ok({ ...next, selectedStudentId: student.id }, `${student.name}领养了${pet.name}`);
  }
  if (pet.stage === "skin" && adult) {
    student.appliedSkinBySpecies[pet.speciesId] = pet.id;
    student.petId = adult.id;
    return ok({ ...next, selectedStudentId: student.id }, `${student.name}换上了${pet.name}`);
  }
  student.petId = pet.id;
  if (pet.stage === "adult") delete student.appliedSkinBySpecies[pet.speciesId];
  return ok({ ...next, selectedStudentId: student.id }, `已切换到${pet.name}`);
}

export function findParentStudent(state: ClassPetState, name: string, password: string) {
  const student = state.students.find((item) => item.name === name.trim());
  if (!student || student.parentPassword !== password) return null;
  return student;
}

export function parentGrant(
  state: ClassPetState,
  studentId: string,
  amount: number,
  reason: string,
  note = "",
  clock: Clock = {},
): RuleResult {
  if (!PARENT_AMOUNTS.includes(amount)) return fail(state, "请选择分值");
  const current = state.students.find((student) => student.id === studentId);
  if (!current) return fail(state, "找不到这位同学");
  const now = clock.now ?? new Date();
  const daily = parentDailyStatus(current, now);
  if (daily.remaining <= 0) return fail(state, "今日 10 分额度已全部用完");
  if (amount > daily.remaining) return fail(state, `今天还可以加 ${daily.remaining} 分`);
  const next = cloneState(state);
  const student = next.students.find((item) => item.id === studentId)!;
  const shot = snapshot(student);
  const events = applyDelta(student, amount, allPets(next), clock.rng ?? Math.random);
  student.parentDaily = { date: daily.date, used: daily.used + amount };
  const text = note.trim() ? `${reason}：${note.trim().slice(0, 30)}` : reason.trim() || "家庭成长";
  const parentLogId = uid("parent");
  next.parentHistory = [
    { id: parentLogId, date: todayKey(now), time: clockTime(now), studentId: student.id, studentName: student.name, delta: amount, reason: text },
    ...next.parentHistory,
  ].slice(0, 40);
  pushEnergy(next, {
    id: uid("energy"),
    date: todayKey(now),
    time: clockTime(now),
    target: student.name,
    delta: amount,
    reason: text,
    undo: { students: [shot], parentLogId },
  });
  return ok(next, `已为${student.name}加上 ${amount} 分`, events);
}

export function applyRoster(state: ClassPetState, drafts: RosterDraft[]): RuleResult {
  const names = drafts.map((draft) => draft.name.trim());
  if (!names.length) return fail(state, "至少保留一位同学");
  if (names.some((name) => !name)) return fail(state, "请填写每位同学的姓名");
  if (new Set(names).size !== names.length) return fail(state, "学生姓名不能重复");
  const growthIds = new Set(growthPets(state).map((pet) => pet.id));
  const next = cloneState(state);
  const existing = new Map(next.students.map((student) => [student.id, student]));
  next.students = drafts.map((draft) => {
    const prev = existing.get(draft.id);
    const student = prev ?? createStudent(draft.name, draft.id.startsWith("new-") ? uid("student") : draft.id);
    student.name = draft.name.trim().slice(0, 20);
    student.parentPassword = draft.parentPassword.trim().slice(0, 20) || DEFAULT_PARENT_PASSWORD;
    const petId = growthIds.has(draft.petId) ? draft.petId : EGG_ID;
    if (!student.ownedPetIds.includes(petId)) student.ownedPetIds.push(petId);
    student.petEnergy[petId] = round(draft.energy, 0, 0, 99999);
    student.petId = petId;
    return student;
  });
  if (!next.students.some((student) => student.id === next.selectedStudentId)) {
    next.selectedStudentId = next.students[0].id;
  }
  return ok(next, "已保存名单");
}

export function addCustomPet(state: ClassPetState, input: CustomPetInput): RuleResult {
  const name = input.name.trim().slice(0, 12);
  const trait = input.trait.trim().slice(0, 10);
  const copy = input.copy.trim().slice(0, 42);
  const image = input.image.trim();
  if (!name || !trait || !copy || !image) return fail(state, "请把宠物资料填完整");
  if (!image.startsWith("data:image/") || image.length > MAX_CUSTOM_IMAGE) return fail(state, "图片需要压到 120KB 以内");
  if (!COLOR_SWATCHES.includes(input.color)) return fail(state, "请选择卡片颜色");
  const next = cloneState(state);
  const id = uid("pet");
  next.customPets = [
    ...next.customPets,
    {
      id,
      speciesId: id,
      stage: "adult",
      name,
      trait,
      price: round(input.price, 180, 0, 9999),
      color: input.color,
      copy,
      customImage: image,
    },
  ];
  return ok(next, `${name}已加入宠物库`);
}

export function removeCustomPet(state: ClassPetState, petId: string): RuleResult {
  if (!state.customPets.some((pet) => pet.id === petId)) return fail(state, "这是内置宠物");
  if (state.students.some((student) => student.petId === petId || student.ownedPetIds.includes(petId))) {
    return fail(state, "还有同学带着它，先在名单里换掉");
  }
  const next = cloneState(state);
  next.customPets = next.customPets.filter((pet) => pet.id !== petId);
  return ok(next, "已从宠物库移除");
}

function stringMap(value: unknown) {
  const record = asRecord(value);
  const out: Record<string, string> = {};
  for (const [key, item] of Object.entries(record)) {
    if (typeof item === "string") out[key] = item;
  }
  return out;
}

function numberMap(value: unknown) {
  const record = asRecord(value);
  const out: Record<string, number> = {};
  for (const [key, item] of Object.entries(record)) {
    if (Number.isFinite(Number(item))) out[key] = Math.max(0, Math.round(Number(item)));
  }
  return out;
}

function sanitizeCustomPet(value: unknown): PetDef | null {
  const row = asRecord(value);
  if (typeof row.id !== "string" || typeof row.name !== "string" || !row.name.trim()) return null;
  if (PET_BY_ID.has(row.id)) return null;
  const image = typeof row.customImage === "string" && row.customImage.startsWith("data:image/") && row.customImage.length <= MAX_CUSTOM_IMAGE ? row.customImage : undefined;
  const color = typeof row.color === "string" && COLOR_SWATCHES.includes(row.color) ? row.color : COLOR_SWATCHES[0];
  return {
    id: row.id,
    speciesId: row.id,
    stage: "adult",
    name: row.name.trim().slice(0, 12),
    trait: typeof row.trait === "string" && row.trait.trim() ? row.trait.trim().slice(0, 10) : "自定义",
    price: round(row.price, 180, 0, 9999),
    color,
    copy: typeof row.copy === "string" && row.copy.trim() ? row.copy.trim().slice(0, 42) : "老师添加的伙伴。",
    customImage: image,
  };
}

function sanitizeStudent(value: unknown, petIds: Set<string>, index: number): Student | null {
  const row = asRecord(value);
  const name = typeof row.name === "string" ? row.name.trim().slice(0, 20) : "";
  if (!name) return null;
  const id = typeof row.id === "string" && row.id.trim() ? row.id.trim() : `student-import-${index + 1}`;
  const growthId = (item: string) => petIds.has(item) && PET_BY_ID.get(item)?.stage !== "skin";
  const owned = Array.isArray(row.ownedPetIds) ? row.ownedPetIds.filter((item): item is string => typeof item === "string" && growthId(item)) : [];
  const skins = Array.isArray(row.ownedSkinIds) ? row.ownedSkinIds.filter((item): item is string => typeof item === "string" && PET_BY_ID.get(item)?.stage === "skin") : [];
  let petId = typeof row.petId === "string" && growthId(row.petId) ? row.petId : "";
  if (!petId) petId = owned[0] || EGG_ID;
  if (!owned.includes(petId)) owned.push(petId);
  const petEnergy = numberMap(row.petEnergy);
  if (petEnergy[petId] == null) petEnergy[petId] = round(row.energy, 0, 0, 99999);
  const applied: Record<string, string> = {};
  for (const [speciesId, skinId] of Object.entries(stringMap(row.appliedSkinBySpecies))) {
    if (skins.includes(skinId) && PET_BY_ID.get(skinId)?.speciesId === speciesId) applied[speciesId] = skinId;
  }
  const daily = asRecord(row.parentDaily);
  return {
    id,
    name,
    petId,
    ownedPetIds: owned,
    ownedSkinIds: skins,
    appliedSkinBySpecies: applied,
    petEnergy,
    coins: round(row.coins, NEW_STUDENT_COINS, 0, 999999),
    hunger: round(row.hunger, 80, 0, 100),
    clean: round(row.clean, 80, 0, 100),
    mood: round(row.mood, 80, 0, 100),
    parentPassword: typeof row.parentPassword === "string" && row.parentPassword.trim() ? row.parentPassword.trim().slice(0, 20) : DEFAULT_PARENT_PASSWORD,
    parentDaily: {
      date: typeof daily.date === "string" ? daily.date : "",
      used: round(daily.used, 0, 0, PARENT_DAILY_CAP),
    },
  };
}

function sanitizeUndo(value: unknown, petIds: Set<string>): EnergyUndo | undefined {
  const row = asRecord(value);
  if (!Array.isArray(row.students)) return undefined;
  const students: UndoStudent[] = [];
  for (const item of row.students) {
    const shot = asRecord(item);
    if (typeof shot.studentId !== "string" || typeof shot.petId !== "string" || !petIds.has(shot.petId)) continue;
    const ownedPetIds = Array.isArray(shot.ownedPetIds) ? shot.ownedPetIds.filter((id): id is string => typeof id === "string" && petIds.has(id)) : [shot.petId];
    const ownedSkinIds = Array.isArray(shot.ownedSkinIds) ? shot.ownedSkinIds.filter((id): id is string => typeof id === "string" && petIds.has(id)) : [];
    const daily = asRecord(shot.parentDaily);
    students.push({
      studentId: shot.studentId,
      petId: shot.petId,
      ownedPetIds: ownedPetIds.includes(shot.petId) ? ownedPetIds : [...ownedPetIds, shot.petId],
      ownedSkinIds,
      appliedSkinBySpecies: stringMap(shot.appliedSkinBySpecies),
      petEnergy: numberMap(shot.petEnergy),
      coins: round(shot.coins, NEW_STUDENT_COINS, 0, 999999),
      hunger: round(shot.hunger, 80, 0, 100),
      clean: round(shot.clean, 80, 0, 100),
      mood: round(shot.mood, 80, 0, 100),
      parentDaily: { date: typeof daily.date === "string" ? daily.date : "", used: round(daily.used, 0, 0, PARENT_DAILY_CAP) },
    });
  }
  if (!students.length) return undefined;
  return { students, parentLogId: typeof row.parentLogId === "string" ? row.parentLogId : undefined };
}

export function normalizeState(raw: unknown): ClassPetState | null {
  const data = asRecord(raw);
  if (!Array.isArray(data.students)) return null;
  const customPets = (Array.isArray(data.customPets) ? data.customPets : []).map(sanitizeCustomPet).filter((pet): pet is PetDef => Boolean(pet)).slice(0, 24);
  const petIds = new Set([...BUILT_IN_PETS.map((pet) => pet.id), ...customPets.map((pet) => pet.id)]);
  const students: Student[] = [];
  const seen = new Set<string>();
  data.students.slice(0, 80).forEach((item, index) => {
    const student = sanitizeStudent(item, petIds, index);
    if (!student || seen.has(student.id) || seen.has(student.name)) return;
    seen.add(student.id);
    seen.add(student.name);
    students.push(student);
  });
  if (!students.length) return null;
  const selected = typeof data.selectedStudentId === "string" && students.some((student) => student.id === data.selectedStudentId) ? data.selectedStudentId : students[0].id;
  const history: EnergyLog[] = [];
  if (Array.isArray(data.history)) {
    for (const item of data.history) {
      const row = asRecord(item);
      if (typeof row.target !== "string" || !Number.isFinite(Number(row.delta))) continue;
      history.push({
        id: typeof row.id === "string" ? row.id : uid("energy"),
        date: typeof row.date === "string" ? row.date : "",
        time: typeof row.time === "string" ? row.time : "",
        target: row.target.slice(0, 20),
        delta: Math.round(Number(row.delta)),
        reason: typeof row.reason === "string" ? row.reason.slice(0, 40) : "",
        undo: sanitizeUndo(row.undo, petIds),
      });
      if (history.length >= 40) break;
    }
  }
  const parentHistory: ParentLog[] = [];
  if (Array.isArray(data.parentHistory)) {
    for (const item of data.parentHistory) {
      const row = asRecord(item);
      if (typeof row.studentId !== "string" || !Number.isFinite(Number(row.delta))) continue;
      parentHistory.push({
        id: typeof row.id === "string" ? row.id : uid("parent"),
        date: typeof row.date === "string" ? row.date : "",
        time: typeof row.time === "string" ? row.time : "",
        studentId: row.studentId,
        studentName: typeof row.studentName === "string" ? row.studentName : "",
        delta: Math.round(Number(row.delta)),
        reason: typeof row.reason === "string" ? row.reason.slice(0, 40) : "",
      });
      if (parentHistory.length >= 40) break;
    }
  }
  const className = typeof data.className === "string" && data.className.trim() ? data.className.trim().slice(0, 20) : "三年二班";
  return { version: 1, className, students, customPets, selectedStudentId: selected, history, parentHistory };
}
