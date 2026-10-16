import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyGuideLinkButton({ path, className = "" }) {
  const [status, setStatus] = useState("");

  const copyLink = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard access is unavailable.");
      await navigator.clipboard.writeText(new URL(path, window.location.origin).href);
      setStatus("Link copied");
    } catch (error) {
      console.error("Guide link copy failed:", error);
      setStatus("Could not copy link");
    }
  };

  return (
    <button
      type="button"
      onClick={copyLink}
      className={className}
      aria-label={status || "Copy guide link"}
      title={status || "Copy guide link"}
    >
      {status === "Link copied" ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
      <span>{status || "Copy link"}</span>
    </button>
  );
}
