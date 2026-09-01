import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);

  const user = localStorage.getItem('user');

  if (!user) {
    return router.createUrlTree(['/login']);
  }

  try {
    const parsedUser = JSON.parse(user);

    if (parsedUser.role === 'ADMIN') {
      return true;
    }

    return router.createUrlTree(['/videos']);
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    return router.createUrlTree(['/login']);
  }
};
