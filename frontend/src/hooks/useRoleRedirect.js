import { useMemo } from 'react';

function useRoleRedirect(role) {
  return useMemo(() => {
    if (role === 'admin') return '/admin';
    if (role === 'officer') return '/officer';
    if (role === 'citizen') return '/citizen';
    return '/login';
  }, [role]);
}

export default useRoleRedirect;
