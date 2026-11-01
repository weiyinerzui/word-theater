#!/usr/bin/env python3
"""把 src/ 下的三个文件打包成单文件 index.html（可直接双击打开 / 直接部署）。

用法：python3 build.py
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"

html = (SRC / "index.html").read_text(encoding="utf-8")
css = (SRC / "style.css").read_text(encoding="utf-8")
js = (SRC / "app.js").read_text(encoding="utf-8")

for name, text in (("style.css", css), ("app.js", js)):
    if "</script>" in text.lower() or "</style>" in text.lower():
        raise SystemExit(f"{name} 含有会提前闭合标签的字符串，无法内联")

html = html.replace(
    '<link rel="stylesheet" href="style.css">',
    "<style>\n" + css + "\n</style>",
)
html = html.replace(
    '<script src="app.js"></script>',
    "<script>\n" + js + "\n</script>",
)

if "style.css" in html or "app.js" in html:
    raise SystemExit("内联失败：仍存在外链引用")

out = ROOT / "index.html"
out.write_text(html, encoding="utf-8")
size = out.stat().st_size / 1024
print(f"✅ {out}  ({size:.0f} KB)")