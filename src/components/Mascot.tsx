import { useEffect, useState } from 'react';

export type MascotMood = 'idle' | 'happy' | 'concerned' | 'thinking' | 'celebrating';

interface MascotProps {
  mood?: MascotMood;
  speech?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const MOOD_EMOJI: Record<MascotMood, string> = {
  idle:        '🕵️',
  happy:       '🥳',
  concerned:   '😟',
  thinking:    '🤔',
  celebrating: '🎉',
};

const MOOD_BG: Record<MascotMood, string> = {
  idle:        'bg-ivory-200',
  happy:       'bg-green-pale',
  concerned:   'bg-terra-pale',
  thinking:    'bg-ivory-200',
  celebrating: 'bg-green-pale',
};

const SIZE: Record<string, { wrap: string; text: string }> = {
  sm: { wrap: 'w-10 h-10 rounded-[14px]', text: 'text-2xl' },
  md: { wrap: 'w-14 h-14 rounded-[18px]', text: 'text-3xl' },
  lg: { wrap: 'w-20 h-20 rounded-[24px]', text: 'text-4xl' },
};

export function Mascot({ mood = 'idle', speech, size = 'md', className = '' }: MascotProps) {
  const [bubbleKey, setBubbleKey] = useState(0);
  const [showBubble, setShowBubble] = useState(false);

  useEffect(() => {
    if (speech) {
      setShowBubble(false);
      const t = setTimeout(() => {
        setBubbleKey((k) => k + 1);
        setShowBubble(true);
      }, 60);
      return () => clearTimeout(t);
    } else {
      setShowBubble(false);
    }
  }, [speech]);

  const { wrap, text } = SIZE[size];

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Speech bubble */}
      {speech && showBubble && (
        <div
          key={bubbleKey}
          className="relative bg-white rounded-2xl px-4 py-2.5 shadow-card border border-ivory-300
                     text-sm font-semibold text-ink max-w-[240px] text-center animate-fade-up"
        >
          {speech}
          {/* tail */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-2 border-l-[8px] border-r-[8px] border-t-[9px]
                       border-l-transparent border-r-transparent border-t-ivory-300"
          />
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-[7px] border-l-[7px] border-r-[7px] border-t-[8px]
                       border-l-transparent border-r-transparent border-t-white"
          />
        </div>
      )}

      {/* Character */}
      <div
        className={`${wrap} ${MOOD_BG[mood]} flex items-center justify-center
                    animate-bounce-gentle shadow-soft select-none`}
      >
        <span className={text}>{MOOD_EMOJI[mood]}</span>
      </div>
    </div>
  );
}
