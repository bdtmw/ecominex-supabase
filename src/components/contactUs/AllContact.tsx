"use client";
import React, { useState, useEffect } from "react";
import {
  Trash2,
  Search,
  MessageSquare,
  Mail,
  Calendar,
  MoreVertical,
  Eye,
  Archive
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/lib/store/store";
import {
  getAllContacts,
  deleteContact,
  markContactAsRead,
  getContactById
} from "@/lib/feature/contact/contactsSlice";

interface Contact {
  _id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  comment: string;
  status: 'pending' | 'read' | 'archived';
  readBy?: string;
  readAt?: Date;
  createdAt: Date;
}

export default function ContactManagementDashboard() {
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const { contacts, loading, error } = useSelector((state: RootState) => state.contact);

  useEffect(() => {
    dispatch(getAllContacts({ page: 1, limit: 10 }) as any);
  }, [dispatch]);

  const filteredContacts = contacts.filter((contact) =>
    Object.values(contact)
      .join(" ")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      await dispatch(deleteContact(contactId) as any);
      toast.success("Contact deleted successfully");
    } catch (error) {
      toast.error("Failed to delete contact");
    }
  };

  const handleViewContact = async (contactId: string) => {
    try {
      await dispatch(getContactById(contactId) as any);
      const contact = contacts.find(c => c._id === contactId);
      if (contact) {
        setSelectedContact(contact);
        setIsViewModalOpen(true);
        if (contact.status === 'pending') {
          dispatch(markContactAsRead(contactId) as any);
        }
      }
    } catch (error) {
      toast.error("Failed to load contact details");
    }
  };

  return (
    <div className="min-h-screen bg-black p-6 text-gray-100">
      <Card className="border-gray-700 bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center space-x-4 text-2xl font-bold text-gray-100">
            <MessageSquare className="h-8 w-8" />
            <span>Contact Management Dashboard</span>
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
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-gray-600 bg-gray-700 pl-10 text-gray-100 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
            <DialogContent className="bg-gray-800 border-gray-700 text-white sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Contact Details</DialogTitle>
              </DialogHeader>
              {selectedContact && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-400">Name</h4>
                      <p className="text-white">{selectedContact.name}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-400">Email</h4>
                      <p className="text-white">{selectedContact.email}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-400">Phone</h4>
                      <p className="text-white">{selectedContact.phone}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-400">Country</h4>
                      <p className="text-white">{selectedContact.country}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-400">Message</h4>
                    <p className="text-white whitespace-pre-wrap">{selectedContact.comment}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-400">Submitted</h4>
                    <p className="text-white">{formatDate(selectedContact.createdAt.toString())}</p>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-black hover:bg-gray-700">
                  <TableHead className="font-medium text-white">Name</TableHead>
                  <TableHead className="font-medium text-white">Email</TableHead>
                  <TableHead className="font-medium text-white">Country</TableHead>
                  <TableHead className="font-medium text-white">Status</TableHead>
                  <TableHead className="font-medium text-white">Submitted</TableHead>
                  <TableHead className="text-right font-medium text-white">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-400">
                      Loading contacts...
                    </TableCell>
                  </TableRow>
                ) : filteredContacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-400">
                      No contacts found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContacts.map((contact) => (
                    <TableRow
                      key={contact._id}
                      className="bg-gray-700 text-white transition-colors hover:bg-gray-600"
                    >
                      <TableCell className="font-medium">{contact.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Mail className="mr-2 h-4 w-4 text-gray-400" />
                          {contact.email}
                        </div>
                      </TableCell>
                      <TableCell>{contact.country}</TableCell>
                      <TableCell>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            contact.status === 'pending'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : contact.status === 'read'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {contact.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                          {formatDate(contact.createdAt.toString())}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className="w-48 bg-gray-800 border-gray-700 text-gray-100"
                            align="end"
                          >
                            <DropdownMenuItem
                              className="flex items-center hover:bg-gray-700 cursor-pointer"
                              onClick={() => handleViewContact(contact._id)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="bg-gray-700" />

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  className="flex items-center text-red-400 hover:bg-red-500/20 hover:text-red-400 cursor-pointer"
                                  onSelect={(e) => e.preventDefault()}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Contact
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="border-gray-700 bg-gray-800">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-gray-100">
                                    Delete Contact
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-gray-400">
                                    Are you sure you want to delete this contact? This action cannot be
                                    undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-gray-700 text-gray-300 hover:bg-gray-600">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteContact(contact._id)}
                                    className="bg-red-500 hover:bg-red-600 text-white"
                                  >
                                    Delete Contact
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