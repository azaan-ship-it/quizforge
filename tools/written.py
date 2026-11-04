"""Tiny parser for hand-written sets."""
import random

R = random.Random(11)


def S(sid, title, subject, grade, difficulty, description, body):
    qs = []
    for line in body.strip().splitlines():
        line = line.strip()
        if not line:
            continue
        kind, rest = line.split('|', 1)
        kind = kind.strip()
        parts = [p.strip() for p in rest.split('|')]
        if kind == 'Q':
            q, right, *wrong = parts
            assert 2 <= len(wrong) + 1 <= 4 and right not in wrong, (sid, line)
            answers = [right] + wrong
            R.shuffle(answers)
            qs.append({"type": "mc", "q": q, "a": answers, "c": [answers.index(right)]})
        elif kind in ('T', 'F'):
            qs.append({"type": "tf", "q": parts[0], "a": ["True", "False"], "c": [0 if kind == 'T' else 1]})
        elif kind == 'Y':
            q, acc = parts
            qs.append({"type": "type", "q": q, "accept": [a.strip() for a in acc.split(',') if a.strip()]})
        else:
            raise ValueError(f"{sid}: bad line {line}")
    return {"id": sid, "title": title, "subject": subject, "grade": grade, "difficulty": difficulty, "description": description, "questions": qs}
