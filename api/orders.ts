// Vercel Serverless Function: /api/orders
export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const SCRIPT_URL =
    process.env.VITE_APPS_SCRIPT_URL ||
    'https://script.google.com/macros/s/AKfycbwkawcrRY_1vZKKlWMMm5kAP5lO7BTosAh0Khv5_G1b3DUVS7vnHNo57DJuHnIopDilww/exec';

  if (req.method === 'GET') {
    try {
      const gsRes = await fetch(`${SCRIPT_URL}?action=getOrders&_t=${Date.now()}`, { redirect: 'follow' });
      const text = await gsRes.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {}

      if (data && data.success && Array.isArray(data.orders)) {
        return res.status(200).json({ success: true, orders: data.orders });
      }

      // Check if script responded with ping status (old version without getOrders)
      if (data && data.status === 'ok' && !data.orders) {
        return res.status(200).json({
          success: false,
          orders: [],
          needsDeployment: true,
          message: 'Google Apps Script belum diperbarui ke versi getOrders',
        });
      }

      return res.status(200).json({ success: true, orders: [], raw: data });
    } catch (e: any) {
      return res.status(200).json({ success: false, orders: [], error: e.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const order = req.body;
      const targetUrl = `${SCRIPT_URL}?action=order&payload=${encodeURIComponent(JSON.stringify(order))}`;
      const gsRes = await fetch(targetUrl, { redirect: 'follow' });
      const text = await gsRes.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {}

      return res.status(200).json({
        success: true,
        order: { ...order, syncedToSheets: true, sheetsSyncTimestamp: new Date().toISOString() },
        gsResponse: data,
      });
    } catch (e: any) {
      return res.status(200).json({ success: false, error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
