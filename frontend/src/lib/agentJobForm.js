const fields = [
  {
    key: "previousSelfServiceModification",
    labels: ["have you ever done modification before via nimc self-service portal", "previous self service modification"],
    type: "choice",
  },
  { key: "nin", labels: ["nin", "national identification number"] },
  { key: "surname", labels: ["last name/surname", "surname", "last name"] },
  { key: "firstName", labels: ["first name", "given name"] },
  { key: "middleName", labels: ["middle name"] },
  { key: "dateOfBirth", labels: ["date of birth", "dob", "birth date"], type: "date" },
  { key: "email", labels: ["email address", "email"] },
  { key: "whatsapp", labels: ["whatsapp number", "whatsapp", "gsm", "phone number", "phone"] },
];

const normalizeFormName = (value) => String(value || "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const standardFieldAliases = {
  previousSelfServiceModification: [
    "previous self service modification",
    "previous modification",
    "previous modification before",
    "have you done modification before",
    "have you ever done modification before via nimc self service portal",
  ],
  nin: ["nin", "nin number", "nin no", "national identification number", "national id number"],
  surname: ["surname", "last name", "family name", "last name surname"],
  firstName: ["first name", "firstname", "given name", "forename"],
  middleName: ["middle name", "middle names", "other name", "other names"],
  dateOfBirth: ["date of birth", "birth date", "dob"],
  email: ["email", "email address", "e mail"],
  whatsapp: ["whatsapp", "whatsapp number", "gsm", "phone", "phone number", "telephone", "mobile number"],
};

const standardFieldNames = Object.entries(standardFieldAliases).flatMap(([key, names]) => (
  names.map((name) => ({ key, name: normalizeFormName(name) }))
));

function getStandardField(field) {
  const names = [field?.key, field?.label, agentJobFieldLabels[field?.key]]
    .map(normalizeFormName)
    .filter(Boolean);
  return standardFieldNames.find((alias) => names.includes(alias.name))?.key || null;
}

function getFieldNames(field, includeStandardAliases = false) {
  const names = [field?.label, ...(field?.labels || []), field?.key, agentJobFieldLabels[field?.key]];
  if (includeStandardAliases) {
    const standardKey = getStandardField(field);
    if (standardKey) names.push(...standardFieldAliases[standardKey]);
  }
  return [...new Set(names.map(normalizeFormName).filter(Boolean))];
}

function parseLabeledLines(text, definitions) {
  const candidates = definitions.flatMap((definition, definitionIndex) => (
    getFieldNames(definition.field, definition.includeStandardAliases)
      .map((name) => ({
        key: definition.field.key,
        name,
        tokens: name.split(" "),
        priority: definitionIndex,
      }))
  )).sort((left, right) => (
    right.tokens.length - left.tokens.length
    || right.name.length - left.name.length
    || left.priority - right.priority
  ));
  const values = new Map();

  String(text || "").replace(/\r\n?/g, "\n").split("\n").forEach((rawLine) => {
    const line = rawLine.replace(/^\s*(?:[-*•]\s*)?/, "");
    const tokens = [...line.matchAll(/[a-z0-9]+/gi)];
    for (const candidate of candidates) {
      if (candidate.tokens.length > tokens.length) continue;
      const matches = candidate.tokens.every((token, index) => token === tokens[index][0].toLowerCase());
      if (!matches) continue;

      const lastToken = tokens[candidate.tokens.length - 1];
      const value = line.slice(lastToken.index + lastToken[0].length)
        .replace(/^[\s:：?=–—\-()[\]{}.,/]+/, "")
        .trim();
      values.set(candidate.key, value);
      break;
    }
  });

  return values;
}

function normalizeDateValue(value) {
  const match = String(value).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return value;
  const [, first, second, year] = match;
  const month = Number(first) > 12 ? Number(second) : Number(first);
  const day = Number(first) > 12 ? Number(first) : Number(second);
  const date = new Date(Date.UTC(Number(year), month - 1, day));
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return value;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseChoice(value, field, options) {
  const yes = value.match(/\byes\s*\[\s*([x✓✔]?)\s*\]/i);
  const no = value.match(/\bno\s*\[\s*([x✓✔]?)\s*\]/i);
  if (yes && no) {
    if (yes[1] && no[1]) return undefined;
    if (yes[1]) value = "yes";
    else if (no[1]) value = "no";
    else return "";
  }

  const plainChoice = value.match(/^\s*(yes|no)\s*$/i)?.[1];
  if (plainChoice && field.type === "checkbox") return plainChoice.toLowerCase() === "yes";
  if (plainChoice && field.type === "select") {
    return options.find((option) => String(option).toLowerCase() === plainChoice.toLowerCase()) || value;
  }
  return value;
}

export function parseAgentJobForm(text) {
  const values = parseLabeledLines(text, fields.map((field) => ({
    field: { ...field, label: field.labels[0] },
    includeStandardAliases: false,
  })));
  const result = {};
  fields.forEach((field) => {
    if (!values.has(field.key)) return;
    let value = values.get(field.key);
    if (field.type === "choice") {
      value = parseChoice(value, { type: "select" }, ["Yes", "No"]);
      if (value === undefined) return;
      if (value.toLowerCase() === "yes") value = "Yes";
      if (value.toLowerCase() === "no") value = "No";
    }
    if (field.type === "date" && value) value = normalizeDateValue(value);
    result[field.key] = value;
  });
  return result;
}

const formFieldOptions = (field) => (
  Array.isArray(field?.options)
    ? field.options
    : String(field?.options || "").split(",").map((option) => option.trim()).filter(Boolean)
);

export function generateCatalogServiceForm(formFields = []) {
  return formFields
    .filter((field) => field?.key && !["title", "subtitle", "upload"].includes(field.type))
    .map((field) => {
      const label = field.label || agentJobFieldLabels[field.key] || field.key;
      if (field.type === "select" && formFieldOptions(field).some((option) => /^(yes|no)$/i.test(String(option)))) {
        return `${label}: Yes [ ] No [ ]`;
      }
      return `${label}:`;
    })
    .join("\n");
}

export function parseCatalogServiceForm(text, formFields = []) {
  const result = {};
  const parsedStandardFields = parseAgentJobForm(text);
  const visibleFields = formFields.filter((field) => field?.key && !["title", "subtitle", "upload"].includes(field.type));
  const parsedLines = parseLabeledLines(text, visibleFields.map((field) => ({
    field,
    includeStandardAliases: true,
  })));

  visibleFields.forEach((field) => {
    if (parsedLines.has(field.key)) {
      let value = parsedLines.get(field.key);
      const options = formFieldOptions(field);
      value = parseChoice(value, field, options);
      if (value === undefined) return;
      if (field.type === "select" && value) {
        value = options.find((option) => String(option).toLowerCase() === String(value).toLowerCase()) || value;
      }
      if (field.type === "date" && typeof value === "string") value = normalizeDateValue(value);
      result[field.key] = value;
      return;
    }

    const standardKey = getStandardField(field);
    if (standardKey && Object.prototype.hasOwnProperty.call(parsedStandardFields, standardKey)) {
      let value = parsedStandardFields[standardKey];
      const options = formFieldOptions(field);
      value = parseChoice(String(value), field, options);
      if (value === undefined) return;
      if (field.type === "select" && value) {
        value = options.find((option) => String(option).toLowerCase() === String(value).toLowerCase()) || value;
      }
      result[field.key] = value;
    }
  });
  return result;
}

export function getAgentJobFormFields(serviceType) {
  if (serviceType === "name-modification") {
    return ["previousSelfServiceModification", "nin", "surname", "firstName", "middleName", "email", "whatsapp"];
  }
  if (serviceType === "date-of-birth-modification") {
    return ["previousSelfServiceModification", "nin", "surname", "firstName", "middleName", "dateOfBirth", "email", "whatsapp"];
  }
  return ["nin", "surname", "firstName", "middleName", "dateOfBirth", "email", "whatsapp"];
}

export const agentJobFieldLabels = {
  previousSelfServiceModification: "Previous self-service modification",
  nin: "NIN",
  surname: "Last name / surname",
  firstName: "First name",
  middleName: "Middle name",
  dateOfBirth: "Date of birth",
  email: "Email",
  whatsapp: "WhatsApp / GSM",
};
