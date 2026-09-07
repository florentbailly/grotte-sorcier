"use strict";

(function () {
  const STORAGE_KEY = "chroniques-terres-obscures-v1";
  const LABELS = {
    cle_montagne: "Clé de la Montagne",
    anneau_ombres: "Anneau des Ombres",
    epee_aube: "Épée de l’Aube Muette",
  };

  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return { relics: Array.isArray(value.relics) ? value.relics : [] };
    } catch {
      return { relics: [] };
    }
  }

  function write(profile) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch { /* stockage indisponible */ }
  }

  window.ChroniclesInventory = {
    labels: LABELS,
    list() { return read().relics.filter((id) => LABELS[id]); },
    owns(id) { return read().relics.includes(id); },
    add(id) {
      if (!LABELS[id]) return;
      const profile = read();
      if (!profile.relics.includes(id)) profile.relics.push(id);
      write(profile);
      window.dispatchEvent(new CustomEvent("chronicles-inventory-change"));
    },
  };

  function renderHomeInventory() {
    const list = document.querySelector("#legacyInventory");
    if (!list) return;
    const items = window.ChroniclesInventory.list();
    list.replaceChildren();
    if (!items.length) {
      const empty = document.createElement("li");
      empty.className = "empty";
      empty.textContent = "Aucune relique rapportée";
      list.append(empty);
      return;
    }
    items.forEach((id) => {
      const li = document.createElement("li");
      li.textContent = LABELS[id];
      list.append(li);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", renderHomeInventory);
  else renderHomeInventory();
  window.addEventListener("chronicles-inventory-change", renderHomeInventory);
})();
