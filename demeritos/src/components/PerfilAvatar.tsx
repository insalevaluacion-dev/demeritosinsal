import { Building2, GraduationCap, Landmark, Users, type LucideIcon } from 'lucide-react'

export type AvatarSexo = 'M' | 'H'

const ICONO: Record<string, LucideIcon> = {
  docente: GraduationCap,
  coordinador: Users,
  subdirector: Building2,
  director: Landmark,
}

export function iconoDeRol(rol: string | null | undefined): LucideIcon {
  return ICONO[rol || ''] || GraduationCap
}

export default function PerfilAvatar({
  rol,
  sexo,
  size = 32,
}: {
  rol?: string | null
  sexo?: AvatarSexo | null
  size?: number
}) {
  const Icon = iconoDeRol(rol)
  const mujer = sexo === 'M'
  return (
    <span
      className={`perfil-avatar${mujer ? ' perfil-avatar--m' : ' perfil-avatar--h'}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Icon size={Math.round(size * 0.58)} strokeWidth={1.75} />
    </span>
  )
}
