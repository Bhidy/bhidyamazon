import Link from "next/link";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";

/**
 * A Button rendered as a Next.js <Link>.
 * Base UI's Button defaults to `nativeButton: true`, so rendering an <a> needs
 * `nativeButton={false}` to keep semantics correct — centralised here so every
 * screen can use button-styled navigation without repeating the boilerplate.
 */
export function ButtonLink({
  href,
  ...props
}: ComponentProps<typeof Button> & { href: string }) {
  return <Button nativeButton={false} render={<Link href={href} />} {...props} />;
}
