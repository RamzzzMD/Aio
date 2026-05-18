import axios from "axios";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Fungsi validasi dasar
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

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Gunakan link https:// atau http://.");
  }

  return parsed.toString();
}

// 1. Scraper Default (Downr)
async function downr(url) {
  try {
    if (!url.startsWith('https://') && !url.startsWith('http://')) throw new Error('Invalid url.');
    
    const { headers } = await axios.get('https://downr.org/.netlify/functions/analytics', {
      headers: {
        referer: 'https://downr.org/',
        'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
      }
    });
    
    const { data } = await axios.post('https://downr.org/.netlify/functions/nyt', {
      url: url
    }, {
      headers: {
        'accept': '*/*',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'content-type': 'application/json',
        'cookie': headers['set-cookie']?.join('; ') || '',
        'origin': 'https://downr.org',
        'referer': 'https://downr.org/',
        'sec-ch-ua': '"Chromium";v="137"',
        'sec-ch-ua-platform': '"Android"',
        'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
      }
    });
    
    return data;
  } catch (error) {
    throw new Error(error.message);
  }
}

// 2. Scraper Threads (LoveThreads)
async function loveThreadsDownloader(threadsUrl) {
  const params = new URLSearchParams()
  params.append("q", threadsUrl)
  params.append("t", "media")
  params.append("lang", "en")

  const response = await axios.post("https://lovethreads.net/api/ajaxSearch", params.toString(), {
    headers: {
      "accept": "/",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "origin": "https://lovethreads.net",
      "referer": "https://lovethreads.net/en",
      "user-agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    }
  })

  const html = response.data.data
  const downloadLinks = []
  
  const urlRegex = /https:\/\/dl\.snapcdn\.app\/get\?token=[^"'\s]+/g
  const matches = html.match(urlRegex)
  
  if (matches) {
    const uniqueLinks = [...new Set(matches)]
    downloadLinks.push(...uniqueLinks)
  }

  if (downloadLinks.length === 0) {
    throw new Error("Gagal menemukan media di Threads. Pastikan link valid.");
  }

  return {
    platform: "Threads",
    downloads: downloadLinks.map(url => ({ url: url }))
  };
}

// 3. Scraper Pinterest (Pindown via Axios, Tanpa Playwright)
async function pindownDownloader(pinUrl) {
  try {
    // a. Kita hit halaman utama pindown untuk mendapatkan session/cookies (seolah-olah browser asli)
    const initRes = await axios.get("https://pindown.io/en1", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36"
      }
    });
    const cookies = initRes.headers["set-cookie"]?.join("; ") || "";

    // b. Kirim POST (Submit Form) langsung ke endpoint /action milik mereka
    const formData = new URLSearchParams();
    formData.append("url", pinUrl);

    const response = await axios.post("https://pindown.io/action", formData.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Origin": "https://pindown.io",
        "Referer": "https://pindown.io/en1",
        "Cookie": cookies,
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36",
        "X-Requested-With": "XMLHttpRequest"
      }
    });

    const result = response.data;
    
    if (!result || !result.html) {
      throw new Error("Gagal mengambil data dari server pindown.");
    }

    const html = result.html;
    const downloadLinks = [];
    
    // c. Regex ekstrak data yang sama dengan kodingan Playwright Anda
    const matches = html.match(/https:\/\/dl\.pincdn\.app\/v2\?token=[^"'\s]+/g);
    if (matches) downloadLinks.push(...[...new Set(matches)]);
    
    const directMatches = html.match(/https:\/\/v1\.pinimg\.com\/videos\/[^"'\s]+\.mp4/g);
    if (directMatches) downloadLinks.push(...[...new Set(directMatches)]);
    
    const titleMatch = html.match(/<strong>([^<]+)<\/strong>/);
    const descriptionMatch = html.match(/<span class='video-des'>([^<]+)<\/span>/);

    if (downloadLinks.length === 0) {
      throw new Error("Gagal menemukan media di Pinterest.");
    }

    return {
      platform: "Pinterest",
      caption: `${titleMatch ? titleMatch[1] : ""} - ${descriptionMatch ? descriptionMatch[1] : ""}`.trim(),
      downloads: downloadLinks.map(url => ({ url: url }))
    };
  } catch (error) {
    throw new Error("Terjadi kesalahan sistem saat mengekstrak Pinterest: " + error.message);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const url = validateUrl(body?.url);
    
    let data;

    // Logika Switch Scraper Berdasarkan URL
    if (url.includes("threads.net")) {
      data = await loveThreadsDownloader(url);
    } else if (url.includes("pin.it") || url.includes("pinterest.com") || url.includes("pinterest.co")) {
      data = await pindownDownloader(url);
    } else {
      data = await downr(url);
    }

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (error) {
    const isAxios = axios.isAxiosError(error);

    const status = isAxios
      ? error.response?.status || 502
      : error.message?.includes("valid") || error.message?.includes("Invalid")
      ? 400
      : 500;

    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Gagal mengambil media.";

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status }
    );
  }
}
