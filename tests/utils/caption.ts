import type { Page } from '@playwright/test';

/**
 * Shows a caption bar on top of the app, so the video shows which story, criterion and step is running.
 * It ignores pointer events, so it never blocks clicks.
 */
export async function showCaption(page: Page, heading: string, text: string) {
  await page
    .evaluate(
      ([heading, text]) => {
        let bar = document.getElementById('e2e-caption');
        if (!bar) {
          bar = document.createElement('div');
          bar.id = 'e2e-caption';
          bar.style.cssText = [
            'position:fixed', 'left:50%', 'bottom:16px', 'transform:translateX(-50%)', 'z-index:2147483647',
            'max-width:90%', 'padding:10px 18px', 'border-radius:8px', 'pointer-events:none',
            'background:rgba(20,20,20,.85)', 'color:#fff', 'font:15px/1.4 Segoe UI,Arial,sans-serif',
            'box-shadow:0 4px 16px rgba(0,0,0,.3)',
          ].join(';');
          document.body.appendChild(bar);
        }
        bar.innerHTML = '';
        const h = document.createElement('div');
        h.textContent = heading;
        h.style.cssText = 'font-size:12px;opacity:.75';
        const t = document.createElement('div');
        t.textContent = text;
        t.style.cssText = 'font-weight:600';
        bar.append(h, t);
      },
      [heading, text],
    )
    // The page may be navigating; a missing caption must never fail a test.
    .catch(() => {});
}
