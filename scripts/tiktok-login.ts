/**
 * Rodar UMA VEZ, manualmente, numa máquina com tela (não na VPS headless):
 *   npx tsx scripts/tiktok-login.ts
 *
 * Abre um Chromium visível pra você logar no TikTok manualmente (inclusive
 * 2FA se pedir). Ao fechar a janela, salva a sessão em .auth/tiktok-state.json
 * — esse arquivo é o que o agente de postagem (lib/tiktok-post.ts) reusa
 * depois, headless, sem precisar logar de novo.
 *
 * Depois de gerar, copiar .auth/tiktok-state.json pra VPS (mesma pasta,
 * relativo à raiz do projeto). NUNCA commitar esse arquivo — já está no
 * .gitignore (pasta .auth/).
 */
import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import path from "path";
import readline from "readline/promises";

async function main() {
  const authDir = path.join(process.cwd(), ".auth");
  await mkdir(authDir, { recursive: true });

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("https://www.tiktok.com/login");
  console.log("Faça login no TikTok na janela aberta (inclusive 2FA, se pedir).");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await rl.question("Depois de logar e ver sua página inicial do TikTok, pressione Enter aqui... ");
  rl.close();

  await context.storageState({ path: path.join(authDir, "tiktok-state.json") });
  console.log("Sessão salva em .auth/tiktok-state.json");
  await browser.close();
}

main();
