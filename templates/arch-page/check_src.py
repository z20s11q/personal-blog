#!/usr/bin/env python3
"""Check that every quoted source reference "path" or "path:a-b" in the given files exists in a repository checkout.

Usage: check_src.py <repo_root> <file> [<file> ...] [--prefix <path prefix>]
Only quoted strings that start with the prefix (default: any path containing "/" with a file extension) are checked.
Prints each broken reference and exits 1 when any is found.
"""
import re
import sys
from pathlib import Path


def main() -> None:
    args = sys.argv[1:]
    prefix = ""
    if "--prefix" in args:
        i = args.index("--prefix")
        prefix = args[i + 1]
        del args[i : i + 2]
    if len(args) < 2:
        raise SystemExit(__doc__)
    root, files = Path(args[0]), args[1:]
    pattern = re.compile(r"""['"`](%s[\w./@-]*\.\w+)(?::(\d+)(?:-(\d+))?)?['"`]""" % re.escape(prefix))
    bad, seen = [], set()
    for name in files:
        for m in pattern.finditer(Path(name).read_text(encoding="utf-8")):
            path, a, b = m.group(1), m.group(2), m.group(3)
            if "/" not in path or path.startswith(("http", "/")):
                continue
            if (path, a, b) in seen:
                continue
            seen.add((path, a, b))
            target = root / path
            if not target.is_file():
                bad.append(f"{name}: {path} is missing")
                continue
            if a:
                lines = sum(1 for _ in target.open(encoding="utf-8", errors="replace"))
                end = int(b or a)
                if int(a) > end or end > lines:
                    bad.append(f"{name}: {path}:{a}{'-' + b if b else ''} is outside 1-{lines}")
    for line in bad:
        print(line)
    print(f"checked {len(seen)} references, {len(bad)} broken")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
