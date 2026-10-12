// Walk a built architecture page in headless Chromium and fail on any console error, including [arch-page] validation errors.
// Usage: node check_page.cjs <page.html> [screenshot dir]
// Env: PLAYWRIGHT_CORE (path or package name, default "playwright-core"), CHROME (executable path, optional)
const path = require('path')
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core')

;(async () => {
  const file = path.resolve(process.argv[2] || '')
  const shots = process.argv[3]
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] })
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e.stack || e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(`file://${file}`)
  const report = { overview: 0, components: 0, stories: {}, edges: 0 }

  for (const id of await page.$$eval('#overview-canvas [data-node-id]', (els) => els.map((e) => e.dataset.nodeId))) {
    await page.click(`#overview-canvas [data-node-id="${id}"]`)
    if (!(await page.locator('#overview-caption h3').count())) errors.push(`overview node ${id}: no caption`)
    report.overview++
  }
  for (const id of await page.$$eval('#architecture-canvas [data-node-id]', (els) => els.map((e) => e.dataset.nodeId))) {
    await page.click(`#architecture-canvas [data-node-id="${id}"]`)
    if (!(await page.locator('#component-detail h3').count())) errors.push(`component node ${id}: no detail`)
    report.components++
  }
  for (const id of await page.$$eval('[data-pano-story]', (b) => b.map((x) => x.dataset.panoStory))) {
    await page.click(`[data-pano-story="${id}"]`)
    let subs = 0, intros = 0
    for (let guard = 0; guard < 2000; guard++) {
      const next = page.locator('#pano-panel [data-pano-go="1"]')
      if (await next.isDisabled()) break
      await next.click()
      const where = async () => `story ${id} "${await page.locator('#pano-panel h3').textContent()}"`
      if (!(await page.locator('#pano-panel .pp-digest').count())) { errors.push(`${await where()}: step page without sub list`); continue }
      intros++
      if ((await page.locator('#pano-panel .pp-kicker').textContent()).indexOf(`第 ${intros} /`) < 0) errors.push(`${await where()}: next does not land on step ${intros}`)
      if (await page.locator('#pano-panel li.open').count()) errors.push(`${await where()}: next opens a sub`)
      const n = await page.locator('#pano-panel .pp-digest [data-pano-sub]').count()
      await page.locator('#pano-panel .pp-digest [data-pano-sub="1"]').hover()
      if (!(await page.locator('.pnode.hot').count())) errors.push(`${await where()}: hovering a sub highlights no component`)
      for (let k = 1; k <= n; k++) {
        await page.locator(`#pano-panel .pp-digest [data-pano-sub="${k}"]`).click()
        const open = await page.locator('#pano-panel .pp-digest li.open').count()
        if (open !== 1) errors.push(`${await where()}: ${open} subs expanded after clicking sub ${k}`)
        if (!(await page.locator('#pano-panel li.open .pp-subdetail .dbox').count())) errors.push(`${await where()}: sub ${k} without data`)
        subs++
      }
      await page.locator(`#pano-panel .pp-digest [data-pano-sub="${n}"]`).click()
      if (await page.locator('#pano-panel li.open').count()) errors.push(`${await where()}: second click does not collapse sub ${n}`)
      await page.mouse.move(2, 2)
      if (shots && intros === 1) {
        await page.locator('#pano-panel .pp-digest [data-pano-sub="1"]').click()
        await page.locator('#intro').screenshot({ path: path.join(shots, `pano-${id}.png`) })
      }
    }
    report.stories[id] = { steps: intros, subs }
  }
  const edges = await page.$$eval('#pano-wires [data-pano-edge]', (p) => [...new Set(p.map((x) => x.dataset.panoEdge))])
  for (const id of edges) {
    await page.dispatchEvent(`#pano-wires path[data-pano-edge="${id}"]`, 'click')
    report.edges++
  }
  const msg = page.locator('#pano-panel .pp-edge-msg').first()
  if (await msg.count()) {
    await msg.locator('summary').click()
    await msg.locator('[data-pano-jump]').click()
    if ((await page.locator('#pano-panel li.open').count()) !== 1) errors.push('edge jump does not expand its sub')
  }
  if (shots) await page.screenshot({ path: path.join(shots, 'page.png'), fullPage: true })
  report.errors = errors
  console.log(JSON.stringify(report, null, 1))
  await browser.close()
  process.exit(errors.length ? 1 : 0)
})()
