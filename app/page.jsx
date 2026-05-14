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
  FileVideo,
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

function sanitizeClientFileName(value) {
  return String(value || "media").replace(/[<>:"/\\|?*\x00-\x1F]/g, "").replace(/\s+/g, "-").slice(0, 70);
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
  const title = pick(root.title, root.caption, root.description, root.text) || "Untitled Media";
  const author = pick(root.author, root.uploader, root.username) || "Unknown Creator";
  const thumbnail = pick(root.thumbnail, root.thumb, root.cover) || "";
  const source = pick(root.source, root.platform) || "Social Media";
  
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

  return { title, author, thumbnail, source, downloads: uniqueMapped };
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

      {/* Modal QRIS */}
      <AnimatePresence>
        {showQris && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowQris(false)} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 relative max-w-xs w-full text-center">
              <button onClick={() => setShowQris(false)} className="absolute right-4 top-4 text-zinc-500 hover:text-white transition-colors"><X /></button>
              <h3 className="font-bold mb-4 text-white">Donasi QRIS</h3>
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=RanzzDonation" className="mx-auto rounded-xl mb-4 bg-white p-2 shadow-inner" />
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
          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight text-white">
            Download <span className="text-zinc-500">ALL</span> Social Media.
          </h1>
          
          {/* Form Input */}
          <form onSubmit={handleSubmit} className="mb-12">
            <div className="bg-zinc-900/50 border border-zinc-800 p-2 rounded-2xl flex flex-col sm:flex-row gap-2 transition-colors focus-within:border-zinc-600">
              <div className="flex flex-1 items-center gap-2 bg-transparent px-3">
                <Link2 className="text-zinc-400 shrink-0" size={20} />
                <input 
                  value={url} 
                  onChange={(e)=>setUrl(e.target.value)} 
                  placeholder="Paste URL here..." 
                  className="bg-transparent flex-1 py-3 outline-none text-sm md:text-base text-zinc-100 placeholder:text-zinc-600" 
                />
                
                <button type="button" onClick={handlePaste} className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition" title="Tempel URL">
                  <Clipboard size={18} />
                </button>

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
              
              <button disabled={loading} className="bg-white text-zinc-950 px-8 py-3 rounded-xl font-bold hover:bg-zinc-200 transition disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin inline" size={20}/> : "Extract"}
              </button>
            </div>
          </form>

          {/* Result Card (Gallery Grid Mode) */}
          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="bg-zinc-900 border border-zinc-800 p-5 sm:p-7 rounded-3xl text-left mb-12 shadow-2xl">
                
                {/* Bagian Header Media */}
                <div className="flex items-center gap-5 mb-6 pb-6 border-b border-zinc-800">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-zinc-950 rounded-2xl overflow-hidden shrink-0 border border-zinc-800 shadow-inner">
                    {result.thumbnail ? (
                      <img src={result.thumbnail} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    ) : (
                      <PlayCircle className="m-auto mt-5 sm:mt-7 text-zinc-700" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-800/50 border border-zinc-700/50 px-2.5 py-1 rounded-md">{result.source}</span>
                    <h2 className="text-lg sm:text-2xl font-bold line-clamp-2 mt-2.5 text-white">{result.title}</h2>
                    <p className="text-xs sm:text-sm text-zinc-500 mt-1.5">Kreator: <span className="text-zinc-300 font-medium">{result.author}</span></p>
                  </div>
                </div>

                {/* Bagian Grid Galeri */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {result.downloads.map((file, i) => {
                    const isImage = file.extension === 'jpg' || file.extension === 'png' || file.extension === 'webp';
                    const isVideo = file.extension === 'mp4' || file.extension === 'mov';
                    const isAudio = file.extension === 'mp3' || file.extension === 'm4a';

                    // Gunakan gambar aslinya jika itu slide foto, atau thumbnail jika itu video
                    const previewSrc = isImage ? file.url : (isVideo ? result.thumbnail : null);
                    // Nama file unik per item
                    const safeFileName = `${sanitizeClientFileName(result.title)}-${sanitizeClientFileName(file.quality)}.${file.extension}`;

                    return (
                      <div key={file.id} className="group relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 aspect-[3/4] flex flex-col shadow-lg">
                        
                        {/* Area Thumbnail */}
                        <div className="flex-1 relative w-full h-full bg-zinc-900 flex items-center justify-center overflow-hidden">
                          {previewSrc ? (
                            <img src={previewSrc} referrerPolicy="no-referrer" alt={file.quality} className="w-full h-full object-cover transition duration-500 group-hover:scale-110 group-hover:opacity-60" />
                          ) : (
                            isAudio ? <Music size={32} className="text-zinc-700" /> : <FileVideo size={32} className="text-zinc-700" />
                          )}
                          
                          {/* Gradient pelindung agar teks terbaca */}
                          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-90 pointer-events-none" />
                          
                          {/* Label Kualitas/Slide */}
                          <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-[10px] font-bold uppercase text-zinc-200 shadow-xl pointer-events-none">
                            {file.quality}
                          </div>
                        </div>

                        {/* Area Aksi Tombol */}
                        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 flex justify-between items-end pointer-events-none">
                          <div className="min-w-0 pr-2">
                            <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">{file.extension} {file.size ? `• ${file.size}` : ""}</p>
                          </div>
                          
                          <button 
                            onClick={() => handleDownloadNative(file.url, safeFileName)} 
                            className="w-10 h-10 flex items-center justify-center bg-white text-zinc-950 rounded-full hover:scale-110 hover:bg-zinc-200 transition-all shadow-xl pointer-events-auto"
                            title={`Download ${file.quality}`}
                          >
                            <Download size={18} />
                          </button>
                        </div>

                      </div>
                    )
                  })}
                </div>

              </motion.div>
            )}
          </AnimatePresence>

          {/* Dev Card */}
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
              <a href="https://wa.me/628123456789" className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:text-green-400 hover:border-green-500/50 transition-colors"><MessageCircle size={20}/></a>
              <a href="https://t.me/Ranzz" className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:text-sky-400 hover:border-sky-500/50 transition-colors"><Send size={20}/></a>
              <a href="https://github.com/RamzzzMD" className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:text-white hover:border-white/50 transition-colors"><GithubIcon size={20}/></a>
              <button onClick={()=>setShowQris(true)} className="flex items-center gap-2 px-5 bg-zinc-900 border border-zinc-800 rounded-xl hover:text-yellow-400 hover:border-yellow-500/50 transition-colors"><QrCode size={20}/> <span className="text-xs font-bold uppercase tracking-widest">Donasi</span></button>
            </div>
          </div>

          {/* FAQ Section */}
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
