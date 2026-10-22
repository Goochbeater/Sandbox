// dialogue portraits: node test16.js
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await (await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 })).newPage(); const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERR: ' + e.message));
  await pg.goto('file://' + require('path').resolve(__dirname, '../../einheri.html')); await pg.waitForTimeout(1500);
  const urls = await pg.evaluate(() => { rigAngr(); rigSurtr(); rigUtgard(); rigValk(); const out = []; for (const id of ['angr', 'surtr', 'utgard', 'skogul', 'hildr', 'einar']) { drawPortrait(id); out.push(document.getElementById('portrait').toDataURL()); } return out; });
  const fs = require('fs'); urls.forEach((u, i) => fs.writeFileSync(__dirname + '/shots/_q' + i + '.png', Buffer.from(u.split(',')[1], 'base64')));
  console.log(errs.join('\n')); await b.close();
  require('child_process').execSync(`python3 -c "
from PIL import Image
ims=[Image.open('${__dirname}/shots/_q%d.png'%i) for i in range(6)]
o=Image.new('RGB',(152*6,152))
[o.paste(im,(i*152,0)) for i,im in enumerate(ims)]
o.save('${__dirname}/shots/portraits.png')"`);
})();
