export type UiLayout = 'auto' | 'desktop' | 'mobile';

/** Width emulated when the user forces the "Desktop site" layout. */
const DESKTOP_WIDTH = 1280;

const MOBILE_CONTENT =
  'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';

function getViewportMeta(): HTMLMetaElement {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'viewport';
    document.head.appendChild(meta);
  }
  return meta;
}

/**
 * Applies the chosen UI layout the same way Chrome's "Desktop site" toggle
 * works: by rewriting the viewport meta tag so CSS media queries (and every
 * responsive class in the app) resolve against the emulated width.
 */
export function applyUiLayout(layout: UiLayout) {
  const root = document.documentElement;
  root.setAttribute('data-ui-layout', layout);

  const meta = getViewportMeta();
  if (layout === 'desktop') {
    meta.setAttribute(
      'content',
      `width=${DESKTOP_WIDTH}, initial-scale=${(window.screen.width || DESKTOP_WIDTH) / DESKTOP_WIDTH}, user-scalable=yes`
    );
  } else {
    meta.setAttribute('content', MOBILE_CONTENT);
  }

  // Nudge listeners (Tailwind media queries update on their own).
  window.dispatchEvent(new Event('resize'));
}
