import { useState } from "react";
import type { ImgHTMLAttributes, SyntheticEvent } from "react";
import { optimizedImageUrl, responsiveSrcSet } from "../../lib/imageOptimization";

interface ResponsiveImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  widthHint?: number;
  quality?: number;
}

export function ResponsiveImage({ src, alt, widthHint = 1280, quality = 82, sizes = "100vw", onError, ...props }: ResponsiveImageProps) {
  const [useOriginal, setUseOriginal] = useState(false);
  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    // If Vercel Image Optimization is unavailable for a legacy/external URL,
    // fall back to the original source rather than leaving a broken image.
    if (!useOriginal) setUseOriginal(true);
    onError?.(event);
  };

  return (
    <img
      {...props}
      src={useOriginal ? src : optimizedImageUrl(src, widthHint, quality)}
      srcSet={useOriginal ? undefined : responsiveSrcSet(src, undefined, quality)}
      sizes={sizes}
      alt={alt}
      loading={props.loading || "lazy"}
      decoding={props.decoding || "async"}
      onError={handleError}
    />
  );
}
