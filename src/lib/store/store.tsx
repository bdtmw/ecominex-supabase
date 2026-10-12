// src/lib/store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import {
  persistReducer,
  persistStore,
  WebStorage,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist/es/constants';
import { adminApiSlice } from '../feature/auth/adminApiSlice';
import authReducer from '../feature/auth/authSlice';
import userMachineReducer from '../feature/userMachine/usermachineApi';
import balanceReducer from '../feature/userMachine/balanceSlice';
import transactionReducer from '../feature/userMachine/transactionSlice';
import contactReducer from '../feature/contact/contactsSlice';
import shareMachineReducer from '../feature/shareMachine/shareMachineSlice';

import { baseApiSlice } from './apiSlice';
import { miningMachinesApiSlice } from '../feature/Machines/miningMachinesApiSlice';
import withdrawalReducer from '../feature/withdraw/withdrawalSlice';
import profitReducer from '../feature/userMachine/profitSlice';


const PERSIST_KEYS = {
  ROOT: 'root',
  AUTH: 'auth',
  USER_MACHINE: 'userMachine',
  WITHDRAWAL: 'withdrawal',
  BALANCE: 'balance',
  TRANSACTION: 'transaction',
  CONTACT: 'contact',
  SHARE_MACHINE: 'shareMachine'  // Added new key for share machine
} as const;

interface PersistConfig {
  key: string;
  storage: WebStorage;
  whitelist: string[];
}

// Create persist configs for each reducer that needs persistence
const createPersistConfig = (key: string): PersistConfig => ({
  key,
  storage,
  whitelist: key === PERSIST_KEYS.TRANSACTION 
    ? ['transactions', 'saleHistory', 'lastPurchase', 'lastSale']
    : key === PERSIST_KEYS.SHARE_MACHINE
      ? ['specialMachine', 'userShares', 'lastPurchase'] // Whitelist for shareMachine
      : ['data', 'userBalance', 'lastTransaction']
});

// Persist individual reducers
const persistedAuthReducer = persistReducer(createPersistConfig(PERSIST_KEYS.AUTH), authReducer);
const persistedUserMachineReducer = persistReducer(createPersistConfig(PERSIST_KEYS.USER_MACHINE), userMachineReducer);
const persistedWithdrawalReducer = persistReducer(createPersistConfig(PERSIST_KEYS.WITHDRAWAL), withdrawalReducer);
const persistedBalanceReducer = persistReducer(createPersistConfig(PERSIST_KEYS.BALANCE), balanceReducer);
const persistedTransactionReducer = persistReducer(createPersistConfig(PERSIST_KEYS.TRANSACTION), transactionReducer);
const persistedContactReducer = persistReducer(createPersistConfig(PERSIST_KEYS.CONTACT), contactReducer);
const persistedShareMachineReducer = persistReducer(createPersistConfig(PERSIST_KEYS.SHARE_MACHINE), shareMachineReducer);

export const store = configureStore({
  reducer: {
    [baseApiSlice.reducerPath]: baseApiSlice.reducer,
    [PERSIST_KEYS.AUTH]: persistedAuthReducer,
    [PERSIST_KEYS.USER_MACHINE]: persistedUserMachineReducer,
    [PERSIST_KEYS.WITHDRAWAL]: persistedWithdrawalReducer,
    [PERSIST_KEYS.BALANCE]: persistedBalanceReducer,
    [miningMachinesApiSlice.reducerPath]: miningMachinesApiSlice.reducer,
    [PERSIST_KEYS.TRANSACTION]: persistedTransactionReducer,
    [PERSIST_KEYS.CONTACT]: persistedContactReducer,
    [PERSIST_KEYS.SHARE_MACHINE]: persistedShareMachineReducer, // Added share machine reducer
      profit: profitReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(
      baseApiSlice.middleware,
      miningMachinesApiSlice.middleware
    ),
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;