import Order from "../models/Order.js";
import Product from "../models/Product.js";

const getOrderItems = (order) => (Array.isArray(order?.items) ? order.items : []);

const getOrderRevenue = (order) => {
  const totalPrice = Number(order?.totalPrice);
  if (Number.isFinite(totalPrice) && totalPrice >= 0) {
    return totalPrice;
  }

  const totalAmount = Number(order?.totalAmount);
  if (Number.isFinite(totalAmount) && totalAmount >= 0) {
    return totalAmount;
  }

  const subtotal = Number(order?.subtotal) || 0;
  const deliveryFee = Number(order?.deliveryFee) || 0;
  return subtotal + deliveryFee;
};

const getProductStock = (product) => Number(product?.stock ?? product?.unitsAvailable ?? product?.units ?? 0) || 0;

export const getAdminAnalytics = async (_req, res, next) => {
  try {
    // Fetch all orders and products
    const orders = await Order.find();
    const products = await Product.find({}).select("name stock");

    // Create last 7 days array
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      days.push({ 
        date: label, 
        revenue: 0, 
        count: 0, 
        fullDate: d.toDateString() 
      });
    }

    console.log("Days array created:", days.map(d => ({ date: d.date, fullDate: d.fullDate })));

    // Map orders into days and track product sales
    const productSalesMap = new Map();
    let totalRevenue = 0;
    let totalProductsSold = 0;

    orders.forEach((order) => {
      const orderDate = new Date(order.createdAt).toDateString();
      const orderRevenue = getOrderRevenue(order);

      console.log(`Order ${order._id}: created=${order.createdAt}, dateString=${orderDate}, revenue=${orderRevenue}`);

      // Find matching day and add revenue
      days.forEach((day) => {
        if (day.fullDate === orderDate) {
          day.revenue += orderRevenue;
          day.count += 1;
          console.log(`  ✓ Matched to ${day.date}: revenue now ${day.revenue}, count now ${day.count}`);
        }
      });

      totalRevenue += orderRevenue;

      // Track product sales
      getOrderItems(order).forEach((item) => {
        const productName = String(item?.name || item?.product?.name || "Product").trim() || "Product";
        const quantity = Number(item?.quantity) || 0;
        if (quantity <= 0) {
          return;
        }

        totalProductsSold += quantity;
        productSalesMap.set(productName, (productSalesMap.get(productName) || 0) + quantity);
      });
    });

    console.log("Final days data:", days);

    // Calculate growth percentages (today vs yesterday)
    const today = new Date().toDateString();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toDateString();

    let todayRevenue = 0;
    let yesterdayRevenue = 0;
    let todayOrders = 0;
    let yesterdayOrders = 0;

    orders.forEach((order) => {
      const orderDate = new Date(order.createdAt).toDateString();
      const orderRevenue = getOrderRevenue(order);

      if (orderDate === today) {
        todayRevenue += orderRevenue;
        todayOrders += 1;
      }
      if (orderDate === yesterday) {
        yesterdayRevenue += orderRevenue;
        yesterdayOrders += 1;
      }
    });

    const revenueGrowth = yesterdayRevenue === 0 
      ? (todayRevenue > 0 ? 100 : 0)
      : ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;

    const ordersGrowth = yesterdayOrders === 0
      ? (todayOrders > 0 ? 100 : 0)
      : ((todayOrders - yesterdayOrders) / yesterdayOrders) * 100;

    console.log("Growth Calculation:", {
      today: { date: today, revenue: todayRevenue, orders: todayOrders },
      yesterday: { date: yesterday, revenue: yesterdayRevenue, orders: yesterdayOrders },
      revenueGrowth: revenueGrowth.toFixed(1),
      ordersGrowth: ordersGrowth.toFixed(1)
    });
    const revenueByDate = days.map((d) => ({
      date: d.date,
      revenue: d.revenue
    }));

    const ordersByDate = days.map((d) => ({
      date: d.date,
      count: d.count
    }));

    // Get low stock products
    const lowStock = products
      .map((product) => ({ name: String(product?.name || "Product"), stock: getProductStock(product) }))
      .filter((product) => product.stock < 5)
      .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name));

    // Get top products
    const topProducts = Array.from(productSalesMap.entries())
      .map(([name, sold]) => ({ name, sold }))
      .sort((a, b) => b.sold - a.sold || a.name.localeCompare(b.name))
      .slice(0, 10);

    console.log("Analytics response:", {
      totalOrders: orders.length,
      totalRevenue,
      totalProductsSold,
      revenueByDate,
      ordersByDate,
      lowStock: lowStock.length,
      topProducts: topProducts.length
    });

    res.status(200).json({
      totalOrders: orders.length,
      totalRevenue,
      totalProductsSold,
      lowStock,
      revenueByDate,
      ordersByDate,
      topProducts,
      revenueGrowth: Number(revenueGrowth.toFixed(1)),
      ordersGrowth: Number(ordersGrowth.toFixed(1))
    });
  } catch (error) {
    console.error("Analytics error:", error);
    next(error);
  }
};