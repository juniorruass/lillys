"use client";
import { useState, useEffect } from "react";
import TopBar from "@/components/layout/TopBar";
import { Newspaper, ExternalLink, RefreshCw } from "lucide-react";
import Marquee from "@/components/ui/Marquee";

interface FeedItem { title: string; link: string; source: string; pubDate?: string; }
interface FeedConfig { label: string; url: string; color: string; }

const FEEDS: FeedConfig[] = [
  { label: "Brasil", url: "https://g1.globo.com/rss/g1/", color: "bg-green-100 text-green-700" },
  { label: "Mundo", url: "https://g1.globo.com/rss/g1/mundo/", color: "bg-blue-100 text-blue-700" },
  { label: "Tecnologia", url: "https://g1.globo.com/rss/g1/tecnologia/", color: "bg-purple-100 text-purple-700" },
  { label: "Meta / IA", url: "https://techcrunch.com/feed/", color: "bg-[#E0F7FF] text-[#00C8FF]" },
];

export default function NoticiasPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadFeed(activeTab); }, [activeTab]);

  async function loadFeed(idx: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/news?url=${encodeURIComponent(FEEDS[idx].url)}`);
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }

  return (
    <>
      <TopBar />
      <div className="border-b border-[#E2E8F0] py-1.5 bg-white/60 backdrop-blur-sm">
        <Marquee items={["Notícias", "Brasil", "Mundo", "Tecnologia", "Meta", "IA", "Informação em tempo real"]} speed={35} className="text-[10px] font-semibold tracking-widest uppercase text-[#00C8FF]/50" separator="·" />
      </div>
      <main className="flex-1 p-4 lg:p-8 max-w-4xl w-full mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E0F7FF] flex items-center justify-center">
              <Newspaper size={20} className="text-[#00C8FF]" />
            </div>
            <h1 className="text-xl font-bold text-[#0A1628]">Notícias</h1>
          </div>
          <button onClick={() => loadFeed(activeTab)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F8FAFB] text-[#64748B] transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {FEEDS.map((f, i) => (
            <button
              key={f.label}
              onClick={() => setActiveTab(i)}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === i ? "bg-[#00C8FF] text-white" : "bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#00C8FF]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#E2E8F0] p-4 animate-pulse">
                <div className="h-4 bg-[#E2E8F0] rounded w-3/4 mb-2" />
                <div className="h-3 bg-[#E2E8F0] rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, i) => (
              <a
                key={i}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white rounded-2xl border border-[#E2E8F0] p-4 hover:border-[#B3EEFF] hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-[#0A1628] leading-5 group-hover:text-[#00C8FF] transition-colors">
                    {item.title}
                  </p>
                  <ExternalLink size={14} className="text-[#94A3B8] shrink-0 mt-0.5" />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${FEEDS[activeTab].color}`}>
                    {FEEDS[activeTab].label}
                  </span>
                  {item.pubDate && (
                    <span className="text-[10px] text-[#94A3B8]">{item.pubDate}</span>
                  )}
                </div>
              </a>
            ))}
            {items.length === 0 && !loading && (
              <div className="text-center py-12">
                <Newspaper size={32} className="text-[#E2E8F0] mx-auto mb-2" />
                <p className="text-sm text-[#64748B]">Nenhuma notícia carregada</p>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
