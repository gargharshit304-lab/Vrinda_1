import { apiRequest } from "./apiClient";

export const fetchUserProfile = async () => {
  return apiRequest("/user/profile", {
    method: "GET",
    auth: true
  });
};

export const updateUserProfile = async ({ name, phone, addresses }) => {
  return apiRequest("/user/profile", {
    method: "PUT",
    auth: true,
    body: {
      name,
      phone,
      addresses
    }
  });
};

export const updateUserPassword = async ({ currentPassword, newPassword }) => {
  return apiRequest("/users/update-password", {
    method: "PUT",
    auth: true,
    body: {
      currentPassword,
      newPassword
    }
  });
};