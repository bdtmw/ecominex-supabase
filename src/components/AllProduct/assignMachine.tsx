'use client'
import React, { useState } from 'react';

import { useDispatch } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import UserMachineAssignment from '../Assign/UserMachineAssign';
import MachineCatalog from '../Assign/MachineCatalog';
import UserMachineList from '../Assign/machineList';
import UserMachineProfitUpdate from '../Assign/Profile';
import SerMachineList from '../Assign/machineList2';

// New Admin Dashboard Component
const AdminDashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        <div className=" max-w-3xl">
          {/* <UserMachineAssignment /> */}
        </div>
        <div className="col-span-1 md:col-span-1">
          {/* <MachineCatalog /> */}
        </div>
        <div className="col-span-1 md:col-span-1">
          <UserMachineList />
          <SerMachineList/>

          <UserMachineProfitUpdate/>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default AdminDashboard;