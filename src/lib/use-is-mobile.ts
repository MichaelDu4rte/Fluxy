"use client";

import { useEffect, useState } from "react";

const MOBILE_MEDIA_QUERY = "(max-width: 767px)";

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_MEDIA_QUERY);
    const updateMatch = () => setIsMobile(media.matches);

    updateMatch();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", updateMatch);
      return () => media.removeEventListener("change", updateMatch);
    }

    media.addListener(updateMatch);
    return () => media.removeListener(updateMatch);
  }, []);

  return isMobile;
}
