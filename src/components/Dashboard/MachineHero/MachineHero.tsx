"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

import AssignedMachinesTable from "../AssignMachineTable/AssignMachineTable";
import ProductUpload from "../AddMachine/AddMachine";
import AssignMachineModal from "@/components/Modals/AssignMachineModal";

import {
    miningMachinesApiSlice,
    useGetAllMiningMachinesQuery,
    useDeleteMiningMachineMutation,
} from "@/lib/feature/Machines/miningMachinesApiSlice";

import { useUsers } from "@/hooks/Userdetail";
import { useAppDispatch } from "@/lib/store/reduxHooks";

interface Machine {
    _id: string;
    machineName: string;
    priceRange: { min: number; max: number };
    monthlyProfit: number;
    images?: string[];
}

interface MachinesResponse {
    success: boolean;
    count: number;
    data: Machine[];
}

interface SelectedMachineType {
    name: string;
    id: string;
}


export default function MachineHero() {

    const [openModal, setOpenModal] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [selectedMachine, setSelectedMachine] = useState<SelectedMachineType | null>(null);

    const { data: productsResponse, isLoading: machinesLoading } =
        useGetAllMiningMachinesQuery() as {
            data?: MachinesResponse;
            isLoading: boolean;
        };

    const machines = productsResponse?.data || [];

    const { users: remoteUsers } = useUsers() as { users: { _id: string; email: string }[] | undefined };

    const [deleteMiningMachine, { isLoading: deleting }] = useDeleteMiningMachineMutation();
    const dispatch = useAppDispatch();

    const [localMachines, setLocalMachines] = useState<Machine[]>([]);

    useEffect(() => {
        if (productsResponse?.data) setLocalMachines(productsResponse.data);
    }, [productsResponse]);

    // -------------------------------------
    // HANDLE DELETE (Immediate UI update)
    // -------------------------------------
    const handleDeleteMachine = async (machineId: string, machineName: string) => {
        const result = await Swal.fire({
            title: `Delete "${machineName}"?`,
            text: "Are you sure? This action cannot be undone.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#444",
            confirmButtonText: "Delete",
            background: "#121212",
            color: "#fff",
        });

        if (!result.isConfirmed) return;

        try {
            setDeletingId(machineId); // only this machine shows deleting state

            await deleteMiningMachine(machineId).unwrap();

            dispatch(
                miningMachinesApiSlice.util.updateQueryData(
                    "getAllMiningMachines",
                    undefined,
                    (draft) => {
                        return draft.filter((m) => m._id !== machineId);
                    }
                )
            );


            setLocalMachines(prev => prev.filter(m => m._id !== machineId));
            toast.success(`Machine "${machineName}" deleted successfully`);
        } catch (err) {
            toast.error(`Failed to delete machine "${machineName}"`);
        } finally {
            setDeletingId(null);
        }
    };

    if (machinesLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-transparent">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500"></div>
            </div>
        );
    }

    return (
        <div className="w-full px-1">
            <Tabs defaultValue="assign" className="w-full">
                <TabsList className="grid grid-cols-3 mb-8 gap-10 w-[500px] bg-transparent text-white text-[15.5px]">
                    <TabsTrigger value="assign">All Machines</TabsTrigger>
                    <TabsTrigger value="assigned">Assigned Machines</TabsTrigger>
                    <TabsTrigger value="addmachine">Add Machine</TabsTrigger>
                </TabsList>

                {/* TAB 1 — Machines */}
                <TabsContent value="assign">
                    {machinesLoading ? (
                        <p className="text-center text-gray-400 py-10">Loading machines...</p>
                    ) : localMachines.length === 0 ? (
                        <p className="text-center text-gray-400 py-10">No machines available.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                            {localMachines.map((machine) => (
                                <div key={machine._id} className="bg-[#1a1a1a] rounded-xl border border-white/10">
                                    <div className="bg-[#050505] rounded-t-xl px-10 pt-5 pb-1 border-b-[1px] border-[#050505]">
                                        <Image
                                            src={machine.images?.[0] || "/Machine1.webp"}
                                            width={220}
                                            height={220}
                                            alt={machine.machineName || ""}
                                            className="rounded-md mb-3 object-contain min-h-[42vh]"
                                        />
                                    </div>

                                    <div className="px-5 py-7 flex flex-col gap-4.5 justify-between min-h-[240px]">
                                        <h2 className="text-[24px] leading-[29px] font-semibold text-white">
                                            {machine.machineName || ""}
                                        </h2>

                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-4">
                                                <p className="text-gray-200 font-semibold text-[15.5px]">Investment:</p>
                                                <p className="text-green-500 font-semibold text-[15.5px]">
                                                    {/* ${machine.priceRange?.min.toLocaleString()} -{" "}
                                                    {machine.priceRange?.max.toLocaleString()} */}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <p className="text-gray-200 font-semibold text-[15.5px]">Monthly Profit:</p>
                                                <p className="text-green-500 font-semibold text-[15.5px]">
                                                    ${machine.monthlyProfit?.toLocaleString() || 0}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 mt-4">
                                            <Button
                                                onClick={() => {
                                                    setSelectedMachine({ name: machine.machineName, id: machine._id });
                                                    setOpenModal(true);
                                                }}
                                                className="w-max px-3 text-[13px] rounded-full bg-green-600 hover:bg-green-700"
                                            >
                                                Assign Machine
                                            </Button>

                                            <Button
                                                onClick={() => handleDeleteMachine(machine._id, machine.machineName)}
                                                disabled={deletingId === machine._id}
                                                className="w-max px-3 text-[13px] rounded-full bg-red-600 hover:bg-red-700"
                                            >
                                                {deletingId === machine._id ? "Deleting..." : "Delete Machine"}
                                            </Button>

                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {selectedMachine && (
                        <AssignMachineModal
                            open={openModal}
                            onClose={() => setOpenModal(false)}
                            users={remoteUsers || []}
                            machineName={selectedMachine.name}
                            machineId={selectedMachine.id}
                        />
                    )}
                </TabsContent>

                {/* TAB 2 — Assigned Machines */}
                <TabsContent value="assigned">
                    <AssignedMachinesTable />
                </TabsContent>

                {/* TAB 3 — Add Machine */}
                <TabsContent value="addmachine">
                    <ProductUpload />
                </TabsContent>
            </Tabs>
        </div>
    );
}
