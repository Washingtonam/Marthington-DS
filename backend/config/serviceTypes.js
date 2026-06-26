const SERVICE_TYPE_ALIASES = {
  validation: 'validation',
  modify: 'modification',
  modification: 'modification',
  personalization: 'personalization',
  ipe: 'ipe',
  'self-service': 'selfService',
  selfservice: 'selfService',
  self_service: 'selfService',
  selfservice: 'selfService',
  nimc: 'nimc',
  cac: 'cac'
};

const SERVICE_TYPE_OPTIONS = [
  { value: '', label: 'All services' },
  { value: 'validation', label: 'Validation' },
  { value: 'modification', label: 'Modification' },
  { value: 'personalization', label: 'Personalization' },
  { value: 'ipe', label: 'IPE' },
  { value: 'selfService', label: 'Self Service' },
  { value: 'nimc', label: 'NIMC' },
  { value: 'cac', label: 'CAC' }
];

const normalizeServiceType = (value) => {
  if (value === null || value === undefined) return '';
  const raw = String(value).trim().toLowerCase();
  return SERVICE_TYPE_ALIASES[raw] || raw;
};

const getServiceTypeLabel = (value) => {
  const normalized = normalizeServiceType(value);
  return SERVICE_TYPE_OPTIONS.find((option) => option.value === normalized)?.label || String(value || '').trim() || 'Service';
};

module.exports = {
  SERVICE_TYPE_ALIASES,
  SERVICE_TYPE_OPTIONS,
  normalizeServiceType,
  getServiceTypeLabel
};
