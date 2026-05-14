import { NextResponse } from "next/server";

export const runtime = "nodejs";

function sanitizeFileName(name) {
  return String(name || "download")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get("url");
    const fileName = sanitizeFileName(searchParams.get("name") || "media");

    if (!targetUrl) throw new Error("URL file tidak ditemukan.");

    // KUNCI PERBAIKAN: Gunakan User-Agent Android 15 yang SAMA PERSIS dengan 
    // scraper downr.org agar signature URL YouTube tidak bocor/diblokir.
    const headers = {
      "user-agent": "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36",
      "accept": "*/*"
    };

    // Jangan kirim referer Google untuk link YouTube (googlevideo) agar tidak dicurigai
    if (!targetUrl.includes("googlevideo.com")) {
      headers["referer"] = "https://www.google.com/";
    }

    const upstream = await fetch(targetUrl, {
      redirect: "follow",
      headers: headers,
    });

    if (!upstream.ok || !upstream.body) {
      // FALLBACK: Jika server proxy kita (misal IP Vercel) tetap diblokir oleh YouTube,
      // alihkan (redirect) pengguna secara paksa agar browser pengguna yang langsung 
      // mengunduh file dari server googlevideo.
      if (targetUrl.includes("googlevideo.com")) {
         return NextResponse.redirect(targetUrl);
      }

      return NextResponse.json(
        { ok: false, message: `Server media menolak permintaan (Status: ${upstream.status}). File diproteksi.` },
        { status: upstream.status || 502 }
      );
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const contentLength = upstream.headers.get("content-length");

    const responseHeaders = {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    };

    if (contentLength) {
      responseHeaders["Content-Length"] = contentLength;
    }

    return new NextResponse(upstream.body, {
      headers: responseHeaders,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error.message || "Gagal mengunduh file." },
      { status: 400 }
    );
  }
}
