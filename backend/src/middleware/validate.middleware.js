import { ApiError } from "../utils/ApiError.js";

export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;
    next();
  } catch (error) {
    const errorMessages = error.errors?.map((err) => `${err.path.join(".")}: ${err.message}`).join(", ") || error.message;
    next(ApiError.badRequest(`Validation error: ${errorMessages}`));
  }
};

