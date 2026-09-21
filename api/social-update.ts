function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function plainText(value: unknown) {
  return String(value ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value: string, max = 180) {
  if (value.length <= max) return value;
  return value.slice(0, max - 1).trimEnd() + "…";
}

async function findPublishedContent(origin: string, id: string) {
  for (let page = 1; page <= 20; page += 1) {
    const response = await fetch(`${origin}/api/content/published?page=${page}&limit=50`, {
      headers: { "x-social-preview": "1" },
    });
    if (!response.ok) break;
    const payload = await response.json();
    const content = Array.isArray(payload?.content) ? payload.content : [];
    const found = content.find((item: any) => String(item?.id) === id);
    if (found) return found;
    if (!content.length || page >= Number(payload?.pagination?.totalPages || 1)) break;
  }
  return null;
}

function removeExistingSeo(html: string) {
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, "")
    .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, "")
    .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, "");
}

export default async function handler(req: any, res: any) {
  const id = String(req.query?.id || "").trim();
  if (!id) {
    res.status(302).setHeader("Location", "/updates");
    return res.end();
  }

  const forwardedProto = String(req.headers?.["x-forwarded-proto"] || "https").split(",")[0].trim();
  const forwardedHost = String(req.headers?.["x-forwarded-host"] || req.headers?.host || "anjumanearaian.org").split(",")[0].trim();
  const origin = `${forwardedProto}://${forwardedHost}`;

  try {
    const [shellResponse, item] = await Promise.all([
      fetch(`${origin}/?__social_shell=1`, { headers: { "x-social-preview": "1" } }),
      findPublishedContent(origin, id),
    ]);

    if (!shellResponse.ok) throw new Error("Could not load application shell");
    let html = await shellResponse.text();

    if (!item) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
      return res.status(200).send(html);
    }

    const title = String(item.title || "Official Update");
    const rawBody = item.type === "event" ? (item.body || item.desc) : item.body;
    const description = truncate(plainText(rawBody) || `${title} - Anjuman-e-Araian Faisalabad`, 180);
    const images = Array.isArray(item.images) ? item.images : [];
    const firstImage = String(images[0] || "").trim();
    const imageUrl = firstImage ? new URL(firstImage, origin).href : "";
    const canonical = `${origin}/updates/${encodeURIComponent(id)}${req.query?.slug ? `/${encodeURIComponent(String(req.query.slug))}` : ""}`;

    const tags = [
      `<title>${escapeHtml(title)} | Anjuman-e-Araian Faisalabad</title>`,
      `<meta name="description" content="${escapeHtml(description)}" />`,
      `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
      `<meta property="og:title" content="${escapeHtml(title)}" />`,
      `<meta property="og:description" content="${escapeHtml(description)}" />`,
      `<meta property="og:type" content="${item.type === "event" ? "website" : "article"}" />`,
      `<meta property="og:site_name" content="Anjuman-e-Araian Faisalabad" />`,
      `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
      imageUrl ? `<meta property="og:image" content="${escapeHtml(imageUrl)}" />` : "",
      imageUrl ? `<meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />` : "",
      imageUrl ? `<meta property="og:image:width" content="1200" />` : "",
      imageUrl ? `<meta property="og:image:height" content="630" />` : "",
      imageUrl ? `<meta property="og:image:alt" content="${escapeHtml(title)}" />` : "",
      `<meta name="twitter:card" content="${imageUrl ? "summary_large_image" : "summary"}" />`,
      `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
      `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
      imageUrl ? `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />` : "",
    ].filter(Boolean).join("\n      ");

    html = removeExistingSeo(html).replace("</head>", `      ${tags}\n    </head>`);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
    return res.status(200).send(html);
  } catch (error) {
    console.error("Social update render failed", error);
    res.status(302).setHeader("Location", "/updates");
    return res.end();
  }
}
