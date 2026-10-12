"use client";
import React, { useState } from "react";
import {
  Trash2,
  Search,
  UserCircle2,
  MapPin,
  Mail,
  Calendar,
  MoreVertical,
  User,
  DollarSign,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useUsers } from "@/hooks/Userdetail";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import UserBalanceUpdate from "../AllUser/updateBalance";

interface User {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  country?: string;
  role?: string;
  createdAt?: string;
}

interface UseUsersReturn {
  users: User[];
  deleteUser: (userId: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export default function AllUsersPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);

  const { users, deleteUser, isLoading, error } = useUsers() as UseUsersReturn;
  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth as AuthState,
  );

  const filteredUsers =
    users?.filter(
      (user) =>
        (user.firstName || "")
          .toLowerCase()
          .includes((searchTerm || "").toLowerCase()) ||
        (user.lastName || "")
          .toLowerCase()
          .includes((searchTerm || "").toLowerCase()) ||
        (user.email || "")
          .toLowerCase()
          .includes((searchTerm || "").toLowerCase()) ||
        (user.country || "")
          .toLowerCase()
          .includes((searchTerm || "").toLowerCase()),
    ) || [];

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Invalid Date";
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const success = await deleteUser(userId);
    if (success) {
      toast.success("User deleted successfully");
    } else {
      toast.error("Failed to delete user");
    }
  };

  const handleRowClick = (userId: string) => {
    if (!userId) {
      toast.error("Invalid user ID");
      return;
    }
    router.push(`/AllUser/${userId}`);
  };

  return (
    <div className="min-h-screen bg-black p-6 text-gray-100">
      <Card className="border-gray-700 bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center space-x-4 text-2xl font-bold text-gray-100">
            <UserCircle2 className="h-8 w-8" />
            <span>User Management Dashboard</span>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 rounded-lg border bg-red-500/10 border-red-500/30 p-4 text-red-400">
              {error}
            </div>
          )}

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400" />
            <Input
              placeholder="Search users by name, email, or country"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-gray-600 bg-gray-700 pl-10 text-gray-100 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <Dialog open={isBalanceModalOpen} onOpenChange={setIsBalanceModalOpen}>
            <DialogContent className="border-gray-700 bg-gray-800 text-white sm:max-w-[600px]">
              {selectedUser && (
                <UserBalanceUpdate 
                  userId={selectedUser._id || selectedUser.id || ""} 
                  userName={`${selectedUser.firstName} ${selectedUser.lastName}`}
                />
              )}
            </DialogContent>
          </Dialog>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-black hover:bg-gray-700">
                  <TableHead className="font-medium text-white">Name</TableHead>
                  <TableHead className="font-medium text-white">Phone Number</TableHead>
                  <TableHead className="font-medium text-white">Email</TableHead>
                  <TableHead className="font-medium text-white">Country</TableHead>
                  <TableHead className="font-medium text-white">Role</TableHead>
                  <TableHead className="font-medium text-white">Created At</TableHead>
                  <TableHead className="text-right font-medium text-white">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-400">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-400">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow
                      key={user._id || user.id}
                      className="cursor-pointer bg-gray-700 text-[#ffffff] transition-colors hover:bg-gray-600"
                      onClick={(e) => {
                        // Only navigate if not clicking on the actions cell
                        if (!(e.target as HTMLElement).closest('.actions-cell')) {
                          handleRowClick(user._id || user.id || "");
                        }
                      }}
                    >
                      <TableCell className="font-medium">
                        {user.firstName || "N/A"} {user.lastName || "N/A"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {user.phoneNumber || "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Mail className="mr-2 h-4 w-4 text-gray-400" />
                          {user.email || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                          {user.country || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          user.role === "admin"
                            ? "bg-blue-500/20 text-[#22c55e]"
                            : "bg-green-500/20 text-green-400"
                        }`}>
                          {user.role || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                          {formatDate(user.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right actions-cell">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent 
                            className="w-48 border-gray-700 bg-gray-800 text-gray-100"
                            align="end"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DropdownMenuItem
                              className="flex cursor-pointer items-center hover:bg-gray-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(user._id || user.id || "");
                              }}
                            >
                              <User className="mr-2 h-4 w-4" />
                              User Profile
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem
                              className="flex cursor-pointer items-center hover:bg-gray-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUser(user);
                                setIsBalanceModalOpen(true);
                              }}
                            >
                              <DollarSign className="mr-2 h-4 w-4" />
                              Update Balance
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator className="bg-gray-700" />
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  className="flex cursor-pointer items-center text-red-400 hover:bg-red-500/20 hover:text-red-400"
                                  onSelect={(e) => e.preventDefault()}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete User
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="border-gray-700 bg-gray-800">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-gray-100">
                                    Delete User Account
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-gray-400">
                                    Are you sure you want to delete {user.firstName}{" "}
                                    {user.lastName} account? This action cannot be
                                    undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-gray-700 text-gray-300 hover:bg-gray-600">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteUser(user._id || user.id || "");
                                    }}
                                    className="bg-red-500 text-white hover:bg-red-600"
                                  >
                                    Delete User
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}