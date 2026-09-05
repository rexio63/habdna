/**
 * HABDANA API Worker
 * ============================================================
 * هذا الملف هو خادم وسيط (Proxy) صغير يعمل على Cloudflare Workers.
 * وظيفته الوحيدة: استقبال طلبات من موقع HABDANA الثابت (GitHub Pages)
 * وتمريرها إلى Groq API و Spotify API باستخدام مفاتيح سرية
 * لا تُخزَّن أبدًا في هذا الملف ولا في أي ملف داخل المستودع.
 *
 * المفاتيح تُقرأ حصرًا من متغيرات البيئة (env) التي تُضبط عبر:
 *   wrangler secret put GROQ_API_KEY
 *   wrangler secret put SPOTIFY_CLIENT_ID
 *   wrangler secret put SPOTIFY_CLIENT_SECRET
 * (راجع ملف README.md وworkflow النشر في .github/workflows/deploy-worker.yml)
 *
 * هذا الملف نفسه عام (Public) ومن الآمن رفعه على GitHub لأنه لا يحتوي
 * على أي قيمة سرية — فقط كود يقرأ المفاتيح من env وقت التشغيل.
 * ============================================================
 */

// أنواع موسيقية مدعومة للبحث عبر Spotify — المعرّفات (id) يجب أن تطابق
// القيم المستخدمة في musicGenres داخل script.js
const GENRE_QUERIES = {
  "arabic-pop": { q: "Arabic pop hits", market: "SA" },
  "khaleeji": { q: "Khaleeji songs", market: "SA" },
  "egyptian": { q: "Egyptian Mahraganat", market: "EG" },
  "english-pop": { q: "English pop hits", market: "US" },
  "hiphop": { q: "hip hop rap hits", market: "US" },
  "tarab": { q: "classic Arabic tarab", market: "EG" }
};

// كاش بسيط داخل الذاكرة لتوكن Spotify (صالح فقط أثناء بقاء الـ Worker "دافئًا"،
// وهو تحسين اختياري لتقليل عدد طلبات المصادقة، وليس تخزينًا دائمًا).
let cachedToken = null;
let cachedTokenExpiry = 0;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const headers = corsHeaders(env, request);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    try {
      if (url.pathname === "/api/quiz" && request.method === "POST") {
        return await handleQuiz(request, env, headers);
      }
      if (url.pathname === "/api/songs" && request.method === "GET") {
        return await handleSongs(url, env, headers);
      }
      if (url.pathname === "/" || url.pathname === "") {
        return json({ ok: true, service: "habdana-api" }, 200, headers);
      }
      return json({ error: "not_found" }, 404, headers);
    } catch (err) {
      return json({ error: "internal_error", message: String((err && err.message) || err) }, 500, headers);
    }
  }
};

// ===================== أدوات مساعدة عامة =====================

function corsHeaders(env, request) {
  const allowed = (env.ALLOWED_ORIGIN || "*").trim();
  const origin = request.headers.get("Origin") || "";
  const allowOrigin = allowed === "*" ? "*" : (origin === allowed ? origin : allowed);
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin"
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), { status: status || 200, headers });
}

function extractJsonArray(text) {
  if (!text) return null;
  try {
    const direct = JSON.parse(text);
    if (Array.isArray(direct)) return direct;
    if (direct && Array.isArray(direct.questions)) return direct.questions;
  } catch (e) { /* fall through */ }

  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (e) {
    return null;
  }
}

// ===================== هبد الأسئلة (Groq) =====================

async function handleQuiz(request, env, headers) {
  if (!env.GROQ_API_KEY) {
    return json({ error: "missing_groq_key" }, 500, headers);
  }

  let body = {};
  try { body = await request.json(); } catch (e) { /* body optional */ }

  const category = (body.category || "عام").toString().slice(0, 40);
  const count = Math.max(1, Math.min(10, parseInt(body.count, 10) || 5));
  const model = env.GROQ_MODEL || "llama-3.3-70b-versatile";

  const prompt = `أنشئ ${count} أسئلة اختبار معلومات عامة باللغة العربية الفصحى ضمن تصنيف "${category}".
يجب أن يحتوي كل سؤال على 4 اختيارات فقط، واحد منها صحيح والبقية خاطئة بشكل معقول.
لا تكرر نفس السؤال. أعد النتيجة بصيغة JSON صِرف فقط، بدون أي شرح أو Markdown أو نص إضافي قبله أو بعده، بهذا الشكل بالضبط:
[{"q":"نص السؤال","a":["اختيار1","اختيار2","اختيار3","اختيار4"],"c":0}]
حيث "c" هو رقم فهرس الإجابة الصحيحة داخل مصفوفة "a" (من 0 إلى 3).`;

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.8,
      messages: [
        {
          role: "system",
          content: "You output only strict valid JSON. No markdown fences, no commentary, no extra text before or after the JSON."
        },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!groqRes.ok) {
    const text = await groqRes.text().catch(() => "");
    return json({ error: "groq_error", detail: text.slice(0, 500) }, 502, headers);
  }

  const data = await groqRes.json();
  const raw = data?.choices?.[0]?.message?.content || "";
  const parsed = extractJsonArray(raw);

  if (!parsed) {
    return json({ error: "parse_error" }, 502, headers);
  }

  const cleaned = parsed
    .filter(q =>
      q &&
      typeof q.q === "string" && q.q.trim().length > 0 &&
      Array.isArray(q.a) && q.a.length === 4 && q.a.every(x => typeof x === "string" && x.trim().length > 0) &&
      Number.isInteger(q.c) && q.c >= 0 && q.c < 4
    )
    .slice(0, count);

  if (cleaned.length === 0) {
    return json({ error: "no_valid_questions" }, 502, headers);
  }

  return json({ questions: cleaned }, 200, headers);
}

// ===================== خمن الأغنية (Spotify) =====================

async function getSpotifyToken(env) {
  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiry) return cachedToken;

  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
    throw new Error("missing_spotify_credentials");
  }

  const basic = btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`);
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!res.ok) {
    throw new Error("spotify_token_error");
  }

  const data = await res.json();
  cachedToken = data.access_token;
  cachedTokenExpiry = now + Math.max(0, (data.expires_in || 3600) - 60) * 1000;
  return cachedToken;
}

async function handleSongs(url, env, headers) {
  const genreId = url.searchParams.get("genre") || "arabic-pop";
  const genre = GENRE_QUERIES[genreId] || GENRE_QUERIES["arabic-pop"];

  let token;
  try {
    token = await getSpotifyToken(env);
  } catch (e) {
    return json({ error: "spotify_auth_failed", message: String(e.message || e) }, 500, headers);
  }

  const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(genre.q)}&type=track&limit=20&market=${genre.market}`;
  const res = await fetch(searchUrl, { headers: { "Authorization": `Bearer ${token}` } });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return json({ error: "spotify_search_error", detail: text.slice(0, 500) }, 502, headers);
  }

  const data = await res.json();
  const items = (data && data.tracks && data.tracks.items) || [];

  const tracks = items
    .filter(t => t && t.name && Array.isArray(t.artists) && t.artists.length > 0)
    .map(t => ({
      name: t.name,
      artist: t.artists.map(a => a.name).join(", "),
      image: (t.album && t.album.images && t.album.images[0] && t.album.images[0].url) || null,
      previewUrl: t.preview_url || null
    }));

  if (tracks.length < 4) {
    return json({ error: "not_enough_tracks", tracks }, 502, headers);
  }

  return json({ tracks }, 200, headers);
}
