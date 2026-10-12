"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search, Trash2, MoreVertical, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useUsers } from "@/hooks/Userdetail";
import UserBalanceUpdate from "@/components/AllUser/updateBalance";
import Swal from "sweetalert2";
import { useDeleteUserMutation } from "@/lib/feature/auth/adminApiSlice";

type UID = string | number;

interface UserData {
  id?: UID;
  _id?: UID;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  country?: string;
  image?: string;
  createdAt?: string;
}

const PAGE_SIZE = 20;

export default function UsersTable() {
  const router = useRouter();
  const { users: remoteUsers, isLoading } = useUsers() as {
    users: UserData[] | undefined;
    isLoading?: boolean;
  };

  const [users, setUsers] = useState<UserData[]>([]);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("All");
  const [deleteUser] = useDeleteUserMutation();
  const [sortDesc, setSortDesc] = useState(true);
  const [selectedIds, setSelectedIds] = useState<UID[]>([]);
  const [openMenuFor, setOpenMenuFor] = useState<UID | null>(null);

  // Balance modal
  const [balanceUser, setBalanceUser] = useState<UserData | null>(null);
  const [isBalanceOpen, setIsBalanceOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  // Stable UID generator
  const getUid = (u: UserData) => u.id ?? u._id ?? u.name ?? "";

  // Sync remote -> local
  useEffect(() => {
    if (Array.isArray(remoteUsers)) {
      setUsers(
        remoteUsers.map((u) => ({
          ...u,
          name: u.name || [u.firstName, u.lastName].filter(Boolean).join(" ") || undefined,
        }))
      );
    }
  }, [remoteUsers]);

  // Filtered & sorted list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = users.filter((u) => {
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const phone = (u.phone || u.phoneNumber || "").toLowerCase();
      const countryMatch = country === "All" || (u.country || "") === country;
      const searchMatch = !q || name.includes(q) || email.includes(q) || phone.includes(q);
      return countryMatch && searchMatch;
    });

    list.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        const ta = new Date(a.createdAt).getTime();
        const tb = new Date(b.createdAt).getTime();
        return sortDesc ? tb - ta : ta - tb;
      }
      const ai = Number(a.id ?? a._id ?? 0);
      const bi = Number(b.id ?? b._id ?? 0);
      return sortDesc ? bi - ai : ai - bi;
    });

    return list;
  }, [users, search, country, sortDesc]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Selection
  const toggleSelect = (uid: UID) => {
    setSelectedIds((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]
    );
  };

  const toggleSelectAll = () => {
    const pageIds = paginated.map(getUid);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) =>
      allSelected ? prev.filter((id) => !pageIds.includes(id)) : [...prev, ...pageIds]
    );
  };

  // Delete
  const removeLocal = (id: UID) =>
    setUsers((prev) => prev.filter((u) => getUid(u) !== id));

  const handleDelete = async (id: UID) => {
    try {
      await deleteUser(String(id)).unwrap();
      removeLocal(id);
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      toast.success("User deleted");
    } catch {
      toast.error("Failed to delete user");
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;

    const result = await Swal.fire({
      title: `Delete ${selectedIds.length} user(s)?`,
      text: "Are you sure? This action cannot be undone.",
      icon: "warning",
      background: "#121212",
      color: "#fff",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#444",
      confirmButtonText: "Delete All",
    });

    if (!result.isConfirmed) return;

    for (const id of [...selectedIds]) {
      try {
        await deleteUser(String(id)).unwrap();
        removeLocal(id);
        setSelectedIds((prev) => prev.filter((x) => x !== id));
      } catch {
        toast.error(`Failed to delete user: ${id}`);
      }
    }

    toast.success("Selected users deleted");
  };

  // UI actions
  const openBalance = (u: UserData) => {
    setBalanceUser(u);
    setIsBalanceOpen(true);
  };

  const viewProfile = (u: UserData) => {
    const id = u._id ?? u.id;
    if (!id) return toast.error("Invalid user id");
    router.push(`/Dashboard/AllUser/${id}`);
  };

  const confirmDelete = async (id: UID) => {
    const result = await Swal.fire({
      title: "Delete User?",
      text: "Are you sure? This action cannot be undone.",
      icon: "warning",
      background: "#121212",
      color: "#fff",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#444",
      confirmButtonText: "Delete",
    });

    if (result.isConfirmed) {
      await handleDelete(id);
      Swal.fire({
        icon: "success",
        title: "Deleted",
        text: "User has been removed.",
        timer: 1500,
        showConfirmButton: false,
        background: "#121212",
        color: "#fff",
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
  };

  const dynamicCountries = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => u.country && u.country.trim() && set.add(u.country));
    return ["All", ...Array.from(set)];
  }, [users]);


  if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-transparent">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500"></div>
            </div>
        );
    }


  return (
  <div className="w-full bg-[#1a1a1a] rounded-xl shadow-sm py-6 px-3 sm:px-6">
    {/* Top Bar */}
    <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 mb-6">
      {/* Search */}
      <div className="flex items-center w-full md:w-[40%] focus:outline-green-500 text-gray-100 border border-[#989898] px-3 py-2.5 rounded-sm">
        <input
          type="text"
          placeholder="Search user by name or email..."
          className="bg-transparent w-full h-[26px] outline-none text-[14px] text-white placeholder:text-gray-100"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Search className="size-5 text-green-500" />
      </div>

      {/* Filters + Bulk */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Country select */}
        <div className="relative">
          <select
            className="px-3 appearance-none py-2 rounded-sm bg-[#1f1f1f] border border-[#989898] text-white pr-8 text-sm"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            {dynamicCountries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
            <ChevronDown className="w-4 h-4 text-green-500" />
          </div>
        </div>

        {/* Sort / Filter */}
        <button
          onClick={() => setSortDesc((s) => !s)}
          className="px-3.5 py-2 flex items-center gap-2 border-[#989898] border text-white rounded-md font-medium text-sm"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="#000"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide text-green-500 lucide-funnel-icon lucide-funnel"
          >
            <path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z" />
          </svg>
          Filter
        </button>

        {/* Bulk delete */}
        {selectedIds.length > 0 && (
          <button
            onClick={handleBulkDelete}
            className="px-4 gap-2 py-2 flex items-center border-[#989898] border text-white rounded-md font-medium text-sm"
          >
            <Trash2 className="w-4 h-4 text-green-500" />
            Bulk Delete
          </button>
        )}
      </div>
    </div>

    {/* Table */}
    <div className="overflow-x-auto">
      <table className="w-full text-xs sm:text-sm min-w-[700px]">
        <thead>
          <tr className="text-gray-200 border-b border-[#ffffff40] text-[14px] sm:text-[16px]">
            <th className="py-3 pr-5 w-10">
              <input
                type="checkbox"
                className="appearance-none h-4 w-4 border border-gray-300 rounded-[4px] checked:bg-green-500 checked:border-green-500"
                checked={
                  paginated.every((u) => selectedIds.includes(getUid(u))) &&
                  paginated.length > 0
                }
                onChange={toggleSelectAll}
              />
            </th>
            <th className="py-3 text-left font-[500]">User</th>
            <th className="py-3 text-left font-[500]">Phone</th>
            <th className="py-3 text-left font-[500]">Country</th>
            <th className="py-3 text-left font-[500]">Date</th>
            <th className="py-3 text-center font-[500]">Action</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={6} className="py-6 text-center text-gray-300">
                Loading users...
              </td>
            </tr>
          ) : paginated.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-6 text-center text-gray-300">
                No users found
              </td>
            </tr>
          ) : (
            paginated.map((u) => {
              const uid = getUid(u);
              return (
                <tr
                  key={uid}
                  className="border-b border-[#ffffff30] hover:bg-[#0f0f0f80] transition cursor-pointer relative"
                >
                  <td className="py-4">
                    <input
                      type="checkbox"
                      className="appearance-none h-4 w-4 border border-gray-300 rounded-[4px] checked:bg-green-500 checked:border-green-500"
                      checked={selectedIds.includes(uid)}
                      onChange={() => toggleSelect(uid)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="py-4 flex items-center gap-3 text-white">
                    {u.image ? (
                      <img
                        src={u.image}
                        className="w-10 h-10 rounded-full object-cover"
                        alt={u.name || "user"}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#2a2a2a] flex items-center justify-center text-md text-green-400">
                        {(u.name || u.firstName || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-[14px] sm:text-[15px] block">
                        {(
                          u.name ||
                          [u.firstName, u.lastName]
                            .filter(Boolean)
                            .join(" ")
                        ).slice(0, 25)}
                        {(u.name ?? "").length > 16 ? "..." : ""}
                      </span>
                      <span className="py-4 text-gray-300 text-[11px] sm:text-[13px]">
                        {(u.email ?? "N/A").slice(0, 30)}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 text-gray-300 text-[12px] sm:text-[14px]">
                    {u.phone ?? u.phoneNumber ?? "N/A"}
                  </td>
                  <td className="py-4 text-gray-300 text-[12px] sm:text-[14px]">
                    {u.country ?? "N/A"}
                  </td>
                  <td className="py-4 text-gray-300 text-[12px] sm:text-[14px]">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="py-4 text-center relative actions-cell">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuFor((p) => (p === uid ? null : uid));
                      }}
                      className="p-2 rounded-md hover:bg-[#22c55e]/20"
                    >
                      <MoreVertical className="text-white" size={18} />
                    </button>

                    {openMenuFor === uid && (
                      <div
                        className="absolute right-4 top-full mt-2 w-40 bg-[#1c1c1c] border border-[#333] rounded-md shadow-lg text-white z-[9999] menu-popup"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="w-full px-4 py-2 text-left hover:bg-[#22c55e]/20"
                          onClick={() => {
                            setOpenMenuFor(null);
                            viewProfile(u);
                          }}
                        >
                          View Profile
                        </button>
                        <button
                          className="w-full px-4 py-2 text-left hover:bg-[#22c55e]/20"
                          onClick={() => {
                            setOpenMenuFor(null);
                            openBalance(u);
                          }}
                        >
                          Update Balance
                        </button>
                        <button
                          className="w-full px-4 py-2 text-left text-red-400 hover:bg-[#22c55e]/20"
                          onClick={() => {
                            setOpenMenuFor(null);
                            confirmDelete(uid);
                          }}
                        >
                          Delete User
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>

    {/* Pagination */}
    {totalPages > 1 && (
      <div className="flex justify-center mt-7 gap-2 text-white flex-wrap">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          {`<`}
        </button>
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => goToPage(i + 1)}
            className={`px-3.5 py-1.5 text-[13px] sm:text-[14px] border border-gray-300 rounded ${
              currentPage === i + 1 ? "border-green-500 text-green-500" : ""
            }`}
          >
            {i + 1}
          </button>
        ))}
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          {`>`}
        </button>
      </div>
    )}

    {/* Balance Modal */}
    <Dialog open={isBalanceOpen} onOpenChange={setIsBalanceOpen}>
      <DialogContent className="max-w-lg border border-[#333] bg-[#121212]">
        {balanceUser && (
          <UserBalanceUpdate
            userId={String(
              balanceUser._id ?? balanceUser.id ?? ""
            )}
            userName={(
              balanceUser.name ??
              [balanceUser.firstName, balanceUser.lastName]
                .filter(Boolean)
                .join(" ")
            ).trim()}
          />
        )}
      </DialogContent>
    </Dialog>
  </div>
);
}
