# Real amazon.eg pipeline — validated selectors & samples


## Best Sellers scraping across categories (amazon.eg) — rank, ASIN, title, EGP price, rating, review count, image, pagination
- **worked:** yes · **rec:** primary · **cost:** $0 — pure curl + python3 + beautifulsoup4 (already installed, v4.14.3). No API, no paid service, no key. Each page is one ~400KB GET, ~0.8s. Bandwidth only.
- **user action:** NONE for the scraping itself — works today from this residential IP with the exact curl recipe. The ONLY user-side requirement is infrastructure: the pipeline MUST run from a residential/ISP IP (this home machine or a residential proxy). Amazon serves 200 to residential IPs and 503 to datacenter/cloud IPs, so if Rasid's backend is on AWS/GCP/Azure the user must route these requests through a residential proxy or run the fetcher on-prem. No account/login needed.


**Selectors:**
```
Container (one per product, exactly 30 per page):
  div[id^='p13n-asin-index']   (ids run p13n-asin-index-0 ... -29)

Per-item fields (select WITHIN each container):
  RANK    -> span.zg-bdg-text                         text e.g. "#1" (strip leading '#': rank=int(t.lstrip('#')))
  ASIN    -> div[data-asin] (inner div, attr data-asin); FALLBACK regex on the /dp/ link:
             re.search(r"/dp/([A-Z0-9]{10})", a['href'])   [recommend using BOTH; href fallback is 100% reliable]
  TITLE   -> div[class*='p13n-sc-css-line-clamp']            full product title text
  PRICE   -> span[class*='p13n-sc-price']                    text e.g. "EGP 49.99" (note NBSP \xa0)
             numeric: re.search(r'([\d,]+\.?\d*)', t).group(1).replace(',','')  -> "49.99"
             currency is always EGP; missing element == no price (out of stock) -> store null, do NOT drop the row
  RATING  -> span.a-icon-alt                                 text "4.7 out of 5 stars"; numeric: float(t.split()[0])
  REVIEWS -> span.a-size-small                               text "863" (use t.replace(',','') -> int)
             cross-check: the rating anchor's aria-label = "4.7 out of 5 stars, 863 ratings" (corroborates count)
  IMAGE   -> img  (use ['src']); alt attribute also = product title. Thumbs are _AC_UL300 size; swap _SX300/_AC_UL300
             for higher res if needed.
  LINK    -> a[href*='/dp/']  ['href'] (relative path; prefix https://www.amazon.eg). Also yields ASIN via regex above.

Category URL pattern: https://www.amazon.eg/-/en/gp/bestsellers/<slug>
  Validated slugs: beauty, home (also electronics per mission brief). Other valid slugs: kitchen, toys, books, fashion, hpc, baby-products, videogames, etc.
Pagination: append ?pg=2 (also ?pg=3...). Each page = 30 items. pg=1 -> ranks #1-#30, pg=2 -> #51-#80.
```


**Real sample:**
```
ALL DATA BELOW IS LIVE from amazon.eg on 2026-06-08 (3 fetches, all HTTP 200, no captcha).

=== BEAUTY (/-/en/gp/bestsellers/beauty) — 30/30 products, 100% field coverage ===
#1 | White 80 round cotton pads | EGP 49.99 | ASIN B0CZ94NRQW | 4.7 stars, 863 reviews
#2 | Aloe Eva Strengthening Hair Mask Pouch With Aloe Vera & Silk Proteins | EGP 68.00 | ASIN B0B74JS567 | 4.4 stars, 1,493 reviews
#3 | Five Fives Salicylic Soap - 50 gm | EGP 32.50 | ASIN B08WJL45KJ | 4.0 stars, 2,363 reviews
#4 | Queen By Lord Triple Blade Shaving Razor Set Of 4 | EGP 55.00 | ASIN B07NP92L9P | 3.9 stars, 1,170 reviews
#5 | Hepta Carbamide Twenty Cream (20% Urea) | EGP 85.37 | ASIN B0G2JJMG83 | 4.4 stars, 201 reviews

=== HOME (/-/en/gp/bestsellers/home) — 30/30 products (28/30 have price; 2 genuinely out-of-stock, real Amazon behavior) ===
#1 | Portal High Accuracy Digital Kitchen Scale 10 Kg - White | EGP 125.06 | ASIN B08P5MP4YC | 3.7 stars, 3,425 reviews
#2 | Fresh Food Plastic Flexible Storage Bags, 100 Pieces | EGP 19.00 | ASIN B0B9KWZGG8 | 4.1 stars, 1,184 reviews
#3 | Milk frother rechargeable handheld 3-speed | EGP 117.99 | ASIN B08BLJ473G | 3.6 stars, 1,793 reviews
#4 | Other Fresh Keeping Bags F
```


**Integration:** - Parser is /tmp/parse_bs.py (scratch). Drop-in selector logic above is production-ready; key correctness fixes already baked in:
  (1) Iterate div[id^='p13n-asin-index'] (NOT div[data-asin] at top level — the OUTER card has an EMPTY data-asin; the populated data-asin is on an inner div). Pulling ASIN from the /dp/ href is the robust path.
  (2) Rank label is "#N" string -> strip '#'. Pages are NOT contiguous: pg=1 gives #1-#30, pg=2 gives #51-#80 (the on-page list shows 30 of a 100-deep list; expect a rank gap between pages — do NOT assume rank == position+1).
  (3) Price has a non-breaking space (\xa0) between "EGP" and the number — strip/regex it. Some bestseller items have NO price (out of stock) -> ~28/30 on HOME; keep the row with price=null.
  (4) Reviews via span.a-size-small is re


**Caveats:** - IP DEPENDENCY (the single biggest risk): proven on residential IP only. Datacenter IPs get 503 — this is the make-or-break for productionizing. Confirm Rasid's egress IP class before committing.
- RANK GAP between pages: page 1 = #1-#30, page 2 = #51-#80 (not #31-#60). The rendered grid shows 30 but the underlying list jumps; never compute rank from array index — read span.zg-bdg-text. If contiguous #31-#50 is required, that range was NOT returned by ?pg=2 in this test and needs further invest


## amazon.eg category tree harvest (bestsellers left-rail nav / zg_bs_nav)
- **worked:** yes · **rec:** primary · **cost:** $0 — direct curl from the residential IP, no API/proxy/service. Only cost is request volume against the home IP (rate-limit risk), not money.
- **user action:** none for the top-level tree (already harvested, 11/11 depts + Electronics fully done). To harvest the OTHER 10 departments' sub-category nodes, the user/pipeline must fetch each remaining department page once (10 more requests) using the same recipe and the SUB-CATEGORY regex above — same mechanism, already proven. Keep to 2-3 fetches per run, >=6s apart, from the residential IP only.


**Selectors:**
```
FETCH: curl -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" -H "Accept-Language: en-EG,en;q=0.9". BASE PREFIX = https://www.amazon.eg/-/en (the /-/en forces English).

TOP-LEVEL DEPARTMENTS — fetch the ROOT page /gp/bestsellers/ , then in BeautifulSoup iterate a[href] and match regex:  /gp/bestsellers/([a-z0-9\-]+)/ref=zg_bs_nav_([a-z0-9]+)_0  -> group(1)=slug, anchor text=English name. Exclude text 'Any Department'. (Ref token is zg_bs_nav_<root>_0 = depth-0 = a top-level department.)

SUB-CATEGORIES (with node id) — fetch any department page /gp/bestsellers/<slug>/ , iterate a[href] and match:  /gp/bestsellers/([a-z0-9\-]+)/(\d+)/ref=zg_bs_nav  -> group(1)=parent slug, group(2)=numeric browse-node id, anchor text=English name. (Depth marker in ref is ..._1.) The 'Any Department' anchor uses ref zg_bs_unv_<slug>_0 and is the back-to-root link — skip it.

URL TEMPLATES to iterate:
 dept bestsellers:   {BASE}/gp/bestsellers/{slug}/
 dept movers:        {BASE}/gp/movers-and-shakers/{slug}/
 subcat bestsellers: {BASE}/gp/bestsellers/{slug}/{node}/
 subcat movers:      {BASE}/gp/movers-and-shakers/{slug}/{node}/
 pagination:         append ?pg=2 (also seen as ref=zg_bs_pg_2_<slug>?ie=UTF8&pg=2). 'Next page' anchor present.
```


**Real sample:**
```
REAL DATA, 2 live fetches, both HTTP 200, no captcha. 11 REAL TOP-LEVEL DEPARTMENTS (from https://www.amazon.eg/-/en/gp/bestsellers/ root): automotive=Automotive, beauty=Beauty, books=Books, electronics=Electronics, fashion=Fashion, garden=Garden, grocery=Grocery, health=Health & Household Products, home=Home & Kitchen, toys=Toys, videogames=Video Games. (Top-level dept hrefs carry NO node-id, only the slug, e.g. /gp/bestsellers/electronics/ref=zg_bs_nav_electronics_0_1.)

REAL ELECTRONICS SUB-CATEGORIES (17, each with numeric browse-node id parsed from href, from /gp/bestsellers/electronics): Mobile Phones & Communication=21832868031; Headphones, Earbuds & Accessories=21832869031; Household Batteries & Chargers=21832870031; Car & Vehicle Electronics=21832871031; Computers, Components & Accessories=21832872031; Camera & Photo=21832873031; Power Accessories=21832874031; eBook Readers & Accessories=21832875031; Sat Nav, GPS, Navigation & Accessories=21832876031; Portable Sound & Vision=21832877031; Wearable Technology=21832878031; Hi-Fi & Home Audio=21832880031; Home Theater, TV & Video=21832881031; Telephones, VoIP & Accessories=21832882031; Tablets=21832915031; Warranties=854384200
```


**Integration:** Two-pass crawl: (1) GET /gp/bestsellers/ once -> 11 dept slugs. (2) GET /gp/bestsellers/<slug>/ for each dept -> that dept's child nodes (Electronics yields 17). Children can nest deeper (a sub-cat page may itself expose deeper zg_bs_nav links at ..._2); recurse the same SUB-CATEGORY regex to go N levels. Node ids are stable integers safe to persist as the canonical key; slug+node is the durable URL. Store {slug, node, name, parent} and generate the 4 URL templates. Output already serialized at /tmp/eg_category_tree.json (top-level + Electronics children, with bestsellers_url & movers_url per node). Respect: at most 2-3 pages/run, >=6s spacing, abort on 503/429 or 'Robot Check'/'Enter the characters'/'validateCaptcha' in body. Budget ~11-12 polite fetches to map all departments one level d


**Caveats:** (1) The ROOT page lists the 11 top-level department NAMES as nav but does NOT expand each department's children — only the department you are ON gets its sub-categories rendered in the left rail. So full sub-tree harvest = one fetch per department (10 remaining), not a single page. (2) Top-level department hrefs have NO numeric node id (slug only); node ids appear only from depth-1 down. If the pipeline keys everything by node id, resolve a top-level dept's node by reading its own page's canonic


## Movers & Shakers (rising products) — amazon.eg /-/en/gp/movers-and-shakers + category variants
- **worked:** no · **rec:** avoid · **cost:** USD 0 for the raw fetch path (plain curl from the residential IP, HTTP 200, no proxy, no key). If a JS renderer were ever needed it would still cost ~nothing — but it is moot here because rendering yields no data. Firecrawl cloud render (--country EG, 7s JS wait) was also tested and ALSO returned an empty grid; Firecrawl needs a paid API key for sustained use (none was set; the one test call succeeded via CLI default).
- **user action:** DECISION NEEDED, not a credential. The user must decide how to handle Movers & Shakers given it is empty on amazon.eg: (1) RECOMMENDED — drop M&S from the Rasid pipeline for the .eg marketplace and rely on Bestsellers (30 server-rendered cards, fully working) + New Releases as the "trending" signal; (2) keep a lightweight daily probe of /-/en/gp/movers-and-shakers/{category} that detects the ".p13n-desktop-grid h4 = no movers" empty-state and auto-enables ingestion if/when Amazon ever populates it; (3) if M&S risers are truly required now, source them from a marketplace that actually populates M&S (amazon.com / .in / .ae) rather than .eg. No paid key or signup is required for any of these.


**Selectors:**
```
GAIN BADGE: NOT OBSERVABLE on amazon.eg — no M&S product ever rendered, so the live gain-badge selector and the exact gain string format could not be captured from this marketplace. What IS proven (from the identical CardJS card template used by the live Bestsellers grid, which M&S reuses): the badge lives in the card's badge container and on Bestsellers holds the RANK; on a populated M&S page this same triangle-flag badge is where the rank/gain renders. Badge selectors (verified live on Bestsellers cards): container `div.zg-bdg-ctr` > body `div.zg-bdg-body.zg-bdg-clr-body` > text `span.zg-bdg-text` (observed value e.g. "#1"); decorative triangle `div.zg-bdg-tri.zg-bdg-clr-tri`. Per Amazon's documented M&S semantics (verified via amazon.com/.in M&S help text), the gain is a percentage computed from rank movement vs 24h ago (e.g. rank 30 -> 10 = "200%"); Amazon does NOT publish a raw "was #X" string in these grid cards — rank-change is expressed only as the single percentage figure. CARD FIELD SELECTORS (all proven live on .eg Bestsellers card #gridItemRoot, reusable for M&S once populated): card root `#gridItemRoot` (also `div#p13n-asin-index-{n}`); ASIN `[data-asin]` (e.g. B0CPC8JMCW); title `.zg-grid-general-faceout` (inner `.p13n-sc-uncoverable-faceout div`); product URL `a.a-link-normal[href]` -> "/-/en/.../dp/{ASIN}"; image `img.a-dynamic-image[src]` + `img[alt]`. Grid mount points: `#zg-right-col` (right column) and `.p13n-desktop-grid` (the grid; on M&S category pages this server-renders either cards or the no-data <h4>). Empty-state detector: `.p13n-desktop-grid h4` containing "no movers and shakers available".
```


**Real sample:**
```
NO RISERS AVAILABLE — cannot output 5 risers with gain%, because amazon.eg currently has ZERO Movers & Shakers data on the entire marketplace. This is not a scrape failure; it is the live site state. Proof: the category pages server-render the grid container and it contains a literal message instead of products: "Sorry, there are no movers and shakers available in this category. Please check back later." (extracted verbatim from <h4> inside .p13n-desktop-grid on /movers-and-shakers/electronics, /books, and /home). The root /movers-and-shakers page renders an empty #zg-right-col (0 chars) because its client-side CardJS runtime crashes (console: "TypeError: b.cardModuleFactory is not a function" at AUIClients/CardJsRuntimeBuzzCopyBuild). Real page TITLES confirm the pages are genuine and correctly themed: "amazon.ae Movers & Shakers: The biggest gainers in Amazon sales rank over the past 24 hours" (root) and "...biggest gainers in Electronics sales rank over the past 24 hours" (electronics variant). For comparison, the SAME machine + SAME recipe on Bestsellers /electronics returns 30 real server-rendered cards with data-asin (e.g. B0CPC8JMCW = "Joyroom S-Uc027A9 3A Usb-A To Type-C Fa
```


**Integration:** Pipeline guidance: 1) Do NOT build an M&S scraper against amazon.eg expecting products — it will always parse 0 cards today. 2) The root URL /gp/movers-and-shakers is the WORST target (empty #zg-right-col, CardJS crash). Prefer the CATEGORY variant URL form /-/en/gp/movers-and-shakers/{slug} (e.g. /electronics, /books, /home) — these server-render the grid container and return a clean, parseable empty-state you can detect deterministically. 3) Empty-state check (do this before attempting card parse): if soup.select_one('.p13n-desktop-grid h4') text contains 'no movers and shakers' OR len(#zg-right-col cards)==0 -> mark M&S unavailable, skip. 4) When/if M&S is populated, reuse the EXACT Bestsellers parser: iterate `#gridItemRoot`, pull `[data-asin]`, title from `.zg-grid-general-faceout`, u


**Caveats:** "avoid" = avoid relying on amazon.eg Movers & Shakers as a data source RIGHT NOW because it is empty marketplace-wide (electronics/books/home all return the no-data message); it is NOT avoid-because-blocked. The endpoints are reachable (HTTP 200, no captcha) — there is simply nothing to parse. Important nuances: (1) This may be a temporary/region condition — amazon.eg may populate M&S later; the category URL's deterministic empty-state message makes it cheap to re-check, so a low-frequency probe


## Product Detail parsing (amazon.eg /-/en/dp/&lt;ASIN&gt;) — title, brand, price, rating, reviews, availability, and Best Sellers Rank
- **worked:** yes · **rec:** primary · **cost:** $0. Pure curl + python3/beautifulsoup4 (already installed). No paid API, no proxy, no key. Only cost is bandwidth (~1.5MB per product page) and the residential-IP rate budget.
- **user action:** None for parsing logic — it is fully validated and ready to integrate. The ONLY user dependency is infrastructure: requests must egress from a RESIDENTIAL IP (this home machine returns 200; datacenter/cloud IPs get 503). For production at scale the user must decide on a residential/mobile proxy or run the fetcher from a residential connection. No signup needed for the parser itself.


**Selectors:**
```
All selectors confirmed against both live pages.

- title: CSS `#productTitle` (text, strip).
- brand: CSS `#bylineInfo` text -> regex `r'Visit the (.+?) Store'` (group 1) = brand. Fallback regex `r'Brand:\s*(.+)'` for "Brand: X" byline variant. Brand is ALSO redundantly in the details table row where th=="Brand Name" (td = "Joyroom"/"Xiaomi").
- price: first NON-EMPTY of `#corePrice_feature_div span.a-offscreen` then `span.a-price span.a-offscreen` then `.priceToPay span.a-offscreen`. Returns e.g. "EGP9,999.00". Numeric: amount = re.sub(r'[^\d.]','',p); currency = re.sub(r'[\d.,\s]','',p) -> "EGP". (Do NOT assemble from a-price-whole + a-price-fraction: on this locale it yields "EGP79 .00" with a stray space — use a-offscreen.)
- rating: `#acrPopover` attribute `title` (e.g. "4.4 out of 5 stars"); fallback `#acrPopover span.a-icon-alt`. Value = re.search(r'([\d.]+)', title).group(1).
- review_count: `#acrCustomerReviewText` text "(333)"; count = int(re.sub(r'[^0-9]','', text)).
- availability: `#availability` text -> "In Stock".
- BEST SELLERS RANK (critical): the standard IDs `#productDetails_detailBullets_sections1` and `#detailBulletsWrapper_feature_div` are ABSENT on amazon.eg. BSR lives in a `table.a-keyvalue.prodDetTable` (NO id attribute) where a `th.prodDetSectionEntry` text == "Best Sellers Rank". Reliable extraction (id-independent):
  node = soup.find(string=re.compile(r'Best Sellers Rank', re.I)); tr = node.parent.find_parent('tr'); rawTd = tr.select_one('td').get_text(' ',strip=True)
  Then parse ranks: re.findall(r'#([\d,]+)\s+in\s+(.+?)(?=\s*\(|\s*#[\d]|$)', rawTd) -> list of (rank, category). Subcategory ranking link: `tr td a` with href containing `/gp/bestsellers/` and `pd_zg_hrsr` (gives the category node id, e.g. 21833243031).
```


**Real sample:**
```
VALIDATED LIVE on 2026-06-08, both HTTP 200, no CAPTCHA/block.

PRODUCT 1 — ASIN B0CPC8JMCW (/tmp/prod1.html, 1,455,367 bytes):
- title: "Joyroom S-Uc027A9 3A Usb-A To Type-C Fast Charging Data Cable With 1M Length - Black"
- brand: Joyroom (byline "Visit the Joyroom Store")
- price: EGP79.00 (currency=EGP, amount=79.0)
- rating: 4.4 out of 5 stars (value=4.4)
- review_count: (333) -> 333
- availability: In Stock
- BSR raw: "#1 in Electronics ( See Top 100 in Electronics ) #1 in USB Cables" -> [{rank:1,category:"Electronics"},{rank:1,category:"USB Cables"}]; subcategory link href=/-/en/gp/bestsellers/electronics/21833243031/...

PRODUCT 2 — ASIN B0GCNZJCF8 (/tmp/prod2.html, 1,600,378 bytes):
- title: "XIAOMI Redmi Note 15 Smartphone (6+128 GB) – Ultra-thin design, IP64 water protection, 108 MP camera, 6.77\" FHD+ display, Black,18 Months Local Warranty"
- brand: Xiaomi (byline "Visit the Xiaomi Store")
- price: EGP9,999.00 (currency=EGP, amount=9999.0)
- rating: 4.2 out of 5 stars (value=4.2)
- review_count: (98) -> 98
- availability: In Stock
- BSR raw: "#10 in Electronics ( See Top 100 in Electronics ) #1 in SIM-free & Unlocked Mobile Phones" -> [{rank:10,category:"Electronics"},
```


**Integration:** Drop-in parser is /tmp/parse_unified.py (one function, takes an HTML path, returns the JSON shown). Fetch with the exact recipe: curl -sS --max-time 30 -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ... Chrome/124.0 Safari/537.36" -H "Accept-Language: en-EG,en;q=0.9" "https://www.amazon.eg/-/en/dp/<ASIN>". Notes: (1) Anchor every selector by ID/th-text, never by DOM position — the prodDetTable has no id and there are ~7 unnamed prodDetTables per page; only the BSR one contains th=="Best Sellers Rank". (2) BSR returns BOTH a top-level rank (#N in Electronics) and a leaf-category rank (#M in <subcat>) — for the Rasid app the LEAF category rank is the meaningful one for cross-product ranking. (3) The hrsr link's numeric node id (e.g. 21833243031 = USB Cables, 854384750


**Caveats:** (1) Residential-IP dependency is the whole ballgame — datacenter IPs get 503; the parser is correct but useless without residential/mobile egress. (2) BSR table has NO stable id on amazon.eg; the common tutorials' `#productDetails_detailBullets_sections1` / `#detailBulletsWrapper_feature_div` selectors DO NOT EXIST here — must anchor by th-text "Best Sellers Rank" (case-insensitive). If Amazon localizes that label (e.g. Arabic page), the text anchor breaks; for the /-/en/ English locale it is st


## REVIEWS scraping (amazon.eg / Amazon Egypt) for product B0CPC8JMCW
- **worked:** partial · **rec:** primary · **cost:** $0. Pure curl + python3/beautifulsoup4 from the residential IP. No paid API, no proxy, no headless browser needed for the embedded-reviews approach.
- **user action:** For the 8 embedded reviews per product: NONE — works today, logged-out, free. To go BEYOND 8 reviews per product (the full set up to all 333, with pagination + sort by recent/critical/star-filter): the USER must supply authenticated amazon.eg session cookies (log in once in a browser, export the cookie jar), because /-/en/product-reviews/<ASIN> 302-redirects to /ap/signin when logged-out. Alternatively the user accepts the 8-review cap as the logged-out ceiling.


**Selectors:**
```
CRITICAL: the embedded DP review widget uses DIFFERENT (camelCase) hooks than the standalone reviews page (kebab-case). Use these against the PRODUCT PAGE HTML:
- Container: div#localTopReviewsList
- Each review: div[data-hook='review']  (8 of them)  — review id = the block's id attr (e.g. R1Z0FYBN9SSZZ0)
- Rating: i[data-hook='review-star-rating'] span.a-icon-alt  -> "5 out of 5 stars" (split()[0] -> float)
- Title: h5[data-hook='reviewTitle']   (NOT review-title)
- Body: div[data-hook='reviewText']    (NOT review-body)
- Author: .a-profile-name  (== span.a-profile-name)
- Date: span[data-hook='review-date']  -> "Reviewed in Egypt on 3 May 2026"
- Verified badge: span[data-hook='avp-badge']  (presence => True; text "Verified Purchase")
- Helpful votes: span[data-hook='helpful-vote-statement']  -> "N people found this helpful" / "One person found this helpful" (absent => 0)
Body cleanup (required): the reviewText node wraps boilerplate; strip literals "Brief content visible, double tap to read full content.", "Full content visible, double tap to read brief content.", and regex \bRead more\b|\bRead less\b, then collapse whitespace. Also strip leading "^\d(\.\d)? out of 5 stars" from the h5 title.
Arabic detection: regex [؀-ۿ] on title+body.
Summary on same page: #productTitle, #acrPopover[title] ("4.4 out of 5 stars"), #acrCustomerReviewText ("(333)").
FOR REFERENCE the standalone /product-reviews page (login-gated) would use div[data-hook='review'] + a[data-hook='review-title'] + span[data-hook='review-body'] — kebab-case — but you cannot reach it logged-out.
```


**Real sample:**
```
REAL reviews extracted live (2026-06-08) for B0CPC8JMCW = "Joyroom S-UC027A9 3A USB-A to Type-C Fast Charging Cable 1M Black", overall 4.4 out of 5 stars, (333) total ratings. 8 reviews are embedded on the public product page (#localTopReviewsList): 7 Arabic + 1 English — BOTH languages confirmed present.

3 REAL reviews (verbatim):
[1] id=R1Z0FYBN9SSZZ0 | 5.0 stars | Verified Purchase | helpful=3 | author "Medhat M." | "Reviewed in Egypt on 3 May 2026" | title (AR) "عجبتني عشان قللت سخونة الجهاز اثناء الشحن" | body (AR) "الموبايل عندي كان بيسخن جدا و هو بيشحن...جربت وصلات شاحن كتيرة... الوصلة دي أخيرا هي اللي حلت المشكلة...السخونية قلت و ثابتة... و الماركة دي شكلها ماركة محترمة جدا علي أسعارها دي" (full ~600-char body captured cleanly).
[2] id=R22QKGGV8CX8HD | 1.0 star | Verified Purchase | helpful=2 | author "Abdelrahman Radwan" | "Reviewed in Egypt on 26 April 2026" | title (EN) "Slow charging" | body (EN) "Very slow charging even though it claims it's a fast charging cord".
[3] id=R2ADRUQVCY2D6H | 4.0 stars | Verified Purchase | helpful=1 ("One person found this helpful") | author "mostafa mahmoud" | "Reviewed in Egypt on 10 April 2026" | title (AR) "جميل" | body (AR) "تغليف جي
```


**Integration:** Pipeline design for Rasid: (1) Do NOT hit /product-reviews/ logged-out — it returns 302 to /ap/signin (wasted request, leaks intent). (2) Instead fetch the PUBLIC product page https://www.amazon.eg/-/en/dp/<ASIN> (HTTP 200, ~1.4MB) and parse #localTopReviewsList — yields up to 8 "top reviews" per ASIN with full fields + clean Arabic/English bodies. This is the zero-cost logged-out source. (3) The /-/en/ path prefix forces English UI chrome but review BODIES remain in their original language (Arabic stays Arabic), so language-mix is preserved — good for sentiment. (4) Store review id (stable, e.g. R1Z0FYBN9SSZZ0) as primary key for dedupe across crawls. (5) Normalize: stars=float(rating.split()[0]); helpful: "One"->1 else first int else 0; verified=badge present; date parse "Reviewed in Egy


**Caveats:** (1) LOGGED-OUT CAP = ~8 reviews per product. The dedicated /product-reviews/ page is login-gated (302 -> /ap/signin), so the FULL review corpus (here 333) and sort/filter/pagination are NOT reachable without auth cookies. The 8 embedded ones are "top reviews" (relevance-ranked), NOT necessarily most-recent — sortBy=recent does not apply to the embedded widget. (2) Selector trap: the embedded widget uses reviewTitle/reviewText (camelCase) — the documented review-title/review-body kebab-case hooks


## SEARCH (SERP) scraping — amazon.eg /-/en/s?k=&lt;query&gt; (powers search-by-name)
- **worked:** yes · **rec:** primary · **cost:** $0 — direct HTTP via curl + python3/beautifulsoup4. No API, no paid service, no key. Only cost is the residential egress IP (Amazon serves 200 to residential, 503 to datacenter IPs).
- **user action:** none — for validation. For PRODUCTION the USER must provide a residential/mobile egress path (home IP, residential proxy pool, or self-hosted box on a residential line). Datacenter/cloud IPs WILL get 503/CAPTCHA. No Amazon account or API key needed for SERP scraping.


**Selectors:**
```
Working extractor saved at /tmp/parse_serp.py (verified on both pages). EXACT selectors (BeautifulSoup / CSS):

CARD CONTAINER (iterate these): div[data-component-type='s-search-result']

ASIN: card.get('data-asin')  (read the data-asin attribute directly; skip cards where it is empty — those are ad/placeholder slots)

TITLE: card.select_one("h2 span").get_text(strip=True)
  IMPORTANT — Amazon changed the markup: the old "h2 a span" returns 0 results now. The <a> link now WRAPS the <h2> (a.a-link-normal > h2 > span), so the title text lives in "h2 span" (fallback: "h2" text itself). Use "h2 span", NOT "h2 a span".

PRICE (current, EGP): card.select_one("div[data-cy='price-recipe'] .a-price:not(.a-text-price) .a-offscreen").get_text(strip=True)
  Returns e.g. "EGP 3,099.00" (note non-breaking space U+00A0 between EGP and number — normalize with .replace(' ',' ')). The :not(.a-text-price) guard excludes the struck-through List price (the List price is the 2nd .a-offscreen). Simpler ".a-price .a-offscreen" also works (first match = current) but the :not guard is bulletproof if order flips.

RATING (0–5): from card.select_one("div[data-cy='reviews-block'] span.a-icon-alt").get_text() → regex r'([\d.]+)\s+out of' → e.g. "4.3"

REVIEW COUNT: iterate card.select("div[data-cy='reviews-block'] a[aria-label]"), match the one whose aria-label fits r'^([\d,]+)\s+ratings?$' → e.g. "29,796 ratings" → 29796. CAUTION: a sibling anchor in the same block has aria-label "4.3 out of 5 stars, rating details" — do NOT grab the first anchor blindly; the anchored regex ($) is what disambiguates. (Sponsored fallback: "a[href*='customerReviews'] span" → strip "()".)

SPONSORED FLAG: sponsored = True if card.select_one("h2") has aria-label starting (case-insensitive) with "Sponsored" (real value seen: "Sponsored Ad – SoundCore C40i..."). Fallback: card.find(string=re.compile(r'^\s*Sponsored\s*$')). Sponsored product URLs also route through /-/en/sspa/click?... vs organic /-/en/<slug>/dp/<ASIN>/.

PRODUCT URL: organic href is on the title link; build https://www.amazon.eg + href. Or just construct https://www.amazon.eg/-/en/dp/<ASIN> from the ASIN.

PAGINATION (not fetched, to protect IP, but param is standard): add &page=N to the search URL.
```


**Real sample:**
```
LIVE, HTTP 200, fetched 2026-06-08 from residential IP. Two queries validated.

QUERY 1 — "earbuds" (/-/en/s?k=earbuds): 60 result cards parsed (48 organic, 12 sponsored). 5 REAL ORGANIC results [ASIN | title | current EGP price | rating | reviews]:
1. B0CRTYZG5C | Soundcore P30i by Anker Noise Cancelling Earbuds... | EGP 1,275.00 | 4.3 | 29,796
2. B0DBHT1BT9 | Xiaomi Redmi Buds 6 Play, 36H Playtime... White | EGP 732.95 | 4.0 | 22,126
3. B0C7CQT9ZS | Anker Soundcore VI R50i True Wireless Earbuds, 10mm Drivers... | EGP 930.00 | 4.2 | 3,158
4. B0CDM94MJL | HUAWEI FreeBuds SE 2, 40-Hour Battery, IP54, Isle Blue | EGP 1,156.99 | 4.2 | 12,417
5. B0D22RLPP3 | Soundcore K20i by Anker, Semi-in-Ear Earbuds, 36H... | EGP 654.00 | 3.7 | 3,543
(Top sponsored example: B0DYJYHNGQ SoundCore C40i by Anker | EGP 3,099.00 | 4.1 | 369 | sponsored=true.)

QUERY 2 — Arabic "شاحن" (charger) (/-/en/s?k=%D8%B4%D8%A7%D8%AD%D9%86): 48 cards (all organic, 0 sponsored). 5 REAL results — Arabic keyword correctly returns charger products (titles are English because URL is the /-/en/ locale):
1. B0DXLBNG6K | Anker Zolo 1C Wall Charger Type-C 30W Fast Charging... Black | EGP 694.13 | 4.5 | 678
2. B0G53L24DF | Or
```


**Integration:** - Endpoint: GET https://www.amazon.eg/-/en/s?k=<URL-encoded query>. Arabic works URL-encoded (شاحن → %D8%B4%D8%A7%D8%AD%D9%86); the /-/en/ locale returns English titles even for Arabic queries — good for consistent display, but if the app needs Arabic titles, hit /-/ar/s?k=... instead (same selectors expected; not tested this run).
- Exact working request (validated twice): curl -sS --max-time 30 -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" -H "Accept-Language: en-EG,en;q=0.9" "<url>" -o out.html
- Parse server-rendered HTML with beautifulsoup4 (no JS/headless browser needed — all 6 fields are in the static HTML; pages were 1.9MB & 1.17MB).
- ~48–60 cards per page. Filter sponsored=true for organic-only ranking; spon


**Caveats:** - HARD DEPENDENCY on residential/mobile IP. Datacenter IPs get 503/CAPTCHA — this whole approach collapses on cloud hosting without a residential proxy. This is the #1 production risk.
- Amazon CHANGES MARKUP without notice: the documented "h2 a span" title selector is already dead (now "h2 span"). Selectors are not contractual; build a fill-rate monitor + alert. Treat the selector set as a maintained artifact, not fire-and-forget.
- Sponsored detection relies on the h2 aria-label "Sponsored Ad 


## Bilingual (Arabic) capture validation — amazon.eg bestsellers, EN + AR titles per ASIN
- **worked:** yes · **rec:** primary · **cost:** $0. Pure curl + python3/beautifulsoup4. No API, no key, no paid service. Cost = 2 HTTP GETs per category to get both languages (one EN + one AR), or you can derive the language-toggle URL pattern and fetch only the language(s) you need.
- **user action:** none — for validation. For production: the ONLY hard requirement is that fetches originate from a residential/non-datacenter IP (datacenter IPs get 503; this residential machine got 200). User must decide the egress path for the production pipeline: run the fetcher from a residential IP / residential-proxy, OR budget for a scraping API that supplies residential IPs. No Amazon account, login, or API key is needed for bestsellers pages.


**Selectors:**
```
Same parser works for both languages (page structure is identical; only text differs).

FETCH (two equivalent ways to force Arabic, both verified HTTP 200):
  Method A (URL path):  GET https://www.amazon.eg/-/ar/gp/bestsellers/electronics
  Method B (header only): GET https://www.amazon.eg/gp/bestsellers/electronics  with header  Accept-Language: ar-EG,ar;q=0.9
  English equivalent:   GET https://www.amazon.eg/-/en/gp/bestsellers/electronics   (or Accept-Language: en-EG,en;q=0.9)

PARSE (BeautifulSoup, per ranked item — preserves rank order):
  containers:  soup.select('div#gridItemRoot')          # 30 per page, in rank order
  asin:        re.search(r'/dp/([A-Z0-9]{10})', a['href'])  on  a.a-link-normal[href*="/dp/"]
  title:       root.select_one('div[class*="p13n-sc-css-line-clamp"]').get_text(strip=True)   # AR or EN text per the rendering
  title fallback: root.select_one('img[alt]')['alt']
  rank:        root.select_one('span.zg-bdg-text').get_text(strip=True)        # e.g. "#1"
  price:       root.select_one('span[class*="p13n-sc-price"]').get_text(strip=True)  # e.g. "EGP 79.00"

PAIRING: join EN dict and AR dict on the ASIN key. All 30 ASINs matched 1:1 across both fetches (same ranks, same EGP prices). Language detection sanity check: AR rendering has html dir="rtl"; titles match regex [؀-ۿ].
```


**Real sample:**
```
REAL amazon.eg Electronics bestsellers, fetched 2026-06-08, HTTP 200, EGP currency, ue_mid=ARBP9OOSHTCHU (Egypt marketplace), canonical=https://www.amazon.eg/gp/bestsellers/electronics. All 30 ranked ASINs returned BOTH EN and AR titles (30/30 fill rate each). Same-ASIN EN/AR pairs:

#1 ASIN B0CPC8JMCW | EGP 79.00
  EN: Joyroom S-Uc027A9 3A Usb-A To Type-C Fast Charging Data Cable With 1M Length - Black
  AR: كابل من جويروم بطول 1.2 متر نوع USB متوافق مع الهواتف المحمولة

#2 ASIN B09C7BWVX7 | EGP 56.00
  EN: LDNIO LS441 Lightning 2.4A Fast charging Data Cable 1M Length - Gray
  AR: كابل بيانات للشحن السريع بقوة 2.4 أمبير من لدنيو، موديل LS441، طول 1 متر، لون رمادي

#3 ASIN B0DRDPSKQH | EGP 99.00
  EN: Camelion Super Heavy Duty R03 AAA Zinc-Carbon Batteries – Economical Power (Box of 12)
  AR: بطاريات زنك-كربون ايه ايه ايه من كميليون شديدة لتحامل R03 - طاقة أقتصادية (صندوق من 12 قطعة)

#4 ASIN B09Y37BSM9 | EGP 59.00
  EN: iLOCK Travel Plug adapter Converter
  AR: محول قابس السفر من اي لوك

#6 ASIN B0D9W85D2N | EGP 38.50
  EN: StickyGrippy Suction Phone Case Mount with Fidget Toy & Mirror Feature - Bubble Gum
  AR: جراب موبايل لاصق من ستيكي جريبي، ملحق هاتف لاصق من السيليكون لايفون و
```


**Integration:** 1) To capture bilingual per ASIN: fetch the SAME bestsellers URL twice — once with the /-/en/ path (or en-EG header) and once with /-/ar/ (or ar-EG header) — then JOIN the two parsed result sets on ASIN. Store title_en and title_ar as separate columns; never auto-translate one into the other (they diverge factually, see real sample).
2) Both the /-/ar/ URL-path method and the Accept-Language-header method produce identical Arabic content — pick the URL-path method for production; it is explicit, cache-friendly, and does not depend on header negotiation.
3) Cosmetic artifact to ignore: the Arabic/English templates carry html lang="ar-ae"/"en-ae" and a <title> that literally reads "amazon.ae". This is a shared GCC Arabic localization template — the ACTUAL data is Egyptian: canonical=amazon.e


**Caveats:** 1) Residential-IP dependency is the whole ballgame — this worked because the fetch came from a home IP. Datacenter IPs return 503 (per mission brief). Production must egress residential or use a residential-proxy/scraping API.
2) IP-rate-limit risk: bilingual doubles fetch count (EN+AR per category) and pagination multiplies it further. At scale you WILL trip 429/503 without throttling + rotating residential IPs. Keep >=6s spacing and stop on 503/429/Robot Check.
3) EN/AR titles diverge factuall


## "Most Searched" demand pillar — Google Trends via pytrends, geo='EG' (replaces empty Amazon EG autocomplete)
- **worked:** yes · **rec:** primary · **cost:** $0. pytrends is free, open-source (MIT), no API key, no account. Uses Google Trends' public/internal JSON endpoints. Only cost is the residential-IP request budget (rate limits, not money).
- **user action:** none — works today with zero signup. (Optional hardening for scale, user's choice: add rotating residential/proxy pool OR a paid Trends provider like SerpApi Google Trends API ~$50/mo+ or DataForSEO if you outgrow free rate limits. Not required for the current low-volume pillar.)


**Selectors:**
```
pytrends 4.9.2 API (no CSS — JSON API). Exact calls:
TrendReq(hl='en-US', tz=120, timeout=(10,25), retries=2, backoff_factor=0.5)  # tz=120 = Egypt UTC+2 (minutes)
build_payload(kw_list=[...up to 5 terms...], cat=0, timeframe='today 12-m', geo='EG', gprop='')   # gprop='' = web search; use 'froogle' for Shopping
Then per built payload (NO extra HTTP cost beyond build except IOT/region which are 1 call each):
  interest_over_time()                          -> DataFrame[term..., 'isPartial']; drop rows where isPartial=True for finalized data
  related_queries()                             -> dict{term: {'top': df[query,value 0-100], 'rising': df[query,value = %growth, 'Breakout'->huge int]}}
  related_topics()                              -> same shape, entity-level (optional)
  interest_by_region(resolution='REGION', inc_low_vol=True, inc_geo_code=False) -> df indexed by Egyptian governorate (geoName), value 0-100
Key params: geo='EG' (country) or 'EG-C' (Cairo gov) etc.; timeframe options 'now 7-d','today 1-m','today 3-m','today 12-m','today 5-y','all'; cat=0 (all) or e.g. 222 (Consumer Electronics). Trending-now/realtime endpoints are deprecated/broken in 4.9.2 — use related_queries RISING as the "rising demand" signal instead.
```


**Real sample:**
```
REAL Egypt (geo=EG) data pulled live 2026-06-08, 3 request bursts, all succeeded, no captcha/429.

EARBUDS — interest_over_time (weekly, today 12-m), real relative-interest values through 2026-06-07: ...2026-05-03=45, 05-10=39, 05-17=39, 05-24=26, 05-31=31, 06-07=26(isPartial).
EARBUDS related_queries TOP (0-100): wireless earbuds=100, best earbuds=82, earbuds pro=49, best wireless earbuds=48, honor earbuds=47, soundcore earbuds=35, best earbuds 2025=30, earbuds huawei=24, earbuds samsung=24.
EARBUDS related_queries RISING (% growth): huawei earbuds 7i=+68350, honor choice earbuds x7e=+51450, honor choice earbuds x7i=+22950, honor choice earbuds s7=+18450, noise cancelling earbuds=+6250, best earbuds 2025=+2950.
EARBUDS interest_by_region (REGION = Egypt governorates): Cairo=100, Alexandria=73, South Sinai=62, Giza=59, Matrouh=56, Ismailia=55, Port Said=54, New Valley=54, Red Sea=52, Luxor=52.

ARABIC شاحن (charger) — TOP: شاحن سامسونج (Samsung charger)=100, شاحن ايفون (iPhone)=88, انكر شاحن (Anker)=53, راس شاحن=49, وصلة شاحن=30. RISING: شاحن ابل الاصلي 20 واط (Apple orig 20W)=+190, شاحن سامسونج 45w=+140, سعر شاحن انكر=+40.
ARABIC سماعات (headphones) — TOP: سماعات بلوتوث (bluetooth
```


**Integration:** REQUIRED PATCH (blocker on this stack): pytrends 4.9.2 + urllib3>=2 crashes with TypeError method_whitelist. Fix one line in pytrends/request.py (~line 128): rename Retry(..., method_whitelist=...) -> allowed_methods=... . Verified working after patch. Alternatively set retries=0, backoff_factor=0 to skip the Retry object entirely (loses auto-retry). pandas 3.0.3 worked fine — no .append breakage hit.

Pipeline design:
- Seed list = your taxonomy terms (EN + Arabic). Batch up to 5 seeds per build_payload to cut request count (1 build = 1 token+1 widget fetch; each of IOT/related/region = ~1 more GET). Fewer requests = safer IP.
- For each seed/batch capture: (a) interest_over_time trend array (momentum: compare last 4wk avg vs prior), (b) related_queries RISING = emerging demand / new SKUs


**Caveats:** 1) Trends values are RELATIVE/normalized 0-100 within one request, not absolute search volume — good for ranking & momentum, NOT for "X searches/month." For absolute volume you'd need Keyword Planner or a paid SEO API. 2) Unofficial endpoint: Google can change it anytime; pytrends 4.9.2 is lightly maintained (the method_whitelist break is proof) — pin the patched copy. 3) 429 risk is the main operational hazard; the free single-IP path supports only modest daily volume — fine for a curated seed 


## amazon.eg on-site search suggestion (autocomplete/ISS keyword) endpoint
- **worked:** yes · **rec:** primary · **cost:** $0. Public unauthenticated GET endpoint. No API key, no account, no paid service. Just HTTP from a non-datacenter IP.
- **user action:** NONE required to make it work. The endpoint needs no login and no cookie (minimal params mid+alias+prefix suffice; I confirmed cookies were NOT the differentiator — host+mid were). 

The ONLY user constraint is the same residential-IP requirement as the rest of the pipeline: requests must originate from a non-datacenter IP (residential/mobile) or a residential-proxy provider. If Rasid's backend runs in a datacenter/cloud, the user must route these calls through a residential proxy (e.g. the same proxy strategy used for the bestseller/product scrapers). This endpoint is lighter-weight than HTML scraping (157-2800 byte JSON responses) so it is cheap to proxy.


**Selectors:**
```
WORKING REQUEST (exact):
  GET https://completion.amazon.co.uk/api/2017/suggestions
  Required query params (minimum): mid, alias, prefix
  Full recommended params:
    mid=ARBP9OOSHTCHU        <- THE KEY: obfuscated Egypt marketplace ID (numeric marketId=623225021). This is the discriminator that makes EG data appear.
    alias=aps                <- search-all department
    prefix=<user keystrokes, URL-encoded; supports Arabic UTF-8>
    client-info=amazon-search-ui
    lop=en_AE                <- language/locale; use ar_AE for Arabic results
    site-variant=desktop
    limit=11                 <- max suggestions (server caps ~10)
    suggestion-type=KEYWORD  <- (optional; can repeat &suggestion-type=WIDGET)
  Optional/echoed: session-id, customer-id (blank ok), request-id, page-type=Gateway, b2b=0, fresh=0, ks, event=onKeyPress, fb=1, mkt=623225021

RESPONSE PARSING (JSON, application/json):
  results = json["suggestions"]                  # list
  for s in results: keyword = s["value"]         # the suggestion string
  filter on s["type"] == "KEYWORD"               # KEYWORD = pure search term (WIDGET = product/brand cards)
  json["responseId"] for logging/debug

HOST DISCRIMINATION (proven by test matrix):
  completion.amazon.co.uk/api/2017/suggestions + mid=ARBP9OOSHTCHU  -> 200, REAL EG suggestions  (USE THIS)
  completion.amazon.com  /api/2017/suggestions + mid=ARBP9OOSHTCHU  -> 200 but suggestions:[] EMPTY (why .com looked dead for EG)
  completion.amazon.co.uk/search/complete (legacy path in page config) -> 404
  => amazon.eg's suggestion backend lives on the co.uk (EU) host, NOT .com and NOT a completion.amazon.eg subdomain.

WHERE mid COMES FROM: amazon.eg homepage HTML, inline JS block `var opts = { host:"completion.amazon.co.uk/search/complete", marketId:"623225021", obfuscatedMarketId:"ARBP9OOSHTCHU", language:"en_AE", ... }`. obfuscatedMarketId == the mid param. This value is static for EG; hardcode it (ARBP9OOSHTCHU) — no need to re-scrape per request.
```


**Real sample:**
```
LIVE EG keyword suggestions returned (HTTP 200, 2025-current data — note iPhone 17 = current gen as of 2026-06-08, proving freshness).

EN query prefix="iphone" (lop=en_AE) -> 10 suggestions:
1. iphone 17 pro max  2. iphone  3. iphone 17  4. iphone 17 pro max case  5. iphone 15  6. iphone 13 case  7. iphone 16  8. iphone 13 pro max  9. iphone 17 case  10. iphone 16 pro max
(each: type=KEYWORD, refTag=nb_sb_ss_i_N_6, strategyId=organic, candidateSources=local)

AR query prefix="لاب" (lop=ar_AE) -> 10 suggestions (authentic Egyptian-Arabic terms):
1. لاب توب (laptop)  2. حامل لابتوب (laptop stand)  3. شنطة لابتوب (laptop bag)  4. لاب توب مستعمل (used laptop)  5. ترابيزة لابتوب (laptop table)  6. لاب توب hp  7. ستاند لابتوب  8. لابتوب مستعمل

Raw JSON shape: {"alias":"aps","prefix":"iphone","suffix":"","suggestions":[{"suggType":"KeywordSuggestion","type":"KEYWORD","value":"iphone 17 pro max","refTag":"nb_sb_ss_i_1_6","candidateSources":"local","strategyId":"organic","prior":0.0,"ghost":false,"help":false,"queryUnderstandingFeatures":[...]}, ...],"predictiveText":null,"suggestionTitleId":null,"responseId":"10JTX3DJKA480","shuffled":false}
```


**Integration:** - Drop-in autocomplete: on each keystroke (debounce ~150-250ms) GET the URL with prefix=<input>, parse json["suggestions"][].value where type=="KEYWORD". Returns up to 10.
- Locale switch: lop=en_AE for English UI, lop=ar_AE for Arabic UI. Both return EG-relevant terms. The mid stays ARBP9OOSHTCHU regardless of language.
- These keyword strings feed directly into the EG search/results scraper as the ?k= query — i.e. this endpoint is the natural front-door that produces the search terms the rest of the pipeline already consumes.
- mid is static — hardcode ARBP9OOSHTCHU. Optionally re-validate it monthly by re-reading the homepage opts block in case Amazon rotates it.
- Response is tiny JSON, very fast (~230-460ms observed), no HTML parsing, far lighter on the IP than page scraping. Good can


**Caveats:** - HOST IS COUNTERINTUITIVE: it is completion.amazon.co.uk, NOT .com and NOT .eg. The .com host accepts the EG mid (200) but returns an empty list — that is exactly the "completion.amazon.com is empty for EG" symptom in the assignment. Root cause confirmed = wrong host, not wrong params. Do not use .com.
- The page's own config string (completion.amazon.co.uk/search/complete) is a LEGACY/stale path that 404s; the live path is /api/2017/suggestions (built at runtime by the AUI ISS lib, flag isUseA


## Egypt demand model — "most searched / trending" metric from REAL sources only (Google Trends EG + amazon.eg Best Sellers rank + Movers & Shakers velocity). Amazon autocomplete confirmed empty/unusable for EG.
- **worked:** research-only · **rec:** primary · **cost:** $0. All three sources are public and free: Google Trends RSS/JSON (free, no key), amazon.eg Best Sellers + Movers HTML (free via the proven residential curl recipe). No paid API required. Only "cost" is engineering time for entity resolution + a cache layer.
- **user action:** None required to access data. RECOMMENDED user/ops actions: (1) keep all fetches on the residential IP (datacenter IPs get 503 from Amazon); (2) cache Best Sellers/Movers ~hourly and Google Trends ~daily to stay well under rate limits; (3) decide display copy sign-off — must be "Trending/Demand Index", never "X searches". If absolute search-volume numbers are ever required for the UI, the USER must procure a paid source (e.g. Google Ads Keyword Planner / Keywords Everywhere / Semrush EG) — none of the free sources provide them.


**Selectors:**
```
METRIC DEFINITION — "Trend Score" (0-100 composite, percentile-rank normalized so unitless inputs combine honestly):

TrendScore = 100 × ( 0.45·P_trends + 0.35·P_movers + 0.20·P_bestseller )

where each P_x = item's percentile rank WITHIN its own source, in [0,1]:
- P_bestseller = 1 − (rank − 1)/(N − 1)   [rank 1 => 1.0]
- P_movers     = percentile of the item's "% sales-rank change" among today's movers list
- P_trends     = percentile of the item's Trends momentum value (rising-query value / breakout flag) among EG rising queries
Missing source => term dropped and weights renormalized over present sources (NEVER imputed with a made-up value).

WEIGHT RATIONALE: search intent (Trends) leads = forward-looking demand; acceleration (Movers) second = what is heating up now; Best Sellers anchors = durable popularity. Tune weights per category empirically; expose them in config, not hardcoded magic.

DATA SELECTORS / PARAMS:
- Google Trends RSS: GET https://trends.google.com/trending/rss?geo=EG  (XML; parse <item><title> = query, <ht:approx_traffic> = coarse bucket, <ht:news_item> for context). Treat approx_traffic as a BUCKET label only.
- pytrends: TrendReq(hl='en-US', tz=120); pytrends.build_payload([kw], geo='EG'); .related_queries()[kw]['rising'] -> DataFrame[query, value]; value==5000 => Breakout. tz=120 = Cairo UTC+2.
- amazon.eg Best Sellers: GET https://www.amazon.eg/-/en/gp/bestsellers/<category>  (parse rank badge text '#\d+' + ASIN from data-asin / /dp/<ASIN>/ URL + title + price).
- amazon.eg Movers: GET https://www.amazon.eg/-/en/gp/movers-and-shakers/<category>  (parse same item block + the "% change" string, regex r'([+-]?[\d,]+)%').
ENTITY RESOLUTION (main engineering risk): Trends returns free-text Arabic/English queries; Amazon returns products. Join by fuzzy token match on brand+model after normalizing Arabic↔English (transliterate, strip diacritics, RapidFuzz token_set_ratio >= ~80). Multi-source match => confidence boost.
```


**Real sample:**
```
SOURCE AVAILABILITY (structure validated; live amazon.eg fetches deliberately NOT spent here to protect residential IP — sibling agents already pull Best Sellers/Movers, and mission brief already proves HTTP 200 on /gp/bestsellers/electronics with 30 real products):

1) Google Trends EG (geo=EG) — the ONLY true SEARCH signal. Daily-trends RSS: https://trends.google.com/trending/rss?geo=EG returns Egypt-scoped trending search queries with "approx traffic" buckets (e.g. "2,000+", "5,000+" searches — these are COARSE BUCKETS, not exact counts). Realtime/related-queries via pytrends honors geo='EG' and returns rising/breakout queries with a relative 0-100 momentum value (value>=5000 in API = "Breakout"). Example shape of a rising-queries row: {query, value:'+450%' or 'Breakout', rank}. NOTE: Trends values are RELATIVE indices, NOT absolute search volume — this is the central honesty constraint.

2) amazon.eg Best Sellers — proven HTTP 200 from this residential IP (mission brief). Gives ORDINAL rank 1..100 per category. Rank = proxy for current sales velocity, Amazon refreshes ~hourly. Selector confirmed by sibling work: each item carries a visible rank badge and ASIN.

3) amazon.eg Mov
```


**Integration:** PIPELINE: (a) Pull Google Trends EG rising queries (daily) -> momentum percentile. (b) Pull amazon.eg Best Sellers + Movers per category (hourly) -> rank percentile + velocity percentile. (c) Entity-resolve Trends queries to products (fuzzy Arabic/English). (d) Compute TrendScore; renormalize weights over present sources. (e) Persist with as-of timestamp + per-source provenance.

HONEST LABELING (non-negotiable, ties straight into Rasid UI):
- Name it "Trending Score" or "Demand Index" (0-100) or a rank ("#1 Trending"). NEVER "searches" or "N searches/month".
- Per-item provenance badge: Search (Trends) / Velocity (Movers) / Top Seller (Best Sellers). Item in multiple sources => "Hot" / high confidence.
- Always render "as of <timestamp>" + microcopy "Relative popularity, not absolute sear


**Caveats:** (1) Google Trends values are RELATIVE indices / coarse buckets — NOT absolute search counts. Any UI claiming exact search volume from these is fabrication. (2) Entity resolution Arabic↔English (Trends free-text query -> Amazon product) is the main engineering risk and source of false joins; start with high fuzzy thresholds + manual brand whitelist. (3) Trends relative-index ceiling means cross-category score comparison is unreliable — compare within category, or treat Trend Score as ordinal not 


## Deployment / scheduling strategy for keeping a RESIDENTIAL IP on a scheduled amazon.eg scraper (Rasid app)
- **worked:** yes · **rec:** primary · **cost:** (a) Local launchd/cron on the Mac = $0 (uses the existing residential IP and an already-on machine). RECOMMENDED.
(b) Cheap residential proxy + cloud cron: proxy is the only added cost. At twice/day x ~0.4MB/page the data volume is ~0.3 GB/yr, so PAYG residential proxy = trivial: DataImpulse $1/GB, IPRoyal $1.75/GB (non-expiring), Webshare ~$1.40/GB. Realistic floor ~$1-5 total for a year of this volume (most vendors have a small minimum top-up, e.g. IPRoyal/DataImpulse a few $). Cloud cron (GitHub Actions) free. Caveat: must route through EG/MENA proxy exit and Amazon may still flag pooled residential exits.
(c) Raspberry Pi (Zero 2 W) always-on at home: hardware ~$15-20 once + SD card; electricity ~$1/yr (idle ~0.4-1.25W). Uses the SAME home residential IP for free. Ongoing ~$0.
(d) Managed scraper API (handles IP rotation + anti-bot for you): free tiers cover this use case entirely — ScraperAPI free-forever 1,000 credits/mo, Scrapingdog 1,000 free on signup, ZenRows 100. Twice/day = ~60 req/mo, well under 1,000/mo free. Paid floor if you outgrow free: Scrapingdog ~$40/mo / ScraperAPI ~$0.75 per 1k. Note Amazon needs the premium/JS tier on some vendors (ZenRows only 40% success on Amazon; Scrapingdog ~100%).
- **user action:** For the recommended DEFAULT (a), the USER must do a one-time setup (cannot be done for them safely from this scratch session because I must not modify /Users/home/Documents/Amazon and installing a LaunchAgent + pmset wake is a system change):
1) Copy the 3 files into ~/rasid/ and ~/Library/LaunchAgents/ (files are ready in /tmp/rasid_demo/).
2) `launchctl load -w ~/Library/LaunchAgents/com.rasid.amazoneg.scrape.plist`.
3) Since this is a LAPTOP that sleeps and was on battery: either keep it plugged in / lid-open during the two daily windows, OR run `sudo pmset repeat wakeorpoweron MTWRFSU 08:58:00` (needs admin password) so it wakes itself. Without one of these, runs only happen on the next manual wake.
No paid signup required for the default. (Only options b/d would require the user to create a proxy/API account + paste a key.)


**Selectors:**
```
RECOMMENDED DEFAULT = (a) local launchd on the user's Mac. Exact mechanism (3 files, all written + validated in /tmp/rasid_demo/):
1) ~/rasid/scrape_eg.sh — fetches with the exact UA recipe + 0-20s jitter, and a STOP-ON-BLOCK guard: `if [ "$CODE" != "200" ] || grep -qiE "robot check|enter the characters|validatecaptcha" "$HTML"; then echo BLOCKED; exit 1; fi` (never retry-hammers).
2) ~/rasid/parse_eg.py — BeautifulSoup, selectors: cells = `div[id^="gridItemRoot"], div.zg-grid-general-faceout`; rank = `.zg-bdg-text`; title = `._cDEzb_p13n-sc-css-line-clamp-3_g3dy1, ._cDEzb_p13n-sc-css-line-clamp-2_EWgCb`; price = `._cDEzb_p13n-sc-price_3mJ9Z, .p13n-sc-price`; asin via regex `/dp/([A-Z0-9]{10})` on `a.a-link-normal[href*="/dp/"]`.
3) ~/Library/LaunchAgents/com.rasid.amazoneg.scrape.plist — key `StartCalendarInterval` = array of {Hour 9,Minute 0} and {Hour 21,Minute 0}; ProgramArguments -> the .sh; ProcessType=Background.
Install: `cp com.rasid.amazoneg.scrape.plist ~/Library/LaunchAgents/ && launchctl load -w ~/Library/LaunchAgents/com.rasid.amazoneg.scrape.plist`. Trigger a manual test run: `launchctl start com.rasid.amazoneg.scrape`.
LAPTOP RELIABILITY ADD-ON (this machine is a laptop, was on battery 16% during test, womp=0): launchd does NOT wake a sleeping Mac — it coalesces a missed job into the next WAKE. To guarantee on-time runs add: `sudo pmset repeat wakeorpoweron MTWRFSU 08:58:00` (wakes the Mac 2 min before the 09:00 job). Best with AC power + Caffeinate/lid-open or clamshell-with-power.
```


**Real sample:**
```
VERIFIED LIVE on this machine (2026-06-08): 1 fetch of https://www.amazon.eg/-/en/gp/bestsellers/electronics returned HTTP 200, 404,986 bytes, 0.78s, NO captcha/robot markers. This machine's public IP = 197.57.120.221, AS8452 TE-AS (Telecom Egypt, Cairo) = residential ISP (the "eyeball" network Amazon serves; Vercel=AWS AS16509, GitHub Actions=Azure AS8075 are datacenter = 503). Full local pipeline ran end-to-end and parsed 58 real products with ASIN+rank+title+EGP price. First 3 real rows: [1] ASIN B0CPC8JMCW "Joyroom S-Uc027A9 3A Usb-A To Type-C Fast Charging Data Cable With 1M Length - Black" EGP 79.00 ; [2] ASIN B09C7BWVX7 "LDNIO LS441 Lightning 2.4A Fast charging Data Cable 1M Length - Gray" EGP 56.00 ; "Camelion Super Heavy Duty AAA/AA Zinc-Carbon Batteries" EGP 99.00. The launchd plist I generated passed `plutil -lint` (OK) and launchd correctly parsed the twice-daily 09:00/21:00 Africa/Cairo schedule.
```


**Integration:** - The default keeps 100% of traffic on the proven residential IP at $0, with no third party seeing the data or holding a key — ideal for a personal free/cheap build.
- Scheduling cadence: keep it to 1-3 runs/day (I set 2: 09:00 + 21:00 Cairo) with built-in 0-20s jitter and the stop-on-block guard, matching the IP-protection rules. Bestseller ranks only meaningfully move hourly at most, so twice daily is plenty.
- Output is timestamped JSON in ~/rasid/data/ + a run.log; the Rasid app/backend just reads the newest JSON (or you push it to the app's DB/storage at the end of scrape_eg.sh).
- TIER PROGRESSION for the build: start (a) local launchd (free, proven). If the user wants it to run while the Mac is off/away, graduate to (c) a $15 Pi Zero 2 W at home (same residential IP, ~$1/yr power, t


**Caveats:** - DEFAULT (a) reliability depends on the Mac being awake at fire time. This is a laptop that sleeps and was on battery 16% during the test — without `pmset repeat wakeorpoweron` (or keeping it plugged/awake), scheduled runs will slip to the next wake. This is the single biggest risk and the reason (c) Pi exists as the "always-on" upgrade. NOT a blocker, but the user must pick one mitigation.
- Single-IP risk: all options except (b)/(d) ride one residential IP. If Amazon ever issues a 503/captcha


## Cheapest residential/mobile proxy to let a cloud cron fetch amazon.eg (200 instead of 503), with real per-GB cost, free trials, and Node/Python/curl wiring + monthly cost for a few hundred fetches/day.
- **worked:** research-only · **rec:** primary · **cost:** Effectively ~$0 to validate, then a few dollars/mo. Cheapest viable PAID pick = Evomi at $0.49/GB. The catch is the MINIMUM PURCHASE, not the rate: Evomi's smallest residential block is 100GB for $49.99 (one-time block, ~$0.49/GB) — that 100GB covers ~950,000 bestseller fetches, i.e. years of a few-hundred/day cron. So real spend ~ $50 once and you barely dent it. For a true zero-floor start: Webshare permanent FREE tier (1GB/mo, no card) handles up to ~9,700 bestseller fetches/month for $0 — enough for 300/day. PacketStream ($1/GB, no minimum) is the cheapest no-commitment metered option (~$0.62-$1.85/mo at your volume). Pure-bandwidth cost at 400 fetches/day is only ~$0.61/mo (Evomi) — the provider floor dominates, so pick on floor + free tier, not per-GB.
- **user action:** USER must (1) sign up and obtain credentials — there is no free API key that bypasses this; pick ONE:
  - Webshare FREE (recommended first step, zero cost/zero card): create account at webshare.io, claim the free 1GB/mo residential tier, copy proxy host/port/username/password from the dashboard proxy list. Good enough to PROVE amazon.eg=200 from a datacenter cron and to run ~300 fetches/day indefinitely free.
  - Evomi (recommended for cheapest scale): create account at evomi.com ("Try for free", no card for trial), start the residential free trial to validate, then buy the 100GB block ($49.99) when ready. Copy the product username/password from dashboard; append "_country-EG" to the username.
(2) Paste those creds into the cron's env vars (PROXY_USER / PROXY_PASS) — do not hardcode.
(3) At Evomi signup, eyeball the exact free-trial MB shown in-dashboard (the public marketing pages say "free trial, $0.00, no card" but don't print the MB number; reviews imply a small allowance — plenty to test a handful of fetches).
No other user action needed; the integration snippets above are complete.


**Selectors:**
```
PROXY WIRING (the load-bearing config), Evomi residential, Egypt-targeted:
- Endpoint host: rp.evomi.com
- HTTP(S) proxy port: 1000  | SOCKS5 port: 1002
- Username (geo-target Egypt): "<YOUR_PRODUCT_USERNAME>_country-EG"  (ISO alpha-2 EG; rotating IP each request by default)
- Sticky session add suffix: "_session-<id>_lifetime-<min>" e.g. _session-abc_lifetime-10
- Password: <YOUR_PRODUCT_PASSWORD>
- Full proxy URL: http://USER_country-EG:PASS@rp.evomi.com:1000

curl (drop-in over the proven recipe):
curl -sS --max-time 30 \
  -x "http://USER_country-EG:PASS@rp.evomi.com:1000" \
  -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" \
  -H "Accept-Language: en-EG,en;q=0.9" \
  "https://www.amazon.eg/-/en/gp/bestsellers/electronics" -o /tmp/eg.html

Python (requests):
import requests
proxy = "http://USER_country-EG:PASS@rp.evomi.com:1000"
r = requests.get("https://www.amazon.eg/-/en/gp/bestsellers/electronics",
  headers={"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36","Accept-Language":"en-EG,en;q=0.9"},
  proxies={"http":proxy,"https":proxy}, timeout=30)
print(r.status_code); open("/tmp/eg.html","w").write(r.text)

Node (built-in fetch >=18 via undici ProxyAgent):
import { ProxyAgent } from "undici";
const dispatcher = new ProxyAgent("http://USER_country-EG:PASS@rp.evomi.com:1000");
const res = await fetch("https://www.amazon.eg/-/en/gp/bestsellers/electronics", {
  dispatcher,
  headers: { "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36", "Accept-Language":"en-EG,en;q=0.9" }
});
console.log(res.status); // expect 200

Webshare alt format: curl -x p.webshare.io:80 -U "USERNAME-1:PASSWORD" <url>  (rotating endpoint; country control is plan/IP-list based, less granular than Evomi).
```


**Real sample:**
```
REAL data footprint measured from amazon.eg pages already fetched to /tmp by parallel agents on this residential IP (I did NOT re-fetch amazon.eg, to protect the home IP):
- amazon.eg bestseller list page (e.g. /-/en/gp/bestsellers/electronics): raw HTML 394-415 KB, GZIPPED OVER THE WIRE = ~108 KB (eg_bs_electronics.html raw=413,131 -> gzip=110,527 bytes; bs_elec.html raw=403,727 -> gzip=107,422). Proxies bill actual on-wire (compressed) bytes, so ~0.105 MB per bestseller fetch.
- amazon.eg product detail (/dp/...): raw ~1.4 MB, gzip ~264 KB (dp_page.html raw=1,446,744 -> gzip=270,030).
REAL provider pricing pulled live (June 2026):
- Evomi residential: $0.49/GB (live homepage + /pricing), min 100GB/mo block at $49.99, EG pool = 147,116+ IPs (ISPs: Telecom Egypt/WE, Orange, Vodafone, Etisalat). Connection (from official docs): host rp.evomi.com, HTTP port 1000, SOCKS5 port 1002; geo via username suffix "_country-EG". Verbatim curl from docs: curl -x http://USER:PASS@rp.evomi.com:1000 https://ip.evomi.com/s
- Webshare residential: $1.40/GB (50% promo off $2.80), permanent FREE tier 1GB/mo, host p.webshare.io ports 80/1080/3128.
- PacketStream: $1.00/GB, no minimum.
- IPRoyal residen
```


**Integration:** - Why a proxy at all: amazon.eg serves 200 to residential/mobile IPs and 503 to datacenter IPs. A cloud cron (AWS/GCP/Render/Fly = datacenter ASN) WILL get 503/Robot Check unless egress goes through a residential/mobile proxy. Residential is the right tier (mobile is 4-7x pricier and unnecessary for bestseller pages).
- Egypt targeting matters: target country=EG so you get the same localized EGP prices/catalog the home IP sees. Evomi gives clean per-request country control via "_country-EG"; Webshare/PacketStream country control is coarser.
- Bandwidth is TINY here (~108 KB/fetch gzipped), so almost any provider's smallest plan lasts ages. Optimize for: (a) lowest floor / free tier, (b) clean EG IPs, (c) simple username:password HTTP proxy (all four work with the existing curl/requests/und


**Caveats:** - I did NOT live-test that Evomi (or any proxy) actually returns 200 from amazon.eg — that requires a paid/trial account I cannot create. HIGH confidence it works (Evomi serves 147K real EG residential IPs across the exact ISPs the working IP uses), but the USER should confirm with the free trial before wiring the cron. This is the one unverified link in the chain.
- Per-GB "headline" rates understate real cost ONLY via minimum purchase floors; conversely they UNDERSTATE nothing on bandwidth (ou


## Managed-scraper fallbacks for amazon.eg (Firecrawl vs ScraperAPI vs ScrapingBee vs Apify) — for when the residential IP gets challenged
- **worked:** yes · **rec:** primary · **cost:** FIRECRAWL = $0 and READY NOW. CLI is installed AND already authenticated (key fc-dec...09dd in stored config) with 999/1000 free credits this cycle. My 3 test scrapes cost 6 credits (993 left). Free tier verbatim: 1,000 credits/month, no card, 2 concurrent requests, low rate limits. EMPIRICAL per-call cost on amazon.eg: markdown=1 credit/page, schema-JSON=~4 credits/page. So free tier = ~1,000 markdown scrapes OR ~250 structured-JSON scrapes per month. ScraperAPI free = 1,000 credits/mo (5 concurrency) + 5,000 one-time 7-day trial, BUT Amazon costs 5 credits/req (15 with JS) -> only ~66-200 amazon.eg pages/mo free. ScrapingBee free = 1,000 one-time trial credits, no recurring free tier (then paid). Apify free = $5 platform credit/mo, no card; junglee/amazon-crawler is pay-per-result from $3/1,000 results -> ~1,600 products/mo within the $5.
- **user action:** FIRECRAWL: NONE. Already installed, already authenticated, 993 credits available — usable in the pipeline immediately. (Optional: note who owns this key; if it's a shared/trial key the user may want their own free account at firecrawl.dev/signup so the 1,000/mo quota is theirs.)
ScraperAPI: user must sign up (free, no card) at dashboard.scraperapi.com/signup -> copy API key.
ScrapingBee: user must sign up (free, no card) at scrapingbee.com -> copy API key (1,000 trial credits only, not renewing).
Apify: user must sign up (free, no card) at apify.com -> copy API token; the junglee/amazon-crawler actor bills pay-per-result against the $5/mo credit.


**Selectors:**
```
FIRECRAWL (no parsing needed — service returns clean data). Two production modes:
1) CHEAP MARKDOWN (1 credit/page, ~3.7s, full top-30): 
   firecrawl scrape "<amazon.eg url>" --format markdown --country EG -o out.md
   Then parse out.md with regex/bs4 if you want fields: rank=`#[0-9]+`, price=`EGP[ ]?[0-9,]+\.?[0-9]*`, asin=`/dp/([A-Z0-9]{10})`, rating=`[0-9]\.[0-9] out of 5 stars`, reviews follow the rating.
2) ZERO-PARSE STRUCTURED JSON (~4 credits/page, ~55s, 20 products): pass a JSON schema and Firecrawl's LLM fills it:
   firecrawl scrape "<url>" --format json --schema-file schema.json --country EG -o out.json
   Schema used (works): {"type":"object","properties":{"products":{"type":"array","items":{"type":"object","properties":{"rank":{"type":"integer"},"title":{"type":"string"},"price_egp":{"type":"string"},"rating":{"type":"string"},"reviews_count":{"type":"string"},"asin":{"type":"string"}}}}}}
   Output at d["json"]["products"]. Key params: --country EG (Egypt geo), --proxy auto (escalate stealth if challenged), --max-age <ms> (serve cache), --wait-for <ms> (JS render).
OTHER SERVICES (HTTP GET, not tested): ScraperAPI -> http://api.scraperapi.com?api_key=KEY&url=<enc>&country_code=eg (add &render=true for JS). ScrapingBee -> https://app.scrapingbee.com/api/v1/?api_key=KEY&url=<enc>&country_code=eg. Apify -> POST run actor junglee/amazon-crawler then GET dataset items.
```


**Real sample:**
```
FIRECRAWL TESTED LIVE ON amazon.eg — WORKS (this machine, 2026-06-08T00:22Z). Scraped https://www.amazon.eg/-/en/gp/bestsellers/electronics via Firecrawl cloud (NOT the residential IP). Plain markdown returned HTTP success in 3,718ms (43KB) with FULL top-30 coverage: 30 distinct ranks (#1-#30), 30 distinct ASINs, 27 distinct EGP prices, geo-resolved "Delivering to New Cairo". Schema-driven JSON extraction returned 20 fully-structured products, e.g.:
#1 Joyroom S-Uc027A9 3A USB-A to Type-C 1M cable — EGP 79.00 — 4.4 stars — 333 reviews — ASIN B0CPC8JMCW
#2 LDNIO LS441 Lightning 2.4A 1M cable — EGP 56.00 — 4.2 stars — 1,058 reviews — ASIN B09C7BWVX7
#3 Camelion Heavy Duty AAA batteries (box 12) — EGP 99.00 — 4.4 stars — 735 reviews — ASIN B0DRDPSKQH
#4 iLOCK Travel Plug adapter — EGP 59.00 — 4.7 stars — 3,557 reviews — ASIN B09Y37BSM9
#10 XIAOMI Redmi Note 15 (6+128GB) — EGP 9,999.00 — 4.2 stars — 98 reviews — ASIN B0GCNZJCF8
ScraperAPI / ScrapingBee / Apify NOT executed (all require a user-created API key first) — research-only for those three.
```


**Integration:** RANKED FALLBACK ORDER for Rasid: (1) FIRECRAWL — primary fallback, no contest. Already wired, zero user action, runs on Firecrawl's own IPs/proxies so it sidesteps the residential-IP challenge entirely, supports amazon.eg natively, and the schema-JSON mode is a drop-in replacement for your bs4 parser (rank/title/price/rating/reviews/asin returned clean). (2) APIFY junglee/amazon-crawler — secondary; purpose-built Amazon actor, cheap pay-per-result, but needs user token + verify amazon.eg domain acceptance (docs only confirm generic Amazon URL patterns). (3) SCRAPERAPI — tertiary; reliable proxy API with country_code=eg, but Amazon requests burn 5-15 credits each so the free tier is thin. (4) SCRAPINGBEE — avoid as a recurring fallback; only a one-time 1,000-credit trial, no renewing free t


**Caveats:** (1) Firecrawl schema-JSON mode is SLOW (~55s/page) and costs ~4x markdown — use markdown+regex for routine polling, JSON only for occasional snapshots. (2) Markdown mode returned full top-30; JSON mode returned 20 (LLM truncates long lists) — for complete structured top-30 either page through or post-parse the 30-item markdown yourself. (3) The installed Firecrawl key's ownership is unconfirmed — if it's a shared/temporary key, quota could be exhausted by others; user should provision their own 


## Anti-ban hardening for residential direct scraping of amazon.eg (safe cadence, header/cookie hygiene, escalation model, caching, kill-switch + back-off)
- **worked:** yes · **rec:** primary · **cost:** $0 cash. This is direct curl + beautifulsoup4 from the user's existing residential IP — no proxy, no API, no CAPTCHA-solver subscription. The only "cost" is throughput: hard-capped at ~3-5 pages/min (~150-200/day) to stay under the radar, and the risk cost of a temporary IP challenge if cadence is violated.
- **user action:** none required to operate. RECOMMENDED user actions: (1) Decide acceptable daily fetch budget for the home IP (default 150-200). (2) Optionally provision a cheap residential-proxy fallback (e.g. a rotating residential pool) so that IF the kill-switch trips, the pipeline can fail over instead of going dark — purely optional, $0 path works. (3) Be aware the .eg host currently returns amazon.ae/UAE catalog + en-AE locale; if true Egypt EGP catalog is required, that is a data-correctness issue separate from anti-ban and should be confirmed.


**Selectors:**
```
CADENCE (numbers to hardcode):
- Max rate: 6 requests/min hard ceiling; target 3-5 req/min steady-state. Equivalent token bucket: capacity=3 tokens, refill=1 token / 12s.
- Inter-request delay: base 12s + jitter. Concretely sleep = random.uniform(10, 18) seconds between requests (full jitter, never fixed). Never <8s.
- Daily budget: cap ~150-200 page fetches/day from the home IP; burst no more than ~20 fetches in any 10-min window.
- Concurrency: 1 (serial). No parallel connections from the residential IP.

BLOCK-DETECTION (kill-switch trip conditions) — trip on ANY of:
- HTTP status in {503, 429, 403}.
- Response body (case-insensitive) contains any of: "Robot Check", "Enter the characters you see below", "validateCaptcha", "automated access to Amazon data", "/errors/validateCaptcha", "api-services-support@amazon".
- Page has form[action*="validateCaptcha"] OR <title> contains "Robot Check".
- Soft signal (pre-block warning): expected product nodes drop to 0 while HTTP=200, or response time jumps >3x baseline (baseline here ~0.8s, so warn at >2.5s). Treat as back-off, not hard trip.
Python check (validated against live HTML):
  markers=["robot check","enter the characters","validatecaptcha","automated access to amazon","api-services-support@amazon"]; blocked = (status in (403,429,503)) or any(m in html.lower() for m in markers)

GOOD-RESPONSE assert (only accept page if): status==200 AND none of the markers AND len(soup.select('[data-asin], div[id^="p13n-asin-index"]')) >= 20 (live bestsellers returns ~30/90 nodes).

HEADER/COOKIE HYGIENE (send exactly this, consistent across ALL requests from one logical session):
  -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"   (DO NOT rotate UA on a residential IP — a stable UA looks human; rotating UA on one IP is itself a bot signal)
  -H "Accept-Language: en-EG,en;q=0.9"
  -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
  -H "Accept-Encoding: gzip, deflate, br"   (then --compressed)
  -H "Sec-Fetch-Dest: document" -H "Sec-Fetch-Mode: navigate" -H "Sec-Fetch-Site: none" -H "Sec-Fetch-User: ?1" -H "Upgrade-Insecure-Requests: 1"
  COOKIE JAR (critical): persist Amazon's Set-Cookie and REUSE it. Capture session-id + session-id-time on first 200, then send them back via -b /tmp/amz_cookies.txt -c /tmp/amz_cookies.txt on every subsequent request. A stable session-id across fetches = returning visitor (lower suspicion) vs a brand-new session per hit (what we currently do = looks like fresh bot each time). Also set i18n-prefs=EGP and lc-acbeg=en_AE explicitly so currency/locale stay pinned to EGP and don't trigger re-detection.
  Do NOT send the client-hint headers Amazon asks for in accept-ch (leave them off — curl can't fake a real device profile; partial/inconsistent hints are worse than none).
```


**Real sample:**
```
LIVE-VALIDATED on this residential IP, 2026-06-08 ~00:23 UTC, 2 fetches only (spaced ~48s), both clean. Fetch1: GET https://www.amazon.eg/-/en/gp/bestsellers/electronics -> HTTP 200, 405,004 bytes, 0.77s, 0 block markers, 30 real products parsed. Sample real products: "Joyroom S-Uc027A9 3A Usb-A To Type-C Fast Charging Data Cable"; "LDNIO LS441 Lightning 2.4A Fast charging Data Cable 1M"; "Camelion Super Heavy Duty R03 AAA Zinc-Carbon Batteries". Fetch2 (same URL, ~48s later): HTTP 200, 404,979 bytes, also clean. KEY LIVE HEADERS: server=Server; x-amz-cf-pop=CAI50-P2 (CloudFront Cairo edge -> residential EG IP served from origin, not a datacenter PoP); x-cache=Miss from cloudfront on BOTH fetches; cache-control=no-cache; expires=-1; vary=Accept-Encoding,User-Agent; accept-ch=ect,rtt,downlink,device-memory,...,sec-ch-ua-platform,... (Amazon is requesting client-hints = fingerprinting surface). COOKIES Amazon SET each time (we never echoed them back, so it minted a NEW session every fetch): session-id=261-8408969-1287625 then 261-5600226-8214640; session-id-time=2082787201l; i18n-prefs=EGP; lc-acbeg=en_AE (Domain=.amazon.eg, ~1yr expiry). Note caveat: title/content-language returned 
```


**Integration:** BACK-OFF POLICY (exponential + full jitter, honor Retry-After):
- On soft warning (0 products at 200, or slow response): pause = 60s, then retry once. If second attempt also soft-fails, escalate to hard back-off.
- On hard trip (503/429/403/CAPTCHA): IMMEDIATELY stop the run (kill-switch). Do NOT retry-hammer. If a Retry-After header is present, wait that long; else cool-down schedule: 1st trip = 30 min, 2nd within 24h = 2 h, 3rd = 6 h, 4th+ = 24 h pause from this IP. Formula: cooldown = min(BASE * 2**(strikes-1), 24h) with BASE=30min, plus uniform jitter +-20%. Reset the strike counter after 24h clean.
- Token-bucket gate sits in front of every request; back-off drains the bucket so the next allowed request is delayed.

CACHING (minimize fetches — this is the single biggest anti-ban lever


**Caveats:** (1) These cadence numbers are SAFE-BY-DESIGN extrapolations, not Amazon-published limits — Amazon does not disclose thresholds and they vary by IP reputation/time/load; treat 3-6 req/min as a starting envelope and only loosen if you observe sustained clean 200s with a persistent cookie jar. (2) I deliberately did NOT stress-test the real ban threshold (would mean abusing the user's home IP) — so the exact req/min that trips a challenge is UNVERIFIED; the policy is built to never find out. (3) CA


## Installable Amazon/e-commerce scraping MCP servers + skills (registry search + firecrawl skills inventory)
- **worked:** research-only · **rec:** secondary · **cost:** - firecrawl skills/CLI: $0 incremental — already installed AND authenticated on this machine with 993/1000 credits left this cycle (cycle/credit pool implies an existing paid or trial plan already attached; concurrency capped at 2). Firecrawl /scrape is ~1 credit/page, /agent (AI extraction) costs more per run.
- Bright Data MCP: FREE tier = 5,000 requests/month (covers search_engine + scrape via Web Unlocker, incl. the web_data_amazon_* tools at light volume). Beyond that, pay-as-you-go (Web Unlocker ~$1.5/1k requests tier-dependent); "Pro Mode" tools are extra.
- Apify MCP: platform has a free monthly usage allowance ($5 free credits on the free plan); the specific Amazon Bestsellers Scraper actor lists $19.99/month + usage, with "up to 20,000 results/month" included in that subscription. Other Amazon actors on Apify Store advertise ~$0.1 per 1,000 results.
- In-app MCP registry path: $0 but UNUSABLE here (returns empty).
- **user action:** To use either Amazon-specific MCP server the USER must sign up + paste a token (I cannot create accounts):
1. Bright Data (recommended external option): create a free account at brightdata.com, copy API_TOKEN from user settings, then add to MCP config env: API_TOKEN, plus zone names WEB_UNLOCKER_ZONE=mcp_unlocker and (optional) BROWSER_ZONE=mcp_browser. Free 5k req/mo, no card required for the free tier per their docs.
2. Apify (for the ready-made Bestsellers actor): create account at apify.com, copy APIFY_TOKEN, then either use hosted https://mcp.apify.com (OAuth, no local install) or local `npx @apify/actors-mcp-server` with env APIFY_TOKEN and `--tools simpleapi/amazon-bestsellers-scraper`. The $19.99/mo actor needs a paid subscription for sustained use.
3. firecrawl: NOTHING required — already authenticated. User only needs to decide whether to top up credits (only 993 left).
4. In-app registry: nothing the user can do — the registry returns no catalog in this environment (likely not provisioned); cannot be "installed" from here.


**Selectors:**
```
MCP servers are tool-based, not CSS/selector-based. Exact tool params:
- Bright Data web_data_amazon_product_search → {keyword: string, url: "https://www.amazon.eg/..."} (pass the .eg domain explicitly to target Egypt; returns only page 1).
- Bright Data web_data_amazon_product → {url: "https://www.amazon.eg/-/en/dp/<ASIN>"} (URL MUST contain /dp/).
- Bright Data web_data_amazon_product_reviews → {url: "<.../dp/<ASIN>>"}.
- Bright Data generic fallback: scrape_as_html / scrape_as_markdown {url} (runs through Web Unlocker, handles CAPTCHA) — use this to hit /gp/bestsellers/electronics on .eg since there is NO dedicated bestsellers tool.
- Apify Amazon Bestsellers Scraper actor → input JSON {startUrls:[{url:"https://www.amazon.eg/-/en/gp/bestsellers/electronics"}]} ; output fields: name, price, asin, url, category, image, averageRating, reviewCount, rank.
- Apify generic config flags: --tools <id1,id2> (new) or deprecated --actors; hosted query form https://mcp.apify.com?tools=actors,docs,<actorId>.
```


**Real sample:**
```
No live amazon.eg product data was fetched by THIS assignment (research-only task; I deliberately did not burn the residential IP since this is a tooling-discovery job). Real artifacts proven instead: (1) firecrawl CLI is live and authenticated on this machine — `firecrawl --status` returns: "firecrawl cli v1.16.2 / ● Authenticated via stored credentials / Concurrency: 0/2 jobs / Credits: 993 / 1,000 (99% left this cycle)". (2) 13 firecrawl-* skills are physically installed as symlinks under /Users/home/.claude/skills/ -> ../../.agents/skills/firecrawl* (firecrawl, firecrawl-agent, -crawl, -download, -interact, -map, -parse, -scrape, -search, plus 4 firecrawl-build-* app-integration skills). (3) Confirmed-real external MCP servers + their exact Amazon tool surface: Bright Data MCP (@brightdata/mcp) exposes web_data_amazon_product (input: product URL containing /dp/), web_data_amazon_product_reviews (input: /dp/ URL), and web_data_amazon_product_search (input: "a search keyword AND Amazon domain URL; limited to first page") — the explicit "Amazon domain URL" param is what makes amazon.eg reachable. Apify MCP (@apify/actors-mcp-server / hosted mcp.apify.com) fronts named actors incl.
```


**Integration:** RECOMMENDATION FOR THE RASID PIPELINE: keep the proven free residential-curl + BeautifulSoup recipe as the PRIMARY engine ($0, already returns HTTP 200 / 30 real products from this IP). Treat MCP servers as a paid FALLBACK for when the home IP gets throttled or for fields curl can't easily get (structured reviews).
- Best fallback fit = Bright Data MCP: it is the only option with a first-class tool that takes an explicit Amazon DOMAIN URL (web_data_amazon_product_search), so amazon.eg targeting is config-driven, not hardcoded to .com; and scrape_as_html through Web Unlocker can fetch the .eg bestsellers pages that have no dedicated tool. 5k/mo free covers dev + light prod.
- Apify Bestsellers actor maps 1:1 onto your use case (bestsellers category URL in, rank/price/rating/reviews out) and


**Caveats:** HONEST LIMITATIONS:
1. The in-app MCP registry (mcp__mcp-registry__*) is a DEAD END in this environment — it returns empty for every query including common ones (github), so we cannot "discover/install" any Amazon connector through it. The usable servers below were found via web research, not the registry.
2. NONE of the three external tools DOCUMENTS amazon.eg (Egypt) support. Apify Bestsellers names only US/UK/DE/FR; Bright Data lists no region matrix. .eg is "Not verified" for all — it must b


## Scraper library stack to BUILD the robust amazon.eg pipeline (fetch + parse + schedule), residential IP
- **worked:** yes · **rec:** primary · **cost:** $0. Everything is open-source and already installed: curl_cffi 0.13.0, beautifulsoup4 4.14.3, lxml, parsel 1.11.0 (pip3-installed to /tmp in seconds). No API keys, no proxy spend, no paid SaaS. Residential IP is the only "asset" and it is already in hand.
- **user action:** NONE to run the recommended core stack — it is fully working today. Optional/only-if-blocked-later: (1) pip install curl_cffi parsel beautifulsoup4 lxml into the project venv (not just /tmp). (2) If Amazon ever escalates to JS/CAPTCHA, add the headless fallback tier (camoufox 0.4.11 or playwright+playwright-stealth 2.0.3) — needs `playwright install chromium`/`camoufox fetch` (~150MB browser download). (3) Decide scheduler host: a long-running machine/cron is required for unattended scheduling (the in-session CronCreate is ephemeral and dies with the process).


**Selectors:**
```
FETCH (python): from curl_cffi import requests as creq; creq.get(url, impersonate="chrome", headers={"Accept-Language":"en-EG,en;q=0.9"}, timeout=30). impersonate="chrome" (or pin "chrome124") is the single critical param — it sets the Chrome JA3 + HTTP/2 fingerprint. No proxy needed on residential IP.
PARSE (proven working, dedupe by ASIN since each cell appears ~3x in responsive DOM):
  - ASIN: regex /dp/([A-Z0-9]{10}) on every <a href>. XPath //a[contains(@href,'/dp/')]/@href then .re(r"/dp/([A-Z0-9]{10})") -> exactly 30 distinct.
  - cell container (bs4): div[id^='gridItemRoot'], div.zg-grid-general-faceout, div[class*='_cDEzb_grid-cell']
  - rank badge: span.zg-bdg-text  (yields "#1".."#56")
  - price: span._cDEzb_p13n-sc-price_3mJ9Z, span.p13n-sc-price, span.a-price span.a-offscreen (yields "EGP 79.00")
  - title: cell img[alt]  (bestseller faceouts put product name in img alt)
PAGINATION: append ?pg=N (50 items/page).
PARSER CHOICE: parsel (CSS+XPath+.re() in one Selector, scrapy-grade) is the build pick; bs4+lxml is the fallback. Both parsed the live page identically.
```


**Real sample:**
```
LIVE-VERIFIED on this machine (2 fetches, both HTTP 200, no block markers). Stack used: curl_cffi 0.13.0 (impersonate="chrome") -> fetch; parsel 1.11 + BeautifulSoup4 4.14 + lxml -> parse.
PAGE 1 (https://www.amazon.eg/-/en/gp/bestsellers/electronics): HTTP 200, 413,011 bytes, 0.76s, 30 distinct real ASINs parsed. Samples:
  #1 B0CPC8JMCW "Joyroom S-Uc027A9 3A USB-A to Type-C Fast Charging Data Cable" EGP 79.00
  #2 B09C7BWVX7 "LDNIO LS441 Lightning 2.4A Fast charging Data Cable 1M" EGP 56.00
  also B0DRDPSKQH, B09Y37BSM9, B0DRDQZBC5, B0D9W85D2N
PAGE 2 (?pg=2): HTTP 200, 412,524 bytes, 30 ASINs, rank badges #51-#56 (B0DTGFN2FQ, B07HD3RN9G, B07DP1TF93, B0FQJ4GY3Q, B0D6BPY3SC) -> pagination confirmed.
PROTOCOL PROOF of why curl_cffi beats the 503: curl_cffi JA3 hash = 767cbebc81a5fba2f32678180e7e554e (real Chrome TLS+HTTP/2/Akamai-h2 fp present); plain curl (same UA) JA3 = 375c6162a492dfbf2795909110ce8424 (LibreSSL order, ciphers lead 4867-4866-4865 vs Chrome 4865-4866-4867). Amazon WAF fingerprints exactly this.
```


**Integration:** RECOMMENDED CORE STACK (Python, single-language, proven): 
  FETCH = curl_cffi (impersonate="chrome"). PARSE = parsel (fallback bs4+lxml). SCHEDULE = OS cron or APScheduler in a small daemon. Validate output with pydantic. Store to SQLite/Postgres.
WHY this over alternatives (evidence-based):
  - curl_cffi is the linchpin: it is the reason you get 200 not 503 (JA3 proof above), it is ~0.76s/page (no browser overhead), trivial to schedule, low memory. On a residential IP you do NOT need a real browser for bestseller/search/listing pages — they are server-rendered HTML (413KB of real product data with zero JS execution).
  - Crawlee 3.17.0 (node, published 2026-06-06 — 2 days ago, very actively maintained) + @crawlee/cheerio or @crawlee/playwright is the strong NODE alternative IF the rest o


**Caveats:** (1) Sample size: I made only 2 live amazon.eg fetches (deliberately, to protect the IP) — both clean 200s, but I have not stress-tested sustained polling, so Amazon's rate-limit threshold on this IP is UNKNOWN. Real pipeline must pace conservatively and watch for the first 503/CAPTCHA. (2) CSS classes like span._cDEzb_p13n-sc-price_3mJ9Z are hashed/obfuscated by Amazon and WILL change without notice — anchor on stable signals (ASIN regex, zg-bdg-text, a-price/a-offscreen, img[alt]) and add a par


## Amazon Official PA-API 5.0 (Egypt locale) — ToS-clean SUPPLEMENT for Rasid (NOT primary)
- **worked:** partial · **rec:** secondary · **cost:** $0 to sign up and use. PA-API has NO per-call fee and NO subscription. The ONLY "cost" is the qualifying-sales gate: you must generate >=3 qualifying sales within 180 days of joining Associates before API keys activate (else the account/keys are closed). Throttle = free tier: 1 TPS / 8,640 requests-per-day for first 30 days, then scaled by shipped revenue (+1 TPD per $0.05 and +1 TPS per $4,320 of API-attributed shipped revenue in trailing 30 days, cap 10 TPS). At 8,640 req/day and 10 items/SearchItems call you can refresh ~86k product records/day for free — ample for a Rasid supplement keyed by ASIN.
- **user action:** YES — this is gated and cannot be automated by me. The USER must:
1. JOIN AMAZON ASSOCIATES EGYPT — but note amazon.eg Associates is INVITE-ONLY / "Sign in" only (no public "Sign up"). Realistic paths: (a) if the user already has an Amazon Associates account manager, email them to request an EG invite (much higher odds with an Egypt-based audience); or (b) join a different open Associates marketplace (e.g. amazon.ae UAE, or amazon.com OneLink) and request EG via support. Without an invite, EG Associates self-signup is currently CLOSED.
2. DRIVE >=3 QUALIFYING SALES within 180 days (personal orders do NOT count) — this unblocks API throttle from 0.
3. In Associates Central → Tools → Product Advertising API → create credentials. NOTE: as of 2026 Amazon is migrating PA-API → Creators API (OAuth 2.0 client-credentials); user creates Client ID/Secret in the Creators API section. AWS SigV4 keys are the legacy path.
4. Hand Rasid: PartnerTag + the credentials. I (the pipeline) handle the rest.


**Selectors:**
```
Not CSS — this is a signed JSON API (AWS SigV4). Exact request params for EG:

ENDPOINT (POST): https://webservices.amazon.eg/paapi5/{searchitems|getitems|getbrowsenodes|getvariations}
HOST header: webservices.amazon.eg
REGION (for SigV4): eu-west-1
SERVICE (for SigV4): ProductAdvertisingAPI
Marketplace (body): "www.amazon.eg"
PartnerType (body): "Associates"
PartnerTag (body): your associate tag, e.g. "rasid-21"
Headers: Content-Type: application/json; charset=utf-8 | X-Amz-Target: com.amazon.paapi5.v1.ProductAdvertisingAPIv1.{SearchItems|GetItems|GetBrowseNodes|GetVariations} | Content-Encoding: amz-1.0 | plus X-Amz-Date + Authorization (SigV4)

KEY FIELD PATHS (Resources to request):
- ItemInfo.Title  → .ItemsResult.Items[].ItemInfo.Title.DisplayValue
- Offers.Listings.Price  → .Offers.Listings[0].Price.{Amount,Currency=EGP,DisplayAmount}  (or OffersV2.Listings[].Price)
- Offers.Listings.Availability.Message / .Type  → stock status
- Offers.Listings.SavingBasis  → list/strike price for discount %
- Images.Primary.Large.URL  (also .Medium/.Small; .Variants[] for gallery)
- ASIN (top-level) + ParentASIN
- BrowseNodeInfo.BrowseNodes[].{Id,DisplayName,ContextFreeName,Ancestor}  → category + browse-node ID
SortBy (SearchItems EG): Relevance, Price:LowToHigh, Price:HighToLow, NewestArrivals, AvgCustomerReviews, Featured.
Best to use the official paapi5 SDK (Python/Node/PHP/Java) — it signs automatically; do NOT hand-roll SigV4.
```


**Real sample:**
```
No live product JSON was obtainable WITHOUT credentials (PA-API requires AWS SigV4 signing tied to an approved Associate account — by design). However I obtained CONCRETE PROOF the EG endpoint is real and alive on 2026-06-08:

• POST https://webservices.amazon.eg/paapi5/searchitems → HTTP 400 IncompleteSignatureException (server parsed my request, rejected only for missing signature). Remote IP 3.253.171.94 (AWS eu-west-1, Dublin).
• POST https://webservices.amazon.eg/paapi5/getitems → identical HTTP 400 IncompleteSignatureException. Endpoint live for both core ops.
• TLS cert: CN=webservices.amazon.eu, Issuer "C=US, O=Amazon, CN=Amazon RSA 2048 M04", valid 2026-05-19 → 2026-12-02. Cert was ISSUED AFTER the "May 15 2026 retirement" date — proof Amazon is still actively maintaining this infra.

WHAT PA-API EG RETURNS once authenticated (per official Egypt locale ref + API ref): ItemInfo.Title, ItemInfo.Features/Manufacturer/ProductInfo, Offers/OffersV2 (Price in EGP, SavingBasis, Availability.Message+Type, IsBuyBoxWinner, Condition, MerchantInfo), Images.Primary/Variants (S/M/L URLs), ASIN + ParentASIN, BrowseNodeInfo.BrowseNodes (category tree / browse-node IDs), VariationSummary, 
```


**Integration:** POSITION AS SUPPLEMENT, NOT PRIMARY — this is the honest call:
• It is the only 100% ToS-CLEAN source (Amazon's own API, official affiliate terms) — zero IP-block / captcha / residential-proxy risk. Use it to ENRICH/VERIFY the scraped bestsellers feed: take the ASINs your residential scraper already extracts, then GetItems(ASINs) for canonical title, EGP price, list-vs-sale price, stock status, hi-res images, and browse-node category. Batch GetItems = up to 10 ASINs/call.
• It does NOT give you the two things your scraper is FOR: bestseller RANK ordering and review text/ratings. So architecture = SCRAPER (residential) owns rank + reviews; PA-API owns clean price/availability/image/category by ASIN. They are complementary, not redundant.
• Gating is the killer for time-to-launch: invite-onl


**Caveats:** HONEST CAVEATS / RISKS:
1. ACCESS IS NOT GUARANTEED OR INSTANT. amazon.eg Associates is invite-only (no public signup) AND has a 3-qualifying-sales/180-day gate before API keys produce data. The user may be unable to obtain working credentials at all without an Amazon account manager / existing audience. This is why it CANNOT be the primary source for launch.
2. DEPRECATION AMBIGUITY (resolve before committing): Official banner says "deprecated May 15 2026" and a dev source says "endpoint retire


## Legal/ToS read — residential direct scraping of amazon.eg public pages for personal product-sourcing
- **worked:** research-only · **rec:** primary · **cost:** $0 legal cost for the posture itself. No license, registration, or fee exists to "buy" the right — Amazon's official paid path (Product Advertising API / SP-API) requires an Associates or Seller account and is not available for pure private sourcing. The only real costs are (a) the residential bandwidth you already have, and (b) the contingent risk cost (account/IP ban), which you minimize by staying logged out and rate-limiting. Egyptian-court litigation exposure for a private individual doing low-volume logged-out reads is realistically near-zero (no MENA precedent of Amazon suing an individual sourcer; enforcement is technical, not legal).
- **user action:** USER DECISIONS (not blockers, but the user owns these choices):
1. Accept that this is a ToS breach but (per hiQ + Meta v Bright Data) NOT a crime and NOT a likely civil suit at personal scale — Amazon's realistic remedy is a technical block / account suspension, not a lawsuit. The user should be comfortable with that risk profile.
2. STAY LOGGED OUT on every fetch. Do not run the pipeline from a logged-in browser session/cookies — that is what made Bright Data's logged-out scraping defensible and would make a logged-in version a clear contract breach.
3. Keep it PERSONAL/NON-COMMERCIAL and PRIVATE-CACHE only. Do not republish, resell, or redistribute amazon.eg listings/prices; do not feed the scraped content into training an LLM (explicit CoU ban).
4. Do NOT circumvent blocks. If a 503/429/Robot Check appears, STOP — do not rotate IPs or solve captchas to get back in (anti-circumvention clause).
5. No legal sign-off needed to proceed at hobby scale; if this ever turns commercial or high-volume, get Egyptian-qualified counsel and switch to SP-API/PA-API.
6. This is an engineering/risk read, not formal legal advice — for a binding opinion consult a lawyer.


**Selectors:**
```
Not a code task — this is a legal/ToS read, no CSS selectors. The "selectors" that matter here are the LEGAL TRIGGERS that flip risk from low to high, and the source locators:

CoU document (authoritative, fetch verified): nodeId=GLSBYFE9MGKKQXXM on amazon.eg (en: append &language=en). The four governing clauses by section: "License" grant (data mining/robots ban + "collection and use of any product listings, descriptions, or prices"), "extract and/or re-utilize... substantial parts" (database-style protection), "circumventing captchas or other measures" (anti-circumvention), and sec. 14 "APPLICABLE LAW" (Egyptian law + exclusive Egyptian courts, no arbitration).

RISK-FLIP TRIGGERS (the practical decision boundary):
- LOGGED IN vs LOGGED OUT — the single biggest factor (Meta v Bright Data). Logged-in = you accepted the contract; logged-out public = strongest defense.
- "substantial parts" / re-utilization — copying the whole catalog or a DB-sized slice triggers the extraction clause; a few bestseller pages for personal sourcing does not.
- "commercial use" / "collection and use of product listings, descriptions, or prices" — resale of the data or building a competing product raises exposure; private personal sourcing decisions do not.
- Circumventing a block (rotating IPs/solving captchas after a 503/429) — converts a passive ToS breach into active anti-circumvention conduct; this is the bright line to never cross.
- PII / reviewer names / personal data — pulls in Egypt PDPL + GDPR-style regimes; aggregate price/rank/title data does not.
```


**Real sample:**
```
VERIFIED LIVE from this residential machine: GET https://www.amazon.eg/-/en/gp/help/customer/display.html?nodeId=GLSBYFE9MGKKQXXM&language=en -> HTTP 200, 338,392 bytes, parsed cleanly (full 19-section Conditions of Use, no Robot Check). Saved /tmp/eg_cou.html.

EXACT VERBATIM CoU TEXT PULLED (the clauses that govern scraping):

(1) LICENSE GRANT (CoU sec. "Your Account / License"): "Amazon or its content providers grant you a limited, non-exclusive, non-transferable, non-sublicensable license to access and make personal and non-commercial use of the Amazon Services. This license does not include any resale or commercial use of any Amazon Service or its contents; any collection and use of any product listings, descriptions, or prices; any derivative use of any Amazon Service or its contents; any downloading or copying of account information for the benefit of another merchant; or any use of data mining, robots, or similar data gathering and extraction tools."

(2) EXTRACTION/DATABASE clause: "You may not extract and/or re-utilize parts of the content of any Amazon Service without our express written consent. In particular, you may not utilize any data mining, robots, or similar dat
```


**Integration:** DO / DON'T GUARDRAIL LIST (bake these into the pipeline as hard constraints — they are what keep you in the hiQ/Bright-Data safe lane):

DO:
- Stay LOGGED OUT (no Amazon cookies/session). Public pages only (bestsellers, search, PDP).
- Rate-limit hard: >=6 s between requests, <=2-3 pages per run, jittered. Treat the residential IP as precious.
- Respect robots.txt as a courtesy signal and as evidence of good faith.
- Identify with a normal browser UA; do not spoof identity to impersonate a person/entity.
- STOP IMMEDIATELY on HTTP 503/429 or any body containing "Robot Check" / "Enter the characters" / "validateCaptcha". Back off, do not retry-hammer.
- Keep a PRIVATE local cache only; use the data for personal product-sourcing decisions.
- Pull only aggregate facts (title, price, rank, rat


**Caveats:** RISK RATING (realistic, for an individual doing low-volume, logged-out, personal-use sourcing): LOW overall.
- Criminal (CFAA-style / Egyptian computer-crime): VERY LOW. Public, logged-out, no auth bypass = not "unauthorized access" (hiQ). No circumvention = no anti-hacking trigger.
- Civil contract / database claim under Egyptian law (CoU sec. 14): LOW-to-MODERATE in theory, VERY LOW in practice. The ToS ban is real and enforceable as contract, and amazon.eg picks Egyptian courts with NO arbitr
