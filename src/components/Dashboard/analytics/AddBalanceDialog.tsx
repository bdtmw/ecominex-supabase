"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import axiosInstance from "@/utils/axiosInstance";
import { VIZ, money2 } from "./viz";

export interface PickedUser { id: string; name: string; email: string; balance?: number }

/** Admin credits a user's balance. The credit is recorded in the ledger as an admin credit (and shown under Deposits). */
export default function AddBalanceDialog({ open, onClose, initialUser, onDone }: {
  open: boolean; onClose: () => void; initialUser?: PickedUser | null; onDone?: () => void;
}) {
  const [user, setUser] = useState<PickedUser | null>(initialUser || null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PickedUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setUser(initialUser || null); setQ(""); setResults([]); setAmount(""); setNote(""); setConfirming(false); } }, [open, initialUser]);

  useEffect(() => {
    if (!open || user || q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await axiosInstance.get(`/api/v1/admin/users/overview?search=${encodeURIComponent(q.trim())}&limit=6`);
        setResults((res.data.rows || []).map((u: any) => ({ id: u.id, name: `${u.firstName || ""} ${u.lastName || ""}`.trim(), email: u.email, balance: u.totalBalance })));
      } catch { setResults([]); } finally { setSearching(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q, user, open]);

  const value = Math.round(Number(amount) * 100) / 100;
  const valid = !!user && Number.isFinite(value) && value > 0 && value <= 1_000_000;

  const submit = async () => {
    if (!user || !valid) return;
    setSaving(true);
    try {
      const res = await axiosInstance.post("/api/v1/balance/update", { userId: user.id, amount: value, note: note.trim() || undefined });
      toast.success(`Added ${money2(value)} to ${user.name || user.email}${res.data?.newBalance != null ? ` · new balance ${money2(res.data.newBalance)}` : ""}`);
      onDone?.();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Could not add balance");
      setConfirming(false);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md border border-[#333] bg-[#121212] text-white">
        <DialogHeader>
          <DialogTitle>Add balance</DialogTitle>
          <DialogDescription className="text-gray-400">Credit a user's account. It appears in their ledger and under Deposits → Admin credits.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs" style={{ color: VIZ.textSecondary }}>User</label>
            {user ? (
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[#1e1e1e] px-3 py-2">
                <div className="min-w-0"><p className="truncate text-sm text-white">{user.name || user.email}</p><p className="truncate text-xs" style={{ color: VIZ.muted }}>{user.email}{user.balance != null ? ` · balance ${money2(user.balance)}` : ""}</p></div>
                {!initialUser && <button aria-label="Choose another user" onClick={() => { setUser(null); setConfirming(false); }} className="text-gray-400 hover:text-white"><X className="h-4 w-4" /></button>}
              </div>
            ) : (
              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
                  <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className="w-full rounded-lg border border-white/10 bg-[#1e1e1e] py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-green-500/60" />
                </div>
                {(searching || results.length > 0) && (
                  <ul className="mt-1 max-h-56 overflow-auto rounded-lg border border-white/10 bg-[#161616] text-sm">
                    {searching && <li className="px-3 py-2 text-gray-400">Searching…</li>}
                    {results.map((u) => (
                      <li key={u.id}><button onClick={() => setUser(u)} className="block w-full px-3 py-2 text-left hover:bg-white/5"><span className="text-white">{u.name || u.email}</span><span className="block text-xs" style={{ color: VIZ.muted }}>{u.email}</span></button></li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="ab-amount" className="mb-1 block text-xs" style={{ color: VIZ.textSecondary }}>Amount (USD)</label>
            <input id="ab-amount" type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); setConfirming(false); }} placeholder="0.00"
              className="w-full rounded-lg border border-white/10 bg-[#1e1e1e] px-3 py-2 text-sm text-white outline-none focus:border-green-500/60" />
          </div>

          <div>
            <label htmlFor="ab-note" className="mb-1 block text-xs" style={{ color: VIZ.textSecondary }}>Note (optional, shown in the ledger)</label>
            <input id="ab-note" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Binance Pay, TX 8f2a…"
              className="w-full rounded-lg border border-white/10 bg-[#1e1e1e] px-3 py-2 text-sm text-white outline-none focus:border-green-500/60" />
          </div>

          {confirming && valid && (
            <p role="status" className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-200">
              Add <strong>{money2(value)}</strong> to <strong>{user!.name || user!.email}</strong>?{user!.balance != null && <> Their balance will go from {money2(user!.balance)} to {money2(user!.balance + value)}.</>} This cannot be undone from here.
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-200 hover:border-white/30">Cancel</button>
            {!confirming ? (
              <button disabled={!valid} onClick={() => setConfirming(true)} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white enabled:hover:bg-green-500 disabled:opacity-40">Review</button>
            ) : (
              <button disabled={saving} onClick={submit} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white enabled:hover:bg-green-500 disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}Confirm and add</button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
