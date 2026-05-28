"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 30000);
    return () => clearInterval(interval);
  }, [router]);

  return null;
}
