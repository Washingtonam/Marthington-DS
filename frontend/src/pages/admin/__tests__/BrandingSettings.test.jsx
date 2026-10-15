/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import BrandingSettings from "../BrandingSettings";

const mocks = vi.hoisted(() => ({
  applyBranding: vi.fn(),
  put: vi.fn(),
}));

vi.mock("../../../context/BrandingContext", () => ({
  useBranding: () => ({
    businessName: "Marthington",
    businessTagline: "Digital Services",
    businessLogoUrl: "https://cdn.example/logo.png",
    applyBranding: mocks.applyBranding,
  }),
}));

vi.mock("../../../lib/axios", () => ({
  default: { put: mocks.put },
}));

afterEach(() => {
  cleanup();
  mocks.applyBranding.mockReset();
  mocks.put.mockReset();
});

describe("business branding settings", () => {
  test("saves shared business identity and applies it after the server confirms success", async () => {
    const savedBranding = {
      businessName: "Marthington Identity",
      businessTagline: "Secure digital services",
      businessLogoUrl: "https://cdn.example/new-logo.png",
    };
    mocks.put.mockResolvedValue({ data: { branding: savedBranding } });
    render(<BrandingSettings />);

    fireEvent.change(screen.getByLabelText("Business name"), { target: { value: savedBranding.businessName } });
    fireEvent.change(screen.getByLabelText("Tagline"), { target: { value: savedBranding.businessTagline } });
    fireEvent.click(screen.getByRole("button", { name: "Save business identity" }));

    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    const [path, payload, options] = mocks.put.mock.calls[0];
    expect(path).toBe("/api/admin/settings/branding");
    expect(payload).toBeInstanceOf(FormData);
    expect(payload.get("businessName")).toBe(savedBranding.businessName);
    expect(payload.get("businessTagline")).toBe(savedBranding.businessTagline);
    expect(options.headers["Content-Type"]).toBe("multipart/form-data");
    expect(mocks.applyBranding).toHaveBeenCalledWith(savedBranding);
    expect((await screen.findByRole("status")).textContent).toContain("Business identity updated across the application.");
  });

  test("keeps current branding when the server rejects the update", async () => {
    mocks.put.mockRejectedValue({ response: { data: { message: "Super-admin access required." } } });
    render(<BrandingSettings />);
    fireEvent.click(screen.getByRole("button", { name: "Save business identity" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Super-admin access required.");
    expect(mocks.applyBranding).not.toHaveBeenCalled();
  });

  test("includes an uploaded logo in the multipart branding update", async () => {
    const file = new File(["image"], "business-logo.png", { type: "image/png" });
    mocks.put.mockResolvedValue({
      data: {
        branding: {
          businessName: "Marthington",
          businessTagline: "Digital Services",
          businessLogoUrl: "https://cdn.example/uploaded-logo.png",
        },
      },
    });
    render(<BrandingSettings />);

    fireEvent.change(screen.getByLabelText("Upload business logo"), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Save business identity" }));

    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    expect(mocks.put.mock.calls[0][1].get("logo")).toBe(file);
  });

  test("sends a logo removal request when removing the current logo", async () => {
    mocks.put.mockResolvedValue({
      data: {
        branding: {
          businessName: "Marthington",
          businessTagline: "Digital Services",
          businessLogoUrl: "",
        },
      },
    });
    render(<BrandingSettings />);

    fireEvent.click(screen.getByRole("button", { name: "Remove logo" }));
    fireEvent.click(screen.getByRole("button", { name: "Save business identity" }));

    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    expect(mocks.put.mock.calls[0][1].get("removeLogo")).toBe("true");
  });
});
