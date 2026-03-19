import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';
import type {
  UserProfile,
  DayRecord,
  Experiment,
  Symptom,
  Meal,
  ExternalFactor,
  FodmapTag,
  DayStatus,
  ExperimentResult,
  InvestigationStrategy,
} from '../types';

// ─── Helper ────────────────────────────────────────────────────────────────────

const today = () => format(new Date(), 'yyyy-MM-dd');

const emptyDay = (date: string): DayRecord => ({
  date,
  status: null,
  symptoms: [],
  meals: [],
  externalFactors: [],
  aiConclusion: null,
  aiMascotComment: null,
  analysisKey: null,
  isMenstrual: false,
});

// ─── Store shape ───────────────────────────────────────────────────────────────

interface AppState {
  profile: UserProfile;
  records: Record<string, DayRecord>; // keyed by YYYY-MM-DD
  experiments: Experiment[];

  // Profile actions
  setProfile: (p: Partial<UserProfile>) => void;
  completeOnboarding: () => void;
  toggleSafeFood: (food: FodmapTag) => void;

  // Day record actions
  getOrCreateDay: (date?: string) => DayRecord;
  setDayStatus: (date: string, status: DayStatus) => void;
  addSymptom: (date: string, symptom: Omit<Symptom, 'id'>) => void;
  removeSymptom: (date: string, id: string) => void;
  upsertMeal: (date: string, meal: Meal) => void;
  removeMeal: (date: string, mealId: string) => void;
  addExternalFactor: (date: string, factor: ExternalFactor) => void;
  setAiAnalysis: (date: string, conclusion: string, mascotComment: string, key: string) => void;
  setMenstrual: (date: string, val: boolean) => void;
  deleteDay: (date: string) => void;

  // Experiment actions
  createExperiment: (food: FodmapTag, durationDays?: number, aiSuggested?: boolean, strategy?: InvestigationStrategy) => void;
  updateExperimentStatus: (id: string, status: Experiment['status']) => void;
  finishExperiment: (id: string, result: ExperimentResult) => void;
  syncExperimentDayLogs: () => void;

  // Derived getters
  todayRecord: () => DayRecord;
  recentRecords: (n?: number) => DayRecord[];
  suspectFoods: () => { food: FodmapTag; count: number }[];
  activeExperiments: () => Experiment[];
}

// ─── Zustand store ─────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      profile: {
        gender: 'skip',
        trackMenstrual: false,
        cycleLength: 28,
        onboardingDone: false,
        safeFoods: [],
      },
      records: {},
      experiments: [],

      // ── Profile ────────────────────────────────────────────────────────────
      setProfile: (p) =>
        set((s) => ({ profile: { ...s.profile, ...p } })),

      completeOnboarding: () =>
        set((s) => ({ profile: { ...s.profile, onboardingDone: true } })),
        
      toggleSafeFood: (food) =>
        set((s) => {
          const safe = s.profile.safeFoods || [];
          const newSafe = safe.includes(food) ? safe.filter(f => f !== food) : [...safe, food];
          return { profile: { ...s.profile, safeFoods: newSafe } };
        }),

      // ── Day record ─────────────────────────────────────────────────────────
      getOrCreateDay: (date = today()) => {
        const existing = get().records[date];
        if (existing) return existing;
        const fresh = emptyDay(date);
        set((s) => ({ records: { ...s.records, [date]: fresh } }));
        return fresh;
      },

      setDayStatus: (date, status) =>
        set((s) => {
          const rec = s.records[date] ?? emptyDay(date);
          return { records: { ...s.records, [date]: { ...rec, status } } };
        }),

      addSymptom: (date, symptom) =>
        set((s) => {
          const rec = s.records[date] ?? emptyDay(date);
          const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          return {
            records: {
              ...s.records,
              [date]: { ...rec, symptoms: [...rec.symptoms, { ...symptom, id }] },
            },
          };
        }),

      removeSymptom: (date, id) =>
        set((s) => {
          const rec = s.records[date];
          if (!rec) return {};
          return {
            records: {
              ...s.records,
              [date]: { ...rec, symptoms: rec.symptoms.filter((sx) => sx.id !== id) },
            },
          };
        }),

      upsertMeal: (date, meal) =>
        set((s) => {
          const rec = s.records[date] ?? emptyDay(date);
          const exists = rec.meals.find((m) => m.id === meal.id);
          const meals = exists
            ? rec.meals.map((m) => (m.id === meal.id ? meal : m))
            : [...rec.meals, meal];
          return { records: { ...s.records, [date]: { ...rec, meals } } };
        }),

      removeMeal: (date, mealId) =>
        set((s) => {
          const rec = s.records[date];
          if (!rec) return {};
          return {
            records: {
              ...s.records,
              [date]: { ...rec, meals: rec.meals.filter((m) => m.id !== mealId) },
            },
          };
        }),

      addExternalFactor: (date, factor) =>
        set((s) => {
          const rec = s.records[date] ?? emptyDay(date);
          const already = rec.externalFactors.find((f) => f.type === factor.type);
          if (already) return {};
          return {
            records: {
              ...s.records,
              [date]: { ...rec, externalFactors: [...rec.externalFactors, factor] },
            },
          };
        }),

      setAiAnalysis: (date, conclusion, mascotComment, key) =>
        set((s) => {
          const rec = s.records[date] ?? emptyDay(date);
          return {
            records: {
              ...s.records,
              [date]: { ...rec, aiConclusion: conclusion, aiMascotComment: mascotComment, analysisKey: key },
            },
          };
        }),

      setMenstrual: (date, val) =>
        set((s) => {
          const rec = s.records[date] ?? emptyDay(date);
          return { records: { ...s.records, [date]: { ...rec, isMenstrual: val } } };
        }),

      deleteDay: (date) =>
        set((s) => {
          const newRecords = { ...s.records };
          delete newRecords[date];
          return { records: newRecords };
        }),

      // ── Experiments ────────────────────────────────────────────────────────
      createExperiment: (food, durationDays = 7, aiSuggested = false, strategy = 'substitution') => {
        const active = get().experiments.filter((e) => e.status === 'active');
        if (active.length >= 2) return; // max 2 concurrent
        const id = `exp-${Date.now()}`;
        const startDate = today();
        const newExp: Experiment = {
          id,
          food,
          startDate,
          durationDays,
          status: 'active',
          strategy,
          dailyLog: [],
          aiSuggested,
        };
        set((s) => ({ experiments: [...s.experiments, newExp] }));
      },

      updateExperimentStatus: (id, status) =>
        set((s) => ({
          experiments: s.experiments.map((e) => (e.id === id ? { ...e, status } : e)),
        })),

      finishExperiment: (id, result) =>
        set((s) => ({
          experiments: s.experiments.map((e) =>
            e.id === id ? { ...e, status: 'completed', result, endDate: today() } : e
          ),
        })),

      // Sync today's status into active experiments' daily logs
      syncExperimentDayLogs: () => {
        const todayStr = today();
        const todayRec = get().records[todayStr];
        if (!todayRec) return;
        set((s) => ({
          experiments: s.experiments.map((e) => {
            if (e.status !== 'active') return e;
            const alreadyLogged = e.dailyLog.find((d) => d.date === todayStr);
            if (alreadyLogged) return e;
            return {
              ...e,
              dailyLog: [...e.dailyLog, { date: todayStr, status: todayRec.status }],
            };
          }),
        }));
      },

      // ── Derived ────────────────────────────────────────────────────────────
      todayRecord: () => get().records[today()] ?? emptyDay(today()),

      recentRecords: (n = 14) => {
        const all = Object.values(get().records).sort((a, b) =>
          b.date.localeCompare(a.date)
        );
        return all.slice(0, n);
      },

      suspectFoods: () => {
        const records = Object.values(get().records);
        const safeFoods = get().profile.safeFoods || [];
        const counts: Partial<Record<FodmapTag, number>> = {};
        for (const rec of records) {
          if (rec.status !== 'bad') continue;
          const tags = rec.meals.flatMap((m) => m.tags);
          const unique = [...new Set(tags)] as FodmapTag[];
          for (const tag of unique) {
            if (safeFoods.includes(tag)) continue;
            counts[tag] = (counts[tag] ?? 0) + 1;
          }
        }
        return (Object.entries(counts) as [FodmapTag, number][])
          .sort((a, b) => b[1] - a[1])
          .map(([food, count]) => ({ food, count }));
      },

      activeExperiments: () => get().experiments.filter((e) => e.status === 'active'),
    }),
    {
      name: 'gut-detective-store',
    }
  )
);
