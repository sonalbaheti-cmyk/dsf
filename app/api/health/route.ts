import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Shopify → CleverTap sync service is running',
    webhookUrl: '/api/webhooks/shopify/customer-sync',
  });
}
