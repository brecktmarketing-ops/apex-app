export interface WooMetrics {
  revenue: number;
  orders: number;
  aov: number;
  topProducts: { name: string; revenue: number; quantity: number }[];
  recentOrders: { id: string; customer: string; total: number; items: number; date: string; status: string }[];
}

export async function getWooCommerceMetrics(
  siteUrl: string,
  consumerKey: string,
  consumerSecret: string,
  dateRange: { since: string; until: string }
): Promise<WooMetrics> {
  const base = siteUrl.replace(/\/$/, '');
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  const headers = { 'Authorization': `Basic ${auth}` };

  // Fetch orders
  const ordersRes = await fetch(
    `${base}/wp-json/wc/v3/orders?after=${dateRange.since}T00:00:00&before=${dateRange.until}T23:59:59&per_page=100&status=completed,processing`,
    { headers }
  );

  if (!ordersRes.ok) {
    const err = await ordersRes.text();
    throw new Error(`WooCommerce API error: ${ordersRes.status} ${err.substring(0, 200)}`);
  }

  const orders = await ordersRes.json();

  const revenue = orders.reduce((sum: number, o: any) => sum + parseFloat(o.total || '0'), 0);
  const orderCount = orders.length;
  const aov = orderCount > 0 ? revenue / orderCount : 0;

  // Top products
  const productMap: Record<string, { name: string; revenue: number; quantity: number }> = {};
  for (const order of orders) {
    for (const item of order.line_items || []) {
      const key = item.product_id || item.name;
      if (!productMap[key]) productMap[key] = { name: item.name, revenue: 0, quantity: 0 };
      productMap[key].revenue += parseFloat(item.total || '0');
      productMap[key].quantity += item.quantity;
    }
  }
  const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // Recent orders
  const recentOrders = orders.slice(0, 20).map((o: any) => ({
    id: `#${o.id}`,
    customer: o.billing ? `${o.billing.first_name || ''} ${o.billing.last_name || ''}`.trim() : 'Guest',
    total: parseFloat(o.total || '0'),
    items: (o.line_items || []).reduce((s: number, li: any) => s + li.quantity, 0),
    date: o.date_created,
    status: o.status,
  }));

  return { revenue, orders: orderCount, aov, topProducts, recentOrders };
}
