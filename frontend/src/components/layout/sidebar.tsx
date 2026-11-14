"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, Search, AlertTriangle, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/", label: "Resumen", icon: LayoutDashboard },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/ventas", label: "Ventas", icon: ShoppingCart },
  { href: "/servicios", label: "Servicios", icon: Wrench },
  { href: "/buscador", label: "Buscador por modelo", icon: Search },
  { href: "/alertas", label: "Alertas de stock", icon: AlertTriangle },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-16 items-center px-6">
        <Image
          src="/logo/gftech-dark-bg.svg"
          alt="GF Tech"
          width={193}
          height={40}
          priority
          unoptimized
          className="h-7 w-auto"
        />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border px-6 py-4">
        <p className="text-xs text-sidebar-foreground/50">Los Mochis, Sinaloa</p>
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-sidebar-foreground/30">
          <Image src="/logo/gftech-icon.svg" alt="" width={12} height={12} unoptimized className="h-3 w-3" />
          Diseñado por GF Tech
        </p>
      </div>
    </aside>
  );
}
