'use client'

import { useState } from 'react'
import { User } from '@supabase/auth-helpers-nextjs'

interface ProfileSettingsProps {
  user: User | undefined
}

export function ProfileSettings({ user }: ProfileSettingsProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: user?.email || '',
    jobTitle: '',
    department: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle profile update here
    alert('Profile updated successfully')
  }

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">Your Profile</h3>
        <form onSubmit={handleSubmit} className="mt-5 space-y-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full name
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={formData.email}
                  readOnly
                  className="block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700">
                Job Title
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="jobTitle"
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                Department
              </label>
              <div className="mt-1">
                <select
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select a department</option>
                  <option value="Sales">Sales</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Operations">Operations</option>
                  <option value="Finance">Finance</option>
                  <option value="IT">IT</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Save Changes
            </button>
          </div>
        </form>

        <div className="mt-10 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900">Password</h4>
          <p className="mt-1 text-sm text-gray-500">
            This account uses magic links for authentication. No password is required.
          </p>
        </div>
      </div>
    </div>
  )
}
