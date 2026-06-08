/**
 * Bilingual text switcher — server-safe (no "use client" directive).
 * Renders both strings in the DOM; CSS hides the inactive one based on
 * the `dir` attribute on <html> set by the locale toggle.
 *
 * Usage:
 *   <Bi en="Dashboard" ar="لوحة التحكم" />
 *
 * For block-level usage (paragraphs, etc.) use block="true":
 *   <Bi en="Long English text…" ar="نص عربي طويل…" block />
 */
export function Bi({
  en,
  ar,
  block,
}: {
  en: React.ReactNode;
  ar: React.ReactNode;
  block?: boolean;
}) {
  if (block) {
    return (
      <>
        <span data-bi-en="">{en}</span>
        <span data-bi-ar="">{ar}</span>
      </>
    );
  }
  return (
    <>
      <span data-bi-en="">{en}</span>
      <span data-bi-ar="">{ar}</span>
    </>
  );
}
