'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import AdminLayout from '@/components/AdminLayout'
import { useAuth } from '@/contexts/AuthContext'
import { User, UserRole } from '@/types'
import { 
  Search,
  Filter,
  MoreVertical,
  Shield,
  ShieldCheck,
  ShieldX,
  User as UserIcon,
  UserCheck,
  Mail,
  Calendar,
  ChevronDown,
  Trash2,
  Loader2,
  AlertTriangle
} from 'lucide-react'

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bgColor: string; icon: any }> = {
  admin: { label: 'Admin', color: 'text-red-700', bgColor: 'bg-red-100', icon: ShieldCheck },
  moderator: { label: 'Moderatore', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: Shield },
  coach: { label: 'Coach', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: UserCheck },
  coachee: { label: 'Coachee', color: 'text-green-700', bgColor: 'bg-green-100', icon: UserIcon },
}

export default function AdminUsersPage() {
  const { user: currentUser, isAdmin } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showRoleMenu, setShowRoleMenu] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState<User | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    try {
      const usersSnap = await getDocs(collection(db, 'users'))
      const usersData = usersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt),
      })) as User[]
      
      setUsers(usersData)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateUserRole(userId: string, newRole: UserRole) {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: new Date()
      })
      
      // Aggiorna stato locale
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ))
      
      setShowRoleMenu(null)
    } catch (error) {
      console.error('Error updating user role:', error)
    }
  }

  async function toggleSuspendUser(userId: string, suspend: boolean) {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isSuspended: suspend,
        suspendedAt: suspend ? new Date() : null,
        updatedAt: new Date()
      })
      
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, isSuspended: suspend } : u
      ))
    } catch (error) {
      console.error('Error suspending user:', error)
    }
  }

  // Elimina utente completamente (Firebase Auth + Firestore)
  async function deleteUser(user: User) {
    if (!currentUser?.email) return
    
    setDeletingId(user.id)
    try {
      // Chiama API per eliminare da Firebase Auth
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          adminEmail: currentUser.email
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Errore eliminazione')
      }
      
      // Rimuovi dalla lista locale
      setUsers(prev => prev.filter(u => u.id !== user.id))
      setShowDeleteModal(null)
      
      alert(`Utente ${user.email} eliminato con successo. Potrà registrarsi di nuovo.`)
      
    } catch (error: any) {
      console.error('Error deleting user:', error)
      alert(`Errore: ${error.message}`)
    } finally {
      setDeletingId(null)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = filterRole === 'all' || user.role === filterRole
    return matchesSearch && matchesRole
  })

  const roleOptions: UserRole[] = ['admin', 'moderator', 'coach', 'coachee']

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-charcoal">Gestione Utenti</h1>
            <p className="text-gray-500">{users.length} utenti registrati</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cerca per nome o email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as UserRole | 'all')}
          >
            <option value="all">Tutti i ruoli</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderatore</option>
            <option value="coach">Coach</option>
            <option value="coachee">Coachee</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utente
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ruolo
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stato
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registrato
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Caricamento...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Nessun utente trovato
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleConfig = ROLE_CONFIG[user.role]
                  const RoleIcon = roleConfig.icon
                  const isCurrentUser = user.id === currentUser?.id
                  
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {user.photo ? (
                            <img
                              src={user.photo}
                              alt={user.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-500">
                                {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-charcoal">
                              {user.name || 'Nome non impostato'}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs text-primary-500">(Tu)</span>
                              )}
                            </p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative">
                          <button
                            onClick={() => setShowRoleMenu(showRoleMenu === user.id ? null : user.id)}
                            disabled={!isAdmin || isCurrentUser}
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${roleConfig.bgColor} ${roleConfig.color} ${
                              isAdmin && !isCurrentUser ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                            }`}
                          >
                            <RoleIcon size={14} />
                            {roleConfig.label}
                            {isAdmin && !isCurrentUser && <ChevronDown size={14} />}
                          </button>
                          
                          {/* Role dropdown */}
                          {showRoleMenu === user.id && isAdmin && !isCurrentUser && (
                            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[150px]">
                              {roleOptions.map((role) => {
                                const config = ROLE_CONFIG[role]
                                const Icon = config.icon
                                return (
                                  <button
                                    key={role}
                                    onClick={() => updateUserRole(user.id, role)}
                                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 ${
                                      user.role === role ? 'bg-gray-50 font-medium' : ''
                                    }`}
                                  >
                                    <Icon size={16} className={config.color} />
                                    {config.label}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <ShieldX size={12} />
                            Sospeso
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Attivo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Calendar size={14} />
                          {user.createdAt instanceof Date 
                            ? user.createdAt.toLocaleDateString('it-IT')
                            : new Date(user.createdAt).toLocaleDateString('it-IT')
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!isCurrentUser && isAdmin && (
                          <div className="flex items-center justify-end gap-2">
                            {user.isSuspended ? (
                              <button
                                onClick={() => toggleSuspendUser(user.id, false)}
                                className="text-sm text-green-600 hover:text-green-700 font-medium"
                              >
                                Riattiva
                              </button>
                            ) : (
                              <button
                                onClick={() => toggleSuspendUser(user.id, true)}
                                className="text-sm text-red-600 hover:text-red-700 font-medium"
                              >
                                Sospendi
                              </button>
                            )}
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => setShowDeleteModal(user)}
                              className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                            >
                              <Trash2 size={14} />
                              Elimina
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal conferma eliminazione */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-charcoal">Elimina utente</h3>
                <p className="text-sm text-gray-500">Questa azione non può essere annullata</p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="font-medium text-charcoal">{showDeleteModal.name || 'Utente'}</p>
              <p className="text-sm text-gray-500">{showDeleteModal.email}</p>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              Verranno eliminati:
            </p>
            <ul className="text-sm text-gray-600 mb-6 space-y-1 ml-4">
              <li>• Account Firebase Authentication</li>
              <li>• Profilo utente da Firestore</li>
              <li>• Sessioni e offerte associate</li>
              <li>• Post nella community</li>
            </ul>
            
            <p className="text-sm text-green-600 mb-6">
              ✓ L'utente potrà registrarsi di nuovo con la stessa email
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={() => deleteUser(showDeleteModal)}
                disabled={deletingId === showDeleteModal.id}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deletingId === showDeleteModal.id ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Eliminazione...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Elimina definitivamente
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
