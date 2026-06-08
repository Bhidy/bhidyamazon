"""
amazon.eg parsers — selectors validated live 2026-06-08 (docs/research/05-selectors-and-samples.md).
Stable hooks only: id^=p13n-asin-index, span.zg-bdg-text, /dp/ regex, data-hook values,
"Best Sellers Rank" table text. Never hard-code hashed CSS classes.
"""
from __future__ import annotations
import re
from bs4 import BeautifulSoup  # type: ignore

BASE = "https://www.amazon.eg"
_ASIN_RE = re.compile(r"/dp/([A-Z0-9]{10})")
_NUM_RE = re.compile(r"([\d,]+\.?\d*)")
_ARABIC_RE = re.compile(r"[؀-ۿ]")


def _num(text: str | None):
    if not text:
        return None
    m = _NUM_RE.search(text.replace("\xa0", " "))
    return float(m.group(1).replace(",", "")) if m else None


def _int(text: str | None):
    if not text or not re.search(r"\d", text):
        return None
    return int(re.sub(r"[^0-9]", "", text))


def parse_bestsellers(html: str, category: str) -> list[dict]:
    """Best Sellers / category list page → product rows. Keeps out-of-stock rows (price=None)."""
    soup = BeautifulSoup(html, "html.parser")
    out: list[dict] = []
    seen: set[str] = set()
    for c in soup.select("div[id^='p13n-asin-index'], div#gridItemRoot"):
        link = c.select_one("a[href*='/dp/']")
        asin = None
        if link and link.get("href"):
            m = _ASIN_RE.search(link["href"])
            asin = m.group(1) if m else None
        if not asin:
            d = c.select_one("[data-asin]")
            asin = (d.get("data-asin") or "").strip() if d else None
        if not asin or asin in seen:
            continue
        rank_el = c.select_one("span.zg-bdg-text")
        rank = _int(rank_el.get_text()) if rank_el else None  # tolerant: handles "#1,234"
        title_el = c.select_one("div[class*='p13n-sc-css-line-clamp']")
        title = title_el.get_text(" ", strip=True) if title_el and title_el.get_text(strip=True) else None
        if not title:
            img_alt = c.select_one("img[alt]")
            title = img_alt.get("alt") if img_alt else None
        price_el = c.select_one("span[class*='p13n-sc-price']")
        price = _num(price_el.get_text()) if price_el else None
        rate_el = c.select_one("span.a-icon-alt")
        rating = _num(rate_el.get_text()) if rate_el else None  # tolerant float parse
        # review count: a numeric a-size-small, corroborated by the rating anchor's aria-label
        reviews = None
        for s in c.select("span.a-size-small"):
            if re.fullmatch(r"[\d,]+", s.get_text(strip=True)):
                reviews = _int(s.get_text())
                break
        if reviews is None:
            a = c.select_one("a[aria-label*='ratings'], a[aria-label*='rating']")
            if a:
                m = re.search(r"([\d,]+)\s+ratings?", a.get("aria-label", ""))
                reviews = _int(m.group(1)) if m else None
        img = c.select_one("img")
        out.append(
            {
                "category": category,
                "rank": rank,
                "asin": asin,
                "title": title,
                "price_egp": price,
                "currency": "EGP",
                "rating": rating,
                "reviews": reviews,
                "image_url": img.get("src") if img else None,
                "product_url": f"{BASE}/-/en/dp/{asin}",
            }
        )
        seen.add(asin)
    out.sort(key=lambda x: (x["rank"] is None, x["rank"] or 9999))
    return out


def _first_text(soup, selectors: list[str]):
    for sel in selectors:
        el = soup.select_one(sel)
        if el and el.get_text(strip=True):
            return el.get_text(" ", strip=True)
    return None


def parse_product(html: str, asin: str) -> dict:
    """Product detail page → fields incl. leaf BSR + the 8 embedded reviews (no auth)."""
    soup = BeautifulSoup(html, "html.parser")
    title = _first_text(soup, ["#productTitle"])
    byline = _first_text(soup, ["#bylineInfo"])
    brand = None
    if byline:
        m = re.search(r"Visit the (.+?) Store", byline) or re.search(r"Brand:\s*(.+)", byline)
        brand = (m.group(1).strip() if m else byline)[:60]
    price_el = _first_text(
        soup,
        ["#corePrice_feature_div span.a-offscreen", "span.a-price span.a-offscreen", ".priceToPay span.a-offscreen"],
    )
    price = _num(price_el)
    rating = None
    ap = soup.select_one("#acrPopover")
    if ap and ap.get("title"):
        m = re.search(r"([\d.]+)", ap["title"])
        rating = float(m.group(1)) if m else None
    reviews = _int(_first_text(soup, ["#acrCustomerReviewText"]))
    availability = _first_text(soup, ["#availability"])
    # BSR — lives in a table on .eg (NOT #detailBullets). Capture broad + leaf ranks.
    bsr: list[dict] = []
    node = soup.find(string=re.compile(r"Best Sellers Rank", re.I))
    if node:
        tr = node.find_parent("tr")
        raw = ""
        if tr and tr.select_one("td"):
            raw = tr.select_one("td").get_text(" ", strip=True)
        elif node.parent:
            raw = node.parent.get_text(" ", strip=True)
        for rank, cat in re.findall(r"#([\d,]+)\s+in\s+(.+?)(?=\s*\(|\s*#[\d]|$)", raw):
            bsr.append({"rank": int(rank.replace(",", "")), "category": cat.strip()})
    # 8 embedded reviews (camelCase data-hooks on .eg)
    reviews_list: list[dict] = []
    for rv in soup.select("div[data-hook='review']")[:8]:
        rt = rv.select_one("[data-hook='review-star-rating'] span.a-icon-alt")
        r_rating = _num(rt.get_text()) if rt else None  # tolerant float parse
        rti = rv.select_one("[data-hook='reviewTitle']")
        r_title = re.sub(r"^\d(\.\d)?\s*out of 5 stars", "", rti.get_text(" ", strip=True)).strip() if rti else None
        rb = rv.select_one("[data-hook='reviewText'], [data-hook='reviewRichContentContainer']")
        body = rb.get_text(" ", strip=True) if rb else ""
        body = re.sub(
            r"(Brief|Full) content visible,?\s*double tap to read (full|brief|less) content\.?",
            "",
            body,
            flags=re.I,
        )
        body = re.sub(r"\bRead more\b|\bRead less\b", "", body).strip()
        au = rv.select_one("span.a-profile-name")
        dt = rv.select_one("span[data-hook='review-date']")
        hv = rv.select_one("span[data-hook='helpful-vote-statement']")
        helpful = 0
        if hv:
            m = re.search(r"(\d+)", hv.get_text())
            helpful = int(m.group(1)) if m else (1 if "one person" in hv.get_text().lower() else 0)
        reviews_list.append(
            {
                "review_id": rv.get("id"),
                "rating": r_rating,
                "title": r_title,
                "body": body,
                "author": None,  # PII guardrail: reviewer display names dropped at ingest
                "date": dt.get_text(strip=True) if dt else None,
                "verified": bool(rv.select_one("span[data-hook='avp-badge']")),
                "helpful": helpful,
                "lang": "ar" if _ARABIC_RE.search((r_title or "") + body) else "en",
            }
        )
    return {
        "asin": asin,
        "title": title,
        "brand": brand,
        "price_egp": price,
        "currency": "EGP",
        "rating": rating,
        "reviews": reviews,
        "availability": availability,
        "bsr": bsr,
        "reviews_list": reviews_list,
    }
