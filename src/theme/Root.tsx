import React from 'react';
import { ProgressProvider } from '@site/src/context/ProgressContext'; // Adjust path if needed

// Default implementation, that you can customize
export default function Root({ children }: { children: React.ReactNode }) {
  return <ProgressProvider>{children}</ProgressProvider>;
}