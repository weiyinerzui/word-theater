from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1200, 'height': 900})
    pg.goto('file:///root/work/word-theater/index.html')
    pg.wait_for_timeout(250)
    pg.evaluate("()=>{Store.data.unlockAll=true;Store.save();screenMap();}")
    pg.wait_for_timeout(120)

    # 第 4 关首轮只有 2 个桶（介词 / 名词）
    pg.click('.map-item[data-lv="4"]')
    pg.wait_for_timeout(450)
    if pg.query_selector('#next'):
        pg.click('#next')
        pg.wait_for_timeout(450)
    print("LV4 buckets:", pg.eval_on_selector_all('.bucket', "e=>e.map(x=>x.dataset.b)"))
    print("LV4 key badges:", pg.eval_on_selector_all('.b-key', "e=>e.map(x=>x.textContent)"))
    # 选一个词，按 3（越界）应无反应
    pg.evaluate("()=>{const c=document.querySelector('.wcard[data-pos=\"p\"]');c.click();}")
    pg.wait_for_timeout(100)
    pg.keyboard.press('3')
    pg.wait_for_timeout(300)
    cnt = pg.eval_on_selector_all('.bucket .mini', "e=>e.length")
    print("after KEY 3 (out of range) placed:", cnt)
    pg.keyboard.press('1')
    pg.wait_for_timeout(350)
    print("after KEY 1 placed:", pg.eval_on_selector_all('.bucket .mini', "e=>e.length"),
          "|", pg.inner_text('#hint')[:50].replace('\n', ' '))

    # 第 6 关 5 个桶
    pg.evaluate("()=>screenMap()")
    pg.wait_for_timeout(150)
    pg.click('.map-item[data-lv="6"]')
    pg.wait_for_timeout(450)
    print("LV6 buckets:", pg.eval_on_selector_all('.bucket', "e=>e.map(x=>x.dataset.b)"))
    print("LV6 key badges:", pg.eval_on_selector_all('.b-key', "e=>e.map(x=>x.textContent)"))
    pg.evaluate("()=>{const c=document.querySelector('.wcard[data-pos=\"p\"]');c.click();}")
    pg.wait_for_timeout(80)
    pg.keyboard.press('5')
    pg.wait_for_timeout(350)
    print("after KEY 5 (介词) placed:", pg.eval_on_selector_all('.bucket .mini', "e=>e.map(x=>x.textContent.trim())"))
    b.close()
