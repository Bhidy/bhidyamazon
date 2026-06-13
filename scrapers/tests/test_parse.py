"""Tests for scrapers/parse.py (amazon.eg bestsellers + product-detail parsers).

These tests lock CURRENT behavior of parse.py against structurally faithful
fixtures built from the live-validated selectors in
docs/research/05-selectors-and-samples.md. Fixtures live in tests/fixtures/.
"""
from __future__ import annotations

import pytest

import parse
from parse import (
    BASE,
    _dims_to_cm,
    _int,
    _num,
    _weight_to_kg,
    parse_bestsellers,
    parse_product,
)

CATEGORY = "automotive"
PRODUCT_ASIN = "B0TESTPROD"


# ---------------------------------------------------------------------------
# Shared parsed results (parse once per session)
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def bs_rows(bestsellers_html):
    return parse_bestsellers(bestsellers_html, CATEGORY)


@pytest.fixture(scope="session")
def product(product_html):
    return parse_product(product_html, PRODUCT_ASIN)


def _row(rows, asin):
    return next(r for r in rows if r["asin"] == asin)


# ---------------------------------------------------------------------------
# parse_bestsellers
# ---------------------------------------------------------------------------

class TestParseBestsellers:
    def test_row_count_after_dedupe(self, bs_rows):
        # 7 top-level cards + 1 nested duplicate gridItemRoot card; B0TESTA001
        # appears 3x (own card, nested gridItemRoot, explicit dup card) -> 6 rows.
        assert len(bs_rows) == 6
        asins = [r["asin"] for r in bs_rows]
        assert len(asins) == len(set(asins)), "ASINs must be unique after dedupe"

    def test_dedupe_keeps_first_occurrence(self, bs_rows):
        row = _row(bs_rows, "B0TESTA001")
        # The rank-#5 duplicate card must NOT have replaced the rank-#1 card.
        assert row["rank"] == 1
        assert row["price_egp"] == 1299.0
        assert "DUPLICATE" not in (row["title"] or "")
        assert all(r["rank"] != 5 for r in bs_rows), "the duplicate card's rank leaked in"

    def test_sorted_by_rank_with_none_last(self, bs_rows):
        assert [r["rank"] for r in bs_rows] == [1, 2, 3, 4, 1234, None]

    def test_asin_extracted_from_dp_links(self, bs_rows):
        assert {r["asin"] for r in bs_rows} == {
            "B0TESTA001",
            "B0TESTA002",
            "B0TESTA003",
            "B0TESTA004",
            "B0TESTA006",
            "B0TESTA007",
        }

    def test_rank_parses_comma_thousands(self, bs_rows):
        assert _row(bs_rows, "B0TESTA003")["rank"] == 1234

    def test_title_from_line_clamp_div(self, bs_rows):
        assert (
            _row(bs_rows, "B0TESTA001")["title"]
            == "FOO Car Trunk Organizer Foldable Storage Box with Lid, 60L - Black"
        )

    def test_title_falls_back_to_img_alt(self, bs_rows):
        # Card B0TESTA004 has an EMPTY line-clamp div -> title from img[alt].
        assert (
            _row(bs_rows, "B0TESTA004")["title"]
            == "Magnetic Phone Holder for Car Dashboard 360 Rotation - Black"
        )

    def test_arabic_title_preserved(self, bs_rows):
        assert (
            _row(bs_rows, "B0TESTA006")["title"]
            == "منظم مقعد السيارة الخلفي مع حامل أكواب وجيوب متعددة"
        )

    def test_price_float_from_egp_string(self, bs_rows):
        # "EGP\xa01,299.00" (NBSP, comma thousands) -> 1299.0
        price = _row(bs_rows, "B0TESTA001")["price_egp"]
        assert isinstance(price, float)
        assert price == 1299.0
        assert _row(bs_rows, "B0TESTA003")["price_egp"] == 89.99
        assert _row(bs_rows, "B0TESTA006")["price_egp"] == 75.5

    def test_price_none_for_out_of_stock_row_kept(self, bs_rows):
        row = _row(bs_rows, "B0TESTA002")
        assert row["price_egp"] is None  # OOS row kept, price null

    def test_rating_float(self, bs_rows):
        assert _row(bs_rows, "B0TESTA001")["rating"] == 4.3
        # Arabic star text "4.1 من 5 نجوم" still yields the leading float.
        assert _row(bs_rows, "B0TESTA006")["rating"] == 4.1

    def test_reviews_int_from_numeric_size_small(self, bs_rows):
        assert _row(bs_rows, "B0TESTA001")["reviews"] == 2847
        assert _row(bs_rows, "B0TESTA007")["reviews"] == 1050

    def test_reviews_fallback_to_aria_label(self, bs_rows):
        # OOS card has no numeric a-size-small ("Currently unavailable" is
        # skipped); count comes from a[aria-label='... 567 ratings'].
        assert _row(bs_rows, "B0TESTA002")["reviews"] == 567

    def test_image_url_shape(self, bs_rows):
        url = _row(bs_rows, "B0TESTA001")["image_url"]
        assert url == "https://m.media-amazon.com/images/I/81testA001L._AC_UL300_SR300,200_.jpg"
        for r in bs_rows:
            assert r["image_url"].startswith("https://m.media-amazon.com/images/I/")

    def test_product_url_shape(self, bs_rows):
        for r in bs_rows:
            assert r["product_url"] == f"{BASE}/-/en/dp/{r['asin']}"
        assert _row(bs_rows, "B0TESTA001")["product_url"] == "https://www.amazon.eg/-/en/dp/B0TESTA001"

    def test_category_passthrough_and_currency(self, bs_rows):
        assert all(r["category"] == CATEGORY for r in bs_rows)
        assert all(r["currency"] == "EGP" for r in bs_rows)

    def test_row_schema_keys(self, bs_rows):
        assert set(bs_rows[0]) == {
            "category",
            "rank",
            "asin",
            "title",
            "price_egp",
            "currency",
            "rating",
            "reviews",
            "image_url",
            "product_url",
        }

    @pytest.mark.parametrize(
        "html",
        [
            "",
            "}{<<>> &&& totally not html ###",
            "<html><body><div class='a-section'>no product cards here</div></body></html>",
        ],
        ids=["empty", "garbage", "cardless"],
    )
    def test_empty_or_garbage_html_returns_empty_list(self, html):
        assert parse_bestsellers(html, CATEGORY) == []


# ---------------------------------------------------------------------------
# parse_product — core fields
# ---------------------------------------------------------------------------

class TestParseProductCore:
    def test_asin_passthrough(self, product):
        assert product["asin"] == PRODUCT_ASIN

    def test_title(self, product):
        assert product["title"] == "FOO Car Seat Gap Organizer with Cup Holder, 2 Pack - Black Silicone"

    def test_brand_from_byline(self, product):
        # "Visit the FOO Store" -> "FOO"
        assert product["brand"] == "FOO"

    def test_price_from_core_price_offscreen(self, product):
        assert product["price_egp"] == 178.0
        assert product["currency"] == "EGP"

    def test_rating_from_acr_popover_title(self, product):
        assert product["rating"] == 4.4

    def test_reviews_count(self, product):
        assert product["reviews"] == 1234

    def test_availability(self, product):
        assert product["availability"] == "In Stock"

    def test_bsr_both_ranks_with_exact_categories(self, product):
        assert product["bsr"] == [
            {"rank": 2345, "category": "Automotive"},
            {"rank": 12, "category": "Car Organizers"},
        ]

    def test_offer_count_absent(self, product):
        assert product["offer_count"] is None


# ---------------------------------------------------------------------------
# parse_product — embedded reviews
# ---------------------------------------------------------------------------

class TestParseProductReviews:
    def test_reviews_list_length(self, product):
        assert len(product["reviews_list"]) == 3

    def test_review_ids_and_document_order(self, product):
        assert [rv["review_id"] for rv in product["reviews_list"]] == [
            "R1TESTEN5STAR",
            "R2TESTAR1STAR",
            "R3TESTBOILER",
        ]

    def test_author_is_always_none_pii_guardrail(self, product):
        # Fixture contains span.a-profile-name "John Doe" / "أحمد محمود" / "Sara K."
        # — the parser must drop ALL of them.
        for rv in product["reviews_list"]:
            assert rv["author"] is None

    def test_review_ratings(self, product):
        assert [rv["rating"] for rv in product["reviews_list"]] == [5.0, 1.0, 3.0]

    def test_review_title_star_prefix_stripped(self, product):
        en5, ar1, boiler = product["reviews_list"]
        assert en5["title"] == "Excellent quality and fits perfectly"
        assert ar1["title"] == "جودة سيئة جدا"
        assert boiler["title"] == "Average but acceptable"
        for rv in product["reviews_list"]:
            assert "out of 5 stars" not in rv["title"]

    def test_language_detection(self, product):
        assert [rv["lang"] for rv in product["reviews_list"]] == ["en", "ar", "en"]

    def test_verified_only_for_badge_review(self, product):
        assert [rv["verified"] for rv in product["reviews_list"]] == [True, False, False]

    def test_helpful_votes_parsed(self, product):
        en5, ar1, boiler = product["reviews_list"]
        assert en5["helpful"] == 12  # "12 people found this helpful"
        assert ar1["helpful"] == 0  # no helpful-vote-statement
        assert boiler["helpful"] == 1  # "One person found this helpful"

    def test_boilerplate_stripped_from_body(self, product):
        boiler = product["reviews_list"][2]
        assert boiler["body"] == "Average product, does the job."
        for rv in product["reviews_list"]:
            assert "Read more" not in rv["body"]
            assert "double tap" not in rv["body"].lower()

    def test_review_bodies_and_dates(self, product):
        en5, ar1, _ = product["reviews_list"]
        assert en5["body"] == (
            "Great organizer, very sturdy and the straps keep it fixed in place. "
            "Highly recommended for any car owner."
        )
        assert "المنتج سيء" in ar1["body"]
        assert en5["date"] == "Reviewed in Egypt on 12 May 2026"
        assert ar1["date"] == "Reviewed in Egypt on 26 April 2026"

    def test_foreign_reviews_excluded(self, product):
        """Egypt-only platform: 'Top reviews from other countries' (UAE/US/…)
        share data-hook='review' on the same dp page and MUST NOT be ingested.
        The fixture embeds a UAE 5★ and a US 2★ foreign review; neither may appear."""
        ids = [rv["review_id"] for rv in product["reviews_list"]]
        assert "RFOREIGNUAE01" not in ids
        assert "RFOREIGNUS01" not in ids
        for rv in product["reviews_list"]:
            assert "Reviewed in Egypt" in (rv["date"] or "")
            assert "United Arab Emirates" not in (rv["date"] or "")
            assert "United States" not in (rv["date"] or "")


class TestEgyptReviewFilter:
    """Unit coverage for the origin guardrail used by parse_product."""

    def test_egypt_english_date_kept(self):
        assert parse._is_egypt_review("Reviewed in Egypt on 12 May 2026") is True

    def test_egypt_arabic_date_kept(self):
        assert parse._is_egypt_review("تمت المراجعة في مصر في 12 مايو 2026") is True

    @pytest.mark.parametrize(
        "date_text",
        [
            "Reviewed in the United Arab Emirates on 1 May 2026",
            "Reviewed in the United States on 3 April 2026",
            "Reviewed in Saudi Arabia on 2 May 2026",
            "Reviewed in India on 4 April 2026",
            "Reviewed in Canada on 5 April 2026",
        ],
    )
    def test_foreign_dates_dropped(self, date_text):
        assert parse._is_egypt_review(date_text) is False

    def test_unparseable_date_kept_falls_back_to_container_scope(self):
        # No "Reviewed in <Country>" → only reachable from #localTopReviewsList → keep.
        assert parse._is_egypt_review(None) is True
        assert parse._is_egypt_review("12 May 2026") is True


# ---------------------------------------------------------------------------
# parse_product — spec-table attributes
# ---------------------------------------------------------------------------

class TestParseProductAttrs:
    def test_material(self, product):
        assert product["material"] == "Silicone"

    def test_manufacturer_and_color(self, product):
        assert product["manufacturer"] == "FOO Industries"
        assert product["color"] == "Black"

    def test_number_of_items(self, product):
        assert product["number_of_items"] == 2

    def test_item_weight_normalized_to_kg(self, product):
        assert product["item_weight_raw"] == "250 g"
        assert product["item_weight_kg"] == 0.25

    def test_item_dims_normalized_to_cm(self, product):
        assert product["item_dims_raw"] == "20 x 10 x 5 Centimeters"
        assert product["item_dims_cm"] == {"l": 20.0, "w": 10.0, "h": 5.0}

    def test_image_count(self, product):
        # 4 li.imageThumbnail; the extra li.template must not be counted.
        assert product["image_count"] == 4

    def test_feature_bullet_count(self, product):
        assert product["feature_bullet_count"] == 5


# ---------------------------------------------------------------------------
# parse_product — minimal html (no crash, None/empty defaults)
# ---------------------------------------------------------------------------

class TestParseProductMinimal:
    def test_minimal_html_returns_dict_with_defaults(self):
        out = parse_product("<html><body><p>nothing here</p></body></html>", "B000000000")
        assert out["asin"] == "B000000000"
        assert out["title"] is None
        assert out["brand"] is None
        assert out["price_egp"] is None
        assert out["rating"] is None
        assert out["reviews"] is None
        assert out["availability"] is None
        assert out["bsr"] == []
        assert out["reviews_list"] == []
        assert out["material"] is None
        assert out["number_of_items"] is None
        assert out["item_weight_kg"] is None
        assert out["item_dims_cm"] is None
        assert out["image_count"] is None
        assert out["feature_bullet_count"] is None
        assert out["offer_count"] is None


# ---------------------------------------------------------------------------
# helpers — _weight_to_kg / _dims_to_cm / _num / _int
# ---------------------------------------------------------------------------

class TestWeightToKg:
    @pytest.mark.parametrize(
        ("raw", "expected"),
        [
            ("500 Grams", 0.5),
            ("1.2 Kilograms", 1.2),
            ("250 g", 0.25),
            ("8 ounces", 0.2268),  # 8 * 0.0283495 rounded to 4 dp
            ("2 pounds", 0.9072),  # 2 * 0.453592 rounded to 4 dp
            ("300 Milligrams", 0.0003),
            ("300", None),  # unlabeled magnitude is never guessed
            (None, None),
        ],
        ids=["grams", "kilograms", "g", "ounces", "pounds", "milligrams", "no-unit", "none"],
    )
    def test_unit_table(self, raw, expected):
        got = _weight_to_kg(raw)
        if expected is None:
            assert got is None
        else:
            assert got == pytest.approx(expected, abs=1e-9)


class TestDimsToCm:
    @pytest.mark.parametrize(
        ("raw", "expected"),
        [
            ("20 x 10 x 5 Centimeters", {"l": 20.0, "w": 10.0, "h": 5.0}),
            ("8 x 4 inches", {"l": 20.32, "w": 10.16, "h": 0.0}),  # 2 dims -> h=0
            ("200 x 100 mm", {"l": 20.0, "w": 10.0, "h": 0.0}),
            ("15 x 8 x 3", {"l": 15.0, "w": 8.0, "h": 3.0}),  # unitless -> cm default
            (None, None),
        ],
        ids=["centimeters", "inches-2d", "millimeters", "unitless-cm-default", "none"],
    )
    def test_dims_table(self, raw, expected):
        assert _dims_to_cm(raw) == expected


class TestNumIntHelpers:
    @pytest.mark.parametrize(
        ("raw", "expected"),
        [
            ("EGP\xa01,299.00", 1299.0),  # NBSP between currency and amount
            ("EGP 89.99", 89.99),
            ("4.3 out of 5 stars", 4.3),
            ("no digits here", None),
            (None, None),
        ],
    )
    def test_num(self, raw, expected):
        assert _num(raw) == expected

    @pytest.mark.parametrize(
        ("raw", "expected"),
        [
            ("#1,234", 1234),
            ("1,234 ratings", 1234),
            ("(333)", 333),  # .eg review-count format
            ("", None),
            (None, None),
            ("no digits", None),
            # Locked quirk: _int concatenates ALL digits, so decimals collapse.
            # Safe for ranks/counts; must never be fed a decimal like a rating.
            ("4.3", 43),
        ],
    )
    def test_int(self, raw, expected):
        assert _int(raw) == expected
