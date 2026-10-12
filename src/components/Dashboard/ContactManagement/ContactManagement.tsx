"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search, Trash2, MoreVertical, ChevronDown } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/lib/store/store";
import Swal from "sweetalert2";
import { toast } from "sonner";
import {
  getAllContacts,
  deleteContact,
  markContactAsRead,
  getContactById,
} from "@/lib/feature/contact/contactsSlice";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type UID = string | number;

interface UserData {
  _id?: UID;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  country?: string;
  status?: "pending" | "read" | "archived";
  comment?: string;
  createdAt?: string;
  image?: string;
}

const PAGE_SIZE = 20;

export default function UsersTable() {
  const dispatch = useDispatch();
  const { contacts: remoteUsers, loading: isLoading } = useSelector(
    (state: RootState) => state.contact
  );

  const [users, setUsers] = useState<UserData[]>([]);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("All");
  const [sortDesc, setSortDesc] = useState(true);
  const [selectedIds, setSelectedIds] = useState<UID[]>([]);
  const [openMenuFor, setOpenMenuFor] = useState<UID | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewUser, setViewUser] = useState<UserData | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const getUid = (u: UserData): UID => u._id ?? u.name ?? "unknown";

  // Fetch all contacts
  useEffect(() => {
    dispatch(getAllContacts({ page: 1, limit: 100 }) as any);
  }, [dispatch]);

  // Map remote users with safe name
  useEffect(() => {
    if (Array.isArray(remoteUsers)) {
      const res: UserData[] = remoteUsers.map((u) => ({
        ...u,
        name: u.name ?? "Unknown User",
        createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : undefined, // <-- convert Date to string
      }));
      setUsers(res);
    }
  }, [remoteUsers]);


  // Filter & sort
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = users.filter((u) => {
      const name = (u.name ?? "").toLowerCase();
      const email = (u.email ?? "").toLowerCase();
      const phone = (u.phone ?? "").toLowerCase();
      const countryMatch = country === "All" || (u.country ?? "") === country;
      const searchMatch = !q || name.includes(q) || email.includes(q) || phone.includes(q);
      return countryMatch && searchMatch;
    });

    list.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        const ta = new Date(a.createdAt).getTime();
        const tb = new Date(b.createdAt).getTime();
        return sortDesc ? tb - ta : ta - tb;
      }
      return 0;
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

  // Delete contact
  const removeLocal = (id: UID) =>
    setUsers((prev) => prev.filter((u) => getUid(u) !== id));

  const confirmDelete = (id: UID) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await dispatch(deleteContact(String(id)) as any);
          removeLocal(id);
          setSelectedIds((prev) => prev.filter((x) => x !== id));
          toast.success("Contact deleted");
        } catch {
          toast.error("Failed to delete contact");
        }
      }
    });
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;

    const result = await Swal.fire({
      title: `Delete ${selectedIds.length} contact(s)?`,
      text: "Are you sure? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Delete All",
    });

    if (!result.isConfirmed) return;

    for (const id of [...selectedIds]) {
      try {
        await dispatch(deleteContact(String(id)) as any);
        removeLocal(id);
        setSelectedIds((prev) => prev.filter((x) => x !== id));
      } catch {
        toast.error(`Failed to delete contact: ${id}`);
      }
    }

    toast.success("Selected contacts deleted");
  };

  // Mark as Read
  const handleMarkAsRead = async (user: UserData) => {
    if (user._id && user.status !== "read") {
      try {
        await dispatch(markContactAsRead(String(user._id)) as any);
        setUsers((prev) =>
          prev.map((u) =>
            getUid(u) === getUid(user) ? { ...u, status: "read" } : u
          )
        );
        toast.success("Marked as read");
      } catch {
        toast.error("Failed to mark as read");
      }
    }
  };

  // View Details
  const handleViewDetails = async (user: UserData) => {
    if (!user._id) return;
    try {
      if (!user._id) return;
      await dispatch(deleteContact(String(user._id)) as any);
      const fullUser = users.find((u) => getUid(u) === getUid(user)) || user;
      setViewUser(fullUser);
      setIsViewModalOpen(true);
      if (fullUser.status === "pending") handleMarkAsRead(fullUser);
    } catch {
      toast.error("Failed to load user details");
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
    <div className="w-full bg-[#1a1a1a] rounded-xl shadow-sm py-6 px-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
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

        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              className="px-3 appearance-none py-2 rounded-sm bg-[#1f1f1f] border border-[#989898] text-white pr-8"
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

          <button
            onClick={() => setSortDesc((s) => !s)}
            className="px-3.5 py-2 flex items-center gap-2 border-[#989898] border text-white rounded-md font-medium"
          >
            Filter
          </button>

          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-4 gap-2 py-2 flex items-center border-[#989898] border text-white rounded-md font-medium"
            >
              <Trash2 className="w-4 h-4 text-green-500" />
              Bulk Delete
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="w-full overflow-x-auto">
  <table className="w-full min-w-[820px] text-xs sm:text-sm md:min-w-0">
    <thead>
      <tr className="text-gray-200 border-b border-[#ffffff40] text-sm md:text-[16px]">
        <th className="py-2 md:py-3 pr-3 md:pr-5 w-10">
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
        <th className="py-2 md:py-3 text-left font-[500] pl-1 md:pl-2 whitespace-nowrap">
          User
        </th>
        <th className="py-2 md:py-3 text-left font-[500] whitespace-nowrap">
          Phone
        </th>
        <th className="py-2 md:py-3 text-left font-[500] whitespace-nowrap">
          Country
        </th>
        <th className="py-2 md:py-3 text-left font-[500] whitespace-nowrap">
          Status
        </th>
        <th className="py-2 md:py-3 text-left font-[500] whitespace-nowrap">
          Date
        </th>
        <th className="py-2 md:py-3 text-center font-[500] whitespace-nowrap">
          Action
        </th>
      </tr>
    </thead>

    <tbody>
      {isLoading ? (
        <tr>
          <td colSpan={7} className="py-6 text-center text-gray-300 text-sm">
            Loading users...
          </td>
        </tr>
      ) : paginated.length === 0 ? (
        <tr>
          <td colSpan={7} className="py-6 text-center text-gray-300 text-sm">
            No users found
          </td>
        </tr>
      ) : (
        paginated.map((u) => {
          const uid = getUid(u);
          return (
            <tr
              key={uid}
              className="border-b border-[#ffffff30] hover:bg-[#0f0f0f80] transition cursor-pointer"
            >
              <td className="py-3 md:py-4 pr-1 md:pr-0">
                <input
                  type="checkbox"
                  className="appearance-none h-4 w-4 border border-gray-300 rounded-[4px] checked:bg-green-500 checked:border-green-500"
                  checked={selectedIds.includes(uid)}
                  onChange={() => toggleSelect(uid)}
                  onClick={(e) => e.stopPropagation()}
                />
              </td>

              <td className="py-3 md:py-4 flex items-center gap-2 md:gap-3 text-white">
                {u.image ? (
                  <img
                    src={u.image}
                    className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover"
                    alt={u.name ?? "user"}
                  />
                ) : (
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#2a2a2a] flex items-center justify-center text-sm md:text-md text-green-400">
                    {(u.name ?? u.firstName ?? "U").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-[140px]">
                  <span className="font-medium text-[14px] md:text-[15px] block">
                    {(
                      u.name ??
                      [u.firstName ?? "", u.lastName ?? ""]
                        .filter(Boolean)
                        .join(" ") ??
                      "Unknown User"
                    ).slice(0, 25)}
                  </span>
                  <span className="text-gray-300 text-[12px] md:text-[13px]">
                    {(u.email ?? "N/A").slice(0, 30)}
                  </span>
                </div>
              </td>

              <td className="py-3 md:py-4 text-gray-300 whitespace-nowrap">
                {u.phone ?? "N/A"}
              </td>

              <td className="py-3 md:py-4 text-gray-300 pl-3 md:pl-5 whitespace-nowrap">
                {u.country ?? "N/A"}
              </td>

              <td className="py-3 md:py-4 text-black text-[11px] md:text-[12.5px] whitespace-nowrap">
                <span
                  className={`px-2.5 md:px-3 py-0.5 rounded-full ${
                    u.status === "pending" ? "bg-yellow-300" : "bg-green-500"
                  }`}
                >
                  {u.status ?? "pending"}
                </span>
              </td>

              <td className="py-3 md:py-4 text-gray-300 whitespace-nowrap">
                {formatDate(u.createdAt)}
              </td>

<td className="py-3 md:py-4 text-center whitespace-nowrap relative overflow-visible">
  <div className="relative inline-block overflow-visible">
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setOpenMenuFor((p) => (p === uid ? null : uid));
      }}
      className="p-1.5 md:p-2 rounded-md hover:bg-[#22c55e]/20 focus:outline-none"
    >
      <MoreVertical className="text-white" size={18} />
    </button>

    {openMenuFor === uid && (
      <div
        className="absolute z-[999999] right-0 top-full mt-2 w-44 whitespace-nowrap
                   bg-[#1c1c1c] border border-[#333] rounded-md shadow-xl text-white
                   overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="block w-full px-4 py-2.5 text-left text-sm hover:bg-[#22c55e]/20 transition-colors"
          onClick={() => {
            setOpenMenuFor(null);
            handleViewDetails(u);
          }}
        >
          View Details
        </button>

        {u.status !== "read" && (
          <button
            type="button"
            className="block w-full px-4 py-2.5 text-left text-sm hover:bg-[#22c55e]/20 transition-colors border-t border-[#333]"
            onClick={() => {
              setOpenMenuFor(null);
              handleMarkAsRead(u);
            }}
          >
            Mark as Read
          </button>
        )}

        <button
          type="button"
          className="block w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-[#22c55e]/20 transition-colors border-t border-[#333]"
          onClick={() => {
            setOpenMenuFor(null);
            confirmDelete(uid);
          }}
        >
          Delete Contact
        </button>
      </div>
    )}
  </div>
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
        <div className="flex justify-center mt-7 gap-2 text-white">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded"
          >
            {"<"}
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => goToPage(i + 1)}
              className={`px-3.5 py-1.5 text-[14px] border border-gray-300 rounded ${currentPage === i + 1 ? "border-green-500 text-green-500" : ""
                }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded"
          >
            {">"}
          </button>
        </div>
      )}

      {/* View Details Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-lg border border-[#333] bg-[#121212]">
          {viewUser && (
            <div className="space-y-4 text-white">
              <h2 className="text-lg font-bold">{viewUser.name}</h2>
              <p>
                <strong>Email:</strong> {viewUser.email ?? "N/A"}
              </p>
              <p>
                <strong>Phone:</strong> {viewUser.phone ?? "N/A"}
              </p>
              <p>
                <strong>Country:</strong> {viewUser.country ?? "N/A"}
              </p>
              <p>
                <strong>Status:</strong> {viewUser.status}
              </p>
              <p>
                <strong>Comment:</strong> {viewUser.comment ?? "N/A"}
              </p>
              <p>
                <strong>Created At:</strong> {formatDate(viewUser.createdAt)}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
