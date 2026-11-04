"""Generated math sets. Every answer is computed, and wrong answers come from common mistakes."""
import math
import random
import re
from fractions import Fraction as F

R = random.Random(2026)
N = 25  # questions per set


def ff(x):
    """Format a fraction: 3/4, 2, or -1/2."""
    x = F(x)
    return str(x.numerator) if x.denominator == 1 else f"{x.numerator}/{x.denominator}"


def mixed(x):
    """Format as a mixed number: 2 1/3."""
    x = F(x)
    if x.denominator == 1:
        return str(x.numerator)
    sign = '-' if x < 0 else ''
    x = abs(x)
    whole, rem = divmod(x.numerator, x.denominator)
    return f"{sign}{whole} {rem}/{x.denominator}" if whole else f"{sign}{rem}/{x.denominator}"


def num(x):
    """Tidy number formatting (no trailing .0)."""
    if isinstance(x, F):
        return ff(x)
    if isinstance(x, float):
        s = f"{x:.4f}".rstrip('0').rstrip('.')
        return s if s not in ('-0', '') else '0'
    return str(x)


def mc(q, right, wrongs, fallback=None):
    right = str(right)
    seen, ws = {right}, []
    for w in wrongs:
        w = str(w)
        if w not in seen:
            seen.add(w)
            ws.append(w)
        if len(ws) == 3:
            break
    if fallback is None and re.search(r'-?\d+(\.\d+)?', right):
        def fallback():
            m = re.search(r'-?\d+(\.\d+)?', right)
            v = float(m.group())
            step = R.choice([1, 2, 3, -1, -2]) * (1 if v == int(v) else 0.5) * max(1, abs(v) // 10)
            nv = v + step
            nv_s = str(int(nv)) if nv == int(nv) and '.' not in m.group() else num(round(nv, 2))
            return right[:m.start()] + nv_s + right[m.end():]
    tries = 0
    while len(ws) < 3 and fallback and tries < 50:
        w = str(fallback())
        tries += 1
        if w not in seen:
            seen.add(w)
            ws.append(w)
    answers = [right] + ws
    R.shuffle(answers)
    return {"type": "mc", "q": q, "a": answers, "c": [answers.index(right)]}


def typed(q, *accept):
    return {"type": "type", "q": q, "accept": [str(a) for a in accept]}


def near_int(v, spread=10):
    return lambda: v + R.choice([i for i in range(-spread, spread + 1) if i])


def build(gen, n=N, typed_every=0):
    out, seen = [], set()
    tries = 0
    while len(out) < n and tries < n * 40:
        tries += 1
        q = gen(len(out), typed_every and len(out) % typed_every == typed_every - 1)
        if q["q"] in seen:
            continue
        seen.add(q["q"])
        out.append(q)
    return out


# ---------- whole numbers ----------
def g_add(lo, hi, symbol='+'):
    def g(i, t):
        a, b = R.randint(lo, hi), R.randint(lo, hi)
        if symbol == '-':
            a, b = max(a, b), min(a, b)
            ans = a - b
        else:
            ans = a + b
        q = f"{a} {symbol} {b} = ?"
        if t:
            return typed(q, ans)
        return mc(q, ans, [ans + 1, ans - 1, ans + 10, ans - 10, a + b if symbol == '-' else abs(a - b)], near_int(ans))
    return g


def g_mult(lo, hi, lo2=None, hi2=None):
    lo2, hi2 = lo2 or lo, hi2 or hi

    def g(i, t):
        a, b = R.randint(lo, hi), R.randint(lo2, hi2)
        ans = a * b
        q = f"{a} × {b} = ?"
        if t:
            return typed(q, ans)
        return mc(q, ans, [a * (b + 1), a * (b - 1), (a + 1) * b, a + b], near_int(ans, 12))
    return g


def g_div_facts(i, t):
    b, ans = R.randint(2, 12), R.randint(1, 12)
    a = b * ans
    q = f"{a} ÷ {b} = ?"
    if t:
        return typed(q, ans)
    return mc(q, ans, [ans + 1, ans - 1, ans + 2, b], near_int(ans, 3))


def g_long_div(i, t):
    b = R.randint(3, 12)
    a = R.randint(100, 999)
    qt, r = divmod(a, b)
    right = f"{qt} R{r}" if r else str(qt)
    wrongs = [f"{qt + 1} R{r}" if r else str(qt + 1), f"{qt} R{(r + 1) % b}" if r else f"{qt} R1", f"{qt - 1} R{r}" if r else str(qt - 1), f"{qt} R{b - r}" if r else str(qt + 10)]
    return mc(f"{a} ÷ {b} = ? (use R for a remainder)", right, wrongs)


PLACES = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands']


def g_place(i, t):
    n = R.randint(10000, 999999)
    s = str(n)
    pos = R.randint(0, len(s) - 1)
    digit = s[len(s) - 1 - pos]
    if R.random() < 0.5:
        return mc(f"In {n:,}, which digit is in the {PLACES[pos]} place?", digit, [s[len(s) - 1 - k] for k in range(len(s)) if k != pos] + list('0123456789'))
    if digit == '0':
        return mc(f"In {n:,}, which digit is in the {PLACES[pos]} place?", digit, [s[len(s) - 1 - k] for k in range(len(s)) if k != pos] + list('123456789'))
    val = int(digit) * 10 ** pos
    return mc(f"What is the value of the digit {digit} in the {PLACES[pos]} place of {n:,}?", f"{val:,}", [f"{int(digit) * 10 ** k:,}" for k in range(6) if k != pos])


def g_round(i, t):
    n = R.randint(1000, 99999)
    to = R.choice([10, 100, 1000])
    ans = int(math.floor(n / to + 0.5) * to)
    q = f"Round {n:,} to the nearest {to:,}."
    if t:
        return typed(q, ans, f"{ans:,}")
    return mc(q, f"{ans:,}", [f"{ans - to:,}", f"{ans + to:,}", f"{(n // to) * to:,}" if (n // to) * to != ans else f"{ans + 2 * to:,}", f"{n:,}"])


def g_money(i, t):
    coins = {'quarter': 25, 'dime': 10, 'nickel': 5, 'penny': 1}
    picks = R.sample(list(coins), R.randint(2, 3))
    counts = {c: R.randint(1, 4) for c in picks}
    total = sum(coins[c] * k for c, k in counts.items())
    plural = {'penny': 'pennies'}
    desc = ', '.join(f"{k} {plural.get(c, c + 's') if k > 1 else c}" for c, k in counts.items())
    q = f"How many cents is {desc}?"
    if t:
        return typed(q, total, f"{total} cents", f"{total}¢")
    return mc(q, f"{total}¢", [f"{total + 5}¢", f"{total - 5}¢", f"{total + 10}¢", f"{sum(counts.values())}¢"])


# ---------- fractions ----------
def rand_frac(maxd=12, proper=True):
    d = R.randint(2, maxd)
    n = R.randint(1, d - 1) if proper else R.randint(1, d * 3)
    return F(n, d), n, d


def g_equiv(i, t):
    f, n, d = rand_frac(9)
    k = R.randint(2, 6)
    q = f"Which fraction is equal to {n}/{d}?"
    return mc(q, f"{n * k}/{d * k}", [f"{n + k}/{d + k}", f"{n * k}/{d * (k + 1)}", f"{n * k + 1}/{d * k}", f"{n}/{d * k}"])


def g_simplify(i, t):
    f = F(R.randint(1, 9), R.randint(2, 10))
    while f.denominator == 1:
        f = F(R.randint(1, 9), R.randint(2, 10))
    k = R.randint(2, 6)
    n, d = f.numerator * k, f.denominator * k
    q = f"Simplify {n}/{d}."
    if t:
        return typed(f"Write {n}/{d} in simplest form.", ff(f))
    half = F(n, d * 1)
    return mc(q, ff(f), [f"{n // 2}/{d}" if n % 2 == 0 else f"{n}/{d // 2 or 1}", f"{f.numerator + 1}/{f.denominator}", f"{f.numerator}/{f.denominator + 1}", f"{n - 1}/{d - 1}"])


def g_add_like(i, t):
    d = R.randint(3, 12)
    a, b = R.randint(1, d - 1), R.randint(1, d - 1)
    op = R.choice(['+', '−'])
    if op == '−' and a < b:
        a, b = b, a
    res = F(a + b, d) if op == '+' else F(a - b, d)
    return mc(f"{a}/{d} {op} {b}/{d} = ? (simplest form)", mixed(res), [f"{a + b if op == '+' else a - b}/{d * 2}", mixed(res + F(1, d)), mixed(abs(res - F(1, d))) if res != F(1, d) else '0', f"{a + b if op == '+' else a - b}/{d}" if res.denominator != d else mixed(res + F(2, d))])


def g_add_unlike(mixed_nums=False, sub=False):
    def g(i, t):
        while True:
            d1, d2 = R.sample([2, 3, 4, 5, 6, 8, 9, 10, 12], 2)
            a, b = F(R.randint(1, d1 - 1), d1), F(R.randint(1, d2 - 1), d2)
            if mixed_nums:
                a += R.randint(1, 4)
                b += R.randint(1, 3)
            op = '−' if (sub or (not sub and R.random() < 0.4)) else '+'
            if op == '−' and a < b:
                a, b = b, a
            res = a + b if op == '+' else a - b
            if res != 0:
                break
        show = mixed if mixed_nums else ff
        q = f"{show(a)} {op} {show(b)} = ? (simplest form)"
        # classic mistake: add tops and bottoms
        na, nb = a - int(a), b - int(b)
        wrong1 = f"{na.numerator + nb.numerator if op == '+' else abs(na.numerator - nb.numerator)}/{na.denominator + nb.denominator}"
        wrongs = [wrong1, show(res + F(1, res.denominator)), show(abs(res - F(1, res.denominator * 2))), show(a + b if op == '−' else abs(a - b))]
        return mc(q, show(res), wrongs, lambda: show(res + F(R.randint(1, 5), res.denominator * R.randint(1, 2))))
    return g


def g_mul_frac(kind='proper'):
    def g(i, t):
        if kind == 'whole':
            a = F(R.randint(1, 7), R.randint(2, 8))
            b = F(R.randint(2, 9))
        else:
            d1, d2 = R.sample([2, 3, 4, 5, 6, 7, 8, 9, 10, 12], 2)
            a, b = F(R.randint(1, d1 - 1), d1), F(R.randint(1, d2 - 1), d2)
            if kind == 'mixed':
                a += R.randint(1, 3)
                b += R.randint(1, 2)
        res = a * b
        show = mixed if kind == 'mixed' else ff
        q = f"{show(a)} × {show(b)} = ? (simplest form)"
        wrongs = [
            f"{a.numerator * b.numerator}/{a.denominator + b.denominator}",
            show(a + b),
            show(a / b) if b != 0 else '0',
            show(F(int(a) * int(b)) + (a - int(a)) * (b - int(b))) if kind == 'mixed' else show(res + F(1, res.denominator)),
        ]
        if t and kind != 'mixed':
            return typed(q, ff(res))
        return mc(q, show(res), wrongs, lambda: show(res + F(R.randint(1, 4), res.denominator)))
    return g


def g_div_frac(mixed_nums=False):
    def g(i, t):
        d1, d2 = R.sample([2, 3, 4, 5, 6, 8, 9, 10], 2)
        a, b = F(R.randint(1, d1 - 1), d1), F(R.randint(1, d2 - 1), d2)
        if mixed_nums:
            a += R.randint(1, 3)
            b += R.randint(1, 2)
        res = a / b
        show = mixed if mixed_nums else ff
        return mc(f"{show(a)} ÷ {show(b)} = ? (simplest form)", show(res), [show(a * b), show(b / a), show(res + F(1, res.denominator)), f"{a.numerator * b.numerator}/{a.denominator * b.denominator}"], lambda: show(res + F(R.randint(1, 4), res.denominator)))
    return g


def g_compare(i, t):
    while True:
        a, b = rand_frac(12)[0], rand_frac(12)[0]
        if a != b:
            break
    sym = '>' if a > b else '<'
    return mc(f"Which symbol makes this true?  {ff(a)} ___ {ff(b)}", sym, ['<' if sym == '>' else '>', '='])


def g_fdp(i, t):
    pairs = [(F(1, 2), '0.5', '50%'), (F(1, 4), '0.25', '25%'), (F(3, 4), '0.75', '75%'), (F(1, 5), '0.2', '20%'), (F(2, 5), '0.4', '40%'),
             (F(3, 5), '0.6', '60%'), (F(4, 5), '0.8', '80%'), (F(1, 10), '0.1', '10%'), (F(3, 10), '0.3', '30%'), (F(7, 10), '0.7', '70%'),
             (F(9, 10), '0.9', '90%'), (F(1, 8), '0.125', '12.5%'), (F(3, 8), '0.375', '37.5%'), (F(1, 20), '0.05', '5%'), (F(3, 20), '0.15', '15%'),
             (F(1, 25), '0.04', '4%'), (F(6, 25), '0.24', '24%'), (F(1, 100), '0.01', '1%'), (F(5, 8), '0.625', '62.5%'), (F(7, 20), '0.35', '35%')]
    f, dec, pct = R.choice(pairs)
    others = [p for p in pairs if p[0] != f]
    kind = R.randint(0, 2)
    if kind == 0:
        return mc(f"Write {ff(f)} as a decimal.", dec, [o[1] for o in R.sample(others, 3)] + [f"0.{f.numerator}{f.denominator}"])
    if kind == 1:
        return mc(f"Write {dec} as a percent.", pct, [f"{dec}%", o := R.choice(others)[2]] + [x[2] for x in R.sample(others, 3)])
    return mc(f"Write {pct} as a fraction in simplest form.", ff(f), [ff(o[0]) for o in R.sample(others, 3)] + [f"{pct[:-1]}/10"])


# ---------- decimals ----------
def g_dec_add(i, t):
    a, b = round(R.uniform(0.1, 99), R.choice([1, 2])), round(R.uniform(0.1, 50), R.choice([1, 2]))
    op = R.choice(['+', '−'])
    if op == '−' and a < b:
        a, b = b, a
    res = round(a + b if op == '+' else a - b, 2)
    q = f"{num(a)} {op} {num(b)} = ?"
    if t:
        return typed(q, num(res))
    return mc(q, num(res), [num(round(res + 0.1, 2)), num(round(res - 1, 2)), num(round(res * 10, 2)), num(round(res + 1.01, 2))])


def g_dec_mul(i, t):
    a, b = round(R.uniform(0.2, 12), 1), round(R.uniform(0.2, 9), R.choice([1, 2]))
    res = round(a * b, 4)
    return mc(f"{num(a)} × {num(b)} = ?", num(res), [num(round(res * 10, 4)), num(round(res / 10, 4)), num(round(a + b, 4)), num(round(res + 0.1, 4))])


# ---------- integers & operations ----------
def g_int_add(i, t):
    a, b = R.randint(-20, 20), R.randint(-20, 20)
    op = R.choice(['+', '−'])
    res = a + b if op == '+' else a - b
    bs = f"({b})" if b < 0 else str(b)
    q = f"{a} {op} {bs} = ?"
    if t:
        return typed(q, res)
    return mc(q, res, [-res, a - b if op == '+' else a + b, res + 2, res - 2], near_int(res, 5))


def g_int_mul(i, t):
    a, b = R.choice([1, -1]) * R.randint(2, 12), R.choice([1, -1]) * R.randint(2, 12)
    if R.random() < 0.5:
        res = a * b
        q = f"({a}) × ({b}) = ?"
    else:
        res = a
        q = f"({a * b}) ÷ ({b}) = ?"
    if t:
        return typed(q, res)
    return mc(q, res, [-res, res + 1, res - 1, abs(res) + 2], near_int(res, 4))


def g_order_ops(hard=False):
    def g(i, t):
        a, b, c, d = R.randint(2, 9), R.randint(2, 9), R.randint(2, 9), R.randint(1, 5)
        forms = [
            (f"{a} + {b} × {c}", a + b * c, (a + b) * c),
            (f"({a} + {b}) × {c}", (a + b) * c, a + b * c),
            (f"{a * c} ÷ {c} + {b}", a + b, a * c // (c + b) if (c + b) else 0),
            (f"{a} × {b} − {c}", a * b - c, a * (b - c)),
            (f"{a} + {b}² − {d}", a + b * b - d, (a + b) ** 2 - d),
        ]
        if hard:
            forms += [
                (f"{a} + {b} × ({c} − {d})", a + b * (c - d), (a + b) * (c - d)),
                (f"{a}² − {b} × {d} + {c}", a * a - b * d + c, (a * a - b) * d + c),
                (f"({a} + {b})² ÷ ({a} + {b})", a + b, (a + b) ** 2),
                (f"{2 * a} ÷ 2 × {b} − {c}", a * b - c, (2 * a) // (2 * b) - c if b else 0),
            ]
        expr, ans, trap = R.choice(forms)
        q = f"Evaluate: {expr}"
        if t:
            return typed(q, ans)
        return mc(q, ans, [trap, ans + 1, ans - 2, ans + 10], near_int(ans, 6))
    return g


def g_exponents(i, t):
    kind = R.randint(0, 2)
    if kind == 0:
        b, e = R.randint(2, 9), R.randint(2, 3)
        ans = b ** e
        q = f"{b}^{e} = ?"
        wr = [b * e, b ** (e + 1), ans + b, b + e]
    elif kind == 1:
        r = R.randint(2, 15)
        ans = r
        q = f"√{r * r} = ?"
        wr = [r * r // 2, r + 1, r - 1, r * 2]
    else:
        e = R.randint(2, 6)
        ans = 10 ** e
        q = f"10^{e} = ?"
        wr = [10 * e, 10 ** (e - 1), 10 ** (e + 1), e ** 10 if e < 4 else 100 * e]
    if t:
        return typed(q, ans, f"{ans:,}")
    return mc(q, ans, wr, near_int(ans))


def g_exp_rules(i, t):
    a, b = R.randint(2, 9), R.randint(2, 9)
    kind = R.randint(0, 3)
    if kind == 0:
        return mc(f"Simplify: x^{a} · x^{b}", f"x^{a + b}", [f"x^{a * b}", f"2x^{a + b}", f"x^{abs(a - b)}"])
    if kind == 1:
        hi, lo = max(a, b) + 1, min(a, b)
        return mc(f"Simplify: x^{hi} ÷ x^{lo}", f"x^{hi - lo}", [f"x^{hi + lo}", f"x^{hi * lo}", f"1/x^{hi - lo}"])
    if kind == 2:
        return mc(f"Simplify: (x^{a})^{b}", f"x^{a * b}", [f"x^{a + b}", f"x^{a ** b if a ** b < 100 else a * b + 1}", f"{b}x^{a}"])
    return mc(f"Simplify: x^{-a}", f"1/x^{a}", [f"-x^{a}", f"x^{a}", f"-1/x^{a}"])


def g_percent(i, t):
    p = R.choice([5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80, 12, 35, 45])
    n = R.choice([20, 40, 60, 80, 120, 200, 240, 300, 400, 500, 160, 360, 1000])
    ans = p * n / 100
    q = f"What is {p}% of {n}?"
    ans = int(ans) if ans == int(ans) else ans
    if t:
        return typed(q, num(ans))
    return mc(q, num(ans), [num(n / p if p else 0), num(ans * 10), num(n - ans), num(ans + p)])


def g_percent_change(i, t):
    old = R.choice([20, 40, 50, 80, 120, 150, 200, 250, 400, 500])
    p = R.choice([10, 20, 25, 30, 40, 50, 60, 75])
    up = R.random() < 0.5
    new = old * (100 + p) / 100 if up else old * (100 - p) / 100
    new = int(new) if new == int(new) else new
    if R.random() < 0.5:
        return mc(f"A price goes from ${old} to ${num(new)}. What is the percent {'increase' if up else 'decrease'}?", f"{p}%",
                  [f"{num(abs(new - old))}%", f"{round(abs(new - old) / new * 100)}%" if new else '0%', f"{p + 10}%", f"{100 - p}%"])
    return mc(f"Increase {old} by {p}%." if up else f"Decrease {old} by {p}%.", num(new), [num(old * p / 100), num(old + p if up else old - p), num(old * (100 - p) / 100 if up else old * (100 + p) / 100)])


def g_ratio(i, t):
    kind = R.randint(0, 2)
    if kind == 0:
        cost, n = R.choice([2, 3, 4, 5, 6, 8, 12]), R.choice([3, 4, 5, 6, 8, 10])
        total = cost * n
        return mc(f"{n} notebooks cost ${total}. What is the cost per notebook?", f"${cost}", [f"${total * n}", f"${n}", f"${cost + 1}", f"${total - n}"])
    if kind == 1:
        a, b, k = R.randint(1, 7), R.randint(2, 9), R.randint(2, 6)
        return mc(f"The ratio of cats to dogs is {a}:{b}. If there are {b * k} dogs, how many cats are there?", a * k, [b * k - a, a + k, a * b, b * k + a], near_int(a * k, 4))
    s, h = R.choice([30, 40, 45, 50, 55, 60, 65]), R.randint(2, 6)
    return mc(f"A car drives {s * h} miles in {h} hours. What is its speed?", f"{s} mph", [f"{s * h * h} mph", f"{s + h} mph", f"{s - 5} mph", f"{h} mph"])


def g_eq1(i, t):
    x = R.randint(-10, 15)
    a = R.randint(2, 12)
    kind = R.randint(0, 3)
    if kind == 0:
        q, wr = f"x + {a} = {x + a}", [x + 2 * a, -x, x + 1]
    elif kind == 1:
        q, wr = f"x − {a} = {x - a}", [x - 2 * a, -x, x - 1]
    elif kind == 2:
        q, wr = f"{a}x = {a * x}", [a * x - a, a * a * x, x + a]
    else:
        q, wr = f"x ÷ {a} = {x}", [x, x + a, a]
        x = x * a
    q = f"Solve for x:  {q}"
    if t:
        return typed(q, x, f"x = {x}", f"x={x}")
    return mc(q, f"x = {x}", [f"x = {w}" for w in wr], lambda: f"x = {x + R.choice([-3, -2, 2, 3])}")


def g_eq2(i, t):
    x = R.randint(-9, 12)
    a, b = R.randint(2, 9), R.randint(1, 20)
    sign = R.choice(['+', '−'])
    rhs = a * x + b if sign == '+' else a * x - b
    q = f"Solve for x:  {a}x {sign} {b} = {rhs}"
    wrong = [(rhs + b) / a if sign == '+' else (rhs - b) / a, rhs - b if sign == '+' else rhs + b, x + 1, -x]
    if t:
        return typed(q, x, f"x = {x}", f"x={x}")
    return mc(q, f"x = {x}", [f"x = {num(w) if isinstance(w, float) and w != int(w) else int(w)}" for w in wrong], lambda: f"x = {x + R.choice([-2, 2, 3])}")


def g_eq_multi(i, t):
    x = R.randint(-8, 10)
    a, c = R.sample(range(2, 10), 2)
    b = R.randint(-15, 15)
    d = a * x + b - c * x
    lhs = f"{a}x {'+' if b >= 0 else '−'} {abs(b)}"
    rhs = f"{c}x {'+' if d >= 0 else '−'} {abs(d)}"
    q = f"Solve for x:  {lhs} = {rhs}"
    return mc(q, f"x = {x}", [f"x = {-x}", f"x = {x + 1}", f"x = {x - 2}", f"x = {num(F(d - b, a + c))}"], lambda: f"x = {x + R.choice([-3, 3, 4])}")


def g_expr(i, t):
    x = R.randint(1, 9)
    a, b = R.randint(2, 9), R.randint(1, 15)
    forms = [(f"{a}x + {b}", a * x + b, a + x + b), (f"{a}(x + {b})", a * (x + b), a * x + b), (f"x² + {b}", x * x + b, 2 * x + b), (f"{b} − x", b - x, x - b)]
    e, ans, trap = R.choice(forms)
    q = f"Evaluate {e} when x = {x}."
    if t:
        return typed(q, ans)
    return mc(q, ans, [trap, ans + 1, ans - x], near_int(ans, 5))


def g_area(i, t):
    kind = R.randint(0, 3)
    a, b = R.randint(2, 15), R.randint(2, 15)
    if kind == 0:
        q, ans, wr = f"What is the area of a rectangle that is {a} cm by {b} cm?", f"{a * b} cm²", [f"{2 * (a + b)} cm²", f"{a + b} cm²", f"{a * b * 2} cm²"]
    elif kind == 1:
        q, ans, wr = f"What is the perimeter of a rectangle that is {a} m by {b} m?", f"{2 * (a + b)} m", [f"{a * b} m", f"{a + b} m", f"{4 * a} m"]
    elif kind == 2:
        a = a if a % 2 == 0 else a + 1
        q, ans, wr = f"A triangle has a base of {a} in and a height of {b} in. What is its area?", f"{a * b // 2} in²", [f"{a * b} in²", f"{a + b} in²", f"{a * b // 4 or 1} in²"]
    else:
        q, ans, wr = f"What is the area of a square with sides of {a} ft?", f"{a * a} ft²", [f"{4 * a} ft²", f"{2 * a} ft²", f"{a * a + a} ft²"]
    return mc(q, ans, wr)


def g_volume(i, t):
    l, w, h = R.randint(2, 12), R.randint(2, 10), R.randint(2, 10)
    v = l * w * h
    q = f"What is the volume of a box that is {l} cm long, {w} cm wide and {h} cm tall?"
    if t:
        return typed(q, v, f"{v} cm³", f"{v} cm3")
    return mc(q, f"{v} cm³", [f"{l + w + h} cm³", f"{2 * (l * w + l * h + w * h)} cm³", f"{l * w} cm³"])


def g_circle(i, t):
    r = R.randint(2, 15)
    kind = R.randint(0, 1)
    if kind == 0:
        ans = round(3.14 * r * r, 2)
        return mc(f"Using π ≈ 3.14, what is the area of a circle with radius {r} cm?", f"{num(ans)} cm²", [f"{num(round(2 * 3.14 * r, 2))} cm²", f"{num(round(3.14 * 2 * r * 2 * r, 2))} cm²", f"{num(round(3.14 * r, 2))} cm²"])
    ans = round(2 * 3.14 * r, 2)
    return mc(f"Using π ≈ 3.14, what is the circumference of a circle with radius {r} cm?", f"{num(ans)} cm", [f"{num(round(3.14 * r * r, 2))} cm", f"{num(round(3.14 * r, 2))} cm", f"{num(round(4 * 3.14 * r, 2))} cm"])


def g_angles(i, t):
    kind = R.randint(0, 2)
    if kind == 0:
        a = R.randint(10, 80)
        return mc(f"Two angles are complementary. One is {a}°. What is the other?", f"{90 - a}°", [f"{180 - a}°", f"{a}°", f"{360 - a}°"])
    if kind == 1:
        a = R.randint(20, 160)
        return mc(f"Two angles are supplementary. One is {a}°. What is the other?", f"{180 - a}°", [f"{90 - a if a < 90 else a - 90}°", f"{360 - a}°", f"{a}°"])
    a, b = R.randint(20, 90), R.randint(20, 70)
    return mc(f"A triangle has angles of {a}° and {b}°. What is the third angle?", f"{180 - a - b}°", [f"{360 - a - b}°", f"{90 - b if b < 90 else 10}°", f"{a + b}°"])


def g_stats(i, t):
    data = sorted(R.randint(1, 20) for _ in range(R.choice([5, 7])))
    R.shuffle(data)
    s = sorted(data)
    kind = R.randint(0, 3)
    shown = ', '.join(map(str, data))
    if kind == 0:
        total = sum(data)
        while total % len(data):
            data[0] += 1
            total = sum(data)
            shown = ', '.join(map(str, data))
            s = sorted(data)
        m = total // len(data)
        return mc(f"Find the mean of: {shown}", m, [s[len(s) // 2], max(s) - min(s), m + 1], near_int(m, 3))
    if kind == 1:
        return mc(f"Find the median of: {shown}", s[len(s) // 2], [data[len(data) // 2], round(sum(s) / len(s)), s[len(s) // 2 + 1]], near_int(s[len(s) // 2], 3))
    if kind == 2:
        return mc(f"Find the range of: {shown}", max(s) - min(s), [max(s), min(s), max(s) + min(s)], near_int(max(s) - min(s), 3))
    v = R.choice(data)
    data2 = data + [v, v]
    R.shuffle(data2)
    others = [x for x in set(data2) if x != v]
    return mc(f"Find the mode of: {', '.join(map(str, data2))}", v, R.sample(others, min(3, len(others))))


def g_prob(i, t):
    kind = R.randint(0, 2)
    if kind == 0:
        r, b, g = R.randint(1, 8), R.randint(1, 8), R.randint(1, 8)
        tot = r + b + g
        return mc(f"A bag has {r} red, {b} blue and {g} green marbles. What is the probability of picking a red one?", ff(F(r, tot)),
                  [ff(F(r, b + g)), ff(F(b, tot)), f"{r}/{tot + 1}", ff(F(g, tot))], lambda: ff(F(R.randint(1, tot - 1), tot)))
    if kind == 1:
        n = R.randint(1, 6)
        return mc(f"You roll a standard six-sided die. What is the probability of rolling a number greater than {n - 1 if n > 1 else 0}?", ff(F(7 - max(n, 1), 6)) if n > 1 else '1',
                  [ff(F(max(n - 1, 1), 6)), '1/2', ff(F(1, 6)), '0'])
    return mc("You flip a coin twice. What is the probability of getting two heads?", '1/4', ['1/2', '1/3', '2/4', '1/8'])


def g_pyth(i, t):
    a, b, c = R.choice([(3, 4, 5), (5, 12, 13), (8, 15, 17), (7, 24, 25), (6, 8, 10), (9, 12, 15), (12, 16, 20), (20, 21, 29), (9, 40, 41), (15, 20, 25)])
    if R.random() < 0.6:
        return mc(f"A right triangle has legs of {a} and {b}. How long is the hypotenuse?", c, [a + b, c + 1, a * b // 2], near_int(c, 3))
    return mc(f"A right triangle has a leg of {a} and a hypotenuse of {c}. How long is the other leg?", b, [c - a, c + a, b + 1], near_int(b, 3))


def g_slope(i, t):
    while True:
        x1, y1, x2, y2 = R.randint(-6, 6), R.randint(-6, 6), R.randint(-6, 6), R.randint(-6, 6)
        if x1 != x2:
            break
    m = F(y2 - y1, x2 - x1)
    return mc(f"What is the slope of the line through ({x1}, {y1}) and ({x2}, {y2})?", ff(m),
              [ff(F(x2 - x1, y2 - y1)) if y2 != y1 else 'undefined', ff(-m) if m else '1', ff(F(y2 + y1, x2 + x1)) if x2 + x1 else '2'], lambda: ff(m + R.choice([1, -1, F(1, 2)])))


def g_gcf_lcm(i, t):
    a, b = R.randint(4, 40), R.randint(4, 40)
    while a == b:
        b = R.randint(4, 40)
    g = math.gcd(a, b)
    l = a * b // g
    if R.random() < 0.5:
        return mc(f"What is the greatest common factor of {a} and {b}?", g, [l, min(a, b), 1 if g != 1 else 2, g * 2], near_int(g, 3))
    return mc(f"What is the least common multiple of {a} and {b}?", l, [a * b if a * b != l else l * 2, g, a + b], near_int(l, 6))


def factorize(n):
    out, d = [], 2
    while n > 1:
        while n % d == 0:
            out.append(d)
            n //= d
        d += 1
    return out


def g_prime_fact(i, t):
    n = R.choice([12, 18, 20, 24, 28, 30, 36, 40, 42, 45, 48, 50, 54, 56, 60, 63, 72, 75, 80, 84, 90, 96, 98, 100, 108, 120])
    fs = factorize(n)
    show = lambda f: ' × '.join(map(str, f))
    wrong1 = fs[:-1] + [fs[-1] * 2]
    wrong2 = [x for x in fs if x != 2] + [4] if 2 in fs else fs + [2]
    return mc(f"Which is the prime factorization of {n}?", show(fs), [show(sorted(wrong1)), show(sorted(wrong2)), show(sorted(fs[1:] + [fs[0] * fs[1] if len(fs) > 1 else 3]))])


def g_sci(i, t):
    m = R.randint(11, 99) / 10
    e = R.randint(-6, 8)
    from decimal import Decimal
    def std(exp):
        v = Decimal(str(m)) * (Decimal(10) ** exp)
        txt = f"{v:,f}"
        return txt.rstrip('0').rstrip('.') if '.' in txt else txt
    plain = std(e)
    right = f"{num(m)} × 10^{e}"
    if R.random() < 0.5:
        return mc(f"Write {plain} in scientific notation.", right, [f"{num(m)} × 10^{e + 1}", f"{num(m)} × 10^{-e}" if e else f"{num(m)} × 10^1", f"{num(m * 10)} × 10^{e - 1}", f"{num(m)} × 10^{e - 1}"])
    return mc(f"Write {right} in standard form.", plain, [std(e + 1), std(e - 1), std(e + 2), std(e - 2)])


def g_quadratic(i, t):
    r1, r2 = R.randint(-9, 9), R.randint(-9, 9)
    b, c = -(r1 + r2), r1 * r2
    def term(k, s):
        if k == 0:
            return ''
        sign = ' + ' if k > 0 else ' − '
        return f"{sign}{'' if abs(k) == 1 and s else abs(k)}{s}"
    eq = f"x²{term(b, 'x')}{term(c, '')} = 0"
    roots = sorted({r1, r2})
    show = lambda rs: ' and '.join(f"x = {r}" for r in rs) if len(rs) > 1 else f"x = {rs[0]}"
    return mc(f"Solve by factoring:  {eq}", show(roots), [show(sorted({-r1, -r2})), show(sorted({r1, -r2})), show(sorted({r1 + 1, r2}))])


def g_tables_fact(i, t):
    return g_mult(0, 10)(i, t)


MATH = [
    # id, title, grade, difficulty, generator, typed_every, description
    ("math-add-20", "Addition Within 20", "K–2", "easy", g_add(0, 10), 4, "Single-digit addition facts."),
    ("math-sub-20", "Subtraction Within 20", "K–2", "easy", g_add(1, 20, '-'), 4, "Subtraction facts within 20."),
    ("math-add-2digit", "Two-Digit Addition", "K–2", "medium", g_add(10, 99), 4, "Adding two-digit numbers, with and without regrouping."),
    ("math-sub-2digit", "Two-Digit Subtraction", "K–2", "medium", g_add(10, 99, '-'), 4, "Subtracting two-digit numbers, with and without regrouping."),
    ("math-money", "Counting Coins", "K–2", "medium", g_money, 4, "Add up quarters, dimes, nickels and pennies."),
    ("math-add-multi", "Multi-Digit Addition", "3–5", "medium", g_add(100, 9999), 5, "Adding three- and four-digit numbers."),
    ("math-sub-multi", "Multi-Digit Subtraction", "3–5", "medium", g_add(100, 9999, '-'), 5, "Subtracting three- and four-digit numbers."),
    ("math-mult-10", "Multiplication Facts 0–10", "3–5", "easy", g_mult(0, 10), 4, "Times tables up to 10."),
    ("math-mult-12", "Multiplication Facts to 12", "3–5", "medium", g_mult(2, 12), 4, "Times tables up to 12."),
    ("math-mult-multi", "Multi-Digit Multiplication", "3–5", "hard", g_mult(11, 99, 11, 99), 5, "Two-digit by two-digit multiplication."),
    ("math-div-facts", "Division Facts", "3–5", "easy", g_div_facts, 4, "Division facts up to 144 ÷ 12."),
    ("math-long-div", "Long Division with Remainders", "3–5", "hard", g_long_div, 0, "Three-digit by one- and two-digit division."),
    ("math-place-value", "Place Value", "3–5", "easy", g_place, 0, "Digits and their values up to the hundred thousands."),
    ("math-rounding", "Rounding Whole Numbers", "3–5", "easy", g_round, 4, "Round to the nearest 10, 100 and 1,000."),
    ("math-equiv-frac", "Equivalent Fractions", "3–5", "easy", g_equiv, 0, "Find fractions that name the same amount."),
    ("math-simplify-frac", "Simplifying Fractions", "3–5", "medium", g_simplify, 4, "Write fractions in simplest form."),
    ("math-compare-frac", "Comparing Fractions", "3–5", "medium", g_compare, 0, "Use <, > and = with fractions."),
    ("math-add-like", "Adding & Subtracting Fractions (Like Denominators)", "3–5", "easy", g_add_like, 0, "Same denominators, answers in simplest form."),
    ("math-add-unlike", "Adding & Subtracting Fractions with Unlike Denominators", "3–5", "medium", g_add_unlike(), 0, "Find a common denominator first."),
    ("math-add-mixed", "Adding & Subtracting Mixed Numbers (Unlike Denominators)", "6–8", "hard", g_add_unlike(True), 0, "Mixed numbers with different denominators."),
    ("math-mult-frac-whole", "Multiplying Fractions by Whole Numbers", "3–5", "easy", g_mul_frac('whole'), 4, "A fraction times a whole number."),
    ("math-mult-frac-unlike", "Multiplying Fractions with Unlike Denominators", "3–5", "medium", g_mul_frac('proper'), 4, "Multiply numerators and denominators, then simplify."),
    ("math-mult-mixed", "Multiplying Mixed Numbers", "6–8", "hard", g_mul_frac('mixed'), 0, "Convert to improper fractions, multiply, simplify."),
    ("math-div-frac", "Dividing Fractions", "6–8", "medium", g_div_frac(), 0, "Keep, change, flip."),
    ("math-div-mixed", "Dividing Mixed Numbers", "6–8", "hard", g_div_frac(True), 0, "Divide mixed numbers and simplify."),
    ("math-fdp", "Fractions, Decimals & Percents", "6–8", "medium", g_fdp, 0, "Convert between all three forms."),
    ("math-dec-add", "Adding & Subtracting Decimals", "3–5", "medium", g_dec_add, 4, "Line up the decimal points."),
    ("math-dec-mul", "Multiplying Decimals", "6–8", "medium", g_dec_mul, 0, "Count the decimal places."),
    ("math-int-add", "Adding & Subtracting Integers", "6–8", "easy", g_int_add, 4, "Positive and negative numbers."),
    ("math-int-mul", "Multiplying & Dividing Integers", "6–8", "medium", g_int_mul, 4, "Sign rules for × and ÷."),
    ("math-order-ops", "Order of Operations", "6–8", "medium", g_order_ops(), 4, "Parentheses, exponents, multiply/divide, add/subtract."),
    ("math-order-ops-hard", "Order of Operations Challenge", "6–8", "hard", g_order_ops(True), 4, "Longer expressions with exponents and parentheses."),
    ("math-exponents", "Exponents & Square Roots", "6–8", "medium", g_exponents, 4, "Powers, perfect squares and powers of ten."),
    ("math-exp-rules", "Exponent Rules", "9–12", "medium", g_exp_rules, 0, "Product, quotient, power and negative exponent rules."),
    ("math-percent", "Percent of a Number", "6–8", "medium", g_percent, 4, "Find a percent of a number."),
    ("math-percent-change", "Percent Increase & Decrease", "6–8", "hard", g_percent_change, 0, "Discounts, markups and percent change."),
    ("math-ratios", "Ratios & Unit Rates", "6–8", "medium", g_ratio, 0, "Unit prices, ratios and speed."),
    ("math-expressions", "Evaluating Expressions", "6–8", "easy", g_expr, 4, "Substitute a value for x."),
    ("math-eq-1step", "One-Step Equations", "6–8", "easy", g_eq1, 4, "Solve with one inverse operation."),
    ("math-eq-2step", "Two-Step Equations", "6–8", "medium", g_eq2, 4, "Undo addition or subtraction, then multiplication."),
    ("math-eq-multi", "Equations with Variables on Both Sides", "9–12", "hard", g_eq_multi, 0, "Collect the x terms on one side."),
    ("math-area", "Area & Perimeter", "3–5", "medium", g_area, 0, "Rectangles, squares and triangles."),
    ("math-volume", "Volume of Rectangular Prisms", "3–5", "medium", g_volume, 4, "Length × width × height."),
    ("math-circles", "Circles: Area & Circumference", "6–8", "hard", g_circle, 0, "Use π ≈ 3.14."),
    ("math-angles", "Angle Relationships", "6–8", "medium", g_angles, 0, "Complementary, supplementary and triangle angles."),
    ("math-stats", "Mean, Median, Mode & Range", "6–8", "medium", g_stats, 0, "Measures of center and spread."),
    ("math-probability", "Probability", "6–8", "medium", g_prob, 0, "Simple probability with marbles, dice and coins."),
    ("math-gcf-lcm", "GCF & LCM", "6–8", "medium", g_gcf_lcm, 0, "Greatest common factor and least common multiple."),
    ("math-prime-fact", "Prime Factorization", "6–8", "hard", g_prime_fact, 0, "Break numbers into prime factors."),
    ("math-sci-notation", "Scientific Notation", "6–8", "hard", g_sci, 0, "Very big and very small numbers."),
    ("math-pythagorean", "Pythagorean Theorem", "6–8", "hard", g_pyth, 0, "a² + b² = c² with whole-number triangles."),
    ("math-slope", "Slope from Two Points", "9–12", "medium", g_slope, 0, "Rise over run."),
    ("math-quadratics", "Factoring Quadratics", "9–12", "hard", g_quadratic, 0, "Solve x² + bx + c = 0 by factoring."),
]


def math_sets():
    sets = []
    for sid, title, grade, diff, gen, te, desc in MATH:
        sets.append({"id": sid, "title": title, "subject": "Math", "grade": grade, "difficulty": diff, "description": desc, "questions": build(gen, N, te)})
    return sets
