const normalizeFieldKey = (label = "") => String(label || "")
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .replace(/-+/g, "-") || "field";

const normalizeLabel = (label = "") => String(label || "")
  .replace(/\s*:\s*$/, "")
  .replace(/\s*\(\s*optional\s*\)\s*/gi, "")
  .replace(/\s*\[\s*\]\s*/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const inferOptions = (line = "") => {
  const normalized = String(line || "").replace(/\s+/g, " ").trim();

  if (/\bYes\b.*\bNo\b/i.test(normalized) || /\bNo\b.*\bYes\b/i.test(normalized)) {
    return ["Yes", "No"];
  }

  if (/\bMale\b.*\bFemale\b/i.test(normalized) || /\bFemale\b.*\bMale\b/i.test(normalized)) {
    return ["Male", "Female"];
  }

  if (/\bSingle\b.*\bMarried\b/i.test(normalized) || /\bMarried\b.*\bSingle\b/i.test(normalized)) {
    return ["Single", "Married"];
  }

  return [];
};

const isHeaderLine = (line = "") => {
  const normalized = String(line || "").trim();
  if (!normalized) return true;
  if (/^[-*•]+$/.test(normalized)) return true;
  if (/^(name\s+modification\s+form|service\s+form|form|section|part|details)$/i.test(normalized)) return true;
  if (/^\d+\s*$/.test(normalized)) return true;
  return /^[A-Z\s&/()]+$/.test(normalized) && normalized.length <= 40;
};

const getFieldType = (label = "", options = []) => {
  if (Array.isArray(options) && options.length) {
    return "select";
  }

  const lower = String(label || "").toLowerCase();
  if (/email/i.test(lower)) return "text";
  if (/gsm|phone|mobile|number/i.test(lower)) return "number";
  if (/date|dob|birth|year/i.test(lower)) return "date";
  if (/address|details|description|remark|comment|note/i.test(lower)) return "textarea";
  return "text";
};

export const parseImportedFormText = (rawText = "") => {
  const lines = String(rawText || "")
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const fields = [];
  const seen = new Set();

  for (const line of lines) {
    const candidate = String(line || "").replace(/^[\-*•\d\.\)]\s*/, "").trim();
    if (!candidate || isHeaderLine(candidate)) continue;

    let label = "";
    let options = [];

    const yesNoMatch = candidate.match(/^(.+?)\s*(?:Yes\s*\[\s*\]\s*No\s*\[\s*\]|Yes\s*\/\s*No|No\s*\/\s*Yes)\s*$/i);
    if (yesNoMatch) {
      label = yesNoMatch[1].trim();
      options = ["Yes", "No"];
    } else {
      const questionMatch = candidate.match(/^(.+?)\?\s*(.*)$/);
      if (questionMatch) {
        label = questionMatch[1].trim();
        options = inferOptions(candidate);
      } else if (candidate.endsWith(":")) {
        label = candidate.slice(0, -1).trim();
      } else {
        label = candidate.replace(/\?$/, "").trim();
      }
    }

    const cleanedLabel = normalizeLabel(label);
    if (!cleanedLabel) continue;

    const initialKey = normalizeFieldKey(cleanedLabel);
    if (seen.has(initialKey)) continue;

    const isOptional = /(optional)/i.test(cleanedLabel) || /(optional)/i.test(candidate);
    const finalLabel = cleanedLabel.replace(/\s*\(\s*optional\s*\)\s*/gi, "").trim();
    const finalKey = normalizeFieldKey(finalLabel);
    const finalOptions = options.length ? options : inferOptions(finalLabel);

    if (!finalLabel || finalLabel.length < 2) continue;

    seen.add(finalKey);
    fields.push({
      id: crypto.randomUUID(),
      key: finalKey,
      label: finalLabel,
      type: getFieldType(finalLabel, finalOptions),
      required: !isOptional,
      placeholder: "",
      options: finalOptions,
    });
  }

  return fields;
};

export default parseImportedFormText;
