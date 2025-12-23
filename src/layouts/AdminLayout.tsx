import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Select,
  MenuItem as MuiMenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Link as LinkIcon,
  Person as PersonIcon,
  Palette as PaletteIcon,
  BarChart as AnalyticsIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { useAuthContext } from '@/providers/AuthProvider';
import { useRbacContext } from '@/context/RbacContext';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const drawerWidth = 240;

interface MenuItem {
  text: string;
  icon: React.ReactElement;
  path: string;
  requiredPermissions?: string[];
  requiredRoles?: string[];
}

const menuItems: MenuItem[] = [
  { 
    text: 'Dashboard', 
    icon: <DashboardIcon />, 
    path: '/admin/dashboard',
    requiredPermissions: ['read:dashboard'],
  },
  { 
    text: 'Links', 
    icon: <LinkIcon />, 
    path: '/admin/links',
    requiredPermissions: ['read:links'],
  },
  { 
    text: 'Profile', 
    icon: <PersonIcon />, 
    path: '/admin/profile',
    requiredPermissions: ['read:profile'],
  },
  { 
    text: 'Appearance', 
    icon: <PaletteIcon />, 
    path: '/admin/appearance',
    requiredPermissions: ['read:appearance'],
  },
  { 
    text: 'Analytics', 
    icon: <AnalyticsIcon />, 
    path: '/admin/analytics',
    requiredPermissions: ['read:analytics'],
  },
  { 
    text: 'Users', 
    icon: <PeopleIcon />, 
    path: '/admin/users',
    requiredPermissions: ['read:users'],
    requiredRoles: ['admin', 'company_owner'],
  },
  { 
    text: 'Company', 
    icon: <BusinessIcon />, 
    path: '/admin/company',
    requiredPermissions: ['read:company'],
    requiredRoles: ['company_owner'],
  },
];


export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const { user, logout, loading } = useAuthContext();
  const { selectedContext, setSelectedContext } = useRbacContext();

  // If user has no company memberships, ensure context is 'user'
  useEffect(() => {
    if (user && (!user.companyMemberships || user.companyMemberships.length === 0) && selectedContext !== 'user') {
      setSelectedContext('user');
    }
  }, [user, selectedContext, setSelectedContext]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Don't render content if not authenticated (redirect will happen via useEffect)
  if (!user) {
    return null;
  }

  // Determine context: global (user) or company
  let contextRoles: string[] = user?.roles || [];
  let contextPermissions: string[] = user?.permissions || [];
  if (selectedContext !== 'user' && user?.companyMemberships) {
    const company = user.companyMemberships.find((c) => c.companyId === selectedContext);
    if (company) {
      contextRoles = [company.role];
      contextPermissions = company.permissions;
    }
  }

  // Filter menu items based on context permissions and roles
  const visibleMenuItems = menuItems.filter((item) => {
    // Check role requirements
    if (item.requiredRoles && item.requiredRoles.length > 0) {
      if (!item.requiredRoles.some((role) => contextRoles.includes(role))) {
        return false;
      }
    }
    // Check permission requirements
    if (item.requiredPermissions && item.requiredPermissions.length > 0) {
      if (!item.requiredPermissions.every((perm) => contextPermissions.includes(perm))) {
        return false;
      }
    }
    return true;
  });

  const handleLogout = () => {
    logout();
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar 
        position="fixed" 
        elevation={1} 
        sx={{ 
          bgcolor: 'white', 
          color: 'text.primary',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700, color: 'primary.main' }}>
            LinkToMe
          </Typography>
          {/* Context Switcher: Only show if user has company memberships */}
          {user && user.companyMemberships && user.companyMemberships.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 180, mr: 2 }}>
              <InputLabel id="context-switch-label">Context</InputLabel>
              <Select
                labelId="context-switch-label"
                value={selectedContext}
                label="Context"
                onChange={(e) => setSelectedContext(e.target.value)}
              >
                <MuiMenuItem value="user">My Account</MuiMenuItem>
                {user.companyMemberships.map((company) => (
                  <MuiMenuItem key={company.companyId} value={company.companyId}>
                    {company.companyName || company.companyId}
                  </MuiMenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <Button variant="outlined" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', mt: 2 }}>
          <List>
            {visibleMenuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={router.pathname === item.path}
                  onClick={() => router.push(item.path)}
                  sx={{
                    '&.Mui-selected': {
                      bgcolor: 'primary.light',
                      '&:hover': {
                        bgcolor: 'primary.light',
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: router.pathname === item.path ? 'primary.main' : 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'grey.50' }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}