"use client";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Account } from "@/utils/interface";
import AddAccountModal from "./AddAccountModal";
const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Props {
  userId: string;
}

export default function AccountManager({ userId }: Props) {
  const { data } = useSWR<{ accounts: Account[] }>(
    userId ? `/api/trading/getAllAccounts?userId=${userId}` : null,
    fetcher
  );
  const accounts = data?.accounts || [];

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Accounts</CardTitle>
        <AddAccountModal userId={userId} />
      </CardHeader>
      <CardContent>
        {accounts.length === 0 && (
          <p className="text-sm text-gray-500">Keine Accounts</p>
        )}
        <ul className="space-y-2">
          {accounts.map((acc) => (
            <li
              key={acc._id}
              className="flex justify-between rounded border p-2 text-sm"
            >
              <span>
                {acc.name} ({acc.type})
              </span>
              <span>
                {acc.currency}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}