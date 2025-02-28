'use client'

import { useState } from 'react'
import { NewSaleForm } from './new-sale-form'

export function NewSaleButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
      >
        New Sale
      </button>

      {isOpen && <NewSaleForm onClose={() => setIsOpen(false)} />}
    </>
  )
}
