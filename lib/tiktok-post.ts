import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const AUTH_STATE = path.join(process.cwd(), ".auth", "tiktok-state.json");

// Posta um vídeo no TikTok automatizando o upload web, sem usar a API oficial
// (que exige app aprovado pela TikTok — ver plano). Reusa a sessão salva por
// scripts/tiktok-login.ts pra evitar login repetido (principal gatilho de
// detecção de automação). Roda headless — pensado pra uso sob demanda, não
// em cron fixo, por causa do custo de memória do Chromium na VPS.
//
// NOTA: os seletores da UI de upload do TikTok mudam com frequência — testar
// e ajustar antes de confiar em produção.
export async function postToTikTok(videoAbsolutePath: string, caption: string): Promise<void> {
  if (!fs.existsSync(AUTH_STATE)) {
    throw new Error(
      "Sessão do TikTok não encontrada (.auth/tiktok-state.json). Rode `npx tsx scripts/tiktok-login.ts` uma vez, numa máquina com tela, e copie o arquivo gerado pra cá."
    );
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: AUTH_STATE });
  const page = await context.newPage();

  try {
    await page.goto("https://www.tiktok.com/tiktokstudio/upload", { waitUntil: "networkidle" });

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(videoAbsolutePath);

    // Upload processa server-side — espera o editor de legenda aparecer
    await page.waitForSelector('[data-e2e="caption-editor"], div[contenteditable="true"]', { timeout: 120_000 });

    const captionBox = page.locator('div[contenteditable="true"]').first();
    await captionBox.click();
    await captionBox.fill(caption);

    const postButton = page.locator('button:has-text("Post"), button:has-text("Publicar")').first();
    await postButton.waitFor({ state: "visible", timeout: 30_000 });
    await postButton.click();

    await page.waitForTimeout(5_000);
  } finally {
    await context.storageState({ path: AUTH_STATE });
    await browser.close();
  }
}
