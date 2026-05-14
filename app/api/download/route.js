import axios from "axios";
import { NextResponse } from "next/server";
import ytdl from "@distube/ytdl-core";

export const runtime = "nodejs";

function validateUrl(value) {
  if (!value || typeof value !== "string") {
    throw new Error("Silakan masukkan URL media yang valid.");
  }
  const trimmed = value.trim();
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Format URL tidak valid.");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Gunakan link https://.");
  }
  return parsed.toString();
}

// 1. Scraper Khusus TikTok, IG, FB, dll (Menggunakan Downr)
async function fetchFromDownr(url) {
  const { headers } = await axios.get("https://downr.org/.netlify/functions/analytics", {
    headers: {
      referer: "https://downr.org/",
      "user-agent": "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36"
    },
  });

  const { data } = await axios.post("https://downr.org/.netlify/functions/nyt", { url: url }, {
    headers: {
      accept: "*/*",
      "accept-encoding": "gzip, deflate, br",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "content-type": "application/json",
      cookie: headers["set-cookie"]?.join("; ") || "",
      origin: "https://downr.org",
      referer: "https://downr.org/",
      "sec-ch-ua": '"Chromium";v="137", "Not/A)Brand";v="24"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36"
    },
  });

  return data;
}

// 2. Scraper Khusus YouTube (Menggunakan ytdl-core)
async function fetchFromYtdl(url) {
  const info = await ytdl.getInfo(url);
  
  // Ambil format yang memiliki Video sekaligus Audio
  let formats = ytdl.filterFormats(info.formats, 'videoandaudio');
  
  // Jika tidak ada format gabungan, ambil format video saja
  if (formats.length === 0) {
    formats = ytdl.filterFormats(info.formats, 'video');
  }
  
  const downloads = formats.map((format, index) => ({
    url: format.url,
    quality: format.qualityLabel || `Kualitas ${index + 1}`,
    extension: format.container || "mp4",
    type: "video",
    size: format.contentLength ? `${(format.contentLength / 1024 / 1024).toFixed(2)} MB` : ""
  }));

  return {
    title: info.videoDetails.title,
    author: info.videoDetails.author.name,
    thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1]?.url,
    source: "YouTube",
    downloads: downloads
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const url = validateUrl(body?.url);
    let data;

    // Logika Hybrid: Pisahkan YouTube dan Platform Lain
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      data = await fetchFromYtdl(url);
    } else {
      data = await fetchFromDownr(url);
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error.message || "Gagal mengambil media." },
      { status: error.message?.includes("valid") ? 400 : 500 }
    );
  }
}
