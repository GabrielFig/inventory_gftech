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
import type { Product } from "@/lib/types";

export function ProductsTable({
  products,
  isLoading,
  onEdit,
  onRestock,
  onDelete,
}: {
  products: Product[];
  isLoading: boolean;
  onEdit: (product: Product) => void;
  onRestock: (product: Product) => void;
  onDelete: (product: Product) => void;
}) {
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
    <div className="overflow-x-auto rounded-xl border border-border">
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
            <TableHead className="w-10" />
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
              <TableCell className="max-w-56 truncate text-sm text-muted-foreground">
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
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" size="icon-sm" className="cursor-pointer" aria-label="Acciones" />}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onRestock(product)} className="cursor-pointer">
                      <PackagePlus className="h-4 w-4" />
                      Resurtir
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(product)} className="cursor-pointer">
                      <Pencil className="h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(product)} className="cursor-pointer text-danger focus:text-danger">
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
