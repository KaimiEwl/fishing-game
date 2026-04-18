import { useEffect } from 'react';

export const usePageScroll = () => {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');

    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousRootOverflow = root?.style.overflow ?? '';
    const previousBodyTouchAction = body.style.touchAction;

    html.style.overflow = 'auto';
    body.style.overflow = 'auto';
    body.style.touchAction = 'auto';
    if (root) {
      root.style.overflow = 'auto';
    }

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.touchAction = previousBodyTouchAction;
      if (root) {
        root.style.overflow = previousRootOverflow;
      }
    };
  }, []);
};
