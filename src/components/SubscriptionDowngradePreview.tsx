/**
 * Subscription Downgrade Preview Component
 * 
 * Displays what will happen when a user's subscription is downgraded or cancelled.
 * Shows affected features and allows user to choose which items to keep.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemText,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Chip,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  Cancel as RemoveIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { SubscriptionDowngradeAssessment } from '@/types/subscriptionDowngrade';
import { TIER_INFO } from '@/types/tiers';

interface SubscriptionDowngradePreviewProps {
  assessment: SubscriptionDowngradeAssessment;
  onConfirm?: (userSelections: {
    pageIds?: string[];
    linkIds?: string[];
    shortLinkSlugs?: string[];
  }) => void;
  onCancel?: () => void;
  showActions?: boolean;
}

export default function SubscriptionDowngradePreview({
  assessment,
  onConfirm,
  onCancel,
  showActions = true,
}: SubscriptionDowngradePreviewProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [selectedLinks, setSelectedLinks] = useState<string[]>([]);
  const [selectedShortLinks, setSelectedShortLinks] = useState<string[]>([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const { features, warnings, impactSummary, requiresUserAction } = assessment;

  // Initialize selections with items that will be kept
  useEffect(() => {
    const updateSelections = () => {
      if (features.pages?.pagesToKeep) {
        setSelectedPages(features.pages.pagesToKeep.map(p => p.id));
      }
      if (features.links?.linksToKeep) {
        setSelectedLinks(features.links.linksToKeep.map(l => l.id));
      }
      if (features.shortLinks?.shortLinksToKeep) {
        setSelectedShortLinks(features.shortLinks.shortLinksToKeep.map(sl => sl.slug));
      }
    };

    // Use a timeout to avoid setState in effect warning
    const timer = setTimeout(updateSelections, 0);
    return () => clearTimeout(timer);
  }, [features]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleConfirm = () => {
    if (requiresUserAction) {
      setConfirmDialogOpen(true);
    } else {
      onConfirm?.({});
    }
  };

  const handleConfirmWithSelections = () => {
    onConfirm?.({
      pageIds: selectedPages.length > 0 ? selectedPages : undefined,
      linkIds: selectedLinks.length > 0 ? selectedLinks : undefined,
      shortLinkSlugs: selectedShortLinks.length > 0 ? selectedShortLinks : undefined,
    });
    setConfirmDialogOpen(false);
  };

  const fromTierInfo = TIER_INFO[assessment.fromTier];
  const toTierInfo = TIER_INFO[assessment.toTier];

  return (
    <>
      <Card>
        <CardContent>
          {/* Tier Change Header */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Subscription Downgrade Preview
            </Typography>
            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
              <Chip
                label={fromTierInfo.displayName}
                color="primary"
                icon={<span>{fromTierInfo.icon}</span>}
              />
              <Typography variant="body2" color="text.secondary">→</Typography>
              <Chip
                label={toTierInfo.displayName}
                color="default"
                icon={<span>{toTierInfo.icon}</span>}
              />
            </Box>
          </Box>

          {/* Impact Summary */}
          {warnings.length > 0 ? (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <AlertTitle>Features will be affected</AlertTitle>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                {impactSummary}
              </Typography>
            </Alert>
          ) : (
            <Alert severity="success" sx={{ mb: 3 }}>
              <AlertTitle>No data loss</AlertTitle>
              All your content is compatible with the free tier. Your account will downgrade without any issues.
            </Alert>
          )}

          {/* Feature-by-Feature Breakdown */}
          {warnings.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                Affected Features:
              </Typography>

              {/* Pages */}
              {features.pages && (
                <Box sx={{ mb: 2 }}>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ cursor: 'pointer' }}
                    onClick={() => toggleSection('pages')}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <RemoveIcon color="warning" fontSize="small" />
                      <Typography variant="body2">
                        Pages: {features.pages.pagesToRemove.length} will be removed
                      </Typography>
                    </Box>
                    <IconButton size="small">
                      {expandedSections.pages ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Box>
                  <Collapse in={expandedSections.pages}>
                    <List dense sx={{ pl: 4 }}>
                      {features.pages.pagesToRemove.map(page => (
                        <ListItem key={page.id}>
                          <ListItemText
                            primary={page.name}
                            secondary={page.slug}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                </Box>
              )}

              {/* Theme */}
              {features.theme && features.theme.willRevert && (
                <Box sx={{ mb: 2 }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <RemoveIcon color="warning" fontSize="small" />
                    <Typography variant="body2">
                      Theme: Will revert to &quot;{features.theme.defaultTheme}&quot;
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Links */}
              {features.links && (
                <Box sx={{ mb: 2 }}>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ cursor: 'pointer' }}
                    onClick={() => toggleSection('links')}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <RemoveIcon color="warning" fontSize="small" />
                      <Typography variant="body2">
                        Links: {features.links.linksToRemove.length} will be removed
                        {features.links.featuresRemoved.length > 0 && 
                          `, ${features.links.featuresRemoved.length} premium features disabled`
                        }
                      </Typography>
                    </Box>
                    <IconButton size="small">
                      {expandedSections.links ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Box>
                  <Collapse in={expandedSections.links}>
                    {features.links.linksToRemove.length > 0 && (
                      <List dense sx={{ pl: 4 }}>
                        {features.links.linksToRemove.map(link => (
                          <ListItem key={link.id}>
                            <ListItemText
                              primary={link.title}
                              secondary={link.url}
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                    {features.links.featuresRemoved.length > 0 && (
                      <Box sx={{ pl: 4, pt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Features to be removed: {features.links.featuresRemoved.join(', ')}
                        </Typography>
                      </Box>
                    )}
                  </Collapse>
                </Box>
              )}

              {/* Short Links */}
              {features.shortLinks && (
                <Box sx={{ mb: 2 }}>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ cursor: 'pointer' }}
                    onClick={() => toggleSection('shortLinks')}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <RemoveIcon color="warning" fontSize="small" />
                      <Typography variant="body2">
                        Short Links: {features.shortLinks.shortLinksToRemove.length} will be deactivated
                      </Typography>
                    </Box>
                    <IconButton size="small">
                      {expandedSections.shortLinks ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Box>
                  <Collapse in={expandedSections.shortLinks}>
                    <List dense sx={{ pl: 4 }}>
                      {features.shortLinks.shortLinksToRemove.map(shortLink => (
                        <ListItem key={shortLink.slug}>
                          <ListItemText
                            primary={shortLink.title}
                            secondary={`/${shortLink.slug} → ${shortLink.targetUrl}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                </Box>
              )}

              {/* Sub Accounts */}
              {features.subAccounts && features.subAccounts.subAccountsToSuspend.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <RemoveIcon color="warning" fontSize="small" />
                    <Typography variant="body2">
                      Sub-Accounts: {features.subAccounts.subAccountsToSuspend.length} will be suspended
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* API Access */}
              {features.apiAccess && features.apiAccess.apiKeysToRevoke.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <RemoveIcon color="warning" fontSize="small" />
                    <Typography variant="body2">
                      API Access: {features.apiAccess.apiKeysToRevoke.length} key(s) will be revoked
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Other Features */}
              {features.customLogos && (
                <Box sx={{ mb: 1 }} display="flex" alignItems="center" gap={1}>
                  <RemoveIcon color="warning" fontSize="small" />
                  <Typography variant="body2">Custom logo will be disabled</Typography>
                </Box>
              )}
              {features.videoBackgrounds && (
                <Box sx={{ mb: 1 }} display="flex" alignItems="center" gap={1}>
                  <RemoveIcon color="warning" fontSize="small" />
                  <Typography variant="body2">Video backgrounds will be disabled</Typography>
                </Box>
              )}
              {features.customDomain && (
                <Box sx={{ mb: 1 }} display="flex" alignItems="center" gap={1}>
                  <RemoveIcon color="warning" fontSize="small" />
                  <Typography variant="body2">Custom domain will be disconnected</Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Actions */}
          {showActions && (
            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              {onCancel && (
                <Button onClick={onCancel} variant="outlined">
                  Keep Subscription
                </Button>
              )}
              {onConfirm && (
                <Button
                  onClick={handleConfirm}
                  variant="contained"
                  color={warnings.length > 0 ? 'warning' : 'primary'}
                >
                  {requiresUserAction ? 'Choose Items to Keep' : 'Proceed with Downgrade'}
                </Button>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog for User Selections */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Choose Items to Keep</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            <AlertTitle>Select which items to keep</AlertTitle>
            You can only keep a limited number of items in the free tier. Please select which items you want to keep.
          </Alert>

          {/* Page Selection */}
          {features.pages && features.pages.pagesToRemove.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Pages (keep up to {features.pages.pagesToKeep.length})
              </Typography>
              <List>
                {[...features.pages.pagesToKeep, ...features.pages.pagesToRemove].map(page => (
                  <ListItem key={page.id}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedPages.includes(page.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Only add if we haven't reached the limit
                              if (selectedPages.length < features.pages!.pagesToKeep.length) {
                                setSelectedPages([...selectedPages, page.id]);
                              }
                            } else {
                              setSelectedPages(selectedPages.filter(id => id !== page.id));
                            }
                          }}
                          disabled={!selectedPages.includes(page.id) && selectedPages.length >= features.pages!.pagesToKeep.length}
                        />
                      }
                      label={`${page.name} (${page.slug})`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Link Selection */}
          {features.links && features.links.linksToRemove.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Links (keep up to {features.links.linksToKeep.length})
              </Typography>
              <List>
                {[...features.links.linksToKeep, ...features.links.linksToRemove].map(link => (
                  <ListItem key={link.id}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedLinks.includes(link.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Only add if we haven't reached the limit
                              if (selectedLinks.length < features.links!.linksToKeep.length) {
                                setSelectedLinks([...selectedLinks, link.id]);
                              }
                            } else {
                              setSelectedLinks(selectedLinks.filter(id => id !== link.id));
                            }
                          }}
                          disabled={!selectedLinks.includes(link.id) && selectedLinks.length >= features.links!.linksToKeep.length}
                        />
                      }
                      label={`${link.title} - ${link.url}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Short Link Selection */}
          {features.shortLinks && features.shortLinks.shortLinksToRemove.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Short Links (keep up to {features.shortLinks.shortLinksToKeep.length})
              </Typography>
              <List>
                {[...features.shortLinks.shortLinksToKeep, ...features.shortLinks.shortLinksToRemove].map(shortLink => (
                  <ListItem key={shortLink.slug}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedShortLinks.includes(shortLink.slug)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Only add if we haven't reached the limit
                              if (selectedShortLinks.length < features.shortLinks!.shortLinksToKeep.length) {
                                setSelectedShortLinks([...selectedShortLinks, shortLink.slug]);
                              }
                            } else {
                              setSelectedShortLinks(selectedShortLinks.filter(slug => slug !== shortLink.slug));
                            }
                          }}
                          disabled={!selectedShortLinks.includes(shortLink.slug) && selectedShortLinks.length >= features.shortLinks!.shortLinksToKeep.length}
                        />
                      }
                      label={`/${shortLink.slug} → ${shortLink.targetUrl}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmWithSelections} variant="contained" color="warning">
            Confirm Downgrade
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
