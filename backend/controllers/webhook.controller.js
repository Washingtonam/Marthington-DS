const { handleFlutterwaveWebhook } = require("./payment.controller");

const handleWebhook = async (req, res) => handleFlutterwaveWebhook(req, res);

module.exports = { handleWebhook };