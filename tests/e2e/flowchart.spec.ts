import { expect, test, type ConsoleMessage } from '@playwright/test';

// Real-browser packaging smoke: the fixture imports the BUILT dist ESM entry
// (/dist/index.js, with `vue` resolved locally via an import map) and mounts
// the framework-agnostic flowchart core with a seeded document. Asserts host
// shell, version 1.2.0, seeded nodes, toJSON().version, undo, and zero console
// errors.

interface FlowchartWindow {
  __ready?: boolean;
  flowchartVersion: string;
  toJSON: () => { version: string; nodes: unknown[]; edges: unknown[] };
  canUndo: () => boolean;
  undo: () => unknown;
  addNode: () => { id: string };
}

test.describe('flowchart smoke — built dist entry mounts the editor', () => {
  const errors: string[] = [];

  test.beforeEach(async ({ page }) => {
    errors.length = 0;
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(String(err)));

    await page.goto('/tests/e2e/fixtures/flowchart.html');
    await page.waitForFunction(() => (window as unknown as FlowchartWindow).__ready === true);
  });

  test('mounts the host shell and reports the built-entry version', async ({ page }) => {
    await expect(page.locator('#flowchart.vd-flowchart-host')).toHaveCount(1);
    await expect(page.locator('#flowchart .vd-flowchart-shell')).toHaveCount(1);
    await expect(page.locator('#flowchart svg.vd-flowchart-svg')).toHaveCount(1);

    const version = await page.evaluate(
      () => (window as unknown as FlowchartWindow).flowchartVersion,
    );
    expect(version).toBe('1.2.0');
  });

  test('renders seeded nodes and serializes version 1.2.0', async ({ page }) => {
    await expect(page.locator('#flowchart .vd-flowchart-node')).toHaveCount(2);

    const doc = await page.evaluate(() => (window as unknown as FlowchartWindow).toJSON());
    expect(doc.version).toBe('1.2.0');
    expect(doc.nodes).toHaveLength(2);
    expect(doc.edges).toHaveLength(1);
  });

  test('undo reverts a committed add', async ({ page }) => {
    const before = await page.evaluate(() => (window as unknown as FlowchartWindow).toJSON());
    await page.evaluate(() => (window as unknown as FlowchartWindow).addNode());
    await expect(page.locator('#flowchart .vd-flowchart-node')).toHaveCount(3);

    const canUndo = await page.evaluate(() => (window as unknown as FlowchartWindow).canUndo());
    expect(canUndo).toBe(true);

    await page.evaluate(() => (window as unknown as FlowchartWindow).undo());
    await expect(page.locator('#flowchart .vd-flowchart-node')).toHaveCount(2);

    const after = await page.evaluate(() => (window as unknown as FlowchartWindow).toJSON());
    expect(after.nodes).toHaveLength(before.nodes.length);
  });

  test.afterEach(() => {
    expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
  });
});
