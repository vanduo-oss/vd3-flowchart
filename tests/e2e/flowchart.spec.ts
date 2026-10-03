import { expect, test, type ConsoleMessage } from '@playwright/test';

// Real-browser packaging smoke: the fixture imports the BUILT dist ESM entry
// (/dist/index.js, with `vue` resolved locally via an import map) and mounts
// the framework-agnostic flowchart core with a seeded document. Asserts host
// shell, VD_FLOWCHART_VERSION 1.4.0, seeded nodes, toJSON().version 1.2.0, undo, and zero console
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
    expect(version).toBe('1.4.0');
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

  test('hovering a connection handle keeps it in place', async ({ page }) => {
    const node = page.locator('#flowchart g.vd-flowchart-node').first();
    await node.locator('.vd-flowchart-node-shape').hover();
    const port = node.locator('[data-port="right"] .vd-flowchart-port');
    await expect(port).toHaveCSS('opacity', '1');
    const before = await port.boundingBox();
    await node.locator('[data-port="right"] .vd-flowchart-port-hit').hover();
    await expect(node.locator('[data-port="right"] .vd-flowchart-port-plus')).toHaveCSS(
      'opacity',
      '1',
    );
    await page.waitForTimeout(200);
    const after = await port.boundingBox();
    expect(after).toEqual(before);
  });

  test('clicking a handle adds a connected node; Tab and Enter extend the map', async ({
    page,
  }) => {
    const node = page.locator('#flowchart g.vd-flowchart-node').first();
    await node.locator('.vd-flowchart-node-shape').click();
    await node.locator('[data-port="bottom"] .vd-flowchart-port-hit').click();
    await expect(page.locator('#flowchart .vd-flowchart-node')).toHaveCount(3);
    const input = page.locator('#flowchart .vd-flowchart-text-editor');
    await expect(input).toBeFocused();
    await page.keyboard.type('Child');
    await page.keyboard.press('Tab');
    await expect(page.locator('#flowchart .vd-flowchart-node')).toHaveCount(4);
    await page.keyboard.type('Grandchild');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await expect(page.locator('#flowchart .vd-flowchart-node')).toHaveCount(5);
    await page.keyboard.press('Escape');

    const doc = await page.evaluate(() => (window as unknown as FlowchartWindow).toJSON());
    const texts = (doc.nodes as Array<{ text: string }>).map((item) => item.text);
    expect(texts).toEqual(expect.arrayContaining(['Child', 'Grandchild']));
    expect(doc.edges).toHaveLength(4);
  });

  test('dragging a handle onto another node connects them', async ({ page }) => {
    const nodes = page.locator('#flowchart g.vd-flowchart-node');
    await nodes.first().locator('.vd-flowchart-node-shape').click();
    const handle = await nodes
      .first()
      .locator('[data-port="bottom"] .vd-flowchart-port')
      .boundingBox();
    const target = await nodes.nth(1).locator('.vd-flowchart-node-shape').boundingBox();
    await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + handle!.height / 2);
    await page.mouse.down();
    await page.mouse.move(target!.x + target!.width / 2, target!.y + target!.height - 4, {
      steps: 8,
    });
    await page.mouse.up();
    const doc = await page.evaluate(() => (window as unknown as FlowchartWindow).toJSON());
    expect(doc.nodes).toHaveLength(2);
    expect(doc.edges).toHaveLength(2);
  });

  test('labels a connection from the keyboard', async ({ page }) => {
    await page
      .locator('#flowchart g.vd-flowchart-node')
      .first()
      .locator('.vd-flowchart-node-shape')
      .click();
    await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.type('yes');
    await expect(page.locator('#flowchart .vd-flowchart-text-editor--edge')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#flowchart .vd-flowchart-edge-label')).toHaveText('yes');
  });

  test('a near-aligned drag snaps to the other node and shows a guide', async ({ page }) => {
    const target = page.locator('#flowchart g.vd-flowchart-node').nth(1);
    const box = (await target.locator('.vd-flowchart-node-shape').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 4, { steps: 4 });
    await expect(page.locator('#flowchart .vd-flowchart-guide')).not.toHaveCount(0);
    await page.mouse.up();
    await expect(page.locator('#flowchart .vd-flowchart-guide')).toHaveCount(0);
    const doc = await page.evaluate(() => (window as unknown as FlowchartWindow).toJSON());
    expect((doc.nodes as Array<{ y: number }>)[1].y).toBe(80);
  });

  test.afterEach(() => {
    expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
  });
});
