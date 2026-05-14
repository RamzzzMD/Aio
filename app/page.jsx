"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  FileVideo,
  Globe2,
  HelpCircle,
  ImageIcon,
  Link2,
  Loader2,
  MessageCircle,
  Music,
  PlayCircle,
  QrCode,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { Toaster, toast } from "sonner";

// Komponen kustom SVG untuk ikon GitHub
function GithubIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3-.3 6-1.5 6-6.5a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 5 3 6.2 6 6.5a4.8 4.8 0 0 0-1 3.2v4" />
    </svg>
  );
}

const platforms = ["TikTok", "Instagram", "Facebook", "X/Twitter", "YouTube", "Pinterest", "Threads"];

const faqs = [
  {
    question: "Apa itu Ranzz Downloader?",
    answer: "Aplikasi downloader media all-in-one yang profesional dengan antarmuka bersih dan integrasi backend yang aman.",
  },
  {
    question: "Platform apa saja yang didukung?",
    answer: "Mendukung TikTok, Instagram, Facebook, X/Twitter, YouTube, Pinterest, Threads, dan lainnya.",
  },
  {
    question: "Apakah aman?",
    answer: "Ya. Semua pemrosesan ditangani secara aman di sisi server tanpa mengekspos konfigurasi sensitif ke browser.",
  },
  {
    question: "Siapa pengembangnya?",
    answer: "Aplikasi ini dikembangkan oleh Ranzz, spesialis full-stack web architecture dan desain UI/UX minimalis.",
  },
];

function cn(...classes) { return classes.filter(Boolean).join(" "); }

function pick(...values) { return values.find((value) => typeof value === "string" && value.trim().length > 0); }

function detectExtension(url = "", type = "") {
  const lowerUrl = url.toLowerCase();
  const lowerType = type.toLowerCase();
  if (lowerType.includes("audio")) return "mp3";
  if (lowerType.includes("image")) return "jpg";
  if (lowerUrl.includes(".mp3")) return "mp3";
  if (lowerUrl.includes(".m4a")) return "m4a";
  if (lowerUrl.includes(".jpg")) return "jpg";
  if (lowerUrl.includes(".jpeg")) return "jpg";
  if (lowerUrl.includes(".png")) return "png";
  if (lowerUrl.includes(".webp")) return "webp";
  if (lowerUrl.includes(".mov")) return "mov";
  return "mp4";
}

function sanitizeClientFileName(value) {
  return String(value || "media").replace(/[<>:"/\\|?*\x00-\x1F]/g, "").replace(/\s+/g, "-").slice(0, 70);
}

function normalizeApiResponse(apiData) {
  const root = apiData?.data || apiData?.result || apiData || {};
  const title = pick(root.title, root.caption, root.description, root.text, root.name, root.fulltitle) || "Untitled Media";
  const author = pick(root.author, root.uploader, root.username, root.user, root.channel, root.creator) || "Unknown Creator";
  const thumbnail = pick(root.thumbnail, root.thumb, root.cover, root.image, root.preview, root.poster) || "";
  const source = pick(root.source, root.platform, root.extractor, root.service) || "Social Platform";
  const possibleDownloads = root.medias || root.media || root.links || root.downloads || root.files || root.items || [];
  let downloads = Array.isArray(possibleDownloads) ? possibleDownloads : [];

  if (!downloads.length) {
    const directCandidates = [root.url, root.downloadUrl, root.download_url, root.video, root.audio].filter(Boolean);
    downloads = directCandidates.map((url, index) => ({ url, quality: index === 0 ? "Default" : `Media ${index + 1}` }));
  }

  const mappedDownloads = downloads.map((item, index) => {
    const entry = typeof item === "string" ? { url: item } : item || {};
    const fileUrl = pick(entry.url, entry.link, entry.href, entry.download, entry.downloadUrl, entry.download_url, entry.video, entry.audio);
    if (!fileUrl) return null;
    const type = pick(entry.type, entry.mimeType, entry.mime, entry.format) || "video";
    const extension = pick(entry.extension, entry.ext) || detectExtension(fileUrl, type);
    const quality = pick(entry.quality, entry.resolution, entry.label, entry.name, entry.format_id, entry.format) || `File ${index + 1}`;
    const size = pick(entry.size, entry.filesize, entry.fileSize, entry.sizeLabel) || "";
    return { id: `${fileUrl}-${index}`, url: fileUrl, type, extension, quality, size };
  }).filter(Boolean);

  return { title, author, thumbnail, source, downloads: Array.from(new Map(mappedDownloads.map((item) => [item.url, item])).values()), raw: root };
}

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

export default function Page() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [errorState, setErrorState] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQris, setShowQris] = useState(false);

  const canSubmit = useMemo(() => url.trim().length > 0 && !loading, [url, loading]);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorState("");
    setResult(null);
    try {
      if (!url.trim()) throw new Error("Masukkan URL media.");
      setLoading(true);
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || "Gagal mengambil media.");
      const normalized = normalizeApiResponse(payload.data);
      if (!normalized.downloads.length) throw new Error("Media ditemukan, tapi tidak ada link unduhan.");
      setResult(normalized);
      toast.success("Media berhasil diproses.");
    } catch (error) {
      setErrorState(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Copied to clipboard.");
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Failed to copy URL.");
    }
  }

  async function handleDownloadBackground(fileUrl, fileName) {
    const toastId = toast.loading(`Mengunduh media...`);
    try {
      const res = await fetch(`/api/file?url=${encodeURIComponent(fileUrl)}&name=${encodeURIComponent(fileName)}`);
      if (!res.ok) throw new Error("Gagal mengunduh file dari server.");
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      a.remove();
      toast.success("Unduhan selesai!", { id: toastId });
    } catch (error) {
      toast.error("Terjadi kesalahan saat mengunduh.", { id: toastId });
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#09090b] text-zinc-100">
      <Toaster richColors theme="dark" position="top-center" />

      {/* MODAL QRIS */}
      <AnimatePresence>
        {showQris && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowQris(false)} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()} className="relative max-w-sm w-full rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center shadow-2xl">
              <button onClick={() => setShowQris(false)} className="absolute right-4 top-4 text-zinc-500 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-bold text-white mb-2">Donasi QRIS</h3>
              <p className="text-sm text-zinc-500 mb-6">Dukung pengembangan project ini</p>
              <div className="aspect-square w-full rounded-2xl bg-white p-4 mb-6 shadow-inner">
                 <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=RanzzDonation" alt="QRIS" className="w-full h-full object-contain" />
              </div>
              <p className="text-xs text-zinc-600 italic">Scan menggunakan DANA, GoPay, atau ShopeePay</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10">
        <motion.nav initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-16 flex items-center justify-between border-b border-zinc-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100"><ArrowDownToLine className="h-5 w-5 text-zinc-950" /></div>
            <div>
              <p className="text-sm font-bold text-white">Ranzz Downloader</p>
              <p className="text-xs text-zinc-400">Media Parsing Utility</p>
            </div>
          </div>
        </motion.nav>

        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center text-center">
          <motion.h1 variants={fadeUp} initial="hidden" animate="visible" className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            Download Social Media. <span className="text-zinc-500">Professionally.</span>
          </motion.h1>

          <motion.form variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.1 }} onSubmit={handleSubmit} className="mt-10 w-full max-w-2xl">
            <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-2 sm:flex-row focus-within:border-zinc-600 transition-all">
              <div className="flex flex-1 items-center gap-3 px-4 py-3">
                <Link2 className="h-5 w-5 text-zinc-400" />
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste URL here..." className="w-full bg-transparent text-sm outline-none" />
                {url && (
                  <button type="button" onClick={handleCopy} className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200">
                    {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                )}
              </div>
              <button disabled={!canSubmit} className="flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />} Extract
              </button>
            </div>
          </motion.form>

          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mt-12 w-full">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 grid gap-6 md:grid-cols-[280px_1fr] text-left">
                  <div className="aspect-video md:aspect-square rounded-lg bg-zinc-950 overflow-hidden">
                    {result.thumbnail ? <img src={result.thumbnail} className="w-full h-full object-cover" /> : <div className="flex h-full items-center justify-center"><PlayCircle className="h-12 w-12 text-zinc-800" /></div>}
                  </div>
                  <div className="flex flex-col justify-between py-1">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">{result.source}</span>
                      <h2 className="text-xl font-bold text-white mt-1 line-clamp-2">{result.title}</h2>
                      <p className="text-sm text-zinc-400 mt-1">Creator: {result.author}</p>
                    </div>
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {result.downloads.map((file) => (
                        <button key={file.id} onClick={() => handleDownloadBackground(file.url, sanitizeClientFileName(result.title) + "." + file.extension)} className="w-full flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 transition group text-left">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-zinc-200 truncate">{file.quality}</p>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold">{file.extension} {file.size ? `• ${file.size}` : ""}</p>
                          </div>
                          <Download className="h-4 w-4 text-zinc-500 group-hover:text-white transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.2 }} className="mt-16 w-full rounded-2xl border border-zinc-800 bg-zinc-900/30 p-8 text-left">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800 shadow-inner">
                  <UserRound className="h-8 w-8 text-zinc-300" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Lead Developer</p>
                  <h3 className="mt-1 text-2xl font-bold text-white">Ranzz</h3>
                  <p className="mt-1 text-sm text-zinc-400">Full-Stack Engineer & UI Designer</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <a href="https://wa.me/628123456789" className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 transition hover:border-green-500/50 hover:text-green-400 hover:bg-green-500/10" title="WhatsApp"><MessageCircle className="h-5 w-5" /></a>
                <a href="https://t.me/Ranzz" className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 transition hover:border-sky-500/50 hover:text-sky-400 hover:bg-sky-500/10" title="Telegram"><Send className="h-5 w-5" /></a>
                <a href="https://github.com/RamzzzMD" className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 transition hover:border-white/50 hover:text-white hover:bg-white/10" title="GitHub"><GithubIcon className="h-5 w-5" /></a>
                <button onClick={() => setShowQris(true)} className="flex h-12 items-center gap-3 px-5 rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 transition hover:border-yellow-500/50 hover:text-yellow-400 hover:bg-yellow-500/10" title="Donasi">
                  <QrCode className="h-5 w-5" />
                  <span className="text-xs font-bold uppercase tracking-widest">Donasi</span>
                </button>
              </div>
            </div>
          </motion.div>

          {/* BAGIAN F&Q YANG DIKEMBALIKAN */}
          <motion.section variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.3 }} className="mt-16 w-full text-left">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50">
                <HelpCircle className="h-6 w-6 text-zinc-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Pertanyaan Umum</h2>
                <p className="text-sm text-zinc-500">FAQ seputar Ranzz Downloader</p>
              </div>
            </div>
            <div className="grid gap-3">
              {faqs.map((faq, index) => (
                <div key={index} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 transition hover:bg-zinc-900/50">
                  <h3 className="text-base font-semibold text-zinc-200">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{faq.answer}</p>
                </div>
              ))}
            </div>
          </motion.section>

          <footer className="mt-16 w-full border-t border-zinc-800 pt-8 text-center pb-10">
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">
              © {new Date().getFullYear()} Ranzz Downloader. All rights reserved.
            </p>
          </footer>
        </div>
      </section>
    </main>
  );
}
