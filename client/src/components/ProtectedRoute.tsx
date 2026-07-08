import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '@/store/auth';
import { FullPageLoader } from '@/components/ui/Spinner';

export function ProtectedRoute({
  children,
  adminOnly,
}: {
  children: ReactNode;
  adminOnly?: boolean;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader />;
  if (!user)
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (adminOnly && !user.isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}
