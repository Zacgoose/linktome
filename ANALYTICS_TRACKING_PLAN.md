# Multi-Page Analytics & Tracking Implementation Plan

## Overview

This document outlines the changes needed to support page-specific analytics and tracking for the multi-page system.

## Changes Required

### 1. Analytics API Updates

#### Update Analytics Response Types

Add optional `pageId` field to analytics data structures:

```typescript
// In src/types/api.ts

export interface RecentLinkClick {
  linkTitle: string;
  userAgent: string;
  timestamp: string;
  linkUrl: string;
  referrer: string;
  ipAddress: string;
  linkId: string;
  pageId?: string; // NEW: Page association
}

export interface LinkClicksByLink {
  linkId: string;
  clickCount: number;
  linkTitle: string;
  linkUrl: string;
  pageId?: string; // NEW: Page association
}

export interface RecentPageView {
  ipAddress: string;
  userAgent: string;
  referrer: string;
  timestamp: string;
  pageId?: string; // NEW: Page association
}

// NEW: Page-specific analytics
export interface PageAnalyticsSummary {
  pageId: string;
  pageName: string;
  pageSlug: string;
  totalPageViews: number;
  totalLinkClicks: number;
}

export interface AnalyticsData {
  clicksByDay: ClicksByDay[];
  recentPageViews: RecentPageView[];
  linkClicksByLink: LinkClicksByLink[];
  summary: AnalyticsSummary;
  viewsByDay: ViewsByDay[];
  recentLinkClicks: RecentLinkClick[];
  pageBreakdown?: PageAnalyticsSummary[]; // NEW: Per-page stats
}
```

### 2. Dashboard Page Updates

#### Add Page Filter (Optional)

Update `src/pages/admin/dashboard.tsx`:

```typescript
// Import PageContext
import { usePageContext } from '@/context/PageContext';

// In component:
const { currentPage, pages } = usePageContext();

// Update API call to include pageId parameter
const { data: statsData } = useApiGet<DashboardStatsResponse>({
  url: 'admin/GetDashboardStats',
  queryKey: ['admin-dashboard-stats', currentPage?.id || 'all'],
  params: currentPage?.id ? { pageId: currentPage.id } : undefined,
});
```

**OR** Show aggregated stats across all pages (simpler approach for dashboard).

### 3. Analytics Page Updates

#### Add Page Filter Dropdown

Update `src/pages/admin/analytics.tsx`:

```typescript
import { usePageContext } from '@/context/PageContext';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

export default function AnalyticsPage() {
  const { currentPage, pages } = usePageContext();
  const [selectedPageFilter, setSelectedPageFilter] = useState<string>('all');
  
  // Update API call with page filter
  const { data: analytics, isLoading } = useApiGet<AnalyticsResponse>({
    url: 'admin/GetAnalytics',
    queryKey: ['admin-analytics', selectedPageFilter],
    params: selectedPageFilter !== 'all' ? { pageId: selectedPageFilter } : undefined,
  });
  
  // Add page filter dropdown in UI
  return (
    <Container>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Page</InputLabel>
          <Select
            value={selectedPageFilter}
            onChange={(e) => setSelectedPageFilter(e.target.value)}
            label="Filter by Page"
          >
            <MenuItem value="all">All Pages</MenuItem>
            {pages.map(page => (
              <MenuItem key={page.id} value={page.id}>
                {page.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {/* Export button */}
      </Box>
      {/* Rest of analytics UI */}
    </Container>
  );
}
```

#### Add Page Breakdown Section

Show per-page statistics:

```typescript
{/* Page Performance Breakdown - NEW Section */}
{analytics?.pageBreakdown && analytics.pageBreakdown.length > 1 && (
  <Grid item xs={12}>
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Performance by Page
        </Typography>
        <Stack spacing={2} mt={2}>
          {analytics.pageBreakdown.map(page => (
            <Box
              key={page.pageId}
              p={2}
              sx={{ 
                bgcolor: 'background.default', 
                borderRadius: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Box>
                <Typography fontWeight={600}>{page.pageName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  /{page.pageSlug}
                </Typography>
              </Box>
              <Box display="flex" gap={3}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Views</Typography>
                  <Typography variant="h6" fontWeight={600}>{page.totalPageViews}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Clicks</Typography>
                  <Typography variant="h6" fontWeight={600}>{page.totalLinkClicks}</Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  </Grid>
)}
```

### 4. Public Page Tracking Updates

#### Page View Tracking

**NOTE**: Page views are automatically tracked by the backend within the `GetUserProfile` endpoint. No separate frontend call is needed.

The backend uses `Write-AnalyticsEvent` to record page views when profiles are fetched:

```powershell
# Inside GetUserProfile endpoint
Write-AnalyticsEvent -EventType "PageView" -UserId $user.UserId -PageId $pageId -Metadata @{
    Slug = $page.Slug
    IpAddress = $Request.Headers.'X-Forwarded-For' ?? $Request.Headers.'REMOTE_ADDR'
    UserAgent = $Request.Headers.'User-Agent'
    Referrer = $Request.Headers.'Referer'
}
```

**Frontend**: No changes needed - page views are tracked automatically when the profile data is fetched via `useApiGet`.

#### Update Link Click Tracking

Add `pageId` to link click tracking:

```typescript
// Track the click (fire and forget)
trackClick.mutate({
  url: 'public/TrackLinkClick',
  data: {
    linkId: link.id,
    username: username as string,
    pageId: profile?.pageId, // NEW: Include page context
    slug: pageSlug, // NEW: Include slug for reference
  },
});
```

### 5. Backend API Endpoints

#### Page View Tracking

**Integrated into existing endpoint** - `GET /public/GetUserProfile`

Page views are now tracked automatically within this endpoint using `Write-AnalyticsEvent`:

```powershell
Write-AnalyticsEvent -EventType "PageView" -UserId $userId -PageId $pageId -Metadata @{
    Slug = $slug
    IpAddress = $Request.Headers.'X-Forwarded-For'
    UserAgent = $Request.Headers.'User-Agent'
    Referrer = $Request.Headers.'Referer'
}
```

**No separate TrackPageView endpoint is needed.**

#### Link Click Tracking - `POST /public/TrackLinkClick` (UPDATED)

Request body:
```json
{
  "linkId": "link-guid",
  "username": "johndoe",
  "pageId": "page-guid",
  "slug": "music"
}
```

Backend tracks with `Write-AnalyticsEvent`:

```powershell
Write-AnalyticsEvent -EventType "LinkClick" -UserId $userId -PageId $pageId -Metadata @{
    LinkId = $linkId
    Slug = $slug
    # ... other metadata
}
```

#### Analytics Endpoint - `GET /admin/GetAnalytics` (UPDATED)

Query parameters:
- `pageId` (optional): Filter analytics by specific page
- If not provided: Return aggregated data across all pages + per-page breakdown

Response includes:
```json
{
  "summary": { /* overall stats */ },
  "pageBreakdown": [
    {
      "pageId": "guid-1",
      "pageName": "Main Links",
      "pageSlug": "main",
      "totalPageViews": 150,
      "totalLinkClicks": 45
    }
  ],
  "clicksByDay": [ /* filtered or all */ ],
  "recentLinkClicks": [ /* with pageId */ ]
}
```

Backend uses `Write-AnalyticsEvent` storage, filtering by pageId if provided.

#### Dashboard Stats - `GET /admin/GetDashboardStats` (UPDATED)

Query parameters:
- `pageId` (optional): Filter stats by specific page
- If not provided: Return aggregated stats across all pages

Backend uses `Write-AnalyticsEvent` storage for analytics data.

### 6. Database Schema Updates

#### Analytics Tables

**PageViews Table** (or existing analytics table):
- Add `PageId` column (string, nullable for backward compatibility)

**LinkClicks Table** (or existing analytics table):
- Add `PageId` column (string, nullable for backward compatibility)

## Implementation Steps

1. ✅ Update type definitions in `src/types/api.ts`
2. ✅ Update Dashboard page to support page context (optional filter)
3. ✅ Update Analytics page with page filter dropdown
4. ✅ Add page breakdown section to Analytics page
5. ✅ Update public page to track page views
6. ✅ Update public page link click tracking to include pageId
7. ✅ Document backend API changes
8. ✅ Test analytics filtering by page

## Testing Checklist

- [ ] Dashboard shows correct stats (all pages or filtered)
- [ ] Analytics page filter works correctly
- [ ] Page breakdown section displays when multiple pages exist
- [ ] Link clicks are tracked with correct pageId
- [ ] Page views are tracked with correct pageId
- [ ] Export includes page information
- [ ] Backward compatibility maintained (analytics without pageId still work)

## Backward Compatibility

- All `pageId` fields are optional
- Existing analytics without pageId are treated as belonging to default page
- API endpoints work without pageId parameter (aggregate view)
- Frontend gracefully handles missing pageId in analytics data
