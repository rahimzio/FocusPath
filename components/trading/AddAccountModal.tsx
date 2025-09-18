// AddAccountModal.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useSWRConfig } from "swr";
import { useForm, FormProvider } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type Props = { userId: string };

type FormShape = {
  name: string;
  broker?: string;
  currency: string;
  startingBalance?: number;
  riskPerTrade?: number;
};

const CURRENCY_OPTIONS = ["USD","EUR","GBP","CHF","JPY","AUD","CAD","NZD","SEK","NOK"] as const;

export default function AddAccountModal({ userId }: Props) {
  const { mutate } = useSWRConfig();
  const [open, setOpen] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const methods = useForm<FormShape>({
    defaultValues: { name: "", broker: "", currency: "USD", startingBalance: undefined, riskPerTrade: undefined },
  });
  const { handleSubmit, control, setValue, watch, reset } = methods;
  const v = watch();

  async function onSubmit(values: FormShape) {
    setErrorMsg(null);
    const startingBalance = Number.isFinite(Number(values.startingBalance)) ? Number(values.startingBalance) : undefined;

    const payload = {
      type: "account" as const,
      userId,
      name: String(values.name || "").trim(),
      broker: values.broker ? String(values.broker).trim() : undefined,
      currency: String(values.currency || "USD"),
      startingBalance,
      currentBalance: startingBalance ?? 0,
      riskPerTrade: Number.isFinite(Number(values.riskPerTrade)) ? Number(values.riskPerTrade) : undefined,
      realizedPnl: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false,
      deleted: false,
    };
    if (!payload.name) { setErrorMsg("Bitte einen Account-Namen angeben."); return; }

    try {
      const res = await fetch("/api/trading/createAccount", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `HTTP ${res.status}`);
      }
      const j = await res.json().catch(() => ({} as any));
      const newId = j?.account?._id ?? j?.id;

      const keyPrefix = `/api/trading/getAllAccounts?userId=${userId}`;
      await Promise.all([ mutate((key) => typeof key === "string" && key.startsWith(keyPrefix)), mutate(keyPrefix) ]);

      try {
        const url = new URL(window.location.href);
        if (newId) url.searchParams.set("account", newId);
        window.history.replaceState({}, "", url.toString());
        window.dispatchEvent(new CustomEvent("accounts-refresh"));
        window.dispatchEvent(new CustomEvent("account-change", { detail: { accountId: newId } }));
      } catch {}

      setOpen(false);
      reset({ name: "", broker: "", currency: v.currency || "USD", startingBalance: undefined, riskPerTrade: undefined });
    } catch (err: any) {
      setErrorMsg(`Konnte Account nicht anlegen: ${err?.message ?? err}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setErrorMsg(null); }}>
      <DialogTrigger asChild>
        <Button variant="secondary">Account hinzufügen</Button>
      </DialogTrigger>

      {/* Modal responsiv */}
      <DialogContent className="w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Neuen Account anlegen</DialogTitle>
        </DialogHeader>

        <FormProvider {...methods}>
          <form
            className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); void handleSubmit(onSubmit)(); }}
          >
            <FormField
              control={control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account-Name</FormLabel>
                  <FormControl><Input placeholder="z. B. FTMO #1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="broker"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Broker (optional)</FormLabel>
                  <FormControl><Input placeholder="z. B. IC Markets" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account-Währung</FormLabel>
                  <FormControl>
                    <Select value={field.value || "USD"} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Währung wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="startingBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Startkapital (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="z. B. 10000"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setValue("startingBalance", val === "" ? undefined : Number(val), { shouldDirty: true });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="riskPerTrade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Risiko pro Trade % (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="z. B. 1.0"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setValue("riskPerTrade", val === "" ? undefined : Number(val), { shouldDirty: true });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {errorMsg && <div className="text-sm text-red-600">{errorMsg}</div>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
              <Button type="submit">Account erstellen</Button>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
