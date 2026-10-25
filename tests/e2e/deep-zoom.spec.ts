import { expect, test, type ConsoleMessage } from '@playwright/test';

interface DeepZoomWindow {
  __ready?: boolean;
  toJSON: () => {
    version: string;
    viewport: { scale: number };
    nodes: Array<{ id: string; width: number; height: number; type: string }>;
  };
  zoomTo: (scale: number) => void;
  fitNode: (id: string) => void;
}

test.describe('deep zoom — built dist renders the opt-in range', () => {
  const errors: string[] = [];

  test.beforeEach(async ({ page }) => {
    errors.length = 0;
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(String(err)));
    await page.goto('/tests/e2e/fixtures/deep-zoom.html');
    await page.waitForFunction(() => (window as unknown as DeepZoomWindow).__ready === true);
  });

  test('keeps micro and large nodes and frames one node', async ({ page }) => {
    const doc = await page.evaluate(() => (window as unknown as DeepZoomWindow).toJSON());
    expect(doc.version).toBe('1.3.0');
    const micro = doc.nodes.find((node) => node.id === 'a');
    const large = doc.nodes.find((node) => node.id === 'large');
    expect(micro).toMatchObject({ width: 6, height: 6 });
    expect(large).toMatchObject({ width: 4800, height: 2400 });

    await page.evaluate(() => (window as unknown as DeepZoomWindow).zoomTo(0.05));
    await page.evaluate(() => (window as unknown as DeepZoomWindow).zoomTo(1));
    await page.evaluate(() => (window as unknown as DeepZoomWindow).zoomTo(20));
    const zoomed = await page.evaluate(() => (window as unknown as DeepZoomWindow).toJSON());
    expect(zoomed.viewport.scale).toBe(20);

    const marker = await page.locator('#flowchart marker').first().getAttribute('markerWidth');
    expect(Number(marker)).toBeGreaterThan(0);
    expect(Number(marker)).toBeLessThan(2);

    const grid = page.locator('#flowchart .vd-flowchart-grid');
    const box = await grid.boundingBox();
    expect(box?.width || 0).toBeGreaterThan(0);
    await expect(page.locator('#flowchart pattern path')).toHaveAttribute(
      'vector-effect',
      'non-scaling-stroke',
    );

    await page.evaluate(() => (window as unknown as DeepZoomWindow).fitNode('large'));
    const framed = await page.evaluate(() => (window as unknown as DeepZoomWindow).toJSON());
    expect(framed.viewport.scale).toBeLessThan(1);
    expect(framed.viewport.scale).toBeGreaterThanOrEqual(0.05);
    await expect(page.locator('#flowchart .vd-flowchart-text-editor')).toHaveCount(0);
  });

  test.afterEach(() => {
    expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
  });
});
