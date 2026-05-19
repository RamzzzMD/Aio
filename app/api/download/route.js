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

// 3. Native Pinterest Scraper (Pindl)
async function pindl(url) {
  if (!url) throw new Error("Where's the Pinterest Link!");
  if (!url.includes('pin')) throw new Error("It should be a Pinterest link, not another link!");
  
  const response = await axios.get(url, {
      headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      maxRedirects: 5
  });
  
  const html = response.data;
  let title = null;
  let caption = null;
  let mainImageUrl = null;
  let isVideo = false;
  let author = null;
  let createdAt = null;
  let statistics = {};
  let allMedia = [];
  
  const relayMatch = html.match(/"v3GetPinQueryv2":([\s\S]*?\}\}\}\}\}\);<\/script>|[\s\S]*?\}\}\}\}\})/);
  
  if (relayMatch && relayMatch[1]) {
      try {
          let jsonString = '{"data":' + relayMatch[1].split('});</script>')[0].trim();
          if (jsonString.endsWith(';')) jsonString = jsonString.slice(0, -1);
          const parsed = JSON.parse(jsonString);
          const pinData = parsed?.data?.v3GetPinQueryv2?.data;
          
          if (pinData) {
              title = pinData.title || pinData.closeupUnifiedTitle || pinData.gridTitle || null;
              caption = pinData.closeupUnifiedDescription || pinData.description || pinData.seoDescription || null;
              isVideo = pinData.videos !== null;
              mainImageUrl = pinData.images_orig?.url || pinData.images_736x?.url || null;
              
              if (isVideo) {
                  const videoList = pinData.videos?.videoList;
                  if (videoList) {
                      allMedia = Object.keys(videoList)
                          .filter(key => videoList[key] && typeof videoList[key] === 'object' && videoList[key].url)
                          .map(key => ({
                              type: 'video',
                              quality: key.replace(/^v/, '').toUpperCase(),
                              width: videoList[key].width || null,
                              height: videoList[key].height || null,
                              url: videoList[key].url
                          }));
                  }
              } else if (pinData.carouselData && pinData.carouselData.carouselSlots) {
                  allMedia = pinData.carouselData.carouselSlots.map((slot) => ({
                      type: 'image',
                      quality: 'ORIGINAL',
                      width: slot.images_1200x?.width || slot.images_736x?.width || null,
                      height: slot.images_1200x?.height || slot.images_736x?.height || null,
                      url: slot.images_1200x?.url || slot.images_736x?.url || slot.images_orig?.url || null
                  }));
              } else if (mainImageUrl) {
                  allMedia.push({
                      type: 'image',
                      quality: 'ORIGINAL',
                      width: pinData.images_orig?.width || null,
                      height: pinData.images_orig?.height || null,
                      url: mainImageUrl
                  });
              }
              
              if (pinData.pinner || pinData.closeupAttribution) {
                  const pinner = pinData.pinner || pinData.closeupAttribution;
                  author = {
                      username: pinner.username || null,
                      fullName: pinner.fullName || null,
                      avatar: pinner.imageLargeUrl || pinner.imageMediumUrl || null
                  };
              }
              createdAt = pinData.createdAt || null;
              statistics = {
                  saves: pinData.aggregatedPinData?.aggregatedStats?.saves || 0,
                  comments: pinData.commentCount || 0,
                  shares: pinData.shareCount || 0
              };
          }
      } catch (err) {
          // Lewati ke sistem fallback jika JSON parse gagal
      }
  }
  
  if (!title) {
      const titleRegex = html.match(/"title"\s*:\s*"([^"]+)"/) || html.match(/"gridTitle"\s*:\s*"([^"]+)"/);
      title = titleRegex ? titleRegex[1] : null;
  }
  
  if (!caption || caption.trim() === '') {
      const captionRegex = 
          html.match(/"closeupUnifiedDescription"\s*:\s*"([^"]+)"/) || 
          html.match(/"description"\s*:\s*"([^"]+)"/) ||
          html.match(/"seoDescription"\s*:\s*"([^"]+)"/) || 
          html.match(/meta\s+name="description"\s+content="([^"]+)"/) || 
          html.match(/meta\s+property="og:description"\s+content="([^"]+)"/);
          
      caption = captionRegex ? captionRegex[1] : '';
      if (caption.includes("discovered by") && caption.includes("Discover (and save!)")) {
          caption = ''; 
      }
  }
  
  if (!createdAt) {
      const dateRegex = html.match(/"createdAt"\s*:\s*"([^"]+)"/);
      createdAt = dateRegex ? dateRegex[1] : null;
  }
  
  if (!author) {
      const usernameRegex = html.match(/"username"\s*:\s*"([^"]+)"/);
      const fullNameRegex = html.match(/"fullName"\s*:\s*"([^"]+)"/);
      const avatarRegex = html.match(/"imageLargeUrl"\s*:\s*"([^"]+)"/) || html.match(/"imageMediumUrl"\s*:\s*"([^"]+)"/);
      if (usernameRegex || fullNameRegex) {
          author = {
              username: usernameRegex ? usernameRegex[1] : null,
              fullName: fullNameRegex ? fullNameRegex[1] : null,
              avatar: avatarRegex ? avatarRegex[1] : null
          };
      }
  }
  
  if (Object.keys(statistics).length === 0) {
      const savesRegex = html.match(/"saves"\s*:\s*([0-9]+)/);
      const commentsRegex = html.match(/"commentCount"\s*:\s*([0-9]+)/);
      const sharesRegex = html.match(/"shareCount"\s*:\s*([0-9]+)/);
      statistics = {
          saves: savesRegex ? parseInt(savesRegex[1], 10) : 0,
          comments: commentsRegex ? parseInt(commentsRegex[1], 10) : 0,
          shares: sharesRegex ? parseInt(sharesRegex[1], 10) : 0
      };
  }
  
  const hasVideoPattern = html.includes('"videos":{') || html.includes('"videoList"');
  if (hasVideoPattern || isVideo) {
      const videoBlockRegex = /"(v[0-9A-Z]+)"\s*:\s*\{[^}]*"url"\s*:\s*"([^"]+)"/g;
      let videoMatch;
      let tempVideos = [];
      while ((videoMatch = videoBlockRegex.exec(html)) !== null) {
          if (!tempVideos.some(v => v.url === videoMatch[2])) {
              tempVideos.push({
                  type: 'video',
                  quality: videoMatch[1].replace(/^v/, '').toUpperCase(),
                  url: videoMatch[2]
              });
          }
      }
      if (tempVideos.length > 0) {
          allMedia = tempVideos;
          isVideo = true;
      }
  }
  
  if (!isVideo && allMedia.length <= 1) {
      const carouselBlockRegex = /"carouselSlots"\s*:\s*\[([\s\S]*?)\]\s*,\s*"id"/;
      const carouselMatch = html.match(carouselBlockRegex);
      if (carouselMatch && carouselMatch[1]) {
          const slots = carouselMatch[1].split(/Properties|slotId/);
          let tempMedia = [];
          slots.forEach(slotStr => {
              const imgUrlRegex = /"images_(?:1200x|736x|orig)"\s*:\s*\{[^}]+?"url"\s*:\s*"([^"]+)"/;
              const imgUrlMatch = slotStr.match(imgUrlRegex);
              if (imgUrlMatch && imgUrlMatch[1]) {
                  const imgUrl = imgUrlMatch[1];
                  if (!tempMedia.some(img => img.url === imgUrl)) {
                      tempMedia.push({
                          type: 'image',
                          quality: 'ORIGINAL',
                          url: imgUrl
                      });
                  }
              }
          });
          if (tempMedia.length > 0) {
              allMedia = tempMedia;
          }
      }
  }
  
  if (allMedia.length === 0) {
      const singleImageRegex = html.match(/"images_orig"\s*:\s*\{\s*"url"\s*:\s*"([^"]+)"/) || html.match(/meta\s+property="og:image"\s+content="([^"]+)"/);
      if (singleImageRegex) {
          allMedia.push({
              type: 'image',
              quality: 'ORIGINAL',
              url: singleImageRegex[1]
          });
      }
  }
  
  if (allMedia.length === 0) {
      throw new Error("Gagal mengekstrak media dari URL Pinterest ini.");
  }

  // Format data agar sesuai dengan frontend (normalizeApiResponse)
  return {
      platform: "Pinterest",
      caption: title ? `${title} - ${caption || ''}` : caption || "Pinterest Post",
      author: author?.fullName || author?.username || "Unknown Pinterest User",
      author_avatar: author?.avatar || "",
      downloads: allMedia.map(item => ({
          url: item.url,
          quality: item.quality || 'Media'
      }))
  };
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
      data = await pindl(url); // Menggunakan Pindl native regex scraper
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
