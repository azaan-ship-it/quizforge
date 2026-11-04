// Blocks inappropriate player names and usernames.
// Catches leetspeak (sh1t), spacing or symbols (f.u.c.k) and stretched letters (fuuuck).
// Add words to the lists below if you find something it misses.

const LEET = { 0: 'o', 1: 'i', 2: 'z', 3: 'e', 4: 'a', 5: 's', 6: 'g', 7: 't', 8: 'b', 9: 'g', '@': 'a', $: 's', '!': 'i', '|': 'i', '+': 't', '€': 'e' };

// Blocked anywhere inside a name, even with other letters around them.
const STEMS = [
  'fuck', 'fuk', 'fck', 'phuck', 'shit', 'bitch', 'biatch', 'cunt', 'pussy', 'porn', 'slut', 'whore', 'nigg', 'nigga',
  'faggot', 'retard', 'penis', 'vagina', 'boob', 'dildo', 'jizz', 'bastard', 'asshole', 'motherf', 'nazi', 'hitler',
  'kkk', 'wetback', 'tranny', 'molest', 'pedophil', 'killyourself', 'horny', 'orgasm', 'blowjob', 'handjob', 'masturb',
  'testicle', 'scrotum', 'wank', 'twat', 'bollock', 'douche', 'hentai', 'xxx', 'onlyfans', 'nudes',
];

// Blocked only as a whole word, because they hide inside innocent words
// (class, peacock, grape, Dickens, circumference, Sussex, torpedo, analyze).
const WORDS = [
  'ass', 'asses', 'dick', 'dicks', 'cock', 'cocks', 'rape', 'raped', 'rapist', 'cum', 'sex', 'sexy', 'tit', 'tits', 'titty',
  'fag', 'fags', 'damn', 'hoe', 'hoes', 'anal', 'anus', 'nude', 'naked', 'boner', 'pedo', 'kys', 'chink', 'spic', 'kike',
  'gook', 'coon', 'piss', 'crap', 'thot', 'simp', 'milf', 'dyke', 'homo', 'negro', 'jap',
];

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .split('').map(c => LEET[c] || c).join('');
}

const squash = s => s.replace(/(.)\1+/g, '$1');

function isBadName(name) {
  const n = normalize(name);
  const plain = n.replace(/[^a-z]/g, '');
  const forms = [plain, squash(plain)];
  if (STEMS.some(w => forms.some(f => f.includes(w)))) return true;
  const tokens = n.split(/[^a-z]+/).filter(Boolean);
  // also catch spaced-out letters like "s e x"
  const joinedSingles = n.split(/[^a-z]+/).filter(t => t.length === 1).join('');
  const candidates = [...tokens, ...tokens.map(squash), joinedSingles];
  return candidates.some(t => WORDS.includes(t));
}

module.exports = { isBadName };