import { useState, useEffect } from 'react'
import { Users, Shield, UserPlus, UserMinus, Eye, Edit, Search, X, Download, LogOut } from 'lucide-react'
import Button from '../lib/components/Button'
import Breadcrumb from '../lib/components/Breadcrumb'
import LoadingSpinner from '../lib/components/LoadingSpinner'
import EmptyState from '../lib/components/EmptyState'
import { useAuth } from '../lib/contexts/AuthContext'

interface User {
  id: string
  email: string
  department: string
  isAdmin: boolean
  darkMode: boolean
  profileImage?: string
  displayName?: string
  createdAt: string
}

function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDepartment, setFilterDepartment] = useState<string>('all')
  const [filterRole, setFilterRole] = useState<string>('all')
  const { accessToken, logout } = useAuth()

  useEffect(() => {
    fetchUsers()
  }, [accessToken])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      } else {
        console.error('Failed to fetch users:', response.status)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePromoteUser = async (userEmail: string, reason: string = 'Admin promotion') => {
    if (!confirm(`Are you sure you want to promote ${userEmail} to administrator status? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/user/${userEmail}/promote`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ reason })
      })

      if (response.ok) {
        alert(`${userEmail} has been promoted to administrator status`)
        fetchUsers() // Refresh the user list
      } else {
        const error = await response.json()
        alert(`Failed to promote user: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error promoting user:', error)
      alert('Error promoting user')
    }
  }

  const handleDemoteUser = async (userEmail: string, reason: string = 'Admin demotion') => {
    if (!confirm(`Are you sure you want to remove ${userEmail} from administrator status?`)) {
      return
    }

    try {
      const response = await fetch(`/api/user/${userEmail}/demote`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ reason })
      })

      if (response.ok) {
        alert(`${userEmail} has been removed from administrator status`)
        fetchUsers() // Refresh the user list
      } else {
        const error = await response.json()
        alert(`Failed to demote user: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error demoting user:', error)
      alert('Error demoting user')
    }
  }

  const exportToExcel = () => {
    const csvData = [
      ['Email', 'Department', 'Role', 'Dark Mode', 'Display Name', 'Created At'],
      ...users.map(user => [
        user.email,
        user.department,
        user.isAdmin ? 'Admin' : 'User',
        user.darkMode ? 'Yes' : 'No',
        user.displayName || 'Not set',
        new Date(user.createdAt).toLocaleDateString()
      ])
    ]

    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'user_management.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Apply filters
  let filteredUsers = users

  if (searchQuery.trim()) {
    filteredUsers = filteredUsers.filter(user =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.displayName && user.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  }

  if (filterDepartment !== 'all') {
    filteredUsers = filteredUsers.filter(user => user.department === filterDepartment)
  }

  if (filterRole !== 'all') {
    filteredUsers = filteredUsers.filter(user =>
      filterRole === 'admin' ? user.isAdmin : !user.isAdmin
    )
  }

  // Get unique departments for filter dropdown
  const departments = [...new Set(users.map(u => u.department))].sort()

  if (loading) {
    return <LoadingSpinner text="Loading user management data..." />
  }

  return (
    <div className="ui-page page-enter">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/app/admin' },
        { label: 'User Management' }
      ]} />

      {/* Header */}
      <div className="ui-page-header mb-6">
        <div>
          <h1 className="ui-page-title">User Management</h1>
          <p className="ui-page-subtitle">{filteredUsers.length} users</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={exportToExcel} variant="secondary" size="sm">
            <Download className="h-4 w-4 mr-2" aria-hidden="true" />
            Export CSV
          </Button>
          <Button onClick={logout} variant="outline" size="sm">
            <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
            Logout
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="ui-card-strong mb-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search users by email, department, or display name..."
              className="ui-field w-full pl-10 pr-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="filter-department" className="ui-label">Filter by Department</label>
              <select
                id="filter-department"
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="ui-field w-full"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label htmlFor="filter-role" className="ui-label">Filter by Role</label>
              <select
                id="filter-role"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="ui-field w-full"
              >
                <option value="all">All Roles</option>
                <option value="user">Users</option>
                <option value="admin">Admins</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <EmptyState
          icon={<Users className="h-full w-full" />}
          title="No users found"
          description="No users match your current search and filter criteria."
        />
      ) : (
        <div className="ui-card-strong">
          <h2 className="text-xl font-bold text-bdo-navy mb-4">Users</h2>

          <div className="ui-table-wrap">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="sticky left-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th scope="col" className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th scope="col" className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th scope="col" className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dark Mode</th>
                  <th scope="col" className="hidden xl:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Display Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="sticky left-0 z-10 bg-white px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                          {user.profileImage ? (
                            <img src={user.profileImage} alt={user.email} className="h-10 w-10 rounded-full" />
                          ) : (
                            <span className="text-sm font-medium text-gray-700">
                              {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-bdo-navy truncate max-w-xs">{user.email}</div>
                          {user.displayName && (
                            <div className="text-xs text-gray-500">{user.displayName}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4">
                      <div className="text-sm text-gray-600">{user.department}</div>
                    </td>
                    <td className="hidden md:table-cell px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isAdmin
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-green-100 text-green-800'
                        }`}>
                        {user.isAdmin ? (
                          <>
                            <Shield className="h-3 w-3 mr-1" />
                            Administrator
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-3 w-3 mr-1" />
                            User
                          </>
                        )}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.darkMode
                          ? 'bg-gray-800 text-white'
                          : 'bg-gray-100 text-gray-800'
                        }`}>
                        {user.darkMode ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="hidden xl:table-cell px-6 py-4">
                      <div className="text-sm text-gray-600">
                        {user.displayName || <span className="text-gray-400">Not set</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">{new Date(user.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedUser(user)}
                          aria-label={`View details for ${user.email}`}
                        >
                          <Eye className="h-4 w-4 sm:mr-1" aria-hidden="true" />
                          <span className="hidden sm:inline">View</span>
                        </Button>
                        {!user.isAdmin ? (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handlePromoteUser(user.email)}
                            aria-label={`Promote ${user.email} to admin`}
                          >
                            <Shield className="h-4 w-4 sm:mr-1" aria-hidden="true" />
                            <span className="hidden sm:inline">Promote</span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDemoteUser(user.email)}
                            aria-label={`Remove ${user.email} from admin`}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <UserMinus className="h-4 w-4 sm:mr-1" aria-hidden="true" />
                            <span className="hidden sm:inline">Remove Admin</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-zoom-in"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-details-title"
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 id="user-details-title" className="text-xl font-bold text-bdo-navy">
                User Details
              </h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Close dialog"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="px-6 py-6 space-y-6">
              {/* User Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Basic Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-semibold text-bdo-navy">{selectedUser.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Department:</span>
                      <span className="font-semibold">{selectedUser.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Role:</span>
                      <span className={`font-semibold ${selectedUser.isAdmin ? 'text-purple-600' : 'text-green-600'
                        }`}>
                        {selectedUser.isAdmin ? 'Administrator' : 'User'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dark Mode:</span>
                      <span className="font-semibold">
                        {selectedUser.darkMode ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Profile</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Display Name:</span>
                      <span className="font-semibold">
                        {selectedUser.displayName || <span className="text-gray-400">Not set</span>}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Profile Image:</span>
                      <span className="font-semibold">
                        {selectedUser.profileImage ? 'Set' : <span className="text-gray-400">Not set</span>}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Member Since:</span>
                      <span className="font-semibold">{new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Actions */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Admin Actions</h3>
                <div className="flex flex-wrap gap-3">
                  {!selectedUser.isAdmin ? (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        handlePromoteUser(selectedUser.email)
                        setSelectedUser(null)
                      }}
                    >
                      <Shield className="h-4 w-4 mr-2" aria-hidden="true" />
                      Promote to Admin
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        handleDemoteUser(selectedUser.email)
                        setSelectedUser(null)
                      }}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <UserMinus className="h-4 w-4 mr-2" aria-hidden="true" />
                      Remove from Admin
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      // Navigate to user's profile page
                      window.open(`/app/profile/${selectedUser.email}`, '_blank')
                      setSelectedUser(null)
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" aria-hidden="true" />
                    View Profile
                  </Button>
                </div>
              </div>

              {/* User Statistics (Placeholder for future implementation) */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="ui-card p-4">
                    <p className="text-xs text-gray-600 mb-1">Quizzes Taken</p>
                    <p className="text-2xl font-bold text-bdo-navy">-</p>
                  </div>
                  <div className="ui-card p-4">
                    <p className="text-xs text-gray-600 mb-1">Average Score</p>
                    <p className="text-2xl font-bold text-bdo-navy">-</p>
                  </div>
                  <div className="ui-card p-4">
                    <p className="text-xs text-gray-600 mb-1">Last Activity</p>
                    <p className="text-2xl font-bold text-bdo-navy">-</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Note: Statistics will be available in future updates</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagementPage
