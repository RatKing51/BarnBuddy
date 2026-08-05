const POSTGRES_INPUT_ERROR_CODES = new Set([
  "22P02", // invalid_text_representation
  "22001", // string_data_right_truncation
  "22003", // numeric_value_out_of_range
  "22007", // invalid_datetime_format
  "22008", // datetime_field_overflow
  "23502", // not_null_violation
  "23503", // foreign_key_violation
  "23514", // check_violation
]);

function getClientError(error) {
  if (Number.isInteger(error?.status) && error.status >= 400 && error.status < 500) {
    return { status: error.status, message: error.message || "The request is invalid." };
  }
  if (error?.code === "23505") {
    return { status: 409, message: "That record already exists." };
  }
  if (POSTGRES_INPUT_ERROR_CODES.has(error?.code)) {
    return {
      status: 400,
      message: "One or more fields contain an invalid value. Check dates, numbers, and selections, then try again.",
    };
  }
  return null;
}

function sendRouteError(res, error, fallbackMessage) {
  const clientError = getClientError(error);
  if (clientError) return res.status(clientError.status).json({ error: clientError.message });
  return res.status(500).json({ error: fallbackMessage });
}

module.exports = {
  getClientError,
  sendRouteError,
};
