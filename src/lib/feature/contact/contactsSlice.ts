import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '@/utils/axiosInstance';
import { RootState } from '@/lib/store/store';

// Types
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

interface ContactStats {
  totalContacts: number;
  todayContacts: number;
  statusBreakdown: Array<{
    _id: string;
    count: number;
  }>;
}

interface ContactState {
  contacts: Contact[];
  selectedContact: Contact | null;
  stats: ContactStats | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  loading: boolean;
  error: string | null;
}

// Async Thunks
export const getAllContacts = createAsyncThunk(
  'contacts/getAllContacts',
  async ({ page = 1, limit = 10, status }: { page?: number; limit?: number; status?: string }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/api/v1/contacts/all`, {
        params: { page, limit, status }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch contacts');
    }
  }
);

export const getContactById = createAsyncThunk(
  'contacts/getContactById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/api/v1/contacts/${id}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch contact');
    }
  }
);

export const createContact = createAsyncThunk(
  'contacts/createContact',
  async (contactData: Omit<Contact, '_id' | 'status' | 'readBy' | 'readAt' | 'createdAt'>, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/api/v1/contacts', contactData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create contact');
    }
  }
);

export const markContactAsRead = createAsyncThunk(
  'contacts/markAsRead',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/api/v1/contacts/${id}/read`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark contact as read');
    }
  }
);

export const deleteContact = createAsyncThunk(
  'contacts/deleteContact',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(`/api/v1/contacts/${id}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete contact');
    }
  }
);

export const getContactStats = createAsyncThunk(
  'contacts/getStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/api/v1/contacts/stats');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch contact statistics');
    }
  }
);

const initialState: ContactState = {
  contacts: [],
  selectedContact: null,
  stats: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  },
  loading: false,
  error: null
};

const contactsSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedContact: (state) => {
      state.selectedContact = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Get All Contacts
      .addCase(getAllContacts.pending, (state) => {
        state.loading = true;
      })
      .addCase(getAllContacts.fulfilled, (state, action) => {
        state.loading = false;
        state.contacts = action.payload.contacts;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(getAllContacts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Get Contact By ID
      .addCase(getContactById.pending, (state) => {
        state.loading = true;
      })
      .addCase(getContactById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedContact = action.payload;
        state.error = null;
      })
      .addCase(getContactById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Create Contact
      .addCase(createContact.pending, (state) => {
        state.loading = true;
      })
      .addCase(createContact.fulfilled, (state, action) => {
        state.loading = false;
        state.contacts = [action.payload.contact, ...state.contacts];
        state.error = null;
      })
      .addCase(createContact.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Mark as Read
      .addCase(markContactAsRead.pending, (state) => {
        state.loading = true;
      })
      .addCase(markContactAsRead.fulfilled, (state, action) => {
        state.loading = false;
        const updatedContact = action.payload.contact;
        state.contacts = state.contacts.map(contact =>
          contact._id === updatedContact._id ? updatedContact : contact
        );
        if (state.selectedContact?._id === updatedContact._id) {
          state.selectedContact = updatedContact;
        }
        state.error = null;
      })
      .addCase(markContactAsRead.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Delete Contact
      .addCase(deleteContact.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteContact.fulfilled, (state, action) => {
        state.loading = false;
        state.contacts = state.contacts.filter(
          contact => contact._id !== action.payload.contact._id
        );
        if (state.selectedContact?._id === action.payload.contact._id) {
          state.selectedContact = null;
        }
        state.error = null;
      })
      .addCase(deleteContact.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Get Stats
      .addCase(getContactStats.pending, (state) => {
        state.loading = true;
      })
      .addCase(getContactStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
        state.error = null;
      })
      .addCase(getContactStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

export const { clearError, clearSelectedContact } = contactsSlice.actions;
export default contactsSlice.reducer;