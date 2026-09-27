/* Valombre : moteur déterministe, sans réseau ni DOM. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Valombre = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const LIMIT = 50;
  const normalize = text => String(text).toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’'-]/g, " ").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const rooms = {
    porte: { title: "La Porte des Cendres", image: "assets/e5-v3-01-porte.png", exits: { nord: "place" } },
    place: { title: "La place des Veilleurs", image: "assets/e5-v3-02-place.png", exits: { sud: "porte", ouest: "forge", est: "archives", nord: "caserne" } },
    forge: { title: "La forge des Chaînes", image: "assets/e5-v3-03-forge.png", exits: { est: "place" } },
    archives: { title: "Les archives du Siège", image: "assets/e5-v3-04-archives.png", exits: { ouest: "place" } },
    caserne: { title: "Le poste de garde", image: "assets/e5-v3-05-caserne.png", exits: { sud: "place", nord: "galerie" } },
    geole: { title: "La geôle sous la citerne", image: "assets/e5-v3-06-geole.png", exits: {} },
    galerie: { title: "La galerie des Serments", image: "assets/e5-v3-07-galerie.png", exits: { sud: "caserne", ouest: "tour", nord: "trone" } },
    tour: { title: "La tour du Contrepoids", image: "assets/e5-v3-08-tour.png", exits: { est: "galerie" } },
    trone: { title: "La salle du Trône", image: "assets/e5-v3-09-trone.png", exits: { sud: "galerie" } }
  };
  const items = { mandat: "Mandat du Conseil libre", pain: "Miche de pain", jeton: "Jeton des résistants", manteau: "Manteau de service", entraves: "Entraves de fer", ordre: "Ordre de trahison signé", clou: "Clou de fer", cles: "Clés de Valombre" };
  const clues = {
    mission: "Capturer Edran Veyl VIVANT : son procès révélera les complices de l’Ombre. Oren rassemblera les résistants au signal de la herse.",
    reseau: "Borin travaille à la forge, à l’ouest de la place. Ardel conserve les archives, à l’est.",
    ordre: "Edran Veyl a signé l’ordre d’ouvrir la porte de l’Est. Le mot de garde inscrit au verso est : LA PIERRE SE SOUVIENT.",
    piege: "Sur la coupe du palais, un câble relie la manivelle de la tour au contrepoids de la herse ; une détente rouge apparaît près du trône.",
    medaillon: "La pierre noire renvoie les volontés hostiles. L’inscription dit : « Son pouvoir ne règne que là où porte son regard. »"
  };
  const spellNames = { lumiere: "Lumière", feu: "Boule de feu", esprit: "Manipulation mentale" };
  function create(options = {}) {
    const s = { room: "porte", turns: 0, limit: LIMIT, inventory: ["mandat", "pain"], clues: [], magic: !!options.grimoire,
      spells: { lumiere: 1, feu: 1, esprit: 1 }, won: false, dead: false, captures: 0, flags: {}, stage: 0,
      memory: Object.fromEntries(["oren", "ysilde", "borin", "ardel", "garde"].map(id => [id, { met: false, angry: false, threats: 0, helped: false, apologies: 0 }])) };
    let output = [], pendingCapture = false;
    const say = (text, tone = "narration") => output.push({ text, tone });
    const owns = id => s.inventory.includes(id);
    const add = id => { if (!owns(id)) s.inventory.push(id); };
    const remove = id => { s.inventory = s.inventory.filter(x => x !== id); };
    const note = id => { if (!s.clues.includes(id)) { s.clues.push(id); say("CARNET — " + clues[id], "clue"); } };
    const npc = () => ({ porte: "oren", place: "ysilde", forge: "borin", archives: "ardel", caserne: "garde" })[s.room];
    const names = { oren: "Oren", ysilde: "Ysilde", borin: "Borin", ardel: "Ardel", garde: "Le sergent" };
    function capture(reason) {
      s.captures++; s.flags.confiscated = [...s.inventory]; s.inventory = [];
      s.flags.grille = false; s.flags.passed = false; s.flags.cloakOn = false;
      s.flags.calmGuard = false; s.stage = 0; s.room = "geole";
      say(reason + " Les soldats te maîtrisent et te jettent dans la geôle. Le transfert te coûte 4 actions. Tu entends les soldats déposer tes affaires dans la réserve voisine.", "danger");
      say(describe()); return 4;
    }
    function describe() {
      const descriptions = {
        porte: "La pluie noircit les pierres de Valombre. Oren veille sous la poterne, une main cachée dans son manteau. " + (s.flags.entry ? "La porte du nord est entrouverte." : "Derrière lui, la porte du nord reste close."),
        place: "Une fontaine brisée domine les étals vides. Ysilde veille près d’un four éteint ; des enfants se serrent contre elle. " + (s.memory.ysilde.helped ? "Elle t’adresse un sourire fatigué." : "Une odeur de pain froid flotte encore sous l’auvent.") + " La forge est à l’ouest, les archives à l’est, le poste de garde au nord et la poterne au sud.",
        forge: "Borin se tient devant l’enclume. Un seau d’eau repose au pied du billot ; les soufflets sont secs et craquelés. " + (owns("entraves") ? "Des traces de vapeur mouillent les outils." : s.flags.forged ? "Deux bracelets de fer sont reliés par une chaîne. Leurs rivets rougeoient." : "Une chaîne inachevée dépasse de son tablier.") + " La place est à l’est.",
        archives: "Des liasses encombrent une salle presque sans fenêtres. Ardel garde un registre sur son pupitre. " + (s.flags.archiveAccess ? (s.flags.lit ? "Une clarté runique révèle les lignes effacées." : "Le volume est ouvert. Dans cette obscurité, déchiffrer son encre pâle est un travail long et fatigant." + (s.flags.archiveReads ? " Tu as distingué " + s.flags.archiveReads + " fragment" + (s.flags.archiveReads > 1 ? "s" : "") + "." : "")) : "Sa main reste posée sur la couverture.") + " La place est à l’ouest.",
        caserne: "Un sergent interroge les domestiques dans la pénombre. Chacun porte le même manteau gris. Des archers scrutent la cour à travers les meurtrières. " + (s.flags.passed ? "Le sergent te reconnaît et s’écarte." : s.turns >= 30 ? "Depuis la relève, chaque contrôle prend cinq actions." : "Les contrôles prennent trois actions.") + " La galerie est au nord, la place au sud.",
        geole: "L’eau suinte sous une porte ferrée. Une gamelle gît près d’une planche fendue, d’où dépasse un clou. Au ras du sol, une grille rouillée laisse passer un courant d’air. " + (s.flags.grille ? "Le conduit est ouvert." : "Le cadre se décolle légèrement de la pierre."),
        galerie: "Des visages sévères veillent dans leurs cadres. Le portrait d’Edran porte un médaillon noir ; une inscription court sur son cadre. En face, une tapisserie représente le palais en coupe. La tour est à l’ouest, le trône au nord et le poste de garde au sud.",
        tour: "Un contrepoids immense pend au-dessus d’un treuil. Les chaînes disparaissent dans le mur du palais. " + (s.flags.armed ? "Le câble est tendu ; le mécanisme reste suspendu dans un silence pesant." : s.flags.thawed ? "L’eau ruisselle sur les dents de fer dégagées." : "Le givre enserre les dents de fer. Une marque de main use la manivelle ; la tourner en l’état demanderait cinq actions.") + " La galerie est à l’est.",
        trone: s.stage === 0 ? "Edran Veyl attend devant son trône, entouré de soldats. Au-delà du balcon, une colonne de torches serpente dans la vallée. Un levier rouge dépasse du mur. « Qui ose troubler mon audience ? » La galerie est au sud." : s.stage === 1 ? "« Oui, j’ai ouvert les portes. Les vainqueurs écrivent les lois ! » Edran recule vers ses soldats. L’un d’eux hésite, lance baissée. Le levier rouge tremble sous les vibrations du plancher." : s.stage === 2 ? "Derrière la herse, les soldats crient. Edran lève son médaillon : « À genoux. » La pierre noire pulse au rythme de sa voix. Tes jambes commencent à fléchir." : "Sous le manteau, la pierre s’est tue. Edran tombe à genoux contre la marche du trône. Sa main cherche encore un poignard ; ses poignets sont à découvert."
      };
      return descriptions[s.room] + (npc() && s.memory[npc()].angry ? " " + names[npc()] + " détourne les yeux et garde le silence." : "");
    }
    function objective() {
      if (s.won) return "Edran est capturé vivant. Valombre pourra le juger.";
      if (s.dead) return "Les renforts ont atteint Valombre. La mission a échoué.";
      if (s.room === "geole") return "Sortir de la geôle et reprendre la mission.";
      return "Capturer Edran Veyl vivant avant l’arrivée de ses renforts.";
    }
    function hints() {
      if (npc() && s.memory[npc()].angry) return "Dis « présenter mes excuses à " + names[npc()] + " ». Le personnage se souvient de tes menaces ; ne recommence pas.";
      if (s.room === "geole") return !owns("clou") ? "Prends le clou sous la gamelle." : !s.flags.grille ? "Soulève la grille avec le clou." : "Rampe dans le conduit. Tu récupéreras tes affaires et retrouveras la place.";
      if (!s.flags.entry) return "Montre ton mandat à Oren, à la porte. Il te donnera le jeton des résistants.";
      if (!owns("manteau")) return "Donne ta miche de pain à Ysilde sur la place. Elle te confiera le manteau de service.";
      if (!owns("entraves")) return s.flags.forged ? "À la forge : verser l’eau sur les entraves." : "À la forge : montrer le jeton à Borin.";
      if (!owns("ordre")) return s.flags.archiveAccess ? "Lis le registre aux archives. Sans sort, cela coûte cinq actions ; c’est prévu et tout à fait possible." : "Montre le jeton à Ardel aux archives, puis lis le registre.";
      if (!s.flags.passed && !["galerie", "tour", "trone"].includes(s.room)) return "Mets le manteau. Au poste de garde, dis « la pierre se souvient ». Le mot est consigné dans ton carnet.";
      if (!s.clues.includes("medaillon")) return "Dans la galerie : examiner le portrait. Il révèle le danger du médaillon et comment le neutraliser.";
      if (!s.clues.includes("piege")) return "Dans la galerie : examiner la tapisserie. Elle explique comment isoler le régent.";
      if (!s.flags.armed) return "Dans la tour : tourner le treuil. Sans magie, l’effort coûte cinq actions. Ce n’est pas une impasse.";
      return ["Gagne la salle du Trône et écris « accuser le régent » : tu as le mandat et l’ordre signé.", "Tirer le levier rouge.", "Jeter le manteau sur le médaillon.", "Mettre les entraves au régent."][s.stage];
    }
    function social(id, c) {
      const m = s.memory[id];
      if (/menac|insult|idiot|imbecile/.test(c)) {
        m.threats++; m.angry = true;
        if (id === "garde" || m.threats >= 2) return capture(names[id] + " n’a pas oublié tes menaces et appelle la patrouille.");
        say(names[id] + " recule : « Plus un mot. Excuse-toi, ou je préviens les soldats si tu me menaces encore. »"); return 1;
      }
      if (/excuse|pardon|desole/.test(c)) {
        if (!m.angry) { say("« Nous n’avons pas de querelle à régler. »"); return 0; }
        m.angry = false; m.apologies++; say("« J’accepte tes excuses. Je t’aiderai, mais je n’oublie pas ce qui s’est passé. »"); return 1;
      }
      if (m.angry) { say(names[id] + " refuse : « Des excuses, d’abord. Une nouvelle menace et j’appelle la garde. »"); return 0; }
      const lines = {
        oren: m.helped ? "« Je prépare les résistants. Quand la herse du trône tombera, nous prendrons les portes. Ramène Edran vivant : nous voulons un procès, pas un martyr. »" : "« Le Conseil devait m’envoyer quelqu’un. Les promesses ne suffisent plus : je veux savoir qui t’envoie. »",
        ysilde: m.helped ? "« Ton pain a nourri les enfants. Le manteau te fera passer pour un domestique ; aux archives, Ardel connaît le mot de garde. »" : "« Mon frère servait au palais. Il n’est jamais revenu. Les enfants n’ont rien mangé depuis hier. »",
        borin: owns("entraves") ? "« Tu as refroidi les rivets. Ces entraves résisteront même à Edran. Garde-le vivant. »" : s.flags.forged ? "« Même la meilleure poigne ne supporte pas le fer rouge. »" : "« Le jeton d’Oren me dira si je peux te faire confiance. »",
        ardel: owns("ordre") ? "« Tu emportes ma preuve. Le mot est au verso : la pierre se souvient. Et prends garde au médaillon du régent. »" : "« Montre le jeton, puis lis le registre. L’ordre d’ouvrir les portes y porte sa signature. L’encre est devenue bien pâle. »",
        garde: s.flags.passed ? "« Déjà contrôlé. Circule. »" : "« Ton service ? Et le mot de garde ? » Son regard passe de tes vêtements aux archers."
      };
      say((m.met ? names[id] + " te reconnaît. " : "") + lines[id]); const cost = m.met ? 0 : 1; m.met = true; return cost;
    }
    function cast(id) {
      if (!s.magic) { say("Tu ne connais pas ces sorts. Ils sont enseignés après la réussite de l’épisode IV. Cette mission se résout entièrement sans magie."); return 0; }
      if (!s.spells[id]) { say(spellNames[id] + " a déjà été utilisé dans cette quête. Il ne peut pas être relancé."); return 0; }
      const contexts = { lumiere: ["archives", "caserne"], feu: ["tour", "forge", "trone"], esprit: ["caserne", "trone"] };
      if (!contexts[id].includes(s.room)) { say("Aucune cible pertinente ici : tu retiens le sort, qui reste disponible."); return 0; }
      if (id === "esprit" && s.room === "trone" && s.stage === 3) { say("Son médaillon est couvert et le régent est à ta merci. Inutile de gaspiller un sort : pose les entraves. Ta charge reste disponible."); return 0; }
      s.spells[id] = 0;
      if (id === "lumiere" && s.room === "archives") { s.flags.lit = true; say("LUMIÈRE — Les lettres effacées se détachent sur le papier. Une seule nouvelle lecture suffira à achever le déchiffrage, même si tu l’avais déjà commencé. Le sort est désormais épuisé.", "reward"); return 1; }
      if (id === "lumiere") return 1 + capture("LUMIÈRE — Ton halo te désigne aux archers. Le sergent donne l’alarme. Le sort est consommé.");
      if (id === "feu" && s.room === "tour") { s.flags.thawed = true; say("BOULE DE FEU — Un éclair frappe le fer. Le givre devient vapeur. Il faut encore tourner le treuil, mais une action suffira au lieu de cinq. Le sort est épuisé.", "reward"); return 1; }
      if (id === "feu" && s.room === "trone") { say("BOULE DE FEU — La flamme fond sur Edran, mais une amulette écarlate brille sous sa robe. Le feu se courbe autour de lui et se dissipe contre les murs. Le régent n’a pas bougé ; ton sort est épuisé.", "danger"); return 1; }
      if (id === "feu") { s.memory.borin.angry = true; say("BOULE DE FEU — Les soufflets s’embrasent ! Borin étouffe le feu avec sa couverture ; tu l’aides pendant trois actions. « Je t’avais prévenu. Excuse-toi avant de me demander quoi que ce soit. » Le seau et les entraves sont intacts. Ton sort est épuisé.", "danger"); return 4; }
      if (s.room === "caserne") { s.flags.calmGuard = true; say("MANIPULATION MENTALE — Le sergent oublie sa méfiance. Le contrôle ne prendra qu’une action. Il te faut toujours le manteau et le mot de garde. Le sort est épuisé.", "reward"); return 1; }
      return 1 + capture("MANIPULATION MENTALE — Le médaillon noir renvoie ta volonté contre toi. Tu t’agenouilles malgré toi. Edran appelle ses hommes. Le sort est consommé.");
    }
    function dispatch(c) {
      if (/^(aide|commandes)$/.test(c)) { say("But : capturer Edran VIVANT avant la fin des 50 actions. Déplacements et actions réussies coûtent 1 action, sauf coût annoncé. REGARDER, INDICE, CARNET, INVENTAIRE, les observations sans découverte et les commandes incomprises ne coûtent rien. Les dialogues déjà entendus non plus. Une capture coûte 4 actions, puis il faut s’évader. Les trois sorts sont facultatifs et utilisables chacun une seule fois.", "system"); return 0; }
      if (/^(indice|aide moi|je suis bloque)$/.test(c)) { say(hints(), "system"); return 0; }
      if (/^(regarder|observer|description|lieu|regarder autour(?: de moi)?|ou suis je)$/.test(c)) { say(describe()); return 0; }
      if (/^(carnet|preuves|indices|(?:lire|consulter) (?:le |mon )?carnet)$/.test(c)) { say(s.clues.map(id => clues[id]).join("\n") || "Aucun indice découvert."); return 0; }
      if (/^(inventaire|sac|voir mon sac)$/.test(c)) { say(s.inventory.map(id => items[id]).join(", ") || "Tes affaires sont confisquées. Elles sont récupérables à la sortie du conduit."); return 0; }
      if (/^(sorts|sortileges|magie)$/.test(c)) { say(s.magic ? Object.keys(spellNames).map(id => spellNames[id] + " : " + (s.spells[id] ? "1 utilisation" : "épuisé")).join(" · ") + ". Lis les lieux avant de lancer un sort. Chacun a un usage favorable et un usage dangereux." : "La réussite de l’épisode IV donne accès aux trois sorts. Aucun n’est nécessaire pour réussir."); return 0; }
      if (/^(attendre|patienter)$/.test(c)) { say("La colonne de renforts continue d’avancer vers Valombre."); return 1; }
      const spell = /^(?:(?:je )?(?:lance|lancer|jette|jeter|utilise|utiliser|invoque|invoquer) (?:le sort (?:de |d )?|une? )?)?(lumiere(?: runique)?|boule de feu|manipulation mentale)(?:\b.*)$/.exec(c);
      if (spell) return cast(spell[1].startsWith("lumiere") ? "lumiere" : spell[1] === "boule de feu" ? "feu" : "esprit");
      const dir = /^(?:(?:je )?(?:vais|va|aller|marcher|retourner|revenir)(?: vers| au| a l)? )?(nord|sud|est|ouest|n|s|e|o)$/.exec(c);
      if (dir) {
        const d = ({ n: "nord", s: "sud", e: "est", o: "ouest" })[dir[1]] || dir[1], dest = rooms[s.room].exits[d];
        if (!dest) { say(s.room === "geole" ? "La porte est verrouillée. Une odeur de poussière monte du sol." : "Pas de passage par là. Sorties : " + Object.keys(rooms[s.room].exits).join(", ") + "."); return 0; }
        if (s.room === "porte" && !s.flags.entry) { say("Oren te barre le passage, sans lâcher son arme."); return 0; }
        if (s.room === "caserne" && dest === "galerie" && !s.flags.passed) { say("Le sergent abaisse sa lance devant toi."); return 0; }
        if (dest === "trone" && (!owns("entraves") || !owns("ordre") || !owns("mandat") || !owns("manteau") || !s.flags.armed || !s.clues.includes("medaillon") || !s.clues.includes("piege"))) { say("Tu t’arrêtes avant le seuil : tu ne te sens pas encore prêt à cette arrestation. "); return 0; }
        if (s.room === "trone" && s.stage > 0) { say("Tu ne peux plus reculer : le régent est sur le point de reprendre l’avantage. "); return 0; }
        s.room = dest; say(describe()); return 1;
      }
      const inspect = /^(?:(?:je )?(?:examine|examiner|observe|observer|inspecte|inspecter|regarde|regarder|etudier|fouiller|cherche|chercher|lire|lis|dechiffrer|dechiffre|consulter))\b/.test(c);
      const take = /^(?:(?:je )?(?:prends|prendre|ramasser|ramasse|recuperer|saisir|emporter))\b/.test(c);
      const use = /^(?:(?:je )?(?:utilise|utiliser|donne|donner|rendre|remettre|montrer|montre|presenter|presente|poser|pose|mettre|mets|enfiler|enfile|porter|porte|verser|verse|refroidir|refroidis|tremper|jeter|jette|lancer|lance|couvrir|couvre|cacher|tirer|tire|abaisser|baisser|actionner|tourner|tourne|armer|arme|attacher|entraver|menotter|capturer|arreter|soulever|souleve|ouvrir|ouvre|forcer|enlever|retirer))\b/.test(c);
      if (s.room === "caserne" && /\b(?:sergent|garde)\b/.test(c) && /\b(?:attaqu\w*|frapp\w*|tu(?:e|er|ons|ez)|poignard\w*|agress\w*|bless\w*|assomm\w*|charg\w*|fonce\w*|saute\w*|jette\w*|coup|etrangl\w*|egorg\w*|epee|dague)\b/.test(c)) {
        return capture("Tu attaques le sergent. Il pare le coup et la patrouille surgit des arcades.");
      }
      if (inspect) {
        if (s.room === "archives" && (/registre|ordre|livre|signature/.test(c) || /^(?:je )?(?:lire|lis|dechiffrer|dechiffre|consulter)$/.test(c))) {
          if (s.memory.ardel.angry) return social("ardel", c);
          if (!s.flags.archiveAccess) { say("Ardel pose sa main sur le registre : « Montre le jeton d’Oren. »"); return 0; }
          if (owns("ordre")) { say(clues.ordre); return 0; }
          if (s.flags.lit) {
            s.flags.archiveReads = 5; add("ordre"); note("ordre");
            say("Dans la lumière runique, toutes les lignes restantes apparaissent. Tu lis l’ordre d’ouvrir la porte, la signature d’Edran et le mot inscrit au verso : « LA PIERRE SE SOUVIENT. » Tu détaches la preuve du registre.", "reward"); return 1;
          }
          s.flags.archiveReads = (s.flags.archiveReads || 0) + 1;
          const fragments = [
            "Après un long effort, tu distingues le début du mot au verso : « LA… » Tes yeux brûlent déjà dans l’obscurité.",
            "Une nouvelle ligne se précise lentement : « LA PIERRE… » La lecture te fatigue.",
            "Tu suis l’encre du doigt et déchiffres : « LA PIERRE SE… » Il reste encore des caractères effacés.",
            "Tu arraches un autre fragment à la pénombre : « LA PIERRE SE SOU… » Tes yeux peinent à rester ouverts.",
            "Enfin, le texte entier apparaît : « LA PIERRE SE SOUVIENT. » L’ordre d’ouvrir la porte porte la signature d’Edran Veyl. Tu détaches cette preuve du registre."
          ];
          say(fragments[s.flags.archiveReads - 1], s.flags.archiveReads === 5 ? "reward" : "narration");
          if (s.flags.archiveReads === 5) { add("ordre"); note("ordre"); }
          return 1;
        }
        if (s.room === "galerie" && /portrait|tableau|medaillon|regent/.test(c)) { if (s.clues.includes("medaillon")) { say(clues.medaillon); return 0; } say("Une annotation au dos du portrait prévient : « La pierre noire renvoie la volonté de celui qui l’attaque. Son pouvoir ne règne que là où porte son regard. »"); note("medaillon"); return 1; }
        if (s.room === "galerie" && /tapisserie|herse|mecanisme/.test(c)) { if (s.clues.includes("piege")) { say(clues.piege); return 0; } say("La tapisserie représente la herse de sûreté : la manivelle de la tour arme le contrepoids ; le levier rouge du trône la libère. Oren reconnaîtra son fracas."); note("piege"); return 1; }
        if (s.room === "geole") { say("Le cadre rouillé tient à peine, mais tes doigts ne passent pas dessous. Au-delà, le conduit est assez large pour un homme. Sous la gamelle, la tête plate du clou est visible."); return 0; }
        if (/mandat/.test(c) && owns("mandat")) { say("Le Conseil libre ordonne l’arrestation d’Edran Veyl, vivant, pour son procès. Oren doit vérifier le sceau."); return 0; }
        say(describe()); return 0;
      }
      if (s.room === "geole") {
        if (take && /clou/.test(c)) { if (owns("clou")) { say("Tu tiens déjà le clou."); return 0; } add("clou"); say("Tu arraches le clou sous la gamelle. Il est assez solide pour faire levier."); return 1; }
        if (use && /grille|clou/.test(c)) { if (!owns("clou")) { say("Tes doigts glissent sur le bord du cadre."); return 0; } if (s.flags.grille) { say("Le conduit est déjà ouvert."); return 0; } s.flags.grille = true; say("Tu glisses le clou sous le cadre et soulèves la grille rouillée. Le conduit est libre."); return 1; }
        if (/^(ramper|rampe|s evader|m evader|evader|sortir|entrer|passer|emprunter|fuir|je rampe)/.test(c)) { if (!s.flags.grille) { say("La grille bloque encore le conduit."); return 0; } s.inventory = [...s.flags.confiscated]; s.flags.confiscated = []; s.room = "place"; say("Tu rampes derrière les réserves, récupères toutes tes affaires et débouches sur la place. La patrouille ignore ton évasion. Les habitants, eux, se souviennent toujours de toi. Trois actions d’évasion ont passé.", "reward"); say(describe()); return 1; }
        say("Cette tentative ne donne rien. L’eau continue de tomber derrière les pierres."); return 0;
      }
      // Les interactions valident la présence du PNJ, sa mémoire et les objets réellement possédés.
      if (use && /mandat|sceau/.test(c) && s.room === "porte") {
        if (s.memory.oren.angry) return social("oren", c);
        if (s.flags.entry) { say("Oren a déjà vérifié ton mandat ; tu conserves le document pour l’arrestation."); return 0; }
        s.flags.entry = true; s.memory.oren.helped = true; add("jeton"); note("mission"); note("reseau"); say("Oren examine le sceau, puis ouvre la poterne et te donne le jeton des résistants.", "reward"); return 1;
      }
      if (use && /pain|miche|nourriture/.test(c) && s.room === "place") {
        if (s.memory.ysilde.angry) return social("ysilde", c);
        if (!owns("pain")) { say("Ysilde a déjà partagé ton pain. Elle n’oublie pas ton aide."); return 0; }
        remove("pain"); add("manteau"); s.memory.ysilde.helped = true; say("Ysilde partage le pain, puis sort un manteau : « Celui de mon frère, domestique au palais. Il le portait pour son service. Merci : tu as commencé par aider, pas par promettre. »", "reward"); return 1;
      }
      if (use && /jeton/.test(c) && ["forge", "archives"].includes(s.room)) {
        const id = npc(); if (s.memory[id].angry) return social(id, c);
        if (!owns("jeton")) { say("Tu n’as pas le jeton. Oren le remet après avoir vu ton mandat."); return 0; }
        if (s.memory[id].helped) { say(names[id] + " reconnaît le jeton et se souvient de toi. " + (id === "borin" ? "Les rivets dégagent encore de la chaleur." : "Tu peux lire le registre.")); return 0; }
        s.memory[id].helped = true;
        if (id === "borin") { s.flags.forged = true; say("Borin reconnaît le jeton et ferme les derniers rivets. « Voilà tes entraves. Les rivets sont encore brûlants. »"); }
        else { s.flags.archiveAccess = true; say("Ardel écarte la couverture : « Lis cet ordre. La signature d’Edran le condamne ; le mot de garde est au verso. »"); }
        return 1;
      }
      if (use && /\b(?:eau|seau|refroidir|refroidis|refroid|tremper|trempe)\b/.test(c) && s.room === "forge") {
        if (s.memory.borin.angry) return social("borin", c);
        if (!s.flags.forged) { say("Borin n’a pas encore préparé les entraves. Montre-lui le jeton."); return 0; }
        if (owns("entraves")) { say("Les entraves sont déjà refroidies dans ton sac."); return 0; }
        add("entraves"); say("Tu verses l’eau sur les rivets. Une vapeur blanche monte ; tu emportes les entraves désormais froides.", "reward"); return 1;
      }
      if (take && /entrave|menotte/.test(c) && s.room === "forge") { say(owns("entraves") ? "Tu les portes déjà." : "Borin garde un œil sur son ouvrage ; le fer est encore brûlant."); return 0; }
      if (use && /manteau|deguisement/.test(c) && s.room !== "trone") {
        if (!owns("manteau")) { say("Tu ne possèdes pas ce vêtement."); return 0; }
        if (s.flags.cloakOn) { say("Tu portes déjà le manteau de service."); return 0; }
        s.flags.cloakOn = true;
        const hidden = [["mandat", "ton mandat"], ["entraves", "tes entraves"], ["ordre", "l’ordre signé"]].filter(([id]) => owns(id)).map(([, label]) => label);
        say("Tu enfiles le manteau de service." + (hidden.length ? " " + (hidden.length === 1 ? hidden[0][0].toUpperCase() + hidden[0].slice(1) + " reste dissimulé dessous." : hidden.slice(0, -1).join(", ") + " et " + hidden.at(-1) + " restent dissimulés dessous.") : "")); return 1;
      }
      if (s.room === "caserne" && (/^(?:(?:je )?(?:dire|dis|prononcer|repondre|reponds|donner) (?:le mot (?:de passe )?)?)?(?:la )?pierre se souvient$/.test(c) || /^(dire|donner|prononcer) le mot de (passe|garde)$/.test(c))) {
        if (s.memory.garde.angry) return social("garde", c);
        if (!s.flags.cloakOn) { say("Le sergent détaille tes habits : « Tu n’es pas du service. »"); return 0; }
        if (!owns("ordre")) { say("Tu dois avoir lu le registre : il contient la preuve nécessaire et le mot de garde."); return 0; }
        if (s.flags.passed) { say("Le sergent te reconnaît et laisse le passage libre."); return 0; }
        const cost = s.flags.calmGuard ? 1 : s.turns >= 30 ? 5 : 3;
        s.flags.passed = true; s.memory.garde.helped = true; say("« La pierre se souvient. » Le sergent vérifie ton passage pendant " + cost + " action" + (cost > 1 ? "s" : "") + ", puis ouvre la galerie au nord.", "reward"); return cost;
      }
      if (s.room === "tour" && (/^(?:(?:je )?(?:fais|faire) )?(?:tourner|tourne|actionner|actionne|armer|arme|manoeuvrer|manoeuvre) (?:la |le )?(?:manivelle|treuil|contrepoids)$/.test(c) || (use && /treuil|manivelle|contrepoids/.test(c)))) {
        if (s.flags.armed) { say("Le contrepoids est déjà armé. Le levier du trône attend."); return 0; }
        s.flags.armed = true; say(s.flags.thawed ? "La manivelle tourne sans résistance. Le piège est prêt. (+1 action)" : "Tu tournes lentement la manivelle. Le givre craque, dent après dent. Cinq actions d’effort plus tard, le contrepoids est armé.", "reward"); return s.flags.thawed ? 1 : 5;
      }
      if (s.room === "trone") {
        if (/^(?:je )?(accuser|accuse|confondre|denoncer|demasquer|presenter|presente|montrer|montre|arreter)/.test(c) && /regent|edran|traitre|preuve|ordre|mandat/.test(c) && s.stage === 0) {
          s.stage = 1; say("Tu déplies l’ordre devant les gardes. « Edran Veyl, tu as livré Valombre à l’Ombre. Au nom du Conseil libre, tu répondras de tes crimes vivant. » Un soldat baisse sa lance. Le régent blêmit, puis éclate de rire.", "clue"); say(describe()); return 1;
        }
        if (use && /levier|herse/.test(c)) { if (s.stage !== 1) { say(s.stage === 0 ? "Les soldats te surveillent ; le moindre geste vers le mécanisme les ferait intervenir." : "La herse est déjà tombée. "); return 0; } s.stage = 2; say("Tu tires le levier. La herse tombe entre Edran et sa garde ; le choc fait trembler les vitraux. Dans la ville, trois cloches répondent : Oren a entendu le signal. Pour la première fois, le régent est seul face à toi.", "reward"); say(describe()); return 1; }
        if (use && /manteau|tissu|medaillon/.test(c)) { if (s.stage !== 2) { say(s.stage < 2 ? "Ses soldats sont encore trop proches de lui. " : "Le médaillon est déjà couvert."); return 0; } s.stage = 3; say("Tu arraches le manteau de tes épaules et le jettes sur la pierre noire. Sa voix se brise au milieu d’un ordre. L’emprise s’éteint. Il recule, trébuche sur la marche du trône et cherche son poignard.", "reward"); say(describe()); return 1; }
        if (use && /entrave|menotte|captur|attacher|arreter/.test(c)) { if (s.stage !== 3) { say("Il peut encore se défendre. "); return 0; } pendingCapture = true; return 1; }
        if (/^(attaquer|frapper|tuer|poignarder|menacer|utiliser .*epee)/.test(c)) return capture("Tu attaques sans l’avoir immobilisé. Son médaillon interrompt ton geste et ses hommes te désarment. Tu avais ordre de le prendre vivant.");
        if (/^(parler|interroger|demander|dire)/.test(c)) { say(describe()); return 0; }
      }
      if (/^(parler|parle|dire|dis|demander|questionner|interroger|ecouter|remercier|menacer|insulter|presenter mes excuses|m excuser|s excuser|pardon|desole)/.test(c)) {
        const explicit = /oren/.test(c) ? "oren" : /ysilde/.test(c) ? "ysilde" : /borin|forgeron/.test(c) ? "borin" : /ardel|archiviste/.test(c) ? "ardel" : /garde|sergent/.test(c) ? "garde" : null;
        const id = explicit || npc(); if (!id || id !== npc()) { say("Cette personne n’est pas ici. REGARDER indique les personnages présents."); return 0; }
        return social(id, c);
      }
      say("Je ne comprends pas cette action dans ce lieu. Aucun temps perdu. Essaie un verbe et un objet, ou INDICE pour une aide précise."); return 0;
    }
    function act(raw) {
      output = []; pendingCapture = false;
      if (s.won || s.dead) { say(s.won ? "Le traître est capturé ; l’aventure est terminée." : "Les renforts t’ont tué. Recommence pour tenter une autre infiltration."); return output; }
      const before = s.turns, cost = dispatch(normalize(raw)), total = before + cost;
      s.turns = Math.min(total, LIMIT);
      if (pendingCapture && total <= LIMIT) {
        s.won = true; add("cles");
        say("Les entraves claquent sur ses poignets. « Vous ne pouvez pas me juger ! » — « Ce n’est pas moi qui te jugerai. » Tu prends les clés à sa ceinture. Derrière la herse, les soldats déposent leurs armes ; Oren et les habitants investissent le palais. Les portes se ferment devant les renforts privés de leur chef. À l’aube, Edran traverse la place vivant, sous bonne garde. Cette fois, Valombre entendra la vérité devant ses juges.", "reward");
      } else if (total >= LIMIT) {
        s.dead = true;
        say("LA DERNIÈRE CLOCHE — Les renforts franchissent les portes avant l’arrestation. Le portrait que leurs officiers distribuent est le tien. Ils te retrouvent" + (s.room === "geole" ? " jusque dans la geôle" : " dans la ville") + ". Cerné par leurs lances, tu tombes. Edran reste au pouvoir. Tu as manqué l’échéance des 50 actions.", "danger");
      } else {
        if (before < 30 && s.turns >= 30) say("30 ACTIONS — La relève ferme les rangs. Un contrôle encore à passer coûtera désormais cinq actions. Les renforts ont atteint le pont de la vallée.", "system");
        if (before < 40 && s.turns >= 40) say("10 ACTIONS RESTANTES — On distingue les bannières de l’Ombre depuis les remparts. Il faut arrêter Edran avant la fin du compte à rebours.", "danger");
        if (before < 45 && s.turns >= 45) say("5 ACTIONS RESTANTES — Les cors résonnent au pied des murs. L’arrestation ne peut plus attendre.", "danger");
      }
      return output;
    }
    function suggestions() {
      if (s.won || s.dead) return [];
      const verbs = ["examiner", "prendre", "utiliser", "parler"];
      if (s.room === "archives") verbs.push("lire");
      if (s.room === "trone" && s.stage === 0) verbs.push("accuser");
      const exits = Object.keys(rooms[s.room].exits).filter(d => !(s.room === "porte" && !s.flags.entry) && !(s.room === "caserne" && d === "nord" && !s.flags.passed) && !(s.room === "trone" && s.stage > 0));
      return [...verbs, ...exits];
    }
    return { state: s, act, describe, objective, suggestions };
  }
  return { create, rooms, items, clues, spellNames, normalize, LIMIT };
});
