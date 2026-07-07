'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { LayoutDashboard, ListOrdered, Swords } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/leaderboard', icon: ListOrdered, label: 'Leaderboard' },
  { href: '/matches', icon: Swords, label: 'Matches' },
] as const;

export default function BottomBar() {
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  if (!user) return null;

  return (
    <>
      <nav className="bottom-bar" aria-label="Main navigation">
        <div className="bottom-bar-inner">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href;

            return (
              <Link
                key={href}
                href={href}
                className={`bottom-bar-item${isActive ? ' active' : ''}`}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="bottom-bar-indicator" aria-hidden="true" />
                <Icon
                  size={24}
                  strokeWidth={isActive ? 2.5 : 2}
                  className="bottom-bar-icon"
                />
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="bottom-bar-spacer" aria-hidden="true" />
    </>
  );
}
