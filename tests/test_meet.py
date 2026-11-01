from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 430, 'height': 900})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file:///root/work/word-theater/index.html')
    pg.wait_for_timeout(250)
    pg.evaluate("()=>{Store.data.unlockAll=true;Store.save();screenMap();}")
    pg.wait_for_timeout(120)
    for lv in (4, 8):
        pg.evaluate("()=>screenMap()")
        pg.wait_for_timeout(150)
        pg.click('.map-item[data-lv="%d"]' % lv)
        pg.wait_for_timeout(500)
        print("LV%d MEET:" % lv, pg.inner_text('#stage')[:170].replace('\n', ' | '))
        print("   cards:", pg.eval_on_selector_all('.info-card', "e=>e.map(x=>x.className)"))
        print("   examples:", pg.eval_on_selector_all('.info-card .eg', "e=>e.map(x=>x.dataset.say)"))
        print("   overflow:", pg.evaluate("()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1"))
    print("ERRS:", errs)
    b.close()
