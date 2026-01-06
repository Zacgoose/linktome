# UI Screenshots and Visual Guide

## Settings Page (`/admin/settings`)

### Layout Overview
The Settings page is organized into clear sections with Material-UI cards:

### 1. Password Change Section
- **Icon:** Password icon (🔑)
- **Title:** "Change Password"
- **Fields:**
  - Current Password (password input with show/hide toggle)
  - New Password (password input with show/hide toggle)
    - Helper text: "Must be at least 8 characters long"
  - Confirm New Password (password input with show/hide toggle)
- **Action Button:** "Update Password" (primary button with save icon)

### 2. Email Address Section
- **Icon:** Email icon (✉️)
- **Title:** "Email Address"
- **Display:** Shows current email address in bold
- **Action Button:** "Change Email" (outlined button)
- **Dialog:** Opens a modal dialog when clicked with:
  - New Email Address input field
  - Current Password input field (for verification)
  - Cancel and "Update Email" buttons

### 3. Two-Factor Authentication Section
- **Icon:** Security icon (🔒)
- **Title:** "Two-Factor Authentication"
- **Description:** "Add an extra layer of security to your account"
- **Status Display:** 
  - Shows "Enabled" (green chip) or "Disabled" (grey chip)
  - When enabled, shows method chips: "Email 2FA", "Authenticator App"
- **Actions:**
  - If disabled: "Enable 2FA" button (primary)
  - If enabled: "Reset 2FA" button (warning color)
- **Dialogs:**
  - **Enable 2FA:** Opens existing TwoFactorSetupWizard component
  - **Reset 2FA:** Confirmation dialog with warning alert

### 4. Mobile Number Section
- **Icon:** Phone icon (📱)
- **Title:** "Mobile Number"
- **Description:** "Add a mobile number to your account (optional)"
- **Field:** Phone Number text input with placeholder "+1 (555) 123-4567"
  - Helper text: "International format recommended"
- **Action Button:** "Update Phone Number" (primary button with save icon)

### Color Scheme
- Primary color: Material-UI default primary (purple/blue)
- Success: Green for enabled status
- Warning: Orange/yellow for 2FA reset
- Error: Red for validation errors
- Background: Light grey cards on white/light background

### Accessibility
- All form fields have proper labels
- Password fields have show/hide toggle buttons
- Success/error messages appear at the top of the page
- All buttons have descriptive text and icons

---

## Subscription Page (`/admin/subscription`)

### Layout Overview
The Subscription page uses a comprehensive card-based layout with pricing tiers.

### 1. Current Subscription Card
- **Title:** "Current Subscription"
- **Display:**
  - Large tier badge (Free/Pro/Premium/Enterprise)
  - Tier name and description
  - Status chips:
    - Active (green) / Trial (blue) / Cancelled (orange) / Past Due (red)
    - Billing cycle: Monthly or Annual (outlined chip)
- **Details:**
  - Next billing date and amount
  - Trial end date (if on trial)
  - Cancellation notice (if cancelled)
  - Payment method information (card brand, last 4 digits, expiry)
- **Action:** "Cancel Subscription" button (error color) if active

### 2. Available Plans Section
**Grid Layout:** 4 columns (responsive - stacks on mobile)

Each plan card shows:
- **Header:**
  - Tier icon (🆓 Free, ⭐ Pro, 💎 Premium, 🏢 Enterprise)
  - Tier name
  - "Current Plan" chip (if applicable)
- **Pricing:**
  - Monthly price in large text
  - "per month" label
  - Annual pricing with savings percentage
- **Features List:**
  - Up to 6 key features with checkmarks (✓) or X marks (✗)
  - Features include: Links count, link groups, custom themes, animations, analytics, API access, etc.
- **Action Button:**
  - "Upgrade" (primary) for higher tiers
  - "Switch Plan" (outlined) for different tiers
  - Hidden for current plan

#### Pricing Structure (Example)
- **Free:** $0.00/month
- **Pro:** $1.99/month or $19.99/year
- **Premium:** $3.99/month or $39.99/year
- **Enterprise:** $10.99/month or $109.99/year

### 3. Feature Comparison Section
- **Card:** Simple card with button to "View Full Comparison"
- **Purpose:** Placeholder for detailed feature matrix

### Dialogs

#### Upgrade Dialog
- **Title:** "Upgrade to [Tier Name]"
- **Content:**
  - Confirmation message
  - Billing options (monthly vs annual)
  - Info alert: "You will be redirected to a secure payment page"
- **Actions:**
  - "Cancel" button
  - "Continue to Payment" button (primary)

#### Cancel Subscription Dialog
- **Title:** "Cancel Subscription"
- **Content:**
  - Warning alert
  - Explanation that subscription remains active until end of billing period
- **Actions:**
  - "Keep Subscription" button
  - "Cancel Subscription" button (error color)

### Color Coding
- **Free Tier:** Grey (#9e9e9e)
- **Pro Tier:** Blue (#3f51b5)
- **Premium Tier:** Purple (#9c27b0)
- **Enterprise Tier:** Red (#f44336)

### Visual Hierarchy
1. Current subscription at top (most important)
2. Available plans in grid (easy comparison)
3. Feature comparison at bottom (additional details)

---

## Navigation Integration

Both pages are accessible from the admin sidebar menu:
- **Settings:** Gear icon (⚙️)
- **Subscription:** Card/Membership icon (💳)

Located in the sidebar after Analytics and before Users menu items.

---

## Responsive Design

All components are built with Material-UI responsive grid system:
- **Desktop:** Full width cards with multi-column layouts
- **Tablet:** 2-column grid for subscription plans
- **Mobile:** Single column stacked layout
- **All:** Hamburger menu for collapsed sidebar

---

## Form Validation

### Settings Page
- Password must be at least 8 characters
- Passwords must match
- Email must be valid format
- Current password required for email change
- Phone number accepts any format (no validation yet)

### Subscription Page
- Tier selection validated
- Payment handled by external provider (Stripe)
- Downgrade restrictions may apply based on current usage

---

## Loading States

All forms show loading indicators:
- "Updating..." text on buttons during submission
- Disabled buttons during loading
- Circular progress spinners for data fetching

---

## Success/Error Feedback

- **Success messages:** Green alert at top of page, auto-dismiss after 3-5 seconds
- **Error messages:** Red alert at top of page, auto-dismiss after 5 seconds
- **Dismissable:** All alerts have close button

---

## Security Features

1. **Password visibility toggle:** Eye icons in password fields
2. **Confirmation dialogs:** For destructive actions (reset 2FA, cancel subscription)
3. **Password verification:** Required for email changes
4. **Audit logging:** All security actions logged (backend)

---

## Accessibility Features

- **Keyboard navigation:** All interactive elements keyboard accessible
- **Screen readers:** Proper ARIA labels on all form elements
- **Color contrast:** WCAG AA compliant
- **Focus indicators:** Visible focus states on all interactive elements

---

## Integration Points

### With Existing Components
- Uses existing `TwoFactorSetupWizard` component for 2FA setup
- Uses existing `TierBadge` component for subscription display
- Uses shared `AdminLayout` for consistent navigation

### With Backend APIs
- All API calls use existing `useApiGet`, `useApiPut`, `useApiPost` hooks
- Follows established API response format
- Uses HTTP-only cookies for authentication

---

## Future Enhancements

As noted in the backend API documentation:

### Settings Page
- SMS 2FA option (once phone numbers collected)
- Recovery email address
- Active session management
- Login history viewer
- Data export (GDPR compliance)

### Subscription Page
- Usage metrics vs plan limits
- Billing history with invoices
- Payment method management
- Referral program
- Team/multi-user plans
- Custom domain management

---

## Testing Checklist

- [ ] Form validation works correctly
- [ ] Success/error messages display properly
- [ ] Dialogs open and close correctly
- [ ] Loading states show during API calls
- [ ] Responsive layout works on all screen sizes
- [ ] Keyboard navigation functional
- [ ] Screen reader compatibility
- [ ] Integration with existing 2FA wizard
- [ ] Tier badges display correctly
- [ ] Subscription status updates properly

---

## Known Limitations

1. **Backend Not Implemented:** All API endpoints need to be created
2. **Payment Integration:** Stripe integration not yet configured
3. **Phone Verification:** SMS functionality not implemented
4. **Email Verification:** Verification flow needs backend support
5. **Feature Comparison Table:** Detailed comparison view not yet built

These are UI-only implementations. Backend development required before pages are fully functional.
