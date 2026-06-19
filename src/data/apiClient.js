import { getAuthToken } from "./authStorage";

const API_BASE_URL = "/api";

const readJsonSafely = async (response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

export const apiRequest = async (path, options = {}) => {
  const { auth = false, headers = {}, ...rest } = options;
  const token = getAuthToken();
  const url = `${API_BASE_URL}${path}`;
  const method = String(rest.method || "GET").toUpperCase();
  const isFormData = typeof FormData !== "undefined" && rest.body instanceof FormData;

  // Convert body to JSON string if it's an object and not FormData
  let body = rest.body;
  if (body && typeof body === "object" && !isFormData) {
    body = JSON.stringify(body);
  }

  // eslint-disable-next-line no-console
  console.log("[api/request]", {
    method: rest.method || "GET",
    url,
    auth,
    isFormData,
    bodyType: typeof rest.body
  });

  let response;

  try {
    response = await fetch(url, {
      ...rest,
      method,
      body,
      cache: method === "GET" ? "no-store" : rest.cache,
      headers: {
        ...(!isFormData ? { "Content-Type": "application/json" } : {}),
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers
      }
    });
  } catch (networkError) {
    // eslint-disable-next-line no-console
    console.error("[api/network-error]", {
      method: rest.method || "GET",
      url,
      message: networkError?.message || "Network request failed"
    });

    const error = new Error("Unable to reach the server. Ensure backend is running and MongoDB is available.");
    error.status = 0;
    throw error;
  }

  const data = await readJsonSafely(response);

  // eslint-disable-next-line no-console
  console.log("[api/response]", {
    method: rest.method || "GET",
    url,
    status: response.status,
    ok: response.ok
  });

  if (!response.ok) {
    const message = data?.message || "Request failed";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
};
