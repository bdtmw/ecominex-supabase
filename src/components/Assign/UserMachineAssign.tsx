// @ts-nocheck

'use client'
import React, { useState, useCallback } from 'react';
import { 
  Server, 
  UserCircle2, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  RefreshCw,
  Search,
  ChevronDown,
  ArrowRight
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { useGetAllMiningMachinesQuery } from '@/lib/feature/Machines/miningMachinesApiSlice';
import { assignMachineToUser } from '@/lib/feature/userMachine/usermachineApi';
import { useUsers } from '@/hooks/Userdetail';

const UserMachineAssignment: React.FC = () => {
  const dispatch = useDispatch();
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { 
    data: machinesResponse = { data: [] }, 
    isLoading: machinesLoading, 
    error: machinesError,
    refetch: refetchMachines
  } = useGetAllMiningMachinesQuery();
  
  const { 
    users = [], 
    isLoading: usersLoading, 
    error: usersError,
    refetch: refetchUsers
  } = useUsers();

  const machines = machinesResponse.data || [];

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) {
      toast.error('Please select a user', { theme: "dark" });
      return;
    }

    if (!selectedMachine) {
      toast.error('Please select a machine', { theme: "dark" });
      return;
    }

    setIsSubmitting(true);

    try {
      await dispatch(assignMachineToUser({
        userId: selectedUser,
        machineId: selectedMachine
      })).unwrap();
      
      toast.success('Machine assigned successfully', { theme: "dark" });
      setSelectedUser('');
      setSelectedMachine('');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to assign machine';
      toast.error(errorMessage, { theme: "dark" });
    } finally {
      setIsSubmitting(false);
    }
  }, [dispatch, selectedUser, selectedMachine]);

  if (machinesLoading || usersLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-black p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-[#21eb00]/5 via-transparent to-transparent opacity-50" />
        <div className="relative flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="w-12 h-12 text-[#21eb00] animate-spin mb-4" />
          <p className="text-zinc-400">Loading resources...</p>
        </div>
      </div>
    );
  }

  if (machinesError || usersError) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-red-800/50 bg-black p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-transparent opacity-50" />
        <div className="relative flex flex-col items-center justify-center min-h-[400px]">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-red-400 mb-4 text-center">
            {machinesError ? 'Failed to load machines' : 'Failed to load users'}
          </p>
          <button 
            onClick={() => machinesError ? refetchMachines() : refetchUsers()}
            className="bg-zinc-900 text-white px-6 py-2 rounded-xl flex items-center hover:bg-zinc-800 transition-all duration-300 group"
          >
            <RefreshCw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-700" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-black transition-all duration-500 hover:border-[#21eb00] hover:shadow-lg hover:shadow-[#21eb00]/10">
      <div className="absolute inset-0 bg-gradient-to-br from-[#21eb00]/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      
      <div className="relative border-b border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-sm">
        <div className="flex items-center">
          <div className="rounded-xl bg-zinc-900/50 p-3 mr-4">
            <Server className="w-6 h-6 text-[#21eb00]" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Assign Machine</h2>
            <p className="text-sm text-zinc-400 mt-1">Connect users with mining machines</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="relative p-6 space-y-6">
        {/* User Selection */}
        <div className="group">
          <label className="block text-sm font-medium text-zinc-400 mb-2 flex items-center">
            <UserCircle2 className="w-5 h-5 mr-2 text-[#21eb00]" />
            Select User
          </label>
          <div className="relative">
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full appearance-none rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-white outline-none backdrop-blur-sm transition-all duration-300 hover:border-[#21eb00]/50 focus:border-[#21eb00] focus:ring-1 focus:ring-[#21eb00]"
              disabled={isSubmitting}
            >
              <option value="" className="bg-zinc-900">Choose a user...</option>
              {users?.map((user) => (
                <option key={user._id} value={user._id} className="bg-zinc-900">
                  {user.firstName} {user.lastName} ({user.email})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400 transition-transform duration-300 group-focus-within:rotate-180" />
          </div>
        </div>

        {/* Machine Selection */}
        <div className="group">
          <label className="block text-sm font-medium text-zinc-400 mb-2 flex items-center">
            <Server className="w-5 h-5 mr-2 text-[#21eb00]" />
            Select Machine
          </label>
          <div className="relative">
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="w-full appearance-none rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-white outline-none backdrop-blur-sm transition-all duration-300 hover:border-[#21eb00]/50 focus:border-[#21eb00] focus:ring-1 focus:ring-[#21eb00]"
              disabled={isSubmitting}
            >
              <option value="" className="bg-zinc-900">Choose a machine...</option>
              {machines.map((machine) => (
                <option key={machine._id} value={machine._id} className="bg-zinc-900">
                  {machine.machineName}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400 transition-transform duration-300 group-focus-within:rotate-180" />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className={`group relative w-full rounded-xl px-6 py-3 text-white transition-all duration-300
            ${isSubmitting 
              ? 'bg-zinc-800 cursor-not-allowed' 
              : 'bg-gradient-to-r from-[#21eb00] to-emerald-500 hover:shadow-lg hover:shadow-[#21eb00]/20 active:scale-[0.98]'
            }`}
          disabled={isSubmitting}
        >
          <div className="absolute inset-0 rounded-xl bg-black opacity-0 transition-opacity duration-300 group-hover:opacity-10" />
          <div className="relative flex items-center justify-center">
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                <span>Assigning...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                <span>Assign Machine</span>
                <ArrowRight className="ml-2 h-4 w-4 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
              </>
            )}
          </div>
        </button>
      </form>
    </div>
  );
};

export default UserMachineAssignment;