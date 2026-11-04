// Forgelings, packs, coins and XP.
const crypto = require('crypto');

const BASIC = ['🤖', '🦊', '🐉', '🐙', '🦉', '🐸', '🦄', '🐼', '👾', '🦖', '🐝', '🦈', '🐧', '🦁', '🐢', '🛸'];

const COLLECTIBLES = [
  // wild
  { id: 'scout', icon: '🐿️', name: 'Scout', rarity: 'uncommon', packs: ['wild'] },
  { id: 'bandit', icon: '🦝', name: 'Bandit', rarity: 'uncommon', packs: ['wild'] },
  { id: 'spike', icon: '🦔', name: 'Spike', rarity: 'uncommon', packs: ['wild'] },
  { id: 'koby', icon: '🐨', name: 'Koby', rarity: 'uncommon', packs: ['wild'] },
  { id: 'otto', icon: '🦦', name: 'Otto', rarity: 'uncommon', packs: ['wild'] },
  { id: 'nibbles', icon: '🐹', name: 'Nibbles', rarity: 'uncommon', packs: ['wild'] },
  { id: 'flair', icon: '🦩', name: 'Flair', rarity: 'rare', packs: ['wild'] },
  { id: 'plume', icon: '🦚', name: 'Plume', rarity: 'rare', packs: ['wild'] },
  { id: 'echo', icon: '🦜', name: 'Echo', rarity: 'rare', packs: ['wild'] },
  { id: 'howl', icon: '🐺', name: 'Howl', rarity: 'epic', packs: ['wild'] },
  { id: 'talon', icon: '🦅', name: 'Talon', rarity: 'epic', packs: ['wild'] },
  { id: 'leviathan', icon: '🐋', name: 'Leviathan', rarity: 'legendary', packs: ['wild'] },
  // cosmic
  { id: 'glow', icon: '🪼', name: 'Glow', rarity: 'uncommon', packs: ['cosmic'] },
  { id: 'astro', icon: '🧑‍🚀', name: 'Astro', rarity: 'uncommon', packs: ['cosmic'] },
  { id: 'moonpup', icon: '🌝', name: 'Moonpup', rarity: 'uncommon', packs: ['cosmic'] },
  { id: 'rocket', icon: '🚀', name: 'Rocket', rarity: 'uncommon', packs: ['cosmic'] },
  { id: 'satellite', icon: '🛰️', name: 'Sat', rarity: 'rare', packs: ['cosmic'] },
  { id: 'ringo', icon: '🪐', name: 'Ringo', rarity: 'rare', packs: ['cosmic'] },
  { id: 'comet', icon: '☄️', name: 'Comet', rarity: 'epic', packs: ['cosmic'] },
  { id: 'starling', icon: '🌟', name: 'Starling', rarity: 'epic', packs: ['cosmic'] },
  { id: 'nebula', icon: '🌌', name: 'Nebula', rarity: 'legendary', packs: ['cosmic'] },
  // forge
  { id: 'cogsworth', icon: '⚙️', name: 'Cogsworth', rarity: 'rare', packs: ['forge'] },
  { id: 'sparkplug', icon: '⚡', name: 'Sparkplug', rarity: 'rare', packs: ['forge'] },
  { id: 'anvil', icon: '🔨', name: 'Anvil', rarity: 'epic', packs: ['forge'] },
  { id: 'gem', icon: '💎', name: 'Gemma', rarity: 'epic', packs: ['forge'] },
  { id: 'crown', icon: '👑', name: 'Regal', rarity: 'legendary', packs: ['forge'] },
  { id: 'forgeheart', icon: '🔥', name: 'Forgeheart', rarity: 'legendary', packs: ['forge'] },
  { id: 'magma', icon: '🌋', name: 'Magma Titan', rarity: 'legendary', packs: ['forge'] },
  // ocean
  { id: 'finn', icon: '🐠', name: 'Finn', rarity: 'uncommon', packs: ['ocean'] },
  { id: 'splash', icon: '🐬', name: 'Splash', rarity: 'uncommon', packs: ['ocean'] },
  { id: 'pinch', icon: '🦀', name: 'Pinch', rarity: 'uncommon', packs: ['ocean'] },
  { id: 'shelly', icon: '🐚', name: 'Shelly', rarity: 'uncommon', packs: ['ocean'] },
  { id: 'blubber', icon: '🦭', name: 'Blubber', rarity: 'rare', packs: ['ocean'] },
  { id: 'puff', icon: '🐡', name: 'Puff', rarity: 'rare', packs: ['ocean'] },
  { id: 'claws', icon: '🦞', name: 'Claws', rarity: 'rare', packs: ['ocean'] },
  { id: 'spout', icon: '🐳', name: 'Spout', rarity: 'epic', packs: ['ocean'] },
  { id: 'marina', icon: '🧜', name: 'Marina', rarity: 'epic', packs: ['ocean'] },
  { id: 'trident', icon: '🔱', name: 'Trident King', rarity: 'legendary', packs: ['ocean'] },
  // spooky
  { id: 'boo', icon: '👻', name: 'Boo', rarity: 'uncommon', packs: ['spooky'] },
  { id: 'jack', icon: '🎃', name: 'Jack', rarity: 'uncommon', packs: ['spooky'] },
  { id: 'flap', icon: '🦇', name: 'Flap', rarity: 'uncommon', packs: ['spooky'] },
  { id: 'webster', icon: '🕷️', name: 'Webster', rarity: 'uncommon', packs: ['spooky'] },
  { id: 'shamble', icon: '🧟', name: 'Shamble', rarity: 'rare', packs: ['spooky'] },
  { id: 'count', icon: '🧛', name: 'The Count', rarity: 'rare', packs: ['spooky'] },
  { id: 'bones', icon: '💀', name: 'Bones', rarity: 'epic', packs: ['spooky'] },
  { id: 'harvest', icon: '🌕', name: 'Harvest Moon', rarity: 'legendary', packs: ['spooky'] },
  // sweets
  { id: 'sprinkles', icon: '🍩', name: 'Sprinkles', rarity: 'uncommon', packs: ['sweets'] },
  { id: 'cupcake', icon: '🧁', name: 'Cupcake', rarity: 'uncommon', packs: ['sweets'] },
  { id: 'crumbs', icon: '🍪', name: 'Crumbs', rarity: 'uncommon', packs: ['sweets'] },
  { id: 'taffy', icon: '🍬', name: 'Taffy', rarity: 'uncommon', packs: ['sweets'] },
  { id: 'swirl', icon: '🍭', name: 'Swirl', rarity: 'rare', packs: ['sweets'] },
  { id: 'scoop', icon: '🍦', name: 'Scoop', rarity: 'rare', packs: ['sweets'] },
  { id: 'cocoa', icon: '🍫', name: 'Cocoa', rarity: 'rare', packs: ['sweets'] },
  { id: 'party', icon: '🎂', name: 'Party Cake', rarity: 'epic', packs: ['sweets'] },
  { id: 'waffle', icon: '🧇', name: 'Golden Waffle', rarity: 'legendary', packs: ['sweets'] },
  // dino
  { id: 'longneck', icon: '🦕', name: 'Longneck', rarity: 'uncommon', packs: ['dino'] },
  { id: 'eggbert', icon: '🥚', name: 'Eggbert', rarity: 'uncommon', packs: ['dino'] },
  { id: 'snapjaw', icon: '🐊', name: 'Snapjaw', rarity: 'uncommon', packs: ['dino'] },
  { id: 'gecko', icon: '🦎', name: 'Gecko', rarity: 'uncommon', packs: ['dino'] },
  { id: 'slither', icon: '🐍', name: 'Slither', rarity: 'rare', packs: ['dino'] },
  { id: 'drake', icon: '🐲', name: 'Drake', rarity: 'rare', packs: ['dino'] },
  { id: 'mammoth', icon: '🦣', name: 'Mammoth', rarity: 'epic', packs: ['dino'] },
  { id: 'dodo', icon: '🦤', name: 'Dodo', rarity: 'epic', packs: ['dino'] },
  { id: 'titan', icon: '🗿', name: 'Stone Titan', rarity: 'legendary', packs: ['dino'] },
  // sports
  { id: 'kicker', icon: '⚽', name: 'Kicker', rarity: 'uncommon', packs: ['sports'] },
  { id: 'hoops', icon: '🏀', name: 'Hoops', rarity: 'uncommon', packs: ['sports'] },
  { id: 'spiral', icon: '🏈', name: 'Spiral', rarity: 'uncommon', packs: ['sports'] },
  { id: 'slugger', icon: '⚾', name: 'Slugger', rarity: 'uncommon', packs: ['sports'] },
  { id: 'ace', icon: '🎾', name: 'Ace', rarity: 'rare', packs: ['sports'] },
  { id: 'slapshot', icon: '🏒', name: 'Slapshot', rarity: 'rare', packs: ['sports'] },
  { id: 'champ', icon: '🥊', name: 'Champ', rarity: 'epic', packs: ['sports'] },
  { id: 'medal', icon: '🥇', name: 'Gold Medal', rarity: 'epic', packs: ['sports'] },
  { id: 'trophy', icon: '🏆', name: 'Trophy', rarity: 'legendary', packs: ['sports'] },
  // tech
  { id: 'floppy', icon: '💾', name: 'Floppy', rarity: 'uncommon', packs: ['tech'] },
  { id: 'joy', icon: '🕹️', name: 'Joy', rarity: 'uncommon', packs: ['tech'] },
  { id: 'dish', icon: '📡', name: 'Dish', rarity: 'uncommon', packs: ['tech'] },
  { id: 'volt', icon: '🔋', name: 'Volt', rarity: 'rare', packs: ['tech'] },
  { id: 'magnet', icon: '🧲', name: 'Magneto', rarity: 'rare', packs: ['tech'] },
  { id: 'bulb', icon: '💡', name: 'Bright Idea', rarity: 'rare', packs: ['tech'] },
  { id: 'servo', icon: '🦾', name: 'Servo Arm', rarity: 'epic', packs: ['tech'] },
  { id: 'brainwave', icon: '🧠', name: 'Brainwave', rarity: 'epic', packs: ['tech'] },
  { id: 'quantum', icon: '💠', name: 'Quantum Core', rarity: 'legendary', packs: ['tech'] },
  // mythic
  { id: 'pixie', icon: '🧚', name: 'Pixie', rarity: 'rare', packs: ['mythic'] },
  { id: 'genie', icon: '🧞', name: 'Genie', rarity: 'rare', packs: ['mythic'] },
  { id: 'wand', icon: '🪄', name: 'Wand', rarity: 'rare', packs: ['mythic'] },
  { id: 'merlin', icon: '🧙', name: 'Merlin', rarity: 'epic', packs: ['mythic'] },
  { id: 'elfin', icon: '🧝', name: 'Elfin', rarity: 'epic', packs: ['mythic'] },
  { id: 'rainbow', icon: '🌈', name: 'Rainbow', rarity: 'epic', packs: ['mythic'] },
  { id: 'oracle', icon: '🔮', name: 'Oracle', rarity: 'legendary', packs: ['mythic'] },
  { id: 'wishstar', icon: '🌠', name: 'Wishstar', rarity: 'legendary', packs: ['mythic'] },
];

const STANDARD = { uncommon: 60, rare: 28, epic: 10, legendary: 2 };
const PACKS = {
  mystery: { name: 'Mystery Pack', cost: 120, icon: '❓', color: '#bcaee0', odds: { uncommon: 70, rare: 22, epic: 7, legendary: 1 }, desc: 'Could be anything from any pack.' },
  wild: { name: 'Wild Pack', cost: 150, icon: '🌿', color: '#2ee6a8', odds: STANDARD, desc: 'Critters from forests and jungles.' },
  sweets: { name: 'Sweet Pack', cost: 150, icon: '🍭', color: '#ff7ad9', odds: STANDARD, desc: 'Snacks with attitude.' },
  ocean: { name: 'Ocean Pack', cost: 200, icon: '🌊', color: '#4ee0ff', odds: STANDARD, desc: 'Dive deep for rare sea life.' },
  sports: { name: 'Sports Pack', cost: 200, icon: '🏟️', color: '#ff9f43', odds: STANDARD, desc: 'Champions only.' },
  spooky: { name: 'Spooky Pack', cost: 250, icon: '🕸️', color: '#c58bff', odds: { uncommon: 55, rare: 30, epic: 12, legendary: 3 }, desc: 'Things that go bump in the night.' },
  cosmic: { name: 'Cosmic Pack', cost: 250, icon: '🌌', color: '#48a6ff', odds: { uncommon: 50, rare: 32, epic: 14, legendary: 4 }, desc: 'Out of this world.' },
  dino: { name: 'Dino Pack', cost: 300, icon: '🦴', color: '#a3e635', odds: { uncommon: 50, rare: 32, epic: 14, legendary: 4 }, desc: 'Ancient and enormous.' },
  tech: { name: 'Tech Pack', cost: 300, icon: '⚙️', color: '#818cf8', odds: { uncommon: 50, rare: 32, epic: 14, legendary: 4 }, desc: 'Built in the Forge labs.' },
  forge: { name: 'Forge Pack', cost: 400, icon: '🔥', color: '#ffc93c', odds: { rare: 60, epic: 30, legendary: 10 }, desc: 'No commons. Hot off the anvil.' },
  mythic: { name: 'Mythic Pack', cost: 500, icon: '✨', color: '#fbbf24', odds: { rare: 40, epic: 40, legendary: 20 }, desc: 'The best odds for legendaries.' },
};

const REFUND = { uncommon: 10, rare: 25, epic: 60, legendary: 150 };

const byIcon = new Map(COLLECTIBLES.map(c => [c.icon, c]));

function canUseAvatar(user, icon) {
  if (BASIC.includes(icon)) return true;
  const c = byIcon.get(icon);
  return !!(c && user && user.forgelings && user.forgelings[c.id]);
}

function openPack(user, packId) {
  const pack = PACKS[packId];
  if (!pack) throw new Error('That pack does not exist.');
  if ((user.coins || 0) < pack.cost) throw new Error(`You need ${pack.cost} coins for the ${pack.name}.`);
  user.coins -= pack.cost;
  let r = crypto.randomInt(100);
  let rarity = 'uncommon';
  for (const [k, w] of Object.entries(pack.odds)) { if ((r -= w) < 0) { rarity = k; break; } }
  const inPack = c => packId === 'mystery' || c.packs.includes(packId);
  let pool = COLLECTIBLES.filter(c => inPack(c) && c.rarity === rarity);
  if (!pool.length) pool = COLLECTIBLES.filter(inPack);
  const got = pool[crypto.randomInt(pool.length)];
  user.forgelings = user.forgelings || {};
  const duplicate = !!user.forgelings[got.id];
  let refund = 0;
  if (duplicate) { refund = REFUND[got.rarity]; user.coins += refund; }
  user.forgelings[got.id] = (user.forgelings[got.id] || 0) + 1;
  return { forgeling: got, duplicate, refund };
}

function rewardsFor({ correct, answered, place, playerCount, solo, won }) {
  let coins = 10 + correct * 5;
  if (playerCount >= 3) coins += [50, 30, 20][place - 1] || 0;
  if (won && playerCount < 3) coins += 30;
  let xp = answered * 2 + correct * 3 + (place === 1 ? 25 : 0);
  if (solo) { coins = Math.round(coins / 2); xp = Math.round(xp / 2); }
  return { coins, xp };
}

const today = () => new Date().toISOString().slice(0, 10);

function applyRewards(user, r) {
  let daily = 0;
  if (user.lastDaily !== today()) { daily = 50; user.lastDaily = today(); }
  user.coins = (user.coins || 0) + r.coins + daily;
  user.xp = (user.xp || 0) + r.xp;
  user.gamesPlayed = (user.gamesPlayed || 0) + 1;
  if (r.won) user.wins = (user.wins || 0) + 1;
  return { ...r, daily };
}

module.exports = { BASIC, COLLECTIBLES, PACKS, REFUND, canUseAvatar, openPack, rewardsFor, applyRewards };