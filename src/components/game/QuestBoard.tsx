import React from 'react';

interface QuestBoardProps {
  layout?: 'desktop' | 'mobile';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

interface QuestBoardCardProps {
  children: React.ReactNode;
  className?: string;
}

interface QuestBoardPlaqueProps {
  eyebrow?: string;
  description: React.ReactNode;
  action?: React.ReactNode;
}

const QuestBoard: React.FC<QuestBoardProps> = ({ layout = 'desktop', children, footer }) => {
  const isMobile = layout === 'mobile';

  return (
    <div className="mx-auto h-full w-full max-w-6xl pb-4">
      <div
        className="relative mx-auto h-full max-h-full w-auto max-w-full"
        style={{ aspectRatio: isMobile ? '384 / 704' : '3 / 2' }}
      >
        <div className={isMobile ? 'absolute left-[18.1%] right-[18.1%] top-[15.7%] bottom-[13.6%]' : 'absolute left-[12.75%] right-[12.75%] top-[16.9%] bottom-[15.2%]'}>
          <div className="h-full overflow-y-auto overflow-x-visible px-2 pb-4 pt-3 sm:px-3">
            {children}
          </div>
        </div>

        {footer ? (
          <div className={isMobile ? 'absolute bottom-[4.4%] left-1/2 w-[72%] -translate-x-1/2' : 'absolute bottom-[3.7%] left-1/2 w-[min(72%,35rem)] -translate-x-1/2'}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const QuestBoardCard: React.FC<QuestBoardCardProps> = ({ children, className = '' }) => {
  return (
    <article
      className={`relative flex min-h-[13.75rem] flex-col rounded-[1.7rem] border border-[#725130] bg-[linear-gradient(180deg,rgba(38,25,16,0.95)_0%,rgba(31,21,14,0.92)_100%)] p-4 text-[#f0d09b] shadow-[inset_0_0_0_1px_rgba(255,215,150,0.06),0_12px_24px_rgba(0,0,0,0.34)] transition-all duration-200 hover:border-[#9d7141] hover:shadow-[inset_0_0_0_1px_rgba(255,215,150,0.1),0_16px_26px_rgba(0,0,0,0.38)] ${className}`}
    >
      {children}
    </article>
  );
};

export const QuestBoardPlaque: React.FC<QuestBoardPlaqueProps> = ({ eyebrow, description, action }) => {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-[#6f4928] bg-[linear-gradient(180deg,rgba(38,25,16,0.98)_0%,rgba(28,20,13,0.98)_100%)] px-4 py-3 text-[#f0d09b] shadow-[inset_0_0_0_1px_rgba(255,215,150,0.06),0_12px_24px_rgba(0,0,0,0.34)]">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="text-[0.66rem] font-black uppercase tracking-[0.22em] text-[#f3c777]/85">
            {eyebrow}
          </div>
        ) : null}
        <p className="mt-1 text-sm font-semibold text-[#f8e8bf]/88 sm:text-[0.95rem]">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
};

export default QuestBoard;
