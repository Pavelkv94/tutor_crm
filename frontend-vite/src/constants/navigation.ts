import {
  Calendar,
  Users,
  FileText,
  UserCog,
  LayoutDashboard,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  icon: LucideIcon
  label: string
  path: string
  adminOnly?: boolean
}

export const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Главная', path: '/' },
  { icon: Calendar, label: 'Расписание', path: '/schedule' },
  { icon: Users, label: 'Ученики', path: '/students' },
  { icon: FileText, label: 'Тарифы', path: '/plans', adminOnly: true },
  { icon: UserCog, label: 'Преподаватели', path: '/teachers', adminOnly: true },
  { icon: ClipboardList, label: 'Задачи', path: '/tasks' },
]

export const getVisibleNavItems = (isAdmin: boolean) =>
  navItems.filter((item) => !item.adminOnly || isAdmin)

export const getHomePageItems = (isAdmin: boolean) =>
  getVisibleNavItems(isAdmin).filter((item) => item.path !== '/')
