"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useSWRConfig } from "swr";
import { Account } from "@/utils/interface";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface Props {
  userId: string;
}

type AccountForm = Omit<Account, "_id" | "userId" | "createdAt">;

export default function AddAccountModal({ userId }: Props) {
  const [open, setOpen] = useState(false);
  const { mutate } = useSWRConfig();
  const form = useForm<AccountForm>({
    defaultValues: { name: "", type: "Live", currency: "", startBalance: 0 }
  });
  const { handleSubmit, control, reset } = form;

  const onSubmit = async (values: AccountForm) => {
    await fetch("/api/accounts/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, userId }),
    });
    mutate(`/api/trading/getAllAccounts?userId=${userId}`);
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Account anlegen</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Account anlegen</DialogTitle>
        </DialogHeader>
        <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={control} name="type" render={({ field }) => (
            <FormItem>
              <FormLabel>Typ</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Typ wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Live">Live</SelectItem>
                    <SelectItem value="Demo">Demo</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={control} name="currency" render={({ field }) => (
            <FormItem>
              <FormLabel>Basis-Währung</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={control} name="startBalance" render={({ field }) => (
            <FormItem>
              <FormLabel>Start-Balance</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="flex justify-end">
            <Button type="submit">Speichern</Button>
          </div>
        </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}