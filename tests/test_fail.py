from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':430,'height':900})
    pg.on('pageerror', lambda e: errs.append("PAGEERROR: "+str(e)))
    pg.on('console', lambda m: errs.append(f"{m.type}: {m.text}") if m.type=='error' else None)
    pg.goto('file:///root/work/word-theater/index.html'); pg.wait_for_timeout(300)
    pg.evaluate("()=>{Store.data.unlockAll=true;Store.save();screenMap();}"); pg.wait_for_timeout(200)
    pg.click('.map-item[data-lv="10"]'); pg.wait_for_timeout(400)
    print("HEARTS VISIBLE:", pg.evaluate("()=>{const h=document.getElementById('hearts');return h.hidden+' '+h.innerText}"))
    pg.screenshot(path='shots/lv8_hearts.png')
    for i in range(12):
        if pg.query_selector('#retry'): break
        pg.evaluate("""()=>{
          const opt=[...document.querySelectorAll('.opt:not(.wrong)')];
          if(opt.length){ opt[0].click(); return; }
          const c=document.querySelector('.wcard:not(.used)');
          if(c){
            c.click();
            const wrong=['n','v','a','d','p'].find(k=>k!==c.dataset.pos);
            document.querySelector('.bucket[data-b="'+wrong+'"]').click();
            return;
          }
          const ch=document.querySelector('.chip:not(.found)');
          if(ch){
            ch.click();
            const wrong=['n','v','a','d','p'].find(k=>k!==ch.dataset.pos);
            document.querySelector('.bucket[data-b="'+wrong+'"]').click();
          }
        }""")
        pg.wait_for_timeout(700)
    print("RETRY:", bool(pg.query_selector('#retry')), "hearts:", pg.evaluate("()=>document.getElementById('hearts').innerText"))
    pg.screenshot(path='shots/lv8_fail.png')
    print("FAIL:", pg.inner_text('#stage')[:90].replace('\n','|'))
    if pg.query_selector('#retry'):
        pg.click('#retry'); pg.wait_for_timeout(600)
        print("RETRY OK, hearts:", pg.evaluate("()=>document.getElementById('hearts').innerText"), "stage:", pg.inner_text('#stage')[:40].replace('\n','|'))
    print("ERRS:", errs)
    b.close()
