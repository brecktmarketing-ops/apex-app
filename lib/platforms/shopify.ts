export interface ShopifyMetrics {
  revenue: number;
  orders: number;
  aov: number;
  sessions: number;
  visitors: number;
  cvr: number;
  productViews: number;
  addToCart: number;
  topProducts: { name: string; revenue: number; quantity: number }[];
  recentOrders: { id: string; customer: string; total: number; items: number; date: string }[];
}

export async function getShopifyMetrics(
  shopDomain: string,
  accessToken: string,
  dateRange: { since: string; until: string }
): Promise<ShopifyMetrics> {
  const base = `https://${shopDomain}/admin/api/2024-10`;
  const headers = {
    'X-Shopify-Access-Token': accessToken,
    'Content-Type': 'application/json',
  };

  // Fetch orders
  const ordersRes = await fetch(
    `${base}/orders.json?status=any&created_at_min=${dateRange.since}T00:00:00Z&created_at_max=${dateRange.until}T23:59:59Z&limit=250`,
    { headers }
  );
  const ordersData = await ordersRes.json();
  if (ordersData.errors) throw new Error(JSON.stringify(ordersData.errors));
  const orders = ordersData.orders || [];

  // Calculate revenue
  const revenue = orders.reduce((sum: number, o: any) => sum + parseFloat(o.total_price || '0'), 0);
  const orderCount = orders.length;
  const aov = orderCount > 0 ? revenue / orderCount : 0;

  // Top products
  const productMap: Record<string, { name: string; revenue: number; quantity: number }> = {};
  for (const order of orders) {
    for (const item of order.line_items || []) {
      const key = item.product_id || item.title;
      if (!productMap[key]) productMap[key] = { name: item.title, revenue: 0, quantity: 0 };
      productMap[key].revenue += parseFloat(item.price || '0') * item.quantity;
      productMap[key].quantity += item.quantity;
    }
  }
  const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // Recent orders
  const recentOrders = orders.slice(0, 20).map((o: any) => ({
    id: o.name || o.id,
    customer: o.customer ? `${o.customer.first_name || ''} ${o.customer.last_name || ''}`.trim() : 'Guest',
    total: parseFloat(o.total_price || '0'),
    items: (o.line_items || []).reduce((s: number, li: any) => s + li.quantity, 0),
    date: o.created_at,
  }));

  // Fetch visitor/session data from analytics (if available)
  let sessions = 0;
  let visitors = 0;
  let productViews = 0;
  let addToCart = 0;

  try {
    // Shopify analytics API (requires read_analytics scope)
    const analyticsRes = await fetch(
      `${base}/reports.json`,
      { headers }
    );
    const analyticsData = await analyticsRes.json();
    // Analytics data varies by plan — use what's available
    if (analyticsData.reports) {
      sessions = analyticsData.reports.find((r: any) => r.name === 'sessions')?.value || 0;
      visitors = analyticsData.reports.find((r: any) => r.name === 'visitors')?.value || 0;
    }
  } catch {
    // Analytics not available on all plans
  }

  const cvr = sessions > 0 ? (orderCount / sessions) * 100 : 0;

  return {
    revenue,
    orders: orderCount,
    aov,
    sessions,
    visitors,
    cvr,
    productViews,
    addToCart,
    topProducts,
    recentOrders,
  };
}
