"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search, User as UserIcon } from "lucide-react";
import axiosInstance from "@/utils/axiosInstance";
import { ALL_ADMIN_ITEMS } from "./adminNav";

interface Result { id: string; label: string; hint: string; href: string; kind: "page" | "user"; icon: React.ComponentType<{ className?: string }> }

// Users are fetched once when the palette is first opened and cached for a minute.
let userCache: { at: number; users: any[] } | null = null;
async function loadUsers(): Promise<any[]> {
  if (userCache && Date.now() - userCache.at < 60_000) return userCache.users;
  try {
    const { data } = await axiosInstance.get("/api/v1/admin/users");
    const users = Array.isArray(data) ? data : [];
    userCache = { at: Date.now(), users };
    return users;
  } catch {
    return [];
  }
}

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery(""); setActive(0);
    inputRef.current?.focus();
    loadUsers().then(setUsers);
  }, [open]);

  const results: Result[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pages: Result[] = ALL_ADMIN_ITEMS
      .filter((i) => !q || [i.label, i.description, ...(i.keywords || [])].some((t) => t.toLowerCase().includes(q)))
      .map((i) => ({ id: i.href, label: i.label, hint: i.description, href: i.href, kind: "page", icon: i.icon }));

    const people: Result[] = q.length >= 2
      ? users
          .filter((u) => `${u.firstName ?? ""} ${u.lastName ?? ""} ${u.email ?? ""}`.toLowerCase().includes(q))
          .slice(0, 6)
          .map((u) => ({
            id: `u-${u._id || u.id}`, label: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email, hint: u.email,
            href: `/Dashboard/AllUser/${u._id || u.id}`, kind: "user", icon: UserIcon,
          }))
      : [];
    return [...pages, ...people];
  }, [query, users]);

  useEffect(() => setActive(0), [query]);

  if (!open) return null;

  const go = (r?: Result) => { if (!r) return; onClose(); router.push(r.href); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); go(results[active]); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 px-4 pt-[12vh]" onMouseDown={onClose}>
      <div
        role="dialog" aria-modal="true" aria-label="Jump to"
        className="w-full max-w-xl overflow-hidden rounded-xl border border-white/10 bg-[#161616] shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()} onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4">
          <Search className="h-5 w-5 text-gray-400" aria-hidden />
          <input
            ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to a page or search a user by name or email…"
            role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant={results[active] ? `palette-${results[active].id}` : undefined}
            className="h-14 flex-1 bg-transparent text-white placeholder-gray-500 outline-none"
          />
          <kbd className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-gray-400">Esc</kbd>
        </div>

        <ul id="palette-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 && <li className="px-3 py-8 text-center text-sm text-gray-400">No results for “{query}”</li>}
          {results.map((r, i) => {
            const Icon = r.icon;
            const showHeading = i === 0 || results[i - 1].kind !== r.kind;
            return (
              <li key={r.id} role="presentation">
                {showHeading && <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{r.kind === "page" ? "Pages" : "Users"}</p>}
                <button
                  id={`palette-${r.id}`} role="option" aria-selected={i === active}
                  onMouseEnter={() => setActive(i)} onClick={() => go(r)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${i === active ? "bg-green-500/10 text-green-400" : "text-gray-200"}`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{r.label}</span>
                    <span className="block truncate text-xs text-gray-400">{r.hint}</span>
                  </span>
                  {i === active && <CornerDownLeft className="h-4 w-4 shrink-0 opacity-70" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
