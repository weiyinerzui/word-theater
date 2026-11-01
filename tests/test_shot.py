import sys, os
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'file:///root/work/word-theater/index.html'
out = sys.argv[2] if len(sys.argv) > 2 else 'shots/x'
os.makedirs(out, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 430, 'height': 900}, device_scale_factor=2)
    pg.goto(URL); pg.wait_for_timeout(600)
    pg.screenshot(path=f'{out}/a_map.png')
    pg.evaluate("()=>{Store.data.unlockAll=true;Store.save();screenMap();}"); pg.wait_for_timeout(200)
    pg.click('.map-item[data-lv="1"]'); pg.wait_for_timeout(400)
    pg.click('#next'); pg.wait_for_timeout(400)
    pg.screenshot(path=f'{out}/b_round.png')
    pg.evaluate("""()=>{
      const c=document.querySelector('.wcard:not(.used)'); c.click();
      const wrong=['n','v'].find(k=>k!==c.dataset.pos);
      document.querySelector('.bucket[data-b="'+wrong+'"]').click();
    }"""); pg.wait_for_timeout(500)
    pg.screenshot(path=f'{out}/c_wrong.png')
    b.close()
