import { Card } from '@/components/ui/card';

export default function Home() {
  return (
    <main className='min-h-screen bg-gradient-to-b from-background to-secondary/10 p-6'>
      <div className='max-w-4xl mx-auto'>
        <div className='mb-12'>
          <h1 className='text-4xl font-bold mb-4'>Shopify → CleverTap Sync</h1>
          <p className='text-xl text-muted-foreground'>
            Automatically sync Shopify customer data and tags to CleverTap
          </p>
        </div>

        <div className='grid gap-6 md:grid-cols-2'>
          <Card className='p-6'>
            <h2 className='text-lg font-semibold mb-3'>🔄 How It Works</h2>
            <ul className='space-y-2 text-sm text-muted-foreground'>
              <li>✓ Shopify sends webhook on customer update</li>
              <li>✓ HMAC verification ensures authenticity</li>
              <li>✓ Fetches latest customer data from Shopify</li>
              <li>✓ Syncs to CleverTap with tags included</li>
            </ul>
          </Card>

          <Card className='p-6'>
            <h2 className='text-lg font-semibold mb-3'>📦 Webhook Topics</h2>
            <ul className='space-y-2 text-sm text-muted-foreground'>
              <li>• CUSTOMERS_UPDATE</li>
              <li>• CUSTOMER_TAGS_ADDED</li>
              <li>• CUSTOMER_TAGS_REMOVED</li>
            </ul>
          </Card>

          <Card className='p-6'>
            <h2 className='text-lg font-semibold mb-3'>📍 Webhook Endpoint</h2>
            <code className='text-sm bg-secondary p-2 rounded block break-all'>
              POST /api/webhooks/shopify/customer-sync
            </code>
          </Card>

          <Card className='p-6'>
            <h2 className='text-lg font-semibold mb-3'>🔐 Synced Data</h2>
            <ul className='space-y-2 text-sm text-muted-foreground'>
              <li>• Email & Phone</li>
              <li>• Customer Name</li>
              <li>• Shopify Tags (array & CSV)</li>
              <li>• Created & Updated timestamps</li>
            </ul>
          </Card>
        </div>

        <Card className='p-6 mt-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'>
          <h2 className='text-lg font-semibold mb-3 text-blue-900 dark:text-blue-100'>
            📚 Setup Instructions
          </h2>
          <ol className='space-y-2 text-sm text-blue-800 dark:text-blue-200 list-decimal list-inside'>
            <li>Add environment variables in Vercel Settings → Vars</li>
            <li>Deploy this app to Vercel</li>
            <li>Copy your webhook URL from above</li>
            <li>Register webhooks in Shopify Admin</li>
            <li>Check logs to verify syncs are working</li>
          </ol>
          <p className='text-xs text-blue-700 dark:text-blue-300 mt-4'>
            See <code className='bg-blue-100 dark:bg-blue-900 px-1 rounded'>SETUP.md</code> for detailed instructions
          </p>
        </Card>
      </div>
    </main>
  );
}
