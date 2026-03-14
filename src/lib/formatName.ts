// src/lib/formatName.ts
// Formatta il nome per la community: "Laura Bianchi" → "Laura B."
// Tutela la privacy mostrando solo l'iniziale del cognome

export function formatDisplayName(fullName: string): string {
  if (!fullName || !fullName.trim()) return 'Utente'
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0] // solo nome, nessuna modifica
  const firstName = parts[0]
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase()
  return `${firstName} ${lastInitial}.`
}
