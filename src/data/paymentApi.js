import { apiRequest } from "./apiClient";

export const createRazorpayOrder = async (amount) => {
  return apiRequest("/payment/create-order", {
    method: "POST",
    auth: true,
    body: { amount }
  });
};

export const verifyRazorpayPayment = async (payload) => {
  return apiRequest("/payment/verify", {
    method: "POST",
    auth: true,
    body: payload
  });
};
