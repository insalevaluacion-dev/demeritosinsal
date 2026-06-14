import {
  LayoutDashboard,
  Users,
  GraduationCap,
  AlertTriangle,
  Award,
  ClipboardList,
  BarChart3,
  Bell,
  BellOff,
  Settings,
  RefreshCw,
  LogOut,
  UserCog,
  Lock,
  Search,
  X,
  Check,
  CheckCircle,
  Phone,
  Calendar,
  User,
  Building2,
  Download,
  TrendingDown,
  Zap,
  CircleAlert,
  FileSpreadsheet,
  Menu,
  type LucideIcon,
} from 'lucide-react'

export type AppIconName =
  | 'dashboard'
  | 'estudiantes'
  | 'maestros'
  | 'demerito'
  | 'demeritoNuevo'
  | 'reconocimiento'
  | 'reconocimientoNuevo'
  | 'historial'
  | 'reportes'
  | 'notificaciones'
  | 'admin'
  | 'cambiarRol'
  | 'logout'
  | 'userCog'
  | 'lock'
  | 'search'
  | 'bell'
  | 'bellOff'
  | 'check'
  | 'checkCircle'
  | 'x'
  | 'alert'
  | 'phone'
  | 'calendar'
  | 'user'
  | 'graduationCap'
  | 'building'
  | 'download'
  | 'chart'
  | 'trendingDown'
  | 'clipboard'
  | 'zap'
  | 'fileSpreadsheet'
  | 'redencion'
  | 'coordinador'
  | 'director'
  | 'menu'

const ICONS: Record<AppIconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  estudiantes: Users,
  maestros: GraduationCap,
  demerito: AlertTriangle,
  demeritoNuevo: AlertTriangle,
  reconocimiento: Award,
  reconocimientoNuevo: Award,
  historial: ClipboardList,
  reportes: BarChart3,
  notificaciones: Bell,
  admin: Settings,
  cambiarRol: RefreshCw,
  logout: LogOut,
  userCog: UserCog,
  lock: Lock,
  search: Search,
  bell: Bell,
  bellOff: BellOff,
  check: Check,
  checkCircle: CheckCircle,
  x: X,
  alert: CircleAlert,
  phone: Phone,
  calendar: Calendar,
  user: User,
  graduationCap: GraduationCap,
  building: Building2,
  download: Download,
  chart: BarChart3,
  trendingDown: TrendingDown,
  clipboard: ClipboardList,
  zap: Zap,
  fileSpreadsheet: FileSpreadsheet,
  redencion: CheckCircle,
  coordinador: BarChart3,
  director: UserCog,
  menu: Menu,
}

/** Icono solo contorno negro. */
export default function AppIcon({
  name,
  size = 18,
  className,
}: {
  name: AppIconName
  size?: number
  className?: string
}) {
  const Icon = ICONS[name] ?? LayoutDashboard
  return (
    <Icon
      size={size}
      strokeWidth={2}
      fill="none"
      className={className}
      color="#111"
      aria-hidden
    />
  )
}

export function IconBox({
  name,
  size = 20,
  bg = '#fff',
}: {
  name: AppIconName
  size?: number
  bg?: string
}) {
  return (
    <div className="icon-box" style={{ background: bg }}>
      <AppIcon name={name} size={size} />
    </div>
  )
}
