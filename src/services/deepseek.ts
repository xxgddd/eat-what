/**
 * DeepSeek AI Service via SiliconFlow
 *
 * TODO for Gemini: Replace the MOCK_MODE flag with real API logic.
 * - Set MOCK_MODE = false to enable real API calls.
 * - The env var is VITE_SILICONFLOW_API_KEY (set in .env.local or Netlify env).
 * - baseURL: https://api.siliconflow.cn/v1
 * - model: deepseek-ai/DeepSeek-V3
 */

import OpenAI from 'openai';
import type { DayRecord, Experiment, Meal, FodmapTag } from '../types';
import { FODMAP_META, SYMPTOM_META, MEAL_META } from '../types';

// ─── Config ────────────────────────────────────────────────────────────────────

const MOCK_MODE = !import.meta.env.VITE_SILICONFLOW_API_KEY;

const client = MOCK_MODE
  ? null
  : new OpenAI({
      apiKey: import.meta.env.VITE_SILICONFLOW_API_KEY,
      baseURL: 'https://api.siliconflow.cn/v1',
      dangerouslyAllowBrowser: true,
    });

// ─── Mock responses ────────────────────────────────────────────────────────────

// ─── Mock responses ────────────────────────────────────────────────────────────

const mockAnalysis = () => ({
  formal: '今日摄入蛋白质与纤维比例均衡，但下午出现的轻微胀气可能与餐后冷饮导致的肠道蠕动异常有关。建议持续监测生冷食物的影响。',
  witty: '侦探发现你偷偷喝了冰水。肠胃君没抗议，只是轻轻放了个屁。🤫',
});

// ─── Prompt builder ────────────────────────────────────────────────────────────





const formatMeals = (meals: Meal[]) => {
  if (!meals || meals.length === 0) return '无记录';
  return meals
    .map((m) => {
      const typeLabel = MEAL_META[m.type].label;
      const tagsStr = m.tags.map((t) => `${FODMAP_META[t].emoji}${FODMAP_META[t].label}`).join('、');
      const noteStr = m.notes ? ` (备注: ${m.notes})` : '';
      return `- ${typeLabel} [${m.time}]: ${tagsStr || '无标签'}${noteStr}`;
    })
    .join('\n');
};

const buildPrompt = (
  today: DayRecord,
  yesterday: DayRecord | null,
  _history: DayRecord[],
  _experiments: Experiment[],
  safeFoods: FodmapTag[] = []
): string => {
  const todayMealsStr = formatMeals(today.meals);
  const yesterdayMealsStr = yesterday ? formatMeals(yesterday.meals) : '无记录';
  const safeStr = safeFoods.map(t => `${FODMAP_META[t].emoji}${FODMAP_META[t].label}`).join('、');

  return `你是一个专业、毒舌但有温度的IBS饮食侦探。你需要分析用户的饮食、时间规律与症状关联。
  
  请提供两种风格的回复，并以 JSON 格式返回：
  1. "witty": 针对上方 Mascot 的气泡：15字以内的锐利吐槽/简短评价，风格要幽默、一针见血。
  2. "formal": 针对下方分析卡片：60字左右的扎实分析，语调专业、学术，结合 IBS 常识。

今日状态：${today.status === 'bad' ? '遭遇不适（' + today.symptoms.map((s) => `${SYMPTOM_META[s.type].label}(强度${s.severity})`).join('、') + '）' : '状态极佳'}

【今日饮食时间线】
${todayMealsStr}

【昨日饮食时间线】
${yesterdayMealsStr}

推理规则：
1. 观察今日【餐次时间】：正常午餐约11:30-13:30，晚餐约17:30-20:00，因人而异。只特别留意两餐间隔是否过度（超6小时）/过短，或者吃得过晚（如深夜吃高脂），对比昨天是否有规律的明显改变。
2. 观察今日【食物组合与备注】，点出奇怪的搭配。
3. 【免责白名单】：用户已确认 [${safeStr || '暂无'}] 是安全的，绝不能怀疑这些食物。
4. 结合 IBS 常识。尽量少用学术词汇，用通俗通畅的大白话解释。

JSON 示例：
{
  "witty": "冰激凌三连？你是真敢啊。",
  "formal": "根据近期记录显示，乳制品与果糖的同时摄入显著提高了肠道渗透压，这解释了餐后1小时出现的急性腹泻。"
}
`;
};

// ─── Main export ───────────────────────────────────────────────────────────────

export async function analyzeDay(
  today: DayRecord,
  yesterday: DayRecord | null,
  history: DayRecord[],
  experiments: Experiment[],
  safeFoods: FodmapTag[] = []
): Promise<{ formal: string; witty: string }> {
  const isProd = import.meta.env.PROD;
  const prompt = buildPrompt(today, yesterday, history, experiments, safeFoods);

  const parseJson = (text: string) => {
    try {
      // Handle cases where AI might wrap JSON in markdown blocks
      const cleaned = text.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return { formal: text, witty: '分析完成 👌' };
    }
  };

  // ── Production: Use Secure Proxy (Netlify Functions) ──
  if (isProd) {
    try {
      const response = await fetch('/.netlify/functions/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }]
        }),
      });

      if (!response.ok) throw new Error('Proxy error');
      const data = await response.json();
      return parseJson(data.content || '');
    } catch (err) {
      console.error('AI Proxy failed:', err);
      return { formal: 'AI 侦探暂时离开了，请稍后再试。', witty: '侦探下班了。' };
    }
  }

  // ── Local Direct Mode ──
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 1200));
    return mockAnalysis();
  }

  try {
    const completion = await client!.chat.completions.create({
      model: 'deepseek-ai/DeepSeek-V3',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });
    const result = completion.choices[0]?.message?.content?.trim() ?? '';
    return parseJson(result);
  } catch (err) {
    console.error('[DeepSeek] API error:', err);
    return { formal: '暂时无法分析，请稍后再试', witty: '掉线了...' };
  }
}
