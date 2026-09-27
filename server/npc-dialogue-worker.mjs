const NPCS = {
  oren: { personality: "Jeune garde effrayé, loyal par besoin de croire que la cité peut encore être sauvée. Réponses brèves et hésitantes." },
  ysilde: { personality: "Archiviste précise, prudente, protectrice envers sa fille. Elle ne se laisse pas flatter facilement." },
  nielle: { personality: "Voleuse vive, ironique, pragmatique. Elle négocie toujours et déteste les promesses vagues." },
  ardel: { personality: "Ancien capitaine accusé à tort, direct et digne. Il jauge les actes davantage que les paroles." },
  edran: { personality: "Régent paternaliste, calme et manipulateur. Il nie toute culpabilité et cherche les failles de son interlocuteur." },
  blesse: { personality: "Ancien veilleur blessé, épuisé mais lucide. Sa mémoire revient par sons et sensations." },
};

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    reply: { type: "string", maxLength: 700 },
    perceived_intent: { type: "string", enum: ["question", "claim", "threat", "bargain", "comfort", "accusation", "other"] },
    referenced_fact_ids: { type: "array", items: { type: "string" }, maxItems: 6 },
  },
  required: ["reply", "perceived_intent", "referenced_fact_ids"],
};

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/npc-dialogue") return env.ASSETS ? env.ASSETS.fetch(request) : new Response("Not found", { status: 404 });
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    if (!env.OPENAI_API_KEY || !env.OPENAI_MODEL) return json({ error: "conversation_service_unconfigured" }, 503);

    let body;
    try { body = await request.json(); } catch { return json({ error: "invalid_json" }, 400); }
    const sheet = NPCS[body.npc];
    const utterance = typeof body.utterance === "string" ? body.utterance.trim().slice(0, 700) : "";
    const allowedFacts = Array.isArray(body.allowedFacts) ? body.allowedFacts.slice(0, 12).map((fact) => ({ id: String(fact.id).slice(0, 80), text: String(fact.text).slice(0, 300) })) : [];
    const memory = Array.isArray(body.memory) ? body.memory.slice(-10).map((item) => String(item).slice(0, 180)) : [];
    if (!sheet || !utterance) return json({ error: "invalid_request" }, 400);

    const instructions = [
      "Tu joues un PNJ d'un jeu d'aventure médiéval sombre en français.",
      sheet.personality,
      "Réponds en une à trois phrases, sans narration extérieure.",
      "Tu ne connais que les faits autorisés fournis. N'invente ni objet, ni événement, ni issue de l'action.",
      "Ne révèle jamais un fait absent de la liste. Tu peux refuser, douter, mentir par omission ou demander un service.",
      "Les changements de jeu sont décidés ailleurs : ne déclare jamais qu'une porte s'ouvre, qu'un objet est donné ou qu'une mission réussit.",
    ].join(" ");

    const apiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        store: false,
        max_output_tokens: 260,
        instructions,
        input: JSON.stringify({ player_utterance: utterance, allowed_facts: allowedFacts, remembered_events: memory }),
        text: { format: { type: "json_schema", name: "npc_dialogue", strict: true, schema } },
      }),
    });
    if (!apiResponse.ok) return json({ error: "model_unavailable" }, 502);
    const data = await apiResponse.json();
    const outputText = data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
    try {
      const parsed = JSON.parse(outputText);
      const allowedIds = new Set(allowedFacts.map((fact) => fact.id));
      if (parsed.referenced_fact_ids.some((id) => !allowedIds.has(id))) return json({ error: "invalid_model_output" }, 502);
      return json({ reply: parsed.reply, intent: parsed.perceived_intent });
    } catch {
      return json({ error: "invalid_model_output" }, 502);
    }
  },
};
