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
const vigorEl = $("#warmth");
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
  camp: { title: "Le camp des Nains", index: "01 / 09", image: "assets/e4-01-camp.png" },
  porte: { title: "La porte de basalte", index: "02 / 09", image: "assets/e4-02-porte.png" },
  carrefour: { title: "Le carrefour des rails", index: "03 / 09", image: "assets/e4-03-carrefour.png" },
  forge: { title: "La forge éteinte", index: "04 / 09", image: "assets/e4-04-forge.png" },
  spores: { title: "La grotte des dormeuses", index: "05 / 09", image: "assets/e4-05-spores.png" },
  cristaux: { title: "La galerie des échos", index: "06 / 09", image: "assets/e4-06-cristaux.png" },
  lac: { title: "Le lac des ossements", index: "07 / 09", image: "assets/e4-07-lac.png" },
  conduit: { title: "Le conduit des souffles", index: "08 / 09", image: "assets/e4-08-conduit.png" },
  tresor: { title: "Le trésor du Dragon Noir", index: "09 / 09", image: "assets/e4-09-tresor.png" },
};

const EXITS = {
  camp: { nord: "porte" },
  porte: { sud: "camp", nord: "carrefour" },
  carrefour: { sud: "porte", ouest: "forge", est: "spores", nord: "cristaux" },
  forge: { est: "carrefour" },
  spores: { ouest: "carrefour" },
  cristaux: { sud: "carrefour", ouest: "lac", est: "conduit" },
  lac: { est: "cristaux" },
  conduit: { ouest: "cristaux", nord: "tresor" },
  tresor: { sud: "conduit" },
};

const ITEM_LABELS = {
  sceau: "Sceau de granit",
  soufflet: "Soufflet portatif",
  cendre: "Cendre volcanique",
  spores: "Spores dormeuses",
  poudre: "Poudre de sommeil",
  miroir: "Miroir d’acier poli",
  frottis: "Frottis du fermoir",
  grimoire: "Grimoire runique",
};

const sceneImages = Object.fromEntries(Object.entries(ROOMS).map(([key, room]) => {
  const image = new Image();
  image.src = room.image;
  image.addEventListener("load", drawScene);
  return [key, image];
}));

let state;
let checkpoint;
let checkpointLabel = "le camp des Nains";
let soundEnabled = true;
let audioContext = null;
let musicTimer = null;
let musicStep = 0;

function initialState() {
  return {
    room: "camp",
    inventory: ["sceau"],
    vigor: 4,
    maxVigor: 4,
    commands: 0,
    deaths: 0,
    startedAt: Date.now(),
    pendingDeath: false,
    flags: {
      dwarvesSpoken: false,
      gateExamined: false,
      gateOpen: false,
      forgeSearched: false,
      clueRivets: false,
      sporesExamined: false,
      crystalsExamined: false,
      clueReflection: false,
      satchelSearched: false,
      clueClasp: false,
      powderMade: false,
      dragonAsleep: false,
      dragonDefeated: false,
      booksExamined: false,
      won: false,
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
function ownsSword() { return Boolean(window.ChroniclesInventory?.owns("epee_aube")); }
function clueCount() { return [state.flags.clueRivets, state.flags.clueReflection, state.flags.clueClasp].filter(Boolean).length; }

function addLog(text, tone = "narration") {
  const entry = document.createElement("p");
  entry.className = `log-entry ${tone}`;
  entry.textContent = text;
  gameLog.append(entry);
  while (gameLog.children.length > 34) gameLog.firstElementChild.remove();
  gameLog.scrollTop = gameLog.scrollHeight;
}

function roomDescription() {
  switch (state.room) {
    case "camp": return state.flags.dwarvesSpoken ? "Les feux bas du camp éclairent des visages graves. Le thane t’a confié un sceau de granit. La porte de la montagne est au nord." : "Sous le volcan noir, une poignée de Nains garde un camp battu par les cendres. Leur thane attend devant une table de pierre. La montagne s’ouvre au nord.";
    case "porte": return state.flags.gateOpen ? "Les battants de basalte sont ouverts. Les anciens rails s’enfoncent au nord ; le camp est au sud." : "Deux rois de pierre encadrent une porte sans serrure. Une cavité hexagonale et des runes usées marquent son centre. Le camp est au sud.";
    case "carrefour": return "Trois galeries se partagent les rails. Une chaleur morte vient de l’ouest, des lueurs pâles de l’est et un écho de verre du nord. La porte est au sud.";
    case "forge": return state.flags.forgeSearched ? "La forge a livré sa cendre, son soufflet et une tablette de contrôle. Le carrefour est à l’est." : "Un four monumental dort sous la suie. Des outils nains, un soufflet portatif et une tablette métallique reposent près du foyer. Le carrefour est à l’est.";
    case "spores": return "Des champignons blancs respirent comme de petits poumons. À chaque souffle, une poussière argentée flotte au ras du sol. Le carrefour est à l’ouest.";
    case "cristaux": return state.flags.clueReflection ? "Les cristaux répètent chaque bruit. Le miroir d’acier a révélé le sens de l’inscription. Le lac est à l’ouest, le conduit à l’est et le carrefour au sud." : "Des cristaux violets entourent un miroir d’acier fendu. Une inscription naine, inversée par le temps, couvre le socle. Le lac est à l’ouest, un conduit à l’est et le carrefour au sud.";
    case "lac": return state.flags.satchelSearched ? "Les os du dernier archiviste bordent l’eau noire. Sa sacoche est ouverte. La galerie des échos est à l’est." : "Une chaîne rompue disparaît dans un lac sans rides. Parmi les côtes d’un ancien dragon gît une sacoche naine gonflée d’eau. La galerie des échos est à l’est.";
    case "conduit": return state.flags.dragonAsleep ? "Le conduit exhale encore une brume argentée. Au nord, le souffle du dragon est devenu un grondement de sommeil. La galerie des échos est à l’ouest." : "Un ancien conduit d’aération plonge vers une lueur de fournaise. Chaque expiration du Dragon Noir fait trembler sa grille. La galerie des échos est à l’ouest.";
    case "tresor": {
      const dragon = state.flags.dragonDefeated ? "Le Dragon Noir gît, le cœur percé." : state.flags.dragonAsleep ? "Le Dragon Noir dort sous l’effet des spores, une paupière frémissante." : "Le Dragon Noir se dresse devant les pupitres, ses écailles chauffées à blanc.";
      return `${dragon} Devant le trésor, quatre grimoires reposent sur quatre pupitres de pierre. Le conduit est au sud.`;
    }
    default: return "La montagne gronde.";
  }
}

function objective() {
  if (!state.flags.gateOpen) return "Ouvrir la porte naine et pénétrer dans la montagne.";
  if (clueCount() < 3) return `Retrouver les indices du vrai grimoire (${clueCount()} sur 3).`;
  if (!state.flags.dragonAsleep && !state.flags.dragonDefeated) return ownsSword() ? "Atteindre l’antre et affronter le Dragon Noir." : "Endormir le dragon pour entrer dans son antre sans être vu.";
  if (!state.flags.won) return "Identifier le véritable grimoire parmi les quatre livres.";
  return "Rapporter le grimoire runique aux Nains.";
}

function shortcutSpecs() {
  const fill = (label, value) => ({ label, fill: value });
  const run = (label, command = label) => ({ label, command });
  const inspect = fill("Examiner…", "examiner ");
  const take = fill("Prendre…", "prendre ");
  const use = fill("Utiliser…", "utiliser ");
  const map = {
    camp: [inspect, fill("Parler…", "parler "), run("Nord")],
    porte: [inspect, use, run("Nord"), run("Sud")],
    carrefour: [inspect, run("Nord"), run("Est"), run("Ouest"), run("Sud")],
    forge: [inspect, take, fill("Lire…", "lire "), run("Est")],
    spores: [inspect, take, run("Ouest")],
    cristaux: [inspect, take, use, run("Ouest"), run("Est"), run("Sud")],
    lac: [inspect, fill("Fouiller…", "fouiller "), run("Est")],
    conduit: [inspect, use, run("Nord"), run("Ouest")],
    tresor: [inspect, take, fill("Attaquer…", "attaquer "), run("Sud")],
  };
  return map[state.room] || [run("Regarder"), inspect, run("Inventaire"), run("Indice")];
}

function renderSuggestions() {
  suggestionsEl.replaceChildren();
  shortcutSpecs().forEach((spec) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = spec.label;
    button.addEventListener("click", () => {
      if (spec.fill) { commandInput.value = spec.fill; commandInput.focus(); return; }
      submitCommand(spec.command);
    });
    suggestionsEl.append(button);
  });
}

function renderInventory() {
  inventoryEl.replaceChildren();
  const localItems = state.inventory.map((id) => ITEM_LABELS[id]);
  const relics = window.ChroniclesInventory?.list().map((id) => window.ChroniclesInventory.labels[id]) || [];
  const items = [...localItems, ...relics.filter((label) => !localItems.includes(label))];
  if (!items.length) {
    const empty = document.createElement("li"); empty.className = "empty"; empty.textContent = "Rien pour l’instant"; inventoryEl.append(empty); return;
  }
  items.forEach((label, index) => {
    const li = document.createElement("li"); li.textContent = label;
    if (index >= localItems.length) { li.className = "legacy-item"; li.title = "Relique d’une quête précédente"; }
    inventoryEl.append(li);
  });
}

function renderVigor() {
  vigorEl.replaceChildren();
  for (let i = 0; i < state.maxVigor; i += 1) {
    const pip = document.createElement("span"); pip.className = i < state.vigor ? "warmth__pip is-full" : "warmth__pip"; vigorEl.append(pip);
  }
  vigorEl.setAttribute("aria-label", `Vigueur : ${state.vigor} sur ${state.maxVigor}`);
}

function drawScene() {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const image = sceneImages[state?.room];
  if (image?.complete && image.naturalWidth) ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
}

function render() {
  const room = ROOMS[state.room];
  roomNameEl.textContent = room.title;
  roomIndexEl.textContent = room.index;
  objectiveEl.textContent = objective();
  moveCounterEl.textContent = `${state.commands} commande${state.commands > 1 ? "s" : ""}`;
  renderInventory(); renderVigor(); renderSuggestions(); drawScene();
}

function showRoom() { addLog(roomDescription()); render(); }

function move(direction) {
  const destination = EXITS[state.room]?.[direction];
  if (!destination) return addLog(`Tu ne peux pas aller au ${direction} depuis ici.`, "warning");
  if (state.room === "porte" && direction === "nord" && !state.flags.gateOpen) return addLog("La porte de basalte ne bouge pas. Sa cavité semble attendre le sceau des Nains.", "warning");
  if (state.room === "conduit" && direction === "nord" && !state.flags.dragonAsleep && !ownsSword()) return killPlayer("Le souffle noir", "Tu te glisses dans l’antre. Une pupille d’or s’ouvre, puis la montagne entière devient flamme.");
  state.room = destination;
  if (destination === "tresor" && ownsSword() && !state.flags.dragonDefeated) addLog("L’Épée de l’Aube Muette vibre dans son fourreau. Le Dragon Noir se dresse entre toi et les livres.", "warning");
  showRoom();
}

function examine(command) {
  if (state.room === "camp") {
    if (includesAny(command, ["nain", "thane", "camp", "table"])) return addLog("Le thane serre un sceau de granit. Les cartes montrent que les anciennes archives se trouvent derrière l’antre du dragon.");
  }
  if (state.room === "porte") {
    state.flags.gateExamined = true;
    addLog("La cavité a exactement la forme du sceau de granit. Sous la poussière, une rune signifie : « La mémoire ouvre ce que la force condamne. »", "clue");
    return render();
  }
  if (state.room === "carrefour") return addLog("Les rails les plus profonds vont au nord. À l’ouest, de la cendre marque les traverses ; à l’est, elles sont couvertes d’une poussière blanche.");
  if (state.room === "forge") {
    state.flags.forgeSearched = true;
    addLog("Tu découvres un soufflet encore souple, un bac de cendre volcanique et une tablette gravée près de l’établi.");
    return render();
  }
  if (state.room === "spores") {
    state.flags.sporesExamined = true;
    addLog("Une inscription de mineur nomme ces champignons des dormeuses : leurs spores assoupissent même les lézards de feu lorsqu’elles sont mêlées à la cendre.", "clue");
    return render();
  }
  if (state.room === "cristaux") {
    state.flags.crystalsExamined = true;
    addLog("Le texte du socle est illisible à l’œil nu, mais le miroir d’acier peut encore en redresser les signes.");
    return render();
  }
  if (state.room === "lac") return addLog("Une sacoche d’archiviste est coincée entre les os. Son cuir porte le même emblème que ton sceau.");
  if (state.room === "conduit") return addLog("Le conduit aspire l’air vers l’antre. Un soufflet pourrait y pousser une poudre assez fine sans t’exposer au regard du dragon.", "clue");
  if (state.room === "tresor") return examineBooks();
  addLog(roomDescription());
}

function speak(command) {
  if (state.room !== "camp" || !includesAny(command, ["nain", "thane", "chef", "garde"])) return addLog("Seul l’écho te répond.");
  state.flags.dwarvesSpoken = true;
  addLog("Le thane parle bas : « Notre codex n’était ni cuir ni joyau. Il fut forgé pour survivre au feu. Prends ce sceau : la porte reconnaîtra notre mémoire. Reviens avec le vrai livre. »", "clue");
  render();
}

function read(command) {
  if (state.room === "forge" && includesAny(command, ["tablette", "plaque", "rune", "inscription"])) {
    state.flags.clueRivets = true;
    addLog("La tablette d’inventaire indique : « Codex des Ancêtres — dos de fer noir, sept rivets, un pour chaque clan. »", "clue");
    return render();
  }
  if (owns("frottis") && includesAny(command, ["frottis", "note", "parchemin", "papier"])) {
    state.flags.clueClasp = true;
    addLog("Le frottis montre le fermoir authentique : une montagne d’argent sans pierre précieuse. Une note ajoute : « Tout éclat de gemme est mensonge. »", "clue");
    return render();
  }
  addLog("Tu ne trouves rien de lisible ici.");
}

function take(command) {
  if (state.room === "forge" && includesAny(command, ["soufflet", "outil"])) {
    if (owns("soufflet")) return addLog("Le soufflet est déjà dans ton sac.");
    addItem("soufflet"); addLog("Tu prends le soufflet portatif.", "reward"); return render();
  }
  if (state.room === "forge" && includesAny(command, ["cendre", "poussiere", "suie"])) {
    if (owns("cendre")) return addLog("Tu as déjà recueilli assez de cendre.");
    addItem("cendre"); addLog("Tu remplis une petite bourse de cendre volcanique.", "reward"); return render();
  }
  if (state.room === "spores" && includesAny(command, ["spore", "champignon", "poussiere"])) {
    if (!state.flags.sporesExamined) return addLog("Mieux vaut examiner ces champignons avant de les toucher.", "warning");
    if (owns("spores")) return addLog("Ta bourse contient déjà assez de spores.");
    addItem("spores"); addLog("Tu recueilles les spores dormeuses sans respirer.", "reward"); return render();
  }
  if (state.room === "cristaux" && includesAny(command, ["miroir", "acier", "disque"])) {
    if (owns("miroir")) return addLog("Tu portes déjà le miroir d’acier.");
    addItem("miroir"); addLog("Tu décroches le miroir d’acier poli.", "reward"); return render();
  }
  if (state.room === "lac" && includesAny(command, ["sacoche", "frottis", "note", "papier"])) return searchSatchel();
  if (state.room === "tresor" && includesAny(command, ["grimoire", "livre", "codex"])) return takeBook(command);
  addLog("Tu ne peux pas prendre cela.");
}

function searchSatchel() {
  if (state.room !== "lac") return addLog("Tu ne vois aucune sacoche ici.");
  if (state.flags.satchelSearched) return addLog("La sacoche est vide.");
  state.flags.satchelSearched = true;
  state.flags.clueClasp = true;
  addItem("frottis");
  addLog("Dans la sacoche détrempée, tu sauves le frottis d’un fermoir : une montagne d’argent sans gemme. L’archiviste avait souligné : « Les pierres brillantes mentent. »", "clue");
  render();
}

function use(command) {
  if (state.room === "porte" && includesAny(command, ["sceau", "granit", "jeton"])) {
    if (state.flags.gateOpen) return addLog("La porte est déjà ouverte.");
    state.flags.gateOpen = true;
    addLog("Tu presses le sceau dans la cavité. Les rois de pierre baissent leurs marteaux et les battants s’écartent dans un grondement séculaire.", "reward");
    saveCheckpoint("la porte ouverte"); return render();
  }
  if (state.room === "cristaux" && includesAny(command, ["miroir", "acier"]) && includesAny(command, ["inscription", "socle", "rune", "texte"])) {
    if (!owns("miroir")) return addLog("Le miroir est encore fixé entre les cristaux.");
    state.flags.clueReflection = true;
    addLog("Dans le miroir, les signes se redressent : « Le vrai verbe boit la lumière. Ses runes ne rendent aucun reflet. »", "clue");
    return render();
  }
  if (state.room === "conduit" && includesAny(command, ["poudre", "spore"]) && includesAny(command, ["soufflet", "conduit", "grille", "air"])) {
    if (!owns("poudre")) return addLog("Il te faut d’abord préparer une poudre de sommeil.", "warning");
    if (!owns("soufflet")) return addLog("Sans soufflet, la poudre retomberait avant d’atteindre l’antre.", "warning");
    if (state.flags.dragonAsleep) return addLog("Le grondement régulier confirme que le dragon dort encore.");
    removeItem("poudre");
    state.flags.dragonAsleep = true;
    addLog("Tu verses la poudre dans le soufflet et l’injectes dans le conduit. Le grondement devient toux, puis un ronflement profond. La voie est libre — si tu ne touches pas au mauvais livre.", "reward");
    saveCheckpoint("le dragon endormi"); return render();
  }
  if (includesAny(command, ["miroir", "acier"]) && state.room === "tresor") return examineBooks(true);
  addLog("Cela ne produit aucun effet ici.");
}

function combine(command) {
  if (includesAny(command, ["spore", "champignon"]) && includesAny(command, ["cendre", "suie"])) {
    if (owns("poudre")) return addLog("La poudre de sommeil est déjà prête.");
    if (!owns("spores") || !owns("cendre")) return addLog("Il te faut à la fois des spores dormeuses et de la cendre volcanique.", "warning");
    removeItem("spores"); removeItem("cendre"); addItem("poudre"); state.flags.powderMade = true;
    addLog("Tu mêles les spores à la cendre. La poudre obtenue ne colle plus aux doigts et voyage au moindre souffle.", "reward");
    return render();
  }
  addLog("Ces éléments ne se combinent pas.");
}

function attack(command) {
  if (state.room !== "tresor" || !includesAny(command, ["dragon", "bete", "monstre"])) return addLog("Tu ne vois aucun adversaire à frapper.");
  if (state.flags.dragonDefeated) return addLog("Le Dragon Noir ne se relèvera pas.");
  if (!ownsSword()) return killPlayer("Le cœur de la fournaise", "Tu charges avec une arme ordinaire. Elle fond avant d’atteindre les écailles, et le souffle suivant t’efface jusqu’à l’ombre.");
  state.flags.dragonDefeated = true;
  state.flags.dragonAsleep = false;
  state.vigor = 1;
  addLog("Le Dragon Noir ouvre la gueule. Tu dresses l’Épée de l’Aube Muette : sa lame partage la flamme et t’ouvre un chemin au milieu du brasier. Le combat ébranle la caverne. Guidée par sa magie, l’épée dévie les griffes, trouve l’unique jointure sous le poitrail et perce le cœur du dragon. Tu restes debout, brûlé et épuisé, devant les quatre grimoires.", "reward");
  saveCheckpoint("le dragon vaincu"); render();
}

function examineBooks(withMirror = false) {
  if (state.room !== "tresor") return addLog("Aucun grimoire ne se trouve ici.");
  if (!state.flags.dragonDefeated && !state.flags.dragonAsleep) return addLog("Le Dragon Noir masque les pupitres de ses ailes. Il faut d’abord le vaincre — ou l’endormir.", "warning");
  state.flags.booksExamined = true;
  addLog("Le premier livre est en cuir rouge, frappé d’un soleil d’or. Le deuxième a un dos de fer noir à sept rivets et un fermoir d’argent en forme de montagne. Le troisième est noir lui aussi, mais six rivets entourent un œil de rubis. Le quatrième est relié d’os blanc et de saphirs.");
  if (withMirror && owns("miroir")) addLog("Dans le miroir, seules les runes du deuxième livre restent parfaitement noires : elles absorbent la lumière.", "clue");
  if (clueCount() === 3) addLog("Tous les indices concordent : le deuxième grimoire est le Codex des Ancêtres.", "reward");
  else addLog(`Il te manque encore ${3 - clueCount()} indice${clueCount() === 2 ? "" : "s"} pour choisir sans risquer le piège.`, "warning");
  render();
}

function takeBook(command) {
  if (!state.flags.dragonDefeated && !state.flags.dragonAsleep) return killPlayer("Le gardien du trésor", "Ta main atteint le premier pupitre. Le Dragon Noir est plus rapide.");
  const correct = includesAny(command, ["deuxieme", "second", "fer noir a sept", "sept rivet", "montagne d argent", "vrai", "authentique", "ancetre"]);
  const explicitlyWrong = includesAny(command, ["premier", "rouge", "soleil", "troisieme", "rubis", "sixieme", "quatrieme", "blanc", "os", "saphir"]);
  if (explicitlyWrong) return killPlayer("Le faux grimoire", state.flags.dragonAsleep ? "Le fermoir piégé claque comme une mâchoire. Le dragon ouvre les yeux avant que tu puisses retirer ta main." : "Une rune de garde explose sous tes doigts. Même mort, le dragon protège ses leurres.");
  if (!correct && clueCount() < 3) return addLog("Quatre livres t’attendent. Précise lequel tu prends, ou retrouve les trois indices avant de choisir.", "warning");
  if (!correct && clueCount() === 3) addLog("Guidé par les trois indices, tu écartes les leurres et saisis le deuxième livre.", "clue");
  addItem("grimoire");
  state.flags.won = true;
  window.ChroniclesInventory?.add("grimoire_runique");
  const route = state.flags.dragonDefeated ? "Derrière toi, le Dragon Noir ne bouge plus." : "Derrière toi, le Dragon Noir remue dans son sommeil, mais le véritable livre n’a déclenché aucun piège.";
  addLog(`Le grimoire de fer pèse comme une enclume. Ses pages s’illuminent lorsque ton sceau les touche. ${route} Tu regagnes le camp, où les Nains prononcent les noms oubliés de leurs ancêtres.`, "reward");
  render();
  endingText.textContent = state.flags.dragonDefeated ? "Grâce à l’Épée de l’Aube Muette, la flamme du dragon n’a pu t’arrêter. Le Codex est rendu aux Nains, qui inscrivent ton nom à la suite de leurs sept clans." : "Sans affronter le Dragon Noir, tu as transformé les secrets de la montagne en arme. Le Codex est rendu aux Nains avant que la bête ne comprenne ce qui lui a été volé.";
  window.setTimeout(() => endingDialog.showModal(), 8000);
}

function hint() {
  if (!state.flags.gateOpen) return addLog(state.flags.gateExamined ? "Le sceau de granit épouse la cavité de la porte." : "Examine la porte après avoir parlé au thane.", "system");
  if (!state.flags.clueRivets) return addLog("La tablette de la forge décrit la reliure du codex.", "system");
  if (!state.flags.clueReflection) return addLog("Prends le miroir de la galerie des échos et utilise-le sur l’inscription.", "system");
  if (!state.flags.clueClasp) return addLog("Fouille la sacoche près des ossements du lac.", "system");
  if (!ownsSword() && !state.flags.dragonAsleep) {
    if (!owns("spores") && !owns("poudre")) return addLog("Examine puis recueille les spores de la grotte des dormeuses.", "system");
    if (!owns("cendre") && !owns("poudre")) return addLog("La forge contient une cendre qui stabilise les spores.", "system");
    if (!owns("soufflet")) return addLog("Prends le soufflet de la forge.", "system");
    if (!owns("poudre")) return addLog("Mélange les spores dormeuses avec la cendre volcanique.", "system");
    return addLog("Au conduit des souffles, utilise la poudre avec le soufflet.", "system");
  }
  if (ownsSword() && !state.flags.dragonDefeated && !state.flags.dragonAsleep) return addLog("Entre dans l’antre et attaque le dragon avec l’Épée de l’Aube Muette.", "system");
  return addLog("Examine les quatre grimoires. Le vrai est le deuxième : fer noir, sept rivets, fermoir d’argent sans gemme et runes sans reflet.", "system");
}

function killPlayer(title, text) {
  if (state.pendingDeath) return;
  state.pendingDeath = true;
  state.deaths += 1;
  deathTitle.textContent = title;
  deathText.textContent = text;
  screenEl.classList.add("is-dead");
  addLog(text, "warning");
  render();
  window.setTimeout(() => deathDialog.showModal(), 8000);
}

function submitCommand(raw) {
  if (state.flags.won || state.pendingDeath) return;
  const command = normalize(raw);
  if (!command) return;
  ensureAudio(); playEffect(220, 0.035);
  addLog(`> ${raw}`, "command");
  state.commands += 1;

  const directionMap = { n: "nord", nord: "nord", s: "sud", sud: "sud", e: "est", est: "est", o: "ouest", ouest: "ouest" };
  const words = command.split(" ");
  const direction = words.map((word) => directionMap[word]).find(Boolean);
  if (direction && (words.length === 1 || includesAny(command, ["aller", "va", "marcher", "prendre le chemin", "entrer", "retourner"]))) move(direction);
  else if (includesAny(command, ["aide", "commandes"])) addLog("Commandes utiles : REGARDER, EXAMINER, PARLER, PRENDRE, LIRE, UTILISER, MÉLANGER, FOUILLER, ATTAQUER, INVENTAIRE, INDICE et les directions NORD, SUD, EST, OUEST.", "system");
  else if (includesAny(command, ["indice", "aide moi", "bloque"])) hint();
  else if (includesAny(command, ["inventaire", "objets", "reliques"]) || command === "sac" || command === "voir mon sac") {
    const labels = state.inventory.map((id) => ITEM_LABELS[id]);
    const relics = window.ChroniclesInventory?.list().map((id) => window.ChroniclesInventory.labels[id]) || [];
    addLog(`Tu portes : ${[...labels, ...relics.filter((label) => !labels.includes(label))].join(", ").toLowerCase()}.`);
  }
  else if (includesAny(command, ["regarder", "observer", "decrire", "autour"]) && !includesAny(command, ["examiner", "prendre"])) addLog(roomDescription());
  else if (includesAny(command, ["parler", "questionner", "demander", "ecouter"])) speak(command);
  else if (includesAny(command, ["melanger", "combiner", "assembler", "preparer", "fabriquer"])) combine(command);
  else if (includesAny(command, ["attaquer", "frapper", "combattre", "tuer", "affronter", "transpercer"])) attack(command);
  else if (includesAny(command, ["fouiller", "chercher dans"]) && state.room === "lac") searchSatchel();
  else if (includesAny(command, ["lire", "dechiffrer", "consulter"])) read(command);
  else if (includesAny(command, ["prendre", "ramasser", "recueillir", "saisir", "voler", "decrocher"])) take(command);
  else if (includesAny(command, ["utiliser", "poser", "placer", "mettre", "verser", "souffler", "injecter", "montrer"])) use(command);
  else if (includesAny(command, ["examiner", "inspecter", "etudier", "observer"])) examine(command);
  else addLog("La montagne ne comprend pas cette formulation. Essaie AIDE pour voir les verbes utiles.", "warning");
  render();
}

function ensureAudio() {
  if (!soundEnabled) return;
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === "suspended") audioContext.resume();
  if (!musicTimer) scheduleMusic();
}

function playEffect(frequency, duration, type = "square", volume = 0.025) {
  if (!soundEnabled || !audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type; oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
}

function scheduleMusic() {
  if (!soundEnabled || !audioContext) { musicTimer = null; return; }
  const melody = [82, 110, 98, 73, 82, 123, 110, 65];
  playEffect(melody[musicStep % melody.length], 0.55, "triangle", 0.014);
  if (musicStep % 4 === 0) playEffect(41, 0.8, "sine", 0.012);
  musicStep += 1;
  musicTimer = window.setTimeout(scheduleMusic, 720);
}

function setSound(enabled) {
  soundEnabled = enabled;
  soundButton.textContent = `Son + musique : ${enabled ? "oui" : "non"}`;
  soundButton.setAttribute("aria-pressed", String(enabled));
  if (enabled) ensureAudio();
  else if (musicTimer) { window.clearTimeout(musicTimer); musicTimer = null; }
}

function resetGame() {
  state = initialState(); checkpoint = cloneState(state); checkpointLabel = "le camp des Nains";
  gameLog.replaceChildren();
  if (endingDialog.open) endingDialog.close();
  if (deathDialog.open) deathDialog.close();
  screenEl.classList.remove("is-dead");
  addLog("MONTAGNE DE KARDÛN, AUTOMNE 1990. Le Dragon Noir dort sur les archives volées aux sept clans. Les Nains te chargent de pénétrer dans ses galeries et de rapporter leur grimoire runique. Quatre livres l’attendent dans le trésor, mais trois sont des leurres mortels.", "system");
  if (ownsSword()) addLog("À ton côté, l’Épée de l’Aube Muette frémit : elle se souvient des créatures de l’ombre et peut te donner une chance contre le dragon.", "reward");
  else addLog("Tu n’as aucune lame capable de traverser les écailles du dragon. Il faudra entrer et ressortir sans l’affronter.", "warning");
  showRoom();
}

commandForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = commandInput.value.trim();
  commandInput.value = "";
  submitCommand(value);
  commandInput.focus();
});
restartButton.addEventListener("click", resetGame);
playAgainButton.addEventListener("click", resetGame);
deathRestartButton.addEventListener("click", resetGame);
continueButton.addEventListener("click", () => {
  state = cloneState(checkpoint); state.pendingDeath = false;
  deathDialog.close(); screenEl.classList.remove("is-dead"); gameLog.replaceChildren();
  addLog(`Tu reprends conscience à ${checkpointLabel}. La montagne t’accorde une nouvelle tentative.`, "system"); showRoom();
});
soundButton.addEventListener("click", () => setSound(!soundEnabled));
document.addEventListener("pointerdown", ensureAudio, { once: true });
document.addEventListener("keydown", ensureAudio, { once: true });

resetGame();
