"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Wrench } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useRegisterServiceRecord } from "@/hooks/use-services";
import { ApiClientError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import type { Service } from "@/lib/types";

/** El contenido se monta solo con un servicio elegido, así el formulario arranca limpio cada vez. */
export function ChargeServiceDialog({
  service,
  onOpenChange,
}: {
  service: Service | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!service} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {service && <ChargeForm key={service.id} service={service} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ChargeForm({ service, onDone }: { service: Service; onDone: () => void }) {
  const [price, setPrice] = useState(String(Number(service.price)));
  const [notes, setNotes] = useState("");
  const register = useRegisterServiceRecord();

  const amount = Number(price);
  const valid = price.trim() !== "" && Number.isFinite(amount) && amount >= 0;

  async function submit() {
    if (!valid) return;
    try {
      await register.mutateAsync({ service_id: service.id, price: amount, notes: notes.trim() || undefined });
      toast.success("Servicio cobrado", { description: `${service.name} · ${formatCurrency(amount)}` });
      onDone();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "No se pudo registrar el cobro");
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Cobrar servicio</DialogTitle>
        <DialogDescription>{service.name}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="charge-price">Monto ($MXN)</Label>
          <Input
            id="charge-price"
            type="number"
            min={0}
            step="0.01"
            autoFocus
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="tabular-nums"
          />
          <p className="text-xs text-muted-foreground">Tarifa: {formatCurrency(service.price)}. Cámbialo si hoy cobras distinto.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="charge-notes">Notas (opcional)</Label>
          <Input id="charge-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Cliente, equipo..." />
        </div>
        <div className="flex items-center justify-between rounded-lg bg-accent px-4 py-3">
          <span className="text-sm font-medium text-accent-foreground">Total a cobrar</span>
          <span className="font-display text-xl font-semibold tabular-nums text-accent-foreground">
            {formatCurrency(valid ? amount : 0)}
          </span>
        </div>
        <Button onClick={submit} disabled={!valid || register.isPending} className="w-full cursor-pointer gap-2">
          {register.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
          Registrar cobro
        </Button>
      </div>
    </>
  );
}
