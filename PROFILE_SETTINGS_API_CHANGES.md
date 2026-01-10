# Profile Settings API Changes

## Overview
This document outlines the API changes required for the profile settings consolidation. The Profile Settings page has been deprecated, and display name and bio management have been moved to the Links page where they can be edited inline.

## Changes Summary

### Deprecated Endpoints

1. **GET /admin/GetProfile** - DEPRECATED (but keep for backward compatibility)
   - This endpoint was used by the Profile Settings page
   - Still used by Dashboard for displaying user information
   - **Action**: Mark as deprecated but keep functional
   - **Replacement**: Display name and bio are now managed through Appearance API

2. **PUT /admin/UpdateProfile** - DEPRECATED
   - This endpoint was used to update display name and bio separately
   - **Action**: Remove or mark as deprecated
   - **Replacement**: Use `PUT /admin/UpdateAppearance` with header data

### Updated Endpoints

1. **PUT /admin/UpdateAppearance** - ENHANCED
   - Now the primary endpoint for managing display name and bio
   - These are stored in `appearance.header.displayName` and `appearance.header.bio`
   - **No schema changes required** - already supports this structure

### Implementation Details

#### Current Appearance Data Structure
```json
{
  "pageId": "page-123",
  "theme": "custom",
  "header": {
    "profileImageLayout": "classic",
    "titleStyle": "text",
    "displayName": "John Doe",
    "bio": "Software Developer | Tech Enthusiast",
    "logoUrl": null
  },
  "profileImageUrl": "https://...",
  "socialIcons": [],
  "wallpaper": { ... },
  "buttons": { ... },
  "text": { ... },
  "hideFooter": false
}
```

#### Frontend Changes Made

**Links Page (`/admin/links`)**:
- Added editable TextField components for display name and bio
- Updates are made directly through `PUT /admin/UpdateAppearance?pageId={id}`
- Changes are per-page (each page can have different display name/bio)
- Auto-saves on change (no save button needed)

**Dashboard (`/admin/dashboard`)**:
- Removed Active Links stat card
- Removed Total Pages chip
- Simplified to show only quick action cards
- Removed dependency on `GET /admin/GetDashboardStats`

**Profile Settings Page (`/admin/profile`)**:
- Page is deprecated and should be removed or hidden from navigation
- Users should update display name/bio from Links page
- Avatar management can be moved to Appearance page or Account Settings

### Migration Strategy

#### Phase 1: Backend Compatibility (Immediate)
1. Ensure `PUT /admin/UpdateAppearance` accepts and saves `header.displayName` and `header.bio`
2. Mark `PUT /admin/UpdateProfile` as deprecated (but keep working for backward compatibility)
3. Keep `GET /admin/GetProfile` working for Dashboard

#### Phase 2: Data Migration (if needed)
If users have display name/bio in a separate Profile table:
1. Copy existing profile data to appearance.header for each user's pages
2. Default page gets the user's main profile data
3. Additional pages start with the same data (user can customize per page)

#### Phase 3: Cleanup (Future)
1. Remove Profile Settings page from navigation
2. Eventually remove deprecated `PUT /admin/UpdateProfile` endpoint
3. Consider consolidating `GET /admin/GetProfile` if only used for username

### PowerShell Implementation Example

#### Update Appearance Endpoint (Enhanced)
```powershell
# PUT /admin/UpdateAppearance
param($Request, $TriggerMetadata)

$userId = $Request.Headers['X-User-Id']
$pageId = $Request.Query['pageId']
$body = $Request.Body | ConvertFrom-Json

# Validate pageId belongs to user
$page = Get-AzTableRow -Table $pagesTable `
    -PartitionKey $userId `
    -RowKey $pageId

if (-not $page) {
    Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
        StatusCode = 404
        Body = @{ error = "Page not found" } | ConvertTo-Json
    })
    return
}

# Update appearance with header data
$appearanceEntity = @{
    PartitionKey = $userId
    RowKey = $pageId
    Theme = $body.theme
    Header = ($body.header | ConvertTo-Json -Compress)  # Contains displayName and bio
    ProfileImageUrl = $body.profileImageUrl
    SocialIcons = ($body.socialIcons | ConvertTo-Json -Compress)
    Wallpaper = ($body.wallpaper | ConvertTo-Json -Compress)
    Buttons = ($body.buttons | ConvertTo-Json -Compress)
    Text = ($body.text | ConvertTo-Json -Compress)
    HideFooter = $body.hideFooter
    UpdatedAt = (Get-Date).ToUniversalTime().ToString('o')
}

Update-AzTableRow -Table $appearanceTable -Entity $appearanceEntity

Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
    StatusCode = 200
    Body = @{ message = "Appearance updated successfully" } | ConvertTo-Json
})
```

### Testing Checklist

- [ ] Verify display name can be edited from Links page
- [ ] Verify bio can be edited from Links page
- [ ] Verify changes save automatically on blur/change
- [ ] Verify each page can have independent display name/bio
- [ ] Verify Dashboard still displays user information correctly
- [ ] Verify public pages show correct display name/bio
- [ ] Verify Phone Preview updates in real-time on Links page
- [ ] Test with users who have multiple pages
- [ ] Test backward compatibility with existing appearance data

### User Impact

**Positive Changes**:
- ✅ Simpler workflow - edit profile info directly where links are managed
- ✅ Per-page customization - different display name/bio for different pages
- ✅ Cleaner Dashboard - focus on quick actions
- ✅ Reduced navigation - one less page to manage

**Breaking Changes**:
- ⚠️ Profile Settings page removed from navigation
- ⚠️ Dashboard no longer shows Active Links count or Page count
- ⚠️ Users must update display name/bio from Links page now

### API Summary Table

| Endpoint | Status | Purpose | Changes |
|----------|--------|---------|---------|
| `GET /admin/GetProfile` | Deprecated (keep) | Get user profile | Still used by Dashboard |
| `PUT /admin/UpdateProfile` | Deprecated (remove) | Update profile | Replaced by UpdateAppearance |
| `PUT /admin/UpdateAppearance` | Enhanced | Update page appearance | Now primary method for name/bio |
| `GET /admin/GetDashboardStats` | Simplified | Get dashboard stats | Removed totalLinks, totalPageViews, totalLinkClicks fields (not needed anymore) |

## Questions & Considerations

1. **Avatar Management**: Where should users upload/change their avatar?
   - Option A: Move to Appearance page (recommended)
   - Option B: Keep in a minimal Profile/Account page
   - Option C: Add to Links page alongside display name/bio

2. **Username Change**: If users can change username, where should that be?
   - Likely in Account Settings (not Profile Settings)
   - This is typically a sensitive operation with validation

3. **Verification Badge**: If users have verification status, where to show?
   - Can be displayed in Dashboard hero section
   - Show on public profile automatically

## Conclusion

These changes consolidate profile management into the Links page, reducing complexity and providing a more intuitive user experience. The API changes are minimal and maintain backward compatibility during migration.
