const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

const ipHits = new Map();

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}

function isBadText(text) {
  const value = String(text || "").toLowerCase();
  const blocked = ["casino", "porn", "sex", "crypto giveaway", "viagra"];
  const links = (value.match(/https?:\/\//g) || []).length;
  return links > 1 || blocked.some((word) => value.includes(word));
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return json(200, { message: "postCommunity function is working." });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !TURNSTILE_SECRET_KEY) {
      return json(500, {
        message: "Missing Netlify environment variables.",
        required: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "TURNSTILE_SECRET_KEY"]
      });
    }

    const ip =
      event.headers["x-nf-client-connection-ip"] ||
      event.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      event.headers["client-ip"] ||
      "unknown";

    const now = Date.now();
    const lastHit = ipHits.get(ip) || 0;
    if (now - lastHit < 20000) {
      return json(429, { message: "Please wait before posting again." });
    }
    ipHits.set(ip, now);

    const body = JSON.parse(event.body || "{}");
    const turnstileToken = body.turnstileToken || body.token || body["cf-turnstile-response"];
    const payload = body.data && typeof body.data === "object" ? body.data : body;

    if (!turnstileToken) {
      return json(400, { message: "Captcha is required." });
    }

    const captchaRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: TURNSTILE_SECRET_KEY,
        response: turnstileToken,
        remoteip: ip
      })
    });

    const captchaData = await captchaRes.json();
    if (!captchaData.success) {
      return json(403, {
        message: "Captcha verification failed.",
        errorCodes: captchaData["error-codes"] || []
      });
    }

    const cleanPost = {
      type: payload.type === "sharing" ? "sharing" : "blog",
      name: String(payload.name || "").trim(),
      country: String(payload.country || "").trim(),
      country_code: String(payload.country_code || "").trim(),
      destination: String(payload.destination || "").trim(),
      title: String(payload.title || (payload.type === "sharing" ? "Looking for travelers to join" : "Traveler story")).trim(),
      content: String(payload.content || payload.story || "").trim(),
      travel_dates: payload.travel_dates ? String(payload.travel_dates).trim() : null,
      people_count: payload.people_count ? Number(payload.people_count) : null,
      budget: payload.budget ? String(payload.budget).trim() : null,
      contact: payload.contact ? String(payload.contact).trim() : null,
      image_urls: Array.isArray(payload.image_urls) ? payload.image_urls.filter(Boolean) : [],
      status: "published"
    };

    if (!cleanPost.name || !cleanPost.country_code || !cleanPost.content || cleanPost.content.length < 20) {
      return json(400, { message: "Name, country and content with at least 20 characters are required." });
    }

    if (isBadText(cleanPost.content) || isBadText(cleanPost.title)) {
      return json(400, { message: "This post looks like spam." });
    }

    const supabaseRes = await fetch(`${SUPABASE_URL}/rest/v1/community_posts`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(cleanPost)
    });

    const result = await supabaseRes.json().catch(() => null);
    if (!supabaseRes.ok) {
      return json(500, { message: "Supabase insert failed.", error: result });
    }

    return json(200, { message: "Published successfully.", post: Array.isArray(result) ? result[0] : result });
  } catch (error) {
    return json(500, { message: "Error processing request", error: error.message });
  }
};
