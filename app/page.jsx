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
      "A professional, all-in-one social media downloader featuring a clean user interface and secure backend processing.",
  },
  {
    question: "Which platforms are supported?",
    answer:
      "The app supports TikTok, Instagram, Facebook, X/Twitter, YouTube, Pinterest, Threads, and more depending on availability.",
  },
  {
    question: "Is it secure?",
    answer:
      "Yes. All processing is handled securely on the server side without exposing any sensitive configuration to the browser.",
  },
  {
    question: "Why does some media fail to download?",
    answer:
      "Some videos may be private, deleted, region-restricted, or simply unsupported by the current media resolution provider.",
  },
  {
    question: "Who is the developer?",
    answer:
      "This application is engineered by Ranzz, specializing in modern full-stack web architecture and minimalist UI/UX design.",
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

  const title =
    pick(
      root.title,
      root.caption,
      root.description,
      root.text,
      root.name,
      root.fulltitle
    ) || "Untitled Media";

  const author =
    pick(
      root.author,
      root.uploader,
      root.username,
      root.user,
      root.channel,
      root.creator
    ) || "Unknown Creator";

  const thumbnail =
    pick(
      root.thumbnail,
      root.thumb,
      root.cover,
      root.image,
      root.preview,
      root.poster
    ) || "";

  const source =
    pick(root.source, root.platform, root.extractor, root.service) ||
    "Social Platform";

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
        entry.audio
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
          entry.format
        ) || `File ${index + 1}`;

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
    new Map(mappedDownloads.map((item) => [item.url, item])).values()
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
    throw new Error("Please enter a media URL.");
  }

  let parsed;

  try {
    parsed = new URL(url.trim());
  } catch {
    throw new Error("The URL format is invalid.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Please use a secure https:// URL.");
  }

  return parsed.toString();
}

function downloadProxyHref(file, title) {
  const extension = file.extension || "mp4";
  const name = `${sanitizeClientFileName(title)}-${sanitizeClientFileName(
    file.quality
  )}.${extension}`;

  return `/api/file?url=${encodeURIComponent(
    file.url
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
  hidden: { opacity: 0, y: 20 },
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
    [url, loading]
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
        throw new Error("Media found, but no direct downloadable link was returned.");
      }

      setResult(normalized);
      toast.success("Media parsed successfully.");
    } catch (error) {
      const message =
        error.message || "Could not resolve downloadable content for this link.";

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
      toast.success("Copied to clipboard.");
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Failed to copy URL.");
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#09090b] text-zinc-100">
      <Toaster
        richColors
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: "#18181b",
            border: "1px solid #27272a",
            color: "#e4e4e7",
          },
        }}
      />

      <section className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10 sm:px-10 lg:px-12">
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-16 flex items-center justify-between border-b border-zinc-800 pb-6"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
              <ArrowDownToLine className="h-5 w-5 text-zinc-950" />
            </div>

            <div>
              <p className="text-sm font-bold tracking-wide text-white">
                Ranzz Downloader
              </p>
              <p className="text-xs text-zinc-400">Media Parsing Utility</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-xs text-zinc-400 sm:flex">
            <ShieldCheck className="h-4 w-4 text-zinc-300" />
            Secure Tunnel
          </div>
        </motion.nav>

        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center pb-16 text-center">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.6 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-1.5 text-xs font-medium text-zinc-300"
          >
            <Sparkles className="h-3.5 w-3.5 text-zinc-100" />
            Engineered for reliability
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.6, delay: 0.05 }}
            className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            Download Social Media.{" "}
            <span className="text-zinc-500">Professionally.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg"
          >
            Paste a public link below to parse and retrieve source files. Fast, secure, and completely unbranded processing.
          </motion.p>

          <motion.form
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.6, delay: 0.15 }}
            onSubmit={handleSubmit}
            className="mt-10 w-full max-w-2xl"
          >
            <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-2 sm:flex-row focus-within:border-zinc-600 transition-colors">
              <div className="flex flex-1 items-center gap-3 rounded-xl px-4 py-3">
                <Link2 className="h-5 w-5 shrink-0 text-zinc-400" />
                <input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="Insert https:// URL..."
                  className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600 sm:text-base"
                />
                {url && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-zinc-950 transition-all hover:bg-zinc-200",
                  "disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <ArrowDownToLine className="h-4 w-4" />
                    Extract
                  </>
                )}
              </button>
            </div>
          </motion.form>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 flex flex-wrap justify-center gap-3"
          >
            {platforms.map((platform) => (
              <span
                key={platform}
                className="text-xs font-medium text-zinc-500"
              >
                {platform}
              </span>
            ))}
          </motion.div>

          <AnimatePresence mode="wait">
            {errorState && !loading && !result && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-12 w-full rounded-2xl border border-red-900/30 bg-red-950/20 p-6 text-left"
              >
                <div className="flex items-center gap-4">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                  <div>
                    <h3 className="text-sm font-semibold text-red-200">
                      Extraction Failed
                    </h3>
                    <p className="mt-1 text-sm text-red-400/80">
                      {errorState}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-12 w-full"
              >
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-2 text-left">
                  <div className="grid gap-6 rounded-xl bg-zinc-900 p-5 md:grid-cols-[280px_1fr]">
                    <div className="relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
                      {result.thumbnail ? (
                        <img
                          src={result.thumbnail}
                          alt={result.title}
                          className="h-64 w-full object-cover md:h-full"
                        />
                      ) : (
                        <div className="flex h-64 w-full items-center justify-center md:h-full">
                          <PlayCircle className="h-12 w-12 text-zinc-700" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col justify-between py-2">
                      <div>
                        <div className="mb-3 flex items-center gap-2">
                          <span className="rounded-md bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-300">
                            {result.source}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {result.downloads.length} format(s) found
                          </span>
                        </div>

                        <h2 className="line-clamp-2 text-xl font-semibold text-white">
                          {result.title}
                        </h2>

                        <p className="mt-2 text-sm text-zinc-400">
                          {result.author}
                        </p>
                      </div>

                      <div className="mt-6 grid gap-2 sm:grid-cols-2">
                        {result.downloads.map((file) => (
                          <a
                            key={file.id}
                            href={downloadProxyHref(file, result.title)}
                            className="group flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 transition hover:border-zinc-600 hover:bg-zinc-800"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                                <MediaIcon type={file.type} />
                                <span className="truncate">
                                  {file.quality}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-zinc-500 uppercase">
                                {file.extension}
                                {file.size ? ` • ${file.size}` : ""}
                              </p>
                            </div>

                            <Download className="h-4 w-4 text-zinc-400 transition group-hover:text-white" />
                          </a>
                        ))}
                      </div>
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
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-16 grid w-full gap-4 md:grid-cols-3"
          >
            {[
              {
                icon: ShieldCheck,
                title: "Private & Secure",
                text: "No logs stored. Processing is tunneled through backend.",
              },
              {
                icon: Code2,
                title: "Clean Code",
                text: "Built with Next.js App Router for optimal performance.",
              },
              {
                icon: Zap,
                title: "High Speed",
                text: "Instant parsing directly from the provider API network.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 text-left"
              >
                <item.icon className="h-5 w-5 text-zinc-400" />
                <h3 className="mt-4 font-semibold text-zinc-100">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  {item.text}
                </p>
              </div>
            ))}
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-12 w-full rounded-2xl border border-zinc-800 bg-zinc-900/30 p-8 text-left"
          >
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-800">
                  <UserRound className="h-6 w-6 text-zinc-300" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                    Lead Developer
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-white">Ranzz</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Full-Stack Engineer
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <footer className="mt-16 w-full border-t border-zinc-800 pt-8 text-center">
            <p className="text-xs text-zinc-600">
              © {new Date().getFullYear()} Ranzz Downloader. All rights reserved.
            </p>
          </footer>
        </div>
      </section>
    </main>
  );
}
