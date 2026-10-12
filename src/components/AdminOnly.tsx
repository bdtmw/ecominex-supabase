'use client'
import { useSelector } from 'react-redux'
import { ReactNode } from 'react'
import { RootState } from '@/lib/store/store'

interface AdminOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

export const AdminOnly = ({ children, fallback = null }: AdminOnlyProps) => {
  const { user } = useSelector((state: RootState) => state.auth)
  
  if (!user || user.role !== 'admin') {
    return <>{fallback}</>
  }

  return <>{children}</>
}