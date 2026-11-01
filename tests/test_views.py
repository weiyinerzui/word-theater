from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    pg=b.new_page(viewport={'width':430,'height':900})
    pg.on('pageerror', lambda e: errs.append("PAGEERROR: "+str(e)))
    pg.goto('file:///root/work/word-theater/index.html'); pg.wait_for_timeout(300)
    for lv,tag in [(2,'meet2'),(3,'meet3')]:
        pg.evaluate("()=>{Store.data.unlockAll=true;Store.save();screenMap();}"); pg.wait_for_timeout(200)
        pg.click(f'.map-item[data-lv="{lv}"]'); pg.wait_for_timeout(400)
        pg.screenshot(path=f'shots/{tag}.png')
    # map with progress
    pg.evaluate("()=>{Store.data.levels={1:3,2:2,3:1};Store.data.stars=6;Store.save();screenMap();}"); pg.wait_for_timeout(300)
    pg.screenshot(path='shots/map_prog.png')
    # desktop
    pg.set_viewport_size({'width':1200,'height':860})
    pg.evaluate("()=>screenMap()"); pg.wait_for_timeout(300)
    pg.screenshot(path='shots/desk_map.png')
    pg.click('.map-item[data-lv="5"]'); pg.wait_for_timeout(400)
    pg.screenshot(path='shots/desk_lv5.png')
    print("ERRS:", errs)
    b.close()
