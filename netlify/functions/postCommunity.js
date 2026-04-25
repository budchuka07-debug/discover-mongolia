const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

const ipHits = new Map();

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "postCommunity function is working."
        })
      };
    }

    const ip =
      event.headers["x-nf-client-connection-ip"] ||
      event.headers["client-ip"] ||
      "unknown";

    const now = Date.now();
    const lastHit = ipHits.get(ip) || 0;

    if (now - lastHit < 30000) {
      return {
        statusCode: 429,
        body: JSON.stringify({
          message: "Please wait before posting again."
        })
      };
    }

    ipHits.set(ip, now);

    const data = JSON.parse(event.body || "{}");

    const {
      name,
      title,
      story,
      image_url,
      turnstileToken
    } = data;

    if (!name || !title || !story) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Name, title and story are required."
        })
      };
    }

    if (!turnstileToken) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Captcha is required."
        })
      };
    }

    const captchaRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        secret: TURNSTILE_SECRET_KEY,
        response: turnstileToken,
        remoteip: ip
      })
    });

    const captchaData = await captchaRes.json();

    if (!captchaData.success) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          message: "Captcha verification failed."
        })
      };
    }

    const supabaseRes = await fetch(`${SUPABASE_URL}/rest/v1/community_posts`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify({
        name,
        title,
        story,
        image_url: image_url || null,
        status: "published"
      })
    });

    const result = await supabaseRes.json();

    if (!supabaseRes.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Supabase insert failed.",
          error: result
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Published successfully.",
        post: result[0]
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error processing request",
        error: error.message
      })
    };
  }
};
