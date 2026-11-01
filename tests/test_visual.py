from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 430, 'height': 900})
    pg.goto('file:///root/work/word-theater/index.html')
    pg.wait_for_timeout(250)
    pg.evaluate("()=>{Store.data.unlockAll=true;Store.save();screenMap();}")
    pg.wait_for_timeout(120)
    # 地图上的五个岗位徽章
    print("MAP ROLES:", pg.eval_on_selector_all('.role', "els=>els.map(e=>e.textContent.trim()+'|'+getComputedStyle(e).color)"))
    pg.click('.map-item[data-lv="6"]')
    pg.wait_for_timeout(450)
    print("BUCKETS:", pg.eval_on_selector_all('.bucket',
        "els=>els.map(e=>[e.dataset.b, e.querySelector('.b-name').textContent.trim(), getComputedStyle(e).borderColor].join(' ~ '))"))
    # 五个桶都要可点，且都在视口内
    print("BUCKET BOXES:", pg.eval_on_selector_all('.bucket',
        "els=>els.map(e=>{const r=e.getBoundingClientRect();return e.dataset.b+':'+Math.round(r.top)+','+Math.round(r.bottom)})"))
    print("VIEWPORT H:", 900)
    # 点一个介词词进介词桶
    pg.evaluate("""()=>{const c=document.querySelector('.wcard[data-pos="p"]'); c.click();
        document.querySelector('.bucket[data-b="p"]').click();}""")
    pg.wait_for_timeout(400)
    print("AFTER P:", pg.inner_text('#hint')[:80].replace('\n', ' '))
    print("P COUNT:", pg.inner_text('.bucket[data-b="p"] .b-count'))
    print("MINI:", pg.eval_on_selector_all('.bucket .mini', "els=>els.map(e=>e.textContent.trim()+'|'+getComputedStyle(e).color)"))
    b.close()
