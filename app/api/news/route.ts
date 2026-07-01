import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ items: [] });

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RSS Reader)" },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return NextResponse.json({ items: [] });
    const xml = await res.text();

    // Parse RSS/Atom items via regex (sem dependência externa)
    const items: { title: string; link: string; pubDate?: string }[] = [];
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 20) {
      const block = match[1];
      const title = (/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]>/i.exec(block) ?? /<title[^>]*>([\s\S]*?)<\/title>/i.exec(block))?.[1]?.trim() ?? "";
      const link = (/<link>([\s\S]*?)<\/link>/i.exec(block) ?? /<guid[^>]*>([\s\S]*?)<\/guid>/i.exec(block))?.[1]?.trim() ?? "";
      const pub = (/<pubDate>([\s\S]*?)<\/pubDate>/i.exec(block))?.[1]?.trim();
      if (title && link) {
        items.push({
          title: title.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#\d+;/g, ""),
          link,
          pubDate: pub ? new Date(pub).toLocaleDateString("pt-BR") : undefined,
        });
      }
    }

    // Tenta Atom se não achou items RSS
    if (items.length === 0) {
      const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
      let entryMatch;
      while ((entryMatch = entryRegex.exec(xml)) !== null && items.length < 20) {
        const block = entryMatch[1];
        const title = (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(block))?.[1]?.trim() ?? "";
        const link = (/href="([^"]+)"/i.exec(block))?.[1] ?? "";
        if (title && link) items.push({ title, link });
      }
    }

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
