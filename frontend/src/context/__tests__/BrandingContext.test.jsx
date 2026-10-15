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
});
