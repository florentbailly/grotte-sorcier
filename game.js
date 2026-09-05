"use strict";

const canvas = document.querySelector("#sceneCanvas");
const ctx = canvas.getContext("2d");
const screenEl = document.querySelector(".screen");
const gameLog = document.querySelector("#gameLog");
const commandForm = document.querySelector("#commandForm");
const commandInput = document.querySelector("#commandInput");
const suggestionsEl = document.querySelector("#suggestions");
const inventoryEl = document.querySelector("#inventory");
const warmthEl = document.querySelector("#warmth");
const objectiveEl = document.querySelector("#objective");
const roomNameEl = document.querySelector("#roomName");
const roomIndexEl = document.querySelector("#roomIndex");
const moveCounterEl = document.querySelector("#moveCounter");
const restartButton = document.querySelector("#restartButton");
const soundButton = document.querySelector("#soundButton");
const endingDialog = document.querySelector("#endingDialog");
const endingText = document.querySelector("#endingText");
const playAgainButton = document.querySelector("#playAgainButton");
const deathDialog = document.querySelector("#deathDialog");
const deathTitle = document.querySelector("#deathTitle");
const deathText = document.querySelector("#deathText");
const continueButton = document.querySelector("#continueButton");
const deathRestartButton = document.querySelector("#deathRestartButton");

const ROOMS = {
  entree: { title: "Entrée des vents", index: "01 / 10" },
  galerie: { title: "Galerie aux trois voies", index: "02 / 10" },
  crypte: { title: "Crypte du dernier nain", index: "03 / 10" },
  lac: { title: "Lac du faux trésor", index: "04 / 10" },
  forge: { title: "Forge sans soleil", index: "05 / 10" },
  gouffre: { title: "Gouffre des échos", index: "06 / 10" },
  carrefour: { title: "Carrefour des trois bouches", index: "07 / 10" },
  caveau: { title: "Caveau des avides", index: "08 / 10" },
  leviers: { title: "Salle des trois serments", index: "09 / 10" },
  sanctuaire: { title: "Sanctuaire de givre", index: "10 / 10" },
};

const ITEM_LABELS = {
  lanterne: "Lanterne",
  silex: "Silex",
  piece: "Pièce de bronze",
  dague: "Dague noire",
  miroir: "Miroir d’argent",
  amulette: "Amulette de chaleur",
  braise: "Braise bleue",
  corde: "Corde usée",
  sceau: "Sceau solaire",
};

const SCENE_SOURCES = {
  entree: "assets/scene-entree.png",
  "galerie-closed": "assets/scene-galerie-closed.png",
  "galerie-open": "assets/scene-galerie-open.png",
  crypte: "assets/scene-crypte.png",
  lac: "assets/scene-lac.png",
  "forge-unlit": "assets/scene-forge-unlit.png",
  "forge-lit": "assets/scene-forge-lit.png",
  gouffre: "assets/scene-gouffre.png",
  carrefour: "assets/scene-carrefour.png",
  caveau: "assets/scene-caveau.png",
  leviers: "assets/scene-leviers.png",
  "sanctuaire-shield": "assets/scene-sanctuaire-shield.png",
  "sanctuaire-broken": "assets/scene-sanctuaire-broken.png",
  victoire: "assets/scene-victoire.png",
};

let state;
let checkpoint;
let checkpointLabel = "l’entrée";
let soundEnabled = false;
let audioContext = null;

const sceneImages = Object.fromEntries(
  Object.entries(SCENE_SOURCES).map(([key, source]) => {
    const image = new Image();
    image.src = source;
    image.addEventListener("load", () => {
      if (state && currentSceneKey() === key) drawScene();
    });
    return [key, image];
  }),
);

function initialState() {
  return {
    room: "entree", inventory: [], lanternLit: false, warmth: 3, maxWarmth: 3,
    commands: 0, deaths: 0, startedAt: Date.now(), pendingDeath: false,
    flags: {
      skeletonSearched: false, statuePaid: false, statueClueSeen: false,
      amuletFound: false, brazierLit: false, rubyTried: false,
      bridgeSecured: false, chasmCrossed: false, chasmClueSeen: false,
      gateOpened: false, crossroadsExamined: false, chestOpened: false,
      sunSealInserted: false, hallOpened: false, shieldBroken: false, won: false,
    },
  };
}

function cloneState(value) { return JSON.parse(JSON.stringify(value)); }
function saveCheckpoint(label) {
  checkpoint = cloneState(state);
  checkpoint.pendingDeath = false;
  checkpointLabel = label;
}
function normalize(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ").replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}
function includesAny(text, words) { return words.some((word) => text.includes(word)); }
function owns(item) { return state.inventory.includes(item); }
function addItem(item) { if (!owns(item)) state.inventory.push(item); }
function removeItem(item) { state.inventory = state.inventory.filter((current) => current !== item); }

function addLog(text, tone = "narration") {
  const entry = document.createElement("p");
  entry.className = `log-entry ${tone}`;
  entry.textContent = text;
  gameLog.append(entry);
  while (gameLog.children.length > 28) gameLog.firstElementChild.remove();
  gameLog.scrollTop = gameLog.scrollHeight;
}

function roomDescription() {
  switch (state.room) {
    case "entree": return state.flags.skeletonSearched
      ? "Le vent siffle entre les pierres. Une lanterne pend au mur. Près du squelette reposent un silex, une pièce de bronze et une dague noire. La galerie s’ouvre au nord."
      : "La lune découpe l’entrée de la caverne. Une lanterne pend à un crochet. Un ancien voyageur repose contre la paroi. La galerie s’enfonce au nord.";
    case "galerie": return state.flags.gateOpened
      ? "La crypte s’ouvre à l’est, la forge à l’ouest et la porte fondue laisse voir un passage au nord. Le retour vers l’entrée est au sud."
      : "Trois voies se dessinent : une crypte à l’est, une forge obscure à l’ouest et, au nord, une porte de glace sans serrure. L’entrée est au sud.";
    case "crypte": return state.flags.statuePaid
      ? "La statue du dernier nain a ouvert sa main de pierre. Son miroir peut être pris. Un sentier humide longe les tombeaux vers l’est ; la galerie est à l’ouest."
      : "Une statue naine serre un miroir d’argent. Son autre paume est ouverte. Sur le socle : « Nul ne franchit la nuit sans payer le passeur. » Des traces d’eau partent vers l’est.";
    case "lac": return state.flags.amuletFound
      ? "Une couronne étincelle au milieu d’une glace très mince. Dans la barque échouée repose une petite amulette. La crypte se trouve à l’ouest."
      : "Un lac noir bloque la caverne. Une couronne étincelle sur la glace. Une barque abandonnée attend près de la rive. La crypte se trouve à l’ouest.";
    case "forge": return state.flags.brazierLit
      ? "Le brasier chante d’une flamme bleue. Une braise cristalline repose en son centre. Un rubis sombre est enchâssé dans l’enclume. La galerie est à l’est ; des marches descendent au sud."
      : "Ta lanterne révèle une enclume fendue, un rubis sombre et un brasier éteint. Une inscription dit : « Une petite étincelle réveille les vieux soleils. » Sorties à l’est et au sud.";
    case "gouffre": return state.flags.bridgeSecured
      ? owns("sceau")
        ? "La corde renforce le pont délabré. Une empreinte ronde et vide reste au centre du soleil gravé sur la rive opposée. La forge est au nord."
        : "La corde renforce maintenant le pont délabré. Un grand soleil entoure une plaque de bronze sur la paroi opposée. La forge se trouve au nord."
      : "Un pont de corde aux planches brisées surplombe un gouffre sans fond. Sur la paroi opposée, un grand symbole solaire luit faiblement. La forge se trouve au nord.";
    case "carrefour": return "Trois bouches attendent : à l’ouest, un tunnel couvert de traces ; au nord, une lueur de trésor ; à l’est, un passage marqué d’un soleil usé. La galerie est au sud.";
    case "caveau": return state.flags.chestOpened
      ? "Le coffre ouvert déborde d’or. Une corde usée gît auprès d’un squelette aux doigts broyés. Le carrefour est au sud."
      : "Un coffre massif occupe le caveau. Une corde usée et un squelette écrasé reposent à ses pieds. Le carrefour est au sud.";
    case "leviers": return state.flags.hallOpened
      ? "Le levier du soleil est abaissé. La porte du sanctuaire est ouverte au nord ; le carrefour est à l’ouest."
      : state.flags.sunSealInserted
        ? "Le sceau complète le relief du soleil. Trois leviers font face à la porte scellée : soleil, lune et couronne. Le carrefour est à l’ouest."
        : "Trois leviers font face à une porte scellée : soleil, lune et couronne. Sous le soleil, une cavité ronde attend quelque chose. Le carrefour est à l’ouest.";
    case "sanctuaire": return state.flags.shieldBroken
      ? "Le miroir a brisé le halo du sorcier. Dépourvu de bouclier, il recule en protégeant son sceptre fendu. La fuite reste possible au sud."
      : "Le Sorcier de Givre domine un pilier d’où jaillit un rayon pâle. Des nains gelés jonchent le chemin. La porte est au sud.";
    default: return "La caverne retient son souffle.";
  }
}

function objective() {
  if (!state.flags.gateOpened) return "Explorer la grotte et franchir la porte de glace.";
  if (!state.flags.hallOpened) return "Trouver la route véritable au-delà de la porte.";
  if (!state.flags.won) return "Rompre le sort du Sorcier de Givre.";
  return "Le printemps est libre.";
}

function shortcutSpecs() {
  const fill = (label, value) => ({ label, fill: value });
  const run = (label, command = label) => ({ label, command });
  const inspect = fill("Examiner…", "examiner ");
  const take = fill("Prendre…", "prendre ");
  const use = fill("Utiliser…", "utiliser ");
  switch (state.room) {
    case "entree": return [run("Regarder"), inspect, take, run("Nord")];
    case "galerie": return [run("Nord"), run("Est"), run("Ouest"), inspect];
    case "crypte": return [inspect, fill("Donner…", "donner "), run("Est"), run("Ouest")];
    case "lac": return [inspect, take, fill("Traverser…", "traverser "), run("Ouest")];
    case "forge": return [inspect, use, run("Sud"), run("Est")];
    case "gouffre": return [inspect, use, fill("Traverser…", "traverser "), run("Nord")];
    case "carrefour": return [inspect, run("Ouest"), run("Nord"), run("Est")];
    case "caveau": return [inspect, fill("Ouvrir…", "ouvrir "), take, run("Sud")];
    case "leviers": return [inspect, fill("Abaisser…", "abaisser le levier "), run("Nord"), run("Ouest")];
    case "sanctuaire": return [inspect, use, fill("Attaquer…", "attaquer "), run("Sud")];
    default: return [run("Regarder"), inspect, run("Inventaire"), run("Indice")];
  }
}

function renderStatus() {
  const room = ROOMS[state.room];
  roomNameEl.textContent = room.title;
  roomIndexEl.textContent = room.index;
  objectiveEl.textContent = objective();
  moveCounterEl.textContent = `${state.commands} commande${state.commands > 1 ? "s" : ""} · ${state.deaths} mort${state.deaths > 1 ? "s" : ""}`;
  inventoryEl.replaceChildren();
  if (state.inventory.length === 0) {
    const empty = document.createElement("li"); empty.className = "empty"; empty.textContent = "Rien pour l’instant"; inventoryEl.append(empty);
  } else state.inventory.forEach((item) => { const li = document.createElement("li"); li.textContent = ITEM_LABELS[item]; inventoryEl.append(li); });
  warmthEl.replaceChildren();
  for (let i = 0; i < state.maxWarmth; i += 1) { const pip = document.createElement("span"); if (i >= state.warmth) pip.className = "empty"; warmthEl.append(pip); }
  warmthEl.setAttribute("aria-label", `Chaleur : ${state.warmth} sur ${state.maxWarmth}`);
  suggestionsEl.replaceChildren();
  shortcutSpecs().forEach((spec) => {
    const button = document.createElement("button"); button.type = "button"; button.textContent = spec.label;
    button.addEventListener("click", () => {
      if (spec.fill !== undefined) { commandInput.value = spec.fill; commandInput.focus(); commandInput.setSelectionRange(spec.fill.length, spec.fill.length); }
      else submitCommand(spec.command);
    });
    suggestionsEl.append(button);
  });
  drawScene();
}

function showRoom() { addLog(ROOMS[state.room].title.toUpperCase(), "system"); addLog(roomDescription()); renderStatus(); beep("move"); }

function directionFrom(command) {
  if (/\b(nord|n|centre|tout droit)\b/.test(command)) return "nord";
  if (/\b(sud|s)\b/.test(command)) return "sud";
  if (/\b(est|e|droite)\b/.test(command)) return "est";
  if (/\b(ouest|o|gauche)\b/.test(command)) return "ouest";
  return null;
}

function move(direction) {
  if (state.room === "galerie" && direction === "ouest" && !state.lanternLit) return addLog("La forge est trop noire. Il te faut une lumière.", "danger");
  if (state.room === "galerie" && direction === "nord" && !state.flags.gateOpened) return addLog("La porte de glace ne bouge pas. Elle n’a ni poignée ni serrure.", "danger");
  if (state.room === "leviers" && direction === "nord" && !state.flags.hallOpened) return addLog("La porte du sanctuaire reste scellée. L’un des leviers doit la commander.", "danger");
  if (state.room === "carrefour" && direction === "ouest") {
    state.room = "galerie"; state.lanternLit = false;
    addLog("Le tunnel tourne, descend, remonte… et te rejette dans la galerie. Un courant d’air a éteint ta lanterne.", "danger"); showRoom(); return;
  }
  const routes = {
    entree: { nord: "galerie" }, galerie: { sud: "entree", est: "crypte", ouest: "forge", nord: "carrefour" },
    crypte: { ouest: "galerie", est: "lac" }, lac: { ouest: "crypte" }, forge: { est: "galerie", sud: "gouffre" },
    gouffre: { nord: "forge" }, carrefour: { sud: "galerie", nord: "caveau", est: "leviers" },
    caveau: { sud: "carrefour" }, leviers: { ouest: "carrefour", nord: "sanctuaire" }, sanctuaire: { sud: "leviers" },
  };
  const destination = routes[state.room][direction];
  if (!destination) return addLog("La roche ferme le passage dans cette direction.");
  state.room = destination; showRoom();
}

function examine(command) {
  if (state.room === "entree" && includesAny(command, ["squelette", "voyageur", "ossement", "mort"])) {
    state.flags.skeletonSearched = true; addLog("Sa bourse contient une pièce et un silex. Une dague noire est coincée sous ses côtes. Au mur : « La glace craint le feu ; le feu craint son reflet. »", "reward");
  } else if (state.room === "entree" && command.includes("dague")) addLog("Sa lame absorbe la lumière au lieu de la réfléchir. Le squelette la serrait encore au moment de mourir.");
  else if (state.room === "entree" && command.includes("lanterne")) addLog("Une solide lanterne de cuivre. Sa mèche attend une étincelle.");
  else if (state.room === "galerie" && includesAny(command, ["porte", "glace", "givre"])) addLog(state.flags.gateOpened ? "La porte n’est plus qu’un rideau d’eau." : "Une chaleur ordinaire ne suffirait pas. Une cavité dans la glace a la taille d’un gros charbon.");
  else if (state.room === "crypte" && includesAny(command, ["statue", "nain", "main"])) addLog(state.flags.statuePaid ? "La statue a accepté ton offrande. Sous sa main ouverte apparaît une seconde inscription." : "Une paume réclame un paiement ; l’autre retient le miroir. Les doigts sont reliés à un mécanisme dans la voûte.");
  else if (state.room === "crypte" && includesAny(command, ["socle", "inscription"])) {
    if (!state.flags.statuePaid) addLog("La première inscription parle du prix dû au passeur. Une autre ligne reste cachée sous la main de pierre.");
    else { state.flags.statueClueSeen = true; addLog("La ligne révélée dit : « La lune égare. La couronne asservit. Seul le soleil réveille la montagne. »", "reward"); }
  } else if (state.room === "lac" && includesAny(command, ["barque", "bateau"])) {
    state.flags.amuletFound = true; addLog("La barque est pourrie, mais une petite amulette de cuivre est nouée sous son banc.", "reward");
  } else if (state.room === "lac" && includesAny(command, ["glace", "couronne", "lac"])) addLog("Sous la couronne, des fissures rayonnent comme une toile d’araignée. Quelqu’un a placé ce trésor pour attirer les imprudents.", "danger");
  else if (state.room === "forge" && includesAny(command, ["brasier", "cendre", "forge"])) addLog(state.flags.brazierLit ? "La flamme ne brûle pas la peau. Une braise bleue s’est solidifiée en son centre." : "Sous la cendre subsiste une poudre dorée. Une seule étincelle pourrait la réveiller.");
  else if (state.room === "forge" && includesAny(command, ["rubis", "gemme", "pierre rouge"])) addLog("Le rubis pulse comme un cœur. Autour de lui, l’enclume est noircie par des mains brûlées.", "danger");
  else if (state.room === "gouffre" && includesAny(command, ["pont", "corde", "planche"])) addLog(state.flags.bridgeSecured ? "Ta corde maintient les attaches. Le passage paraît enfin supportable." : "Deux cordes sont rompues et les planches centrales ne tiennent plus que par un nœud.", state.flags.bridgeSecured ? "reward" : "danger");
  else if (state.room === "gouffre" && includesAny(command, ["paroi", "soleil", "symbole", "inscription"])) {
    state.flags.chasmClueSeen = true; addLog("Le symbole représente un soleil au zénith. Dessous : une lune barrée, une couronne brisée et une porte ouverte.", "reward");
  } else if (state.room === "carrefour" && includesAny(command, ["trace", "tunnel", "bouche", "passage", "sol"])) {
    state.flags.crossroadsExamined = true; addLog("À l’ouest, tes propres empreintes semblent revenir. Au nord, la lueur est trop régulière. À l’est, le soleil gravé est usé par de nombreux passages.", "reward");
  } else if (state.room === "caveau" && includesAny(command, ["squelette", "plafond", "pierre", "piege"])) addLog("Les doigts du squelette sont broyés sur une pièce d’or. De fines rainures relient le coffre aux blocs du plafond.", "danger");
  else if (state.room === "caveau" && command.includes("coffre")) addLog(state.flags.chestOpened ? "L’or est réel. Le mécanisme au plafond l’est aussi." : "Le coffre n’est pas verrouillé. C’est presque trop aimable.");
  else if (state.room === "leviers" && includesAny(command, ["levier", "soleil", "lune", "couronne", "mecanisme", "cavite"])) addLog("Les leviers sont identiques. Deux symboles ont été associés au danger ailleurs. Sous le soleil, une cavité ronde porte ces mots : « Ce qui fut pris au gouffre scelle le serment. »");
  else if (state.room === "sanctuaire" && includesAny(command, ["sorcier", "rayon", "halo", "bouclier"])) addLog(state.flags.shieldBroken ? "Sans son halo, toute la puissance du sorcier s’est réfugiée dans son sceptre fendu." : "Le rayon tourne autour de son maître. Il se reflète parfaitement dans les parois de glace.");
  else if (state.room === "sanctuaire" && includesAny(command, ["sceptre", "baton"])) addLog(state.flags.shieldBroken ? "Le sceptre craque sous son propre froid. Une chaleur ancienne pourrait l’achever." : "Le halo empêche encore d’approcher le sceptre.");
  else addLog(roomDescription());
}

function take(command) {
  if (command.includes("tout")) return addLog("La prudence interdit de tout ramasser sans regarder.");
  if (command.includes("lanterne")) {
    if (state.room !== "entree") return addLog("Il n’y a pas de lanterne ici."); if (owns("lanterne")) return addLog("Tu as déjà la lanterne."); addItem("lanterne"); addLog("Tu décroches la lanterne de cuivre.", "reward");
  } else if (command.includes("silex")) {
    if (state.room !== "entree" || !state.flags.skeletonSearched) return addLog("Tu ne vois aucun silex ici."); if (owns("silex")) return addLog("Tu as déjà le silex."); addItem("silex"); addLog("Tu prends le silex.", "reward");
  } else if (includesAny(command, ["piece", "monnaie"])) {
    if (state.room !== "entree" || !state.flags.skeletonSearched) return addLog("Tu ne vois aucune pièce ici."); if (owns("piece")) return addLog("La pièce est déjà dans ta poche."); if (state.flags.statuePaid) return addLog("La statue a déjà reçu la pièce."); addItem("piece"); addLog("Tu prends la lourde pièce de bronze.", "reward");
  } else if (includesAny(command, ["dague", "lame", "couteau"])) {
    if (state.room !== "entree" || !state.flags.skeletonSearched) return addLog("Tu ne vois aucune dague ici."); if (owns("dague")) return addLog("Tu portes déjà la dague noire."); addItem("dague"); addLog("La dague est glacée. Peut-être une arme. Peut-être un avertissement.", "reward");
  } else if (command.includes("miroir")) {
    if (state.room !== "crypte") return addLog("Tu ne vois aucun miroir ici."); if (!state.flags.statuePaid) return addLog("Les doigts de la statue refusent de le lâcher.", "danger"); if (owns("miroir")) return addLog("Tu as déjà le miroir."); addItem("miroir"); addLog("Tu prends le miroir d’argent. Un éclair traverse la crypte.", "reward"); saveCheckpoint("la crypte");
  } else if (includesAny(command, ["amulette", "pendentif", "talisman"])) {
    if (state.room !== "lac" || !state.flags.amuletFound) return addLog("Tu ne vois aucune amulette ici."); if (owns("amulette")) return addLog("Tu portes déjà l’amulette."); addItem("amulette"); state.maxWarmth = 4; state.warmth = Math.min(4, state.warmth + 1); addLog("L’amulette diffuse une chaleur douce. Tu résisteras à un coup de froid supplémentaire.", "reward"); saveCheckpoint("la rive du lac");
  } else if (includesAny(command, ["couronne", "tresor du lac"]) && state.room === "lac") return killPlayer("La glace menteuse", "À ton troisième pas, la glace cède. L’eau noire se referme avant que tu puisses atteindre la rive.");
  else if (includesAny(command, ["rubis", "gemme", "pierre rouge"]) && state.room === "forge") {
    if (state.flags.rubyTried) return killPlayer("Le cœur de la forge", "Tu saisis une seconde fois le rubis. La forge aspire toute ta chaleur et ne laisse qu’une silhouette de cendre.");
    state.flags.rubyTried = true; addLog("Le rubis mord ta main et aspire deux fragments de chaleur. Tu le lâches juste à temps.", "danger"); loseWarmth(2);
  } else if (includesAny(command, ["braise", "charbon", "cristal"])) {
    if (state.room !== "forge" || !state.flags.brazierLit) return addLog("Tu ne vois aucune braise à prendre."); if (owns("braise")) return addLog("Tu portes déjà la braise bleue."); addItem("braise"); addLog("La braise éclaire ta paume sans la brûler.", "reward"); saveCheckpoint("la forge rallumée");
  } else if ((/\bor\b/.test(command) || includesAny(command, ["pieces", "tresor"])) && state.room === "caveau") {
    if (!state.flags.chestOpened) return addLog("L’or se trouve encore dans le coffre fermé."); return killPlayer("Le prix de l’avidité", "À l’instant où une pièce quitte le coffre, les blocs du plafond s’abattent. Le squelette avait pourtant essayé de te prévenir.");
  } else if (command.includes("corde") && state.room === "caveau") {
    if (owns("corde")) return addLog("Tu as déjà pris la corde."); addItem("corde"); addLog("Tu prends la corde sans toucher au coffre. Rien ne bouge.", "reward");
  } else return addLog("Tu ne peux pas prendre cela.");
  beep("item");
}

function lightLantern() {
  if (!owns("lanterne")) return addLog("Tu n’as pas de lanterne."); if (!owns("silex")) return addLog("Il te faut une étincelle."); if (state.lanternLit) return addLog("La lanterne est déjà allumée.");
  state.lanternLit = true; addLog("Crac ! Une lumière pâle repousse les ombres.", "reward"); beep("success");
}
function payStatue() {
  if (state.room !== "crypte") return addLog("Personne ici ne réclame cette offrande."); if (state.flags.statuePaid) return addLog("La statue a déjà reçu son dû."); if (!owns("piece")) return addLog("Tu n’as rien qui puisse payer le passeur.");
  removeItem("piece"); state.flags.statuePaid = true; addLog("La pièce disparaît dans la paume du nain. Ses doigts libèrent le miroir et dévoilent une seconde inscription.", "reward"); beep("success");
}
function forceStatue() {
  if (state.room !== "crypte" || state.flags.statuePaid) return addLog("Rien ne résiste ici.");
  killPlayer("La main du dernier nain", "Tu forces les doigts de pierre. Le mécanisme caché se déclenche et la voûte s’effondre sur toi.");
}
function lightBrazier() {
  if (state.room !== "forge") return addLog("Il n’y a pas de brasier ici."); if (!owns("silex")) return addLog("Il te faut une étincelle."); if (state.flags.brazierLit) return addLog("Le brasier brûle déjà.");
  state.flags.brazierLit = true; addLog("Les étincelles touchent la poudre. Une flamme bleue jaillit jusqu’à la voûte !", "reward"); beep("success");
}
function openGate() {
  if (state.room !== "galerie") return addLog("Il n’y a pas de porte de glace ici."); if (!owns("braise")) return addLog("Tu n’as rien d’assez chaud pour cette glace."); if (state.flags.gateOpened) return addLog("La porte est déjà ouverte.");
  state.flags.gateOpened = true; addLog("La braise chante contre la porte. La glace se fend puis ruisselle, libérant le nord.", "reward"); saveCheckpoint("la porte de glace"); beep("success");
}
function secureBridge() {
  if (state.room !== "gouffre") return addLog("Aucun pont n’a besoin de cette corde ici."); if (!owns("corde")) return addLog("Tu n’as pas de corde."); if (state.flags.bridgeSecured) return addLog("Le pont est déjà renforcé.");
  state.flags.bridgeSecured = true; addLog("Tu doubles les attaches avec la corde. Le pont peut maintenant porter ton poids.", "reward"); beep("success");
}
function crossObstacle(command) {
  if (state.room === "lac" || includesAny(command, ["glace", "couronne"])) return killPlayer("La glace menteuse", "Le premier pas tient. Le deuxième craque. Au troisième, l’eau noire t’engloutit.");
  if (state.room === "gouffre") {
    if (!state.flags.bridgeSecured) return killPlayer("Le pont des imprudents", "La corde cède à mi-chemin. Ton cri descend longtemps dans le gouffre.");
    state.flags.chasmCrossed = true; state.flags.chasmClueSeen = true;
    if (!owns("sceau")) {
      addItem("sceau");
      addLog("La corde tient. Sur l'autre rive, tu détaches la plaque de bronze enchâssée dans le soleil : un sceau solaire. Tu reviens avant que les nœuds ne lâchent.", "reward");
      saveCheckpoint("le gouffre franchi");
    } else addLog("La corde tient encore. L'empreinte vide du soleil correspond exactement au sceau que tu portes.", "reward");
    return;
  }
  addLog("Tu ne vois rien à traverser ici.");
}
function openThing(command) {
  if (state.room === "galerie" && includesAny(command, ["porte", "glace"])) return openGate();
  if (state.room === "caveau" && command.includes("coffre")) {
    if (state.flags.chestOpened) return addLog("Le coffre est déjà ouvert."); state.flags.chestOpened = true; addLog("Le coffre s’ouvre. L’or brille. Quelque part au-dessus, une pierre grince.", "danger"); return;
  }
  if (state.room === "leviers" && includesAny(command, ["porte", "sanctuaire"])) return addLog(state.flags.hallOpened ? "La porte est ouverte." : "La porte n’a aucune poignée ; les leviers la commandent.");
  addLog("Cela ne s’ouvre pas.");
}
function pullLever(command) {
  if (state.room !== "leviers") return addLog("Il n’y a aucun levier ici.");
  if (command.includes("soleil")) {
    if (!state.flags.sunSealInserted) return addLog("Le levier du soleil refuse de bouger. La cavité ronde sous son symbole est encore vide.");
    if (state.flags.hallOpened) return addLog("Le levier du soleil est déjà abaissé."); state.flags.hallOpened = true; addLog("Le soleil s’enfonce dans la pierre. La porte du nord révèle le sanctuaire.", "reward"); saveCheckpoint("la salle des trois serments"); beep("success");
  } else if (command.includes("lune")) {
    addLog("Le sol devient liquide. La lune t’égare et te précipite dans un autre lieu.", "danger"); loseWarmth(1); if (!state.pendingDeath) { state.room = "caveau"; showRoom(); }
  } else if (command.includes("couronne")) killPlayer("Le serment de servitude", "Une couronne de glace tombe de la voûte et t’enferme à jamais parmi les statues du sorcier.");
  else addLog("Lequel : soleil, lune ou couronne ?");
}
function reflectRay() {
  if (state.room !== "sanctuaire") return addLog("Rien ici ne mérite un tel reflet."); if (!owns("miroir")) return addLog("Tu n’as aucun miroir."); if (state.flags.shieldBroken) return addLog("Le halo est déjà brisé.");
  state.flags.shieldBroken = true; addLog("Tu dresses le miroir. Le rayon rebondit et fait éclater le halo en mille aiguilles de lumière !", "reward"); beep("success");
}
function winGame() {
  if (state.room !== "sanctuaire" || !owns("braise")) return addLog("Il te manque la chaleur capable de rompre ce sort.");
  if (!state.flags.shieldBroken) { addLog("Le halo absorbe la chaleur et te renvoie une bourrasque glacée.", "danger"); loseWarmth(2); return; }
  state.flags.won = true; addLog("La braise touche le sceptre. Le givre devient eau, le bâton se brise et le sorcier s’efface. Au-dehors, la montagne reverdit.", "reward"); beep("victory"); renderStatus();
  const elapsed = Math.max(1, Math.round((Date.now() - state.startedAt) / 60000));
  endingText.textContent = `Tu as vaincu le Sorcier de Givre en ${state.commands} commandes, après ${state.deaths} mort${state.deaths > 1 ? "s" : ""}, et environ ${elapsed} minute${elapsed > 1 ? "s" : ""}. La clé de la montagne est à toi.`;
  window.setTimeout(() => endingDialog.showModal(), 650);
}
function useItem(command) {
  const hasLantern = command.includes("lanterne"), hasFlint = command.includes("silex"), hasCoin = includesAny(command, ["piece", "monnaie"]);
  const hasEmber = includesAny(command, ["braise", "charbon", "cristal"]), hasMirror = command.includes("miroir"), hasRope = command.includes("corde"), hasDagger = includesAny(command, ["dague", "lame", "couteau"]), hasSeal = command.includes("sceau");
  if ((hasLantern && hasFlint) || (hasLantern && command.includes("feu"))) return lightLantern();
  if (hasCoin && includesAny(command, ["statue", "nain", "passeur"])) return payStatue();
  if (hasFlint && includesAny(command, ["brasier", "forge", "cendre"])) return lightBrazier();
  if (hasEmber && state.room === "galerie" && includesAny(command, ["porte", "glace", "givre"])) return openGate();
  if (hasRope && includesAny(command, ["pont", "gouffre"])) return secureBridge();
  if (hasSeal && state.room === "leviers" && includesAny(command, ["soleil", "cavite", "mur", "levier"])) {
    if (!owns("sceau")) return addLog("Tu ne possèdes aucun sceau.");
    if (state.flags.sunSealInserted) return addLog("Le sceau solaire est déjà enchâssé dans le mur.");
    removeItem("sceau"); state.flags.sunSealInserted = true; addLog("Le sceau s'emboîte dans la cavité. Une lumière cyan relie le disque au levier du soleil.", "reward"); beep("success"); return;
  }
  if (hasMirror && state.room === "sanctuaire" && includesAny(command, ["rayon", "halo", "sorcier"])) return reflectRay();
  if (hasEmber && state.room === "sanctuaire" && includesAny(command, ["sceptre", "baton", "sorcier"])) return winGame();
  if (hasDagger && state.room === "sanctuaire") return killPlayer("La lame qui boit la lumière", "La dague absorbe le rayon, puis ta propre chaleur. Le squelette de l’entrée avait connu la même fin.");
  addLog("Précise l’objet et sa cible. Exemple : UTILISER LA CORDE SUR LE PONT.");
}
function attack(command) {
  if (state.room !== "sanctuaire") return addLog("Frapper la roche ne change rien.");
  if (includesAny(command, ["dague", "lame", "couteau"]) || owns("dague")) return killPlayer("La lame qui boit la lumière", "La dague noire aspire le rayon, puis toute ta chaleur. Tu comprends pourquoi son ancien propriétaire est mort.");
  addLog("Ton attaque traverse le sorcier. Son rayon te vole un fragment de chaleur.", "danger"); loseWarmth(1);
}
function loseWarmth(amount) {
  state.warmth = Math.max(0, state.warmth - amount); beep("danger");
  if (state.warmth === 0) killPlayer("Le froid absolu", "Tes doigts cessent de répondre. La glace gagne ton cœur et le silence referme la caverne.");
}
function killPlayer(title, text) {
  if (state.pendingDeath) return; state.pendingDeath = true; state.deaths += 1; deathTitle.textContent = title; deathText.textContent = text; screenEl.classList.add("is-dead"); renderStatus(); beep("danger"); window.setTimeout(() => deathDialog.showModal(), 350);
}
function continueFromCheckpoint() {
  const meta = { commands: state.commands, deaths: state.deaths, startedAt: state.startedAt };
  state = cloneState(checkpoint); state.commands = meta.commands; state.deaths = meta.deaths; state.startedAt = meta.startedAt; state.pendingDeath = false; state.warmth = state.maxWarmth;
  deathDialog.close(); screenEl.classList.remove("is-dead"); gameLog.replaceChildren(); addLog(`Le temps se replie. Tu reprends conscience près de ${checkpointLabel}. Tes souvenirs, eux, sont intacts.`, "system"); showRoom();
}
function showHelp() { addLog("Commandes : REGARDER, EXAMINER [objet], PRENDRE [objet], UTILISER [objet] SUR [cible], DONNER [objet], OUVRIR [objet], ABAISSER [levier], ALLER NORD/SUD/EST/OUEST, INVENTAIRE, INDICE.", "system"); }
function showHint() {
  const hints = {
    entree: "Le précédent voyageur n’a peut-être pas tout perdu inutilement.", galerie: "La porte attend une chaleur qui ne se consume pas.",
    crypte: "Un passeur réclame un prix ; le forcer serait manquer de respect à la montagne.", lac: "Le trésor le plus éclatant est parfois celui qu’on a placé pour être vu.",
    forge: "Une étincelle suffit au brasier. Tout ce qui brille dans une forge n’est pas fait pour être pris.", gouffre: "Le symbole d’en face peut être lu sans forcément risquer le pont.",
    carrefour: "Les traces et les symboles racontent plus vrai que les lueurs.", caveau: "Observe les mains de celui qui t’a précédé avant de toucher à sa convoitise.",
    leviers: "La lune, la couronne et le soleil ont déjà laissé des indices ailleurs.", sanctuaire: state.flags.shieldBroken ? "Le froid ancien ne résistera pas à la braise de la forge." : "Ce rayon ne doit pas être arrêté : il doit revenir vers celui qui l’a lancé.",
  };
  addLog(`INDICE — ${hints[state.room]}`, "system");
}

function processCommand(rawCommand) {
  const command = normalize(rawCommand); if (!command || state.pendingDeath) return;
  if (state.flags.won && includesAny(command, ["recommencer", "rejouer", "restart"])) return resetGame();
  addLog(`> ${rawCommand.trim()}`, "command"); state.commands += 1;
  if (includesAny(command, ["aide", "help", "commandes"])) showHelp();
  else if (includesAny(command, ["indice", "hint", "conseil"])) showHint();
  else if (includesAny(command, ["inventaire", "sac", "objets"])) addLog(state.inventory.length ? `Tu portes : ${state.inventory.map((item) => ITEM_LABELS[item].toLowerCase()).join(", ")}.` : "Ton inventaire est vide.");
  else if (/^(regarder|regarde|voir|observer|lieu|r)$/.test(command)) addLog(roomDescription());
  else if (state.room === "lac" && includesAny(command, ["marcher", "avancer", "aller", "traverser"]) && includesAny(command, ["glace", "lac", "couronne"])) crossObstacle(command);
  else if (state.room === "gouffre" && includesAny(command, ["traverser", "franchir", "avancer sur", "marcher sur"])) crossObstacle(command);
  else if (/^(nord|sud|est|ouest|n|s|e|o|gauche|droite)$/.test(command) || includesAny(command, ["aller", "va ", "retourner", "fuir"])) {
    const direction = directionFrom(command); direction ? move(direction) : addLog("Dans quelle direction ? Nord, sud, est ou ouest ?");
  } else if (includesAny(command, ["examiner", "inspecter", "fouiller", "chercher", "observer"])) examine(command);
  else if (includesAny(command, ["prendre", "ramasser", "saisir"])) take(command);
  else if (includesAny(command, ["forcer", "arracher", "briser la main"]) && state.room === "crypte") forceStatue();
  else if (includesAny(command, ["allumer", "enflammer"])) command.includes("brasier") ? lightBrazier() : lightLantern();
  else if (includesAny(command, ["donner", "offrir", "payer", "poser la piece"])) payStatue();
  else if (includesAny(command, ["utiliser", "mettre", "appliquer", "brandir", "tendre", "attacher", "inserer", "enchasser", "placer"])) useItem(command);
  else if (includesAny(command, ["abaisser", "baisser", "tirer", "actionner"]) && command.includes("levier")) pullLever(command);
  else if (includesAny(command, ["ouvrir", "deverrouiller"])) openThing(command);
  else if (includesAny(command, ["traverser", "franchir"])) crossObstacle(command);
  else if (includesAny(command, ["attaquer", "frapper", "tuer", "combattre"])) attack(command);
  else if (includesAny(command, ["crier", "appeler"]) && state.room === "gouffre") { addLog("Ton cri réveille des chauves-souris de glace. Elles arrachent un fragment de chaleur.", "danger"); loseWarmth(1); }
  else if (includesAny(command, ["parler", "dire", "saluer"])) {
    if (state.room === "sanctuaire") { addLog("« Les héros parlent quand ils ont peur », ricane le sorcier. Son rayon se rapproche.", "danger"); loseWarmth(1); } else addLog("Seul ton écho te répond.");
  } else if (includesAny(command, ["fondre", "faire fondre"]) && state.room === "sanctuaire") owns("braise") ? winGame() : addLog("Faire fondre le sorcier… oui. Mais avec quoi ?");
  else addLog("La machine ne comprend pas. Essaie AIDE, ou complète l’un des raccourcis proposés.");
  renderStatus();
}

function submitCommand(command) { if (!command || !command.trim()) return; beep("key"); processCommand(command); commandInput.value = ""; if (window.matchMedia("(pointer: fine)").matches) commandInput.focus(); }
function resetGame() {
  state = initialState(); checkpoint = cloneState(state); checkpointLabel = "l’entrée"; gameLog.replaceChildren();
  if (endingDialog.open) endingDialog.close(); if (deathDialog.open) deathDialog.close(); screenEl.classList.remove("is-dead");
  addLog("MONT MORNE, HIVER 1987. Le Sorcier de Givre a enfermé le printemps sous la montagne. Les morts précédents n’ont laissé que des indices — et des pièges.", "system"); showRoom();
}
function ensureAudio() {
  if (!audioContext) { const Audio = window.AudioContext || window.webkitAudioContext; if (Audio) audioContext = new Audio(); }
  if (audioContext?.state === "suspended") audioContext.resume();
}
function tone(frequency, duration, delay = 0, type = "square", volume = 0.025) {
  if (!soundEnabled) return; ensureAudio(); if (!audioContext) return;
  const oscillator = audioContext.createOscillator(), gain = audioContext.createGain(), start = audioContext.currentTime + delay;
  oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start); gain.gain.setValueAtTime(volume, start); gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(audioContext.destination); oscillator.start(start); oscillator.stop(start + duration);
}
function beep(kind) {
  if (!soundEnabled) return; if (kind === "key") tone(165, 0.035, 0, "square", 0.012); if (kind === "move") tone(110, 0.08, 0, "triangle", 0.018);
  if (kind === "item") { tone(392, 0.08); tone(523, 0.12, 0.07); } if (kind === "success") { tone(262, 0.09); tone(392, 0.09, 0.08); tone(659, 0.16, 0.16); }
  if (kind === "danger") tone(82, 0.3, 0, "sawtooth", 0.03); if (kind === "victory") [262, 330, 392, 523].forEach((note, i) => tone(note, 0.35, i * 0.12, "square", 0.022));
}
function currentSceneKey() {
  if (state.flags.won) return "victoire"; if (state.room === "galerie") return state.flags.gateOpened ? "galerie-open" : "galerie-closed";
  if (state.room === "forge") return state.flags.brazierLit ? "forge-lit" : "forge-unlit"; if (state.room === "sanctuaire") return state.flags.shieldBroken ? "sanctuaire-broken" : "sanctuaire-shield"; return state.room;
}
function drawScene() {
  ctx.imageSmoothingEnabled = false; ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, canvas.width, canvas.height); const image = sceneImages[currentSceneKey()];
  if (image?.complete && image.naturalWidth) ctx.drawImage(image, 0, 0, canvas.width, canvas.height); else { ctx.fillStyle = "#00aaaa"; ctx.font = "8px monospace"; ctx.fillText("CHARGEMENT DE L'IMAGE...", 99, 92); }
}

commandForm.addEventListener("submit", (event) => { event.preventDefault(); submitCommand(commandInput.value); });
restartButton.addEventListener("click", resetGame); playAgainButton.addEventListener("click", resetGame); continueButton.addEventListener("click", continueFromCheckpoint); deathRestartButton.addEventListener("click", resetGame);
soundButton.addEventListener("click", () => { soundEnabled = !soundEnabled; soundButton.setAttribute("aria-pressed", String(soundEnabled)); soundButton.textContent = `Son : ${soundEnabled ? "oui" : "non"}`; if (soundEnabled) { ensureAudio(); beep("item"); } });
resetGame();
