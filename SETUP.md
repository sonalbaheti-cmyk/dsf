# Shopify to CleverTap Integration Setup

This project syncs Shopify customer data (including tags) to CleverTap whenever a customer is updated or their tags change.

## How It Works

1. **Shopify sends webhook** when customer updates, tags are added, or tags are removed
2. **API route verifies** the webhook using HMAC authentication
3. **Fetches latest customer** data from Shopify (including current tags)
4. **Sends to CleverTap** with all customer data and tags

This approach ensures you always have the latest customer data and tags, regardless of partial webhook payloads.

---

## Setup Steps

### 1. Get Your Credentials

#### Shopify Credentials:
- **SHOPIFY_CLIENT_SECRET**: From your Shopify app settings
- **SHOPIFY_ACCESS_TOKEN**: Shopify Admin API access token
- **SHOPIFY_STORE_DOMAIN**: Your store domain (e.g., `mystore.myshopify.com`)

#### CleverTap Credentials:
- **CT_ACCOUNT_ID**: Your CleverTap Account ID
- **CT_PASSCODE**: Your CleverTap Passcode
- **CT_REGION**: Your CleverTap region (e.g., `in1` for India, `eu1` for Europe)

### 2. Add Environment Variables

#### Locally:
```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your credentials.

#### On Vercel:
1. Go to your Vercel project settings
2. Navigate to **Settings → Vars**
3. Add each environment variable:
   - `SHOPIFY_CLIENT_SECRET`
   - `SHOPIFY_ACCESS_TOKEN`
   - `SHOPIFY_STORE_DOMAIN`
   - `SHOPIFY_API_VERSION` (default: `2026-04`)
   - `CT_ACCOUNT_ID`
   - `CT_PASSCODE`
   - `CT_REGION` (default: `in1`)

### 3. Deploy to Vercel

```bash
# Option 1: Using Vercel CLI
vercel

# Option 2: Push to GitHub and Vercel auto-deploys
git push origin main
```

Your webhook URL will be:
```
https://your-vercel-url.vercel.app/api/webhooks/shopify/customer-sync
```

### 4. Register Webhooks in Shopify

You need to register 3 webhook topics in Shopify:

#### Register CUSTOMERS_UPDATE:
```bash
curl -X POST "https://YOUR_STORE_DOMAIN/admin/api/2026-04/graphql.json" \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Access-Token: YOUR_ACCESS_TOKEN" \
  -d '{
    "query": "mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $uri: URL!) { webhookSubscriptionCreate(topic: $topic, webhookSubscription: { uri: $uri, format: JSON }) { webhookSubscription { id topic uri } userErrors { field message } } }",
    "variables": {
      "topic": "CUSTOMERS_UPDATE",
      "uri": "https://your-vercel-url.vercel.app/api/webhooks/shopify/customer-sync"
    }
  }'
```

#### Register CUSTOMER_TAGS_ADDED:
```bash
curl -X POST "https://YOUR_STORE_DOMAIN/admin/api/2026-04/graphql.json" \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Access-Token: YOUR_ACCESS_TOKEN" \
  -d '{
    "query": "mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $uri: URL!) { webhookSubscriptionCreate(topic: $topic, webhookSubscription: { uri: $uri, format: JSON }) { webhookSubscription { id topic uri } userErrors { field message } } }",
    "variables": {
      "topic": "CUSTOMER_TAGS_ADDED",
      "uri": "https://your-vercel-url.vercel.app/api/webhooks/shopify/customer-sync"
    }
  }'
```

#### Register CUSTOMER_TAGS_REMOVED:
```bash
curl -X POST "https://YOUR_STORE_DOMAIN/admin/api/2026-04/graphql.json" \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Access-Token: YOUR_ACCESS_TOKEN" \
  -d '{
    "query": "mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $uri: URL!) { webhookSubscriptionCreate(topic: $topic, webhookSubscription: { uri: $uri, format: JSON }) { webhookSubscription { id topic uri } userErrors { field message } } }",
    "variables": {
      "topic": "CUSTOMER_TAGS_REMOVED",
      "uri": "https://your-vercel-url.vercel.app/api/webhooks/shopify/customer-sync"
    }
  }'
```

---

## Testing Locally

1. Use **ngrok** to expose your local server:
   ```bash
   npm run dev
   # In another terminal:
   ngrok http 3000
   ```

2. Your webhook URL becomes:
   ```
   https://abc123.ngrok-free.app/api/webhooks/shopify/customer-sync
   ```

3. Register webhooks in Shopify with this URL

---

## What Gets Synced to CleverTap

For each customer, the following is synced:

- **Email**: Customer email address
- **Phone**: Customer phone number
- **Name**: Customer display name
- **shopify_customer_id**: Shopify customer ID
- **shopify_tags**: Array of customer tags from Shopify
- **shopify_tags_csv**: Comma-separated string of tags
- **shopify_created_at**: When customer was created in Shopify
- **shopify_updated_at**: When customer was last updated in Shopify

---

## Troubleshooting

### Webhook not being received?
- Check that the URL is correct and accessible
- Verify the webhook is registered in Shopify (check **Settings → Webhooks** in your Shopify admin)
- Check Shopify webhook delivery logs to see if there are errors

### HMAC verification failing?
- Ensure `SHOPIFY_CLIENT_SECRET` matches your app's client secret
- Check that the raw body is being used for verification

### Customer not found?
- Verify the customer ID is correct
- Check that your `SHOPIFY_ACCESS_TOKEN` has permission to read customer data

### CleverTap upload failing?
- Verify `CT_ACCOUNT_ID` and `CT_PASSCODE` are correct
- Check that `CT_REGION` matches your CleverTap account region
- Review CleverTap API documentation for payload requirements

---

## Notes

- The webhook endpoint responds immediately to Shopify with a 200 status
- Processing happens asynchronously (Shopify won't wait for the sync to complete)
- Check your application logs to see sync results
