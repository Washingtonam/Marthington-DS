import { describe, expect, test } from "vitest";
import { parseImportedFormText } from "../formTextParser";

describe("parseImportedFormText", () => {
  test("extracts the expected fields from a pasted NIMC name modification form", () => {
    const text = `NAME MODIFICATION FORM:
Have you ever done modification before via NIMC Self-Service Portal? Yes [ ] No [ ]
NIN:
Last Name/Surname:
First Name:
Middle Name (Optional):
Email:
GSM:`;

    const result = parseImportedFormText(text);

    expect(result.length).toBeGreaterThanOrEqual(6);
    expect(result.some((field) => field.label.toLowerCase().includes("ever done modification"))).toBe(true);
    expect(result.some((field) => field.label.toLowerCase().includes("nin"))).toBe(true);
    expect(result.some((field) => field.label.toLowerCase().includes("last name"))).toBe(true);
    expect(result.some((field) => field.label.toLowerCase().includes("email"))).toBe(true);
    expect(result.some((field) => field.label.toLowerCase().includes("gsm"))).toBe(true);
    expect(result.find((field) => field.label.toLowerCase().includes("ever done modification"))?.type).toBe("select");
  });
});
