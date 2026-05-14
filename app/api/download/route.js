import axios from "axios";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function validateUrl(value) {
  if (!value || typeof value !== "string") {
    throw new Error("Please enter a valid media URL.");
  }

  const trimmed = value.trim();
  let parsed;

  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Invalid URL format.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Invalid URL. Please use an https:// link.");
  }

  return parsed.toString();
}

export async function POST(request) {
  try {
    const body = await request.json();
    const url = validateUrl(body?.url);

    // 1. Dapatkan headers dan cookie dari endpoint analytics
    const { headers } = await axios.get(
      "https://downr.org/.netlify/functions/analytics",
      {
        headers: {
          referer: "https://downr.org/",
          "user-agent":
            "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36",
        },
      }
    );

    // 2. Kirim POST request ke endpoint nyt dengan membawa cookie
    const { data } = await axios.post(
      "https://downr.org/.netlify/functions/nyt",
      {
        url: url,
      },
      {
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
          "user-agent":
            "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36",
        },
      }
    );

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (error) {
    const isAxios = axios.isAxiosError(error);

    const status = isAxios
      ? error.response?.status || 502
      : error.message?.includes("Invalid")
      ? 400
      : 500;

    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Failed to fetch media.";

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status }
    );
  }
}
