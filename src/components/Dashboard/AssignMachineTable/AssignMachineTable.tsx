"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2, ChevronDown, Search } from "lucide-react";
import { fetchAllUserMachines, removeUserMachine } from "@/lib/feature/userMachine/usermachineApi";
import { useAppDispatch } from "@/lib/store/reduxHooks";
import { toast } from "react-toastify";
import Swal from "sweetalert2";

interface UserMachine {
  _id: string;
  createdAt: string;
  status: "active" | "inactive";
  machine: { machineName?: string };
  user?: {
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  images: string[];
  monthlyProfit: number;
  machineName: string;
  userName: string;
  date: string;
  monthlyProfitAccumulated: number;
}



interface ApiUserMachine {
  _id: string;
  createdAt?: string;
  status?: "active" | "inactive";
  machine: string | { machineName?: string }; // backend might send string or object
  user?: {
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  images?: string[];
  monthlyProfit?: number;
  machineName?: string;
  userName?: string;
  date?: string;
  monthlyProfitAccumulated?: number;
}


export default function AssignedMachinesTable() {
  const dispatch = useAppDispatch();

  // ----------------------
  // UI STATE
  // ----------------------
  const [search, setSearch] = useState("");
  const [userMachines, setUserMachines] = useState<UserMachine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const [profitSort, setProfitSort] = useState<"none" | "low" | "high">("none");
  const [dateSort, setDateSort] = useState<"none" | "asc" | "desc">("none");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // ----------------------
  // FETCH DATA
  // ----------------------
  useEffect(() => {
    const loadUserMachines = async () => {
      try {
        setIsLoading(true);
        // const res = await dispatch(fetchAllUserMachines()).unwrap();

        const res: ApiUserMachine[] = await dispatch(fetchAllUserMachines()).unwrap() as ApiUserMachine[];


        const data: UserMachine[] = Array.isArray(res)
          ? res.map((item) => {
            const normalizedMachine = typeof item.machine === "string"
              ? { machineName: item.machine }
              : item.machine ?? {};

            return {
              _id: item._id,
              createdAt: item.createdAt ?? "",
              status: item.status ?? "inactive",
              machine: normalizedMachine,
              user: item.user,
              images: item.images ?? [],
              monthlyProfit: item.monthlyProfit ?? 0,
              machineName: item.machineName ?? normalizedMachine.machineName ?? "",
              userName: item.userName ?? `${item.user?.firstName ?? ""} ${item.user?.lastName ?? ""}`,
              date: item.date ?? "",
              monthlyProfitAccumulated: item.monthlyProfitAccumulated ?? 0,
            };
          })
          : [];



        setUserMachines(data);
        setError(null);
      } catch (err: any) {
        const msg = err?.message || "Failed to fetch user machines";
        setError(msg);
        toast.error(msg, { theme: "dark" });
      } finally {
        setIsLoading(false);
      }
    };

    loadUserMachines();
  }, [dispatch]);

  // ----------------------
  // HELPERS
  // ----------------------
  const formatDate = (iso?: string) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const trimText = (txt: string, max: number) => (txt.length > max ? txt.slice(0, max) + "..." : txt);

  const formatNumber = (num?: number) => {
    if (num == null || isNaN(num)) return "-";
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return Number(num.toFixed(1)).toString();
  };

  // ----------------------
  // PROCESS DATA
  // ----------------------
  const processed = useMemo(() => {
    let items = [...userMachines];

    // Status filter
    if (statusFilter !== "all") {
      items = items.filter((it) => (it.status ?? "").toLowerCase() === statusFilter);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((it) => {
        const name = `${it.user?.firstName ?? ""} ${it.user?.lastName ?? ""}`.toLowerCase();
        const email = (it.user?.email ?? "").toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }

    // Profit sort
    if (profitSort === "low") {
      items.sort((a, b) => (a.monthlyProfitAccumulated ?? 0) - (b.monthlyProfitAccumulated ?? 0));
    } else if (profitSort === "high") {
      items.sort((a, b) => (b.monthlyProfitAccumulated ?? 0) - (a.monthlyProfitAccumulated ?? 0));
    }

    // Date sort
    if (dateSort === "asc") {
      items.sort((a, b) => new Date(a.createdAt ?? "").getTime() - new Date(b.createdAt ?? "").getTime());
    } else if (dateSort === "desc") {
      items.sort((a, b) => new Date(b.createdAt ?? "").getTime() - new Date(a.createdAt ?? "").getTime());
    }

    return items;
  }, [userMachines, statusFilter, profitSort, dateSort, search]);

  const totalPages = Math.max(1, Math.ceil(processed.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processed.slice(start, start + pageSize);
  }, [processed, currentPage]);

  const toggleSelect = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const toggleSelectAll = () => {
    const visibleIds = paginated.map((p) => p._id);
    const allSelected = visibleIds.every((id) => selected.includes(id));
    setSelected((prev) => (allSelected ? prev.filter((id) => !visibleIds.includes(id)) : [...prev, ...visibleIds]));
  };

  // ----------------------
  // SINGLE DELETE
  // ----------------------
  const handleRemoveMachine = async (userMachineId: string) => {

    const result = await Swal.fire({
      title: `Delete machine?`,
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

    try {
      await dispatch(removeUserMachine(userMachineId)).unwrap();
      setUserMachines((prev) => prev.filter((um) => um._id !== userMachineId));
      setSelected((prev) => prev.filter((id) => id !== userMachineId));
      toast.success("Machine assignment removed successfully", { theme: "dark" });
    } catch (err: any) {
      toast.error(err.message || "Failed to remove machine assignment", { theme: "dark" });
    }
  };

  // ----------------------
  // BULK DELETE
  // ----------------------
  const handleBulkDelete = async () => {
    if (!selected.length) return;

    const result = await Swal.fire({
      title: `Delete ${selected.length} machine?`,
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

    for (const id of [...selected]) {
      try {
        await dispatch(removeUserMachine(id)).unwrap();
        setUserMachines((prev) => prev.filter((um) => um._id !== id));
        setSelected((prev) => prev.filter((x) => x !== id));
      } catch {
        toast.error(`Failed to delete machine: ${id}`);
      }
    }

    toast.success("Selected machines deleted", { theme: "dark" });
  };

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setCurrentPage(p);
  };

  // ----------------------
  // UI
  // ----------------------
  return (
    <div className="w-full bg-[#1a1a1a] rounded-xl shadow-sm py-6 px-6">
      {/* FILTER BAR */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        {/* SEARCH */}
        <div className="flex items-center w-full md:w-[40%] text-gray-200 border-[1.5px] border-[#989898] px-3 py-2.5 rounded-[5px]">
          <input
            type="text"
            placeholder="Search User name or email..."
            className="bg-transparent w-full outline-none text-[#fff] placeholder:text-[#fff] text-[14px]"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
          <Search className="size-6" />
        </div>

        {/* FILTERS */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* PROFIT */}
          <div className="flex items-center gap-2 border border-[#989898] rounded-md px-3 py-2 text-white">
            <select
              value={profitSort}
              onChange={(e) => {
                setProfitSort(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-transparent outline-none appearance-none"
            >
              <option value="none">Profit</option>
              <option value="low">Lowest</option>
              <option value="high">Highest</option>
            </select>
            <ChevronDown className="w-4 h-4 text-green-500" />
          </div>

          {/* DATE */}
          <div className="flex items-center gap-2 border border-[#989898] rounded-md px-3 py-2 text-white">
            <select
              value={dateSort}
              onChange={(e) => {
                setDateSort(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-transparent outline-none appearance-none"
            >
              <option value="none">Date</option>
              <option value="asc">Oldest</option>
              <option value="desc">Newest</option>
            </select>
            <ChevronDown className="w-4 h-4 text-green-500" />
          </div>

          {/* STATUS */}
          <div className="flex items-center gap-2 border border-[#989898] rounded-md px-3 py-2 text-white">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-transparent outline-none appearance-none"
            >
              <option value="all">Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDown className="w-4 h-4 text-green-500" />
          </div>

          {/* BULK DELETE */}
          {selected.length > 0 && (
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

      {/* TABLE */}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-200 border-b border-[#ffffff65] text-[16px]">
            <th className="py-3 w-10 text-center">
              <input
                type="checkbox"
                checked={paginated.length > 0 && paginated.every((p) => selected.includes(p._id))}
                onChange={toggleSelectAll}
              />
            </th>
            <th className="py-3 text-left font-medium">Machine</th>
            <th className="py-3 text-left font-medium">User</th>
            <th className="py-3 text-center font-medium">Date</th>
            <th className="py-3 text-center text-[16px] font-medium">Monthly Profit</th>
            <th className="py-3 text-center font-medium">Status</th>
            <th className="py-3 text-center font-medium">Action</th>
          </tr>
        </thead>

        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={7} className="py-8 text-center text-gray-300">
                Loading...
              </td>
            </tr>
          ) : paginated.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-8 text-center text-gray-300">
                No machines found.
              </td>
            </tr>
          ) : (
            paginated.map((item) => (
              <tr key={item._id} className="border-b border-[#ffffff65] hover:bg-[#0f0f0f78] duration-300">
                <td className="py-4 text-center">
                  <input type="checkbox" checked={selected.includes(item._id)} onChange={() => toggleSelect(item._id)} />
                </td>

                {/* MACHINE */}
                <td className="py-4 flex items-center gap-3 text-white">
                  <img
                    src={item.images && item.images.length > 0 ? item.images[0] : "/Machine1.webp"}
                    alt={item.machine?.machineName || "machine"}
                    className="w-10 h-10 rounded-[6px] object-cover bg-white"
                  />
                  <div>
                    <span className="font-medium text-[15px] block">{trimText(item.machine?.machineName ?? "-", 20)}</span>
                    <span className="text-gray-200 text-[12px] block">{trimText(item.user?.email ?? "-", 15)}</span>
                  </div>
                </td>

                {/* USER */}
                <td className="py-4 text-gray-200 text-[15px]">{trimText(`${item.user?.firstName ?? ""} ${item.user?.lastName ?? ""}`, 20)}</td>

                {/* DATE */}
                <td className="py-4 text-gray-200 text-center">{formatDate(item.createdAt)}</td>

                {/* PROFIT */}
                <td className="py-4 text-center text-[16px] font-[600] text-white">${formatNumber(item.monthlyProfitAccumulated ?? item.monthlyProfit ?? 0)}</td>

                {/* STATUS */}
                <td className="py-4 text-center">
                  <span
                    className={`px-2 py-1 rounded-full text-[13px] ${(item.status ?? "").toLowerCase() === "active" ? "bg-green-800/40 text-green-400" : "bg-[#66000095] text-red"
                      }`}
                  >
                    {item.status ?? "-"}
                  </span>
                </td>

                {/* DELETE ACTION */}
                <td className="py-4 text-center">
                  <button className="p-2 rounded-lg hover:bg-red-100 group" onClick={() => handleRemoveMachine(item._id)}>
                    <Trash2 className="w-5 h-5 text-white group-hover:text-red-700" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-7 gap-2 text-white">
          <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 border rounded">
            {"<"}
          </button>

          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => goToPage(i + 1)}
              className={`px-3.5 py-1.5 text-[14px] border border-gray-300 rounded ${currentPage === i + 1 ? "border-green-500 text-green-500" : ""}`}
            >
              {i + 1}
            </button>
          ))}

          <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-1 border rounded">
            {">"}
          </button>
        </div>
      )}
    </div>
  );
}
