// Vercel Serverless Function: /api/menu
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const SCRIPT_URL =
    process.env.VITE_APPS_SCRIPT_URL ||
    'https://script.google.com/macros/s/AKfycbwkawcrRY_1vZKKlWMMm5kAP5lO7BTosAh0Khv5_G1b3DUVS7vnHNo57DJuHnIopDilww/exec';

  try {
    const gsRes = await fetch(`${SCRIPT_URL}?action=getMenuData&_t=${Date.now()}`, { redirect: 'follow' });
    const text = await gsRes.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {}

    if (Array.isArray(data) && data.length > 0) {
      return res.status(200).json({ success: true, menu: data });
    }
  } catch (e) {
    // fallback
  }

  return res.status(200).json({ success: false, menu: [] });
}
