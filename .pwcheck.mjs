import { chromium } from '@playwright/test';
const base = process.argv[2] || 'http://localhost:5173';
const paths = process.argv.slice(3).length ? process.argv.slice(3) : ['/'];
const b = await chromium.launch();
for (const p of paths) {
  const page = await b.newPage();
  const out = [];
  page.on('console', m => { if (m.type() === 'error') out.push('CONSOLE ' + m.text().slice(0, 400)); });
  page.on('pageerror', e => out.push('PAGEERROR ' + String(e.stack || e).slice(0, 600)));
  page.on('requestfailed', r => out.push('REQFAILED ' + r.url() + ' ' + r.failure()?.errorText));
  page.on('response', r => { if (r.status() >= 400) out.push('HTTP ' + r.status() + ' ' + r.url()); });
  try { await page.goto(base + p, { waitUntil: 'domcontentloaded', timeout: 30000 }); await page.waitForTimeout(6000); } catch (e) { out.push('GOTO ' + e.message.slice(0, 200)); }
  const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 500);
  console.log('=====', p, '\nBODY:', text, '\n' + [...new Set(out)].join('\n'));
  await page.screenshot({ path: `C:/Users/fabli/AppData/Local/Temp/pwcheck${p.replace(/\W/g, '_')}.png` });
  await page.close();
}
await b.close();

