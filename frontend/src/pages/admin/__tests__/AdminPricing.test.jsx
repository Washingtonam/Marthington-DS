/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../lib/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../../../components/admin/AgentCommissionSettings", () => ({
  default: () => null,
}));

vi.mock("../../../components/admin/CoreServicePricing", () => ({
  default: () => null,
}));

vi.mock("../../../components/ui/SlideOver", () => ({
  default: ({ isOpen, title, children }) => isOpen
    ? <section role="dialog" aria-label={title}><h2>{title}</h2>{children}</section>
    : null,
}));

import api from "../../../lib/axios";
import AdminPricing from "../AdminPricing";

let persistedServices;
const services = [
  { serviceCode: "validation-noRecord", category: "NIMC", name: "No Record", type: "noRecord", price: 1000, status: "active", metadata: { trending: true, formFields: [{ key: "nin", label: "NIN", type: "text", required: true }] } },
  { serviceCode: "modification-name", category: "NIMC", name: "Name Modification", type: "name", price: 12000, status: "active", metadata: { trending: true, formFields: [] } },
  { serviceCode: "modification-dob", category: "NIMC", name: "DOB Modification", type: "dob", price: 65000, status: "active", metadata: { trending: true, formFields: [] } },
  { serviceCode: "validation-vnin", category: "NIMC", name: "V-NIN Validation", type: "vnin", price: 1000, status: "active", metadata: { trending: true, formFields: [] } },
  { serviceCode: "modification-phone", category: "NIMC", name: "Phone Modification", type: "phone", price: 12000, status: "active", metadata: { formFields: [] } },
  ...Array.from({ length: 9 }, (_, index) => ({
    serviceCode: `other-${index}`,
    category: "NIMC",
    name: `Other Service ${index}`,
    type: `other${index}`,
    price: 500,
    status: "active",
    metadata: { formFields: [] },
  })),
  ...Array.from({ length: 3 }, (_, index) => ({
    serviceCode: `cac-${index}`,
    category: "CAC",
    name: `CAC Service ${index}`,
    type: `cac${index}`,
    price: 1000,
    status: "active",
    metadata: { formFields: [] },
  })),
];

function CurrentPath() {
  return <output data-testid="current-path">{useLocation().pathname}</output>;
}

function renderAdminPricing(initialEntry = "/admin/services-engine") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/admin/services-engine" element={<AdminPricing />} />
        <Route path="/admin/services-engine/:category" element={<AdminPricing />} />
      </Routes>
      <CurrentPath />
    </MemoryRouter>
  );
}

describe("AdminPricing", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("alert", vi.fn());
    persistedServices = services.map((service) => ({ ...service }));
    localStorage.setItem("user", JSON.stringify({ email: "admin@example.com" }));
    api.get.mockImplementation((path) => {
      if (path === "/api/admin/categories") {
        return Promise.resolve({ data: { categories: [
          { slug: "nimc", label: "NIMC", isActive: true },
          { slug: "cac", label: "CAC", isActive: true },
        ] } });
      }
      if (path === "/api/admin/services") {
        return Promise.resolve({ data: { services: persistedServices } });
      }
      return Promise.resolve({ data: { settings: { commissionType: "FLAT", commissionValue: 2000 } } });
    });
    api.put.mockImplementation((path, payload) => {
      const serviceCode = path.split("/").pop();
      persistedServices = persistedServices.map((service) => service.serviceCode === serviceCode
        ? { ...service, ...payload }
        : service);
      return Promise.resolve({ data: { success: true, service: payload } });
    });
  });

  test("prioritizes featured NIMC services and paginates the full list", async () => {
    renderAdminPricing();

    expect(await screen.findByRole("heading", { name: "Services Management" })).toBeTruthy();
    const featuredHeading = await screen.findByRole("heading", { name: "Featured NIMC services" });
    const featuredSection = featuredHeading.closest("section");
    const featuredNames = within(featuredSection).getAllByRole("button").map((button) => button.querySelectorAll("span")[1].textContent);
    expect(featuredNames).toEqual([
      "Name Modification",
      "DOB Modification",
      "No Record",
      "V-NIN Validation",
      "Phone Modification",
    ]);
    expect(await screen.findByText("Page 1 of 2")).toBeTruthy();
    expect(screen.getByText("Other Service 0")).toBeTruthy();
    expect(screen.getByText("14")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Next/ }));

    expect(await screen.findByText("Page 2 of 2")).toBeTruthy();
    expect(screen.getByText("Other Service 8")).toBeTruthy();
  }, 15000);

  test("opens a service editor from a catalog row and edits form fields in a separate dialog", async () => {
    renderAdminPricing();

    const serviceCard = (await screen.findAllByRole("button"))
      .find((button) => button.textContent.includes("No Recordvalidation-noRecord"));
    fireEvent.click(serviceCard);

    expect(await screen.findByRole("dialog", { name: "Edit Service" })).toBeTruthy();
    expect(screen.getByText("Service Code").closest("label").querySelector("input").disabled).toBe(true);
    expect(screen.getByText("1 form fields configured")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Edit form fields/ }));

    expect(await screen.findByRole("dialog", { name: "Edit No Record Form" })).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Edit Service" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Done editing form" }));

    await waitFor(() => expect(screen.getByRole("dialog", { name: "Edit Service" })).toBeTruthy());
    expect(screen.getByText("1 form fields configured")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Save Service" }));
    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        "/api/admin/services/validation-noRecord",
        expect.objectContaining({ cost: null, commissionType: "FLAT", commissionValue: 0 }),
        expect.any(Object)
      );
    });
  });

  test("saves a service commission and shows the saved rate after reloading the catalog", async () => {
    renderAdminPricing();

    const serviceCard = (await screen.findAllByRole("button"))
      .find((button) => button.textContent.includes("No Recordvalidation-noRecord"));
    fireEvent.click(serviceCard);
    expect(await screen.findByRole("dialog", { name: "Edit Service" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Commission Type"), { target: { value: "FLAT" } });
    const commissionInput = screen.getByText("Commission (₦)").closest("label").querySelector("input");
    fireEvent.change(commissionInput, { target: { value: "2000" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Service" }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        "/api/admin/services/validation-noRecord",
        expect.objectContaining({ commissionType: "FLAT", commissionValue: 2000 }),
        expect.any(Object),
      );
      expect(window.alert).toHaveBeenCalledWith("Service updated successfully.");
    });
    expect(await screen.findByText("₦2,000 commission")).toBeTruthy();
  });

  test("saves the configured service cost to the catalog", async () => {
    renderAdminPricing();

    const serviceCard = (await screen.findAllByRole("button"))
      .find((button) => button.textContent.includes("No Recordvalidation-noRecord"));
    fireEvent.click(serviceCard);
    expect(await screen.findByRole("dialog", { name: "Edit Service" })).toBeTruthy();

    const costInput = screen.getByText("Cost of service (₦)").closest("label").querySelector("input");
    fireEvent.change(costInput, { target: { value: "750" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Service" }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith(
      "/api/admin/services/validation-noRecord",
      expect.objectContaining({ cost: 750 }),
      expect.any(Object),
    ));
  }, 15000);

  test("does not report a commission save as confirmed when the catalog still has the old rate", async () => {
    api.put.mockResolvedValueOnce({ data: { success: true } });
    renderAdminPricing();

    const serviceCard = (await screen.findAllByRole("button"))
      .find((button) => button.textContent.includes("No Recordvalidation-noRecord"));
    fireEvent.click(serviceCard);
    await screen.findByRole("dialog", { name: "Edit Service" });
    fireEvent.change(screen.getByText("Commission (₦)").closest("label").querySelector("input"), {
      target: { value: "2000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Service" }));

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("commission rate could not be confirmed")));
  });

  test("rejects an invalid catalog price before sending a service update", async () => {
    renderAdminPricing();

    const serviceCard = (await screen.findAllByRole("button"))
      .find((button) => button.textContent.includes("No Recordvalidation-noRecord"));
    fireEvent.click(serviceCard);
    await screen.findByRole("dialog", { name: "Edit Service" });
    fireEvent.change(screen.getByText("Price (₦)").closest("label").querySelector("input"), {
      target: { value: "-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Service" }));

    expect(window.alert).toHaveBeenCalledWith("Service price must be a valid amount of zero or greater.");
    expect(api.put).not.toHaveBeenCalled();
  });

  test("opens each category as a route and shows the complete category count", async () => {
    renderAdminPricing();

    const cacCard = (await screen.findAllByRole("button"))
      .find((button) => button.textContent.includes("CAC") && button.textContent.includes("3"));
    fireEvent.click(cacCard);

    await waitFor(() => {
      expect(screen.getByTestId("current-path").textContent).toBe("/admin/services-engine/cac");
    });
    expect((await screen.findAllByText("CAC Service 0")).length).toBeGreaterThan(0);
    expect(screen.getByText("3 total")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Next/ })).toBeNull();
  });
});
