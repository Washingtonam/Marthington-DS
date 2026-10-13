const pickCandidate = (value) => {
  if (value == null) return null;
  if (Array.isArray(value)) return value.length ? pickCandidate(value[0]) : null;
  if (typeof value === 'object') return Object.keys(value).length ? value : null;
  return value;
};

const candidateHasIdentity = (candidate) => {
  if (!candidate || typeof candidate !== 'object') return false;

  const keys = [
    'firstname', 'firstName', 'surname', 'lastName', 'nin', 'phone', 'phoneno',
    'telephoneno', 'birthdate', 'dob', 'gender', 'residence_address'
  ];

  return keys.some((key) => {
    const value = candidate[key];
    return value !== undefined && value !== null && String(value).trim() !== '';
  });
};

const normalizeVerificationApiPayload = (payload) => {
  const direct = payload?.data?.data ?? payload?.data ?? payload;
  const candidate = pickCandidate(direct);

  if (!candidate) {
    return {
      status: 'not_found',
      message: 'No record found for the supplied NIN, phone number, or demographic data.',
      data: null,
    };
  }

  const nested = candidate.data ?? candidate.result ?? candidate.payload ?? candidate.response;
  const resolved = nested && typeof nested === 'object' ? pickCandidate(nested) : candidate;

  if (resolved && typeof resolved === 'object' && candidateHasIdentity(resolved)) {
    return {
      status: 'success',
      message: 'Verification completed successfully.',
      data: resolved,
    };
  }

  if (Array.isArray(candidate) && candidate.length === 0) {
    return {
      status: 'not_found',
      message: 'No record found for the supplied NIN, phone number, or demographic data.',
      data: null,
    };
  }

  if (resolved && typeof resolved === 'object' && Object.keys(resolved).length === 0) {
    return {
      status: 'not_found',
      message: 'No record found for the supplied NIN, phone number, or demographic data.',
      data: null,
    };
  }

  return {
    status: 'success',
    message: 'Verification completed successfully.',
    data: resolved ?? candidate,
  };
};

const isServiceAvailable = (service) => {
  const status = String(service?.status || 'active').toLowerCase();
  return !status || ['active', 'enabled', 'available'].includes(status);
};

const createVerificationRequestRecord = async ({
  userId,
  method,
  nin,
  phone,
  tracking_id,
  firstname,
  surname,
  gender,
  birthdate,
  unitsRequired,
  costKobo,
  apiResponseData,
  status = 'completed',
  resultMessage = 'Automated identity payload sync completed.',
  VerificationRequestModel,
  TransactionModel,
}) => {
  const resolvedStatus = status === 'failed' ? 'failed' : 'completed';

  const [savedRequest] = await VerificationRequestModel.create([
    {
      userId,
      requestType: 'verification',
      method,
      nin: nin || 'N/A',
      phone: phone || 'N/A',
      trackingId: tracking_id || 'N/A',
      firstname: firstname || 'N/A',
      surname: surname || 'N/A',
      gender: gender || 'N/A',
      birthdate: birthdate || 'N/A',
      unitsUsed: unitsRequired || 0,
      amount: (costKobo || 0) / 100,
      amountKobo: costKobo || 0,
      status: resolvedStatus,
      apiResponseData,
      statusHistory: [{ status: resolvedStatus, note: resultMessage }],
    }
  ]);

  await TransactionModel.create([
    {
      type: 'NIN_AUTO',
      unitsUsed: unitsRequired || 0,
      amount: (costKobo || 0) / 100,
      amountKobo: costKobo || 0,
      userId,
      requestId: savedRequest._id,
      status: resolvedStatus === 'failed' ? 'failed' : 'success',
    }
  ]);

  return { requestId: savedRequest._id, request: savedRequest };
};

module.exports = {
  createVerificationRequestRecord,
  normalizeVerificationApiPayload,
  isServiceAvailable,
};
