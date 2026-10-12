#!/usr/bin/env python3
"""Assemble a single-file architecture page as described by page.config.json.

Usage: build_page.py [page_dir]; page_dir defaults to the directory of this script.

page.config.json:
  out       output html path, relative to this directory
  template  page template (default page.template.html); must contain <!--OVERVIEW_SVG-->,
            <!--COMPONENTS_SVG-->, <!--DATA--> and <!--SCRIPTS--> exactly once
  text      {KEY: html} filling every {{KEY}} in the template; a {{KEY}} left unfilled stops the build
  toc       [[href, label], ...] appended to the page menu at <!--TOC_EXTRA-->
  sections  html files inserted in order at <!--EXTRA_SECTIONS-->
  overview  Archify html whose diagram svg is inlined twice (default overview/overview.html)
  data      {element id: {file, type: json|jsonl|text, notice}}; each becomes
            <script id=... type="application/json">, text and jsonl are stored as one JSON string
  scripts   files inlined in order; engine.js first, then the page data, then page-specific code
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parent

ARCHIFY_LICENSE = """MIT License

Copyright (c) 2026 tt-a1i (Archify)
Copyright (c) 2025 Cocoon AI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"""

def extract_svg(path: Path) -> str:
    html = path.read_text(encoding="utf-8")
    if path.suffix == ".svg":
        return html.strip()
    match = re.search(r"<svg viewBox=\"[^\"]*\" role=\"img\".*?</svg>", html, re.S)
    if match is None:
        raise SystemExit(f"no diagram svg in {path}")
    return match.group(0)


def scoped_svg(svg: str, prefix: str) -> str:
    """Archify reuses ids such as "arrowhead", so each inline copy gets its own prefix."""
    ids = set(re.findall(r'\sid="([^"]+)"', svg))
    svg = re.sub(r'(\s)id="([^"]+)"', lambda m: f'{m.group(1)}id="{prefix}-{m.group(2)}"', svg)
    svg = re.sub(r'url\(#([^)]+)\)', lambda m: f'url(#{prefix}-{m.group(1)})' if m.group(1) in ids else m.group(0), svg)
    svg = re.sub(r'href="#([^"]+)"', lambda m: f'href="#{prefix}-{m.group(1)}"' if m.group(1) in ids else m.group(0), svg)
    svg = re.sub(
        r'aria-(labelledby|describedby)="([^"]+)"',
        lambda m: f'aria-{m.group(1)}="' + " ".join(f"{prefix}-{x}" if x in ids else x for x in m.group(2).split()) + '"',
        svg,
    )
    note = "Diagram generated with Archify; ids are prefixed and styles come from the page.\n" + ARCHIFY_LICENSE
    return f"<!-- {note}-->\n{svg}"


def data_tag(element_id: str, spec: dict) -> str:
    text = (HERE / spec["file"]).read_text(encoding="utf-8")
    kind = spec.get("type", "json")
    if kind == "json":
        json.loads(text)
        body = text
    else:
        if kind == "jsonl":
            for line in text.strip().splitlines():
                json.loads(line)
        body = json.dumps(text, ensure_ascii=False)
    body = body.replace("</", "<\\/").replace("<!--", "\\u003c!--")
    notice = f"<!-- {spec['notice']} -->\n" if spec.get("notice") else ""
    return f'{notice}<script id="{element_id}" type="application/json">{body}</script>'


def main() -> None:
    cfg = json.loads((HERE / "page.config.json").read_text(encoding="utf-8"))
    overview = HERE / cfg.get("overview", "overview/overview.html")
    svg = extract_svg(overview)
    if overview.suffix != ".svg":
        overview.with_suffix(".svg").write_text(svg, encoding="utf-8")
    components = extract_svg(HERE / cfg["components"]) if cfg.get("components") else svg
    page = (HERE / cfg.get("template", "page.template.html")).read_text(encoding="utf-8")
    for key, value in cfg.get("text", {}).items():
        page = page.replace("{{" + key + "}}", value)
    missing = sorted(set(re.findall(r"\{\{([A-Z_]+)\}\}", page)))
    if missing:
        raise SystemExit(f"page.config.json text is missing: {', '.join(missing)}")
    toc = "".join(f'<a href="{href}">{label}</a>' for href, label in cfg.get("toc", []))
    sections = "\n".join((HERE / name).read_text(encoding="utf-8") for name in cfg.get("sections", []))
    page = page.replace("<!--TOC_EXTRA-->", toc).replace("<!--EXTRA_SECTIONS-->", sections)
    data = "\n".join(data_tag(k, v) for k, v in cfg.get("data", {}).items())
    sources = [(HERE / name).read_text(encoding="utf-8").replace("</script", "<\\/script") for name in cfg["scripts"]]
    scripts = "\n".join(f"<script>\n{src}\n</script>" for src in sources)
    for marker, value in [
        ("<!--OVERVIEW_SVG-->", scoped_svg(svg, "ov")),
        ("<!--COMPONENTS_SVG-->", scoped_svg(components, "cp")),
        ("<!--DATA-->", data),
        ("<!--SCRIPTS-->", scripts),
    ]:
        if page.count(marker) != 1:
            raise SystemExit(f"template must contain {marker} exactly once")
        page = page.replace(marker, value)
    out = (HERE / cfg["out"]).resolve()
    out.write_text(page, encoding="utf-8")
    print(f"wrote {out} ({len(page.encode('utf-8')):,} bytes)")


if __name__ == "__main__":
    main()
