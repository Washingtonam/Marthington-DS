/* eslint react-refresh/only-export-components: "off" */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../lib/axios";

const DEFAULT_BRANDING = {
  businessName: "Marthington",
  businessTagline: "Digital Services",
  businessLogoUrl: "",
};
const BRANDING_STORAGE_KEY = "business-branding";
const BrandingContext = createContext(null);

function normalizeBranding(value) {
  return {
    businessName: typeof value?.businessName === "string" && value.businessName.trim()
      ? value.businessName.trim()
      : DEFAULT_BRANDING.businessName,
    businessTagline: typeof value?.businessTagline === "string" && value.businessTagline.trim()
      ? value.businessTagline.trim()
      : DEFAULT_BRANDING.businessTagline,
    businessLogoUrl: typeof value?.businessLogoUrl === "string" ? value.businessLogoUrl : "",
  };
}

function readCachedBranding() {
  try {
    const cached = localStorage.getItem(BRANDING_STORAGE_KEY);
    return cached ? normalizeBranding(JSON.parse(cached)) : DEFAULT_BRANDING;
  } catch (error) {
    console.error("Could not read cached business branding:", error);
    return DEFAULT_BRANDING;
  }
}

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(readCachedBranding);

  const applyBranding = useCallback((value) => {
    const next = normalizeBranding(value);
    setBranding(next);
    try {
      localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.error("Could not cache business branding:", error);
    }
  }, []);

  const refreshBranding = useCallback(async () => {
    try {
      const response = await api.get("/api/branding");
      applyBranding(response.data?.branding);
    } catch (error) {
      console.error("Business branding refresh failed:", error);
    }
  }, [applyBranding]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refreshBranding(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshBranding]);

  useEffect(() => {
    const syncBranding = (event) => {
      if (event.key !== BRANDING_STORAGE_KEY) return;
      try {
        setBranding(event.newValue ? normalizeBranding(JSON.parse(event.newValue)) : DEFAULT_BRANDING);
      } catch (error) {
        console.error("Could not sync business branding:", error);
      }
    };
    window.addEventListener("storage", syncBranding);
    return () => window.removeEventListener("storage", syncBranding);
  }, []);

  useEffect(() => {
    document.title = `${branding.businessName} | NIN Verification Platform`;
    const favicon = document.querySelector('link[rel~="icon"]');
    if (!favicon) return undefined;

    let currentImage;
    let faviconUpdate = 0;
    const source = branding.businessLogoUrl || "/favicon.png";
    const applyFavicon = () => {
      faviconUpdate += 1;
      const updateId = faviconUpdate;
      if (currentImage) {
        currentImage.onload = null;
        currentImage.onerror = null;
        currentImage = null;
      }

      if (!document.hidden) {
        favicon.href = source;
        return;
      }

      currentImage = new Image();
      if (/^https?:\/\//i.test(source)) currentImage.crossOrigin = "anonymous";
      currentImage.onload = () => {
        if (updateId !== faviconUpdate || !document.hidden) return;
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext("2d");
        if (!context) return;

        try {
          const scale = Math.min(canvas.width / currentImage.width, canvas.height / currentImage.height);
          const width = currentImage.width * scale;
          const height = currentImage.height * scale;
          context.drawImage(currentImage, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
          const image = context.getImageData(0, 0, canvas.width, canvas.height);
          for (let index = 0; index < image.data.length; index += 4) {
            const gray = Math.round(image.data[index] * 0.299 + image.data[index + 1] * 0.587 + image.data[index + 2] * 0.114);
            image.data[index] = gray;
            image.data[index + 1] = gray;
            image.data[index + 2] = gray;
          }
          context.putImageData(image, 0, 0);
          if (updateId === faviconUpdate && document.hidden) favicon.href = canvas.toDataURL("image/png");
        } catch (error) {
          console.warn("Could not make the inactive-tab logo grayscale:", error);
          if (updateId === faviconUpdate && document.hidden) favicon.href = source;
        }
      };
      currentImage.onerror = (error) => {
        if (updateId !== faviconUpdate || !document.hidden) return;
        console.warn("Could not make the inactive-tab logo grayscale:", error);
        favicon.href = source;
      };
      currentImage.src = source;
    };

    applyFavicon();
    document.addEventListener("visibilitychange", applyFavicon);
    return () => {
      document.removeEventListener("visibilitychange", applyFavicon);
      faviconUpdate += 1;
      if (currentImage) {
        currentImage.onload = null;
        currentImage.onerror = null;
      }
    };
  }, [branding.businessName, branding.businessLogoUrl]);

  const value = useMemo(() => ({
    ...branding,
    applyBranding,
    refreshBranding,
  }), [branding, applyBranding, refreshBranding]);

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) throw new Error("useBranding must be used within BrandingProvider");
  return context;
}
