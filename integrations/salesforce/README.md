# Salesforce integration (planned)

The store talks to data only through **repositories** (`src/repositories/*.repo.js`) and two service
interfaces that are intentionally *not* wired to storage yet:

| Interface | File | Current adapter |
|---|---|---|
| `ReviewsService` | `src/services/reviews/ReviewsService.js` | `mock.adapter.js` (in-memory) |
| `CustomersService` | `src/services/customers/CustomersService.js` | `mock.adapter.js` (in-memory) |

Salesforce can back either the whole store (`DATA_PROVIDER=salesforce`) or just Customers/Reviews
(`CUSTOMERS_PROVIDER=salesforce`, `REVIEWS_PROVIDER=salesforce`).

## Recommended setup

1. Create a **Connected App** (OAuth 2.0, *JWT bearer* or *client credentials* flow) with API access.
2. Put credentials in `.env`: `SF_LOGIN_URL`, `SF_CLIENT_ID`, `SF_CLIENT_SECRET`, `SF_USERNAME`, `SF_PASSWORD`.
3. `npm install jsforce` and complete `adapter.stub.js` in this folder.
4. Implement `src/services/customers/salesforce.adapter.js` and `src/services/reviews/salesforce.adapter.js`
   by delegating to the stub, then set the provider env vars above.

## Object mapping

| Store entity (JSON / MySQL) | Salesforce object | Key fields |
|---|---|---|
| `users` (role=user) + `addresses` | **Person Account** (or Account + Contact) | `PersonEmail` ← email (External Id `HH_Customer_Id__c` ← id), `PersonMobilePhone` ← phone, `ShippingStreet/City/State/PostalCode` ← default address, `HH_Lat__c`, `HH_Lng__c`, `HH_Maps_Url__c` |
| saved addresses | **ContactPointAddress** (or custom `HH_Address__c`) | `ParentId` → Account, `AddressType` ← label, `IsDefault` |
| `products` | **Product2** | `ProductCode` ← sku (External Id), `Name`, `Family` ← category, `HH_Subcategory__c`, `HH_Brand__c`, `HH_GST_Rate__c`, `HH_HSN__c`, `HH_Stock__c`, `IsActive` |
| product prices (MRP / selling) | **PricebookEntry** (Standard + "Online" price book) | `UnitPrice` ← price; MRP in `HH_MRP__c` on Product2 |
| `categories` | Picklist on Product2 (`Family`) + custom `HH_Category__c` for the tree | `Slug__c`, `Parent__c` |
| `orders` | **Order** (or Commerce `OrderSummary`) | `OrderReferenceNumber` ← orderNo, `AccountId`, `Status` ← status, `EffectiveDate` ← createdAt, `HH_Payment_Method__c`, `HH_Payment_Status__c`, `HH_Delivery_Method__c`, `TotalAmount` |
| `order_items` | **OrderItem** | `Product2Id`, `Quantity`, `UnitPrice`, `HH_GST_Rate__c` |
| `payments` | **Payment** (Commerce Payments) or custom `HH_Payment__c` | `GatewayRefNumber` ← razorpay_payment_id, `Amount`, `Status`, `HH_Method__c` |
| refunds | **Refund** or `HH_Refund__c` | `Amount`, `Reason__c` |
| `reviews` | custom **`HH_Product_Review__c`** | `Product__c` (lookup Product2), `Account__c`, `Rating__c` (Number 1–5), `Title__c`, `Body__c` (Long Text), `Status__c` (Pending/Approved/Rejected), `Reply__c`, `Verified__c` |
| customer notes | **Task** / `Note` related to Account | `Subject`, `Description` |
| `contacts` (contact form) | **Case** (Web-to-Case) | `SuppliedName`, `SuppliedEmail`, `SuppliedPhone`, `Subject` ← topic, `Description` ← message, `HH_Order_No__c` |
| `coupons`, `promotions` | **Coupon** / **Promotion** (if Loyalty/Commerce licensed) or custom objects | code, type, value, window, limits |

## Sync strategy

* **Writes** (order placed, status change, review submitted): call the adapter synchronously, or push to a queue
  and upsert by External Id so retries are idempotent.
* **Reads** for the storefront catalogue should stay local (MySQL/JSON) for speed; sync Product2 → store nightly
  or via Platform Events / Change Data Capture.
* Keep `order.orderNo`, `product.sku` and `user.id` as External Ids on the Salesforce side.
