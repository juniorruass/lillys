const EVOLUTION_URL = process.env.EVOLUTION_API_URL || "";
const EVOLUTION_KEY  = process.env.EVOLUTION_API_KEY || "";
const INSTANCE       = process.env.EVOLUTION_INSTANCE || "";

function humanDelay(text: string): number {
  const base = Math.min(text.length * 30, 5000);
  const jitter = Math.floor(Math.random() * 1500);
  return Math.max(1200, base + jitter);
}

// jid pode ser "5573998579317@s.whatsapp.net" ou só "5573998579317"
function toNumber(jid: string): string {
  return jid.replace("@s.whatsapp.net", "").replace(/\D/g, "");
}

export async function sendTyping(jid: string, durationMs = 6000) {
  if (!EVOLUTION_URL || !EVOLUTION_KEY || !jid) return;
  const number = toNumber(jid);
  fetch(`${EVOLUTION_URL}/chat/updatePresence/${INSTANCE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
    body: JSON.stringify({ number: `${number}@s.whatsapp.net`, presence: "composing" }),
  }).catch(() => null);
}

export async function sendToAdmin(text: string) {
  const adminJid = process.env.JUNIOR_WHATSAPP ?? "";
  if (!adminJid) return null;
  return sendMessage(text, adminJid);
}

export async function sendMessage(text: string, jid: string) {
  if (!EVOLUTION_URL || !EVOLUTION_KEY || !jid) return null;
  const number = toNumber(jid);
  const res = await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
    body: JSON.stringify({
      number,
      text,
      options: { delay: humanDelay(text), presence: "composing" },
    }),
  });
  return res.ok ? res.json() : null;
}

// Grupos usam jid completo (ex: "120363012345678901@g.us") — não pode passar por
// toNumber(), que stripa o sufixo e faz a Evolution API tratar como número de contato.
export async function sendToGroup(text: string, groupJid: string) {
  if (!EVOLUTION_URL || !EVOLUTION_KEY || !groupJid) return null;
  const res = await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
    body: JSON.stringify({
      number: groupJid,
      text,
      options: { delay: humanDelay(text), presence: "composing" },
    }),
  });
  return res.ok ? res.json() : null;
}
