"use client"
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store/store';
import { getReferralById, Referral as ReferralType } from '@/lib/feature/userMachine/profitSlice';

const Referral = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);

  // Referrals state from profit slice
  const { referralData, loading, error } = useSelector(
    (state: RootState) => state.profit.referrals
  );

  useEffect(() => {
    if (user?.id) {
      dispatch(getReferralById(user.id as string));
    }
  }, [user?.id, dispatch]);

  // Helper function to truncate text
  const truncate = (text: string, maxLength: number) =>
    text.length > maxLength ? text.slice(0, maxLength) + "…" : text;

  return (
    <section className="px-2 py-4">
      <h2 className="mb-2 text-3xl font-bold text-white">Referral Users</h2>

      {/* Static Notes */}
      <div className="mb-4 bg-[#282c31c4] px-6 py-5 rounded-lg text-gray-300 text-sm mt-4">
        <h4 className=' text-[18px] font-[500] text-gray-300 mb-3'>Note:</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>First-time referral user deposit gives 10% bonus.</li>
          <li>Further deposits by referral users give 2% bonus.</li>
          <li>Ensure your referral users complete registration to qualify.</li>
        </ul>
      </div>
      <div className="w-full bg-[#121417] mt-6 rounded-xl text-white">

        {/* Table Header */}
        <div className="grid grid-cols-5 bg-[#282c31c4] rounded-t-[13px] font-[400] px-6 py-4.5 text-[#d0d0d0] text-[15.8px]">
          <span>Name</span>
          <span className="text-center">Email Id</span>
          <span className="text-center">Date</span>
          <span className="text-center">Deposits Made</span>
          <span className="text-center">Profits</span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-10 text-center text-gray-400 text-lg">
            Loading referrals...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="py-10 text-center text-red-500 text-lg">
            {error}
          </div>
        )}

        {/* No Data */}
        {!loading && !error && referralData.length === 0 && (
          <div className="py-10 text-center text-gray-400 text-lg">
            No Referrals Found
          </div>
        )}

        {/* Data Rows */}
        {!loading && !error && referralData.length > 0 && (
          <div className='min-h-[50vh]'>
            {referralData.map((item: ReferralType, index) => (
              <div
                key={index}
                className="
                  grid grid-cols-5 items-center px-6 py-4
                  bg-[#1c1f2488] border-b border-[#555]
                  transition-all duration-300 
                  hover:scale-[1.01] hover:-rotate-1 hover:bg-[#22262b]
                "
              >
                <div>{truncate(item.firstName + " " + item.lastName, 13)}</div>
                <div className="text-center text-gray-300">{truncate(item.email, 20)}</div>
                <div className="text-center text-gray-400 text-sm">
                  {new Date(item.createdAt).toLocaleDateString()}
                </div>
                <div className="text-center font-semibold">{item.deposit_count}</div>
                <div className="text-center font-semibold text-[#21eb00]">
                  ${item.discount}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Referral;
