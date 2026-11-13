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
import { useCreateService, useUpdateService } from "@/hooks/use-services";
import { ApiClientError } from "@/lib/api-client";
import type { Service } from "@/lib/types";

const schema = z.object({
  name: z.string().trim().min(1, "Requerido").max(120),
  description: z.string().max(255),
  price: z.coerce.number().min(0, "No puede ser negativo"),
  is_active: z.boolean(),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

const EMPTY: FormInput = { name: "", description: "", price: 0, is_active: true };

const SUGGESTIONS = ["Cambio de pantalla", "Cambio de batería", "Formateo", "Limpieza de bocina", "Cambio de puerto de carga"];

export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  existingNames,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
  existingNames: string[];
}) {
  const isEdit = !!service;
  const create = useCreateService();
  const update = useUpdateService(service?.id ?? "");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  useEffect(() => {
    if (!open) return;
    reset(
      service
        ? {
            name: service.name,
            description: service.description ?? "",
            price: Number(service.price),
            is_active: service.is_active,
          }
        : EMPTY,
    );
  }, [open, service, reset]);

  const isPending = create.isPending || update.isPending;
  const active = watch("is_active");
  const currentName = watch("name");
  const suggestions = SUGGESTIONS.filter((s) => !existingNames.includes(s));

  async function onSubmit(values: FormValues) {
    const body = { name: values.name, description: values.description.trim() || null, price: values.price };
    try {
      if (isEdit) {
        await update.mutateAsync({ ...body, is_active: values.is_active });
        toast.success("Servicio actualizado");
      } else {
        await create.mutateAsync(body);
        toast.success("Servicio agregado a tus tarifas");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "No se pudo guardar el servicio");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
          <DialogDescription>Define cuánto cobras por este servicio técnico.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!isEdit && suggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Ideas rápidas</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setValue("name", s, { shouldValidate: true })}
                    className={
                      "cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors " +
                      (currentName === s
                        ? "border-primary bg-accent text-accent-foreground"
                        : "border-border text-muted-foreground hover:bg-muted")
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="service-name">Servicio</Label>
            <Input id="service-name" {...register("name")} placeholder="Cambio de pantalla" />
            {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-price">Lo que cobras ($MXN)</Label>
            <Input id="service-price" type="number" min={0} step="0.01" className="tabular-nums" {...register("price")} />
            {errors.price && <p className="text-xs text-danger">{errors.price.message}</p>}
            <p className="text-xs text-muted-foreground">Puedes cambiar el monto al cobrar cada servicio.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-description">Detalle (opcional)</Label>
            <Input id="service-description" {...register("description")} placeholder="Incluye mano de obra y mica" />
          </div>

          {isEdit && (
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setValue("is_active", e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
              />
              <span>
                <span className="block text-sm font-medium">Servicio activo</span>
                <span className="block text-xs text-muted-foreground">
                  Si lo desactivas ya no se puede cobrar, pero se conserva el historial.
                </span>
              </span>
            </label>
          )}

          <Button type="submit" disabled={isPending} className="w-full cursor-pointer gap-2">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Guardar cambios" : "Agregar servicio"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
