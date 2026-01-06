# Backend API Requirements for Settings and Subscription Pages

This document outlines the required API endpoints and data structures needed to support the new Settings and Subscription pages in the LinkToMe application.

## Storage Architecture

All data should be stored in **Azure Table Storage** with appropriate partitioning and row keys for efficient querying.

## Settings Page API Requirements

### 1. Get User Settings
**Endpoint:** `GET /api/admin/GetSettings`

**Purpose:** Retrieve current user security and account settings

**Response Format:**
```json
{
  "email": "user@example.com",
  "phoneNumber": "+1 (555) 123-4567",
  "twoFactorEnabled": true,
  "twoFactorEmailEnabled": true,
  "twoFactorTotpEnabled": false
}
```

**Azure Table Storage:**
- **Table Name:** `Users`
- **Partition Key:** `UserId`
- **Row Key:** `Profile`
- **Fields:**
  - `Email` (string)
  - `PhoneNumber` (string, optional)
  - `TwoFactorEnabled` (boolean)
  - `TwoFactorEmailEnabled` (boolean)
  - `TwoFactorTotpEnabled` (boolean)

---

### 2. Update Password
**Endpoint:** `PUT /api/admin/UpdatePassword`

**Purpose:** Allow users to change their password

**Request Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

**Validation:**
- Verify current password matches stored hash
- New password must be at least 8 characters
- Hash new password using bcrypt or similar secure algorithm

**Response:**
```json
{
  "message": "Password updated successfully"
}
```

**Azure Table Storage:**
- **Table Name:** `Users`
- **Partition Key:** `UserId`
- **Row Key:** `Credentials`
- **Fields:**
  - `PasswordHash` (string) - Update this field with new password hash
  - `PasswordLastChanged` (datetime) - Update to current timestamp

**Error Responses:**
- `400` - "Current password is incorrect"
- `400` - "New password must be at least 8 characters"

---

### 3. Update Email
**Endpoint:** `PUT /api/admin/UpdateEmail`

**Purpose:** Allow users to change their email address

**Request Body:**
```json
{
  "newEmail": "newemail@example.com",
  "password": "currentPassword123"
}
```

**Process:**
1. Verify password is correct
2. Check if new email is already in use
3. Generate email verification token
4. Store pending email change with token
5. Send verification email to new address

**Response:**
```json
{
  "message": "Verification email sent to newemail@example.com. Please check your inbox."
}
```

**Azure Table Storage:**
- **Table Name:** `PendingEmailChanges`
- **Partition Key:** `UserId`
- **Row Key:** `ChangeRequest`
- **Fields:**
  - `NewEmail` (string)
  - `VerificationToken` (string) - GUID
  - `CreatedAt` (datetime)
  - `ExpiresAt` (datetime) - Usually 24 hours from creation

**Secondary Endpoint:** `POST /api/admin/VerifyEmailChange`
```json
{
  "token": "verification-token-guid"
}
```
This endpoint would be called when user clicks link in verification email to complete the email change.

**Error Responses:**
- `400` - "Password is incorrect"
- `409` - "Email address already in use"

---

### 4. Update Phone Number
**Endpoint:** `PUT /api/admin/UpdatePhone`

**Purpose:** Add or update user's mobile phone number

**Request Body:**
```json
{
  "phoneNumber": "+1 (555) 123-4567"
}
```

**Response:**
```json
{
  "message": "Phone number updated successfully"
}
```

**Azure Table Storage:**
- **Table Name:** `Users`
- **Partition Key:** `UserId`
- **Row Key:** `Profile`
- **Fields:**
  - `PhoneNumber` (string) - Update this field

**Note:** This is currently UI-only with no SMS functionality. Future enhancement could add SMS 2FA.

---

### 5. Reset Two-Factor Authentication
**Endpoint:** `POST /api/admin/Reset2FA`

**Purpose:** Disable all 2FA methods for the user

**Request Body:**
```json
{}
```

**Process:**
1. Disable all 2FA methods
2. Delete TOTP secrets
3. Invalidate backup codes
4. Log the security event

**Response:**
```json
{
  "message": "Two-factor authentication has been reset successfully"
}
```

**Azure Table Storage Updates:**
- **Table Name:** `Users`
  - **Partition Key:** `UserId`
  - **Row Key:** `Profile`
  - **Fields to Update:**
    - `TwoFactorEnabled` = false
    - `TwoFactorEmailEnabled` = false
    - `TwoFactorTotpEnabled` = false

- **Table Name:** `TwoFactorSecrets`
  - **Action:** Delete all rows where PartitionKey = `UserId`

- **Table Name:** `BackupCodes`
  - **Action:** Delete all rows where PartitionKey = `UserId`

- **Table Name:** `SecurityAuditLog`
  - **Action:** Insert new row
  - **Partition Key:** `UserId`
  - **Row Key:** `{Timestamp}-2FA-Reset`
  - **Fields:**
    - `Action` = "2FA_Reset"
    - `Timestamp` (datetime)
    - `IpAddress` (string)
    - `UserAgent` (string)

---

## Subscription Page API Requirements

### 6. Get Subscription Information
**Endpoint:** `GET /api/admin/GetSubscription`

**Purpose:** Retrieve user's current subscription details

**Response Format:**
```json
{
  "currentTier": "pro",
  "billingCycle": "monthly",
  "nextBillingDate": "2024-02-15T00:00:00Z",
  "amount": 1.99,
  "currency": "USD",
  "status": "active",
  "trialEndsAt": null,
  "cancelledAt": null,
  "paymentMethod": {
    "type": "card",
    "last4": "4242",
    "brand": "visa",
    "expiryMonth": 12,
    "expiryYear": 2025
  }
}
```

**Azure Table Storage:**
- **Table Name:** `Subscriptions`
- **Partition Key:** `UserId`
- **Row Key:** `Current`
- **Fields:**
  - `CurrentTier` (string) - "free", "pro", "premium", "enterprise"
  - `BillingCycle` (string) - "monthly" or "annual"
  - `NextBillingDate` (datetime)
  - `Amount` (decimal)
  - `Currency` (string) - Default "USD"
  - `Status` (string) - "active", "cancelled", "past_due", "trial"
  - `TrialEndsAt` (datetime, nullable)
  - `CancelledAt` (datetime, nullable)
  - `StripeCustomerId` (string) - If using Stripe
  - `StripeSubscriptionId` (string) - If using Stripe

- **Table Name:** `PaymentMethods`
- **Partition Key:** `UserId`
- **Row Key:** `Primary`
- **Fields:**
  - `Type` (string) - "card", "paypal", etc.
  - `Last4` (string)
  - `Brand` (string) - "visa", "mastercard", etc.
  - `ExpiryMonth` (int)
  - `ExpiryYear` (int)
  - `StripePaymentMethodId` (string) - If using Stripe

---

### 7. Upgrade Subscription
**Endpoint:** `POST /api/admin/UpgradeSubscription`

**Purpose:** Upgrade or change user's subscription plan

**Request Body:**
```json
{
  "tier": "premium",
  "billingCycle": "annual"
}
```

**Process:**
1. Validate requested tier
2. Calculate prorated charges if upgrading mid-cycle
3. Create Stripe checkout session or payment intent
4. Return checkout URL for user to complete payment

**Response:**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_...",
  "sessionId": "cs_test_abc123",
  "message": "Redirecting to payment page..."
}
```

**Alternative Response (for downgrades):**
```json
{
  "message": "Subscription will be changed to Premium at the end of current billing period",
  "effectiveDate": "2024-02-15T00:00:00Z"
}
```

**Azure Table Storage:**
- **Table Name:** `PendingSubscriptionChanges`
- **Partition Key:** `UserId`
- **Row Key:** `{Timestamp}-Upgrade`
- **Fields:**
  - `RequestedTier` (string)
  - `RequestedBillingCycle` (string)
  - `CreatedAt` (datetime)
  - `Status` (string) - "pending_payment", "completed", "failed"
  - `StripeSessionId` (string)

**Webhook Endpoint:** `POST /api/webhooks/StripeWebhook`
- This endpoint should handle Stripe webhook events to update subscription status
- Events: `checkout.session.completed`, `customer.subscription.updated`, `invoice.payment_succeeded`

---

### 8. Cancel Subscription
**Endpoint:** `POST /api/admin/CancelSubscription`

**Purpose:** Cancel the user's subscription

**Request Body:**
```json
{}
```

**Process:**
1. Mark subscription as cancelled
2. Set cancellation date
3. Keep subscription active until end of billing period
4. Send confirmation email

**Response:**
```json
{
  "message": "Subscription cancelled. You can continue using Pro features until 2024-02-15.",
  "accessUntil": "2024-02-15T00:00:00Z"
}
```

**Azure Table Storage:**
- **Table Name:** `Subscriptions`
- **Partition Key:** `UserId`
- **Row Key:** `Current`
- **Fields to Update:**
  - `Status` = "cancelled"
  - `CancelledAt` = current timestamp
  - Keep `NextBillingDate` to indicate when access ends

- **Table Name:** `SubscriptionHistory`
- **Action:** Insert new row for audit trail
- **Partition Key:** `UserId`
- **Row Key:** `{Timestamp}-Cancellation`
- **Fields:**
  - `Action` = "Cancelled"
  - `PreviousTier` (string)
  - `CancelledAt` (datetime)
  - `Reason` (string, optional) - Could add cancellation reason survey

---

## Additional Table Structures

### Security Audit Log Table
**Purpose:** Track security-related actions for compliance and user protection

**Table Name:** `SecurityAuditLog`
- **Partition Key:** `UserId`
- **Row Key:** `{Timestamp}-{ActionType}`
- **Fields:**
  - `Action` (string) - "Password_Changed", "Email_Changed", "2FA_Reset", etc.
  - `Timestamp` (datetime)
  - `IpAddress` (string)
  - `UserAgent` (string)
  - `Success` (boolean)
  - `FailureReason` (string, optional)

### Subscription History Table
**Purpose:** Track subscription changes over time

**Table Name:** `SubscriptionHistory`
- **Partition Key:** `UserId`
- **Row Key:** `{Timestamp}-{Action}`
- **Fields:**
  - `Action` (string) - "Upgraded", "Downgraded", "Cancelled", "Renewed"
  - `FromTier` (string)
  - `ToTier` (string)
  - `Timestamp` (datetime)
  - `Amount` (decimal)
  - `Currency` (string)

---

## PowerShell Azure Function Implementation Notes

### Function App Structure
```
api/
├── admin/
│   ├── GetSettings/
│   │   └── run.ps1
│   ├── UpdatePassword/
│   │   └── run.ps1
│   ├── UpdateEmail/
│   │   └── run.ps1
│   ├── UpdatePhone/
│   │   └── run.ps1
│   ├── Reset2FA/
│   │   └── run.ps1
│   ├── GetSubscription/
│   │   └── run.ps1
│   ├── UpgradeSubscription/
│   │   └── run.ps1
│   └── CancelSubscription/
│       └── run.ps1
└── webhooks/
    └── StripeWebhook/
        └── run.ps1
```

### Common PowerShell Modules Needed
```powershell
# Azure Table Storage access
Import-Module Az.Storage

# For password hashing
# Use built-in .NET cryptography: [System.Security.Cryptography.Rfc2898DeriveBytes]

# For Stripe integration
# Use Invoke-RestMethod to call Stripe API
```

### Authentication & Authorization
All endpoints should:
1. Validate Azure Static Web Apps authentication token from HTTP-only cookie
2. Extract `UserId` from claims
3. Verify user has appropriate permissions
4. Return 401 if authentication fails
5. Return 403 if user lacks required permissions

### Error Handling Standard
```json
{
  "error": "Human readable error message"
}
```

HTTP Status Codes:
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (authenticated but lacks permission)
- `404` - Not Found
- `409` - Conflict (e.g., email already exists)
- `500` - Internal Server Error

### Security Considerations

1. **Password Handling:**
   - Never store plaintext passwords
   - Use bcrypt, scrypt, or PBKDF2 for hashing
   - Minimum 10 rounds for bcrypt
   - Salt automatically handled by modern hashing libraries

2. **Email Changes:**
   - Always require password confirmation
   - Send verification emails to both old and new addresses
   - Tokens should expire after 24 hours
   - Use cryptographically secure random tokens (GUID)

3. **2FA Reset:**
   - Log all 2FA resets for security audit
   - Consider requiring additional verification (email confirmation)
   - Notify user via email when 2FA is reset

4. **Subscription Changes:**
   - Validate tier changes against business rules
   - Prevent unauthorized downgrades that would cause data loss
   - Handle prorated charges correctly
   - Use webhook validation for Stripe events

5. **Rate Limiting:**
   - Implement rate limiting on sensitive endpoints
   - Example: 5 password change attempts per hour
   - Example: 10 email change requests per day

### Payment Integration Notes

If using **Stripe** for subscription management:
- Store `StripeCustomerId` in Users table
- Store `StripeSubscriptionId` in Subscriptions table
- Use Stripe Checkout for upgrades
- Implement webhook handler for async updates
- Handle webhook signature verification
- Test with Stripe test mode initially

Reference: [Stripe Subscriptions API](https://stripe.com/docs/billing/subscriptions/overview)

---

## Testing Recommendations

### Unit Testing
- Test password validation logic
- Test email format validation
- Test tier upgrade/downgrade logic
- Test prorated charge calculations

### Integration Testing
- Test full password change flow
- Test email change with verification
- Test 2FA reset flow
- Test subscription upgrade with Stripe sandbox

### Security Testing
- Test authentication bypass attempts
- Test SQL injection in table queries (use parameterized queries)
- Test rate limiting effectiveness
- Test token expiration handling

---

## Future Enhancements

### Settings Page
1. **SMS 2FA:** Add SMS as a 2FA option once phone numbers are collected
2. **Recovery Email:** Add separate recovery email address
3. **Session Management:** Show active sessions and allow remote logout
4. **Login History:** Display recent login attempts and locations
5. **Data Export:** Allow users to download their data (GDPR compliance)

### Subscription Page
1. **Usage Metrics:** Show current usage vs. plan limits
2. **Billing History:** Display past invoices and receipts
3. **Payment Method Management:** Add/update/remove payment methods
4. **Referral Program:** Add referral codes and rewards
5. **Team Plans:** Support multiple users under one subscription
6. **Custom Domains:** Allow custom domain management for higher tiers

---

## Migration Considerations

If existing users already have accounts:
1. Add new fields to existing Users table (backward compatible)
2. Set default values for new fields
3. Migrate existing subscription data if applicable
4. Send notification email about new features
5. Provide migration script for any data transformations

---

## Monitoring & Logging

Recommended Application Insights metrics:
- Password change success/failure rates
- Email change request volume
- 2FA reset frequency
- Subscription upgrade/downgrade patterns
- Payment success rates
- API endpoint response times
- Error rates by endpoint

Log important events:
- All security-related actions (audit log)
- Payment processing events
- Subscription status changes
- Failed authentication attempts
- Rate limit violations

---

## Questions & Clarifications Needed

Please confirm or provide guidance on:

1. **Payment Provider:** Are you using Stripe, PayPal, or another payment processor?
2. **Email Service:** What service should be used for sending emails? (SendGrid, Azure Communication Services, etc.)
3. **2FA Implementation:** Is the existing TOTP/Email 2FA implementation complete and working?
4. **Pricing:** What are the actual prices for Pro, Premium, and Enterprise tiers?
5. **Trial Periods:** Should new users get a trial period for paid tiers?
6. **Downgrade Rules:** What happens if a user downgrades and exceeds the new tier's limits?
7. **Data Retention:** How long should we keep subscription history and audit logs?
8. **Compliance:** Any specific compliance requirements (GDPR, SOC2, etc.)?

---

## Summary

This document provides a complete specification for the backend APIs needed to support the Settings and Subscription management pages. The APIs follow RESTful principles and are designed to work with Azure Table Storage and PowerShell Azure Functions.

**Total Endpoints Required:** 8 main endpoints + 1 webhook endpoint

All endpoints follow the existing API response format and authentication patterns used in the LinkToMe application.
