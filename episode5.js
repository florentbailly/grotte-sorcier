"use strict";
(function () {
  const $ = id => document.querySelector(id);
  const testSpells = new URLSearchParams(window.location.search).get("testSorts") === "1";
  let game, endingTimer = null, audio = null, musicTimer = null, sound = true, step = 0;
  const canvas = $("#sceneCanvas"), ctx = canvas.getContext("2d"), log = $("#gameLog"), cache = {};
  function write(text, tone = "narration") {
    const p = document.createElement("p"); p.className = "log-entry " + tone; p.textContent = text; log.append(p);
    while (log.children.length > 60) log.firstElementChild.remove(); log.scrollTop = log.scrollHeight;
  }
  function list(id, labels, empty) {
    const el = $(id); el.replaceChildren();
    (labels.length ? labels : [empty]).forEach(label => { const li = document.createElement("li"); li.textContent = label; if (!labels.length) li.className = "empty"; el.append(li); });
  }
  function draw() {
    const room = Valombre.rooms[game.state.room];
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 320, 180); ctx.imageSmoothingEnabled = false;
    if (!cache[room.image]) { const image = new Image(); cache[room.image] = image; image.onload = draw; image.src = room.image; }
    const image = cache[room.image]; if (image.complete && image.naturalWidth) ctx.drawImage(image, 0, 0, 320, 180);
    canvas.setAttribute("aria-label", room.title);
  }
  function render() {
    const s = game.state, room = Valombre.rooms[s.room];
    $("#roomName").textContent = room.title;
    $("#roomIndex").textContent = String(Object.keys(Valombre.rooms).indexOf(s.room) + 1).padStart(2, "0") + " / 09";
    $("#moveCounter").textContent = `${s.turns} / ${s.limit} actions · ${s.captures} capture${s.captures > 1 ? "s" : ""}`;
    $("#timeDescription").textContent = s.won ? "Le régent est arrêté. Les portes sont fermées aux renforts." : s.dead ? "Les renforts sont entrés. Tu as été identifié et tué." : `${s.limit - s.turns} actions restantes avant l’arrivée des renforts du traître`;
    const legacy = window.ChroniclesInventory;
    list("#inventory", [...s.inventory.map(id => Valombre.items[id]), ...(legacy?.list() || []).filter(id => id !== "cles_valombre").map(id => legacy.labels[id])], "Ton sac est vide");
    list("#spells", s.magic ? Object.entries(Valombre.spellNames).map(([id, name]) => name + (s.spells[id] ? " · 1 usage" : " · épuisé")) : [], "Épisode IV requis — magie facultative");
    list("#notebook", s.clues.map(id => Valombre.clues[id]), "Aucun indice découvert");
    $("#suggestions").replaceChildren();
    game.suggestions().forEach(command => {
      const partial = ["examiner", "prendre", "utiliser", "parler", "lire", "accuser"].includes(command);
      const button = document.createElement("button"); button.type = "button"; button.textContent = command + (partial ? "…" : "");
      button.addEventListener("click", () => {
        if (partial) { const input = $("#commandInput"); input.value = command + " "; input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
        else submit(command);
      }); $("#suggestions").append(button);
    });
    $("#commandInput").disabled = s.won || s.dead;
    $("#commandForm button[type=submit]").disabled = s.won || s.dead; draw();
  }
  function submit(raw) {
    if (!raw.trim() || game.state.won || game.state.dead) return;
    ensureAudio(); write("> " + raw, "command");
    game.act(raw).forEach(entry => write(entry.text, entry.tone)); render();
    if (game.state.won) {
      if (!testSpells) {
      window.ChroniclesInventory?.setOutcome("valombre_government", "habitants");
      window.ChroniclesInventory?.setOutcome("pale_traitor", "captured_for_trial");
      window.ChroniclesInventory?.setOutcome("valombre_completed", true);
      window.ChroniclesInventory?.add("cles_valombre");
      }
      $("#endingTitle").textContent = "Un traître devant ses juges";
      $("#endingText").textContent = `Edran Veyl est capturé vivant en ${game.state.turns} actions. Oren a fermé les portes aux renforts. Valombre aura son procès. ${testSpells ? "Mode test : aucune récompense ni progression enregistrée." : "Les clés rejoignent ton inventaire permanent."}`;
    } else if (game.state.dead) {
      $("#endingTitle").textContent = "Les renforts de l’Ombre";
      $("#endingText").textContent = `Les ${game.state.limit} actions sont écoulées avant l’arrestation du régent. Ses renforts t’ont identifié et tué. Tes reliques permanentes sont conservées ; recommencer réinitialise les sorts connus.`;
    }
    if (game.state.won || game.state.dead) {
      endingTimer = window.setTimeout(() => { if ((game.state.won || game.state.dead) && !$("#endingDialog").open) $("#endingDialog").showModal(); }, 8000);
    }
  }
  function note(freq) {
    if (!sound || !audio) return;
    const osc = audio.createOscillator(), gain = audio.createGain(); osc.type = "triangle"; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.025, audio.currentTime); gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.55);
    osc.connect(gain).connect(audio.destination); osc.start(); osc.stop(audio.currentTime + 0.55);
  }
  function music() { if (!sound) { musicTimer = null; return; } note([73, 82, 110, 98, 65, 92, 82, 55][step++ % 8]); musicTimer = window.setTimeout(music, 720); }
  function ensureAudio() {
    if (!sound) return; const Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) return;
    try { if (!audio) audio = new Audio(); if (audio.state === "suspended") audio.resume().catch(() => {}); if (!musicTimer) music(); } catch { /* Le jeu reste disponible si l'audio est refusé. */ }
  }
  function reset() {
    if (endingTimer !== null) window.clearTimeout(endingTimer); endingTimer = null;
    if ($("#endingDialog").open) $("#endingDialog").close();
    game = Valombre.create({ grimoire: testSpells || !!window.ChroniclesInventory?.owns("grimoire_runique") });
    $("#testModeNotice").hidden = !testSpells;
    log.replaceChildren(); $("#commandInput").value = "";
    write(`MISSION — Capturer le Régent Blafard VIVANT pour le faire juger. Il a ouvert Valombre aux soldats de l’Ombre. Dans ${game.state.limit} actions, ses renforts arriveront : s’il est encore libre, ils te retrouveront et te tueront.`, "system");
    write("Le Conseil t’a confié un mandat scellé. Une miche de pain est ta seule provision. Dans la ville occupée, Oren est le seul visage que tu connaisses.");
    if (testSpells) write("MODE TEST — Trois sorts disponibles, sans modifier les reliques ni enregistrer la victoire. Enlève ?testSorts=1 de l’adresse pour revenir au jeu normal.", "system");
    write("REGARDER, CARNET et INDICE sont gratuits. Les actions longues annoncent leur coût. Une capture mène en geôle : tu peux toujours t’en évader, mais l’horloge continue. Il n’y a aucun compte à rebours en secondes.");
    if (game.state.magic) write("Les Nains t’ont enseigné LUMIÈRE, BOULE DE FEU et MANIPULATION MENTALE. Un seul usage de chaque sort pour cette quête : observe les lieux avant de les lancer.", "reward");
    write(game.describe()); render();
  }
  $("#commandForm").addEventListener("submit", event => { event.preventDefault(); const raw = $("#commandInput").value; $("#commandInput").value = ""; submit(raw); if (!game.state.won && !game.state.dead) $("#commandInput").focus(); });
  $("#restartButton").addEventListener("click", reset); $("#playAgainButton").addEventListener("click", reset);
  $("#soundButton").addEventListener("click", () => { sound = !sound; $("#soundButton").textContent = "Son + musique : " + (sound ? "oui" : "non"); $("#soundButton").setAttribute("aria-pressed", String(sound)); if (sound) ensureAudio(); else { window.clearTimeout(musicTimer); musicTimer = null; } });
  document.addEventListener("pointerdown", ensureAudio, { once: true }); document.addEventListener("keydown", ensureAudio, { once: true }); reset();
})();
