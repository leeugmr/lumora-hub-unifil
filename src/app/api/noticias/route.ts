// Notícias do mundo tech para a tela Hoje. Lê RSS/Atom de fontes públicas no servidor
// (evita CORS) e guarda em cache por 30 minutos.

export const revalidate = 1800;

export type NewsItem = { title: string; link: string; source: string; date: string | null };
export type NewsResponse = { brasil: NewsItem[]; mundo: NewsItem[] };

const FEEDS = [
  { source: "Tecnoblog", url: "https://tecnoblog.net/feed/", group: "brasil" },
  { source: "Canaltech", url: "https://canaltech.com.br/rss/", group: "brasil" },
  { source: "Olhar Digital", url: "https://olhardigital.com.br/feed/", group: "brasil" },
  { source: "TechCrunch", url: "https://techcrunch.com/feed/", group: "mundo" },
  { source: "The Verge", url: "https://www.theverge.com/rss/index.xml", group: "mundo" },
] as const;

const PER_FEED = 8;
const PER_GROUP = 12;

// Posts de oferta e guia de compra não são notícia: ficam de fora.
const DEAL_TITLE =
  /(\d+\s?% OFF|\bOFF\b|cai para|menor preço|Esquenta Black|Black (Friday|November)|cupom|desconto|oferta|promoção|para comprar|por menos de R\$|nunca esteve tão barat|\bdeals?\b|on sale|best .* to buy)/i;
const DEAL_CATEGORY = /black (friday|november)|oferta|achados|promo|deals?|cyber monday|gift guide/i;

function isDeal(block: string, title: string) {
  if (DEAL_TITLE.test(title)) return true;
  const cats = block.match(/<category[^>]*>([\s\S]*?)<\/category>|<category[^>]*term="([^"]+)"/gi) ?? [];
  return cats.some((c) => DEAL_CATEGORY.test(decode(c.replace(/term="([^"]+)"/, ">$1<"))));
}

function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
}

function parse(xml: string, source: string): NewsItem[] {
  const isAtom = !/<item[\s>]/i.test(xml);
  const blocks = xml.match(isAtom ? /<entry[\s>][\s\S]*?<\/entry>/gi : /<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  const items: NewsItem[] = [];
  for (const b of blocks) {
    if (items.length >= PER_FEED) break;
    const title = tag(b, "title");
    if (!title || isDeal(b, title)) continue;
    const link = isAtom
      ? ((b.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i) ?? b.match(/<link[^>]*href="([^"]+)"/i))?.[1] ?? "")
      : tag(b, "link");
    if (!/^https?:\/\//.test(link)) continue;
    const raw = isAtom ? tag(b, "published") || tag(b, "updated") : tag(b, "pubDate") || tag(b, "dc:date");
    const t = raw ? new Date(raw) : null;
    items.push({ title, link: decode(link), source, date: t && !isNaN(t.getTime()) ? t.toISOString() : null });
  }
  return items;
}

async function load(feed: (typeof FEEDS)[number]) {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LumoraHub/1.0)" },
      signal: AbortSignal.timeout(8000),
      next: { revalidate },
    });
    if (!res.ok) return [];
    return parse(await res.text(), feed.source);
  } catch {
    return [];
  }
}

function newest(items: NewsItem[]) {
  return items.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")).slice(0, PER_GROUP);
}

export async function GET() {
  const lists = await Promise.all(FEEDS.map(load));
  const pick = (group: string) => newest(FEEDS.flatMap((f, i) => (f.group === group ? lists[i] : [])));
  const body: NewsResponse = { brasil: pick("brasil"), mundo: pick("mundo") };
  return Response.json(body, { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } });
}
