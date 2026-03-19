import { useState } from 'react';
import { useAppStore } from './store/useAppStore';
import { Onboarding } from './pages/Onboarding';
import { TodayTab } from './pages/TodayTab';
import { LabTab } from './pages/LabTab';
import { HistoryTab } from './pages/HistoryTab';
import { BottomNav, type Tab } from './components/BottomNav';

export default function App() {
  const { profile } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('today');

  // ── Onboarding gate ──────────────────────────────────────────────────────
  if (!profile.onboardingDone) {
    return (
      <div className="app-shell">
        <Onboarding />
      </div>
    );
  }

  // ── Main app ─────────────────────────────────────────────────────────────
  return (
    <div className="app-shell">
      {/* Page content */}
      <div className="flex-1 relative flex flex-col overflow-hidden">
        {activeTab === 'today'   && <TodayTab />}
        {activeTab === 'lab'     && <LabTab />}
        {activeTab === 'history' && <HistoryTab />}
      </div>

      {/* Bottom nav */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
