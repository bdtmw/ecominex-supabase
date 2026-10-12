'use client'
import { useSelector } from 'react-redux'
import { ReactNode } from 'react'
import { RootState } from '@/lib/store/store'

interface AdminRouteProps {
  children: ReactNode
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user } = useSelector((state: RootState) => state.auth)

  if (!user || user.role !== 'admin') {
    return null 
  }

  return <>{children}</>
}
