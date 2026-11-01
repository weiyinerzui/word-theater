from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    pg=b.new_page(viewport={'width':430,'height':900})
    pg.on('pageerror', lambda e: errs.append("PAGEERROR: "+str(e)))
    pg.on('console', lambda m: errs.append(f"{m.type}: {m.text}") if m.type=='error' else None)
    pg.goto('file:///root/work/word-theater/index.html'); pg.wait_for_timeout(300)
    # settings sheet
    pg.click('#btnSet'); pg.wait_for_timeout(350)
    pg.screenshot(path='shots/set_sheet.png')
    print("SETTINGS:", pg.inner_text('.sheet-card')[:300].replace('\n','|'))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(250)
    # help sheet
    pg.evaluate("()=>{document.querySelector('#btnHow')?.click()}"); pg.wait_for_timeout(300)
    print("HOW:", pg.inner_text('.sheet-card')[:200].replace('\n','|') if pg.query_selector('.sheet-card') else 'none')
    pg.screenshot(path='shots/set_how.png')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(250)
    # failure path on level 8
    pg.evaluate("()=>{Store.data.unlockAll=true;Store.save();screenMap();}"); pg.wait_for_timeout(200)
    pg.click('.map-item[data-lv="8"]'); pg.wait_for_timeout(300)
    if pg.query_selector('#next'): pg.click('#next'); pg.wait_for_timeout(300)
    for i in range(30):
        if pg.query_selector('#retry'): break
        pg.evaluate("""()=>{
          const c=document.querySelector('.wcard:not(.used)');
          if(!c) return;
          c.click();
          const wrong=['n','v','a','d'].find(k=>k!==c.dataset.pos);
          const bk=document.querySelector('.bucket[data-b="'+wrong+'"]');
          if(bk) bk.click();
        }""")
        pg.wait_for_timeout(180)
    print("HEARTS-FAIL retry btn:", bool(pg.query_selector('#retry')))
    pg.screenshot(path='shots/lv8_fail.png')
    print("FAIL TEXT:", pg.inner_text('#stage')[:200].replace('\n','|'))
    if pg.query_selector('#retry'):
        pg.click('#retry'); pg.wait_for_timeout(400)
        print("AFTER RETRY:", pg.inner_text('#stage')[:80].replace('\n','|'))
    # small viewport
    pg.set_viewport_size({'width':360,'height':740}); pg.evaluate("()=>screenMap()"); pg.wait_for_timeout(300)
    pg.screenshot(path='shots/small_map.png')
    pg.click('.map-item[data-lv="1"]'); pg.wait_for_timeout(300)
    pg.screenshot(path='shots/small_meet.png')
    # desktop
    pg.set_viewport_size({'width':1100,'height':900}); pg.evaluate("()=>screenMap()"); pg.wait_for_timeout(300)
    pg.screenshot(path='shots/desk_map.png')
    print("ERRS:", errs)
    b.close()
