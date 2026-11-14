"use client";

import { MoreHorizontal, PackagePlus, Pencil, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

interface Actions {
  /** Solo el administrador edita y elimina; resurtir lo puede hacer cualquiera. */
  canManage: boolean;
  onEdit: (product: Product) => void;
  onRestock: (product: Product) => void;
  onDelete: (product: Product) => void;
}

function RowActions({ product, actions, className }: { product: Product; actions: Actions; className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn("cursor-pointer", className)}
            aria-label={`Acciones de ${product.name}, ${product.model_compatibility}`}
          />
        }
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => actions.onRestock(product)} className="cursor-pointer">
          <PackagePlus className="h-4 w-4" />
          Resurtir
        </DropdownMenuItem>
        {actions.canManage && (
          <>
            <DropdownMenuItem onClick={() => actions.onEdit(product)} className="cursor-pointer">
              <Pencil className="h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => actions.onDelete(product)}
              className="cursor-pointer text-danger focus:text-danger"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ProductsTable({
  products,
  isLoading,
  ...actions
}: {
  products: Product[];
  isLoading: boolean;
} & Actions) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        No hay productos que coincidan con los filtros.
      </div>
    );
  }

  return (
    <>
      {/* Celular: una tarjeta por producto, con precio y stock a la vista. */}
      <ul className="space-y-2 md:hidden">
        {products.map((product) => (
          <li key={product.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium leading-snug">{product.name}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{product.model_compatibility}</p>
              </div>
              <RowActions product={product} actions={actions} className="-mr-1 -mt-1 size-11" />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{product.code}</span>
                <span aria-hidden>·</span>
                <span>{product.category.name}</span>
              </div>
              <StatusBadge status={product.status} />
            </div>
            <div className="mt-2 flex items-baseline justify-between border-t border-border pt-2">
              <span className="font-display text-lg font-semibold tabular-nums">
                {formatCurrency(product.sale_price)}
              </span>
              <span className="text-sm tabular-nums text-muted-foreground">
                {product.current_stock} pza{product.current_stock === 1 ? "" : "s"}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Costo</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-10">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{product.code}</TableCell>
                <TableCell>
                  <div className="font-medium">{product.name}</div>
                  <div className="text-xs text-muted-foreground">{product.supplier.name}</div>
                </TableCell>
                <TableCell className="max-w-56 truncate text-sm text-muted-foreground" title={product.model_compatibility}>
                  {product.model_compatibility}
                </TableCell>
                <TableCell className="text-sm">{product.category.name}</TableCell>
                <TableCell className="text-right tabular-nums text-sm">{formatCurrency(product.cost)}</TableCell>
                <TableCell className="text-right tabular-nums text-sm font-medium">
                  {formatCurrency(product.sale_price)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">{product.current_stock}</TableCell>
                <TableCell>
                  <StatusBadge status={product.status} />
                </TableCell>
                <TableCell>
                  <RowActions product={product} actions={actions} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
