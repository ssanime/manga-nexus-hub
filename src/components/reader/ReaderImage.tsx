import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, ImageOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReaderImageProps {
  src: string;
  alt: string;
  index: number;
  isEager?: boolean;
  onVisible?: () => void;
}

const MAX_RETRIES = 3;
const PROXY_PREFIXES = [
  "", // Direct
  "https://wsrv.nl/?url=", // wsrv.nl proxy
  "https://images.weserv.nl/?url=", // weserv.nl proxy
];

/**
 * Robust image component for manga reader.
 * - Handles CORS / hotlinking issues with proxy fallbacks
 * - Retry logic with exponential backoff
 * - Loading skeleton & error state with manual retry
 * - Supports all image formats (jpg, png, webp, avif, gif, etc.)
 */
export const ReaderImage = ({ src, alt, index, isEager = false, onVisible }: ReaderImageProps) => {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [retryCount, setRetryCount] = useState(0);
  const [proxyIndex, setProxyIndex] = useState(0);
  const [currentSrc, setCurrentSrc] = useState(src);
  const imgRef = useRef<HTMLImageElement>(null);

  // Build proxied URL
  const getProxiedUrl = useCallback((originalUrl: string, pIdx: number) => {
    if (pIdx === 0) return originalUrl;
    const prefix = PROXY_PREFIXES[pIdx];
    if (!prefix) return originalUrl;
    // Encode the URL for the proxy
    return `${prefix}${encodeURIComponent(originalUrl)}`;
  }, []);

  // Reset when src changes
  useEffect(() => {
    setStatus("loading");
    setRetryCount(0);
    setProxyIndex(0);
    setCurrentSrc(src);
  }, [src]);

  const handleLoad = useCallback(() => {
    setStatus("loaded");
  }, []);

  const handleError = useCallback(() => {
    // Try next proxy
    const nextProxy = proxyIndex + 1;
    if (nextProxy < PROXY_PREFIXES.length) {
      setProxyIndex(nextProxy);
      setCurrentSrc(getProxiedUrl(src, nextProxy));
      return;
    }

    // Try retry with reset proxies
    if (retryCount < MAX_RETRIES) {
      const delay = Math.pow(2, retryCount) * 500;
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setProxyIndex(0);
        setCurrentSrc(src + (src.includes("?") ? "&" : "?") + `_retry=${retryCount + 1}`);
      }, delay);
      return;
    }

    setStatus("error");
  }, [src, proxyIndex, retryCount, getProxiedUrl]);

  const handleManualRetry = useCallback(() => {
    setStatus("loading");
    setRetryCount(0);
    setProxyIndex(0);
    setCurrentSrc(src + (src.includes("?") ? "&" : "?") + `_t=${Date.now()}`);
  }, [src]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.3 }}
      className="w-full relative"
      onViewportEnter={() => onVisible?.()}
    >
      {/* Loading skeleton */}
      {status === "loading" && (
        <div className="w-full flex items-center justify-center bg-muted/20 min-h-[300px] rounded-sm">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
            <span className="text-xs opacity-60">صفحة {index + 1}</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="w-full flex flex-col items-center justify-center bg-destructive/10 min-h-[200px] rounded-lg border border-destructive/20 gap-3 py-8">
          <ImageOff className="h-10 w-10 text-destructive/60" />
          <p className="text-sm text-destructive/80">فشل تحميل الصفحة {index + 1}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRetry}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* Image */}
      {status !== "error" && (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          loading={isEager ? "eager" : "lazy"}
          decoding="async"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-auto block transition-opacity duration-300 ${
            status === "loaded" ? "opacity-100" : "opacity-0 absolute inset-0"
          }`}
          style={{ 
            imageRendering: "auto",
            WebkitUserSelect: "none",
            userSelect: "none",
          }}
        />
      )}
    </motion.div>
  );
};
