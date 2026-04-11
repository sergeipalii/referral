'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/partners', label: 'Partners', icon: 'P' },
  { href: '/rules', label: 'Accrual Rules', icon: 'R' },
  { href: '/conversions', label: 'Conversions', icon: 'C' },
  { href: '/payments', label: 'Payments', icon: '$' },
  { href: '/analytics', label: 'Analytics', icon: 'A' },
  { href: '/api-keys', label: 'API Keys', icon: 'K' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 w-56 border-r border-gray-200 bg-white flex flex-col">
      <div className="px-4 py-5 border-b border-gray-200">
        <Link href="/" className="text-lg font-bold text-indigo-600">
          Referral System
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
