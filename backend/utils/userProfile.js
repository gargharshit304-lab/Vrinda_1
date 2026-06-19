import User from "../models/User.js";

const trimValue = (value) => String(value ?? "").trim();

const digitsOnly = (value) => trimValue(value).replace(/\D/g, "");

const buildValidationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

export const normalizePhone = (value) => {
  const phone = digitsOnly(value);
  if (!phone) {
    return "";
  }

  return phone.length === 10 ? phone : "";
};

export const normalizePincode = (value) => {
  const pincode = digitsOnly(value);
  if (!pincode) {
    return "";
  }

  return pincode.length === 6 ? pincode : "";
};

export const normalizeAddressInput = (address = {}) => {
  const fullName = trimValue(address.fullName);
  const phone = normalizePhone(address.phone || address.phoneNumber);
  const addressLine = trimValue(address.addressLine || address.address);
  const city = trimValue(address.city);
  const state = trimValue(address.state);
  const pincode = normalizePincode(address.pincode);

  const hasAnyValue = Boolean(fullName || phone || addressLine || city || state || pincode);
  if (!hasAnyValue) {
    return null;
  }

  if (!fullName) {
    throw buildValidationError("fullName is required for an address");
  }

  if (!phone) {
    throw buildValidationError("phone must be a 10-digit number");
  }

  if (!addressLine) {
    throw buildValidationError("addressLine is required for an address");
  }

  if (!city) {
    throw buildValidationError("city is required for an address");
  }

  if (!state) {
    throw buildValidationError("state is required for an address");
  }

  if (!pincode) {
    throw buildValidationError("pincode must be a valid 6-digit number");
  }

  return {
    fullName,
    phone,
    addressLine,
    city,
    state,
    pincode,
    isDefault: Boolean(address.isDefault)
  };
};

export const sanitizeStoredAddress = (address = {}) => ({
  id: address._id?.toString?.() || address.id || "",
  fullName: trimValue(address.fullName),
  phone: normalizePhone(address.phone || address.phoneNumber),
  addressLine: trimValue(address.addressLine || address.address),
  city: trimValue(address.city),
  state: trimValue(address.state),
  pincode: normalizePincode(address.pincode),
  isDefault: Boolean(address.isDefault)
});

export const sanitizeStoredAddresses = (addresses = []) => {
  if (!Array.isArray(addresses)) {
    return [];
  }

  const sanitized = addresses.map(sanitizeStoredAddress).filter((address) => {
    return Boolean(address.fullName || address.phone || address.addressLine || address.city || address.state || address.pincode);
  });

  if (sanitized.length && !sanitized.some((address) => address.isDefault)) {
    sanitized[0].isDefault = true;
  }

  return sanitized;
};

export const dedupeAddresses = (addresses = []) => {
  const sanitized = sanitizeStoredAddresses(addresses);
  const seen = new Set();

  return sanitized.filter((address) => {
    const key = `${address.addressLine.toLowerCase()}|${address.pincode}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

export const buildProfilePayload = (user) => ({
  id: user?._id?.toString?.() || user?.id || "",
  name: trimValue(user?.name),
  email: trimValue(user?.email).toLowerCase(),
  phone: normalizePhone(user?.phone),
  addresses: sanitizeStoredAddresses(user?.addresses),
  role: user?.role || "user"
});

export const normalizeProfileUpdateAddresses = (addresses = []) => {
  if (!Array.isArray(addresses)) {
    throw buildValidationError("addresses must be an array");
  }

  const normalized = addresses
    .map((address) => {
      if (!address || typeof address !== "object") {
        throw buildValidationError("Each address must be an object");
      }

      const parsed = normalizeAddressInput(address);
      if (!parsed) {
        throw buildValidationError("Each address must contain fullName, phone, addressLine, city, state, and pincode");
      }

      return parsed;
    })
    .filter(Boolean);

  const deduped = dedupeAddresses(normalized);
  if (deduped.length && !deduped.some((address) => address.isDefault)) {
    deduped[0].isDefault = true;
  }

  return deduped;
};

export const syncUserAddressFromOrder = async (userId, shippingAddress) => {
  const user = await User.findById(userId);
  if (!user) {
    return null;
  }

  const normalizedAddress = normalizeAddressInput(shippingAddress);
  if (!normalizedAddress) {
    return user;
  }

  if (!user.phone && normalizedAddress.phone) {
    user.phone = normalizedAddress.phone;
  }

  const addresses = dedupeAddresses(user.addresses || []);
  const candidateKey = `${normalizedAddress.addressLine.toLowerCase()}|${normalizedAddress.pincode}`;
  const hasExisting = addresses.some((address) => `${address.addressLine.toLowerCase()}|${address.pincode}` === candidateKey);

  if (!hasExisting) {
    addresses.push({
      ...normalizedAddress,
      isDefault: addresses.length === 0
    });
  }

  if (addresses.length && !addresses.some((address) => address.isDefault)) {
    addresses[0].isDefault = true;
  }

  user.addresses = addresses;
  await user.save();
  return user;
};