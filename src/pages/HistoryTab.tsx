import { useState } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore } from '../store/useAppStore';
import { FODMAP_META, SYMPTOM_META, type DayRecord } from '../types';

// ── History Tab ────────────────────────────────────────────────────────────

export function HistoryTab() {
  const store = useAppStore();
  const records = store.recentRecords(30);
  const suspects = store.suspectFoods();
  const [expanded, setExpanded] = useState<string | null>(null);

  const maxCount = suspects[0]?.count ?? 1;

  return (
    <div className="scroll-area">
      <div className="px-4 pt-6 space-y-5">

        {/* ── Header ── */}
        <div>
          <h1 className="text-2xl font-extrabold text-ink">历史追踪</h1>
          <p className="text-sm text-ink-muted mt-1">
            发现规律，掌控肠胃 📊
          </p>
        </div>

        {/* ── Suspect foods leaderboard ── */}
        {suspects.length > 0 ? (
          <section className="card">
            <p className="section-title mb-4">可疑食物排行</p>
            <div className="space-y-3">
              {suspects.slice(0, 5).map(({ food, count }, i) => {
                const meta = FODMAP_META[food];
                const pct = Math.round((count / maxCount) * 100);
                const isDanger = count >= 3;
                return (
                  <div key={food} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink-muted w-4">
                        #{i + 1}
                      </span>
                      <span className="text-base">{meta.emoji}</span>
                      <span className="text-sm font-semibold text-ink flex-1">
                        {meta.label}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full
                          ${isDanger
                            ? 'bg-terra-pale text-terra'
                            : 'bg-ivory-200 text-ink-secondary'
                          }`}
                      >
                        {isDanger ? '🔴' : '🟡'} {count} 次
                      </span>
                    </div>
                    <div className="pl-6">
                      <div className="suspect-bar-bg">
                        <div className="suspect-bar" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {suspects.length === 0 && (
              <p className="text-sm text-ink-muted text-center py-2">
                继续记录，线索将逐渐浮现
              </p>
            )}
          </section>
        ) : (
          <div className="card text-center py-6 border-2 border-dashed border-ivory-300">
            <p className="text-2xl mb-2">🔍</p>
            <p className="text-sm font-semibold text-ink-secondary">
              还没有足够的数据
            </p>
            <p className="text-xs text-ink-muted mt-1">
              记录几天后，这里会显示可疑食物
            </p>
          </div>
        )}

        {/* ── Day records ── */}
        <section>
          <p className="section-title mb-3">近期记录</p>

          {records.length === 0 ? (
            <div className="card text-center py-8 border-2 border-dashed border-ivory-300">
              <p className="text-2xl mb-2">📝</p>
              <p className="text-sm text-ink-secondary font-medium">还没有任何记录</p>
              <p className="text-xs text-ink-muted mt-1">去今日 Tab 开始记录吧</p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((rec) => (
                <DayCard
                  key={rec.date}
                  record={rec}
                  isExpanded={expanded === rec.date}
                  onToggle={() =>
                    setExpanded(expanded === rec.date ? null : rec.date)
                  }
                  onDelete={() => {
                    if (window.confirm(`确定删除 ${rec.date} 的记录吗？`)) {
                      store.deleteDay(rec.date);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </section>

        <div className="h-4" />
      </div>
    </div>
  );
}

// ── Day Card ───────────────────────────────────────────────────────────────

function DayCard({
  record,
  isExpanded,
  onToggle,
  onDelete,
}: {
  record: DayRecord;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const date = new Date(record.date + 'T00:00:00');
  const dateLabel = format(date, 'M月d日', { locale: zhCN });
  const dayLabel = format(date, 'EEEE', { locale: zhCN });
  const allTags = [...new Set(record.meals.flatMap((m) => m.tags))];

  const statusEmoji =
    record.status === 'good' ? '✅' : record.status === 'bad' ? '🚨' : '─';
  const statusBg =
    record.status === 'good'
      ? 'border-l-green-primary'
      : record.status === 'bad'
      ? 'border-l-terra'
      : 'border-l-ivory-300';

  return (
    <div
      className={`history-card border-l-4 ${statusBg}`}
      onClick={onToggle}
    >
      {/* Summary row */}
      <div className="px-4 py-4 relative group">
        <button
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-ink-muted hover:text-terra hover:bg-terra-pale rounded-full opacity-0 group-hover:opacity-100 transition-all sm:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="删除这条记录"
        >
          ✕
        </button>

        <div className="flex items-start gap-3">
          <div>
            <p className="text-base font-extrabold text-ink">{dateLabel}</p>
            <p className="text-xs text-ink-muted">{dayLabel}</p>
          </div>
          <span className="text-xl ml-auto mr-4">{statusEmoji}</span>
        </div>

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {allTags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="text-xs bg-ivory-200 text-ink-secondary px-2 py-0.5 rounded-full"
              >
                {FODMAP_META[tag].emoji} {FODMAP_META[tag].label}
              </span>
            ))}
            {allTags.length > 5 && (
              <span className="text-xs text-ink-muted">+{allTags.length - 5}</span>
            )}
          </div>
        )}

        {/* AI conclusion */}
        {record.aiConclusion && (
          <p className="text-xs text-ink-secondary mt-2 leading-relaxed border-t border-ivory-200 pt-2">
            {record.aiConclusion}
          </p>
        )}

        {!record.aiConclusion && record.status === null && (
          <p className="text-xs text-ink-muted mt-1 italic">未记录</p>
        )}
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div
          className="px-4 pb-4 border-t border-ivory-200 pt-3 space-y-3 animate-slide-down"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Symptoms */}
          {record.symptoms.length > 0 && (
            <div>
              <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">
                症状
              </p>
              <div className="flex flex-wrap gap-2">
                {record.symptoms.map((s) => (
                  <span
                    key={s.id}
                    className="flex items-center gap-1.5 text-xs bg-terra-pale text-terra
                               px-3 py-1.5 rounded-full font-semibold"
                  >
                    {SYMPTOM_META[s.type].emoji} {SYMPTOM_META[s.type].label}
                    <span className="text-ink-muted">{s.time}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Meals detail */}
          {record.meals.length > 0 && (
            <div>
              <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">
                餐次详情
              </p>
              <div className="space-y-2">
                {record.meals.map((meal) => (
                  <div key={meal.id} className="flex items-start gap-2">
                    <span className="text-sm mt-0.5">
                      {meal.type === 'breakfast'
                        ? '🌅'
                        : meal.type === 'lunch'
                        ? '☀️'
                        : meal.type === 'dinner'
                        ? '🌙'
                        : '🍊'}
                    </span>
                    <div>
                      <div className="flex flex-wrap gap-1">
                        {meal.tags.map((t) => (
                          <span
                            key={t}
                            className="text-xs bg-green-pale text-green-dark px-2 py-0.5 rounded-full"
                          >
                            {FODMAP_META[t].emoji} {FODMAP_META[t].label}
                          </span>
                        ))}
                      </div>
                      {meal.notes && (
                        <p className="text-xs text-ink-muted mt-1">{meal.notes}</p>
                      )}
                    </div>
                    <span className="text-xs text-ink-muted ml-auto">{meal.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* External factors */}
          {record.externalFactors.length > 0 && (
            <div>
              <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">
                外部因素
              </p>
              <div className="flex flex-wrap gap-2">
                {record.externalFactors.map((f, i) => {
                  const labels: Record<string, string> = {
                    sleep_poor: '😵 睡眠差',
                    sleep_good: '😴 睡眠好',
                    cold_exposure: '🧊 接触生冷',
                    stress: '😤 压力大',
                    menstrual: '🌹 生理期',
                  };
                  return (
                    <span
                      key={i}
                      className="text-xs bg-ivory-200 text-ink-secondary px-3 py-1.5 rounded-full"
                    >
                      {labels[f.type] ?? f.type}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
