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
  VerificationRequestModel,
  TransactionModel,
}) => {
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
      status: 'completed',
      apiResponseData,
      statusHistory: [{ status: 'completed', note: 'Automated identity payload sync completed.' }],
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
      status: 'success',
    }
  ]);

  return { requestId: savedRequest._id, request: savedRequest };
};

module.exports = {
  createVerificationRequestRecord,
};
