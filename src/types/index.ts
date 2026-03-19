// ─── Core data types ──────────────────────────────────────────────────────────

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type SymptomType = 'nausea' | 'bloating' | 'pain' | 'diarrhea' | 'constipation';

export type Severity = 1 | 2 | 3;

export type FodmapTag =
  | 'dairy'     // 🥛 乳制品
  | 'gluten'    // 🍞 面食
  | 'egg'       // 🥚 鸡蛋
  | 'spicy'     // 🌶️ 辣
  | 'seafood'   // 🦐 海鲜
  | 'cold'      // 🧊 生冷
  | 'soy'       // 🫘 豆制品
  | 'alcohol'   // 🍺 酒精
  | 'coffee'    // ☕ 咖啡
  | 'fatty'     // 🧈 高油
  | 'garlic'    // 🧄 葱蒜
  | 'fructose'; // 🍎 高果糖

export type ExternalFactorType =
  | 'sleep_poor'
  | 'sleep_good'
  | 'cold_exposure'
  | 'stress'
  | 'menstrual';

export type DayStatus = 'good' | 'bad' | null;

export type ExperimentStatus = 'active' | 'paused' | 'completed';

export type ExperimentResult = 'effective' | 'not_effective' | 'uncertain';
export type InvestigationStrategy = 'substitution' | 'exclusion';

// ─── Data structures ───────────────────────────────────────────────────────────

export interface UserProfile {
  gender: 'male' | 'female' | 'skip';
  trackMenstrual: boolean;
  cycleLength: number; // default 28
  lastPeriodStart?: string; // YYYY-MM-DD
  onboardingDone: boolean;
  safeFoods?: FodmapTag[]; // Whitelisted foods
}

export interface Symptom {
  id: string;
  type: SymptomType;
  time: string; // HH:MM
  severity: Severity;
}

export interface Meal {
  id: string;
  type: MealType;
  time: string; // HH:MM
  tags: FodmapTag[];
  notes: string;
}

export interface ExternalFactor {
  type: ExternalFactorType;
  date: string; // YYYY-MM-DD
}

export interface DayRecord {
  date: string; // YYYY-MM-DD — primary key
  status: DayStatus;
  symptoms: Symptom[];
  meals: Meal[];
  externalFactors: ExternalFactor[];
  aiConclusion: string | null;
  aiMascotComment: string | null;
  analysisKey: string | null;
  isMenstrual: boolean;
}

export interface ExperimentDayLog {
  date: string;
  status: DayStatus;
}

export interface Experiment {
  id: string;
  food: FodmapTag;
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  durationDays: number; // planned days, default 7
  status: ExperimentStatus;
  strategy: InvestigationStrategy;
  result?: ExperimentResult;
  dailyLog: ExperimentDayLog[];
  aiSuggested: boolean;
}

// ─── UI helpers ────────────────────────────────────────────────────────────────

export const FODMAP_META: Record<FodmapTag, { emoji: string; label: string; category: string }> = {
  dairy:    { emoji: '🥛', label: '乳制品', category: 'D类' },
  gluten:   { emoji: '🍞', label: '面食',   category: 'O类' },
  egg:      { emoji: '🥚', label: '鸡蛋',   category: '' },
  spicy:    { emoji: '🌶️', label: '辣',     category: '' },
  seafood:  { emoji: '🦐', label: '海鲜',   category: '' },
  cold:     { emoji: '🧊', label: '生冷',   category: '' },
  soy:      { emoji: '🫘', label: '豆制品', category: '' },
  alcohol:  { emoji: '🍺', label: '酒精',   category: '' },
  coffee:   { emoji: '☕', label: '咖啡',   category: '' },
  fatty:    { emoji: '🧈', label: '高油',   category: '' },
  garlic:   { emoji: '🧄', label: '葱蒜',   category: 'O类' },
  fructose: { emoji: '🍎', label: '高果糖', category: 'M类' },
};

export const SYMPTOM_META: Record<SymptomType, { emoji: string; label: string }> = {
  nausea:      { emoji: '🤢', label: '恶心' },
  bloating:    { emoji: '💨', label: '胀气' },
  pain:        { emoji: '😣', label: '肚子疼' },
  diarrhea:    { emoji: '🚽', label: '腹泻' },
  constipation:{ emoji: '😖', label: '便秘' },
};

export const MEAL_META: Record<MealType, { emoji: string; label: string; defaultTime: string }> = {
  breakfast: { emoji: '🌅', label: '早餐', defaultTime: '08:00' },
  lunch:     { emoji: '☀️', label: '午餐', defaultTime: '12:00' },
  dinner:    { emoji: '🌙', label: '晚餐', defaultTime: '18:30' },
  snack:     { emoji: '🍊', label: '加餐', defaultTime: '15:00' },
};

export interface InvestigationPlan {
  food: FodmapTag;
  reason: string;
  substitution: {
    label: string;
    description: string;
  };
  exclusion: {
    label: string;
    description: string;
  };
}

export const FOOD_INVESTIGATION_META: Record<FodmapTag, InvestigationPlan> = {
  dairy: {
    food: 'dairy',
    reason: '乳制品中的乳糖是常见的渗透性腹泻诱因。',
    substitution: { label: '换成舒化奶/酸奶', description: '这类产品乳糖含量极低，适合轻中度不耐受。' },
    exclusion: { label: '完全戒断乳制品', description: '排除所有含奶制品，观察是否明显好转。' },
  },
  gluten: {
    food: 'gluten',
    reason: '面食中的麸质和果聚糖可能导致肠道产气。',
    substitution: { label: '换成大米/燕麦面', description: '尝试替代麸质摄入，降低肠道压力。' },
    exclusion: { label: '完全戒断面食', description: '严格无麸质饮食，适合高度怀疑者。' },
  },
  garlic: {
    food: 'garlic',
    reason: '葱蒜含极高浓度果聚糖，即使少量也可能引发胀气。',
    substitution: { label: '只用葱油/蒜油', description: '香味在油脂中，而诱发不适的成分不溶于油。' },
    exclusion: { label: '完全戒掉葱蒜', description: '社交挑战者模式，最彻底的排查。' },
  },
  soy: {
    food: 'soy',
    reason: '豆制品含有较多低聚糖。',
    substitution: { label: '换成老豆腐', description: '制作过程中大部分低聚糖已随水流失。' },
    exclusion: { label: '完全戒掉豆制品', description: '排除豆浆、豆腐脑等所有豆类制品。' },
  },
  fructose: {
    food: 'fructose',
    reason: '某些水果过高的果糖可能导致吸收障碍。',
    substitution: { label: '换成蓝莓/草莓', description: '选低果糖水果，控制单次摄入量。' },
    exclusion: { label: '限制高果糖水果', description: '暂停食用苹果、梨、芒果等高果糖水果。' },
  },
  spicy: {
    food: 'spicy',
    reason: '辣椒素会加速肠道蠕动，直接刺激肠壁。',
    substitution: { label: '降低辣度/用花椒', description: '用麻味或极微辣代替重辣。' },
    exclusion: { label: '完全无辣饮食', description: '严格清淡饮食，给肠道一个恢复期。' },
  },
  cold: {
    food: 'cold',
    reason: '生冷食物可能诱发肠道平滑肌痉挛。',
    substitution: { label: '改吃室温食物', description: '避免冰镇饮品，提前取出放置。' },
    exclusion: { label: '完全温热饮食', description: '只吃煮熟和温热的食物。' },
  },
  fatty: {
    food: 'fatty',
    reason: '高油脂饮食会刺激胆汁分泌，加速排便。',
    substitution: { label: '改蒸/煮/烤', description: '减少烹饪用油，尝试清淡口味。' },
    exclusion: { label: '完全低脂饮食', description: '严格控制油脂摄入，观察腹泻频率。' },
  },
  coffee: {
    food: 'coffee',
    reason: '咖啡因会显著增强肠道蠕动。',
    substitution: { label: '换成奶咖/稀释', description: '尝试降低浓度或分段饮用。' },
    exclusion: { label: '完全戒断咖啡', description: '寻找无咖啡因替代品，彻底排除干扰。' },
  },
  alcohol: {
    food: 'alcohol',
    reason: '酒精会直接损害肠粘膜屏障。',
    substitution: { label: '换成无酒精特调', description: '保留社交体验，去除有害成分。' },
    exclusion: { label: '完全戒酒', description: '严格禁酒，观察肠道修复情况。' },
  },
  egg: {
    food: 'egg',
    reason: '部分人群对鸡蛋蛋白存在迟发性过敏。',
    substitution: { label: '只吃蛋黄/减量', description: '蛋白通常是主要的致敏原。' },
    exclusion: { label: '完全戒掉鸡蛋', description: '排除所有含蛋食品，进行深度测试。' },
  },
  seafood: {
    food: 'seafood',
    reason: '海鲜中的组胺或异体蛋白可能是诱因。',
    substitution: { label: '换成淡水鱼类', description: '尝试过敏原较低的蛋白质来源。' },
    exclusion: { label: '完全戒掉海鲜', description: '暂停所有贝类、虾蟹和海鱼。' },
  },
};
