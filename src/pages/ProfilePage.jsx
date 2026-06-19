import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import SiteNav from "../components/SiteNav";
import { getOrders } from "../data/orderStorage";
import { clearAuthSession, getAuthToken, USER_STORAGE_KEY } from "../data/authStorage";
import { fetchUserProfile, updateUserPassword, updateUserProfile } from "../data/userApi";
import { showToast } from "../data/toastEvents";

const VALID_TABS = ["profile", "orders", "wishlist", "addresses", "settings"];

const wishlistItems = [
  { id: "W-01", name: "Lemon Fresh Ayur Soap", price: "Rs 349", image: "/images/soap-lemon.jpeg" },
  { id: "W-02", name: "Almond Milk Moisture Bar", price: "Rs 459", image: "/images/soap-almond.jpeg" },
  { id: "W-03", name: "Golden Tiger Haldi Soap", price: "Rs 479", image: "/images/soap-golden-tiger.jpeg" }
];

const emptyAddressForm = {
  id: "",
  fullName: "",
  phone: "",
  addressLine: "",
  city: "",
  state: "",
  pincode: "",
  isDefault: false
};

const formatInr = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const getAddressId = (address, index = 0) => String(address?.id || address?._id || `address-${index}`);

const sanitizeAddressForm = (address) => ({
  id: String(address?.id || address?._id || ""),
  fullName: String(address?.fullName || "").trim(),
  phone: String(address?.phone || "").replace(/\D/g, ""),
  addressLine: String(address?.addressLine || "").trim(),
  city: String(address?.city || "").trim(),
  state: String(address?.state || "").trim(),
  pincode: String(address?.pincode || "").replace(/\D/g, ""),
  isDefault: Boolean(address?.isDefault)
});

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_STORAGE_KEY));
  } catch {
    return null;
  }
};

const persistStoredUser = (profile) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const existing = readStoredUser() || {};
    const nextUser = {
      ...existing,
      _id: existing._id || profile?.id || existing.id || "",
      id: profile?.id || existing.id || existing._id || "",
      name: profile?.name || existing.name || "",
      email: profile?.email || existing.email || "",
      phone: profile?.phone || "",
      addresses: Array.isArray(profile?.addresses) ? profile.addresses : existing.addresses || [],
      role: profile?.role || existing.role || "user"
    };

    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
    window.dispatchEvent(new Event("vrinda-auth-changed"));
  } catch {
    // Ignore local cache update failures.
  }
};

const buildAddressKey = (address) => `${String(address?.addressLine || "").trim().toLowerCase()}|${String(address?.pincode || "").replace(/\D/g, "")}`;

export default function ProfilePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [orders, setOrders] = useState(() => getOrders());
  const [expandedOrderId, setExpandedOrderId] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profileStatus, setProfileStatus] = useState("");
  const [addressStatus, setAddressStatus] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");
  const [profile, setProfile] = useState({ id: "", name: "", email: "", phone: "", addresses: [] });
  const [profileForm, setProfileForm] = useState({ name: "", phone: "", email: "" });
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [editingAddressId, setEditingAddressId] = useState("");
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  useEffect(() => {
    if (!getAuthToken()) {
      navigate("/login");
      return;
    }

    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab && VALID_TABS.includes(tab)) {
      setActiveTab(tab);
    } else {
      setActiveTab("profile");
    }
  }, [location.search, navigate]);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        setProfileLoading(true);
        const data = await fetchUserProfile();
        if (cancelled) {
          return;
        }

        const addresses = Array.isArray(data?.addresses) ? data.addresses : [];
        const nextProfile = {
          id: data?.id || data?._id || "",
          name: data?.name || "",
          email: data?.email || "",
          phone: data?.phone || "",
          addresses
        };

        setProfile(nextProfile);
        setProfileForm({
          name: nextProfile.name,
          phone: nextProfile.phone,
          email: nextProfile.email
        });

        const defaultAddress = addresses.find((address) => address?.isDefault) || addresses[0] || null;
        if (defaultAddress) {
          setAddressForm(sanitizeAddressForm(defaultAddress));
          setEditingAddressId(getAddressId(defaultAddress));
        } else {
          setAddressForm(emptyAddressForm);
          setEditingAddressId("");
        }

        persistStoredUser(nextProfile);
      } catch (error) {
        if (!cancelled) {
          setProfileStatus(error?.message || "Unable to load profile data.");
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    };

    loadProfile();

    const syncOrders = () => setOrders(getOrders());
    window.addEventListener("storage", syncOrders);
    window.addEventListener("vrinda-orders-changed", syncOrders);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", syncOrders);
      window.removeEventListener("vrinda-orders-changed", syncOrders);
    };
  }, []);

  const startAddAddress = () => {
    setAddressForm({ ...emptyAddressForm, fullName: profile.name || "", phone: profile.phone || "" });
    setEditingAddressId("");
    setAddressStatus("");
    setActiveTab("addresses");
  };

  const editAddress = (address) => {
    setEditingAddressId(getAddressId(address));
    setAddressForm(sanitizeAddressForm(address));
    setAddressStatus("");
    setActiveTab("addresses");
  };

  const deleteAddress = async (addressId) => {
    const nextAddresses = profile.addresses.filter((address, index) => getAddressId(address, index) !== addressId);
    if (nextAddresses.length && !nextAddresses.some((address) => address.isDefault)) {
      nextAddresses[0] = { ...nextAddresses[0], isDefault: true };
    }

    try {
      setAddressSaving(true);
      const response = await updateUserProfile({
        name: profile.name,
        phone: profile.phone,
        addresses: nextAddresses
      });

      const updatedAddresses = Array.isArray(response?.addresses) ? response.addresses : nextAddresses;
      const nextProfile = {
        ...profile,
        addresses: updatedAddresses
      };

      setProfile(nextProfile);
      persistStoredUser(nextProfile);
      if (editingAddressId === addressId) {
        setEditingAddressId("");
        setAddressForm(emptyAddressForm);
      }
      setAddressStatus("Address deleted successfully.");
    } catch (error) {
      setAddressStatus(error?.message || "Failed to delete address.");
    } finally {
      setAddressSaving(false);
    }
  };

  const saveAddress = async () => {
    const fullName = addressForm.fullName.trim();
    const phone = addressForm.phone.replace(/\D/g, "");
    const addressLine = addressForm.addressLine.trim();
    const city = addressForm.city.trim();
    const state = addressForm.state.trim();
    const pincode = addressForm.pincode.replace(/\D/g, "");

    if (!fullName || !phone || phone.length !== 10 || !addressLine || !city || !state || pincode.length !== 6) {
      setAddressStatus("Please complete the address with a 10-digit phone and 6-digit pincode.");
      return;
    }

    const candidate = {
      id: editingAddressId || `address-${Date.now()}`,
      fullName,
      phone,
      addressLine,
      city,
      state,
      pincode,
      isDefault: Boolean(addressForm.isDefault)
    };

    let nextAddresses = profile.addresses.map((address, index) => ({ ...address, id: getAddressId(address, index) }));
    const existingIndex = nextAddresses.findIndex((address) => address.id === editingAddressId || buildAddressKey(address) === buildAddressKey(candidate));

    if (existingIndex >= 0) {
      nextAddresses[existingIndex] = { ...candidate, id: nextAddresses[existingIndex].id || candidate.id };
    } else {
      nextAddresses = [...nextAddresses, candidate];
    }

    if (candidate.isDefault || nextAddresses.length === 1) {
      nextAddresses = nextAddresses.map((address, index) => ({ ...address, isDefault: index === 0 }));
      nextAddresses[existingIndex >= 0 ? existingIndex : nextAddresses.length - 1].isDefault = true;
    } else if (!nextAddresses.some((address) => address.isDefault) && nextAddresses.length) {
      nextAddresses[0].isDefault = true;
    }

    try {
      setAddressSaving(true);
      setAddressStatus("");

      const response = await updateUserProfile({
        name: profileForm.name.trim(),
        phone: profileForm.phone.replace(/\D/g, "") || phone,
        addresses: nextAddresses
      });

      const updatedAddresses = Array.isArray(response?.addresses) ? response.addresses : nextAddresses;
      const nextProfile = {
        ...profile,
        name: response?.name || profile.name,
        email: response?.email || profile.email,
        phone: response?.phone || profile.phone,
        addresses: updatedAddresses
      };

      setProfile(nextProfile);
      setProfileForm((current) => ({
        ...current,
        name: nextProfile.name,
        phone: nextProfile.phone,
        email: nextProfile.email
      }));
      persistStoredUser(nextProfile);
      setAddressForm(emptyAddressForm);
      setEditingAddressId("");
      setAddressStatus("Address saved successfully.");
    } catch (error) {
      setAddressStatus(error?.message || "Failed to save address.");
    } finally {
      setAddressSaving(false);
    }
  };

  const updatePassword = async () => {
    const currentPassword = passwordForm.currentPassword.trim();
    const newPassword = passwordForm.newPassword.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      const message = "Please fill in current password, new password, and confirm password.";
      setPasswordStatus(message);
      showToast(message, "error");
      return;
    }

    if (newPassword.length < 8) {
      const message = "New password must be at least 8 characters long.";
      setPasswordStatus(message);
      showToast(message, "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      const message = "New password and confirm password do not match.";
      setPasswordStatus(message);
      showToast(message, "error");
      return;
    }

    try {
      setPasswordSaving(true);
      setPasswordStatus("");

      const response = await updateUserPassword({ currentPassword, newPassword });
      const successMessage = response?.message || "Password updated successfully.";

      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordStatus(successMessage);
      showToast(successMessage, "success");
    } catch (error) {
      const errorMessage = error?.status === 401 ? "Current password is incorrect." : error?.message || "Failed to update password.";
      setPasswordStatus(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setPasswordSaving(false);
    }
  };

  const currentUser = useMemo(() => {
    const stored = readStoredUser();
    return {
      name: profile.name || stored?.name || "",
      email: profile.email || stored?.email || "",
      role: profile.role || stored?.role || "user"
    };
  }, [profile]);

  const initials = useMemo(() => {
    const name = currentUser.name || "";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (name.slice(0, 2) || "U").toUpperCase();
  }, [currentUser.name]);

  const openTab = (tab) => {
    setActiveTab(tab);
    navigate(`/profile?tab=${tab}`, { replace: true });
  };

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login");
  };

  const saveProfile = async () => {
    const name = profileForm.name.trim();
    const phone = profileForm.phone.replace(/\D/g, "");

    if (!name) {
      setProfileStatus("Name is required.");
      return;
    }

    try {
      setProfileSaving(true);
      setProfileStatus("");

      const response = await updateUserProfile({
        name,
        phone,
        addresses: profile.addresses
      });

      const nextProfile = {
        ...profile,
        name: response?.name || name,
        email: response?.email || profile.email,
        phone: response?.phone || phone,
        addresses: Array.isArray(response?.addresses) ? response.addresses : profile.addresses
      };

      setProfile(nextProfile);
      setProfileForm({
        name: nextProfile.name,
        phone: nextProfile.phone,
        email: nextProfile.email
      });
      persistStoredUser(nextProfile);
      setProfileStatus("Profile saved successfully.");
      showToast("Profile saved successfully.", "success");
    } catch (error) {
      setProfileStatus(error?.message || "Failed to save profile.");
      showToast(error?.message || "Failed to save profile.", "error");
    } finally {
      setProfileSaving(false);
    }
  };

  if (!getAuthToken()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="pb-12">
      <SiteNav />
      <main className="mx-auto mt-6 w-[min(1200px,94vw)]">
        <section className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="glass-card rounded-3xl border border-white/70 bg-[#f8f3ea]/90 p-5 shadow-[0_16px_30px_rgba(31,61,43,0.08)] lg:sticky lg:top-28">
            <div className="rounded-2xl border border-white/70 bg-white/70 p-4 text-center shadow-sm">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-sage-700 to-sage-500 text-lg font-extrabold text-white shadow-md">
                {initials}
              </div>
              <h1 className="mt-3 text-lg font-bold text-sage-800">{currentUser.name || "Profile"}</h1>
              <p className="text-sm text-sage-700/80">{currentUser.email || "No email saved"}</p>
            </div>

            <div className="mt-4 hidden space-y-1.5 lg:block">
              <SidebarButton label="My Profile" active={activeTab === "profile"} onClick={() => openTab("profile")} />
              <SidebarButton label="My Orders" active={activeTab === "orders"} onClick={() => openTab("orders")} />
              <SidebarButton label="Wishlist" active={activeTab === "wishlist"} onClick={() => openTab("wishlist")} />
              <SidebarButton label="Addresses" active={activeTab === "addresses"} onClick={() => openTab("addresses")} />
              <SidebarButton label="Settings" active={activeTab === "settings"} onClick={() => openTab("settings")} />
              <button
                type="button"
                onClick={handleLogout}
                className="mt-2 w-full rounded-xl border border-rose-200/80 bg-rose-50 px-4 py-2.5 text-left text-sm font-semibold text-rose-700 transition duration-300 hover:bg-rose-100"
              >
                Logout
              </button>
            </div>
          </aside>

          <section className="space-y-4">
            <div className="glass-card rounded-2xl border border-white/70 bg-white/65 p-2 lg:hidden">
              <div className="flex gap-2 overflow-x-auto pb-1">
                <MobileTab label="Profile" active={activeTab === "profile"} onClick={() => openTab("profile")} />
                <MobileTab label="Orders" active={activeTab === "orders"} onClick={() => openTab("orders")} />
                <MobileTab label="Wishlist" active={activeTab === "wishlist"} onClick={() => openTab("wishlist")} />
                <MobileTab label="Addresses" active={activeTab === "addresses"} onClick={() => openTab("addresses")} />
                <MobileTab label="Settings" active={activeTab === "settings"} onClick={() => openTab("settings")} />
              </div>
            </div>

            <div key={activeTab} className="animate-fadeUp">
              {activeTab === "profile" && (
                <section className="glass-card rounded-3xl border border-white/70 bg-white/65 p-6 shadow-soft sm:p-8">
                  <div className="mb-5 flex items-center justify-between gap-2">
                    <h2 className="font-display text-4xl font-semibold text-sage-800">My Profile</h2>
                    <button
                      type="button"
                      onClick={saveProfile}
                      disabled={profileSaving}
                      className="rounded-full bg-sage-700 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-white transition duration-300 hover:-translate-y-0.5 hover:bg-sage-800 disabled:opacity-60"
                    >
                      {profileSaving ? "Saving..." : "Save Profile"}
                    </button>
                  </div>

                  {profileStatus ? (
                    <p className="mb-4 rounded-2xl border border-sage-200 bg-sage-50 px-4 py-3 text-sm font-semibold text-sage-700">{profileStatus}</p>
                  ) : null}

                  {profileLoading ? (
                    <p className="mb-4 rounded-2xl border border-sage-200/80 bg-white/70 px-4 py-3 text-sm font-semibold text-sage-700">
                      Loading your saved profile...
                    </p>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <ProfileField
                      label="Full Name"
                      value={profileForm.name}
                      onChange={(value) => setProfileForm((prev) => ({ ...prev, name: value }))}
                    />
                    <ProfileField
                      label="Email"
                      value={profileForm.email}
                      disabled
                      onChange={() => {}}
                    />
                    <ProfileField
                      label="Phone Number"
                      value={profileForm.phone}
                      onChange={(value) => setProfileForm((prev) => ({ ...prev, phone: value }))}
                      placeholder="10-digit phone number"
                    />
                    <div className="rounded-2xl border border-sage-200/80 bg-white/70 p-4 text-sm text-sage-700">
                      Saved phone and addresses are loaded from your profile database record. If nothing is saved yet, the fields stay blank.
                    </div>
                  </div>
                </section>
              )}

              {activeTab === "orders" && (
                <section className="space-y-3">
                  <h2 className="font-display text-4xl font-semibold text-sage-800">My Orders</h2>
                  {orders.length > 0 ? (
                    <div className="orders-scroll h-[70vh] space-y-4 overflow-y-auto pb-4 pr-1 lg:max-h-[75vh]">
                      {orders.map((order) => {
                        const isExpanded = expandedOrderId === order.id;

                        return (
                          <article
                            key={order.id}
                            className="glass-card rounded-3xl border border-white/70 bg-white/65 p-4 shadow-soft"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="space-y-1">
                                <p className="text-[0.7rem] font-bold uppercase tracking-[0.22em] text-sage-700/75">Order ID</p>
                                <p className="text-base font-extrabold text-sage-800">{order.id}</p>
                                <p className="text-sm font-medium text-sage-700">{formatDate(order.date)}</p>
                              </div>

                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
                                    order.status === "Delivered"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-amber-100 text-amber-700"
                                  }`}
                                >
                                  {order.status || "Pending"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setExpandedOrderId((current) => (current === order.id ? "" : order.id))}
                                  className="rounded-full border border-sage-200/80 bg-white/85 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.1em] text-sage-800 transition duration-300 hover:-translate-y-0.5 hover:bg-white"
                                >
                                  {isExpanded ? "Hide Details" : "View Details"}
                                </button>
                              </div>
                            </div>

                            {isExpanded ? (
                              <div className="mt-4 rounded-2xl border border-sage-200/70 bg-[#faf7f0]/85 p-4">
                                <div className="space-y-2">
                                  {(order.items || []).map((item) => (
                                    <div key={`${order.id}-${item.id}`} className="flex items-start justify-between gap-3 text-sm">
                                      <p className="min-w-0 font-semibold text-sage-800">
                                        {item.name} <span className="font-medium text-sage-600">x {item.quantity}</span>
                                      </p>
                                      <p className="font-extrabold text-sage-800">{formatInr(Number(item.price || 0) * Number(item.quantity || 0))}</p>
                                    </div>
                                  ))}
                                </div>

                                <div className="mt-3 h-px bg-sage-200/80" />
                                <div className="mt-3 flex items-center justify-between">
                                  <p className="text-sm font-bold text-sage-700">Total</p>
                                  <p className="text-base font-extrabold text-sage-800">{formatInr(order.total || 0)}</p>
                                </div>
                              </div>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="glass-card rounded-2xl border border-white/70 bg-white/65 p-6 text-sm font-medium text-sage-700">
                      You have not placed any orders yet.
                    </div>
                  )}
                </section>
              )}

              {activeTab === "wishlist" && (
                <section className="space-y-3">
                  <h2 className="font-display text-4xl font-semibold text-sage-800">Wishlist</h2>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {wishlistItems.map((item) => (
                      <article
                        key={item.id}
                        className="glass-card group rounded-3xl border border-white/70 bg-white/65 p-4 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_30px_rgba(31,61,43,0.12)]"
                      >
                        <div className="overflow-hidden rounded-2xl">
                          <img src={item.image} alt={item.name} className="h-44 w-full object-cover transition duration-700 group-hover:scale-105" />
                        </div>
                        <h3 className="mt-3 text-base font-bold text-sage-800">{item.name}</h3>
                        <p className="text-sm font-semibold text-sage-700">{item.price}</p>
                        <button className="mt-3 w-full rounded-full bg-sage-700 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-white transition duration-300 hover:-translate-y-0.5 hover:bg-sage-800">
                          Move to Cart
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {activeTab === "addresses" && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="font-display text-4xl font-semibold text-sage-800">Addresses</h2>
                      <p className="mt-1 text-sm text-sage-700">Saved addresses are stored in your profile and used to prefill checkout.</p>
                    </div>
                    <button
                      type="button"
                      onClick={startAddAddress}
                      className="rounded-full border border-sage-200/80 bg-white/80 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-sage-800 transition duration-300 hover:-translate-y-0.5 hover:bg-white"
                    >
                      Add Address
                    </button>
                  </div>

                  {addressStatus ? (
                    <p className="rounded-2xl border border-sage-200 bg-sage-50 px-4 py-3 text-sm font-semibold text-sage-700">{addressStatus}</p>
                  ) : null}

                  <article className="glass-card rounded-3xl border border-white/70 bg-white/65 p-5 shadow-soft">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <ProfileField
                        label="Full Name"
                        value={addressForm.fullName}
                        onChange={(value) => setAddressForm((prev) => ({ ...prev, fullName: value }))}
                      />
                      <ProfileField
                        label="Phone"
                        value={addressForm.phone}
                        onChange={(value) => setAddressForm((prev) => ({ ...prev, phone: value }))}
                        placeholder="10-digit phone number"
                      />
                      <ProfileField
                        label="Address Line"
                        value={addressForm.addressLine}
                        onChange={(value) => setAddressForm((prev) => ({ ...prev, addressLine: value }))}
                        className="sm:col-span-2"
                      />
                      <ProfileField
                        label="City"
                        value={addressForm.city}
                        onChange={(value) => setAddressForm((prev) => ({ ...prev, city: value }))}
                      />
                      <ProfileField
                        label="State"
                        value={addressForm.state}
                        onChange={(value) => setAddressForm((prev) => ({ ...prev, state: value }))}
                      />
                      <ProfileField
                        label="Pincode"
                        value={addressForm.pincode}
                        onChange={(value) => setAddressForm((prev) => ({ ...prev, pincode: value }))}
                        placeholder="6-digit pincode"
                      />
                    </div>

                    <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-sage-800">
                      <input
                        type="checkbox"
                        checked={addressForm.isDefault}
                        onChange={(event) => setAddressForm((prev) => ({ ...prev, isDefault: event.target.checked }))}
                      />
                      Make this the default address
                    </label>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={saveAddress}
                        disabled={addressSaving}
                        className="rounded-full bg-sage-700 px-5 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-white transition duration-300 hover:-translate-y-0.5 hover:bg-sage-800 disabled:opacity-60"
                      >
                        {addressSaving ? "Saving..." : editingAddressId ? "Update Address" : "Save Address"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddressForm(emptyAddressForm);
                          setEditingAddressId("");
                          setAddressStatus("");
                        }}
                        className="rounded-full border border-sage-200/80 bg-white px-5 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-sage-800 transition duration-300 hover:bg-white"
                      >
                        Reset
                      </button>
                    </div>
                  </article>

                  <div className="space-y-3">
                    {profile.addresses.length > 0 ? (
                      profile.addresses.map((address, index) => {
                        const addressId = getAddressId(address, index);
                        return (
                          <article key={addressId} className="glass-card rounded-3xl border border-white/70 bg-white/65 p-5 shadow-soft">
                            <div className="flex items-center justify-between gap-3">
                              <h3 className="text-lg font-bold text-sage-800">{address.fullName || "Saved Address"}</h3>
                              {address.isDefault ? (
                                <span className="rounded-full bg-sage-700/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-sage-700">Default</span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-sm font-semibold text-sage-700">{address.phone}</p>
                            <p className="text-sm text-sage-700/85">
                              {address.addressLine}, {address.city}, {address.state} - {address.pincode}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => editAddress(address)}
                                className="rounded-full border border-sage-200/80 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-sage-800 transition duration-300 hover:bg-white"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteAddress(addressId)}
                                disabled={addressSaving}
                                className="rounded-full border border-rose-200/80 bg-rose-50 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-rose-700 transition duration-300 hover:bg-rose-100 disabled:opacity-60"
                              >
                                Delete
                              </button>
                            </div>
                          </article>
                        );
                      })
                    ) : (
                      <div className="glass-card rounded-2xl border border-white/70 bg-white/65 p-6 text-sm font-medium text-sage-700">
                        No saved addresses yet. Add one to auto-fill checkout next time.
                      </div>
                    )}
                  </div>
                </section>
              )}

              {activeTab === "settings" && (
                <section className="space-y-3">
                  <h2 className="font-display text-4xl font-semibold text-sage-800">Settings</h2>

                  <article className="glass-card rounded-3xl border border-white/70 bg-white/65 p-6 shadow-soft">
                    <h3 className="text-lg font-bold text-sage-800">Change Password</h3>
                    {passwordStatus ? (
                      <p className="mt-3 rounded-2xl border border-sage-200 bg-sage-50 px-4 py-3 text-sm font-semibold text-sage-700">{passwordStatus}</p>
                    ) : null}
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <input
                        type="password"
                        placeholder="Current password"
                        value={passwordForm.currentPassword}
                        onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                        className="rounded-xl border border-sage-200/80 bg-white/90 px-3 py-2.5 text-sm text-sage-800 outline-none transition focus:border-sage-400"
                      />
                      <input
                        type="password"
                        placeholder="New password"
                        value={passwordForm.newPassword}
                        onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                        className="rounded-xl border border-sage-200/80 bg-white/90 px-3 py-2.5 text-sm text-sage-800 outline-none transition focus:border-sage-400"
                      />
                      <input
                        type="password"
                        placeholder="Confirm new password"
                        value={passwordForm.confirmPassword}
                        onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                        className="rounded-xl border border-sage-200/80 bg-white/90 px-3 py-2.5 text-sm text-sage-800 outline-none transition focus:border-sage-400 sm:col-span-2"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={updatePassword}
                      disabled={passwordSaving}
                      className="mt-4 rounded-full bg-sage-700 px-5 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-white transition duration-300 hover:-translate-y-0.5 hover:bg-sage-800 disabled:opacity-60"
                    >
                      {passwordSaving ? "Updating..." : "Update Password"}
                    </button>
                  </article>

                  <article className="glass-card rounded-3xl border border-white/70 bg-white/65 p-6 shadow-soft">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-sage-800">Notifications</h3>
                        <p className="text-sm text-sage-700/85">Get order updates and new product alerts.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotificationsEnabled((value) => !value)}
                        className={`relative h-8 w-14 rounded-full transition duration-300 ${
                          notificationsEnabled ? "bg-sage-700" : "bg-sage-200"
                        }`}
                        aria-pressed={notificationsEnabled}
                      >
                        <span
                          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all duration-300 ${
                            notificationsEnabled ? "left-7" : "left-1"
                          }`}
                        />
                      </button>
                    </div>
                  </article>
                </section>
              )}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}

function SidebarButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl px-4 py-2.5 text-left text-sm font-semibold tracking-[0.02em] transition duration-300 ease-in-out ${
        active ? "bg-sage-700 text-white shadow-[0_10px_20px_rgba(31,61,43,0.22)]" : "text-sage-800 hover:bg-white/75 hover:text-[#1f3d2b]"
      }`}
    >
      {label}
    </button>
  );
}

function MobileTab({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-extrabold uppercase tracking-[0.08em] transition duration-300 ${
        active ? "bg-sage-700 text-white shadow-[0_10px_20px_rgba(31,61,43,0.22)]" : "bg-white/75 text-sage-800"
      }`}
    >
      {label}
    </button>
  );
}

function ProfileField({ label, value, onChange, disabled = false, placeholder = "" , className = ""}) {
  return (
    <label className={`text-sm font-bold text-sage-800 ${className}`}>
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={`mt-1 w-full rounded-xl border px-3 py-3 text-sm outline-none transition ${
          disabled ? "border-sage-200/70 bg-sage-100/60 text-sage-700" : "border-sage-300/80 bg-white/90 text-sage-800 focus:border-sage-500"
        }`}
      />
    </label>
  );
}