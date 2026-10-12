"use client";

import { useEffect, useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store/store";
import { fetchAllWithdrawals } from "@/lib/feature/withdraw/withdrawalSlice";

export default function TransactionsTable() {
    const dispatch = useDispatch<AppDispatch>();

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [page, setPage] = useState(1);

    const ITEMS_PER_PAGE = 20;

    const withdrawalState = useSelector((state: RootState) => state.withdrawal);
    const { allWithdrawals: withdrawals, isLoading, error, pagination } = withdrawalState;

    console.log(withdrawals);
    

    useEffect(() => {
        const payload: any = {
            page,
            limit: ITEMS_PER_PAGE,
            sortBy: "transactionDate",
            sortOrder,
        };

        if (statusFilter !== "all") {
            payload.status = statusFilter;
        }

        dispatch(fetchAllWithdrawals(payload));
    }, [dispatch, statusFilter, sortOrder, page]);


    // Helper functions
    const formatAmount = (num: number) =>
        `$${num.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    const formatDate = (date: string) =>
        new Date(date).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });

    // SEARCH + FILTER
    const filteredData =
        withdrawals?.filter((item: any) => {
            const first = item?.user?.firstName || "";
            const last = item?.user?.lastName || "";
            const email = item?.user?.email || "";

            const fullName = `${first} ${last}`.toLowerCase();

            return (
                fullName.includes(search.toLowerCase()) ||
                email.toLowerCase().includes(search.toLowerCase())
            );
        });


   return (
  <div className="w-full bg-[#1a1a1a] rounded-xl shadow-sm py-4 sm:py-6 px-3 sm:px-4 md:px-6">
    {/* Header */}
    <div className="flex flex-col md:flex-row md:flex-wrap md:items-center md:justify-between gap-3 md:gap-4 mb-5 md:mb-6">
      {/* Search */}
      <div className="flex items-center w-full md:w-[40%] border border-[#989898] px-3 py-2.5 rounded-md text-white">
        <input
          type="text"
          placeholder="Search user or email..."
          className="bg-transparent w-full outline-none text-white placeholder:text-white text-[14px]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Search className="size-5.5 text-green-500" />
      </div>

      {/* Sort + Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
        <div className="flex w-full sm:w-auto pr-3 border border-[#989898] rounded-md">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 bg-transparent text-white outline-none w-full sm:w-auto"
          >
            <option value="all" className="bg-[#111]">
              Status
            </option>
            <option value="pending" className="bg-[#111]">
              Pending
            </option>
            <option value="approved" className="bg-[#111]">
              Approved
            </option>
            <option value="rejected" className="bg-[#111]">
              Rejected
            </option>
          </select>
        </div>

        {/* Sort Order */}
        <button
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          className="w-full sm:w-auto px-4 py-2 pr-6 flex items-center justify-center border border-[#989898] text-white rounded-md gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="#000"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            className="lucide text-green-500 lucide-funnel-icon lucide-funnel"
          >
            <path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z" />
          </svg>
          {sortOrder === "asc" ? "Filter" : "Filter"}
        </button>
      </div>
    </div>

    {/* Loading */}
    {isLoading && (
      <p className="text-center py-10 text-gray-300 text-md">
        Loading withdrawals...
      </p>
    )}

    {/* No data */}
    {!isLoading && filteredData.length === 0 && (
      <p className="text-center py-10 text-gray-400 text-md">
        No withdrawals found
      </p>
    )}

   {/* Table */}
{!isLoading && filteredData.length > 0 && (
  <>
    {/* Horizontal scroll container */}
    <div className="w-full overflow-x-auto">
      <table className="min-w-[720px] w-full text-xs sm:text-sm">
        <thead>
          <tr className="text-gray-200 border-b border-[#ffffff50] text-sm md:text-[17px]">
            <th className="py-2 md:py-3 text-left whitespace-nowrap">User</th>
            <th className="py-2 md:py-3 text-left whitespace-nowrap">Email</th>
            <th className="py-2 md:py-3 text-center whitespace-nowrap">Status</th>
            <th className="py-2 md:py-3 text-center whitespace-nowrap">Amount</th>
            <th className="py-2 md:py-3 text-center whitespace-nowrap">Date</th>
          </tr>
        </thead>

        <tbody>
          {filteredData.map((item: any) => (
            <tr
              key={item._id}
              className="border-b border-[#ffffff30] hover:bg-[#0f0f0f78] transition"
            >
              <td className="py-3 md:py-4 flex items-center gap-3 text-white whitespace-nowrap">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#2a2a2a] flex items-center justify-center text-sm md:text-md text-green-400">
                  {(item?.user?.firstName || "U").charAt(0).toUpperCase()}
                </div>

                <span className="font-medium">
                  {(
                    [item?.user?.firstName, item?.user?.lastName]
                      .filter(Boolean)
                      .join(" ")
                  ).slice(0, 18)}
                  {(item?.user?.firstName ?? "").length > 16 ? "..." : ""}
                </span>
              </td>

              <td className="py-3 md:py-4 text-gray-300 whitespace-nowrap">
                {item?.user?.email || "No email"}
              </td>

              <td className="py-3 md:py-4 text-center whitespace-nowrap">
                <span
                  className={`px-3 py-1 rounded-full border text-[11px] sm:text-[12.5px] capitalize ${
                    item.status === "pending"
                      ? "border-yellow-500 text-yellow-400"
                      : item.status === "approved"
                      ? "border-green-500 text-green-400"
                      : "border-red text-red"
                  }`}
                >
                  {item?.status || "None"}
                </span>
              </td>

              <td className="py-3 md:py-4 text-center text-white font-semibold whitespace-nowrap">
                {formatAmount(item?.amount) || "0"}
              </td>

              <td className="py-3 md:py-4 text-center text-gray-300 whitespace-nowrap">
                {formatDate(item?.transactionDate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>


        {/* Pagination */}
        {pagination?.totalPages > 1 && (
          <div className="flex justify-center mt-6 md:mt-7 gap-1.5 md:gap-2 text-white flex-wrap">
            {/* Prev Button */}
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-40 text-sm"
            >
              {"<"}
            </button>

            {/* Page Numbers */}
            {Array.from({ length: pagination.totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`px-3.5 py-1.5 text-[13px] md:text-[14px] border border-gray-300 rounded ${
                  page === i + 1
                    ? "border-green-500 text-green-500"
                    : ""
                }`}
              >
                {i + 1}
              </button>
            ))}

            {/* Next Button */}
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === pagination.totalPages}
              className="px-3 py-1 border rounded disabled:opacity-40 text-sm"
            >
              {">"}
            </button>
          </div>
        )}
      </>
    )}
  </div>
);
}
