"use strict";

(function () {
  const endpoint = document.querySelector('meta[name="npc-api"]')?.content || "";

  window.NPCConversation = {
    async ask(payload) {
      if (!endpoint) return null;
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 4500);
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        if (!response.ok) return null;
        const result = await response.json();
        return typeof result.reply === "string" && result.reply.length <= 900 ? result.reply : null;
      } catch {
        return null;
      } finally {
        window.clearTimeout(timeout);
      }
    },
  };
})();
