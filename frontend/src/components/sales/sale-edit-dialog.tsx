"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useUpdateSale } from "@/hooks/use-sales";
import { ApiClientError } from "@/lib/api-client";
import type { Sale } from "@/lib/types";

const schema = z.object({
  quantity: z.coerce.number().int().positive("Debe ser mayor a 0"),
  unit_price: z.coerce.number().positive("Debe ser mayor a 0"),
  notes: z.string().max(255).optional(),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

export function SaleEditDialog({
  open,
  onOpenChange,
  sale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
}) {
  const updateSale = useUpdateSale(sale?.id ?? "");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: 1, unit_price: 0, notes: "" },
  });

  useEffect(() => {
    if (open && sale) {
      reset({
        quantity: sale.quantity,
        unit_price: Number(sale.unit_price),
        notes: sale.notes ?? "",
      });
    }
  }, [open, sale, reset]);

  async function onSubmit(values: FormValues) {
    try {
      await updateSale.mutateAsync({
        quantity: values.quantity,
        unit_price: values.unit_price,
        notes: values.notes || undefined,
      });
      toast.success("Venta actualizada");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "No se pudo actualizar la venta");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar venta</DialogTitle>
          <DialogDescription>{sale ? `${sale.product.name} · ${sale.product.code}` : ""}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad</Label>
              <Input id="quantity" type="number" min={1} {...register("quantity")} />
              {errors.quantity && <p className="text-xs text-danger">{errors.quantity.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_price">Precio unitario</Label>
              <Input id="unit_price" type="number" step="0.01" {...register("unit_price")} />
              {errors.unit_price && <p className="text-xs text-danger">{errors.unit_price.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Input id="notes" {...register("notes")} placeholder="Cliente, forma de pago..." />
          </div>

          <Button type="submit" disabled={updateSale.isPending} className="w-full cursor-pointer gap-2">
            {updateSale.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar cambios
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
