import bcrypt from 'bcryptjs';
import { timingSafeEqual } from 'node:crypto';

const API = 'https://api.commerce.naver.com/external';

function kstBefore24Hours() {
  const d = new Date(Date.now() - 86_400_000);
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(d).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.000+09:00`;
}

async function naver(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || `네이버 API 오류 (${response.status})`);
  return body;
}

async function createToken() {
  const id = process.env.NAVER_CLIENT_ID;
  const secret = process.env.NAVER_CLIENT_SECRET;
  if (!id || !secret) throw new Error('Vercel 환경 변수에 NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET을 등록해 주세요.');
  const timestamp = Date.now().toString();
  const signature = Buffer.from(bcrypt.hashSync(`${id}_${timestamp}`, secret)).toString('base64');
  const body = new URLSearchParams({ client_id: id, timestamp, client_secret_sign: signature, grant_type: 'client_credentials', type: 'SELF' });
  const result = await naver('/v1/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  return result.access_token;
}

function hasAccess(req) {
  const expected = process.env.APP_ACCESS_PASSWORD;
  const header = req.headers.authorization || '';
  if (!expected || !header.startsWith('Basic ')) return false;
  const value = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const password = value.slice(value.indexOf(':') + 1);
  const actual = Buffer.from(password);
  const secret = Buffer.from(expected);
  return actual.length === secret.length && timingSafeEqual(actual, secret);
}

function toDisplayOrder(item) {
  const order = item.order || {};
  const productOrder = item.productOrder || {};
  const shipping = productOrder.shippingAddress || productOrder.deliveryAddress || {};
  return {
    id: String(productOrder.productOrderId || order.orderId),
    order: String(order.orderId || productOrder.orderId || '-'),
    product: productOrder.productName || productOrder.productOrderName || '-',
    quantity: productOrder.quantity || 1,
    sender: order.ordererName || '-',
    recipient: shipping.name || shipping.receiverName || productOrder.receiverName || '-',
    phone: shipping.tel1 || shipping.tel2 || productOrder.receiverTel || '-',
    postcode: shipping.zipCode || shipping.postalCode || '-',
    address: [shipping.baseAddress, shipping.detailedAddress].filter(Boolean).join(' ') || '-',
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'GET 요청만 사용할 수 있습니다.' });
  if (!process.env.APP_ACCESS_PASSWORD) return res.status(500).json({ message: 'Vercel 환경 변수에 APP_ACCESS_PASSWORD를 등록해 주세요.' });
  if (!hasAccess(req)) return res.status(401).json({ message: '주문 조회 비밀번호가 올바르지 않습니다.' });
  try {
    const accessToken = await createToken();
    const headers = { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' };
    let from = req.query.from || kstBefore24Hours();
    let moreSequence;
    const ids = [];

    do {
      const query = new URLSearchParams({ lastChangedFrom: from, limitCount: '300' });
      if (moreSequence) query.set('moreSequence', moreSequence);
      const result = await naver(`/v1/pay-order/seller/product-orders/last-changed-statuses?${query}`, { headers });
      const data = result.data || {};
      ids.push(...(data.lastChangeStatuses || []).map((status) => status.productOrderId));
      from = data.more?.moreFrom;
      moreSequence = data.more?.moreSequence;
    } while (moreSequence);

    const productOrderIds = [...new Set(ids)].filter(Boolean);
    const details = [];
    for (let i = 0; i < productOrderIds.length; i += 300) {
      const result = await naver('/v1/pay-order/seller/product-orders/query', {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ productOrderIds: productOrderIds.slice(i, i + 300), quantityClaimCompatibility: true }),
      });
      details.push(...(result.data || []));
    }
    res.status(200).json({ orders: details.map(toDisplayOrder), count: details.length });
  } catch (error) {
    console.error('Order sync failed:', error.message);
    res.status(500).json({ message: error.message });
  }
}
