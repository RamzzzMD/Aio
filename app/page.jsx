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
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3-.3 6-1.5 6-6.5a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 5 3 6.2 6 6.5a4.8 4.8 0 0 0-1 3.2v4" />
    </svg>
  );
}

const platforms = [
  "TikTok",
  "Instagram",
  "Facebook",
  "X/Twitter",
  "YouTube",
  "Pinterest",
  "Threads",
];

const faqs = [
  {
    question: "Apa itu Ranzz Downloader?",
    answer:
      "Aplikasi downloader media all-in-one yang profesional dengan antarmuka bersih dan integrasi backend yang aman.",
  },
  {
    question: "Platform apa saja yang didukung?",
    answer:
      "Mendukung TikTok, Instagram, Facebook, X/Twitter, YouTube, Pinterest, Threads, dan lainnya.",
  },
  {
    question: "Apakah aman?",
    answer:
      "Ya. Semua pemrosesan ditangani secara aman di sisi server tanpa mengekspos konfigurasi sensitif ke browser.",
  },
  {
    question: "Siapa pengembangnya?",
    answer:
      "Aplikasi ini dikembangkan oleh Ranzz, spesialis full-stack web architecture dan desain UI/UX minimalis.",
  },
];

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function pick(...values) {
  return values.find(
    (value) => typeof value === "string" && value.trim().length > 0
  );
}

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
  return String(value || "media")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 70);
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

  // FUNGSI BARU: Mengunduh secara background tanpa buka tab baru
  async function handleDownloadBackground(fileUrl, fileName) {
    const toastId = toast.loading(`Mengunduh media...`);
    try {
      const res = await
