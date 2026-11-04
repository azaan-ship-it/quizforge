"""Sets built from fact tables. Wrong answers come from the same table."""
import random

R = random.Random(7)

STATES = [
    ("Alabama", "Montgomery"), ("Alaska", "Juneau"), ("Arizona", "Phoenix"), ("Arkansas", "Little Rock"), ("California", "Sacramento"),
    ("Colorado", "Denver"), ("Connecticut", "Hartford"), ("Delaware", "Dover"), ("Florida", "Tallahassee"), ("Georgia", "Atlanta"),
    ("Hawaii", "Honolulu"), ("Idaho", "Boise"), ("Illinois", "Springfield"), ("Indiana", "Indianapolis"), ("Iowa", "Des Moines"),
    ("Kansas", "Topeka"), ("Kentucky", "Frankfort"), ("Louisiana", "Baton Rouge"), ("Maine", "Augusta"), ("Maryland", "Annapolis"),
    ("Massachusetts", "Boston"), ("Michigan", "Lansing"), ("Minnesota", "Saint Paul"), ("Mississippi", "Jackson"), ("Missouri", "Jefferson City"),
    ("Montana", "Helena"), ("Nebraska", "Lincoln"), ("Nevada", "Carson City"), ("New Hampshire", "Concord"), ("New Jersey", "Trenton"),
    ("New Mexico", "Santa Fe"), ("New York", "Albany"), ("North Carolina", "Raleigh"), ("North Dakota", "Bismarck"), ("Ohio", "Columbus"),
    ("Oklahoma", "Oklahoma City"), ("Oregon", "Salem"), ("Pennsylvania", "Harrisburg"), ("Rhode Island", "Providence"), ("South Carolina", "Columbia"),
    ("South Dakota", "Pierre"), ("Tennessee", "Nashville"), ("Texas", "Austin"), ("Utah", "Salt Lake City"), ("Vermont", "Montpelier"),
    ("Virginia", "Richmond"), ("Washington", "Olympia"), ("West Virginia", "Charleston"), ("Wisconsin", "Madison"), ("Wyoming", "Cheyenne"),
]
# big-city traps: the famous city that is NOT the capital
STATE_TRAPS = {"California": "Los Angeles", "New York": "New York City", "Florida": "Miami", "Illinois": "Chicago", "Texas": "Houston",
               "Pennsylvania": "Philadelphia", "Washington": "Seattle", "Nevada": "Las Vegas", "Michigan": "Detroit", "Kentucky": "Louisville",
               "Missouri": "Kansas City", "Oregon": "Portland", "Louisiana": "New Orleans", "Alaska": "Anchorage", "Maryland": "Baltimore",
               "Vermont": "Burlington", "South Carolina": "Charleston", "Delaware": "Wilmington", "Nebraska": "Omaha", "Ohio": "Cleveland"}

EUROPE = [("France", "Paris"), ("Germany", "Berlin"), ("Italy", "Rome"), ("Spain", "Madrid"), ("Portugal", "Lisbon"), ("United Kingdom", "London"),
          ("Ireland", "Dublin"), ("Netherlands", "Amsterdam"), ("Belgium", "Brussels"), ("Switzerland", "Bern"), ("Austria", "Vienna"),
          ("Poland", "Warsaw"), ("Czechia", "Prague"), ("Hungary", "Budapest"), ("Greece", "Athens"), ("Sweden", "Stockholm"), ("Norway", "Oslo"),
          ("Denmark", "Copenhagen"), ("Finland", "Helsinki"), ("Iceland", "Reykjavík"), ("Ukraine", "Kyiv"), ("Romania", "Bucharest"),
          ("Croatia", "Zagreb"), ("Serbia", "Belgrade"), ("Bulgaria", "Sofia")]
ASIA = [("Japan", "Tokyo"), ("China", "Beijing"), ("India", "New Delhi"), ("South Korea", "Seoul"), ("Thailand", "Bangkok"), ("Vietnam", "Hanoi"),
        ("Indonesia", "Jakarta"), ("Philippines", "Manila"), ("Malaysia", "Kuala Lumpur"), ("Pakistan", "Islamabad"), ("Bangladesh", "Dhaka"),
        ("Nepal", "Kathmandu"), ("Saudi Arabia", "Riyadh"), ("Iran", "Tehran"), ("Iraq", "Baghdad"), ("Turkey", "Ankara"),
        ("Afghanistan", "Kabul"), ("Mongolia", "Ulaanbaatar"), ("Singapore", "Singapore"), ("Qatar", "Doha"),
        ("United Arab Emirates", "Abu Dhabi"), ("Jordan", "Amman"), ("Kazakhstan", "Astana")]
AFRICA = [("Egypt", "Cairo"), ("Kenya", "Nairobi"), ("Nigeria", "Abuja"), ("Ethiopia", "Addis Ababa"), ("Ghana", "Accra"), ("Morocco", "Rabat"),
          ("Algeria", "Algiers"), ("Tunisia", "Tunis"), ("Senegal", "Dakar"), ("Uganda", "Kampala"), ("Tanzania", "Dodoma"), ("Rwanda", "Kigali"),
          ("Zimbabwe", "Harare"), ("Zambia", "Lusaka"), ("Angola", "Luanda"), ("Madagascar", "Antananarivo"), ("Somalia", "Mogadishu"),
          ("Sudan", "Khartoum"), ("Libya", "Tripoli"), ("Mali", "Bamako"), ("Cameroon", "Yaoundé"), ("Botswana", "Gaborone"), ("Namibia", "Windhoek")]
AMERICAS = [("United States", "Washington, D.C."), ("Canada", "Ottawa"), ("Mexico", "Mexico City"), ("Brazil", "Brasília"), ("Argentina", "Buenos Aires"),
            ("Chile", "Santiago"), ("Peru", "Lima"), ("Colombia", "Bogotá"), ("Venezuela", "Caracas"), ("Ecuador", "Quito"), ("Uruguay", "Montevideo"),
            ("Paraguay", "Asunción"), ("Cuba", "Havana"), ("Jamaica", "Kingston"), ("Haiti", "Port-au-Prince"), ("Dominican Republic", "Santo Domingo"),
            ("Guatemala", "Guatemala City"), ("Honduras", "Tegucigalpa"), ("Costa Rica", "San José"), ("Panama", "Panama City"), ("Nicaragua", "Managua"),
            ("El Salvador", "San Salvador")]
CAPITAL_TRAPS = {"Australia": "Sydney", "Canada": "Toronto", "Brazil": "Rio de Janeiro", "Turkey": "Istanbul", "India": "Mumbai", "Switzerland": "Zurich",
                 "Nigeria": "Lagos", "Morocco": "Casablanca", "Pakistan": "Karachi", "China": "Shanghai", "Vietnam": "Ho Chi Minh City",
                 "Tanzania": "Dar es Salaam", "United States": "New York City", "Kazakhstan": "Almaty", "United Arab Emirates": "Dubai",
                 "Germany": "Munich", "Italy": "Milan", "Spain": "Barcelona", "Japan": "Osaka", "South Korea": "Busan", "Saudi Arabia": "Jeddah",
                 "Cameroon": "Douala", "Colombia": "Medellín", "Ecuador": "Guayaquil"}

ELEMENTS = [("Hydrogen", "H", 1), ("Helium", "He", 2), ("Lithium", "Li", 3), ("Beryllium", "Be", 4), ("Boron", "B", 5), ("Carbon", "C", 6),
            ("Nitrogen", "N", 7), ("Oxygen", "O", 8), ("Fluorine", "F", 9), ("Neon", "Ne", 10), ("Sodium", "Na", 11), ("Magnesium", "Mg", 12),
            ("Aluminum", "Al", 13), ("Silicon", "Si", 14), ("Phosphorus", "P", 15), ("Sulfur", "S", 16), ("Chlorine", "Cl", 17), ("Argon", "Ar", 18),
            ("Potassium", "K", 19), ("Calcium", "Ca", 20), ("Iron", "Fe", 26), ("Nickel", "Ni", 28), ("Copper", "Cu", 29), ("Zinc", "Zn", 30),
            ("Silver", "Ag", 47), ("Tin", "Sn", 50), ("Iodine", "I", 53), ("Gold", "Au", 79), ("Mercury", "Hg", 80), ("Lead", "Pb", 82),
            ("Uranium", "U", 92), ("Platinum", "Pt", 78), ("Neodymium", "Nd", 60), ("Tungsten", "W", 74)]

SPANISH = {
    "spanish-basics": ("Spanish: Greetings & Basics", "easy", [("hello", "hola"), ("goodbye", "adiós"), ("please", "por favor"), ("thank you", "gracias"),
        ("yes", "sí"), ("no", "no"), ("good morning", "buenos días"), ("good night", "buenas noches"), ("How are you?", "¿Cómo estás?"),
        ("My name is…", "Me llamo…"), ("see you later", "hasta luego"), ("excuse me", "perdón"), ("you're welcome", "de nada"), ("friend", "amigo"),
        ("school", "escuela"), ("teacher", "maestro"), ("book", "libro"), ("house", "casa"), ("water", "agua"), ("food", "comida")]),
    "spanish-numbers": ("Spanish: Numbers 1–20", "easy", [("one", "uno"), ("two", "dos"), ("three", "tres"), ("four", "cuatro"), ("five", "cinco"),
        ("six", "seis"), ("seven", "siete"), ("eight", "ocho"), ("nine", "nueve"), ("ten", "diez"), ("eleven", "once"), ("twelve", "doce"),
        ("thirteen", "trece"), ("fourteen", "catorce"), ("fifteen", "quince"), ("sixteen", "dieciséis"), ("seventeen", "diecisiete"),
        ("eighteen", "dieciocho"), ("nineteen", "diecinueve"), ("twenty", "veinte")]),
    "spanish-colors-days": ("Spanish: Colors, Days & Months", "medium", [("red", "rojo"), ("blue", "azul"), ("green", "verde"), ("yellow", "amarillo"),
        ("black", "negro"), ("white", "blanco"), ("orange", "anaranjado"), ("purple", "morado"), ("Monday", "lunes"), ("Tuesday", "martes"),
        ("Wednesday", "miércoles"), ("Thursday", "jueves"), ("Friday", "viernes"), ("Saturday", "sábado"), ("Sunday", "domingo"),
        ("January", "enero"), ("April", "abril"), ("July", "julio"), ("September", "septiembre"), ("December", "diciembre")]),
    "spanish-family-food": ("Spanish: Family & Food", "medium", [("mother", "madre"), ("father", "padre"), ("brother", "hermano"), ("sister", "hermana"),
        ("grandmother", "abuela"), ("grandfather", "abuelo"), ("son", "hijo"), ("daughter", "hija"), ("aunt", "tía"), ("uncle", "tío"),
        ("bread", "pan"), ("cheese", "queso"), ("apple", "manzana"), ("chicken", "pollo"), ("rice", "arroz"), ("milk", "leche"), ("egg", "huevo"),
        ("fish (food)", "pescado"), ("breakfast", "desayuno"), ("dinner", "cena")]),
}
FRENCH = {
    "french-basics": ("French: Greetings & Basics", "easy", [("hello", "bonjour"), ("goodbye", "au revoir"), ("please", "s'il vous plaît"),
        ("thank you", "merci"), ("yes", "oui"), ("no", "non"), ("good evening", "bonsoir"), ("How are you?", "Comment ça va ?"), ("my name is…", "je m'appelle…"),
        ("see you soon", "à bientôt"), ("excuse me", "excusez-moi"), ("you're welcome", "de rien"), ("friend", "ami"), ("school", "école"),
        ("book", "livre"), ("house", "maison"), ("water", "eau"), ("cat", "chat"), ("dog", "chien"), ("cheese", "fromage")]),
    "french-numbers-colors": ("French: Numbers & Colors", "easy", [("one", "un"), ("two", "deux"), ("three", "trois"), ("four", "quatre"), ("five", "cinq"),
        ("six", "six"), ("seven", "sept"), ("eight", "huit"), ("nine", "neuf"), ("ten", "dix"), ("twenty", "vingt"), ("red", "rouge"), ("blue", "bleu"),
        ("green", "vert"), ("yellow", "jaune"), ("black", "noir"), ("white", "blanc"), ("orange", "orange"), ("purple", "violet"), ("pink", "rose")]),
}


def mc(q, right, pool, traps=()):
    wrong = [t for t in traps if t and t != right]
    others = [x for x in pool if x != right and x not in wrong]
    R.shuffle(others)
    wrong = (wrong + others)[:3]
    answers = [right] + wrong
    R.shuffle(answers)
    return {"type": "mc", "q": q, "a": answers, "c": [answers.index(right)]}


def capitals(table, traps):
    caps = [c for _, c in table]
    out = []
    for i, (country, cap) in enumerate(table):
        if i % 5 == 4:
            out.append({"type": "type", "q": f"What is the capital of {country}?", "accept": [cap, cap.replace('í', 'i').replace('á', 'a').replace('é', 'e').replace('ó', 'o').replace('ú', 'u')]})
        else:
            out.append(mc(f"What is the capital of {country}?", cap, caps, [traps[country]] if country in traps else ()))
    return out


def reverse_capitals(table):
    countries = [c for c, _ in table]
    return [mc(f"{cap} is the capital of which country?", country, countries) for country, cap in table if cap not in countries]


def vocab(pairs, lang):
    targets = [t for _, t in pairs]
    english = [e for e, _ in pairs]
    out = []
    for i, (en, tr) in enumerate(pairs):
        if i % 2 == 0:
            out.append(mc(f"How do you say “{en}” in {lang}?", tr, targets))
        else:
            out.append(mc(f"What does “{tr}” mean in English?", en, english))
    return out


def table_sets():
    sets = []
    def add(sid, title, subject, grade, diff, desc, qs):
        sets.append({"id": sid, "title": title, "subject": subject, "grade": grade, "difficulty": diff, "description": desc, "questions": qs})

    first, second = STATES[:25], STATES[25:]
    add("ss-states-1", "US State Capitals: Alabama to Missouri", "Social Studies", "3–5", "medium", "The first 25 states alphabetically.", capitals(first, STATE_TRAPS))
    add("ss-states-2", "US State Capitals: Montana to Wyoming", "Social Studies", "3–5", "medium", "The last 25 states alphabetically.", capitals(second, STATE_TRAPS))
    add("ss-states-all", "All 50 State Capitals", "Social Studies", "6–8", "hard", "Every state, with famous-city traps.", capitals(STATES, STATE_TRAPS))
    add("geo-europe", "Capitals of Europe", "Geography", "6–8", "medium", "25 European countries.", capitals(EUROPE, CAPITAL_TRAPS))
    add("geo-asia", "Capitals of Asia", "Geography", "6–8", "medium", "25 Asian countries.", capitals(ASIA, CAPITAL_TRAPS))
    add("geo-africa", "Capitals of Africa", "Geography", "6–8", "hard", "23 African countries.", capitals(AFRICA, CAPITAL_TRAPS))
    add("geo-americas", "Capitals of the Americas", "Geography", "6–8", "medium", "North, Central and South America and the Caribbean.", capitals(AMERICAS, CAPITAL_TRAPS))
    world = EUROPE[:8] + ASIA[:8] + AFRICA[:5] + AMERICAS[:7] + [("Australia", "Canberra"), ("New Zealand", "Wellington")]
    add("geo-world-reverse", "Whose Capital Is It?", "Geography", "6–8", "hard", "Match the capital city to its country.", reverse_capitals(world))

    syms = [s for _, s, _ in ELEMENTS]
    names = [n for n, _, _ in ELEMENTS]
    el1 = [mc(f"What is the chemical symbol for {n}?", s, syms, ['Ir' if n == 'Iron' else 'Go' if n == 'Gold' else 'So' if n == 'Sodium' else 'Si' if n == 'Silver' else 'Le' if n == 'Lead' else 'Po' if n == 'Potassium' else 'Co' if n == 'Copper' else 'Ti' if n == 'Tin' else 'Me' if n == 'Mercury' else '']) for n, s, _ in ELEMENTS]
    el1 = [q for q in el1]
    add("sci-element-symbols", "Element Symbols", "Science", "6–8", "medium", "Name to symbol, including the tricky Latin ones.", el1)
    el2 = [mc(f"Which element has the symbol {s}?", n, names) for n, s, _ in ELEMENTS]
    add("sci-element-names", "Element Names from Symbols", "Science", "6–8", "medium", "Symbol to name.", el2)
    nums = [n for _, _, n in ELEMENTS]
    el3 = [mc(f"What is the atomic number of {n}?", str(z), [str(x) for x in nums]) for n, _, z in ELEMENTS[:20]]
    add("sci-atomic-numbers", "Atomic Numbers 1–20", "Science", "9–12", "hard", "The first 20 elements by atomic number.", el3)

    for sid, (title, diff, pairs) in SPANISH.items():
        add(sid, title, "World Languages", "6–8", diff, "Spanish vocabulary both ways.", vocab(pairs, 'Spanish'))
    for sid, (title, diff, pairs) in FRENCH.items():
        add(sid, title, "World Languages", "6–8", diff, "French vocabulary both ways.", vocab(pairs, 'French'))
    return sets
