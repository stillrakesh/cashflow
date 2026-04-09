// ============================================
// CafeFlow v3.5 — Realistic Data Enrichment
// ============================================

import type { VersionInfo } from '../types';

// Mock data has been removed. CafeFlow v4.0 is a multi-tenant platform.
// All users start with a clean workspace when they create an organization.

export const versions: VersionInfo[] = [
  {
    version: '3.5.0',
    date: '2026-04-07',
    changelog: [
      'Split Login (Admin Manual entry vs Staff Profile selection)',
      'Advanced Verification-based Admin PIN recovery (Email/Mobile)',
      'Granular Data Manager with date-range wiping',
      'Realistic high-volume mock data set',
      'Staff PIN reset tool for Admins',
    ],
  },
  {
    version: '3.1.0',
    date: '2026-04-06',
    changelog: [
      'Multi-User RBAC system with Privacy Mode',
      'AI Vision receipt scanning (Gemini 1.5 Flash)',
      'High-fidelity Branded PDF generating',
      'Persistent Security PIN Lock',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-04-05',
    changelog: [
      'Initial release of Cafe Financial Dashboard',
      'Basic sales & expense tracking',
    ],
  },
];
