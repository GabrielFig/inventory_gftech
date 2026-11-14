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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSuppliers, useCategories } from "@/hooks/use-lookups";
import { useCreateProduct, useUpdateProduct } from "@/hooks/use-products";
import { ApiClientError } from "@/lib/api-client";
import type { Product } from "@/lib/types";

const schema = z.object({
  supplier_id: z.string().min(1, "Selecciona un proveedor"),
  category_id: z.string().min(1, "Selecciona una categoría"),
  name: z.string().min(1, "Requerido").max(150),
  model_compatibility: z.string().min(1, "Requerido").max(255),
  cost: z.coerce.number().positive("Debe ser mayor a 0"),
  sale_price: z.coerce.number().positive("Debe ser mayor a 0"),
  initial_stock: z.coerce.number().int().min(0),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}) {
  const isEdit = !!product;
  const { data: suppliers } = useSuppliers();
  const { data: categories } = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct(product?.id ?? "");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      supplier_id: "",
      category_id: "",
      name: "",
      model_compatibility: "",
      cost: 0,
      sale_price: 0,
      initial_stock: 0,
    },
  });

  useEffect(() => {
    if (open) {
      reset(
        product
          ? {
              supplier_id: product.supplier_id,
              category_id: product.category_id,
              name: product.name,
              model_compatibility: product.model_compatibility,
              cost: Number(product.cost),
              sale_price: Number(product.sale_price),
              initial_stock: product.initial_stock,
            }
          : {
              supplier_id: "",
              category_id: "",
              name: "",
              model_compatibility: "",
              cost: 0,
              sale_price: 0,
              initial_stock: 0,
            },
      );
    }
  }, [open, product, reset]);

  const isPending = createProduct.isPending || updateProduct.isPending;

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit) {
        const { initial_stock, ...rest } = values;
        void initial_stock;
        await updateProduct.mutateAsync(rest);
        toast.success("Producto actualizado");
      } else {
        await createProduct.mutateAsync(values);
        toast.success("Producto agregado al catálogo");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "No se pudo guardar el producto");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar producto" : "Agregar producto"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Actualiza los datos de ${product?.code}.`
              : "Se generará un ID de inventario automáticamente."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Proveedor</Label>
              <Select
                items={Object.fromEntries((suppliers ?? []).map((s) => [s.id, s.name]))}
                value={watch("supplier_id")}
                onValueChange={(v) => setValue("supplier_id", v ?? "", { shouldValidate: true })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.supplier_id && <p className="text-xs text-danger">{errors.supplier_id.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select
                items={Object.fromEntries((categories ?? []).map((c) => [c.id, c.name]))}
                value={watch("category_id")}
                onValueChange={(v) => setValue("category_id", v ?? "", { shouldValidate: true })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category_id && <p className="text-xs text-danger">{errors.category_id.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nombre del producto</Label>
            <Input id="name" {...register("name")} placeholder="Ghostic Acrigel" />
            {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="model_compatibility">Modelo / compatibilidad</Label>
            <Input id="model_compatibility" {...register("model_compatibility")} placeholder="iPhone 15 / 15 Pro" />
            {errors.model_compatibility && <p className="text-xs text-danger">{errors.model_compatibility.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost">Costo ($MXN)</Label>
              <Input id="cost" type="number" step="0.01" {...register("cost")} />
              {errors.cost && <p className="text-xs text-danger">{errors.cost.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale_price">Precio venta ($MXN)</Label>
              <Input id="sale_price" type="number" step="0.01" {...register("sale_price")} />
              {errors.sale_price && <p className="text-xs text-danger">{errors.sale_price.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="initial_stock">Stock inicial</Label>
              <Input id="initial_stock" type="number" disabled={isEdit} {...register("initial_stock")} />
            </div>
          </div>

          <Button type="submit" disabled={isPending} className="w-full cursor-pointer gap-2">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Guardar cambios" : "Agregar producto"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
