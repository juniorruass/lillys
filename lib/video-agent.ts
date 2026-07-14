import { GoogleGenAI } from "@google/genai";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const VIDEOS_DIR = path.join(process.cwd(), "public", "videos");

// Gera um vídeo com Veo 3 a partir de um prompt de texto, faz polling até
// concluir (~1-3min por clipe de 8s) e salva em public/videos/<id>.mp4.
// Retorna o caminho público (ex: "/videos/<id>.mp4") pra servir de preview.
//
// NOTA: a chamada ao SDK @google/genai (generateVideos / getVideosOperation)
// segue o padrão documentado publicamente, mas ainda não foi testada ao vivo
// nesse projeto — validar com uma chamada real antes de confiar em produção.
export async function generateVideo(id: string, prompt: string): Promise<string> {
  let operation = await ai.models.generateVideos({
    model: "veo-3.1-generate-preview",
    prompt,
  });

  while (!operation.done) {
    await new Promise((r) => setTimeout(r, 10_000));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!uri) throw new Error("Veo não retornou vídeo (operation.response vazio).");

  const res = await fetch(`${uri}${uri.includes("?") ? "&" : "?"}key=${process.env.GEMINI_API_KEY}`);
  if (!res.ok) throw new Error(`Falha ao baixar vídeo gerado: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());

  await mkdir(VIDEOS_DIR, { recursive: true });
  const fileName = `${id}.mp4`;
  await writeFile(path.join(VIDEOS_DIR, fileName), buffer);

  return `/videos/${fileName}`;
}
