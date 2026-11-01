from playwright.sync_api import sync_playwright
import sys

errs = []
HELP = """
() => {
  const slots = [...document.querySelectorAll('.slot:not(.filled)')];
  if (slots.length) {
    const need = slots.map(s=>s.dataset.need);
    const card = [...document.querySelectorAll('.pool .wcard:not(.used)')].find(c=>need.includes(c.dataset.pos));
    if (card) { card.click(); const slot = slots.find(s=>s.dataset.need===card.dataset.pos); slot.click(); return 'build'; }
    return null;
  }
  const c = document.querySelector('.wcard:not(.used)');
  if (c) { const b=document.querySelector('.bucket[data-b="'+c.dataset.pos+'"]'); if(b){ c.click(); b.click(); return 'sort'; } }
  const ch = document.querySelector('.chip:not(.found)');
  if (ch) { const b=document.querySelector('.bucket[data-b="'+ch.dataset.pos+'"]'); if(b){ ch.click(); b.click(); return 'chip'; } }
  return null;
}
"""
DONE = """
() => !!document.querySelector('#retry') || !!document.querySelector('.sheet-card') || !!document.querySelector('.map-grid')
"""


def play(pg, budget=600):
    for i in range(budget):
        if pg.evaluate(DONE):
            return i
        r = pg.evaluate(HELP)
        pg.wait_for_timeout(150 if r else 250)
    return -1


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else '/root/work/word-theater/shots'
    import os
    os.makedirs(out, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 430, 'height': 900})
        pg.on('pageerror', lambda e: errs.append("PAGEERROR: " + str(e)))
        pg.on('console', lambda m: errs.append("%s: %s" % (m.type, m.text)) if m.type == 'error' else None)
        pg.goto('file:///root/work/word-theater/index.html')
        pg.wait_for_timeout(300)
        pg.evaluate("()=>{Store.data.unlockAll=true;Store.save();}")
        pg.reload()
        pg.wait_for_timeout(300)
        for lv in range(1, 9):
            pg.evaluate("()=>screenMap()")
            pg.wait_for_timeout(200)
            pg.click('.map-item[data-lv="%d"]' % lv)
            pg.wait_for_timeout(350)
            if pg.query_selector('#next'):
                pg.screenshot(path='%s/lv%d_meet.png' % (out, lv))
                pg.click('#next')
                pg.wait_for_timeout(300)
            pg.screenshot(path='%s/lv%d_round.png' % (out, lv))
            n = play(pg)
            pg.wait_for_timeout(500)
            state = pg.evaluate("()=>({stars:Store.data.stars, lv:JSON.stringify(Store.data.levels)})")
            txt = pg.inner_text('#stage')[:90].replace('\n', '|')
            print("LV%d iters=%s txt=%s state=%s" % (lv, n, txt, state))
            pg.screenshot(path='%s/lv%d_end.png' % (out, lv))
            if pg.query_selector('#n'):
                pg.click('#n')
                pg.wait_for_timeout(600)
            elif pg.query_selector('#retry'):
                print("   !! FAILED on level", lv)
                pg.click('#retry')
                pg.wait_for_timeout(400)
        pg.screenshot(path='%s/final.png' % out)
        print("ERRS:", errs)
        # certificate check
        pg.evaluate("()=>screenMap()")
        pg.wait_for_timeout(200)
        print("MAP STARS:", pg.inner_text('#starNum'))
        print("MAP DONE:", pg.evaluate("()=>document.querySelectorAll('.map-item.done').length"))
        b.close()


main()
