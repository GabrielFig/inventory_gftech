"use client";

import { useState } from "react";
import { CalendarDays, CalendarRange, MoreHorizontal, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChargeServiceDialog } from "@/components/services/charge-service-dialog";
import { ServiceFormDialog } from "@/components/services/service-form-dialog";
import {
  useDeleteService,
  useDeleteServiceRecord,
  useIncome,
  useServiceRecords,
  useServices,
} from "@/hooks/use-services";
import { useAuth } from "@/hooks/use-auth";
import { ApiClientError } from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Service, ServiceRecord } from "@/lib/types";

/** Medianoche local de hoy y del día 1 del mes, calculadas una sola vez al montar. */
function periodStarts() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  return { today: today.toISOString(), month: month.toISOString() };
}

export default function ServicesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [starts] = useState(periodStarts);

  const services = useServices();
  const records = useServiceRecords();
  const todayIncome = useIncome(starts.today);
  const monthIncome = useIncome(starts.month);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [charging, setCharging] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<ServiceRecord | null>(null);
  const deleteService = useDeleteService();
  const deleteRecord = useDeleteServiceRecord();

  function openForm(service: Service | null) {
    setEditing(service);
    setFormOpen(true);
  }

  async function handleDeleteService() {
    if (!deletingService) return;
    try {
      await deleteService.mutateAsync(deletingService.id);
      toast.success("Servicio eliminado");
      setDeletingService(null);
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "No se pudo eliminar el servicio");
    }
  }

  async function handleDeleteRecord() {
    if (!deletingRecord) return;
    try {
      await deleteRecord.mutateAsync(deletingRecord.id);
      toast.success("Cobro eliminado");
      setDeletingRecord(null);
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "No se pudo eliminar el cobro");
    }
  }

  const rate = (v?: string) => (v === undefined ? "—" : formatCurrency(v));
  const count = (n?: number) => (n === undefined ? "" : `${n} servicio(s)`);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Servicios cobrados hoy"
          value={rate(todayIncome.data?.summary.services_revenue)}
          hint={count(todayIncome.data?.summary.services_count)}
          icon={CalendarDays}
        />
        <StatCard
          label="Servicios cobrados este mes"
          value={rate(monthIncome.data?.summary.services_revenue)}
          hint={count(monthIncome.data?.summary.services_count)}
          icon={CalendarRange}
        />
      </div>

      <Tabs defaultValue="tarifas">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="tarifas" className="cursor-pointer">
              Mis tarifas
            </TabsTrigger>
            <TabsTrigger value="cobrados" className="cursor-pointer">
              Cobrados
            </TabsTrigger>
          </TabsList>
          {isAdmin && (
            <Button onClick={() => openForm(null)} className="cursor-pointer gap-1.5">
              <Plus className="h-4 w-4" />
              Nuevo servicio
            </Button>
          )}
        </div>

        <TabsContent value="tarifas" className="mt-4">
          {services.isLoading ? (
            <ListSkeleton rows={4} />
          ) : services.data && services.data.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {services.data.map((service) => (
                <div
                  key={service.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-xl border border-border bg-card p-4",
                    !service.is_active && "opacity-60",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{service.name}</p>
                      {service.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{service.description}</p>
                      )}
                    </div>
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon" className="-mr-1 size-10 cursor-pointer md:size-8" aria-label="Acciones del servicio" />}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openForm(service)} className="cursor-pointer">
                            <Pencil className="h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletingService(service)}
                            className="cursor-pointer text-danger focus:text-danger"
                          >
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <div className="mt-auto flex items-end justify-between gap-2">
                    <div>
                      <p className="font-display text-2xl font-semibold tabular-nums">{formatCurrency(service.price)}</p>
                      {!service.is_active && <p className="text-xs text-muted-foreground">Inactivo</p>}
                    </div>
                    <Button
                      size="sm"
                      disabled={!service.is_active}
                      onClick={() => setCharging(service)}
                      className="cursor-pointer gap-1.5"
                    >
                      <Wrench className="h-3.5 w-3.5" />
                      Cobrar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty text={isAdmin ? "Aún no tienes tarifas. Agrega tu primer servicio técnico." : "El administrador aún no agrega tarifas de servicio."} />
          )}
        </TabsContent>

        <TabsContent value="cobrados" className="mt-4">
          {records.isLoading ? (
            <ListSkeleton rows={6} />
          ) : records.data && records.data.items.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Servicio</TableHead>
                    <TableHead className="text-right">Cobrado</TableHead>
                    <TableHead>Notas</TableHead>
                    {isAdmin && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.data.items.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-sm text-muted-foreground">{formatDateTime(record.performed_at)}</TableCell>
                      <TableCell className="font-medium">{record.service_name}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-success">
                        {formatCurrency(record.price)}
                      </TableCell>
                      <TableCell className="max-w-56 truncate text-sm text-muted-foreground">{record.notes ?? "—"}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="cursor-pointer text-danger hover:text-danger"
                            aria-label="Eliminar cobro"
                            onClick={() => setDeletingRecord(record)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Empty text="Aún no has cobrado ningún servicio." />
          )}
        </TabsContent>
      </Tabs>

      <ServiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        service={editing}
        existingNames={services.data?.map((s) => s.name) ?? []}
      />
      <ChargeServiceDialog service={charging} onOpenChange={(o) => !o && setCharging(null)} />
      <ConfirmDialog
        open={!!deletingService}
        onOpenChange={(o) => !o && setDeletingService(null)}
        title="Eliminar servicio"
        description={
          deletingService
            ? `Se eliminará "${deletingService.name}" de tus tarifas. Los servicios ya cobrados se conservan en el historial.`
            : ""
        }
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleDeleteService}
      />
      <ConfirmDialog
        open={!!deletingRecord}
        onOpenChange={(o) => !o && setDeletingRecord(null)}
        title="Eliminar cobro"
        description={
          deletingRecord
            ? `Se quitará el cobro de "${deletingRecord.service_name}" por ${formatCurrency(deletingRecord.price)} y bajarán tus ingresos.`
            : ""
        }
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleDeleteRecord}
      />
    </div>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
