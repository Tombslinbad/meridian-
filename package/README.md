# Bachs SDK for Node.js

An unofficial, robust and fully-typed Node.js / TypeScript SDK to interact with the Bachs API natively.

## Installation

```bash
npm install bachs-sdk
```

## Initialization

Initialize the SDK by providing your API key:

```typescript
import { Bachs } from 'bachs-sdk';

const bachs = new Bachs({
  apiKey: process.env.BACHS_API_KEY || 'your_secret_api_key',
});
```

## Usage Examples

### Retrieve a Customer

```typescript
async function getCustomer() {
  const customer = await bachs.customers.get('cus_123456');
  console.log(customer.email, customer.name);
}
```

### Create a Checkout Session

```typescript
async function createCheckout() {
  const session = await bachs.checkoutSessions.create({
    customer: {
      email: 'user@example.com',
      name: 'John Doe',
    },
    line_items: [
      {
        product_id: 'prod_98765',
        quantity: 1,
      },
    ],
    success_url: 'https://your-site.com/success',
    cancel_url: 'https://your-site.com/cancel',
  });

  console.log('Checkout URL:', session.url);
}
```

## Error Handling

The SDK throws `BachsError` for any unsuccessful API requests. These errors map cleanly to the Bachs API error formats, including deeply nested validation errors.

```typescript
import { BachsError } from 'bachs-sdk';

async function createProduct() {
  try {
    const product = await bachs.products.create({
      name: '', // Intentional validation error
      price: {
        price_type: 'fixed',
        currency: 'INVALID',
        amount: '-10',
      },
    });
  } catch (error) {
    if (error instanceof BachsError) {
      console.log(`Status: ${error.status}`);
      console.log(`Code: ${error.code}`);

      // Easily extract nested field-level validation errors!
      if (error.errors && error.errors.length > 0) {
        error.errors.forEach(validationError => {
          console.log(`Field ${validationError.field}: ${validationError.message}`);
        });
      }
    }
  }
}
```

## Available Resources

The following resources are currently exposed via the `bachs` instance:

| Resource                  | Description                                                       |
| :------------------------ | :---------------------------------------------------------------- |
| `bachs.products`          | Manage products and pricing plans in your catalog.                |
| `bachs.checkoutSessions`  | Create and manage secure, hosted payment pages.                   |
| `bachs.subscriptions`     | Manage recurring billing and subscription lifecycles.             |
| `bachs.customers`         | Store and manage customer details and billing information.        |
| `bachs.customerSessions`  | Create authenticated sessions for customer billing portals.       |
| `bachs.payments`          | Process and track one-time payments and transactions.             |
| `bachs.paymentRails`      | Configure and manage supported payment methods and networks.      |
| `bachs.refunds`           | Issue and track refunds for successful payments.                  |
| `bachs.accounts`          | Manage your primary Bachs account settings and details.           |
| `bachs.connectedAccounts` | Manage sub-accounts for marketplace or platform routing.          |
| `bachs.transfers`         | Route funds between your platform and connected accounts.         |
| `bachs.media`             | Upload and manage digital assets, like product or receipt images. |

> 📚 **[View the detailed API documentation and code examples for all resources here.](./docs/RESOURCES.md)**

## License

MIT
