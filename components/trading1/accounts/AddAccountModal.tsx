"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import useSWRMutation from "swr/mutation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

type CreateAccountValues = {
  name: string;
  currency: string;
  startCapital: string;
  riskPerTrade: string;
};

async function createAccountApi(
  url: string,
  { arg }: { arg: { userId: string; payload: any } }
) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message ?? "Failed to create account");
  }

  return res.json();
}

interface AddAccountModalProps {
  userId: string;
  onCreated?: () => void;
}

export default function AddAccountModal({ userId, onCreated }: AddAccountModalProps) {
  const [open, setOpen] = React.useState(false);

  const form = useForm<CreateAccountValues>({
    defaultValues: {
      name: "",
      currency: "USD",
      startCapital: "",
      riskPerTrade: "",
    },
  });

  const { trigger, isMutating } = useSWRMutation(
    "/api/trading/accounts/create",
    createAccountApi
  );

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      name: values.name.trim(),
      currency: values.currency,
      startCapital: values.startCapital ? Number(values.startCapital) : 0,
      riskPerTrade: values.riskPerTrade ? Number(values.riskPerTrade) : 0,
    };

    try {
      await trigger({ userId, payload });
      form.reset();
      setOpen(false);
      onCreated?.();
    } catch (e) {
      console.error(e);
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">+ Account</Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg w-[95vw]">
        <DialogHeader>
          <DialogTitle>Neuen Account anlegen</DialogTitle>
        </DialogHeader>

        <Card className="p-4 space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">Name</p>
            <Input
              placeholder="z. B. FTMO Swing"
              {...form.register("name", { required: true })}
            />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">Währung</p>
            <Select
              value={form.watch("currency")}
              onValueChange={(v) => form.setValue("currency", v, { shouldDirty: true })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Währung" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Startkapital</p>
              <Input placeholder="z. B. 10000" {...form.register("startCapital")} />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Risiko / Trade</p>
              <Input placeholder="z. B. 1" {...form.register("riskPerTrade")} />
              <p className="text-[11px] text-muted-foreground">
                Zahl frei (z. B. % oder $) – V2 kann das genauer.
              </p>
            </div>
          </div>

          <Button onClick={onSubmit} disabled={isMutating} className="w-full">
            {isMutating ? "Speichern..." : "Account speichern"}
          </Button>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
