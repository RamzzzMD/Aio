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
  Music,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wand2,
  Zap,
} from "lucide-react";
import { Toaster, toast } from "sonner";

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
    question: "What is Ranzz Downloader?",
    answer:
      "Ranzz Downloader is an all-in-one social media downloader with premium dark UI, smooth animations, and secure backend API integration.",
  },
  {
    question: "Which platforms are supported?",
    answer:
      "The app is designed to support TikTok, Instagram, Facebook, X/Twitter, YouTube, Pinterest, Threads, and other platforms depending on API support.",
  },
  {
    question: "Is my API key safe?",
    answer:
      "Yes. The RapidAPI key is stored inside the backend environment variable, so it is never exposed directly to the browser.",
  },
  {
    question: "Why does some media fail to download?",
    answer:
      "Some videos may be private, deleted, region-restricted, or unsupported by the third-party API provider.",
  },
  {
    question: "Who is the developer?",
    answer:
      "This application was developed by Ranzz, focused on modern full-stack web development and premium UI/UX design.",
  },
];

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function pick(...values) {
  return values.find(
    (value) => typeof value === "string" && value.trim().length > 0,
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

  const title =
    pick(
      root.title,
      root.caption,
      root.description,
      root.text,
      root.name,
      root.fulltitle,
    ) || "Untitled media";

  const author =
    pick(
      root.author,
      root.uploader,
      root.username,
      root.user,
      root.channel,
      root.creator,
    ) || "Unknown creator";

  const thumbnail =
    pick(
      root.thumbnail,
      root.thumb,
      root.cover,
      root.image,
      root.preview,
      root.poster,
    ) || "";

  const source =
    pick(root.source, root.platform, root.extractor, root.service) ||
    "Social media";

  const possibleDownloads =
    root.medias ||
    root.media ||
    root.links ||
    root.downloads ||
    root.files ||
    root.items ||
    [];

  let downloads = Array.isArray(possibleDownloads) ? possibleDownloads : [];

  if (!downloads.length) {
    const directCandidates = [
      root.url,
      root.downloadUrl,
      root.download_url,
      root.video,
      root.audio,
    ].filter(Boolean);

    downloads = directCandidates.map((url, index) => ({
      url,
      quality: index === 0 ? "Default" : `Media ${index + 1}`,
    }));
  }

  const mappedDownloads = downloads
    .map((item, index) => {
      const entry = typeof item === "string" ? { url: item } : item || {};

      const fileUrl = pick(
        entry.url,
        entry.link,
        entry.href,
        entry.download,
        entry.downloadUrl,
        entry.download_url,
        entry.video,
        entry.audio,
      );

      if (!fileUrl) return null;

      const type =
        pick(entry.type, entry.mimeType, entry.mime, entry.format) || "video";

      const extension =
        pick(entry.extension, entry.ext) || detectExtension(fileUrl, type);

      const quality =
        pick(
          entry.quality,
          entry.resolution,
          entry.label,
          entry.name,
          entry.format_id,
          entry.format,
        ) || `Media ${index + 1}`;

      const size =
        pick(entry.size, entry.filesize, entry.fileSize, entry.sizeLabel) || "";

      return {
        id: `${fileUrl}-${index}`,
        url: fileUrl,
        type,
        extension,
        quality,
        size,
      };
    })
    .filter(Boolean);

  const uniqueDownloads = Array.from(
    new Map(mappedDownloads.map((item) => [item.url, item])).values(),
  );

  return {
    title,
    author,
    thumbnail,
    source,
    downloads: uniqueDownloads,
    raw: root,
  };
}

function validateInputUrl(url) {
  if (!url.trim()) {
    throw new Error("Paste a social media URL first.");
  }

  let parsed;

  try {
    parsed = new URL(url.trim());
  } catch {
    throw new Error("That URL does not look valid.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Please use a valid https:// URL.");
  }

  return parsed.toString();
}

function downloadProxyHref(file, title) {
  const extension = file.extension || "mp4";

  const name = `${sanitizeClientFileName(title)}-${sanitizeClientFileName(
    file.quality,
  )}.${extension}`;

  return `/api/file?url=${encodeURIComponent(
    file.url,
  )}&name=${encodeURIComponent(name)}`;
}

function MediaIcon({ type }) {
  const normalized = String(type || "").toLowerCase();

  if (normalized.includes("audio")) {
    return <Music className="h-4 w-4" />;
  }

  if (normalized.includes("image")) {
    return <ImageIcon className="h-4 w-4" />;
  }

  return <FileVideo className="h-4 w-4" />;
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export default function Page() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [errorState, setErrorState] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const canSubmit = useMemo(
    () => url.trim().length > 0 && !loading,
    [url, loading],
  );

  async function handleSubmit(event) {
    event.preventDefault();

    setErrorState("");
    setResult(null);

    let cleanUrl;

    try {
      cleanUrl = validateInputUrl(url);
    } catch (error) {
      toast.error(error.message);
      setErrorState(error.message);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: cleanUrl }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "Unable to fetch this media.");
      }

      const normalized = normalizeApiResponse(payload.data);

      if (!normalized.downloads.length) {
        throw new Error(
          "Media was found, but no downloadable file was returned.",
        );
      }

      setResult(normalized);
      toast.success("Media fetched successfully.");
    } catch (error) {
      const message =
        error.message || "We could not find downloadable media for this link.";

      setErrorState(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("URL copied.");
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Could not copy URL.");
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] text-white">
      <Toaster
        richColors
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: "rgba(15, 23, 42, 0.9)",
            border: "1px solid rgba(148, 163, 184, 0.2)",
            backdropFilter: "blur(18px)",
          },
        }}
      />

      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-purple-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute left-0 top-1/3 h-[360px] w-[360px] rounded-full bg-fuchsia-500/10 blur-[110px]" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-8 sm:px-8 lg:px-10">
        <motion.nav
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 shadow-[0_0_35px_rgba(34,211,238,0.25)]">
              <ArrowDownToLine className="h-5 w-5 text-cyan-300" />
            </div>

            <div>
              <p className="text-sm font-semibold tracking-wide text-white">
                Ranzz Downloader
              </p>
              <p className="text-xs text-slate-400">All-in-one media fetcher</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-slate-300 backdrop-blur-xl sm:flex">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            API key protected
          </div>
        </motion.nav>

        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center pb-14 text-center">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.65 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100 shadow-[0_0_50px_rgba(34,211,238,0.12)] backdrop-blur-xl"
          >
            <Sparkles className="h-4 w-4 text-cyan-300" />
            Premium downloader experience
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.75, delay: 0.05 }}
            className="max-w-5xl bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-5xl font-black tracking-tight text-transparent sm:text-6xl lg:text-7xl"
          >
            Download Social Media Content With{" "}
            <span className="bg-gradient-to-r from-cyan-300 via-purple-300 to-fuchsia-300 bg-clip-text text-transparent">
              Neon Speed
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.75, delay: 0.12 }}
            className="mt-6 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg"
          >
            Paste a public video or media link, fetch the result securely from
            your backend, then download available qualities from a sleek
            glassmorphism result card.
          </motion.p>

          <motion.form
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.75, delay: 0.18 }}
            onSubmit={handleSubmit}
            className="mt-10 w-full max-w-4xl"
          >
            <div className="group rounded-[2rem] border border-white/10 bg-white/[0.04] p-2 shadow-2xl shadow-cyan-950/30 backdrop-blur-2xl transition duration-300 focus-within:border-cyan-300/50 focus-within:shadow-[0_0_70px_rgba(34,211,238,0.2)]">
              <div className="flex flex-col gap-3 rounded-[1.5rem] bg-slate-950/70 p-3 sm:flex-row">
                <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-left transition focus-within:border-cyan-300/40">
                  <Link2 className="h-5 w-5 shrink-0 text-cyan-300" />

                  <input
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="Paste https:// social media URL here..."
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500 sm:text-base"
                  />

                  {url && (
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                      aria-label="Copy URL"
                    >
                      {copied ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>

                <motion.button
                  type="submit"
                  disabled={!canSubmit}
                  whileHover={canSubmit ? { scale: 1.02 } : undefined}
                  whileTap={canSubmit ? { scale: 0.97 } : undefined}
                  className={cn(
                    "relative overflow-hidden rounded-2xl px-7 py-4 font-bold text-slate-950 transition",
                    "bg-gradient-to-r from-cyan-300 via-sky-300 to-purple-300",
                    "shadow-[0_0_45px_rgba(34,211,238,0.28)]",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Fetching magic...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-5 w-5" />
                        Fetch
                      </>
                    )}
                  </span>
                </motion.button>
              </div>
            </div>
          </motion.form>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.75, delay: 0.24 }}
            className="mt-6 flex flex-wrap justify-center gap-2"
          >
            {platforms.map((platform) => (
              <span
                key={platform}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400 backdrop-blur-xl"
              >
                {platform}
              </span>
            ))}
          </motion.div>

          <AnimatePresence mode="wait">
            {errorState && !loading && !result && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.35 }}
                className="mt-10 w-full max-w-3xl rounded-[2rem] border border-rose-300/15 bg-rose-400/[0.06] p-8 text-left shadow-2xl shadow-rose-950/20 backdrop-blur-2xl"
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-rose-300/20 bg-rose-300/10">
                    <AlertTriangle className="h-8 w-8 text-rose-300" />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Media Not Found
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-slate-400">
                      {errorState} Try another public link or make sure the URL
                      is accessible.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 28, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.98 }}
                transition={{ duration: 0.45 }}
                className="mt-12 w-full max-w-5xl"
              >
                <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.05] p-3 text-left shadow-2xl shadow-cyan-950/30 backdrop-blur-2xl">
                  <div className="grid gap-5 rounded-[1.5rem] bg-slate-950/70 p-4 md:grid-cols-[320px_1fr]">
                    <div className="relative overflow-hidden rounded-[1.4rem] border border-white/10 bg-slate-900">
                      {result.thumbnail ? (
                        <img
                          src={result.thumbnail}
                          alt={result.title}
                          className="h-72 w-full object-cover md:h-full"
                        />
                      ) : (
                        <div className="flex h-72 w-full items-center justify-center md:h-full">
                          <PlayCircle className="h-20 w-20 text-slate-700" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                      <div className="absolute bottom-4 left-4 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-slate-200 backdrop-blur-xl">
                        {result.source}
                      </div>
                    </div>

                    <div className="flex flex-col justify-between p-2 sm:p-4">
                      <div>
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-medium text-cyan-100">
                            <Zap className="h-3.5 w-3.5 text-cyan-300" />
                            Ready to download
                          </span>

                          <span className="inline-flex items-center gap-2 rounded-full border border-purple-300/20 bg-purple-300/10 px-3 py-1.5 text-xs font-medium text-purple-100">
                            <Globe2 className="h-3.5 w-3.5 text-purple-300" />
                            {result.downloads.length} file
                            {result.downloads.length > 1 ? "s" : ""}
                          </span>
                        </div>

                        <h2 className="line-clamp-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                          {result.title}
                        </h2>

                        <p className="mt-3 text-sm text-slate-400">
                          By{" "}
                          <span className="font-semibold text-slate-200">
                            {result.author}
                          </span>
                        </p>
                      </div>

                      <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={{
                          hidden: {},
                          visible: {
                            transition: {
                              staggerChildren: 0.08,
                            },
                          },
                        }}
                        className="mt-8 grid gap-3 sm:grid-cols-2"
                      >
                        {result.downloads.map((file) => (
                          <motion.a
                            key={file.id}
                            variants={fadeUp}
                            href={downloadProxyHref(file, result.title)}
                            whileHover={{ scale: 1.025 }}
                            whileTap={{ scale: 0.98 }}
                            className="group rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:shadow-[0_0_35px_rgba(34,211,238,0.14)]"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 text-sm font-bold text-white">
                                  <MediaIcon type={file.type} />
                                  <span className="truncate">
                                    {file.quality}
                                  </span>
                                </div>

                                <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">
                                  {file.extension}
                                  {file.size ? ` • ${file.size}` : ""}
                                </p>
                              </div>

                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950 transition group-hover:rotate-3 group-hover:scale-105">
                                <Download className="h-5 w-5" />
                              </div>
                            </div>
                          </motion.a>
                        ))}
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.75, delay: 0.3 }}
            className="mt-14 grid w-full max-w-5xl gap-4 md:grid-cols-3"
          >
            {[
              {
                icon: ShieldCheck,
                title: "Secure API Layer",
                text: "RapidAPI requests stay inside your Next.js backend.",
              },
              {
                icon: Sparkles,
                title: "Premium UI",
                text: "Dark glassmorphism layout with neon hover states.",
              },
              {
                icon: Zap,
                title: "Fast UX",
                text: "Smooth loading, toast errors, and animated results.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 text-left backdrop-blur-2xl transition hover:border-cyan-300/30 hover:bg-white/[0.06]"
              >
                <item.icon className="h-6 w-6 text-cyan-300" />
                <h3 className="mt-4 font-bold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {item.text}
                </p>
              </div>
            ))}
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.75, delay: 0.36 }}
            className="mt-8 w-full max-w-5xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 text-left shadow-2xl shadow-purple-950/20 backdrop-blur-2xl"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-purple-300/20 bg-purple-300/10 shadow-[0_0_45px_rgba(168,85,247,0.18)]">
                  <UserRound className="h-8 w-8 text-purple-300" />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-purple-300">
                    Developer
                  </p>

                  <h3 className="mt-1 text-2xl font-black text-white">Ranzz</h3>

                  <p className="mt-1 text-sm text-slate-400">
                    Full-Stack Web Developer & UI/UX Designer
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100">
                <Code2 className="h-4 w-4 text-cyan-300" />
                Built with Next.js
              </div>
            </div>
          </motion.div>

          <motion.section
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.75, delay: 0.42 }}
            className="mt-10 w-full max-w-5xl text-left"
          >
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">
                  F&Q
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Frequently Asked Questions
                </h2>
              </div>

              <div className="hidden h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 sm:flex">
                <HelpCircle className="h-7 w-7 text-cyan-300" />
              </div>
            </div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.08,
                  },
                },
              }}
              className="grid gap-4"
            >
              {faqs.map((faq, index) => (
                <motion.div
                  key={faq.question}
                  variants={fadeUp}
                  className="group rounded-3xl border border-white/10 bg-white/[0.035] p-6 backdrop-blur-2xl transition hover:border-cyan-300/30 hover:bg-white/[0.06] hover:shadow-[0_0_40px_rgba(34,211,238,0.08)]"
                >
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-purple-300/20 bg-purple-300/10 text-sm font-black text-purple-200">
                      {index + 1}
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {faq.question}
                      </h3>

                      <p className="mt-2 text-sm leading-7 text-slate-400">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.section>

          <footer className="mt-14 w-full max-w-5xl border-t border-white/10 py-8 text-center">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} Ranzz Downloader. Developed by{" "}
              <span className="font-bold text-cyan-300">Ranzz</span>.
            </p>
          </footer>
        </div>
      </section>
    </main>
  );
}
