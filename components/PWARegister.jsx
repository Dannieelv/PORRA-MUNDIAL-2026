'use client';
import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').then(reg => {

      // Cuando hay un nuevo SW instalado y esperando, dile que tome el control ya
      const activate = (worker) => {
        worker.postMessage({ type: 'SKIP_WAITING' });
      };

      if (reg.waiting) {
        activate(reg.waiting);
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            activate(newWorker);
          }
        });
      });
    }).catch(() => {});

    // Cuando el SW cambia de controlador, recarga la página para servir la versión nueva
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
  }, []);

  return null;
}
