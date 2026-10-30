import DxfParser from 'dxf-parser'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:4173'
const destination = resolve('reports/combined-cutouts/browser')
mkdirSync(destination, { recursive: true })
let server
let browser
const checks = []
const errors = []
const failedRequests = []
const cspViolations = []
const securityHeaders = Object.fromEntries(JSON.parse(readFileSync('vercel.json','utf8')).headers[0].headers.map(h=>[h.key.toLowerCase(),h.value]))
try {
  try { await fetch(base) } catch {
    assert(existsSync('dist/index.html'), 'Run npm run build first.')
    server = spawn(process.execPath, ['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4173','--strictPort'], { stdio:'ignore' })
    for (let i=0;i<60;i++) {
      try { await fetch(base); break } catch { await new Promise(r=>setTimeout(r,250)) }
    }
  }
  const executablePath = process.env.CHROMIUM_PATH ?? (existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined)
  browser = await chromium.launch({ executablePath, headless:true, args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] })
  const page = async () => {
    const p = await browser.newPage({viewport:{width:1600,height:1100},acceptDownloads:true})
    p.setDefaultTimeout(60000)
    p.on('pageerror',e=>errors.push(e.message))
    p.on('requestfailed',r=>failedRequests.push({url:r.url(),error:r.failure()?.errorText}))
    await p.exposeFunction('reportCspViolation', violation=>cspViolations.push(violation))
    await p.addInitScript(()=>document.addEventListener('securitypolicyviolation', event=>window.reportCspViolation({directive:event.effectiveDirective,blocked:event.blockedURI})))
    if(!process.env.TEST_BASE_URL) await p.route('**/*',async route=>{
      if(route.request().isNavigationRequest() && route.request().url().startsWith(base)) {
        const response=await route.fetch()
        await route.fulfill({response,headers:{...response.headers(),...securityHeaders}})
      } else await route.continue()
    })
    await p.goto(base)
    return p
  }
  const ready = async p => { await p.getByText('Ready',{exact:true}).first().waitFor(); assert.equal(await p.getByRole('button',{name:'Export',exact:true}).isEnabled(),true) }
  const diameter = async (p,d) => {
    await p.getByRole('spinbutton').first().fill(String(d))
    assert.equal(await p.getByRole('button',{name:'Export',exact:true}).isEnabled(),false)
    await p.getByRole('button',{name:'Apply & Re-process',exact:true}).click()
  }
  for (const [file,d] of [['cozy-3mm-sheet-1',3.175],['cozy-6mm-sheet-1',6],['family-6mm-sheet-1',6]]) {
    const p = await page()
    await p.locator('input[type=file]').setInputFiles(resolve(`tests/fixtures/safepaws/${file}.dxf`))
    await ready(p)
    await diameter(p,d); await ready(p)
    await p.getByText(file,{exact:true}).click()
    const kinds = {dogbone:await p.getByText('dogbone',{exact:true}).count(),tbone:await p.getByText('tbone',{exact:true}).count(),arcRelief:await p.getByText('arc-relief',{exact:true}).count()}
    assert(kinds.dogbone>0 && kinds.tbone>0, 'The same drawing must contain both types.')
    await p.getByRole('button',{name:'Report',exact:true}).click()
    const report = await p.getByRole('dialog').innerText()
    assert(report.includes(`Cutter clearance verified for Ø${d} mm.`))
    await p.screenshot({path:`${destination}/${file}-D${d}-report.png`})
    await p.keyboard.press('Escape')
    await p.getByRole('checkbox').first().click()
    assert.equal(await p.getByRole('button',{name:'Export',exact:true}).isEnabled(),false)
    await p.getByRole('checkbox').first().click(); await ready(p)
    const waiting = p.waitForEvent('download')
    await p.getByRole('button',{name:'Export',exact:true}).click()
    const download = await waiting
    const output = `${destination}/${file}-D${d}.dxf`
    await download.saveAs(output)
    assert.equal(new DxfParser().parseSync(readFileSync(output,'utf8')).header.$INSUNITS,4)
    checks.push({step:'process-export',file,diameter:d,kinds,report,download:download.suggestedFilename()})
    if(file==='cozy-3mm-sheet-1') {
      await diameter(p,4)
      assert.equal(await p.getByRole('button',{name:'Export',exact:true}).isEnabled(),false)
      await p.getByRole('button',{name:'Report',exact:true}).click()
      const warning = await p.getByRole('dialog').innerText()
      assert(warning.includes('cannot clear'))
      await p.screenshot({path:`${destination}/oversized-cutter-blocked.png`})
      checks.push({step:'oversized-cutter',diameter:4,exportBlocked:true,report:warning})
    }
    await p.close()
    const again = await page()
    await again.locator('input[type=file]').setInputFiles(output)
    await ready(again)
    await diameter(again,d); await ready(again)
    assert((await again.locator('body').innerText()).includes('0 dogbones'))
    checks.push({step:'reimport',file,diameter:d,newReliefs:0,exportEnabled:true})
    await again.close()
  }
  const batch = await page()
  await batch.locator('input[type=file]').setInputFiles(['cozy-6mm-sheet-1','family-6mm-sheet-1'].map(n=>resolve(`tests/fixtures/safepaws/${n}.dxf`)))
  await batch.getByText('2 files',{exact:true}).waitFor()
  await diameter(batch,6); await ready(batch)
  const waiting = batch.waitForEvent('download')
  await batch.getByRole('button',{name:'Export Ready Files (ZIP)',exact:true}).click()
  const archive = await waiting; await archive.saveAs(`${destination}/batch-D6.zip`)
  await batch.screenshot({path:`${destination}/batch-D6.png`})
  checks.push({step:'batch-export',diameter:6,files:2,download:archive.suggestedFilename()})
  const oversized=await page()
  await oversized.locator('input[type=file]').setInputFiles({name:'<img src=x onerror=alert(1)>.dxf',mimeType:'application/dxf',buffer:Buffer.alloc(10*1024*1024+1)})
  await oversized.getByRole('alert').filter({hasText:'10 MB'}).waitFor()
  assert.equal(await oversized.getByRole('button',{name:'Export',exact:true}).isEnabled(),false)
  assert.equal(await oversized.locator('img[src="x"]').count(),0)
  checks.push({step:'oversized-input',rejected:true,exportBlocked:true})
  await oversized.close()
  assert.deepEqual(errors,[])
  assert.deepEqual(cspViolations,[])
  assert.deepEqual(failedRequests,[])
  writeFileSync(`${destination}/checks.json`,JSON.stringify({checks,errors,failedRequests,cspViolations},null,2))
  console.log(`Browser checks passed: ${checks.length} scenarios, no page errors or failed requests.`)
} finally {
  await browser?.close()
  server?.kill('SIGTERM')
}
