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
# Egypt-only guardrail: the dp page carries a local reviews block AND, lower down,
# a "Top reviews from other countries" block — both use data-hook='review'. The
# /-/en/ fetch renders the date line as "Reviewed in <Country> on <date>", so the
# country word is the authoritative origin signal. Reviews from Egypt say
# "Reviewed in Egypt"; the Arabic equivalent is "مصر". Anything else (India, the
# United Arab Emirates, Saudi Arabia, the United States, Canada, …) is a foreign
# review and must never reach this Egypt-only platform.
_REVIEW_COUNTRY_RE = re.compile(r"Reviewed in (.+?) on", re.I)


def _review_country(date_text: str | None) -> str | None:
    """Origin country from a review's date line, or None if not parseable."""
    if not date_text:
        return None
    m = _REVIEW_COUNTRY_RE.search(date_text)
    return m.group(1).strip() if m else None


def _is_egypt_review(date_text: str | None) -> bool:
    """True only for reviews whose date line confirms an Egypt origin.

    Egypt reviews are kept; foreign reviews are dropped. A review with no
    parseable country falls back to the container scope (it is only reached when
    it already came from the local reviews list), so it is treated as Egypt.
    """
    country = _review_country(date_text)
    if country is None:
        return True  # unknown origin, but sourced from the local block → keep
    cl = country.lower()
    return "egypt" in cl or "مصر" in country


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


def _detail_attrs(soup) -> dict:
    """Build a {label: value} map from the detail-page spec tables + detail bullets.
    Validated live on amazon.eg automotive: specs live in <table> th/td rows
    (Item Weight, Item Dimensions L x W [x H], Material Type, Manufacturer,
    Number of Items, Brand Name, Color) and sometimes in #detailBullets li."""
    attrs: dict[str, str] = {}
    for tr in soup.select("table tr"):
        th = tr.find("th")
        td = tr.find("td")
        if th and td:
            k = th.get_text(" ", strip=True)
            v = td.get_text(" ", strip=True)
            if k and v and len(k) < 50:
                attrs.setdefault(k, v)
    for li in soup.select("#detailBullets_feature_div li"):
        txt = li.get_text(" ", strip=True)
        if ":" in txt and len(txt) < 120:
            k, _, v = txt.partition(":")
            if k.strip() and v.strip():
                attrs.setdefault(k.strip(), v.strip())
    return attrs


def _attr_get(attrs: dict, *labels: str):
    """Case-insensitive, variant-tolerant attribute lookup (exact then contains)."""
    low = {k.lower(): v for k, v in attrs.items()}
    for lb in labels:
        if lb.lower() in low:
            return low[lb.lower()]
    for k, v in attrs.items():
        kl = k.lower()
        if any(lb.lower() in kl for lb in labels):
            return v
    return None


def _weight_to_kg(raw: str | None):
    """Normalize a weight string to kg. Returns None if no unit is recognized —
    we never guess the magnitude (an unlabeled number could be grams or kg)."""
    if not raw:
        return None
    m = re.search(r"([\d]+\.?\d*)", raw.replace(",", ""))
    if not m:
        return None
    v = float(m.group(1))
    s = raw.lower()
    if "milligram" in s:
        return round(v / 1_000_000, 6)
    if "kilogram" in s or re.search(r"\bkg\b", s):
        return round(v, 4)
    if "gram" in s or re.search(r"\bg\b", s):
        return round(v / 1000, 4)
    if "ounce" in s or re.search(r"\boz\b", s):
        return round(v * 0.0283495, 4)
    if "pound" in s or re.search(r"\b(lb|lbs)\b", s):
        return round(v * 0.453592, 4)
    return None


def _dims_to_cm(raw: str | None):
    """Normalize an 'L x W [x H]' dimension string to centimeters → {l, w, h}.
    Handles centimeters/cm, mm, meters, inches; defaults to cm (amazon.eg's
    default). h is 0 when only two dimensions are given."""
    if not raw:
        return None
    s = raw.lower()
    if "millimet" in s or re.search(r"\bmm\b", s):
        f = 0.1
    elif "centimet" in s or re.search(r"\bcm\b", s):
        f = 1.0
    elif "inch" in s or '"' in s:
        f = 2.54
    elif "meter" in s or re.search(r"\bm\b", s):
        f = 100.0
    else:
        f = 1.0  # amazon.eg default is centimeters
    nums = re.findall(r"[\d]+\.?\d*", raw)
    if not nums:
        return None
    vals = [round(float(n) * f, 2) for n in nums[:3]]
    while len(vals) < 3:
        vals.append(0.0)
    return {"l": vals[0], "w": vals[1], "h": vals[2]}


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
    # 8 embedded reviews (camelCase data-hooks on .eg). Scope to the LOCAL reviews
    # list (#localTopReviewsList) so we never reach into the "Top reviews from other
    # countries" block lower on the page, then defensively drop any non-Egypt review
    # by its "Reviewed in <Country>" date line — Egypt-only platform, Egypt-only reviews.
    reviews_list: list[dict] = []
    local_block = soup.select_one("#localTopReviewsList") or soup
    for rv in local_block.select("div[data-hook='review']"):
        if len(reviews_list) >= 8:
            break
        dt = rv.select_one("span[data-hook='review-date']")
        date_text = dt.get_text(strip=True) if dt else None
        if not _is_egypt_review(date_text):
            continue  # foreign review (India, UAE, KSA, US, …) — excluded at ingest
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
                "date": date_text,
                "verified": bool(rv.select_one("span[data-hook='avp-badge']")),
                "helpful": helpful,
                "lang": "ar" if _ARABIC_RE.search((r_title or "") + body) else "en",
            }
        )
    # Detail-page spec attributes (selectors validated live on amazon.eg automotive).
    attrs = _detail_attrs(soup)
    if not brand:
        bt = _attr_get(attrs, "Brand Name", "Brand")
        brand = bt[:60] if bt else None
    weight_raw = _attr_get(attrs, "Item Weight", "Product Weight", "Fabric Weight", "Weight")
    dims_raw = _attr_get(
        attrs,
        "Item Dimensions L x W x H",
        "Item Dimensions L x W",
        "Item Dimensions",
        "Product Dimensions",
        "Package Dimensions",
    )
    image_count = len(soup.select("#altImages li.imageThumbnail, #altImages li.item")) or None
    feature_bullet_count = len(soup.select("#feature-bullets li")) or None
    offer_count = None
    olp = soup.select_one("a[href*='/gp/offer-listing'], #olpLinkWidget")
    if olp:
        m = re.search(r"(\d+)", olp.get_text())
        offer_count = int(m.group(1)) if m else None
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
        # New: detail-page attributes for the winning-product score (all optional).
        "material": _attr_get(attrs, "Material Type", "Material", "Fabric Type"),
        "manufacturer": _attr_get(attrs, "Manufacturer"),
        "color": _attr_get(attrs, "Color", "Colour"),
        "number_of_items": _int(_attr_get(attrs, "Number of Items", "Unit Count", "Item Package Quantity")),
        "item_weight_raw": weight_raw,
        "item_weight_kg": _weight_to_kg(weight_raw),
        "item_dims_raw": dims_raw,
        "item_dims_cm": _dims_to_cm(dims_raw),
        "image_count": image_count,
        "feature_bullet_count": feature_bullet_count,
        "offer_count": offer_count,
    }
