import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { useAppStore } from '../store/useAppStore';
import { FODMAP_META, FOOD_INVESTIGATION_META, type FodmapTag, type ExperimentResult } from '../types';

const TODAY = format(new Date(), 'yyyy-MM-dd');

// ── Result labels ──────────────────────────────────────────────────────────

const RESULT_META: Record<ExperimentResult, { label: string; color: string }> = {
  effective:     { label: '✅ 有效',     color: 'text-green-primary bg-green-pale' },
  not_effective: { label: '❌ 没效果',   color: 'text-ink-secondary bg-ivory-200' },
  uncertain:     { label: '🤷 不确定',   color: 'text-terra bg-terra-pale' },
};

// ── Lab Tab ────────────────────────────────────────────────────────────────

export function LabTab() {
  const store = useAppStore();
  const active = store.activeExperiments();
  const suspects = store.suspectFoods().slice(0, 5);
  const completed = store.experiments.filter((e) => e.status === 'completed');
  const [showArchive, setShowArchive] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [investigationFood, setInvestigationFood] = useState<FodmapTag | null>(null);

  return (
    <div className="scroll-area">
      <div className="px-4 pt-6 space-y-6">

        {/* ── Header ── */}
        <div>
          <h1 className="text-2xl font-extrabold text-ink">实验室</h1>
          <p className="text-sm text-ink-muted mt-1">
            跟身体谈谈判，找出你的饮食真相 🔬
          </p>
        </div>

        {/* ── Active experiments ── */}
        <section>
          <p className="section-title mb-3">
            进行中实验 ({active.length}/2)
          </p>

          {active.length === 0 ? (
            <div className="card text-center py-8 border-2 border-dashed border-ivory-300">
              <p className="text-3xl mb-2">🧪</p>
              <p className="text-sm text-ink-secondary font-medium">
                还没有进行中的实验
              </p>
              <p className="text-xs text-ink-muted mt-1">
                从下方选择一个可疑食物开始
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {active.map((exp) => {
                const days = differenceInDays(new Date(TODAY), new Date(exp.startDate));
                const progress = Math.min(days, exp.durationDays);
                const pct = Math.round((progress / exp.durationDays) * 100);
                const meta = FODMAP_META[exp.food];

                return (
                  <div key={exp.id} className="experiment-card">
                    {/* Card header */}
                    <div className="experiment-card-header">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-[14px] flex items-center justify-center text-2xl shadow-soft">
                          {meta.emoji}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-ink">
                            {exp.strategy === 'substitution' ? '替换' : '戒断'} {meta.label}
                          </p>
                          <p className="text-xs text-ink-muted mt-0.5">
                            第 {progress + 1} 天 / 共 {exp.durationDays} 天
                          </p>
                        </div>
                        <span className="text-lg font-extrabold text-green-primary">
                          {pct}%
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="suspect-bar-bg mt-3">
                        <div className="suspect-bar" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    {/* Daily log dots */}
                    <div className="px-4 py-3">
                      <p className="text-xs text-ink-muted mb-2">每日状态</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {Array.from({ length: exp.durationDays }).map((_, i) => {
                          const log = exp.dailyLog[i];
                          const mood = log?.status === 'good'
                            ? 'good'
                            : log?.status === 'bad'
                            ? 'bad'
                            : 'empty';
                          const emoji = mood === 'good' ? '😊' : mood === 'bad' ? '😖' : '─';
                          return (
                            <div key={i} className={`day-dot ${mood}`}>
                              {emoji}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 px-4 pb-4">
                      <button
                        className="flex-1 py-2.5 rounded-2xl border-2 border-ivory-300 text-sm
                                   font-semibold text-ink-secondary hover:border-ink-muted transition-colors"
                        onClick={() => store.updateExperimentStatus(exp.id, 'paused')}
                      >
                        暂停
                      </button>
                      <FinishButton
                        onFinish={(result) => store.finishExperiment(exp.id, result)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── AI suggested / new ── */}
        {suspects.length > 0 && active.length < 2 && (
          <section>
            <p className="section-title mb-3">侦探建议</p>
            <div className="space-y-2">
              {suspects
                .filter((s) => !active.some((e) => e.food === s.food))
                .slice(0, 3)
                .map(({ food, count }) => {
                  const meta = FODMAP_META[food];
                  const danger = count >= 3;
                  return (
                    <div
                      key={food}
                      className={`card flex items-center gap-3 ${danger ? 'border-2 border-terra-light' : ''}`}
                    >
                      <div className={`w-11 h-11 rounded-[13px] flex items-center justify-center text-xl
                                      ${danger ? 'bg-terra-pale' : 'bg-ivory-200'}`}>
                        {meta.emoji}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-ink text-sm">{meta.label}</p>
                        <p className={`text-xs mt-0.5 ${danger ? 'text-terra font-semibold' : 'text-ink-muted'}`}>
                          {danger ? '🔴' : '🟡'} {count} 次异常关联
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5 ml-2">
                        <button
                          id={`investigate-${food}`}
                          onClick={() => setInvestigationFood(food)}
                          className="pill pill-green text-xs px-3 py-1.5"
                        >
                          查个明白
                        </button>
                        <button
                          onClick={() => store.toggleSafeFood(food)}
                          className="w-full py-1 text-[10px] text-ink-muted hover:text-green-dark border border-ivory-300 rounded-[10px] transition-colors"
                        >
                          赦免(白名单)
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {/* ── Manual create ── */}
        {active.length < 2 && (
          <section>
            <button
              id="create-experiment"
              className="w-full py-4 rounded-3xl border-2 border-dashed border-ivory-300
                         text-ink-secondary text-sm font-semibold hover:border-green-primary
                         hover:text-green-primary transition-colors flex items-center justify-center gap-2"
              onClick={() => setShowCreate(!showCreate)}
            >
              <span>＋</span>
              <span>自定义实验</span>
            </button>

            {showCreate && (
              <CreateExperimentPanel
                onCreated={() => setShowCreate(false)}
                existingFoods={active.map((e) => e.food)}
              />
            )}
          </section>
        )}

        {/* ── Completed archive ── */}
        {completed.length > 0 && (
          <section>
            <button
              className="w-full flex items-center justify-between py-2"
              onClick={() => setShowArchive(!showArchive)}
            >
              <p className="section-title">已完成实验 ({completed.length})</p>
              <span className="text-ink-muted text-sm">{showArchive ? '▲' : '▼'}</span>
            </button>

            {showArchive && (
              <div className="space-y-2 mt-2 animate-fade-up">
                {completed.map((exp) => {
                  const meta = FODMAP_META[exp.food];
                  const result = exp.result ? RESULT_META[exp.result] : null;
                  return (
                    <div key={exp.id} className="card flex items-center gap-3">
                      <div className="w-10 h-10 bg-ivory-200 rounded-[12px] flex items-center justify-center text-xl">
                        {meta.emoji}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-ink">{meta.label}</p>
                        <p className="text-xs text-ink-muted">{exp.startDate} · {exp.durationDays}天</p>
                      </div>
                      {result && (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${result.color}`}>
                          {result.label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── Whitelist ── */}
        {(store.profile.safeFoods?.length || 0) > 0 && (
          <section>
            <p className="section-title mb-3">安全白名单 (不会被怀疑)</p>
            <div className="flex flex-wrap gap-2">
              {store.profile.safeFoods?.map((f) => {
                const meta = FODMAP_META[f];
                return (
                  <button
                    key={f}
                    onClick={() => store.toggleSafeFood(f)}
                    className="px-3 py-1.5 bg-ivory-100 border-2 border-dashed border-ivory-300 rounded-xl text-xs font-semibold text-ink-muted hover:border-terra-light hover:text-terra hover:bg-terra-pale transition-all flex items-center group"
                    title="点击移出白名单"
                  >
                    <span className="opacity-50 group-hover:opacity-100 grayscale group-hover:grayscale-0 transition-all mr-1.5">{meta.emoji}</span> 
                    {meta.label} 
                    <span className="opacity-0 group-hover:opacity-100 ml-1 text-terra">✕</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <div className="h-4" />
      </div>

      {investigationFood && (
        <InvestigationModal
          food={investigationFood}
          onClose={() => setInvestigationFood(null)}
        />
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function FinishButton({ onFinish }: { onFinish: (r: ExperimentResult) => void }) {
  const [open, setOpen] = useState(false);
  if (open) {
    return (
      <div className="flex-[2] flex gap-1.5 animate-spring-in">
        {(['effective', 'not_effective', 'uncertain'] as ExperimentResult[]).map((r) => (
          <button
            key={r}
            className={`flex-1 py-2 rounded-xl text-xs font-bold ${RESULT_META[r].color}`}
            onClick={() => onFinish(r)}
          >
            {RESULT_META[r].label}
          </button>
        ))}
      </div>
    );
  }
  return (
    <button
      className="flex-[2] py-2.5 rounded-2xl bg-green-pale text-green-dark text-sm font-bold
                 hover:bg-green-primary hover:text-white transition-colors"
      onClick={() => setOpen(true)}
    >
      结束并记录
    </button>
  );
}

const ALL_FOODS: FodmapTag[] = [
  'dairy', 'gluten', 'egg', 'spicy', 'seafood', 'cold',
  'soy', 'alcohol', 'coffee', 'fatty', 'garlic', 'fructose',
];

function InvestigationModal({
  food,
  onClose,
}: {
  food: FodmapTag;
  onClose: () => void;
}) {
  const meta = FODMAP_META[food];
  const plan = FOOD_INVESTIGATION_META[food];
  const { createExperiment } = useAppStore();

  const start = (strategy: 'substitution' | 'exclusion') => {
    createExperiment(food, strategy === 'substitution' ? 5 : 7, true, strategy);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-slide-up">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-ivory-100 rounded-2xl flex items-center justify-center text-3xl">
              {meta.emoji}
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-ink">侦探调查：{meta.label}</h2>
              <p className="text-xs text-ink-muted">针对近期高频关联不适进行的排查</p>
            </div>
          </div>

          <div className="bg-green-pale/30 rounded-2xl p-4 mb-6">
            <p className="text-xs font-bold text-green-dark uppercase tracking-wider mb-1">
              侦探情报
            </p>
            <p className="text-sm text-ink leading-relaxed">
              {plan?.reason ?? '该食物近期多次出现在你的不适记录中。'}
            </p>
          </div>

          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-3 px-1">
            选择调查策略
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => start('substitution')}
              className="w-full text-left p-4 rounded-2xl border-2 border-ivory-200 hover:border-green-primary transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-ink group-hover:text-green-dark">方案 A: 温和替换 (推荐)</span>
                <span className="text-[10px] bg-green-pale text-green-dark px-2 py-0.5 rounded-full font-bold">易坚持</span>
              </div>
              <p className="text-xs text-ink font-semibold">{plan?.substitution.label}</p>
              <p className="text-[10px] text-ink-muted mt-0.5">{plan?.substitution.description}</p>
            </button>

            <button
              onClick={() => start('exclusion')}
              className="w-full text-left p-4 rounded-2xl border-2 border-ivory-200 hover:border-terra-light transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-ink group-hover:text-terra">方案 B: 彻底排除 (严格)</span>
              </div>
              <p className="text-xs text-ink font-semibold">{plan?.exclusion.label}</p>
              <p className="text-[10px] text-ink-muted mt-0.5">{plan?.exclusion.description}</p>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-6 py-4 text-xs font-bold text-ink-muted hover:text-ink transition-colors"
          >
            先不查这个
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateExperimentPanel({
  onCreated,
  existingFoods,
}: {
  onCreated: () => void;
  existingFoods: FodmapTag[];
}) {
  const { createExperiment } = useAppStore();
  const [food, setFood] = useState<FodmapTag | null>(null);
  const [days, setDays] = useState(7);
  const [strategy, setStrategy] = useState<'substitution' | 'exclusion'>('exclusion');

  const submit = () => {
    if (!food) return;
    createExperiment(food, days, false, strategy);
    onCreated();
  };

  return (
    <div className="card mt-3 space-y-4 animate-fade-up">
      <div>
        <p className="section-title mb-2">选择调查目标</p>
        <div className="flex flex-wrap gap-2">
          {ALL_FOODS.filter((f) => !existingFoods.includes(f)).map((f) => {
            const meta = FODMAP_META[f];
            return (
              <button
                key={f}
                className={`tag-chip ${food === f ? 'selected' : ''}`}
                onClick={() => setFood(f)}
              >
                {meta.emoji} {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {food && (
        <div className="space-y-3 animate-fade-in">
          <p className="section-title mb-1">选择策略</p>
          <div className="flex gap-2">
            <button
              className={`flex-1 py-3 px-2 rounded-xl border-2 text-[10px] font-bold transition-all
                ${strategy === 'substitution' ? 'border-green-primary bg-green-pale text-green-dark' : 'border-ivory-200 text-ink-muted'}`}
              onClick={() => setStrategy('substitution')}
            >
              温和替换
            </button>
            <button
              className={`flex-1 py-3 px-2 rounded-xl border-2 text-[10px] font-bold transition-all
                ${strategy === 'exclusion' ? 'border-terra-light bg-terra-pale text-terra' : 'border-ivory-200 text-ink-muted'}`}
              onClick={() => setStrategy('exclusion')}
            >
              彻底排除
            </button>
          </div>
          <p className="text-[10px] text-ink-muted leading-relaxed px-1 italic">
            {strategy === 'substitution' 
              ? `温和：${FOOD_INVESTIGATION_META[food]?.substitution.label}`
              : `严格：${FOOD_INVESTIGATION_META[food]?.exclusion.label}`
            }
          </p>
        </div>
      )}

      <div>
        <p className="section-title mb-2">实验天数</p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={3}
            max={14}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="flex-1 accent-green-primary"
          />
          <span className="text-xl font-extrabold text-green-primary w-10 text-center">{days}</span>
        </div>
      </div>

      <button
        onClick={submit}
        disabled={!food}
        className={`w-full py-3 rounded-2xl font-bold text-sm transition-all
          ${food
            ? 'bg-green-primary text-white shadow-[0_4px_12px_rgba(74,124,89,0.3)] active:scale-95'
            : 'bg-ivory-200 text-ink-muted cursor-not-allowed'
          }`}
      >
        {food ? `开始调查 ${FODMAP_META[food].emoji} ${FODMAP_META[food].label}` : '请先选择食物'}
      </button>
    </div>
  );
}
