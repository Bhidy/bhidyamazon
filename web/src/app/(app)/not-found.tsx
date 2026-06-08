import { PackageX } from "lucide-react";
import { ButtonLink } from "@/components/app/button-link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <PackageX className="size-8 text-muted-foreground" />
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">
          <span data-bi-en="">Not found</span>
          <span data-bi-ar="">غير موجود</span>
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          <span data-bi-en="">That product or page isn&apos;t in the tracked amazon.eg dataset.</span>
          <span data-bi-ar="">هذا المنتج أو الصفحة ليس في مجموعة بيانات amazon.eg المتتبعة.</span>
        </p>
      </div>
      <ButtonLink href="/" variant="outline">
        <span data-bi-en="">Back to dashboard</span>
        <span data-bi-ar="">العودة إلى لوحة التحكم</span>
      </ButtonLink>
    </div>
  );
}
