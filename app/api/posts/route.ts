import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/options";

function decodeInstagramString(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\\u003c/gi, "<")
    .replace(/\\u003e/gi, ">")
    .replace(/\\u0026/gi, "&")
    .replace(/\\u0027/gi, "'")
    .replace(/\\u000a/gi, "\n")
    .replace(/\\n/gi, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .replace(/\\u([\dA-F]{4})/gi, (_, group) =>
      String.fromCharCode(parseInt(group, 16)),
    )
    .trim();
}

type HtmlFetchResult = {
  html: string | null;
  thumbnail: string | null;
  caption: string | null;
};

async function fetchGraphMetadata(url: string) {
  const token = process.env.IG_OEMBED_TOKEN;
  if (!token) return null;

  try {
    const endpoint = new URL("https://graph.facebook.com/v19.0/instagram_oembed");
    endpoint.searchParams.set("url", url);
    endpoint.searchParams.set("access_token", token);
    endpoint.searchParams.set("omitscript", "true");
    endpoint.searchParams.set("fields", "thumbnail_url,title");

    const response = await fetch(endpoint.toString(), {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      thumbnail_url?: string;
      title?: string;
    };

    return {
      thumbnail: data.thumbnail_url ? decodeInstagramString(data.thumbnail_url) : null,
      caption: data.title ? decodeInstagramString(data.title) : null,
    };
  } catch {
    return null;
  }
}

async function fetchInstagramHtml(originalUrl: string): Promise<HtmlFetchResult> {
  const attempts: Array<{ url: string; type: "html" | "json" }> = [];

  attempts.push({ url: originalUrl, type: "html" });
  attempts.push({ url: `https://r.jina.ai/${originalUrl}`, type: "html" });

  try {
    const parsed = new URL(originalUrl);
    const ddUrl = new URL(originalUrl);
    ddUrl.host = "ddinstagram.com";
    attempts.push({ url: ddUrl.toString(), type: "html" });
    const ddApi = new URL("https://ddinstagram.com/api/");
    ddApi.searchParams.set("url", originalUrl);
    attempts.push({ url: ddApi.toString(), type: "json" });
  } catch {
    // ignore parse issues
  }

  for (const attempt of attempts) {
    try {
      const response = await fetch(attempt.url, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (!response.ok) continue;

      if (attempt.type === "json") {
        const data = (await response.json()) as {
          image?: string;
          title?: string;
          media?: { image?: string; caption?: string };
        };
        const image = data.media?.image ?? data.image ?? null;
        const caption = data.media?.caption ?? data.title ?? null;
        return {
          html: null,
          thumbnail: image ? decodeInstagramString(image) : null,
          caption: caption ? decodeInstagramString(caption) : null,
        };
      }

      const html = await response.text();
      return { html, thumbnail: null, caption: null };
    } catch {
      // try next attempt
    }
  }

  return { html: null, thumbnail: null, caption: null };
}

type InstaloaderMetadata = {
  thumbnail: string | null;
  caption: string | null;
};

async function fetchWithInstaloader(url: string): Promise<InstaloaderMetadata | null> {
  const scriptPath = join(process.cwd(), "scripts", "instaloader_fetch.py");
  if (!existsSync(scriptPath)) {
    return null;
  }

  const binaries = ["python3", "python", "py"];

  const runWithBinary = (binary: string): Promise<InstaloaderMetadata | null> => {
    return new Promise((resolve) => {
      execFile(
        binary,
        [scriptPath, url],
        { timeout: 20000, encoding: "utf8" },
        (error, stdout, stderr) => {
          if (error) {
            const stderrOutput = stderr.trim();
            console.error(`Instaloader execution failed with ${binary}`, error);
            if (stderrOutput) console.error("Instaloader stderr:", stderrOutput.trim());
            resolve(null);
            return;
          }

          const output = stdout;
          if (!output.trim()) {
            resolve(null);
            return;
          }

          const lastLine = output
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .pop();

          if (!lastLine) {
            resolve(null);
            return;
          }

          try {
            const parsed = JSON.parse(lastLine) as {
              thumbnail?: unknown;
              caption?: unknown;
              error?: unknown;
            };

            if (parsed && typeof parsed === "object" && "error" in parsed && parsed.error) {
              console.error("Instaloader returned error:", parsed.error);
              resolve(null);
              return;
            }

            const thumbnail =
              typeof parsed.thumbnail === "string" && parsed.thumbnail.length > 0
                ? parsed.thumbnail
                : null;
            const caption =
              typeof parsed.caption === "string" && parsed.caption.trim().length > 0
                ? parsed.caption.trim()
                : null;

            resolve({ thumbnail, caption });
          } catch (parseError) {
            console.error(
              `Failed to parse Instaloader output generated by ${binary}`,
              parseError,
              output,
            );
            resolve(null);
          }
        },
      );
    });
  };

  for (const binary of binaries) {
    const result = await runWithBinary(binary);
    if (result) return result;
  }

  return null;
}

function extractThumbnail(html: string) {
  const match =
    html.match(/"display_url":"([^"]+)"/) ??
    html.match(/property="og:image" content="([^"]+)"/);

  return match ? decodeInstagramString(match[1]) : null;
}

function extractCaption(html: string) {
  const captionMatch = html.match(
    /"edge_media_to_caption":{"edges":\[\{"node":{"text":"(.*?)"}}\]\}/,
  );
  if (captionMatch) return decodeInstagramString(captionMatch[1]);

  const ogDescription = html.match(
    /property="og:description" content="([^"]+)"/,
  );
  if (ogDescription) {
    const cleaned = decodeInstagramString(ogDescription[1]);
    const truncated = cleaned.replace(/\s+•\s+Instagram.+$/i, "").trim();
    return truncated.length > 0 ? truncated : cleaned;
  }

  return null;
}

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions)) as Session | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folderId");
  if (!folderId) {
    return NextResponse.json({ error: "Missing folderId" }, { status: 400 });
  }

  const folder = await prisma.folder.findFirst({
    where: { id: folderId, userId: session.user.id },
  });
  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const posts = await prisma.post.findMany({
    where: { folderId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(posts);
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions)) as Session | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let url: string | undefined;
  let folderId: string | undefined;

  try {
    ({ url, folderId } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!url || !folderId) {
    return NextResponse.json({ error: "Missing url or folderId" }, { status: 400 });
  }

  try {
    // Validate URL format
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const folder = await prisma.folder.findFirst({
    where: { id: folderId, userId: session.user.id },
  });
  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const existingPosts = await prisma.post.count({ where: { folderId } });

  const [graphMetadata, htmlAttempt] = await Promise.all([
    fetchGraphMetadata(url),
    fetchInstagramHtml(url),
  ]);

  let thumbnail: string | null = graphMetadata?.thumbnail ?? null;
  let caption: string | null = graphMetadata?.caption ?? null;
  if (!thumbnail) thumbnail = htmlAttempt.thumbnail ?? null;
  if (!caption) caption = htmlAttempt.caption ?? null;

  if ((!thumbnail || !caption) && htmlAttempt.html) {
    thumbnail = thumbnail ?? extractThumbnail(htmlAttempt.html);
    caption = caption ?? extractCaption(htmlAttempt.html);
  }

  if (!thumbnail || !caption) {
    try {
      const oEmbedUrl = new URL("https://www.instagram.com/oembed/");
      oEmbedUrl.searchParams.set("url", url);
      oEmbedUrl.searchParams.set("omitscript", "true");
      const oEmbedResponse = await fetch(oEmbedUrl.toString(), {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (oEmbedResponse.ok) {
        const data = (await oEmbedResponse.json()) as {
          thumbnail_url?: string;
          title?: string;
        };
        if (!thumbnail && typeof data.thumbnail_url === "string") {
          thumbnail = decodeInstagramString(data.thumbnail_url);
        }
        if (!caption && typeof data.title === "string") {
          const cleanedTitle = decodeInstagramString(data.title);
          caption = cleanedTitle.replace(/^[^:]+:\s*/, "").trim();
        }
      }
    } catch {
      // Ignore oEmbed failures; best effort only.
    }
  }

  if (!thumbnail || !caption) {
    // Final fallback: rely on the local Instaloader helper when available.
    const instaloaderMetadata = await fetchWithInstaloader(url);
    if (instaloaderMetadata) {
      console.log("Instaloader metadata resolved", {
        hasThumbnail: typeof instaloaderMetadata.thumbnail === "string",
        hasCaption: typeof instaloaderMetadata.caption === "string",
      });
      if (!thumbnail && instaloaderMetadata.thumbnail) {
        thumbnail = instaloaderMetadata.thumbnail;
      }
      if (!caption && instaloaderMetadata.caption) {
        caption = instaloaderMetadata.caption;
      }
    }
  }

  try {
    const post = await prisma.post.create({
      data: { url, thumbnail, caption, folderId },
    });

    if (thumbnail && existingPosts === 0) {
      await prisma.folder.update({
        where: { id: folderId },
        data: { cover: thumbnail },
      });
    }

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("Failed to persist post", error);
    return NextResponse.json(
      { error: "Erro ao salvar o link. Rode as migrações e tente novamente." },
      { status: 500 },
    );
  }
}
