import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const BASE_URL = 'https://pie.rapidadmin.com';
const ORIGINATOR = 'RapidAdminPortal';
const CLIENT_TYPE = '2';
const UTILITY_KEY = 1;

function baseHeaders({ includeSiteId = true } = {}) {
  const siteId = Deno.env.get('RAPID_SITE_ID') || '4';
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'RequestID': crypto.randomUUID(),
    'Originator': ORIGINATOR,
    'clienttype': CLIENT_TYPE,
    'Content-Type': 'application/json',
  };
  if (includeSiteId) headers['SiteId'] = String(siteId);
  return headers;
}

async function login(): Promise<string> {
  // Step 1: get a short-lived pre-login request token
  const preRes = await fetch(`${BASE_URL}/api/useragents/requesttokens`, {
    method: 'POST',
    headers: baseHeaders(),
    body: JSON.stringify({
      resourceUrl: 'authenticationgateway/v1/profile/tokens/login',
      utilityKey: UTILITY_KEY,
    }),
  });
  const preText = await preRes.text();
  console.log('Rapid pre-login status:', preRes.status, '| body:', preText.slice(0, 300));
  if (!preRes.ok) {
    throw new Error(`Pre-login token failed (${preRes.status}): ${preText}`);
  }

  let preToken = '';
  try {
    const preData = JSON.parse(preText);
    preToken = preData.requesttoken || preData.requestToken || '';
  } catch { /* ignore parse errors */ }

  // Fail loudly if token is missing — do not fall back to a stale static secret
  if (!preToken) {
    throw new Error(`Pre-login response did not contain a token: ${preText}`);
  }

  // Step 2: send the raw pre-login token in Authorization — NO "Bearer " prefix
  // The login endpoint expects the raw request token, not a Bearer token
  const headers = baseHeaders({ includeSiteId: false });
  headers['Authorization'] = preToken;

  const res = await fetch(`${BASE_URL}/api/user-management/user/login`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      userId: Deno.env.get('RAPID_USER_ID') || '',
      password: Deno.env.get('RAPID_PASSWORD') || '',
      rememberDevice: true,
    }),
  });

  const text = await res.text();
  console.log('Rapid login status:', res.status, '| body:', text.slice(0, 300));
  if (!res.ok) {
    throw new Error(`Login failed (${res.status}): ${text}`);
  }

  const data = JSON.parse(text);
  const bearer = data.accesstoken || data.accessToken;
  if (!bearer) {
    throw new Error(`Login did not return an access token: ${text}`);
  }
  return bearer;
}

function formatPhone(raw: string): string {
  if (!raw) return '';
  const digits = raw.toString().replace(/\D/g, '');
  if (digits.length === 10) return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === '1') return `${digits.slice(1,4)}-${digits.slice(4,7)}-${digits.slice(7)}`;
  return ''; // unrecognised format — omit rather than send garbage
}

async function registerCard(bearer: string, card: Record<string, string>) {
  const headers = baseHeaders();
  headers['Authorization'] = `Bearer ${bearer}`;

  const address = {
    line1: card.address_line1 || '',
    line2: card.address_line2 || '',
    postalCode: card.zip || '',
    city: card.city || '',
    country: card.country || 'US',
    state: card.state || '', // never default to a hardcoded state
  };

  // Rapid expects ISO date YYYY-MM-DD; accept YYYYMMDD or already-formatted input
  const rawDob = (card.dob || '').toString().replace(/\D/g, '');
  const dob = rawDob.length === 8
    ? `${rawDob.slice(0, 4)}-${rawDob.slice(4, 6)}-${rawDob.slice(6, 8)}`
    : (card.dob || '');

  const payload: Record<string, unknown> = {
    cardHolderFirstName: card.first_name || '',
    cardHolderMiddleName: card.middle_name || '',
    cardHolderLastName: card.last_name || '',
    cardId: card.card_id || '',
    mailingAddress: address,
    physicalAddress: address,
    dob,
    ssn: card.ssn || '',
    employeeId: card.employee_id || '',
    emailAddress: card.email || '',
  };

  // Only include phone fields when they have a valid formatted value
  // Rapid rejects empty strings and unrecognised formats
  const mobilePhone = formatPhone(card.phone);
  const homePhone = formatPhone(card.home_phone);
  const workPhone = formatPhone(card.work_phone);
  if (mobilePhone) payload.mobilePhone = mobilePhone;
  if (homePhone) payload.homePhone = homePhone;
  if (workPhone) payload.workPhone = workPhone;

  const bodyStr = JSON.stringify(payload);
  console.log('Rapid register payload (SSN redacted):',
    bodyStr.replace(/"ssn":"[^"]*"/, '"ssn":"***"'));

  const res = await fetch(`${BASE_URL}/api/card-management/personalized-card/register`, {
    method: 'POST',
    headers,
    body: bodyStr,
  });

  const text = await res.text();
  console.log('Rapid register response:', res.status, text);

  if (!res.ok) {
    throw new Error(`Register failed (${res.status}): ${text}`);
  }
  const data = JSON.parse(text);
  if (data.responseCode !== 0) {
    throw new Error(
      `Register error (responseCode ${data.responseCode}): ` +
      `${data.responseDescription || data.exceptionMessage || 'unknown'} | full: ${text}`
    );
  }
  return data.data || {};
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { card } = await req.json();
    if (!card || !card.first_name || !card.last_name) {
      return Response.json({ error: 'Missing required card data (first_name, last_name)' }, { status: 400 });
    }

    const bearer = await login();
    const result = await registerCard(bearer, card);

    return Response.json({
      success: true,
      cardNumber: result.cardNumber || null,
      data: result,
    });
  } catch (error) {
    console.error('enrollRapidCard error:', (error as Error).message);
    return Response.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
});