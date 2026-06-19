import { useState, useEffect, useCallback } from "react";
import {
  createCouponRequest,
  getAllCouponsRequest,
  updateCouponRequest,
  deleteCouponRequest,
} from "../data/couponApi";
import { showToast } from "../data/toastEvents";

const DISCOUNT_TYPES = [
  { value: "percentage", label: "Percentage (%)" },
  { value: "flat", label: "Flat Amount (₹)" },
];

const initialFormState = {
  code: "",
  discountType: "percentage",
  discountValue: "",
  minOrderAmount: "0",
  maxDiscount: "",
  expiryDate: "",
  usageLimit: "",
  isActive: true,
  description: "",
};

const toIsoExpiryDate = (value) => {
  if (!value) return "";

  // Accept yyyy-mm-dd directly from input[type=date].
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T23:59:59.999Z`);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }

  // Also support dd-mm-yyyy if it is ever passed from a custom input.
  const parts = value.split("-");
  if (parts.length === 3 && parts[0].length <= 2) {
    const [dd, mm, yyyy] = parts;
    const parsed = new Date(`${yyyy}-${mm}-${dd}T23:59:59.999Z`);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
  }

  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? "" : fallback.toISOString();
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [tableLoading, setTableLoading] = useState(false);

  // Load coupons on mount
  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    setTableLoading(true);
    try {
      const result = await getAllCouponsRequest();
      if (result.success) {
        setCoupons(result.coupons || []);
      } else {
        showToast("Failed to load coupons", "error");
      }
    } catch (error) {
      showToast(error.message || "Error loading coupons", "error");
    } finally {
      setTableLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.code.trim()) {
      newErrors.code = "Coupon code is required";
    } else if (formData.code.trim().length < 3) {
      newErrors.code = "Code must be at least 3 characters";
    } else if (formData.code.trim().length > 20) {
      newErrors.code = "Code must be at most 20 characters";
    }

    if (!formData.discountValue || Number(formData.discountValue) <= 0) {
      newErrors.discountValue = "Discount value must be greater than 0";
    }

    if (!formData.expiryDate) {
      newErrors.expiryDate = "Expiry date is required";
    } else if (new Date(formData.expiryDate) <= new Date()) {
      newErrors.expiryDate = "Expiry date must be in the future";
    }

    if (formData.minOrderAmount && Number(formData.minOrderAmount) < 0) {
      newErrors.minOrderAmount = "Minimum order amount cannot be negative";
    }

    if (formData.maxDiscount && Number(formData.maxDiscount) < 0) {
      newErrors.maxDiscount = "Max discount cannot be negative";
    }

    if (formData.usageLimit && Number(formData.usageLimit) <= 0) {
      newErrors.usageLimit = "Usage limit must be greater than 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const normalizedExpiryDate = toIsoExpiryDate(formData.expiryDate);
      const payload = {
        code: formData.code.toUpperCase().trim(),
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        minOrderAmount: Number(formData.minOrderAmount),
        maxDiscount: Number(formData.maxDiscount),
        expiryDate: normalizedExpiryDate,
        usageLimit: Number(formData.usageLimit),
        description: formData.description,
        isActive: Boolean(formData.isActive),
      };

      const cleanedPayload = {
        ...payload,
        minOrderAmount: Number.isFinite(payload.minOrderAmount) ? payload.minOrderAmount : 0,
        maxDiscount: Number.isFinite(payload.maxDiscount) ? payload.maxDiscount : null,
        usageLimit: Number.isFinite(payload.usageLimit) ? payload.usageLimit : null,
        description: formData.description,
      };

      console.log("Sending coupon data:", formData);
      console.log("Sending coupon payload:", cleanedPayload);

      if (editingId) {
        const result = await updateCouponRequest(editingId, cleanedPayload);
        if (result.success) {
          showToast("Coupon updated successfully!", "success");
          setEditingId(null);
          setFormData(initialFormState);
          loadCoupons();
        } else {
          showToast(result.message || "Failed to update coupon", "error");
        }
      } else {
        const result = await createCouponRequest(cleanedPayload);
        if (result.success) {
          showToast("Coupon created successfully!", "success");
          setFormData(initialFormState);
          loadCoupons();
        } else {
          showToast(result.message || "Failed to create coupon", "error");
        }
      }
    } catch (error) {
      showToast(error.message || "Error saving coupon", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (coupon) => {
    setEditingId(coupon._id);
    setFormData({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue.toString(),
      minOrderAmount: coupon.minOrderAmount.toString(),
      maxDiscount: coupon.maxDiscount ? coupon.maxDiscount.toString() : "",
      expiryDate: coupon.expiryDate.split("T")[0],
      usageLimit: coupon.usageLimit ? coupon.usageLimit.toString() : "",
      isActive: coupon.isActive,
      description: coupon.description || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setErrors({});
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) {
      return;
    }

    try {
      const result = await deleteCouponRequest(id);
      if (result.success) {
        showToast("Coupon deleted successfully!", "success");
        loadCoupons();
      } else {
        showToast(result.message || "Failed to delete coupon", "error");
      }
    } catch (error) {
      showToast(error.message || "Error deleting coupon", "error");
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const result = await updateCouponRequest(id, { isActive: !currentStatus });
      if (result.success) {
        showToast(`Coupon ${!currentStatus ? "activated" : "deactivated"}!`, "success");
        loadCoupons();
      } else {
        showToast(result.message || "Failed to update coupon", "error");
      }
    } catch (error) {
      showToast(error.message || "Error updating coupon", "error");
    }
  };

  const formatInr = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isExpired = (expiryDate) => new Date(expiryDate) < new Date();

  return (
    <div className="space-y-6">
      {/* Form Section */}
      <div className="rounded-2xl border border-sage-200/80 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-2xl font-bold text-sage-800">
          {editingId ? "Edit Coupon" : "Create New Coupon"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Code */}
            <div>
              <label className="block text-sm font-semibold text-sage-800 mb-1">
                Coupon Code *
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                placeholder="e.g., SAVE10"
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition ${
                  errors.code
                    ? "border-red-300 bg-red-50"
                    : "border-sage-200 bg-white hover:border-sage-300 focus:border-sage-400"
                }`}
                disabled={editingId !== null}
              />
              {errors.code && <p className="mt-1 text-xs text-red-600">{errors.code}</p>}
            </div>

            {/* Discount Type */}
            <div>
              <label className="block text-sm font-semibold text-sage-800 mb-1">
                Discount Type *
              </label>
              <select
                name="discountType"
                value={formData.discountType}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-sage-200 bg-white px-3 py-2 text-sm outline-none transition hover:border-sage-300 focus:border-sage-400"
              >
                {DISCOUNT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Discount Value */}
            <div>
              <label className="block text-sm font-semibold text-sage-800 mb-1">
                Discount Value {formData.discountType === "percentage" ? "(%)" : "(₹)"} *
              </label>
              <input
                type="number"
                name="discountValue"
                value={formData.discountValue}
                onChange={handleInputChange}
                placeholder="0"
                min="0"
                step="0.01"
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition ${
                  errors.discountValue
                    ? "border-red-300 bg-red-50"
                    : "border-sage-200 bg-white hover:border-sage-300 focus:border-sage-400"
                }`}
              />
              {errors.discountValue && (
                <p className="mt-1 text-xs text-red-600">{errors.discountValue}</p>
              )}
            </div>

            {/* Min Order Amount */}
            <div>
              <label className="block text-sm font-semibold text-sage-800 mb-1">
                Min Order Amount (₹)
              </label>
              <input
                type="number"
                name="minOrderAmount"
                value={formData.minOrderAmount}
                onChange={handleInputChange}
                placeholder="0"
                min="0"
                step="0.01"
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition ${
                  errors.minOrderAmount
                    ? "border-red-300 bg-red-50"
                    : "border-sage-200 bg-white hover:border-sage-300 focus:border-sage-400"
                }`}
              />
              {errors.minOrderAmount && (
                <p className="mt-1 text-xs text-red-600">{errors.minOrderAmount}</p>
              )}
            </div>

            {/* Max Discount (for percentage) */}
            {formData.discountType === "percentage" && (
              <div>
                <label className="block text-sm font-semibold text-sage-800 mb-1">
                  Max Discount (₹)
                </label>
                <input
                  type="number"
                  name="maxDiscount"
                  value={formData.maxDiscount}
                  onChange={handleInputChange}
                  placeholder="Leave empty for no limit"
                  min="0"
                  step="0.01"
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition ${
                    errors.maxDiscount
                      ? "border-red-300 bg-red-50"
                      : "border-sage-200 bg-white hover:border-sage-300 focus:border-sage-400"
                  }`}
                />
                {errors.maxDiscount && (
                  <p className="mt-1 text-xs text-red-600">{errors.maxDiscount}</p>
                )}
              </div>
            )}

            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-semibold text-sage-800 mb-1">
                Expiry Date *
              </label>
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleInputChange}
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition ${
                  errors.expiryDate
                    ? "border-red-300 bg-red-50"
                    : "border-sage-200 bg-white hover:border-sage-300 focus:border-sage-400"
                }`}
              />
              {errors.expiryDate && (
                <p className="mt-1 text-xs text-red-600">{errors.expiryDate}</p>
              )}
            </div>

            {/* Usage Limit */}
            <div>
              <label className="block text-sm font-semibold text-sage-800 mb-1">
                Usage Limit
              </label>
              <input
                type="number"
                name="usageLimit"
                value={formData.usageLimit}
                onChange={handleInputChange}
                placeholder="Leave empty for unlimited"
                min="1"
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition ${
                  errors.usageLimit
                    ? "border-red-300 bg-red-50"
                    : "border-sage-200 bg-white hover:border-sage-300 focus:border-sage-400"
                }`}
              />
              {errors.usageLimit && (
                <p className="mt-1 text-xs text-red-600">{errors.usageLimit}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-sage-800 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="e.g., Save 10% on orders above ₹500"
              rows="2"
              className="w-full rounded-lg border border-sage-200 bg-white px-3 py-2 text-sm outline-none transition hover:border-sage-300 focus:border-sage-400"
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="isActive"
              id="isActive"
              checked={formData.isActive}
              onChange={handleInputChange}
              className="h-4 w-4 rounded border-sage-300 text-sage-800"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-sage-800">
              Active
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-sage-800 px-6 py-2 text-sm font-semibold text-white transition duration-300 hover:bg-sage-900 disabled:opacity-50"
            >
              {loading ? "Saving..." : editingId ? "Update Coupon" : "Create Coupon"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg border border-sage-300 px-6 py-2 text-sm font-semibold text-sage-800 transition duration-300 hover:bg-sage-50"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Table Section */}
      <div className="rounded-2xl border border-sage-200/80 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-2xl font-bold text-sage-800">All Coupons</h2>

        {tableLoading ? (
          <div className="py-8 text-center">
            <p className="text-sage-600">Loading coupons...</p>
          </div>
        ) : coupons.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sage-600">No coupons created yet. Create one using the form above!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sage-200 bg-sage-50">
                  <th className="px-4 py-3 text-left font-semibold text-sage-800">Code</th>
                  <th className="px-4 py-3 text-left font-semibold text-sage-800">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-sage-800">Value</th>
                  <th className="px-4 py-3 text-left font-semibold text-sage-800">Min Order</th>
                  <th className="px-4 py-3 text-left font-semibold text-sage-800">Used / Limit</th>
                  <th className="px-4 py-3 text-left font-semibold text-sage-800">Expiry</th>
                  <th className="px-4 py-3 text-left font-semibold text-sage-800">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-sage-800">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon._id} className="border-b border-sage-100 hover:bg-sage-50">
                    <td className="px-4 py-3 font-semibold text-sage-800">{coupon.code}</td>
                    <td className="px-4 py-3 text-sage-700">
                      {coupon.discountType === "percentage" ? "%" : "₹"}
                    </td>
                    <td className="px-4 py-3 text-sage-700">
                      {coupon.discountType === "percentage"
                        ? `${coupon.discountValue}%`
                        : formatInr(coupon.discountValue)}
                    </td>
                    <td className="px-4 py-3 text-sage-700">
                      {formatInr(coupon.minOrderAmount)}
                    </td>
                    <td className="px-4 py-3 text-sage-700">
                      {coupon.usedCount}
                      {coupon.usageLimit ? ` / ${coupon.usageLimit}` : " / ∞"}
                    </td>
                    <td className="px-4 py-3 text-sage-700">
                      <span
                        className={`inline-block rounded px-2 py-1 text-xs font-semibold ${
                          isExpired(coupon.expiryDate)
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {formatDate(coupon.expiryDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(coupon._id, coupon.isActive)}
                        className={`inline-block rounded px-2 py-1 text-xs font-semibold transition ${
                          coupon.isActive
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {coupon.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(coupon)}
                          className="rounded px-2 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(coupon._id)}
                          className="rounded px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
