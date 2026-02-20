"use client";

import { useEffect } from 'react';

export default function ClientRedirect({ href }: { href: string }) {
  useEffect(() => {
    window.location.replace(href);
  }, [href]);

  return null;
}
