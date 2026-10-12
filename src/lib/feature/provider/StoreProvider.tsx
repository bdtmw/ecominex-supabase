// lib/feature/provider/StoreProvider.tsx
'use client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/lib/store/store';
import AuthLayout from '@/components/AuthLayout';
export default function StoreProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AuthLayout>
          {children}
        </AuthLayout>
      </PersistGate>
    </Provider>
  );
}