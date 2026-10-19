import type { ComponentProps } from "react";
import { cn } from "@devmentor/ui/lib/utils";

/** Centered, padded page-width wrapper for public (frontend) pages. */
export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-5xl px-6", className)} {...props} />;
}
