from playwright.sync_api import sync_playwright
import os
errs=[]
os.makedirs('shots/views', exist_ok=True)
VIEWS=[(360,760,'m360'),(430,900,'m430'),(768,1024,'ipad'),(834,1112,'ipad2'),(1200,900,'desk')]
with sync_playwright() as p:
    b=p.chromium.launch()
    for w,h,name in VIEWS:
        pg=b.new_page(viewport={'width':w,'height':h},device_scale_factor=2)
        pg.on('pageerror', lambda e: errs.append("PAGEERROR: "+str(e)))
        pg.on('console', lambda m: errs.append(f"{m.type}: {m.text}") if m.type=='error' else None)
        pg.goto('file:///root/work/word-theater/index.html'); pg.wait_for_timeout(280)
        pg.evaluate("()=>{Store.data.unlockAll=true;Store.save();screenMap();}"); pg.wait_for_timeout(150)
        pg.screenshot(path=f'shots/views/{name}_map.png')
        # 第6关：五个桶
        pg.click('.map-item[data-lv="6"]'); pg.wait_for_timeout(500)
        pg.screenshot(path=f'shots/views/{name}_lv6.png', full_page=True)
        # 溢流检测
        over=pg.evaluate("()=>({sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth})")
        print(name, over, "OVERFLOW" if over['sw']>over['cw']+1 else "ok")
        pg.close()
    print("ERRS:", errs)
    b.close()
