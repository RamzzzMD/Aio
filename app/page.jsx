"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  Clipboard,
  Copy,
  Download,
  Eraser,
  FileVideo,
  Globe2,
  HelpCircle,
  Link2,
  Loader2,
  MessageCircle,
  Music,
  PlayCircle,
  QrCode,
  Send,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { Toaster, toast } from "sonner";

// Komponen Ikon GitHub Manual
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

const supportedPlatforms = [
  "TikTok", "Instagram", "Facebook", "X / Twitter", "YouTube", "Pinterest", "Threads"
];

function sanitizeClientFileName(value) {
  return String(value || "media").replace(/[<>:"/\\|?*\x00-\x1F]/g, "").replace(/\s+/g, "-").slice(0, 120);
}

function pick(...values) { return values.find((v) => typeof v === "string" && v.trim().length > 0); }

function detectExtension(url = "", type = "") {
  const lowerUrl = url.toLowerCase();
  const lowerType = type.toLowerCase();
  if (lowerType.includes("audio") || lowerUrl.includes(".mp3") || lowerUrl.includes(".m4a")) return "mp3";
  if (lowerType.includes("image") || lowerUrl.includes(".jpg") || lowerUrl.includes(".jpeg") || lowerUrl.includes(".png") || lowerUrl.includes(".webp") || lowerUrl.includes("~tplv-")) return "jpg";
  if (lowerUrl.includes(".mov")) return "mov";
  return "mp4";
}

function normalizeApiResponse(apiData) {
  const root = apiData?.data || apiData?.result || apiData || {};
  const caption = pick(root.caption, root.description, root.text, root.title) || "Media berhasil diekstrak.";
  const author = pick(root.author?.nickname, root.author?.name, root.author, root.uploader, root.username) || "Unknown Creator";
  const source = pick(root.source, root.platform) || "Social Media";
  
  const authorAvatar = pick(
    root.author_avatar, 
    root.author?.avatar_thumb, 
    root.author?.avatar, 
    root.user?.avatar, 
    root.avatar
  ) || "";

  let tags = Array.isArray(root.tags) ? root.tags : [];
  if (!tags.length && typeof caption === "string") {
    const matched = caption.match(/#[\w]+/g);
    if (matched) tags = matched;
  }

  const possibleDownloads = root.images || root.medias || root.media || root.links || root.downloads || [];
  let downloads = Array.isArray(possibleDownloads) && possibleDownloads.length > 0 ? [...possibleDownloads] : [];

  if (!downloads.length) {
    const direct = [root.url, root.downloadUrl, root.video].filter(Boolean);
    downloads = direct.map((url, i) => ({ url, quality: i === 0 ? "Default" : `Video ${i + 1}` }));
  }

  if (root.audio && typeof root.audio === "string") {
    downloads.push({ url: root.audio, quality: "Audio/Music", type: "audio" });
  }

  const mapped = downloads.map((item, index) => {
    const entry = typeof item === "string" ? { url: item } : item || {};
    const fileUrl = pick(entry.url, entry.link, entry.downloadUrl, entry.src);
    if (!fileUrl) return null;

    const detectedType = entry.type || "";
    const detectedExt = detectExtension(fileUrl, detectedType);
    let qualityLabel = pick(entry.quality, entry.resolution);

    if (!qualityLabel) {
      if (detectedExt === "jpg" || detectedExt === "png" || detectedExt === "webp") {
        qualityLabel = `Slide ${index + 1}`;
      } else if (detectedExt === "mp3") {
        qualityLabel = `Audio ${index + 1}`;
      } else {
        qualityLabel = `File ${index + 1}`;
      }
    }
    if (entry.quality === "Audio/Music") qualityLabel = "Audio/Music";

    return {
      id: `${index}-${fileUrl}`,
      url: fileUrl,
      quality: qualityLabel,
      extension: entry.extension || detectedExt,
      size: entry.size || ""
    };
  }).filter(Boolean);

  const uniqueMapped = Array.from(new Map(mapped.map(item => [item.url, item])).values());

  return { caption, author, authorAvatar, tags, source, downloads: uniqueMapped, thumbnail: root.thumbnail || root.cover || "" };
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

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        toast.success("URL berhasil ditempel.");
      }
    } catch (error) {
      toast.error("Gagal menempel. Pastikan izin clipboard diizinkan.");
    }
  }

  function handleDownloadNative(fileUrl, fileName) {
    toast.info("Mengunduh dimulai...");
    const downloadUrl = `/api/file?url=${encodeURIComponent(fileUrl)}&name=${encodeURIComponent(fileName)}`;
    window.location.href = downloadUrl;
  }

  return (
    <main className="relative min-h-screen bg-[#09090b] text-zinc-100 p-6">
      <Toaster richColors theme="dark" position="top-center" />

      <AnimatePresence>
        {showQris && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowQris(false)} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 relative max-w-xs w-full text-center shadow-2xl">
              <button onClick={() => setShowQris(false)} className="absolute right-4 top-4 text-zinc-500 hover:text-white transition-colors"><X /></button>
              <h3 className="font-bold mb-4 text-white">Donasi QRIS</h3>
              <img src="https://raw.githubusercontent.com/kamdjut-ui/uploader/refs/heads/main/uploads/1774444884166_QRIS_(1).jpeg" className="mx-auto rounded-xl mb-4 bg-white p-2 shadow-inner" alt="QRIS Donasi" />
              <p className="text-xs text-zinc-500 italic">Dukungan Anda sangat berarti.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto flex flex-col min-h-screen">
        <nav className="flex justify-between items-center border-b border-zinc-800 pb-6 mb-12">
          <div className="flex items-center gap-2 font-bold"><ArrowDownToLine className="text-zinc-950 bg-zinc-100 p-1 rounded-md" /> Ranzz Downloader</div>
          <div className="text-xs text-zinc-500 flex items-center gap-1"><ShieldCheck size={14}/> Secure</div>
        </nav>

        <div className="text-center flex-1">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight text-white">
            Download <span className="text-zinc-500">ALL</span> Social Media.
          </h1>
          
          <form onSubmit={handleSubmit} className="mb-12 max-w-2xl mx-auto">
            <div className="bg-zinc-900/50 border border-zinc-800 p-2 rounded-2xl flex flex-col sm:flex-row gap-2 transition-colors focus-within:border-zinc-600">
              <div className="flex flex-1 items-center gap-1 bg-transparent px-3">
                <Link2 className="text-zinc-400 shrink-0" size={20} />
                <input 
                  value={url} 
                  onChange={(e)=>setUrl(e.target.value)} 
                  placeholder="Paste URL (TikTok, IG, YT, dll)..." 
                  className="bg-transparent flex-1 py-3 outline-none text-sm md:text-base text-zinc-100 placeholder:text-zinc-600" 
                />
                
                <button type="button" onClick={handlePaste} className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition" title="Tempel URL">
                  <Clipboard size={18} />
                </button>

                {url && (
                  <button 
                    type="button" 
                    onClick={() => setUrl("")} 
                    className="p-2 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                    title="Hapus Teks"
                  >
                    <Eraser size={18} />
                  </button>
                )}

                {url && (
                  <button 
                    type="button" 
                    onClick={() => {
                      navigator.clipboard.writeText(url);
                      setCopied(true);
                      toast.success("Disalin ke clipboard.");
                      setTimeout(() => setCopied(false), 1200);
                    }} 
                    className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition"
                  >
                    {copied ? <CheckCircle2 size={18} className="text-green-500" /> : <Copy size={18} />}
                  </button>
                )}
              </div>
              
              <button disabled={loading} className="bg-white text-zinc-950 px-8 py-3 rounded-xl font-bold hover:bg-zinc-200 transition disabled:opacity-50 flex items-center justify-center">
                {loading ? <Loader2 className="animate-spin mr-2" size={20}/> : "Extract"}
              </button>
            </div>
          </form>

          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="bg-zinc-900 border border-zinc-800 p-5 sm:p-7 rounded-3xl text-left mb-12 shadow-2xl max-w-2xl mx-auto">
                
                <div className="flex justify-between items-start mb-5">
                  <div className="flex items-center gap-3">
                    {result.authorAvatar ? (
                      <img src={result.authorAvatar} alt={result.author} referrerPolicy="no-referrer" className="w-12 h-12 rounded-full object-cover border border-zinc-700 bg-zinc-800 shadow-sm" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shadow-sm">
                        <UserRound size={24} className="text-zinc-500" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-base font-bold text-white line-clamp-1">{result.author}</h3>
                      <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5 font-medium">
                        <Globe2 size={12}/> {result.source}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-sm sm:text-base text-zinc-300 leading-relaxed line-clamp-4 whitespace-pre-wrap">
                    {result.caption}
                  </p>
                  
                  {result.tags && result.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {result.tags.slice(0, 15).map((tag, i) => {
                        const displayTag = tag.startsWith('#') ? tag : `#${tag}`;
                        return (
                          <span key={i} className="text-[11px] font-semibold text-cyan-400 bg-cyan-400/10 px-2.5 py-1 rounded-md border border-cyan-400/10">
                            {displayTag}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Pemisahan Rendering Berdasarkan Ekstensi */}
                {(() => {
                  const imageFiles = result.downloads.filter(f => ['jpg', 'jpeg', 'png', 'webp'].includes(f.extension));
                  const mediaFiles = result.downloads.filter(f => !['jpg', 'jpeg', 'png', 'webp'].includes(f.extension));

                  return (
                    <>
                      {/* Tampilkan Thumbnail Cover jika yang di-download murni Video (tidak ada Slide Image) */}
                      {imageFiles.length === 0 && result.thumbnail && (
                        <div className="w-full h-[250px] sm:h-[350px] rounded-2xl overflow-hidden border border-zinc-800 mb-6 bg-zinc-950 relative">
                          <img src={result.thumbnail} referrerPolicy="no-referrer" className="w-full h-full object-cover opacity-40 blur-md absolute inset-0" />
                          <img src={result.thumbnail} referrerPolicy="no-referrer" className="w-full h-full object-contain relative z-10" />
                          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                            <PlayCircle size={56} className="text-white/80 drop-shadow-xl" />
                          </div>
                        </div>
                      )}

                      <div className="w-full h-px bg-zinc-800 mb-5" />
                      <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Tersedia untuk Diunduh</h4>

                      {/* AREA 1: Grid Khusus Gambar/Slide */}
                      {imageFiles.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar mb-4">
                          {imageFiles.map((file) => {
                            const safeFileName = `${sanitizeClientFileName(result.author)}-${sanitizeClientFileName(file.quality)}.${file.extension}`;
                            return (
                              <div key={file.id} className="group relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 aspect-[4/5] flex flex-col shadow-lg transition-transform hover:scale-[1.02]">
                                <div className="flex-1 relative w-full h-full bg-zinc-900 flex items-center justify-center overflow-hidden">
                                  <img src={file.url} referrerPolicy="no-referrer" alt={file.quality} className="w-full h-full object-cover transition duration-500 group-hover:opacity-60" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-90 pointer-events-none" />
                                  <div className="absolute top-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-[11px] font-bold uppercase text-zinc-200 shadow-xl">
                                    {file.quality}
                                  </div>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-center bg-zinc-950/40 backdrop-blur-sm border-t border-white/5">
                                  <div className="min-w-0 pr-2">
                                    <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider truncate">{file.extension} {file.size ? `• ${file.size}` : ""}</p>
                                  </div>
                                  <button onClick={() => handleDownloadNative(file.url, safeFileName)} className="w-11 h-11 flex items-center justify-center bg-white text-zinc-950 rounded-full hover:bg-zinc-200 transition-all shadow-xl" title={`Download ${file.quality}`}>
                                    <Download size={20} strokeWidth={2.5} />
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* AREA 2: Daftar Horizontal Khusus Video dan Audio */}
                      {mediaFiles.length > 0 && (
                        <div className="flex flex-col gap-3">
                          {mediaFiles.map((file) => {
                            const isAudio = ["mp3", "m4a"].includes(file.extension);
                            const safeFileName = `${sanitizeClientFileName(result.author)}-${sanitizeClientFileName(file.quality)}.${file.extension}`;

                            return (
                              <div key={file.id} className="flex items-center justify-between p-3 border border-zinc-800 rounded-xl bg-zinc-950/50 hover:bg-zinc-800 transition group text-left">
                                <div className="flex items-center gap-4 min-w-0 pr-2">
                                  <div className="w-12 h-12 shrink-0 rounded-lg bg-zinc-900 flex items-center justify-center overflow-hidden border border-zinc-800">
                                    {isAudio ? <Music size={22} className="text-zinc-500" /> : <FileVideo size={22} className="text-zinc-500" />}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate text-zinc-200">{file.quality}</p>
                                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{file.extension} {file.size ? `• ${file.size}` : ""}</p>
                                  </div>
                                </div>
                                <button onClick={() => handleDownloadNative(file.url, safeFileName)} className="p-3 mr-1 rounded-xl bg-white text-zinc-950 hover:scale-105 transition-transform shadow-md" title={`Unduh ${file.quality}`}>
                                  <Download size={18} strokeWidth={2.5} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}

              </motion.div>
            )}
          </AnimatePresence>

          {/* Supported Social Media Info */}
          <div className="max-w-2xl mx-auto mb-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-medium text-zinc-500">
              <Globe2 size={12}/> Supported Social Media
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              {supportedPlatforms.map((platform) => (
                <span key={platform} className="text-xs font-semibold text-zinc-600">
                  • {platform}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900/30 border border-zinc-800 p-6 sm:p-8 rounded-3xl text-left flex flex-col md:flex-row justify-between items-center gap-6 mb-16">
            <div className="flex gap-5 items-center">
              <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center shadow-inner"><UserRound size={28} className="text-zinc-400"/></div>
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Lead Developer</p>
                <h3 className="text-xl font-bold text-white mt-1">Ranzz</h3>
                <p className="text-xs text-zinc-400 mt-1">Full-Stack Engineer</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <a href="https://wa.me/6281214300828" className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:text-green-400 hover:border-green-500/50 transition-colors"><MessageCircle size={20}/></a>
              <a href="https://t.me/cangcuthideung" className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:text-sky-400 hover:border-sky-500/50 transition-colors"><Send size={20}/></a>
              <a href="https://github.com/RamzzzMD" className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:text-white hover:border-white/50 transition-colors"><GithubIcon size={20}/></a>
              <button onClick={()=>setShowQris(true)} className="flex items-center gap-2 px-5 bg-zinc-900 border border-zinc-800 rounded-xl hover:text-yellow-400 hover:border-yellow-500/50 transition-colors"><QrCode size={20}/> <span className="text-xs font-bold uppercase tracking-widest">Donasi</span></button>
            </div>
          </div>

          <section className="text-left mb-16">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-white"><HelpCircle className="text-zinc-500" /> Pertanyaan Umum</h2>
            <div className="grid gap-3">
              {faqs.map((faq, i) => (
                <div key={i} className="p-5 sm:p-6 border border-zinc-800 rounded-2xl bg-zinc-900/30 hover:bg-zinc-900/50 transition-colors">
                  <h4 className="font-semibold text-zinc-200 text-base">{faq.question}</h4>
                  <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>

          <footer className="border-t border-zinc-800 pt-8 pb-10">
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">© {new Date().getFullYear()} Ranzz Downloader. All rights reserved.</p>
          </footer>
        </div>
      </div>
    </main>
  );
}
