"""Builds data/official-sets.json from the generators and hand-written sets.
Run:  python tools/build_sets.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from sets_math import math_sets
from sets_tables import table_sets
from sets_written_sci import SCIENCE
from sets_written_more import MORE

VERSION = 1  # bump when official sets change so servers re-import them

ORIGINAL = os.path.join(os.path.dirname(__file__), '..', 'data', 'sample-sets.json')
OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'official-sets.json')
EXTRA_META = {
    "sample-space": ("Science", "3–5", "easy"),
    "sample-coding": ("Computer Science", "6–8", "easy"),
    "sample-capitals": ("Geography", "6–8", "easy"),
}


def check(s):
    assert s["id"] and s["title"] and s["questions"], s["id"]
    assert s["difficulty"] in ("easy", "medium", "hard"), s["id"]
    seen = set()
    for q in s["questions"]:
        key = (q["q"], tuple(sorted(q.get("a") or q.get("accept"))))
        assert key not in seen, (s["id"], "duplicate", q["q"])
        seen.add(key)
        assert len(q["q"]) <= 300, (s["id"], q["q"])
        if q["type"] == "type":
            assert q["accept"] and all(0 < len(a) <= 80 for a in q["accept"]), (s["id"], q)
            continue
        a, c = q["a"], q["c"]
        assert 2 <= len(a) <= 4 and all(0 < len(x) <= 120 for x in a), (s["id"], q)
        assert len(set(a)) == len(a), (s["id"], "repeated answer", q)
        assert c and all(0 <= i < len(a) for i in c) and len(c) < len(a), (s["id"], q)


def main():
    sets = []
    if os.path.exists(ORIGINAL):
        for s in json.load(open(ORIGINAL, encoding="utf-8")):
            subject, grade, diff = EXTRA_META.get(s["id"], ("General", "6–8", "easy"))
            qs = [{"type": "mc", "q": q["q"], "a": q["a"], "c": [q["c"]] if isinstance(q["c"], int) else q["c"]} for q in s["questions"]]
            sets.append({"id": s["id"], "title": s["title"], "subject": subject, "grade": grade, "difficulty": diff, "description": s.get("description", ""), "questions": qs})
    sets += math_sets() + table_sets() + SCIENCE + MORE
    ids = [s["id"] for s in sets]
    assert len(ids) == len(set(ids)), "duplicate set ids"
    for s in sets:
        check(s)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"version": VERSION, "sets": sets}, f, ensure_ascii=False, separators=(",", ":"))
    by_subject = {}
    for s in sets:
        by_subject.setdefault(s["subject"], [0, 0])
        by_subject[s["subject"]][0] += 1
        by_subject[s["subject"]][1] += len(s["questions"])
    print(f"{len(sets)} sets, {sum(len(s['questions']) for s in sets)} questions, {os.path.getsize(OUT) // 1024} KB")
    for k, (n, q) in sorted(by_subject.items()):
        print(f"  {k}: {n} sets, {q} questions")


if __name__ == "__main__":
    main()
