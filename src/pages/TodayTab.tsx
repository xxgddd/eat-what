import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore } from '../store/useAppStore';
import { analyzeDay } from '../services/deepseek';
import { MEAL_META, FODMAP_META, type MealType, type DayStatus } from '../types';
import { Mascot, type MascotMood } from '../components/Mascot';
import { SymptomPicker } from '../components/SymptomPicker';
import { MealLogger } from '../components/MealLogger';
import { FollowUpQuestion } from '../components/FollowUpQuestion';

const REAL_TODAY = format(new Date(), 'yyyy-MM-dd');
const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

// ── AI trigger debounce ──────────────────────────────────────────────────────

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

// ── Component ────────────────────────────────────────────────────────────────

export function TodayTab() {
  const store = useAppStore();
  const [viewDate, setViewDate] = useState(REAL_TODAY);
  const today = store.records[viewDate] ?? store.getOrCreateDay(viewDate);

  const [openMeal, setOpenMeal] = useState<MealType | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [followUpDismissed, setFollowUpDismissed] = useState(false);
  const aiTriggeredRef = useRef<string>(''); // tracks last trigger hash

  // Mascot state
  const mascotMood: MascotMood =
    today.status === 'good'
      ? 'happy'
      : today.status === 'bad'
      ? 'concerned'
      : isAnalyzing
      ? 'thinking'
      : 'idle';

  const mascotSpeech: string | null = isAnalyzing
    ? '正在全速脑补你的肠胃现场...'
    : today.aiMascotComment
    ? today.aiMascotComment
    : today.aiConclusion
    ? today.aiConclusion // fallback
    : today.status === null
    ? '今天打算给肠胃君安排点啥？🤔'
    : today.status === 'bad'
    ? '看来刚才那顿饭不太对劲，我来抓真凶 🔍'
    : '状态不错！是乖乖吃草了还是今天运气好？✨';

  // ── Trigger AI analysis ────────────────────────────────────────────────────

  const triggerKey = JSON.stringify({
    status: today.status,
    mealCount: today.meals.length,
    tagCount: today.meals.flatMap((m) => m.tags).length,
  });

  const debouncedKey = useDebounce(triggerKey, 2000);

  const runAnalysis = useCallback(async () => {
    if (today.status === null) return;
    if (today.meals.length === 0 && today.status === 'good') return;
    if (today.analysisKey === debouncedKey) return;
    if (aiTriggeredRef.current === debouncedKey) return;
    aiTriggeredRef.current = debouncedKey;

    setIsAnalyzing(true);
    try {
      const records = store.recentRecords(14);
      const yesterdayDate = format(new Date(new Date(viewDate).getTime() - 86400000), 'yyyy-MM-dd');
      const yesterday = records.find((r) => r.date === yesterdayDate) ?? null;
      const history = records.filter((r) => r.date !== viewDate);
      const result = await analyzeDay(today, yesterday, history, store.experiments, store.profile.safeFoods);
      store.setAiAnalysis(viewDate, result.formal, result.witty, debouncedKey);
      store.syncExperimentDayLogs();
    } finally {
      setIsAnalyzing(false);
    }
  }, [debouncedKey, viewDate]); // eslint-disable-line

  useEffect(() => {
    runAnalysis();
  }, [debouncedKey]); // eslint-disable-line

  // ── Handlers ───────────────────────────────────────────────────────────────

  const setStatus = (s: DayStatus) => {
    store.setDayStatus(viewDate, s);
    setFollowUpDismissed(false);
    aiTriggeredRef.current = '';
  };

  // ── Date display ───────────────────────────────────────────────────────────

  const dateLabel = format(new Date(viewDate + 'T00:00:00'), 'M月d日 EEEE', { locale: zhCN });
  const isToday = viewDate === REAL_TODAY;

  const changeDate = (offset: number) => {
    const d = new Date(viewDate + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    setViewDate(format(d, 'yyyy-MM-dd'));
    setFollowUpDismissed(false);
    aiTriggeredRef.current = '';
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="scroll-area">
      <div className="px-5 pt-7 space-y-5">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <label className="relative cursor-pointer group">
                <p className="text-[11px] font-bold text-[#A09A92] uppercase tracking-[0.12em] group-hover:text-green-primary transition-colors">
                  {dateLabel} ▾
                </p>
                <input
                  type="date"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  value={viewDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      setViewDate(e.target.value);
                      setFollowUpDismissed(false);
                      aiTriggeredRef.current = '';
                    }
                  }}
                  max={REAL_TODAY}
                />
              </label>
              {!isToday && (
                <span className="text-[10px] bg-terra-pale text-terra px-2 py-0.5 rounded-lg font-bold">
                  补录中
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-[1.65rem] font-extrabold text-[#1A1A1A] tracking-tight">
                {isToday ? '今日追踪' : '追踪记录'}
              </h1>
              <div className="flex gap-0.5 bg-[#EFEBE3] p-1 rounded-xl">
                <button
                  onClick={() => changeDate(-1)}
                  className="w-8 h-8 flex items-center justify-center rounded-[10px] hover:bg-white/80 active:scale-90 transition-all"
                >
                  <span className="text-xs text-[#8A8580]">◀</span>
                </button>
                <button
                  onClick={() => changeDate(1)}
                  disabled={isToday}
                  className={`w-8 h-8 flex items-center justify-center rounded-[10px] transition-all
                    ${isToday ? 'opacity-25' : 'hover:bg-white/80 active:scale-90'}`}
                >
                  <span className="text-xs text-[#8A8580]">▶</span>
                </button>
              </div>
            </div>
          </div>
          <Mascot mood={mascotMood} speech={mascotSpeech} size="sm" />
        </div>

        {/* ── Status picker ── */}
        <div className="card">
          <p className="section-title">今天感觉怎么样？</p>
          <div className="flex gap-3">
            <button
              id="status-good"
              onClick={() => setStatus('good')}
              className={`flex-1 py-5 rounded-[18px] flex flex-col items-center gap-1.5
                          transition-all duration-200 active:scale-[0.96] font-bold
                          ${today.status === 'good'
                            ? 'status-good'
                            : 'border-[1.5px] border-[#E5E0D8] bg-[#FAFAF8] text-[#8A8580] hover:border-green-light hover:bg-green-pale/30'
                          }`}
            >
              <span className="text-2xl">{today.status === 'good' ? '😊' : '✅'}</span>
              <span className="text-[13px]">没事</span>
            </button>
            <button
              id="status-bad"
              onClick={() => setStatus('bad')}
              className={`flex-1 py-5 rounded-[18px] flex flex-col items-center gap-1.5
                          transition-all duration-200 active:scale-[0.96] font-bold
                          ${today.status === 'bad'
                            ? 'status-bad'
                            : 'border-[1.5px] border-[#E5E0D8] bg-[#FAFAF8] text-[#8A8580] hover:border-terra-light hover:bg-terra-pale/30'
                          }`}
            >
              <span className="text-2xl">{today.status === 'bad' ? '😣' : '🤕'}</span>
              <span className="text-[13px]">有问题</span>
            </button>
          </div>

          {/* Symptom picker — expands when bad */}
          {today.status === 'bad' && (
            <div className="mt-5 pt-5 border-t border-[#F0EBE3]">
              <SymptomPicker date={viewDate} />
            </div>
          )}
        </div>

        {/* ── Follow-up question ── */}
        {!followUpDismissed && today.status === 'bad' && (
          <FollowUpQuestion
            date={viewDate}
            onAnswered={() => setFollowUpDismissed(true)}
          />
        )}

        {/* ── Meal timeline ── */}
        <div className="card">
          <p className="section-title">今日餐次</p>
          <div className="space-y-1">
            {MEAL_ORDER.map((mealType, idx) => {
              const meta = MEAL_META[mealType];
              const meal = today.meals.find((m) => m.type === mealType);
              const isLast = idx === MEAL_ORDER.length - 1;

              return (
                <div key={mealType}>
                  <button
                    id={`meal-${mealType}`}
                    className="w-full flex items-center gap-3 py-3.5 rounded-[16px] px-2
                               hover:bg-[#F6F2EC]/60 active:scale-[0.98] transition-all text-left group"
                    onClick={() => setOpenMeal(mealType)}
                  >
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center self-stretch">
                      <div className={`meal-dot ${meal ? 'filled' : ''}`} />
                      {!isLast && <div className="meal-line mt-1" />}
                    </div>

                    {/* Meal icon */}
                    <div
                      className={`w-11 h-11 rounded-[14px] flex items-center justify-center text-xl flex-shrink-0 transition-all
                                  ${meal ? 'bg-[#E2EDDF] shadow-sm' : 'bg-[#EFEBE3]'}`}
                    >
                      {meta.emoji}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-[#1A1A1A]">{meta.label}</p>
                      {meal && meal.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {meal.tags.slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className="text-[11px] bg-[#E2EDDF] text-[#2E5638] px-2 py-0.5 rounded-lg font-semibold"
                            >
                              {FODMAP_META[tag].emoji} {FODMAP_META[tag].label}
                            </span>
                          ))}
                          {meal.tags.length > 4 && (
                            <span className="text-[11px] text-[#B0AAA2]">
                              +{meal.tags.length - 4}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-[#B0AAA2] mt-0.5 font-medium">
                          {meal ? '已记录（无标签）' : '点击记录'}
                        </p>
                      )}
                    </div>

                    {/* Arrow */}
                    <span className="text-[#C8C2B8] text-sm group-hover:text-[#8A8580] transition-colors">›</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── AI analysis card ── */}
        {(today.status !== null || today.aiConclusion) && (
          <div className="ai-card animate-fade-up">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-[8px] bg-[#4A7C59]/10 flex items-center justify-center">
                <span className="text-xs">🔍</span>
              </div>
              <p className="text-[11px] font-bold text-[#3D6B4A] uppercase tracking-[0.1em]">
                侦探结论
              </p>
              {!isAnalyzing && (
                <button
                  id="reanalyze"
                  className="ml-auto text-[11px] text-[#4A7C59] font-bold hover:opacity-70 transition-opacity"
                  onClick={() => {
                    aiTriggeredRef.current = '';
                    runAnalysis();
                  }}
                >
                  ↻ 重新分析
                </button>
              )}
            </div>

            {isAnalyzing ? (
              <div className="flex items-center gap-2.5 py-1">
                <span className="loading-dot" />
                <span className="loading-dot" />
                <span className="loading-dot" />
                <span className="text-[13px] text-[#6B6560] ml-1">正在分析...</span>
              </div>
            ) : (
              <p className="text-[13px] font-semibold text-[#2D2D2D] leading-relaxed">
                {today.aiConclusion ?? '记录完成后自动分析'}
              </p>
            )}
          </div>
        )}

        {/* Bottom padding */}
        <div className="h-4" />
      </div>

      {/* ── Meal logger bottom sheet ── */}
      {openMeal && (
        <MealLogger
          date={viewDate}
          mealType={openMeal}
          existingMeal={today.meals.find((m) => m.type === openMeal)}
          onClose={() => {
            setOpenMeal(null);
            aiTriggeredRef.current = '';
          }}
        />
      )}

      {/* ── Scientific footer ── */}
      <footer className="px-6 py-8 text-center">
        <p className="text-[10px] text-ink-muted leading-relaxed max-w-[240px] mx-auto opacity-60">
          基于 Monash 大学 FODMAP 理论及 IBS 肠道管理实践<br />
          数据存储在本地，AI 分析由 DeepSeek 提供技术支持
        </p>
      </footer>
    </div>
  );
}
