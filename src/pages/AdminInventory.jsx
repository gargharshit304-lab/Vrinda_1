import { useState, useCallback, useEffect } from "react";
import { updateProductStock } from "../data/productApi";
import { showToast } from "../data/toastEvents";

const getAvailabilityStatus = (stock) => {
  if (stock === 0) {
    return { label: "Out of Stock", color: "bg-red-100 text-red-700", badge: "bg-red-500" };
  }
  if (stock < 5) {
    return { label: "Low Stock", color: "bg-yellow-100 text-yellow-700", badge: "bg-yellow-500" };
  }
  return { label: "In Stock", color: "bg-green-100 text-green-700", badge: "bg-green-500" };
};

export default function AdminInventory({ products = [] }) {
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState({});
  const [updatedProducts, setUpdatedProducts] = useState(products);

  useEffect(() => {
    setUpdatedProducts(products);
  }, [products]);

  // Sync products when they change from parent
  const handleStockUpdate = useCallback(async (productId, action) => {
    const quantity = Number(quantities[productId] || 0);

    if (!quantity || quantity <= 0) {
      showToast("Please enter a valid quantity", "error");
      return;
    }

    // Debug log
    // eslint-disable-next-line no-console
    console.log("Sending:", { action, quantity });

    setLoading((prev) => ({ ...prev, [`${productId}-${action}`]: true }));

    const previousProducts = updatedProducts;

    // Optimistic update so admin sees immediate feedback.
    setUpdatedProducts((prev) =>
      prev.map((p) => {
        const currentId = p?._id || p?.id;
        if (currentId !== productId) {
          return p;
        }

        const nextStock = Math.max(0, Number(p.stock || 0) + (action === "increase" ? quantity : -quantity));
        return { ...p, stock: nextStock };
      })
    );

    try {
      const response = await updateProductStock(productId, quantity, action);

      if (response && response.product) {
        setUpdatedProducts((prev) =>
          prev.map((p) => (p._id === productId || p.id === productId ? response.product : p))
        );

        setQuantities((prev) => ({ ...prev, [productId]: "" }));

        showToast(response.message || "Stock updated successfully", "success");
      } else {
        setUpdatedProducts(previousProducts);
        showToast("Failed to update stock", "error");
      }
    } catch (error) {
      setUpdatedProducts(previousProducts);
      const errorMsg = error?.message || error?.response?.data?.message || "Failed to update stock";
      showToast(errorMsg, "error");
    } finally {
      setLoading((prev) => ({ ...prev, [`${productId}-${action}`]: false }));
    }
  }, [quantities, updatedProducts]);

  const displayProducts = updatedProducts.length > 0 ? updatedProducts : products;

  if (!displayProducts || displayProducts.length === 0) {
    return (
      <section className="glass-card p-6">
        <p className="text-center text-sage-600">No products available for inventory management.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="glass-card p-4">
        <h3 className="font-display text-2xl font-semibold text-sage-800">Inventory Management</h3>
        <p className="mt-1 text-sm text-sage-600">
          Update product stock levels. All changes are saved to the database.
        </p>
      </div>

      <div className="max-h-[600px] overflow-y-auto pr-1">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {displayProducts.map((product) => {
            const productId = product._id || product.id;
            const stock = Number(product.stock || product.unitsAvailable || 0);
            const sold = Number(product.sold || 0);
            const availability = getAvailabilityStatus(stock);
            const imageUrl = product.image || product.images?.[0] || "";

            return (
              <article
                key={productId}
                className="glass-card overflow-hidden rounded-xl border border-sage-200/80 bg-white/80 p-3 transition duration-200 hover:-translate-y-[3px] hover:shadow-md"
              >
                <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-sage-100">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs font-semibold text-sage-400">No image</div>
                  )}
                </div>

                <div className="mt-2 space-y-2">
                  <h4 className="line-clamp-1 text-sm font-extrabold text-sage-800">{product.name}</h4>
                  <p className="text-xs font-bold text-sage-700">₹{Number(product.price || 0).toLocaleString("en-IN")}</p>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-sage-200 bg-white px-2 py-1.5">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-sage-600">Stock</p>
                      <p className="mt-0.5 text-sm font-bold text-sage-800">{stock}</p>
                    </div>
                    <div className="rounded-lg border border-sage-200 bg-white px-2 py-1.5">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-sage-600">Sold</p>
                      <p className="mt-0.5 text-sm font-bold text-sage-800">{sold}</p>
                    </div>
                  </div>

                  <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${availability.color}`}>
                    <span className={`h-2 w-2 rounded-full ${availability.badge}`} />
                    {availability.label}
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-sage-200 bg-white p-2">
                  <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-sage-600">Update Stock</p>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={quantities[productId] || ""}
                      onChange={(e) =>
                        setQuantities((prev) => ({
                          ...prev,
                          [productId]: e.target.value
                        }))
                      }
                      className="w-16 rounded-md border border-sage-200 bg-white px-2 py-1 text-xs font-semibold outline-none focus:border-sage-400"
                    />
                    <button
                      onClick={() => handleStockUpdate(productId, "increase")}
                      disabled={loading[`${productId}-increase`]}
                      className="rounded-md bg-emerald-500 px-2 py-1 text-xs font-extrabold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                    >
                      {loading[`${productId}-increase`] ? "..." : "+"}
                    </button>
                    <button
                      onClick={() => handleStockUpdate(productId, "decrease")}
                      disabled={loading[`${productId}-decrease`]}
                      className="rounded-md bg-rose-500 px-2 py-1 text-xs font-extrabold text-white transition hover:bg-rose-600 disabled:opacity-50"
                    >
                      {loading[`${productId}-decrease`] ? "..." : "-"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
