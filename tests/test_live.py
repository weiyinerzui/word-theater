from playwright.sync_api import sync_playwright
import os, sys
URL = "https://weiyinerzui.github.io/word-theater/"
errs = []
os.makedirs('shots/live', exist_ok=True)
src = open('tests/test_auto.py', encoding='utf-8').read()
HELP = src.split('HELP = """')[1].split('"""')[0]
DONE = src.split('DONE = """')[1].split('"""')[0]

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 430, 'height': 900}, device_scale_factor=2)
    pg.on('pageerror', lambda e: errs.append("PAGEERROR: " + str(e)))
    pg.on('console', lambda m: errs.append(f"{m.type}: {m.text}") if m.type == 'error' else None)
    pg.goto(URL, wait_until='load'); pg.wait_for_timeout(800)
    pg.screenshot(path='shots/live/01_map.png')
    print("TITLE:", pg.title())
    pg.click('.map-item[data-lv="1"]'); pg.wait_for_timeout(500)
    pg.screenshot(path='shots/live/02_meet.png')
    pg.click('#next'); pg.wait_for_timeout(400)
    pg.screenshot(path='shots/live/03_round.png')
    # 手动做一次错误演示
    pg.evaluate("""()=>{
      const c=document.querySelector('.wcard:not(.used)');
      c.click();
      const wrong=['n','v'].find(k=>k!==c.dataset.pos);
      document.querySelector('.bucket[data-b="'+wrong+'"]').click();
    }""")
    pg.wait_for_timeout(500)
    pg.screenshot(path='shots/live/04_wrong.png')
    # 再错一次 -> 支架出现
    pg.evaluate("""()=>{
      const c=document.querySelector('.wcard:not(.used)');
      c.click();
      const wrong=['n','v'].find(k=>k!==c.dataset.pos);
      document.querySelector('.bucket[data-b="'+wrong+'"]').click();
    }""")
    pg.wait_for_timeout(600)
    pg.screenshot(path='shots/live/05_scaffold.png')
    # 通关全部
    for lv in range(1, 11):
        pg.evaluate("()=>{Store.data.unlockAll=true;Store.save();screenMap();}"); pg.wait_for_timeout(250)
        pg.click(f'.map-item[data-lv="{lv}"]'); pg.wait_for_timeout(400)
        if pg.query_selector('#next'): pg.click('#next'); pg.wait_for_timeout(300)
        for i in range(400):
            if pg.evaluate(DONE): break
            r = pg.evaluate(HELP)
            pg.wait_for_timeout(120 if r else 200)
        pg.wait_for_timeout(400)
        if pg.query_selector('#n'): pg.click('#n'); pg.wait_for_timeout(500)
        elif pg.query_selector('#retry'): print("  fail", lv)
    pg.evaluate("()=>screenMap()"); pg.wait_for_timeout(400)
    pg.screenshot(path='shots/live/06_map_done.png')
    print("STARS:", pg.inner_text('#starNum'), "DONE:", pg.evaluate("()=>document.querySelectorAll('.map-item.done').length"))
    # 平板
    pg2 = b.new_page(viewport={'width': 834, 'height': 1112})
    pg2.goto(URL); pg2.wait_for_timeout(600); pg2.screenshot(path='shots/live/07_ipad.png')
    print("ERRS:", errs)
    b.close()
