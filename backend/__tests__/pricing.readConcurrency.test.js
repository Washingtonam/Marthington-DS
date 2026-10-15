const Pricing = require("../models/Pricing.model");

describe("pricing read normalization", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("normalizes legacy pricing in memory without saving during concurrent reads", async () => {
    const stalePricingDocument = {
      categories: [],
      serviceCatalog: [],
      save: jest.fn(),
      markModified: jest.fn(),
    };
    jest.spyOn(Pricing, "findOne").mockResolvedValue(stalePricingDocument);

    const results = await Promise.all(
      Array.from({ length: 8 }, () => Pricing.getPricing()),
    );

    expect(results).toHaveLength(8);
    expect(results[0].serviceCatalog.some((service) => service.serviceCode === "modification-dob")).toBe(true);
    expect(results[0].categories.some((category) => category.slug === "nimc")).toBe(true);
    expect(stalePricingDocument.save).not.toHaveBeenCalled();
  });
});
