"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  Copy,
  Download,
  HelpCircle,
  Link2,
  Loader2,
  MessageCircle,
  PlayCircle,
  QrCode,
  Send,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { Toaster, toast } from "sonner";

// Komponen Ikon GitHub
function GithubIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3-.3 6-1.5 6-6.5a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 5 3 6.2 6 6.5a4.8 4.8 0 0 0-1 3.2v4" />
    </svg>
  );
}

const faqs = [
  { question: "Apa itu Ranzz Downloader?", answer: "Aplikasi downloader media profesional dengan antarmuka bersih dan aman." },
  { question: "Platform apa saja yang didukung?", answer: "Mendukung TikTok, Instagram, Facebook, X, YouTube, dsb." },
  { question: "Kenapa unduhan gagal?", answer: "Beberapa file diproteksi atau server media sedang sibuk. Coba lagi nanti." },
  { question: "Siapa pengembangnya?", answer: "Aplikasi ini dikembangkan oleh Ranzz." },
];

function sanitizeClientFileName(value) {
  return String(value || "media").replace(/[<>:"/\\|?*\x00-\x1F]/g, "").replace(/\s+/g, "-").slice(0, 70);
}

function pick(...values) { return values.find((v) => typeof v === "string" && v.trim().length > 0); }

function normalizeApiResponse(apiData) {
  const root = apiData?.data || apiData?.result || apiData || {};
  const title = pick(root.title, root.caption, root.description, root.text) || "Untitled Media";
  const author = pick(root.author, root.uploader, root.username) || "Unknown Creator";
  const thumbnail = pick(root.thumbnail, root.thumb, root.cover) || "";
  const source = pick(root.source, root.platform) || "Social Media";
  const possibleDownloads = root.medias || root.media || root.links || root.downloads || [];
  let downloads = Array.isArray(possibleDownloads) ? possibleDownloads : [];

  if (!downloads.length) {
    const direct = [root.url, root.downloadUrl, root.video, root.audio].filter(Boolean);
    downloads = direct.map((url, i) => ({ url, quality: i === 0 ? "Default" : `Media ${i + 1}` }));
  }

  const mapped = downloads.map((item, index) => {
    const entry = typeof item === "string" ? { url: item } : item || {};
    const fileUrl = pick(entry.url, entry.link, entry.downloadUrl);
    if (!fileUrl) return null;
    return {
      id: `${index}-${fileUrl}`,
      url: fileUrl,
      quality: pick(entry.quality, entry.resolution) || `File ${index + 1}`,
      extension: entry.extension || "mp4",
      size: entry.size || ""
    };
  }).filter(Boolean);

  return { title, author, thumbnail, source, downloads: mapped };
}

export default function Page() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQris, setShowQris] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!url.trim()) return toast.error("Masukkan URL terlebih dahulu.");
    setResult(null);
    try {
      setLoading(true);
      const res = await fetch("/api/download", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload.message || "Gagal mengambil data.");
      setResult(normalizeApiResponse(payload.data));
      toast.success("Media ditemukan.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  // PERBAIKAN: Menggunakan Native Browser Download (Anti-Error & Tanpa Tab Baru)
  function handleDownloadNative(fileUrl, fileName) {
    toast.info("Mengunduh dimulai...");
    const downloadUrl = `/api/file?url=${encodeURIComponent(fileUrl)}&name=${encodeURIComponent(fileName)}`;
    
    // Cara paling stabil: manipulasi window.location
    // Karena API kita kirim header 'attachment', browser tidak akan pindah halaman
    window.location.href = downloadUrl;
  }

  return (
    <main className="relative min-h-screen bg-[#09090b] text-zinc-100 p-6">
      <Toaster richColors theme="dark" position="top-center" />

      {/* Modal QRIS */}
      <AnimatePresence>
        {showQris && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowQris(false)} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 relative max-w-xs w-full text-center">
              <button onClick={() => setShowQris(false)} className="absolute right-4 top-4 text-zinc-500"><X /></button>
              <h3 className="font-bold mb-4">Donasi QRIS</h3>
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=RanzzDonation" className="mx-auto rounded-xl mb-4 bg-white p-2" />
              <p className="text-xs text-zinc-500 italic">Dukungan Anda sangat berarti.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto flex flex-col min-h-screen">
        {/* Navbar */}
        <nav className="flex justify-between items-center border-b border-zinc-800 pb-6 mb-12">
          <div className="flex items-center gap-2 font-bold"><ArrowDownToLine className="text-zinc-950 bg-zinc-100 p-1 rounded-md" /> Ranzz Downloader</div>
          <div className="text-xs text-zinc-500 flex items-center gap-1"><ShieldCheck size={14}/> Secure</div>
        </nav>

        <div className="text-center flex-1">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">Download Social Media. <span className="text-zinc-500">Professionally.</span></h1>
          
          <form onSubmit={handleSubmit} className="mb-12">
            <div className="bg-zinc-900/50 border border-zinc-800 p-2 rounded-2xl flex flex-col sm:flex-row gap-2">
              <input value={url} onChange={(e)=>setUrl(e.target.value)} placeholder="Paste URL here..." className="bg-transparent flex-1 px-4 outline-none text-sm" />
              <button disabled={loading} className="bg-white text-zinc-950 px-6 py-3 rounded-xl font-bold hover:bg-zinc-200 transition disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin inline mr-2" size={18}/> : "Extract"}
              </button>
            </div>
          </form>

          {/* Result Card */}
          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl text-left grid md:grid-cols-[250px_1fr] gap-6 mb-12">
                <div className="bg-zinc-950 aspect-square rounded-xl overflow-hidden">
                  {result.thumbnail ? <img src={result.thumbnail} className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center"><PlayCircle size={48} className="text-zinc-800"/></div>}
                </div>
                <div className="flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{result.source}</span>
                    <h2 className="text-xl font-bold line-clamp-2 mt-1">{result.title}</h2>
                    <p className="text-sm text-zinc-500">{result.author}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6">
                    {result.downloads.map((file, i) => (
                      <button key={i} onClick={() => handleDownloadNative(file.url, sanitizeClientFileName(result.title) + "." + file.extension)} className="flex justify-between items-center p-3 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition group text-left">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{file.quality}</p>
                          <p className="text-[10px] text-zinc-500 uppercase">{file.extension} {file.size}</p>
                        </div>
                        <Download size={16} className="text-zinc-500 group-hover:text-white" />
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dev Card */}
          <div className="bg-zinc-900/30 border border-zinc-800 p-8 rounded-2xl text-left flex flex-col md:flex-row justify-between items-center gap-6 mb-16">
            <div className="flex gap-4 items-center">
              <div className="w-14 h-14 bg-zinc-800 rounded-xl flex items-center justify-center"><UserRound className="text-zinc-400"/></div>
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Developer</p>
                <h3 className="text-xl font-bold">Ranzz</h3>
                <p className="text-xs text-zinc-500">Full-Stack Engineer</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a href="https://wa.me/6281214300828" className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:text-green-400"><MessageCircle size={20}/></a>
              <a href="https://t.me/cangcuthideung" className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:text-sky-400"><Send size={20}/></a>
              <a href="https://github.com/RamzzzMD" className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:text-white"><GithubIcon size={20}/></a>
              <button onClick={()=>setShowQris(true)} className="flex items-center gap-2 px-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:text-yellow-400"><QrCode size={20}/> Donasi</button>
            </div>
          </div>

          {/* FAQ Section */}
          <section className="text-left mb-16">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><HelpCircle/> Pertanyaan Umum</h2>
            <div className="grid gap-3">
              {faqs.map((faq, i) => (
                <div key={i} className="p-5 border border-zinc-800 rounded-xl bg-zinc-900/20">
                  <h4 className="font-bold text-zinc-200">{faq.question}</h4>
                  <p className="text-sm text-zinc-500 mt-1">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>

          <footer className="border-t border-zinc-800 pt-8 pb-10">
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">© 2026 Ranzz Downloader. All rights reserved.</p>
          </footer>
        </div>
      </div>
    </main>
  );
}
