"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, PackagePlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useRestockProduct } from "@/hooks/use-products";
import { ApiClientError } from "@/lib/api-client";
import type { Product } from "@/lib/types";

export function RestockDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}) {
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const restock = useRestockProduct();

  async function handleSubmit() {
    if (!product) return;
    try {
      await restock.mutateAsync({ id: product.id, quantity, note: note || undefined });
      toast.success("Inventario actualizado", {
        description: `${product.name}: +${quantity} pieza(s)`,
      });
      onOpenChange(false);
      setQuantity(1);
      setNote("");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "No se pudo resurtir el producto");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Resurtir inventario</DialogTitle>
          <DialogDescription>{product ? `${product.name} · ${product.code}` : ""}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="restock-qty">Piezas que llegaron</Label>
            <Input
              id="restock-qty"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="restock-note">Nota (opcional)</Label>
            <Input id="restock-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Pedido a proveedor..." />
          </div>
          <Button onClick={handleSubmit} disabled={restock.isPending} className="w-full cursor-pointer gap-2">
            {restock.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
            Confirmar resurtido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
