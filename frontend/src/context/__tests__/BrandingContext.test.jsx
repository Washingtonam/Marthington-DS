/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { BrandingProvider, useBranding } from "../BrandingContext";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock("../../lib/axios", () => ({
  default: { get: mocks.get },
}));

function BrandingState() {
  const { businessName, applyBranding } = useBranding();
  return (
    <>
      <output aria-label="Business name">{businessName}</output>
      <button
        type="button"
        onClick={() => applyBranding({
          businessName: "Saved Identity",
          businessTagline: "Shared services",
          businessLogoUrl: "",
        })}
      >
        Apply branding
      </button>
    </>
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  mocks.get.mockReset();
  document.title = "";
  document.querySelector('link[rel="icon"]')?.remove();
  delete document.hidden;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("shared business branding", () => {
  test("loads server branding, caches it for startup, and persists later updates", async () => {
    const branding = {
      businessName: "Server Identity",
      businessTagline: "Platform services",
      businessLogoUrl: "https://cdn.example/logo.png",
    };
    mocks.get.mockResolvedValue({ data: { branding } });

    render(<BrandingProvider><BrandingState /></BrandingProvider>);

    await waitFor(() => {
      expect(screen.getByLabelText("Business name").textContent).toBe("Server Identity");
      expect(document.title).toBe("Server Identity | NIN Verification Platform");
      expect(JSON.parse(localStorage.getItem("business-branding"))).toEqual(branding);
    });

    fireEvent.click(screen.getByRole("button", { name: "Apply branding" }));
    expect(JSON.parse(localStorage.getItem("business-branding"))).toEqual({
      businessName: "Saved Identity",
      businessTagline: "Shared services",
      businessLogoUrl: "",
    });
  });

  test("grayscales the inactive favicon and ignores stale conversions after returning", async () => {
    const images = [];
    vi.stubGlobal("Image", class {
      constructor() {
        this.width = 32;
        this.height = 32;
        images.push(this);
      }
    });
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    const favicon = document.createElement("link");
    favicon.rel = "icon";
    document.head.appendChild(favicon);
    mocks.get.mockResolvedValue({
      data: {
        branding: {
          businessName: "Server Identity",
          businessTagline: "Platform services",
          businessLogoUrl: "https://cdn.example/logo.png",
        },
      },
    });
    const imageData = { data: new Uint8ClampedArray([20, 40, 60, 255]) };
    const canvasContext = {
      drawImage: vi.fn(),
      getImageData: vi.fn(() => imageData),
      putImageData: vi.fn(),
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(canvasContext);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,gray-logo");

    render(<BrandingProvider><BrandingState /></BrandingProvider>);

    await waitFor(() => {
      expect(screen.getByLabelText("Business name").textContent).toBe("Server Identity");
      expect(images).toHaveLength(2);
    });
    const pendingImage = images[images.length - 1];
    const staleLoad = pendingImage.onload;
    pendingImage.onload();
    expect(favicon.href).toBe("data:image/png;base64,gray-logo");

    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    fireEvent(document, new Event("visibilitychange"));
    expect(favicon.href).toBe("https://cdn.example/logo.png");
    staleLoad();
    expect(favicon.href).toBe("https://cdn.example/logo.png");
  });
});
