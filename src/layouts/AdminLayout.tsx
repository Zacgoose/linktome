import { useRouter } from 'next/router';
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
import { useAuth } from '@/hooks/useAuth';

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
  const { user, loading, logout, canAccessRoute, hasAllPermissions, hasAnyRole } = useAuth();

  // Centralized authentication enforcement with route-based permission checking
  // Show loading spinner while checking auth
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Not authenticated - redirect happens in useAuth
  if (!user) {
    return null;
  }

  // Check if user can access current route
  const currentPath = router.pathname;
  if (!canAccessRoute(currentPath)) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          gap: 2,
          p: 3,
        }}
      >
        <Typography variant="h4" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center">
          You don't have permission to access this page.
        </Typography>
        <Button
          variant="contained"
          onClick={() => router.push('/admin/dashboard')}
          sx={{ mt: 2 }}
        >
          Go to Dashboard
        </Button>
      </Box>
    );
  }

  const handleLogout = () => {
    logout();
  };

  // Filter menu items based on user permissions
  const visibleMenuItems = menuItems.filter((item) => {
    // Check role requirements
    if (item.requiredRoles && item.requiredRoles.length > 0) {
      if (!hasAnyRole(item.requiredRoles)) {
        return false;
      }
    }
    
    // Check permission requirements
    if (item.requiredPermissions && item.requiredPermissions.length > 0) {
      if (!hasAllPermissions(item.requiredPermissions)) {
        return false;
      }
    }
    
    return true;
  });

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