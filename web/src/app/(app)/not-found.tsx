import { PackageX } from "lucide-react";
import { ButtonLink } from "@/components/app/button-link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <PackageX className="size-8 text-muted-foreground" />
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Not found</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          That product or page isn&apos;t in the tracked amazon.eg dataset.
        </p>
      </div>
      <ButtonLink href="/" variant="outline">
        Back to dashboard
      </ButtonLink>
    </div>
  );
}
