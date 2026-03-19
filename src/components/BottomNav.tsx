export type Tab = 'today' | 'lab' | 'history';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      {/* Lab */}
      <button
        id="tab-lab"
        className={`nav-item ${activeTab === 'lab' ? 'active' : ''}`}
        onClick={() => onTabChange('lab')}
      >
        <span className="text-xl leading-none">🧪</span>
        <span>实验室</span>
      </button>

      {/* Today — center, raised */}
      <div className="flex flex-col items-center">
        <button
          id="tab-today"
          className={`nav-item-center ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => onTabChange('today')}
          aria-label="今日"
        >
          <span className="text-2xl leading-none">🕵️</span>
        </button>
        <span
          className={`text-[10px] font-bold mt-1 transition-colors ${
            activeTab === 'today' ? 'text-green-primary' : 'text-ink-muted'
          }`}
        >
          今日
        </span>
      </div>

      {/* History */}
      <button
        id="tab-history"
        className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
        onClick={() => onTabChange('history')}
      >
        <span className="text-xl leading-none">📊</span>
        <span>历史</span>
      </button>
    </nav>
  );
}
