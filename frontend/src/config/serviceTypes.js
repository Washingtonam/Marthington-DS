export const SERVICE_TYPE_OPTIONS = [
  { value: "", label: "All services" },
  { value: "validation", label: "Validation" },
  { value: "modification", label: "Modification" },
  { value: "personalization", label: "Personalization" },
  { value: "ipe", label: "IPE" },
  { value: "selfService", label: "Self Service" },
  { value: "nimc", label: "NIMC" },
  { value: "cac", label: "CAC" }
];

export const nimcSubServices = ["All", "Validation", "IP Clearance", "Modification", "Personalization", "Self-Service"];
export const cacSubServices = ["All", "sole_proprietorship", "partnership", "limited_1m", "custom_ngo"];

export const normalizeServiceType = (value) => {
  if (value === null || value === undefined) return "";
  const normalized = String(value).trim().toLowerCase();
  if (["self-service", "selfservice", "self_service"].includes(normalized)) return "selfService";
  if (normalized === "validation") return "validation";
  if (normalized === "modification") return "modification";
  if (normalized === "ipe") return "ipe";
  return normalized;
};
