"use strict";

const $ = (selector) => document.querySelector(selector);
const canvas = $("#sceneCanvas");
const ctx = canvas.getContext("2d");
const screenEl = $(".screen");
const gameLog = $("#gameLog");
const commandForm = $("#commandForm");
const commandInput = $("#commandInput");
const suggestionsEl = $("#suggestions");
const inventoryEl = $("#inventory");
const courageEl = $("#warmth");
const objectiveEl = $("#objective");
const roomNameEl = $("#roomName");
const roomIndexEl = $("#roomIndex");
const moveCounterEl = $("#moveCounter");
const restartButton = $("#restartButton");
const soundButton = $("#soundButton");
const endingDialog = $("#endingDialog");
const endingText = $("#endingText");
const playAgainButton = $("#playAgainButton");
const deathDialog = $("#deathDialog");
const deathTitle = $("#deathTitle");
const deathText = $("#deathText");
const continueButton = $("#continueButton");
const deathRestartButton = $("#deathRestartButton");

const ROOMS = {
  lisiere: { title: "La lisière orientale", index: "01 / 09", panel: 0 },
  carrefour: { title: "Le carrefour qui murmure", index: "02 / 09", panel: 1 },
  cabane: { title: "La cabane du forestier", index: "03 / 09", panel: 2 },
  ravin: { title: "Le ravin des tisseuses", index: "04 / 09", panel: 3 },
  marais: { title: "Le marais aux feux pâles", index: "05 / 09", panel: 4 },
  cercle: { title: "Le cercle des neuf pierres", index: "06 / 09", panel: 5 },
  antre: { title: "L’antre des serpents", index: "07 / 09", panel: 6 },
  sanctuaire: { title: "Le sanctuaire des racines", index: "08 / 09", panel: 7 },
  coeur: { title: "Le cœur sans lumière", index: "09 / 09", panel: 8 },
};

const ITEM_LABELS = {
  journal: "Journal du forestier", fiole: "Fiole vide", rosee: "Rosée d’argent",
  miroir: "Éclat de miroir lunaire", roseau: "Flûte de roseau", epee: "Épée de l’Aube Muette",
  amulette: "Amulette d’os gravée", cloche: "Cloche de bronze",
};

const forestSheet = new Image();
forestSheet.src = "assets/e3-forest-sheet.png";
forestSheet.addEventListener("load", drawScene);

let state;
let checkpoint;
let checkpointLabel = "la lisière";
let soundEnabled = true;
let audioContext = null;
let musicTimer = null;
let musicStep = 0;

function initialState() {
  return {
    room: "lisiere", inventory: [], courage: 4, maxCourage: 4,
    commands: 0, deaths: 0, startedAt: Date.now(), pendingDeath: false,
    flags: {
      tracksSeen: false, cabinSearched: false, journalRead: false, vialFilled: false,
      mirrorTaken: false, fluteMade: false, stonesRead: false, swordFreed: false,
      spiderDead: false, cocoonSearched: false, snakesGone: false, bellRung: false,
      pathOpened: false, wrongNames: 0, won: false,
    },
  };
}

function cloneState(value) { return JSON.parse(JSON.stringify(value)); }
function saveCheckpoint(label) { checkpoint = cloneState(state); checkpoint.pendingDeath = false; checkpointLabel = label; }
function normalize(text) { return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, " ").replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim(); }
function includesAny(text, words) { return words.some((word) => text.includes(word)); }
function owns(item) { return state.inventory.includes(item); }
function addItem(item) { if (!owns(item)) state.inventory.push(item); }
function removeItem(item) { state.inventory = state.inventory.filter((value) => value !== item); }

function addLog(text, tone = "narration") {
  const entry = document.createElement("p"); entry.className = `log-entry ${tone}`; entry.textContent = text; gameLog.append(entry);
  while (gameLog.children.length > 32) gameLog.firstElementChild.remove();
  gameLog.scrollTop = gameLog.scrollHeight;
}

function roomDescription() {
  switch (state.room) {
    case "lisiere": return "À l’est du village, midi ressemble à minuit. Les branches forment une arche noire. Des traces humaines s’arrêtent devant la première racine ; le chemin continue au nord.";
    case "carrefour": return "Trois sentiers s’enfoncent entre des troncs dont les nœuds ressemblent à des yeux. La silhouette d’une cabane penchée se dessine au bout du chemin de l’est, tandis qu’un ravin bleuit à l’ouest et que des eaux immobiles luisent au nord. La lisière est au sud.";
    case "cabane": return state.flags.cabinSearched ? "La cabane a été fouillée. Le journal repose près d’une fiole et d’une tablette portant de faux noms. Le carrefour est à l’est." : "La porte pend à un gond. Un foyer froid, un coffre ouvert et une table couverte de griffures occupent la cabane. Le carrefour est à l’est.";
    case "ravin": return state.flags.spiderDead ? "La tisseuse gît sous les fils tranchés. Un cocon ancien pend encore au-dessus du ravin. Le carrefour est à l’ouest." : "Une toile immense barre le ravin. Huit pattes se déplacent derrière elle, lentes comme les aiguilles d’une horloge. Le carrefour est à l’ouest.";
    case "marais": return "Des pierres émergent d’une eau noire. Des roseaux argentés tremblent sans vent. Un éclat de miroir repose sur une stèle noyée. Le carrefour est au sud ; le cercle de pierres se devine au nord.";
    case "cercle": return state.flags.pathOpened ? "Les neuf pierres murmurent deux lettres révélées par le miroir. Un passage de racines s’ouvre à l’ouest vers le sanctuaire ; les serpents sifflent à l’est et l’Ombre attend au nord. Le marais est au sud." : "Neuf pierres elfiques encerclent une dalle noire. Les runes ont été grattées, mais la pierre centrale reflète une lune invisible. Le marais est au sud ; des racines ferment l’ouest, des sifflements viennent de l’est et une obscurité compacte règne au nord.";
    case "antre": return state.flags.snakesGone ? "Les serpents ne gardent plus le tertre. Une cloche de bronze pend à une branche basse. Le cercle est à l’ouest." : "Des dizaines de serpents encerclent une cloche de bronze. Leurs têtes se tournent ensemble vers toi. Le cercle est à l’ouest.";
    case "sanctuaire": return state.flags.swordFreed ? "Les racines desséchées ont libéré le socle. L’emplacement de l’épée est vide. Le cercle est à l’est." : "Une épée pâle est prisonnière d’un arbre mort. Sur le socle elfique : « La première larme du jour rendra sa voix à l’Aube Muette. » Le cercle est à l’est.";
    case "coeur": return "Aucun insecte ne vit ici. Une silhouette plus haute que les arbres se détache de l’obscurité. Elle n’a ni visage ni bouche, mais elle attend que tu parles.";
    default: return "La forêt écoute.";
  }
}

function objective() {
  if (!state.flags.journalRead) return "Comprendre comment retrouver le nom perdu.";
  if (!state.flags.swordFreed) return "Trouver la lame capable de traverser les serviteurs de l’Ombre.";
  if (!state.flags.cocoonSearched || !state.flags.stonesRead || !state.flags.bellRung) return "Rassembler les trois syllabes du nom véritable.";
  if (!state.flags.won) return "Prononcer le nom complet devant l’Ombre.";
  return "Rapporter l’Épée de l’Aube Muette au village.";
}

function shortcutSpecs() {
  const fill = (label, value) => ({ label, fill: value });
  const run = (label, command = label) => ({ label, command });
  const inspect = fill("Examiner…", "examiner "), take = fill("Prendre…", "prendre "), use = fill("Utiliser…", "utiliser ");
  const map = {
    lisiere: [inspect, run("Nord")], carrefour: [inspect, run("Nord"), run("Est"), run("Ouest")],
    cabane: [inspect, take, fill("Lire…", "lire "), run("Ouest")], ravin: [inspect, fill("Attaquer…", "attaquer "), run("Est")],
    marais: [inspect, take, use, run("Nord"), run("Sud")], cercle: [inspect, use, run("Nord"), run("Est"), run("Ouest")],
    antre: [inspect, use, fill("Attaquer…", "attaquer "), take, run("Ouest")], sanctuaire: [inspect, use, take, run("Est")],
    coeur: [inspect, fill("Dire le nom…", "dire "), fill("Attaquer…", "attaquer "), run("Sud")],
  };
  return map[state.room] || [run("Regarder"), inspect, run("Inventaire"), run("Indice")];
}

function renderStatus() {
  const room = ROOMS[state.room]; roomNameEl.textContent = room.title; roomIndexEl.textContent = room.index; objectiveEl.textContent = objective();
  moveCounterEl.textContent = `${state.commands} commande${state.commands > 1 ? "s" : ""} · ${state.deaths} mort${state.deaths > 1 ? "s" : ""}`;
  inventoryEl.replaceChildren();
  const inventory = state.inventory.map((id) => ITEM_LABELS[id]);
  const relics = window.ChroniclesInventory?.list().filter((id) => id !== "epee_aube").map((id) => window.ChroniclesInventory.labels[id]) || [];
  if (!inventory.length && !relics.length) { const li = document.createElement("li"); li.className = "empty"; li.textContent = "Rien pour l’instant"; inventoryEl.append(li); }
  inventory.forEach((label) => { const li = document.createElement("li"); li.textContent = label; inventoryEl.append(li); });
  relics.forEach((label) => { const li = document.createElement("li"); li.className = "legacy-item"; li.textContent = label; li.title = "Relique d’une quête précédente"; inventoryEl.append(li); });
  courageEl.replaceChildren();
  for (let i = 0; i < state.maxCourage; i += 1) { const pip = document.createElement("span"); if (i >= state.courage) pip.className = "empty"; courageEl.append(pip); }
  courageEl.setAttribute("aria-label", `Sang-froid : ${state.courage} sur ${state.maxCourage}`);
  suggestionsEl.replaceChildren(); shortcutSpecs().forEach((spec) => { const button = document.createElement("button"); button.type = "button"; button.textContent = spec.label; button.addEventListener("click", () => { if (spec.fill !== undefined) { commandInput.value = spec.fill; commandInput.focus(); commandInput.setSelectionRange(spec.fill.length, spec.fill.length); } else submitCommand(spec.command); }); suggestionsEl.append(button); });
  drawScene();
}

function showRoom() { addLog(ROOMS[state.room].title.toUpperCase(), "system"); addLog(roomDescription()); renderStatus(); beep("move"); }
function directionFrom(command) { if (/\b(nord|n)\b/.test(command)) return "nord"; if (/\b(sud|s)\b/.test(command)) return "sud"; if (/\b(est|e|droite)\b/.test(command)) return "est"; if (/\b(ouest|o|gauche)\b/.test(command)) return "ouest"; return null; }

function move(direction) {
  if (state.room === "lisiere" && direction === "sud") return addLog("Le village est derrière toi. La quête se trouve au nord.");
  if (state.room === "cercle" && direction === "ouest" && !state.flags.pathOpened) return addLog("Les racines ne laissent aucun interstice.", "danger");
  if (state.room === "cercle" && direction === "nord" && !(state.flags.cocoonSearched && state.flags.stonesRead && state.flags.bellRung)) return addLog("Le sentier tourne sur lui-même. La forêt ne te laissera atteindre son cœur qu’une fois le nom recomposé.", "danger");
  const routes = {
    lisiere: { nord: "carrefour" }, carrefour: { sud: "lisiere", est: "cabane", ouest: "ravin", nord: "marais" },
    cabane: { ouest: "carrefour" }, ravin: { est: "carrefour" }, marais: { sud: "carrefour", nord: "cercle" },
    cercle: { sud: "marais", ouest: "sanctuaire", est: "antre", nord: "coeur" }, antre: { ouest: "cercle" },
    sanctuaire: { est: "cercle" }, coeur: { sud: "cercle" },
  };
  const destination = routes[state.room]?.[direction]; if (!destination) return addLog("Aucun sentier ne mène dans cette direction.");
  state.room = destination; showRoom();
}

function examine(command) {
  if (state.room === "lisiere" && includesAny(command, ["trace", "pas", "racine", "sol"])) { state.flags.tracksSeen = true; addLog("Les empreintes entrent dans la forêt, mais aucune n’en ressort. Une phrase a été gravée sous la racine : « N’attaque pas ce qui n’a pas de corps. »", "reward"); }
  else if (state.room === "carrefour" && includesAny(command, ["arbre", "yeux", "panneau", "sentier"])) addLog("Les yeux ne sont que des nœuds dans le bois — jusqu’à ce que tu détournes le regard. Des flèches anciennes indiquent : FORESTIER à l’est, TISSEUSES à l’ouest, PIERRES ELFES au nord.");
  else if (state.room === "cabane" && includesAny(command, ["table", "coffre", "foyer", "cabane", "griffure"])) { state.flags.cabinSearched = true; addLog("Sous la cendre : un journal, une fiole et une tablette. La tablette énumère trois noms barrés — Noir-Roi, Sylvar et Malach — sans doute des pièges pour les imprudents.", "reward"); }
  else if (state.room === "cabane" && includesAny(command, ["tablette", "nom", "inscription"])) addLog("Les faux noms sont barrés. Au revers : « La chouette ouvre le nom, les pierres le poursuivent, le serpent le ferme. »", "reward");
  else if (state.room === "ravin" && includesAny(command, ["araignee", "tisseuse", "toile", "cocon"])) addLog(state.flags.spiderDead ? "Dans le plus vieux cocon, un petit os gravé attend d’être dégagé." : "La tisseuse protège un cocon très ancien. Les fils sont trop épais pour être coupés sans une véritable lame.");
  else if (state.room === "marais" && includesAny(command, ["roseau", "eau", "miroir", "stele", "pierre"])) addLog("Une rosée brillante perle sur les roseaux malgré l’absence d’aube. Le miroir lunaire pourrait révéler ce que la nuit cache aux pierres.", "reward");
  else if (state.room === "cercle" && includesAny(command, ["rune", "pierre", "dalle", "lune"])) addLog(state.flags.stonesRead ? "Sous la lumière du miroir, les pierres ont livré la syllabe centrale : EL." : "Les runes sont invisibles à l’œil nu. La dalle centrale attend une lumière qu’aucun ciel ne donne plus.");
  else if (state.room === "antre" && includesAny(command, ["serpent", "cloche", "branche", "tertre"])) addLog(state.flags.snakesGone ? "La cloche est libre. Une inscription elfique promet que le bronze se souvient des derniers sons prononcés ici." : "Les serpents défendent la cloche, pas leur nid. Une mélodie pourrait les détourner ; une lame pourrait aussi les disperser.");
  else if (state.room === "sanctuaire" && includesAny(command, ["epee", "lame", "racine", "arbre", "socle"])) addLog(state.flags.swordFreed ? "Les runes nomment l’arme : l’Épée de l’Aube Muette. Elle reconnaîtra désormais ta main dans les quêtes à venir." : "La lame est intacte, mais les racines se resserrent lorsque tu approches. Le socle réclame la première larme du jour.", "reward");
  else if (state.room === "coeur" && includesAny(command, ["ombre", "silhouette", "arbre", "coeur"])) addLog("L’Ombre n’a pas de chair à frapper. Trois creux brillent dans son front, comme des emplacements pour trois syllabes. Elle recule lorsque tu penses au journal.", "reward");
  else addLog(roomDescription());
}

function take(command) {
  if (includesAny(command, ["journal", "livre", "carnet"])) { if (state.room !== "cabane" || !state.flags.cabinSearched) return addLog("Tu ne vois aucun journal ici."); if (!owns("journal")) { addItem("journal"); addLog("Tu prends le journal du forestier.", "reward"); } else addLog("Tu as déjà le journal."); }
  else if (includesAny(command, ["fiole", "flacon"])) { if (state.room !== "cabane" || !state.flags.cabinSearched) return addLog("Tu ne vois aucune fiole."); if (!owns("fiole") && !owns("rosee")) { addItem("fiole"); addLog("Tu prends la petite fiole de verre.", "reward"); } else addLog("Tu as déjà la fiole."); }
  else if (includesAny(command, ["miroir", "eclat"])) { if (state.room !== "marais") return addLog("Tu ne vois aucun miroir ici."); if (!owns("miroir")) { addItem("miroir"); state.flags.mirrorTaken = true; addLog("Tu prends l’éclat de miroir lunaire.", "reward"); } else addLog("Tu as déjà le miroir."); }
  else if (includesAny(command, ["roseau", "flute"])) { if (state.room !== "marais") return addLog("Tu ne vois aucun roseau utilisable."); if (!owns("roseau")) { addItem("roseau"); state.flags.fluteMade = true; addLog("Tu coupes un roseau creux. Trois trous naturels en font une flûte primitive.", "reward"); } else addLog("Tu as déjà une flûte de roseau."); }
  else if (includesAny(command, ["epee", "lame", "arme"])) { if (state.room !== "sanctuaire") return addLog("Tu ne vois aucune épée ici."); if (!state.flags.swordFreed) return killPlayer("Les racines affamées", "Tu tires sur la garde. Les racines s’enroulent autour de tes poignets et boivent ta chaleur jusqu’au dernier souffle."); if (!owns("epee")) { addItem("epee"); addLog("Tu prends l’Épée de l’Aube Muette. Pour la première fois depuis ton entrée, les yeux cachés dans les arbres se ferment.", "reward"); saveCheckpoint("le sanctuaire délivré"); } else addLog("L’épée est déjà à ton côté."); }
  else if (includesAny(command, ["amulette", "os", "cocon"])) { if (state.room !== "ravin" || !state.flags.spiderDead) return addLog("Tu ne peux rien prendre dans la toile."); if (!state.flags.cocoonSearched) return addLog("Il faut d’abord fouiller le cocon."); if (!owns("amulette")) { addItem("amulette"); addLog("Tu prends l’amulette. Une chouette y entoure la première syllabe : THA.", "reward"); } else addLog("Tu as déjà l’amulette."); }
  else if (includesAny(command, ["cloche", "clochette", "bronze"])) { if (state.room !== "antre" || !state.flags.snakesGone) return addLog("Les serpents empêchent d’approcher la cloche."); if (!owns("cloche")) { addItem("cloche"); addLog("Tu décroches la cloche de bronze.", "reward"); } else addLog("Tu as déjà la cloche."); }
  else if (includesAny(command, ["champignon", "lumiere", "feu pale"])) killPlayer("La lumière qui mange", "Le petit feu tient dans ta paume. Il remonte ton bras, efface tes souvenirs et laisse ton corps sourire au bord du marais.");
  else addLog("Tu ne peux pas prendre cela.");
  beep("item"); renderStatus();
}

function readThing(command) {
  if (includesAny(command, ["journal", "carnet", "livre"])) {
    if (!owns("journal")) return addLog("Tu ne possèdes pas le journal.");
    state.flags.journalRead = true; addLog("Dernière page : « Son nom fut divisé pour qu’il cesse d’exister. La chouette garde le commencement, les neuf pierres le milieu, la cloche des serpents la fin. Réunis-les dans cet ordre et parle devant lui. »", "reward"); return;
  }
  if (state.room === "cabane" && command.includes("tablette")) return examine("examiner tablette nom");
  if (state.room === "cercle" && includesAny(command, ["rune", "pierre"])) return examine("examiner runes pierres");
  addLog("Rien ici ne peut être lu clairement.");
}

function useItem(command) {
  if (includesAny(command, ["fiole", "flacon"]) && state.room === "marais" && includesAny(command, ["rosee", "roseau", "larme", "argent"])) {
    collectDew(); return;
  }
  if (includesAny(command, ["rosee", "fiole", "larme"]) && state.room === "sanctuaire" && includesAny(command, ["racine", "arbre", "epee", "lame", "socle"])) {
    if (!owns("rosee")) return addLog("Tu n’as pas la larme réclamée."); removeItem("rosee"); state.flags.swordFreed = true; state.flags.pathOpened = true; addLog("La rosée touche l’écorce. Un rayon blanc traverse les branches ; les racines se changent en poussière et libèrent l’épée.", "reward"); beep("success"); return;
  }
  if (includesAny(command, ["miroir", "eclat"]) && state.room === "cercle" && includesAny(command, ["pierre", "rune", "dalle", "lune"])) {
    if (!owns("miroir")) return addLog("Tu n’as rien qui puisse rendre la lumière absente."); state.flags.stonesRead = true; state.flags.pathOpened = true; addLog("Le miroir renvoie une lune qui n’existe plus. Deux lettres s’allument sur les pierres : EL. La syllabe centrale est EL.", "reward"); beep("success"); return;
  }
  if (includesAny(command, ["roseau", "flute", "musique", "jouer"]) && state.room === "antre") {
    if (!owns("roseau")) return addLog("Tu n’as aucun instrument."); state.flags.snakesGone = true; addLog("La note du roseau glisse entre les pierres. Les serpents la suivent en procession et disparaissent sous les fougères.", "reward"); beep("success"); return;
  }
  if (includesAny(command, ["cloche", "clochette", "bronze", "sonner"])) {
    if (!owns("cloche")) return addLog("Tu ne possèdes aucune cloche."); state.flags.bellRung = true; addLog("La cloche répète la dernière voix qu’elle a entendue avant la chute des elfes : « MOR ». La syllabe finale est MOR.", "reward"); beep("success"); return;
  }
  addLog("Précise l’objet et sa cible. Exemple : UTILISER LA ROSÉE SUR LES RACINES.");
}

function collectDew() {
  if (owns("rosee")) return addLog("La fiole contient déjà la rosée d’argent.");
  if (!owns("fiole")) return addLog("Tu n’as aucun récipient pour recueillir la rosée.");
  removeItem("fiole"); addItem("rosee"); state.flags.vialFilled = true;
  addLog("Tu recueilles la rosée d’argent dans la fiole. Le verre devient froid comme une étoile.", "reward"); beep("success");
}

function attack(command) {
  if (state.room === "coeur") return killPlayer("Une lame dans la nuit", "L’épée traverse l’Ombre sans résistance. La silhouette entre alors par la lame et remonte jusqu’à ton propre cœur. Une chose sans corps ne peut être vaincue par le fer.");
  if (state.room === "ravin") {
    if (!owns("epee")) return killPlayer("La dernière mouche", "Tu frappes la toile avec tes mains. La tisseuse descend derrière toi et t’enveloppe avant ton second geste.");
    state.flags.spiderDead = true; addLog("L’Aube Muette tranche les fils, puis une patte. La tisseuse fuit, mais la lame blanche la rattrape. Le vieux cocon est désormais accessible.", "reward"); beep("success"); return;
  }
  if (state.room === "antre") {
    if (!owns("epee")) return killPlayer("La couronne de crocs", "Le premier serpent mord ta cheville. Les autres attendent que tes jambes cèdent.");
    state.flags.snakesGone = true; addLog("Tu fais décrire à l’épée un cercle pâle. Deux serpents tombent ; les autres se dispersent. La cloche est libre.", "reward"); beep("success"); return;
  }
  addLog(owns("epee") ? "Tu brandis l’épée, mais aucun ennemi de chair ne se présente." : "Tes mains nues ne sont pas une arme.");
}

function search(command) {
  if (state.room === "cabane") return examine("examiner table coffre cabane");
  if (state.room === "ravin" && state.flags.spiderDead && includesAny(command, ["cocon", "toile", "ravin", "fouiller"])) { state.flags.cocoonSearched = true; addLog("Dans le cocon d’un ancien éclaireur elfe, tu découvres une amulette d’os. Une chouette y encadre la syllabe THA : le commencement du nom.", "reward"); return; }
  return examine(command);
}

function speak(command) {
  if (state.room !== "coeur") return addLog("Les arbres répètent tes paroles jusqu’à les rendre méconnaissables.");
  if (includesAny(command.replace(/\s/g, ""), ["thaelmor", "nomestthaelmor", "tutappellesthaelmor"])) return winGame();
  state.flags.wrongNames += 1; addLog("L’Ombre se penche. Ce nom n’est pas le sien. Quelque chose d’essentiel quitte ta mémoire.", "danger"); loseCourage(2);
}

function winGame() {
  if (state.flags.won) return;
  state.flags.won = true;
  if (!owns("epee")) addItem("epee");
  window.ChroniclesInventory?.add("epee_aube");
  addLog("« THAELMOR ! » Les trois syllabes frappent la forêt comme une cloche. L’Ombre retrouve un visage, puis un âge, puis une mort. Elle se déchire dans un vent d’aube. Pour la première fois depuis des années, le soleil touche les feuilles.", "reward");
  beep("victory"); renderStatus();
  const elapsed = Math.max(1, Math.round((Date.now() - state.startedAt) / 60000));
  endingText.textContent = `Tu as rendu son nom à Thaelmor en ${state.commands} commandes, après ${state.deaths} mort${state.deaths > 1 ? "s" : ""}, et environ ${elapsed} minute${elapsed > 1 ? "s" : ""}. L’Épée de l’Aube Muette rejoint désormais ton inventaire permanent et pourra servir dans les prochaines chroniques.`;
  window.setTimeout(() => endingDialog.showModal(), 8000);
}

function loseCourage(amount) { state.courage = Math.max(0, state.courage - amount); beep("danger"); if (!state.courage) killPlayer("Le nom oublié", "À force d’offrir des noms faux, tu oublies le tien. L’Ombre te donne alors une place parmi les silhouettes qui observent les voyageurs."); }
function killPlayer(title, text) { if (state.pendingDeath) return; state.pendingDeath = true; state.deaths += 1; deathTitle.textContent = title; deathText.textContent = text; screenEl.classList.add("is-dead"); renderStatus(); beep("danger"); window.setTimeout(() => deathDialog.showModal(), 8000); }
function continueFromCheckpoint() { const meta = { commands: state.commands, deaths: state.deaths, startedAt: state.startedAt }; state = cloneState(checkpoint); Object.assign(state, meta); state.pendingDeath = false; state.courage = state.maxCourage; deathDialog.close(); screenEl.classList.remove("is-dead"); gameLog.replaceChildren(); addLog(`Le temps se replie. Tu reprends conscience près de ${checkpointLabel}. La forêt se souvient de ta mort.`, "system"); showRoom(); }

function showHelp() { addLog("Commandes : REGARDER, EXAMINER [objet], FOUILLER [lieu], LIRE [objet], PRENDRE [objet], UTILISER [objet] SUR [cible], ATTAQUER [ennemi] AVEC [arme], DIRE [nom], ALLER NORD/SUD/EST/OUEST, INVENTAIRE, INDICE.", "system"); }
function showHint() {
  const hints = {
    lisiere: "Les traces préviennent que l’ennemi final n’a pas de corps.", carrefour: "La cabane explique la règle. Le marais fournit deux objets utiles. Le ravin devra attendre une lame.",
    cabane: "Fouille la table, prends le journal et la fiole, puis lis le journal et la tablette.", ravin: "Une vraie épée peut vaincre la tisseuse. Fouille ensuite son plus vieux cocon.",
    marais: "Prends le miroir et un roseau. Recueille aussi la rosée d’argent dans une fiole.", cercle: "Utilise le miroir sur les runes. Le journal donne l’ordre des trois fragments.",
    antre: "La flûte attire les serpents sans combat ; l’épée offre une solution plus directe. Puis prends et sonne la cloche.", sanctuaire: "La première larme du jour est la rosée d’argent. Verse-la sur les racines, puis prends l’épée.",
    coeur: "Chouette, pierres, serpent : THA + EL + MOR. Ne frappe pas une chose sans corps ; dis son nom.",
  };
  addLog(`INDICE — ${hints[state.room]}`, "system");
}

function processCommand(rawCommand) {
  const command = normalize(rawCommand); if (!command || state.pendingDeath) return;
  if (state.flags.won && includesAny(command, ["recommencer", "rejouer", "restart"])) return resetGame();
  addLog(`> ${rawCommand.trim()}`, "command"); state.commands += 1;
  if (includesAny(command, ["aide", "help", "commandes"])) showHelp();
  else if (includesAny(command, ["indice", "hint", "conseil"])) showHint();
  else if (includesAny(command, ["inventaire", "sac", "objets", "reliques"])) { const labels = state.inventory.map((id) => ITEM_LABELS[id]); const relics = window.ChroniclesInventory?.list().map((id) => window.ChroniclesInventory.labels[id]) || []; addLog(labels.length || relics.length ? `Tu portes : ${[...labels, ...relics.filter((label) => !labels.includes(label))].join(", ").toLowerCase()}.` : "Ton inventaire est vide."); }
  else if (/^(regarder|regarde|voir|observer|lieu|r)$/.test(command)) addLog(roomDescription());
  else if (state.room === "carrefour" && includesAny(command, ["suivre yeux", "suivre regard", "hors sentier", "quitter sentier"])) killPlayer("Le chemin qui se referme", "Tu suis les regards entre les arbres. Les ronces effacent le sentier derrière toi, puis apprennent la forme exacte de ton corps.");
  else if (state.room === "marais" && command.includes("rosee") && includesAny(command, ["mettre", "recueillir", "recolter", "collecter", "ramasser", "prendre", "cueillir", "remplir", "verser"])) collectDew();
  else if (state.room === "marais" && includesAny(command, ["nager", "entrer eau", "traverser eau", "boire eau"])) killPlayer("Sous les feux pâles", "L’eau n’atteint que tes genoux, pourtant le fond s’éloigne. Des mains blanches t’attirent vers un ciel noyé.");
  else if (/^(nord|sud|est|ouest|n|s|e|o|gauche|droite)$/.test(command) || includesAny(command, ["aller", "retourner", "fuir"])) { const direction = directionFrom(command); direction ? move(direction) : addLog("Dans quelle direction ?"); }
  else if (includesAny(command, ["fouiller", "chercher"])) search(command);
  else if (includesAny(command, ["examiner", "inspecter", "observer"])) examine(command);
  else if (includesAny(command, ["lire", "dechiffrer"])) readThing(command);
  else if (includesAny(command, ["prendre", "ramasser", "saisir", "cueillir", "couper", "decrocher"])) take(command);
  else if (includesAny(command, ["attaquer", "frapper", "tuer", "combattre", "trancher"])) attack(command);
  else if (includesAny(command, ["dire", "prononcer", "nommer", "crier", "parler", "appeler"])) speak(command);
  else if (includesAny(command, ["utiliser", "mettre", "verser", "remplir", "jouer", "sonner", "brandir", "appliquer", "placer"])) useItem(command);
  else addLog("La machine ne comprend pas. Essaie AIDE ou complète l’un des raccourcis proposés.");
  renderStatus();
}

function submitCommand(command) { if (!command || !command.trim()) return; beep("key"); processCommand(command); commandInput.value = ""; if (window.matchMedia("(pointer: fine)").matches) commandInput.focus(); }
function resetGame() { state = initialState(); checkpoint = cloneState(state); checkpointLabel = "la lisière"; gameLog.replaceChildren(); if (endingDialog.open) endingDialog.close(); if (deathDialog.open) deathDialog.close(); screenEl.classList.remove("is-dead"); addLog("FORÊT DE L’EST, ÉTÉ 1989. Depuis des mois, aucune aube ne traverse les arbres. Les elfes parlent d’une Ombre Sans Nom, servie par les serpents et les araignées. Les vieilles légendes sont formelles : retrouve son nom, puis prononce-le devant elle.", "system"); if (window.ChroniclesInventory?.owns("epee_aube")) addLog("L’Épée de l’Aube Muette reconnaît déjà ta main : cette chronique a été accomplie auparavant.", "system"); showRoom(); }

async function ensureAudio() { if (!audioContext) { const Audio = window.AudioContext || window.webkitAudioContext; if (Audio) audioContext = new Audio({ latencyHint: "interactive" }); } if (audioContext?.state === "suspended") { try { await audioContext.resume(); } catch { /* une nouvelle pression pourra relancer l’audio */ } } return audioContext; }
function tone(frequency, duration, delay = 0, type = "square", volume = 0.02) { if (!soundEnabled || !audioContext) return; const oscillator = audioContext.createOscillator(), gain = audioContext.createGain(), start = audioContext.currentTime + delay; oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start); gain.gain.setValueAtTime(volume, start); gain.gain.exponentialRampToValueAtTime(0.0001, start + duration); oscillator.connect(gain).connect(audioContext.destination); oscillator.start(start); oscillator.stop(start + duration); }
function beep(kind) { if (!soundEnabled) return; if (kind === "key") tone(131, 0.035, 0, "square", 0.009); if (kind === "move") tone(87, 0.09, 0, "triangle", 0.012); if (kind === "item") { tone(294, 0.08); tone(440, 0.12, 0.07); } if (kind === "success") { tone(196, 0.09); tone(294, 0.09, 0.08); tone(523, 0.15, 0.16); } if (kind === "danger") tone(65, 0.38, 0, "sawtooth", 0.026); if (kind === "victory") [196, 247, 294, 392, 523].forEach((note, index) => tone(note, 0.34, index * 0.12, "square", 0.018)); }
const MUSIC = { edge: [38, null, 41, 37, null, 43, 38, null, 36, 41, null, 35, 38, null, 34, null], forest: [36, 43, null, 37, 42, null, 35, 41, 36, null, 40, 34, null, 39, 35, null], danger: [33, 34, 40, 39, 33, 46, 45, 34, 32, 38, 39, 45, 44, 38, 33, null], heart: [29, null, 30, 36, 35, null, 29, 42, 41, null, 35, 36, 30, 29, 23, null] };
function midiToHz(note) { return 440 * (2 ** ((note - 69) / 12)); }
function musicPattern() { if (state.room === "lisiere") return MUSIC.edge; if (includesAny(state.room, ["ravin", "antre"])) return MUSIC.danger; if (state.room === "coeur") return MUSIC.heart; return MUSIC.forest; }
function musicTick() { if (!soundEnabled || !audioContext || audioContext.state !== "running" || state.pendingDeath || state.flags.won) return; const pattern = musicPattern(), note = pattern[musicStep % pattern.length]; if (note) tone(midiToHz(note), 0.38, 0, musicStep % 4 === 0 ? "square" : "triangle", 0.013); if (musicStep % 4 === 0) tone(midiToHz((note || 36) - 12), 1.05, 0, "sawtooth", 0.006); if (musicStep % 8 === 5) tone(midiToHz(55), 0.06, 0, "square", 0.004); musicStep += 1; }
function startMusic() { stopMusic(); musicStep = 0; musicTick(); musicTimer = window.setInterval(musicTick, 330); }
function stopMusic() { if (musicTimer !== null) window.clearInterval(musicTimer); musicTimer = null; }
async function activateDefaultAudio() { if (!soundEnabled) return; await ensureAudio(); if (soundEnabled && musicTimer === null) startMusic(); }

function drawScene() {
  ctx.imageSmoothingEnabled = false; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (forestSheet.complete && forestSheet.naturalWidth) {
    const panel = ROOMS[state.room].panel; const column = panel % 3; const row = Math.floor(panel / 3);
    const sw = forestSheet.naturalWidth / 3; const sh = forestSheet.naturalHeight / 3;
    ctx.drawImage(forestSheet, column * sw, row * sh, sw, sh, 0, 0, canvas.width, canvas.height);
  } else { ctx.fillStyle = "#00aaaa"; ctx.font = "8px monospace"; ctx.fillText("CHARGEMENT DE L'IMAGE...", 99, 92); }
  if (state.flags.won) { ctx.fillStyle = "rgba(170,0,170,0.32)"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "#fff"; ctx.font = "bold 10px monospace"; ctx.fillText("THAELMOR EST NOMMÉ", 91, 94); }
}

commandForm.addEventListener("submit", (event) => { event.preventDefault(); submitCommand(commandInput.value); });
restartButton.addEventListener("click", resetGame); playAgainButton.addEventListener("click", resetGame); continueButton.addEventListener("click", continueFromCheckpoint); deathRestartButton.addEventListener("click", resetGame);
document.addEventListener("pointerdown", activateDefaultAudio, { once: true, capture: true });
document.addEventListener("keydown", activateDefaultAudio, { once: true, capture: true });
soundButton.addEventListener("click", async () => { soundEnabled = !soundEnabled; soundButton.setAttribute("aria-pressed", String(soundEnabled)); soundButton.textContent = `Son + musique : ${soundEnabled ? "oui" : "non"}`; if (soundEnabled) { await ensureAudio(); if (!soundEnabled) return; beep("item"); startMusic(); } else stopMusic(); });
resetGame();
