import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// Shopify HMAC verification
function verifyShopifyWebhook(req: NextRequest, body: Buffer): boolean {
  const hmacHeader = req.headers.get('X-Shopify-Hmac-SHA256');
  if (!hmacHeader) return false;

  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET || '';
  const digest = crypto
    .createHmac('sha256', clientSecret)
    .update(body)
    .digest('base64');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(digest, 'utf8'),
      Buffer.from(hmacHeader, 'utf8')
    );
  } catch {
    return false;
  }
}

// Extract customer ID from payload
function extractCustomerId(payload: any): string | null {
  if (payload?.id) return String(payload.id);
  if (payload?.customer?.id) return String(payload.customer.id);
  if (payload?.admin_graphql_api_id) {
    const parts = String(payload.admin_graphql_api_id).split('/');
    return parts[parts.length - 1];
  }
  if (payload?.customer?.admin_graphql_api_id) {
    const parts = String(payload.customer.admin_graphql_api_id).split('/');
    return parts[parts.length - 1];
  }
  return null;
}

// Fetch latest customer from Shopify with tags
async function fetchLatestCustomer(customerId: string): Promise<any> {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN || '';
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || '';
  const apiVersion = process.env.SHOPIFY_API_VERSION || '2026-04';

  const gqlId = `gid://shopify/Customer/${customerId}`;

  const query = `
    query GetCustomer($id: ID!) {
      customer(id: $id) {
        id
        legacyResourceId
        displayName
        firstName
        lastName
        createdAt
        updatedAt
        tags
        defaultEmailAddress {
          emailAddress
        }
        defaultPhoneNumber {
          phoneNumber
        }
      }
    }
  `;

  const response = await fetch(
    `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        query,
        variables: { id: gqlId },
      }),
    }
  );

  const json = await response.json();

  if (!response.ok) {
    throw new Error(
      `Shopify fetch failed: ${response.status} ${JSON.stringify(json)}`
    );
  }

  if (json.errors?.length) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  return json.data?.customer || null;
}

// Build CleverTap payload with tags
function buildCleverTapPayload(customer: any): any {
  if (!customer?.legacyResourceId) {
    throw new Error('Missing legacyResourceId from Shopify customer');
  }

  const customerId = String(customer.legacyResourceId);
  const email = customer.defaultEmailAddress?.emailAddress;
  const phone = customer.defaultPhoneNumber?.phoneNumber;
  const tags = Array.isArray(customer.tags) ? customer.tags : [];

  const name =
    customer.displayName ||
    `${customer.firstName || ''} ${customer.lastName || ''}`.trim();

  return {
    d: [
      {
        identity: customerId,
        type: 'profile',
        profileData: {
          shopify_customer_id: customerId,
          ...(email ? { Email: email } : {}),
          ...(phone ? { Phone: phone } : {}),
          ...(name ? { Name: name } : {}),
          shopify_tags: tags,
          shopify_tags_csv: tags.join(','),
          shopify_created_at: customer.createdAt,
          shopify_updated_at: customer.updatedAt,
        },
      },
    ],
  };
}

// Send to CleverTap
async function sendToCleverTap(payload: any): Promise<string> {
  const accountId = process.env.CT_ACCOUNT_ID || '';
  const passcode = process.env.CT_PASSCODE || '';
  const region = process.env.CT_REGION || 'in1';

  const response = await fetch(
    `https://${region}.api.clevertap.com/1/upload`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CleverTap-Account-Id': accountId,
        'X-CleverTap-Passcode': passcode,
      },
      body: JSON.stringify(payload),
    }
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`CleverTap upload failed: ${response.status} ${text}`);
  }

  return text;
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for HMAC verification
    const buffer = await request.arrayBuffer();
    const body = Buffer.from(buffer);

    // Verify Shopify webhook
    if (!verifyShopifyWebhook(request, body)) {
      return NextResponse.json(
        { error: 'Invalid Shopify HMAC' },
        { status: 401 }
      );
    }

    // Parse payload
    const payload = JSON.parse(body.toString('utf8'));

    // Get webhook metadata
    const topic = request.headers.get('X-Shopify-Topic') || 'unknown';
    const shopDomain = request.headers.get('X-Shopify-Shop-Domain') || 'unknown';
    const webhookId = request.headers.get('X-Shopify-Webhook-Id') || 'unknown';

    // Respond fast to Shopify
    console.log('Webhook received', {
      topic,
      shopDomain,
      webhookId,
    });

    // Extract customer ID
    const customerId = extractCustomerId(payload);

    if (!customerId) {
      console.error('No customer ID found', {
        topic,
        shopDomain,
        webhookId,
        payload,
      });
      return NextResponse.json(
        { error: 'No customer ID found' },
        { status: 400 }
      );
    }

    // Fetch latest customer from Shopify
    const latestCustomer = await fetchLatestCustomer(customerId);

    if (!latestCustomer) {
      console.error('Customer not found in Shopify', {
        customerId,
        topic,
      });
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Build CleverTap payload with tags
    const ctPayload = buildCleverTapPayload(latestCustomer);
    const ctResponse = await sendToCleverTap(ctPayload);

    console.log('Synced to CleverTap', {
      topic,
      customerId,
      tags: latestCustomer.tags,
      ctResponse,
    });

    return NextResponse.json({
      success: true,
      customerId,
      tags: latestCustomer.tags,
      message: 'Customer synced to CleverTap',
    });
  } catch (error) {
    console.error('Webhook processing failed', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}
