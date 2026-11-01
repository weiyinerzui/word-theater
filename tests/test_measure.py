from playwright.sync_api import sync_playwright

JS = ("()=>{"
      "const bs=[...document.querySelectorAll('.bucket')];"
      "return bs.map(b=>{"
      " const r=b.getBoundingClientRect();"
      " const nm=b.querySelector('.b-name');"
      " const sm=b.querySelector('small');"
      " return {k:b.dataset.b,x:Math.round(r.x),y:Math.round(r.y),"
      " w:Math.round(r.width),h:Math.round(r.height),"
      " nameW:Math.round(nm.getBoundingClientRect().width),nameScroll:nm.scrollWidth,"
      " smallH:Math.round(sm.getBoundingClientRect().height)};});}")

with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h in [(360, 760), (430, 900), (834, 1112), (1200, 900)]:
        pg = b.new_page(viewport={'width': w, 'height': h})
        pg.goto('file:///root/work/word-theater/index.html')
        pg.wait_for_timeout(250)
        pg.evaluate("()=>{Store.data.unlockAll=true;Store.save();screenMap();}")
        pg.wait_for_timeout(120)
        pg.click('.map-item[data-lv="6"]')
        pg.wait_for_timeout(450)
        d = pg.evaluate(JS)
        rows = {}
        for x in d:
            rows.setdefault(x['y'], []).append(x)
        print("--- %dx%d : %d buckets in %d row(s)" % (w, h, len(d), len(rows)))
        for y in sorted(rows):
            parts = []
            for i in rows[y]:
                parts.append("%s w=%d trunc=%s" % (i['k'], i['w'], i['nameScroll'] > i['nameW'] + 1))
            print("    y=%d  %s" % (y, " | ".join(parts)))
        ov = pg.evaluate("()=>{const p=document.getElementById('pool');return p.scrollWidth>p.clientWidth+1}")
        print("    pool overflow:", ov)
        pg.close()
    b.close()
print("MEASURE-END")
