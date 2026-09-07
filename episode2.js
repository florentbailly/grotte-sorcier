"use strict";

const canvas = document.querySelector("#sceneCanvas");
const ctx = canvas.getContext("2d");
const screenEl = document.querySelector(".screen");
const gameLog = document.querySelector("#gameLog");
const commandForm = document.querySelector("#commandForm");
const commandInput = document.querySelector("#commandInput");
const suggestionsEl = document.querySelector("#suggestions");
const inventoryEl = document.querySelector("#inventory");
const courageEl = document.querySelector("#warmth");
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
  douves: { title: "Les douves noires", index: "01 / 11" },
  corpsGarde: { title: "Corps de garde", index: "02 / 11" },
  cour: { title: "Cour des corbeaux", index: "03 / 11" },
  cuisines: { title: "Cuisines désertes", index: "04 / 11" },
  chapelle: { title: "Chapelle renversée", index: "05 / 11" },
  crypte: { title: "Crypte de l’œil noir", index: "06 / 11" },
  galerie: { title: "Galerie des portraits", index: "07 / 11" },
  bibliotheque: { title: "Bibliothèque interdite", index: "08 / 11" },
  armurerie: { title: "Armurerie maudite", index: "09 / 11" },
  trone: { title: "Salle du trône", index: "10 / 11" },
  anneaux: { title: "Chambre des trois anneaux", index: "11 / 11" },
};

const ITEM_LABELS = {
  sceau: "Sceau de cire noire",
  cape: "Cape de messager",
  cle: "Clé des cuisines",
  sel: "Poignée de sel",
  bougie: "Bougie à flamme bleue",
  cloche: "Clochette d’argent",
  oeil: "Œil d’obsidienne",
  lentille: "Lentille d’argent",
  bouclier: "Petit bouclier terni",
};

const SCENE_SOURCES = {
  "douves-fermees": "assets/e2-douves.png",
  "douves-ouvertes": "assets/e2-douves-open.png",
  corpsGarde: "assets/e2-corps-garde.png",
  cour: "assets/e2-cour.png",
  cuisines: "assets/e2-cuisines.png",
  chapelle: "assets/e2-chapelle.png",
  crypte: "assets/e2-crypte.png",
  galerie: "assets/e2-galerie.png",
  bibliotheque: "assets/e2-bibliotheque.png",
  armurerie: "assets/e2-armurerie.png",
  trone: "assets/e2-trone.png",
  anneaux: "assets/e2-chambre-anneaux.png",
};

const sceneImages = Object.fromEntries(Object.entries(SCENE_SOURCES).map(([key, source]) => {
  const image = new Image(); image.src = source;
  image.addEventListener("load", () => { if (state && currentSceneKey() === key) drawScene(); });
  return [key, image];
}));

let state;
let checkpoint;
let checkpointLabel = "les douves";
let soundEnabled = true;
let audioContext = null;
let musicTimer = null;
let musicStep = 0;

function initialState() {
  return {
    room: "douves", inventory: [], courage: 4, maxCourage: 4,
    commands: 0, deaths: 0, startedAt: Date.now(), pendingDeath: false,
    flags: {
      courierSearched: false, capeWorn: false, gateOpened: false,
      kitchenSearched: false, altarExamined: false, trapdoorOpened: false,
      wardenAsleep: false, eyeTaken: false, portraitsExamined: false,
      ravenDoorOpened: false, libraryRead: false, deskExamined: false,
      planSeen: false, secretOpened: false, grimoireRead: false,
      ringsTested: false, shieldTaken: false, won: false,
    },
  };
}

function cloneState(value) { return JSON.parse(JSON.stringify(value)); }
function saveCheckpoint(label) { checkpoint = cloneState(state); checkpoint.pendingDeath = false; checkpointLabel = label; }
function normalize(text) { return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, " ").replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim(); }
function includesAny(text, words) { return words.some((word) => text.includes(word)); }
function owns(item) { return state.inventory.includes(item); }
function addItem(item) { if (!owns(item)) state.inventory.push(item); }
function removeItem(item) { state.inventory = state.inventory.filter((current) => current !== item); }

function addLog(text, tone = "narration") {
  const entry = document.createElement("p"); entry.className = `log-entry ${tone}`; entry.textContent = text; gameLog.append(entry);
  while (gameLog.children.length > 30) gameLog.firstElementChild.remove();
  gameLog.scrollTop = gameLog.scrollHeight;
}

function roomDescription() {
  switch (state.room) {
    case "douves": return state.flags.gateOpened
      ? "Le sceau a commandé le mécanisme. Le long pont-levis relie maintenant les deux rives des douves. Le corps de garde est au nord."
      : state.flags.courierSearched
        ? "Le Château Noir se dresse au-delà des douves étroites. Le pont-levis est levé. Près du cadavre et de sa sacoche ouverte, un socle de pierre porte une empreinte ronde."
        : "Sous un ciel sans étoiles, des douves étroites encerclent le château. Un corps repose près d’un arbre mort et d’un petit socle de pierre. Le pont-levis est levé au nord.";
    case "corpsGarde": return "La herse est derrière toi. Des bannières au corbeau pendent dans le corps de garde. L’arche du nord mène à la cour ; les douves sont au sud.";
    case "cour": return "Une fontaine en forme de corbeau domine la cour. La chapelle est à l’ouest, les cuisines à l’est et la galerie des portraits au nord. Le corps de garde est au sud.";
    case "cuisines": return state.flags.kitchenSearched
      ? "Sur la table : une clé, du sel et une coupe de vin sombre. Un rat mort serre encore un grain violet entre ses dents. La cour est à l’ouest."
      : "Des chaudrons oscillent sans vent. Une coupe de vin brille sur la table, près d’un rat mort. La cour est à l’ouest.";
    case "chapelle": return state.flags.altarExamined
      ? "Sur l’autel fendu reposent une clochette et une bougie bleue. Une trappe verrouillée coupe le sol. La cour est à l’est."
      : "Les statues et les croix ont été retournées. Un autel fendu domine une trappe. Une petite lueur bleue vacille. La cour est à l’est.";
    case "crypte": return state.flags.wardenAsleep
      ? "Le gardien de pierre dort, bec contre poitrine. L’œil d’obsidienne brille entre ses griffes. La chapelle est au-dessus."
      : "Deux corbeaux de pierre encadrent un gardien aveugle. Il serre un œil d’obsidienne. Un sarcophage bardé de griffes occupe le fond. La chapelle est au-dessus.";
    case "galerie": return state.flags.ravenDoorOpened
      ? "Le portrait du grand corbeau a pivoté, ouvrant la bibliothèque à l’ouest. L’armurerie est à l’est, le trône au nord et la cour au sud."
      : "Les ancêtres du seigneur te suivent du regard. Le portrait central représente un corbeau privé d’un œil. Portes à l’est et au nord ; la cour est au sud.";
    case "bibliotheque": return state.flags.secretOpened
      ? "La lentille a révélé un passage au nord, derrière le plan du château. La galerie est à l’est. Les livres enchaînés chuchotent encore."
      : "Des livres enchaînés montent jusqu’aux voûtes. Sur un pupitre : un registre, un plan du château et une petite lentille. La galerie est à l’est.";
    case "armurerie": return "Une armure colossale garde une épée noire posée sur un socle. Un petit bouclier terni pend loin de la lame. La galerie est à l’ouest.";
    case "trone": return "Le Seigneur des Ténèbres siège sous un corbeau ailé. Ses yeux consument l’ombre. Des anneaux illusoires couvrent ses doigts. La galerie reste au sud.";
    case "anneaux": return state.flags.ringsTested
      ? "Sous la flamme bleue, l’or projette une ombre avide, le fer une ombre de chaînes — mais l’anneau d’onyx n’en projette aucune. Le passage est au sud."
      : "Trois anneaux reposent sous des rayons magiques : un cercle d’or, un anneau de fer et une bague d’onyx. Le passage est au sud.";
    default: return "Le château retient son souffle.";
  }
}

function objective() {
  if (!state.flags.gateOpened) return "Entrer dans le château sans donner l’alerte.";
  if (!state.flags.eyeTaken) return "Trouver ce qui ouvre les passages interdits.";
  if (!state.flags.secretOpened) return "Découvrir où le seigneur cache sa véritable puissance.";
  if (!state.flags.won) return "Identifier et dérober le véritable anneau.";
  return "Fuir avant l’effondrement du Château Noir.";
}

function shortcutSpecs() {
  const fill = (label, value) => ({ label, fill: value });
  const run = (label, command = label) => ({ label, command });
  const inspect = fill("Examiner…", "examiner "), take = fill("Prendre…", "prendre "), use = fill("Utiliser…", "utiliser ");
  const map = {
    douves: [inspect, take, use, run("Nord")], corpsGarde: [inspect, use, run("Nord"), run("Sud")],
    cour: [inspect, run("Nord"), run("Est"), run("Ouest")], cuisines: [inspect, take, fill("Boire…", "boire "), run("Ouest")],
    chapelle: [inspect, take, use, run("Est")], crypte: [inspect, use, take, run("Monter")],
    galerie: [inspect, use, run("Nord"), run("Est")], bibliotheque: [inspect, take, use, run("Est")],
    armurerie: [inspect, take, use, run("Ouest")], trone: [inspect, fill("Parler…", "parler "), fill("Attaquer…", "attaquer "), run("Sud")],
    anneaux: [inspect, use, take, run("Sud")],
  };
  return map[state.room] || [run("Regarder"), inspect, run("Inventaire"), run("Indice")];
}

function renderStatus() {
  const room = ROOMS[state.room]; roomNameEl.textContent = room.title; roomIndexEl.textContent = room.index; objectiveEl.textContent = objective();
  moveCounterEl.textContent = `${state.commands} commande${state.commands > 1 ? "s" : ""} · ${state.deaths} mort${state.deaths > 1 ? "s" : ""}`;
  inventoryEl.replaceChildren();
  if (!state.inventory.length) { const empty = document.createElement("li"); empty.className = "empty"; empty.textContent = "Rien pour l’instant"; inventoryEl.append(empty); }
  else state.inventory.forEach((item) => { const li = document.createElement("li"); li.textContent = ITEM_LABELS[item]; inventoryEl.append(li); });
  courageEl.replaceChildren();
  for (let i = 0; i < state.maxCourage; i += 1) { const pip = document.createElement("span"); if (i >= state.courage) pip.className = "empty"; courageEl.append(pip); }
  courageEl.setAttribute("aria-label", `Courage : ${state.courage} sur ${state.maxCourage}`);
  suggestionsEl.replaceChildren();
  shortcutSpecs().forEach((spec) => {
    const button = document.createElement("button"); button.type = "button"; button.textContent = spec.label;
    button.addEventListener("click", () => { if (spec.fill !== undefined) { commandInput.value = spec.fill; commandInput.focus(); commandInput.setSelectionRange(spec.fill.length, spec.fill.length); } else submitCommand(spec.command); });
    suggestionsEl.append(button);
  });
  drawScene();
}

function showRoom() { addLog(ROOMS[state.room].title.toUpperCase(), "system"); addLog(roomDescription()); renderStatus(); beep("move"); }
function directionFrom(command) {
  if (/\b(nord|n)\b/.test(command)) return "nord"; if (/\b(sud|s)\b/.test(command)) return "sud";
  if (/\b(est|e|droite)\b/.test(command)) return "est"; if (/\b(ouest|o|gauche)\b/.test(command)) return "ouest";
  if (includesAny(command, ["descendre", "bas", "trappe"])) return "bas"; if (includesAny(command, ["monter", "haut"])) return "haut"; return null;
}

function move(direction) {
  if (state.room === "douves" && direction === "nord" && !state.flags.gateOpened) return addLog("Le pont-levis ne répond pas. Il faut convaincre le mécanisme que tu es attendu.", "danger");
  if (state.room === "corpsGarde" && direction === "nord" && !state.flags.capeWorn) return killPlayer("Le visage de trop", "Les meurtrières s’ouvrent. Les gardes ne reconnaissent pas l’uniforme des messagers sur tes épaules — car tu ne le portes pas.");
  if (state.room === "chapelle" && direction === "bas" && !state.flags.trapdoorOpened) return addLog("La trappe est verrouillée.", "danger");
  if (state.room === "galerie" && direction === "ouest" && !state.flags.ravenDoorOpened) return addLog("Le mur derrière le portrait ne présente aucune ouverture visible.");
  if (state.room === "bibliotheque" && direction === "nord" && !state.flags.secretOpened) return addLog("Le plan couvre un mur parfaitement lisse.");
  const routes = {
    douves: { nord: "corpsGarde" }, corpsGarde: { sud: "douves", nord: "cour" },
    cour: { sud: "corpsGarde", ouest: "chapelle", est: "cuisines", nord: "galerie" },
    cuisines: { ouest: "cour" }, chapelle: { est: "cour", bas: "crypte" }, crypte: { haut: "chapelle" },
    galerie: { sud: "cour", ouest: "bibliotheque", est: "armurerie", nord: "trone" },
    bibliotheque: { est: "galerie", nord: "anneaux" }, armurerie: { ouest: "galerie" },
    trone: { sud: "galerie" }, anneaux: { sud: "bibliotheque" },
  };
  const destination = routes[state.room]?.[direction]; if (!destination) return addLog("Aucun passage dans cette direction.");
  state.room = destination; showRoom();
}

function examine(command) {
  if (state.room === "douves" && includesAny(command, ["corps", "cadavre", "messager", "sacoche"])) {
    state.flags.courierSearched = true; addLog("Le messager porte une cape au corbeau. Dans sa sacoche : un sceau de cire noire. Sa dernière note dit : « Les serviteurs de nuit n’offrent jamais leur visage. »", "reward");
  } else if (state.room === "douves" && includesAny(command, ["pont", "porte", "chateau", "socle", "piedestal", "empreinte", "rive"])) addLog("Sur la rive, le socle présente une empreinte ronde de la taille d’un sceau. Il est relié par une chaîne au mécanisme du pont-levis. L’eau paraît calme — beaucoup trop calme.");
  else if (state.room === "corpsGarde" && includesAny(command, ["banniere", "registre", "mur", "herse"])) addLog("Un registre confirme que seuls les messagers masqués traversent la cour après minuit.");
  else if (state.room === "cour" && includesAny(command, ["fontaine", "corbeau", "bassin"])) addLog("Une gemme violette brille dans le bec du corbeau. Au fond du bassin, plusieurs mains pétrifiées tendent encore les doigts.", "danger");
  else if (state.room === "cuisines" && includesAny(command, ["table", "rat", "coupe", "cuisine", "cle"])) {
    state.flags.kitchenSearched = true; addLog("Le rat a goûté le vin avant de mourir. Une clé étiquetée d’un symbole de chapelle repose près d’un tas de sel.", "reward");
  } else if (state.room === "chapelle" && includesAny(command, ["autel", "statue", "bougie", "cloche", "trappe", "chapelle"])) {
    state.flags.altarExamined = true; addLog("Gravé sous l’autel : « Sa puissance n’a ni l’éclat de l’or ni le poids du fer. » La clochette porte des silhouettes de corbeaux endormis.", "reward");
  } else if (state.room === "crypte" && includesAny(command, ["gardien", "corbeau", "oeil", "statue"])) addLog(state.flags.wardenAsleep ? "Le gardien dort. Ses griffes se sont desserrées autour de l’œil." : "Les yeux du gardien sont sculptés fermés, mais son bec est creusé comme une immense oreille. La cloche gravée sur son socle est barrée d’un trait.");
  else if (state.room === "crypte" && includesAny(command, ["sarcophage", "tombe", "cercueil"])) addLog("Les griffes du couvercle sont articulées. Une inscription promet « l’arme qui tue tout seigneur ». C’est précisément le genre de promesse qui nourrit les tombeaux.", "danger");
  else if (state.room === "galerie" && includesAny(command, ["portrait", "tableau", "corbeau", "oeil", "mur"])) {
    state.flags.portraitsExamined = true; addLog("Tous les portraits ont deux yeux, sauf le grand corbeau. Son orbite vide est polie par d’anciennes manipulations.", "reward");
  } else if (state.room === "bibliotheque" && includesAny(command, ["registre", "livre", "rayon", "anneau"])) {
    state.flags.libraryRead = true; addLog("Le registre des enchanteurs dit : « L’or convoite. Le fer enchaîne. La puissance véritable boit la lumière bleue et ne laisse aucune ombre. »", "reward");
  } else if (state.room === "bibliotheque" && includesAny(command, ["pupitre", "bureau", "lentille"])) {
    state.flags.deskExamined = true; addLog("Une lentille d’argent repose sur un livre d’architecture. Ses bords correspondent aux cercles dessinés sur le plan.", "reward");
  } else if (state.room === "bibliotheque" && includesAny(command, ["plan", "carte", "mur", "passage"])) {
    state.flags.planSeen = true; addLog("Le plan montre une salle ronde derrière ce mur, mais aucune porte. Trois cercles argentés sont tracés dans un angle.", "reward");
  } else if (state.room === "armurerie" && includesAny(command, ["epee", "lame", "socle"])) addLog("La lame est magnifique. À ses pieds, les bottes vides de ceux qui l’ont saisie sont fondues dans la pierre.", "danger");
  else if (state.room === "armurerie" && includesAny(command, ["armure", "sentinelle", "bouclier"])) addLog("L’armure suit chacun de tes gestes. Le petit bouclier, lui, ne porte aucun enchantement visible.");
  else if (state.room === "trone" && includesAny(command, ["seigneur", "main", "anneau", "trone"])) addLog("Les anneaux de ses doigts traversent parfois la chair : des illusions. Son ombre, elle, s’enfonce vers les profondeurs situées derrière la bibliothèque.", "reward");
  else if (state.room === "anneaux" && includesAny(command, ["anneau", "bague", "or", "fer", "onyx", "socle", "rayon"])) addLog(state.flags.ringsTested ? roomDescription() : "Les trois anneaux semblent également anciens. Les rayons empêchent d’approcher les socles. Une niche vide a exactement la taille d’une bougie.");
  else addLog(roomDescription());
}

function take(command) {
  if (command.includes("tout")) return addLog("Dans ce château, tout prendre revient à choisir tous les pièges à la fois.");
  if (includesAny(command, ["sceau", "cire"])) {
    if (state.room !== "douves" || !state.flags.courierSearched) return addLog("Tu ne vois aucun sceau ici."); if (owns("sceau")) return addLog("Tu as déjà le sceau."); addItem("sceau"); addLog("Tu prends le sceau de cire noire.", "reward");
  } else if (includesAny(command, ["cape", "manteau", "capuche"])) {
    if (state.room !== "douves" || !state.flags.courierSearched) return addLog("Tu ne vois aucune cape ici."); if (owns("cape")) return addLog("Tu portes déjà la cape avec toi."); addItem("cape"); addLog("Tu récupères la cape du messager.", "reward");
  } else if (includesAny(command, ["cle", "clef"])) {
    if (state.room !== "cuisines" || !state.flags.kitchenSearched) return addLog("Tu ne vois aucune clé."); if (owns("cle")) return addLog("Tu as déjà la clé."); addItem("cle"); addLog("Tu prends la clé marquée du symbole de la chapelle.", "reward");
  } else if (command.includes("sel")) {
    if (state.room !== "cuisines" || !state.flags.kitchenSearched) return addLog("Tu ne vois pas de sel utilisable."); if (owns("sel")) return addLog("Tu as déjà assez de sel."); addItem("sel"); addLog("Tu prends une poignée de sel. Les superstitions survivent parfois parce qu’elles sont vraies.", "reward");
  } else if (includesAny(command, ["bougie", "chandelle", "flamme"])) {
    if (state.room !== "chapelle" || !state.flags.altarExamined) return addLog("Tu ne peux pas la prendre ainsi."); if (owns("bougie")) return addLog("Tu as déjà la bougie."); addItem("bougie"); addLog("Tu prends la bougie. Sa flamme bleue ne vacille pas.", "reward");
  } else if (includesAny(command, ["cloche", "clochette"])) {
    if (state.room !== "chapelle" || !state.flags.altarExamined) return addLog("Tu ne vois aucune clochette à prendre."); if (owns("cloche")) return addLog("Tu as déjà la clochette."); addItem("cloche"); addLog("Tu prends la clochette d’argent.", "reward");
  } else if (includesAny(command, ["oeil", "obsidienne"])) {
    if (state.room !== "crypte") return addLog("Tu ne vois aucun œil d’obsidienne ici."); if (!state.flags.wardenAsleep) return killPlayer("Les griffes de pierre", "À peine touches-tu la relique que le gardien se referme sur toi. Sa dernière victime devient sa nouvelle statue."); if (owns("oeil")) return addLog("Tu as déjà l’œil."); addItem("oeil"); state.flags.eyeTaken = true; addLog("Tu retires l’œil d’obsidienne. Les murs de la crypte expirent.", "reward"); saveCheckpoint("la crypte apaisée");
  } else if (includesAny(command, ["lentille", "monocle", "loupe"])) {
    if (state.room !== "bibliotheque" || !state.flags.deskExamined) return addLog("Tu ne vois aucune lentille à prendre."); if (owns("lentille")) return addLog("Tu as déjà la lentille."); addItem("lentille"); addLog("Tu prends la lentille d’argent.", "reward");
  } else if (command.includes("bouclier")) {
    if (state.room !== "armurerie") return addLog("Tu ne vois aucun bouclier ici."); if (owns("bouclier")) return addLog("Tu as déjà le bouclier."); addItem("bouclier"); state.flags.shieldTaken = true; state.maxCourage = 5; state.courage = Math.min(5, state.courage + 1); addLog("Le bouclier n’est pas magique, mais son poids rassurant augmente ton courage.", "reward");
  } else if (includesAny(command, ["epee", "lame", "arme"]) && state.room === "armurerie") return killPlayer("L’épée qui choisit son maître", "Tes doigts se ferment sur la garde. L’armure colossale s’anime et te cloue au mur d’un seul coup.");
  else if (includesAny(command, ["gemme", "pierre", "joyau"]) && state.room === "cour") return killPlayer("La fontaine pétrifiante", "La gemme ouvre un œil. Ta peau devient pierre avant même que tu puisses lâcher le bec du corbeau.");
  else if (state.room === "anneaux" && includesAny(command, ["anneau", "bague", "or", "fer", "onyx"])) return takeRing(command);
  else return addLog("Tu ne peux pas prendre cela.");
  beep("item"); renderStatus();
}

function takeRing(command) {
  if (includesAny(command, ["or", "dore", "gold"])) return killPlayer("L’anneau de convoitise", "L’or se liquéfie autour de ta main puis remonte jusqu’à ton cœur. Le château vient de gagner un gardien de plus.");
  if (includesAny(command, ["fer", "iron"])) return killPlayer("L’anneau des chaînes", "Les chaînes des murs s’éveillent et serrent chaque membre. Le Seigneur des Ténèbres rit à travers la pierre.");
  if (!includesAny(command, ["onyx", "noir", "ombre"])) return addLog("Lequel : l’anneau d’or, de fer ou d’onyx ?");
  if (!state.flags.libraryRead) return killPlayer("Le choix sans savoir", "Tu tends la main sans connaître le serment des anneaux. Les trois rayons se rejoignent et effacent jusqu’à ton ombre.");
  if (!state.flags.ringsTested) return addLog("Le rayon repousse ta main. Il faut d’abord éprouver les anneaux sous la lumière qui leur est destinée.", "danger");
  state.flags.won = true; window.ChroniclesInventory?.add("anneau_ombres"); addLog("Tu saisis l’onyx. Le rayon s’éteint. Au-dessus de toi, le Seigneur pousse un cri tandis que le château se lézarde. Sa puissance tient désormais dans ta paume.", "reward"); beep("victory"); renderStatus();
  const elapsed = Math.max(1, Math.round((Date.now() - state.startedAt) / 60000));
  endingText.textContent = `Tu as dérobé l’Anneau des Ombres en ${state.commands} commandes, après ${state.deaths} mort${state.deaths > 1 ? "s" : ""}, et environ ${elapsed} minute${elapsed > 1 ? "s" : ""}. Privé de sa puissance, le Seigneur des Ténèbres disparaît avec son château.`;
  window.setTimeout(() => endingDialog.showModal(), 8000);
}

function useItem(command) {
  const seal = command.includes("sceau"), cape = includesAny(command, ["cape", "manteau", "capuche"]), key = includesAny(command, ["cle", "clef"]);
  const bell = includesAny(command, ["cloche", "clochette"]), eye = includesAny(command, ["oeil", "obsidienne"]), lens = includesAny(command, ["lentille", "loupe", "monocle"]), candle = includesAny(command, ["bougie", "chandelle", "flamme"]), salt = command.includes("sel");
  if (cape) {
    if (!owns("cape")) return addLog("Tu n’as pas de cape."); state.flags.capeWorn = true; addLog("Tu enfiles la cape et rabats profondément la capuche. Ton visage disparaît.", "reward"); beep("success"); return;
  }
  if (seal && state.room === "douves" && includesAny(command, ["porte", "pont", "mecanisme", "plaque", "socle", "piedestal", "empreinte", "rive"])) {
    if (!owns("sceau")) return addLog("Tu ne possèdes aucun sceau."); state.flags.gateOpened = true; addLog("La cire noire s’enfonce dans la plaque. Le pont-levis descend sans un bruit.", "reward"); saveCheckpoint("le pont-levis"); beep("success"); return;
  }
  if (key && state.room === "chapelle" && includesAny(command, ["trappe", "serrure", "sol"])) {
    if (!owns("cle")) return addLog("Tu n’as pas de clé adaptée."); state.flags.trapdoorOpened = true; addLog("La clé tourne. La trappe découvre un escalier qui s’enfonce sous l’autel.", "reward"); beep("success"); return;
  }
  if (bell && state.room === "crypte" && includesAny(command, ["gardien", "corbeau", "statue"])) {
    if (!owns("cloche")) return addLog("Tu n’as aucune clochette."); state.flags.wardenAsleep = true; addLog("Une note claire traverse la crypte. Le gardien pousse un soupir minéral et replie ses griffes.", "reward"); beep("success"); return;
  }
  if (eye && state.room === "galerie" && includesAny(command, ["portrait", "corbeau", "orbite", "tableau"])) {
    if (!owns("oeil")) return addLog("Tu ne possèdes pas l’objet attendu par cette orbite."); state.flags.ravenDoorOpened = true; addLog("L’œil s’emboîte. Le portrait pivote et révèle la bibliothèque à l’ouest.", "reward"); beep("success"); return;
  }
  if (lens && state.room === "bibliotheque" && includesAny(command, ["plan", "carte", "mur", "cercle"])) {
    if (!owns("lentille")) return addLog("Tu n’as aucune lentille."); if (!state.flags.planSeen) return addLog("Tu ne sais pas encore où poser la lentille."); state.flags.secretOpened = true; addLog("À travers la lentille, les trois cercles s’alignent. Le plan devient transparent et le mur s’ouvre sur une salle ronde.", "reward"); saveCheckpoint("la bibliothèque interdite"); beep("success"); return;
  }
  if (candle && state.room === "anneaux" && includesAny(command, ["anneau", "bague", "onyx", "socle", "niche", "rayon"])) {
    if (!owns("bougie")) return addLog("Tu n’as aucune flamme bleue."); state.flags.ringsTested = true; addLog("Tu places la bougie dans la niche. L’or projette une main avide, le fer des chaînes. L’onyx absorbe la flamme et ne laisse aucune ombre.", "reward"); beep("success"); return;
  }
  if (salt && state.room === "armurerie" && includesAny(command, ["armure", "sentinelle"])) {
    if (!owns("sel")) return addLog("Tu n’as pas de sel."); removeItem("sel"); addLog("Le sel fait grincer l’armure, qui recule un instant. Elle ne gardait pourtant rien dont tu aies besoin.", "reward"); return;
  }
  addLog("Précise l’objet et sa cible. Exemple : UTILISER LA CLÉ SUR LA TRAPPE.");
}

function openThing(command) {
  if (state.room === "chapelle" && command.includes("trappe")) return useItem("utiliser cle sur trappe");
  if (state.room === "crypte" && includesAny(command, ["sarcophage", "tombe"])) return killPlayer("Le héros du sarcophage", "Le couvercle s’ouvre de lui-même. Les griffes t’entraînent auprès du prétendu héros qui n’a jamais existé.");
  if (state.room === "douves" && includesAny(command, ["porte", "pont"])) return addLog("Le mécanisme attend un signe d’autorité, pas de la force.");
  addLog("Cela ne s’ouvre pas ainsi.");
}

function drink(command) {
  if (state.room === "cuisines" && includesAny(command, ["vin", "coupe", "boire"])) return killPlayer("Le dernier cru", "Le vin a un goût de mûre et de métal. Comme le rat, tu n’atteins pas la porte.");
  addLog("Tu préfères garder l’esprit clair.");
}

function confront(command) {
  if (state.room !== "trone") return addLog("Ton geste belliqueux ne rencontre que la pierre.");
  if (owns("bouclier")) { removeItem("bouclier"); state.maxCourage = 4; state.courage = Math.min(state.courage, 4); addLog("Le rayon pulvérise ton bouclier. Tu roules jusqu’à la porte : tu as survécu, mais le prochain geste sera le dernier.", "danger"); state.room = "galerie"; showRoom(); return; }
  killPlayer("Le regard du Seigneur", "Tu fais un pas vers le trône. Le Seigneur lève un doigt ; ton ombre t’étrangle avant que ton arme ne quitte son fourreau.");
}

function loseCourage(amount) {
  state.courage = Math.max(0, state.courage - amount); beep("danger");
  if (!state.courage) killPlayer("La peur sans visage", "Le château entre dans tes pensées. Tu oublies ton nom, ta mission, puis jusqu’à la raison de continuer à respirer.");
}
function killPlayer(title, text) {
  if (state.pendingDeath) return; state.pendingDeath = true; state.deaths += 1; deathTitle.textContent = title; deathText.textContent = text; screenEl.classList.add("is-dead"); renderStatus(); beep("danger"); window.setTimeout(() => deathDialog.showModal(), 8000);
}
function continueFromCheckpoint() {
  const meta = { commands: state.commands, deaths: state.deaths, startedAt: state.startedAt };
  state = cloneState(checkpoint); state.commands = meta.commands; state.deaths = meta.deaths; state.startedAt = meta.startedAt; state.pendingDeath = false; state.courage = state.maxCourage;
  deathDialog.close(); screenEl.classList.remove("is-dead"); gameLog.replaceChildren(); addLog(`Le temps se déchire. Tu reprends conscience près de ${checkpointLabel}. Le souvenir du piège demeure.`, "system"); showRoom();
}

function showHelp() { addLog("Commandes : REGARDER, EXAMINER [objet], PRENDRE [objet], UTILISER [objet] SUR [cible], PORTER [objet], OUVRIR [objet], ALLER NORD/SUD/EST/OUEST, MONTER, DESCENDRE, INVENTAIRE, INDICE.", "system"); }
function showHint() {
  const hints = {
    douves: "Les morts peuvent encore porter les autorisations des vivants.", corpsGarde: "Ici, le vêtement compte davantage que le visage.",
    cour: "Les ailes ouest et est sont moins glorieuses — donc probablement plus utiles.", cuisines: "Observe qui a goûté le vin. La clé porte sa destination.",
    chapelle: "Lis l’autel avant de descendre. Emporte ce qui produit lumière et son.", crypte: "Le gardien n’a pas d’yeux, mais il possède une oreille.",
    galerie: "Le portrait incomplet attend peut-être ce que gardait la crypte.", bibliotheque: "Le registre identifie l’anneau ; le plan et la lentille indiquent comment l’atteindre.",
    armurerie: "Une arme trop belle au milieu de bottes fondues est rarement un cadeau.", trone: "Le vaincre n’est pas ta mission. Sa propre ombre montre où chercher.",
    anneaux: "Croise le registre, l’inscription de la chapelle et l’épreuve de la flamme bleue.",
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
  else if (state.room === "douves" && includesAny(command, ["nager", "traverser douves", "entrer eau", "sauter eau"])) killPlayer("Ce qui vit sous l’eau", "Tu nages trois brasses. Quelque chose saisit tes chevilles et t’entraîne sous le reflet du château.");
  else if (/^(nord|sud|est|ouest|n|s|e|o|gauche|droite|monter|descendre)$/.test(command) || includesAny(command, ["aller", "retourner", "fuir", "monter", "descendre"])) { const direction = directionFrom(command); direction ? move(direction) : addLog("Dans quelle direction ?"); }
  else if (state.room === "bibliotheque" && includesAny(command, ["grimoire", "livre noir"])) { if (state.flags.grimoireRead) killPlayer("Le livre qui lit son lecteur", "Cette fois, le grimoire achève la phrase avec ton propre nom. Les pages se referment sur ta pensée."); else { state.flags.grimoireRead = true; addLog("Le grimoire lit à haute voix un souvenir que tu n’as jamais raconté. Tu le refermes en perdant deux fragments de courage.", "danger"); loseCourage(2); } }
  else if (includesAny(command, ["examiner", "inspecter", "fouiller", "chercher", "observer", "lire"])) examine(command);
  else if (includesAny(command, ["prendre", "ramasser", "saisir", "derober", "voler"])) take(command);
  else if (includesAny(command, ["porter", "mettre", "enfiler"]) && includesAny(command, ["cape", "manteau", "capuche"])) useItem(command);
  else if (includesAny(command, ["utiliser", "mettre", "appliquer", "sonner", "agiter", "placer", "inserer", "regarder avec"])) useItem(command);
  else if (includesAny(command, ["ouvrir", "soulever"])) openThing(command);
  else if (includesAny(command, ["boire", "gouter", "avaler"])) drink(command);
  else if (includesAny(command, ["attaquer", "frapper", "tuer", "combattre", "approcher", "s agenouiller", "parler", "saluer"])) confront(command);
  else addLog("La machine ne comprend pas. Essaie AIDE ou complète l’un des raccourcis proposés.");
  renderStatus();
}

function submitCommand(command) { if (!command || !command.trim()) return; beep("key"); processCommand(command); commandInput.value = ""; if (window.matchMedia("(pointer: fine)").matches) commandInput.focus(); }
function resetGame() {
  state = initialState(); checkpoint = cloneState(state); checkpointLabel = "les douves"; gameLog.replaceChildren();
  if (endingDialog.open) endingDialog.close(); if (deathDialog.open) deathDialog.close(); screenEl.classList.remove("is-dead");
  addLog("COMTÉ DE RAVENNE, AUTOMNE 1988. Après la chute du Sorcier de Givre, une ombre a englouti l’est. Le Seigneur des Ténèbres tire sa puissance d’un anneau caché dans son château. Ta mission n’est pas de le vaincre : entre, vole l’anneau et ressors vivant.", "system"); showRoom();
}

async function ensureAudio() { if (!audioContext) { const Audio = window.AudioContext || window.webkitAudioContext; if (Audio) audioContext = new Audio(); } if (audioContext?.state === "suspended") { try { await audioContext.resume(); } catch { /* une nouvelle interaction pourra relancer l’audio */ } } return audioContext; }
function tone(frequency, duration, delay = 0, type = "square", volume = 0.02) {
  if (!soundEnabled) return; ensureAudio(); if (!audioContext) return;
  const oscillator = audioContext.createOscillator(), gain = audioContext.createGain(), start = audioContext.currentTime + delay;
  oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start); gain.gain.setValueAtTime(volume, start); gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(audioContext.destination); oscillator.start(start); oscillator.stop(start + duration);
}
function beep(kind) {
  if (!soundEnabled) return; if (kind === "key") tone(147, 0.035, 0, "square", 0.01); if (kind === "move") tone(98, 0.07, 0, "triangle", 0.012);
  if (kind === "item") { tone(330, 0.07); tone(494, 0.11, 0.06); } if (kind === "success") { tone(220, 0.08); tone(330, 0.08, 0.08); tone(587, 0.14, 0.16); }
  if (kind === "danger") tone(73, 0.32, 0, "sawtooth", 0.025); if (kind === "victory") [220, 277, 330, 440, 554].forEach((note, i) => tone(note, 0.32, i * 0.11, "square", 0.018));
}

const MUSIC = {
  outside: [41, null, 42, null, 41, 47, null, 40, 41, null, 46, 42, null, 35, 40, null],
  castle: [41, 42, 48, 47, 41, 46, 42, null, 40, 41, 47, 46, 40, 45, 41, null],
  sacred: [38, null, 39, 45, 44, null, 38, 51, 50, null, 44, 45, 39, 38, 32, null],
  danger: [35, 36, 42, 41, 35, 48, 47, 36, 35, 41, 42, 48, 47, 41, 36, null],
  vault: [33, 34, 40, 39, 45, 44, 34, null, 33, 46, 45, 39, 40, 34, 33, null],
};
function midiToHz(note) { return 440 * (2 ** ((note - 69) / 12)); }
function musicPattern() {
  if (state.room === "douves") return MUSIC.outside;
  if (includesAny(state.room, ["chapelle", "crypte"])) return MUSIC.sacred;
  if (includesAny(state.room, ["armurerie", "trone"])) return MUSIC.danger;
  if (state.room === "anneaux") return MUSIC.vault;
  return MUSIC.castle;
}
function musicTick() {
  if (!soundEnabled || !audioContext || state.pendingDeath || state.flags.won) return;
  const pattern = musicPattern(), note = pattern[musicStep % pattern.length];
  if (note) tone(midiToHz(note), 0.3, 0, musicStep % 4 === 0 ? "square" : "triangle", 0.006);
  if (musicStep % 4 === 0) tone(midiToHz((note || 41) - 12), 0.88, 0, "sawtooth", 0.0038);
  if (note && musicStep % 8 === 6) tone(midiToHz(note + 13), 0.34, 0.035, "square", 0.0028);
  if (musicStep % 16 === 15) tone(midiToHz(30), 1.15, 0, "triangle", 0.005);
  musicStep += 1;
}
function startMusic() { stopMusic(); ensureAudio(); musicStep = 0; musicTick(); musicTimer = window.setInterval(musicTick, 300); }
function stopMusic() { if (musicTimer !== null) window.clearInterval(musicTimer); musicTimer = null; }
async function activateDefaultAudio() { if (!soundEnabled) return; await ensureAudio(); if (soundEnabled && musicTimer === null) startMusic(); }
function currentSceneKey() { return state.room === "douves" ? (state.flags.gateOpened ? "douves-ouvertes" : "douves-fermees") : state.room; }
function drawScene() {
  ctx.imageSmoothingEnabled = false; ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, canvas.width, canvas.height); const image = sceneImages[currentSceneKey()];
  if (image?.complete && image.naturalWidth) ctx.drawImage(image, 0, 0, canvas.width, canvas.height); else { ctx.fillStyle = "#00aaaa"; ctx.font = "8px monospace"; ctx.fillText("CHARGEMENT DE L'IMAGE...", 99, 92); }
  if (state.flags.won) { ctx.fillStyle = "rgba(170,0,170,0.35)"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "#ffffff"; ctx.font = "bold 10px monospace"; ctx.fillText("L'ANNEAU EST À TOI", 101, 94); }
}

commandForm.addEventListener("submit", (event) => { event.preventDefault(); submitCommand(commandInput.value); });
restartButton.addEventListener("click", resetGame); playAgainButton.addEventListener("click", resetGame); continueButton.addEventListener("click", continueFromCheckpoint); deathRestartButton.addEventListener("click", resetGame);
document.addEventListener("pointerdown", activateDefaultAudio, { once: true, capture: true });
document.addEventListener("keydown", activateDefaultAudio, { once: true, capture: true });
soundButton.addEventListener("click", async () => { soundEnabled = !soundEnabled; soundButton.setAttribute("aria-pressed", String(soundEnabled)); soundButton.textContent = `Son + musique : ${soundEnabled ? "oui" : "non"}`; if (soundEnabled) { await ensureAudio(); if (!soundEnabled) return; beep("item"); startMusic(); } else stopMusic(); });
resetGame();
