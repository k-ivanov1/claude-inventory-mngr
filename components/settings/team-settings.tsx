'use client'

import { useState } from 'react'

export function TeamSettings() {
  const [team, setTeam] = useState([
    { id: 1, name: 'John Doe', email: 'john@muave.co.uk', role: 'Admin' },
    { id: 2, name: 'Jane Smith', email: 'jane@muave.co.uk', role: 'Manager' },
    { id: 3, name: 'Mark Wilson', email: 'mark@muave.co.uk', role: 'User' },
  ])

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">Team Members</h3>
        <div className="mt-5">
          <div className="flow-root">
            <ul role="list" className="-my-5 divide-y divide-gray-200">
              {team.map((person) => (
                <li key={person.id} className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-500">
                          {person.name.charAt(0)}
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{person.name}</p>
                        <p className="text-sm text-gray-500">{person.email}</p>
                      </div>
                    </div>
                    <div className="ml-3">
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                        {person.role}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-6">
            <button
              type="button"
              className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Invite Team Member
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
