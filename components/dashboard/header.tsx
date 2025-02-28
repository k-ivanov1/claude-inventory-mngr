export function DashboardHeader() {
  return (
    <div className="flex flex-col gap-y-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-2xl font-bold">Dashboard Overview</h2>
        <p className="text-gray-600">
          Welcome back! Here's what's happening with your inventory today.
        </p>
      </div>
      <div className="flex items-center gap-x-4">
        <button className="inline-flex items-center gap-x-2 rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
          Download Report
        </button>
        <button className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
          New Sale
        </button>
      </div>
    </div>
  )
}
