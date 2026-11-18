"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function BlockButton({ contactId, name }: { contactId: string; name: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function block() {
    setError(null);
    try {
      const response = await fetch(`/api/trust/${contactId}/block`, { method: "POST" });
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!response.ok) {
        setError(body?.error?.message ?? "Halo could not block that person.");
        return;
      }
      toast(`${name} is blocked. They cannot confirm a request, and you cannot confirm one for them.`);
      router.refresh();
    } catch {
      setError("Halo could not reach this server. Nobody was blocked.");
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Block
      </Button>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="danger" onClick={block}>
          Block {name}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {error ? <p className="mt-2 text-sm font-semibold text-clay">{error}</p> : null}
    </div>
  );
}
