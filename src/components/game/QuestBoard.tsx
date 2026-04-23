import React, { useEffect, useMemo, useRef, useState } from 'react';

interface QuestBoardProps {
  layout?: 'desktop' | 'mobile';
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  headerPlacement?: 'inline' | 'fixed';
  footerPlacement?: 'inline' | 'fixed';
  viewportInsets?: Partial<Record<'desktop' | 'mobile', Partial<QuestBoardViewportInset>>>;
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

interface QuestBoardViewportInset {
  left: string;
  right: string;
  top: string;
  bottom: string;
}

const BOARD_ASPECTS = {
  desktop: 1536 / 1024,
  mobile: 853 / 1844,
} as const;

const BOARD_VIEWPORT = {
  desktop: {
    left: '12.75%',
    right: '12.75%',
    top: '16.1%',
    bottom: '8.8%',
  },
  mobile: {
    left: '17.8%',
    right: '17.8%',
    top: '15.1%',
    bottom: '11.6%',
  },
} as const;

const QuestBoard: React.FC<QuestBoardProps> = ({
  layout = 'desktop',
  children,
  header,
  footer,
  headerPlacement = 'fixed',
  footerPlacement = 'fixed',
  viewportInsets,
}) => {
  const isMobile = layout === 'mobile';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setContainerSize({
        width: rect.width,
        height: rect.height,
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    window.addEventListener('resize', updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  const coverStage = useMemo(() => {
    if (!containerSize.width || !containerSize.height) return null;

    const sourceAspect = BOARD_ASPECTS[layout];
    const containerAspect = containerSize.width / containerSize.height;

    if (containerAspect > sourceAspect) {
      return {
        width: containerSize.width,
        height: containerSize.width / sourceAspect,
      };
    }

    return {
      width: containerSize.height * sourceAspect,
      height: containerSize.height,
    };
  }, [containerSize, layout]);

  const viewport = {
    ...BOARD_VIEWPORT[layout],
    ...(viewportInsets?.[layout] ?? {}),
  };
  const headerInline = headerPlacement === 'inline';
  const footerInline = footerPlacement === 'inline';

  return (
    <div ref={containerRef} className="relative h-full w-full">
      {coverStage && (
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: coverStage.width,
              height: coverStage.height,
            }}
          >
            <div
              className="absolute"
              style={{
                left: viewport.left,
                right: viewport.right,
                top: viewport.top,
                bottom: viewport.bottom,
              }}
            >
              <div className="pointer-events-auto flex h-full min-h-0 flex-col">
                {!headerInline && header ? (
                  <div className={isMobile ? 'shrink-0 pb-3' : 'shrink-0 pb-4'}>
                    {header}
                  </div>
                ) : null}

                <div className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain ${isMobile ? 'pr-1' : 'pr-2'} [touch-action:pan-y]`}>
                  {headerInline && header ? (
                    <div className={isMobile ? 'pb-3' : 'pb-4'}>
                      {header}
                    </div>
                  ) : null}
                  {footerInline && footer ? (
                    <div className="pb-3">
                      {footer}
                    </div>
                  ) : null}
                  {children}
                </div>

                {!footerInline && footer ? (
                  <div className="shrink-0 pt-3">
                    {footer}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const QuestBoardCard: React.FC<QuestBoardCardProps> = ({ children, className = '' }) => {
  return (
    <article
      className={`relative flex min-h-[9.25rem] min-w-0 flex-col overflow-hidden rounded-[1.2rem] border border-[#725130] bg-[linear-gradient(180deg,rgba(38,25,16,0.95)_0%,rgba(31,21,14,0.92)_100%)] p-3 text-[#f0d09b] shadow-[inset_0_0_0_1px_rgba(255,215,150,0.06),0_12px_24px_rgba(0,0,0,0.34)] transition-colors duration-200 hover:border-[#9d7141] md:min-h-[13.75rem] md:rounded-[1.7rem] md:p-4 ${className}`}
    >
      {children}
    </article>
  );
};

export const QuestBoardPlaque: React.FC<QuestBoardPlaqueProps> = ({ eyebrow, description, action }) => {
  return (
    <div className="flex flex-col gap-3 rounded-[1.1rem] border border-[#6f4928] bg-[linear-gradient(180deg,rgba(38,25,16,0.98)_0%,rgba(28,20,13,0.98)_100%)] px-3.5 py-3 text-[#f0d09b] shadow-[inset_0_0_0_1px_rgba(255,215,150,0.06),0_12px_24px_rgba(0,0,0,0.34)] sm:rounded-[1.25rem] sm:px-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="text-[0.66rem] font-black uppercase tracking-[0.22em] text-[#f3c777]/85">
            {eyebrow}
          </div>
        ) : null}
        <p className="mt-1 text-[0.82rem] font-semibold leading-5 text-[#f8e8bf]/88 sm:text-[0.95rem] sm:leading-6">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
};

export default QuestBoard;
