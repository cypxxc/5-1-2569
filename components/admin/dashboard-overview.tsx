"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Users, AlertCircle, MessageSquare } from "lucide-react"
import { StatsCard } from "@/components/admin/stats-card"
import { ItemsActivityChart } from "@/components/admin/items-activity-chart"
import { CategoryDistributionChart } from "@/components/admin/category-distribution-chart"
import type { Item, User, SupportTicket } from "@/types"

interface DashboardOverviewProps {
  items: Item[]
  users: User[]
  tickets: SupportTicket[]
  newItemsCount: number
  flaggedUsersCount: number
  newTicketsCount: number
  onTabChange?: (tab: string) => void
}

export function DashboardOverview({
  items,
  users,
  tickets,
  newItemsCount,
  flaggedUsersCount,
  newTicketsCount,
}: DashboardOverviewProps) {
  // Calculate stats
  const totalItems = items.length
  const totalUsers = users.length
  const pendingItems = items.filter(i => i.status === 'pending').length
  const activeUsers = users.filter(u => u.status === 'ACTIVE').length

  // Calculate dynamic change percentages based on 7-day comparison
  const calculateChange = (data: { createdAt?: any; postedAt?: any }[], dateField: 'createdAt' | 'postedAt' = 'createdAt') => {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    const thisWeek = data.filter(item => {
      const date = (item[dateField] as any)?.toDate?.() || new Date()
      return date >= sevenDaysAgo && date <= now
    }).length

    const lastWeek = data.filter(item => {
      const date = (item[dateField] as any)?.toDate?.() || new Date()
      return date >= fourteenDaysAgo && date < sevenDaysAgo
    }).length

    if (lastWeek === 0) {
      return thisWeek > 0 ? { text: `+${thisWeek}`, trend: 'up' as const } : { text: '0', trend: 'up' as const }
    }

    const percentChange = Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
    return {
      text: `${percentChange >= 0 ? '+' : ''}${percentChange}%`,
      trend: percentChange >= 0 ? 'up' as const : 'down' as const
    }
  }

  const itemsChange = calculateChange(items, 'postedAt')
  const usersChange = calculateChange(users, 'createdAt')
  const ticketsChange = calculateChange(tickets, 'createdAt')
  
  // For pending items, we compare current count vs description (inversed - less is better)
  const pendingTotal = pendingItems + flaggedUsersCount
  const pendingChange = pendingTotal === 0 
    ? { text: '✓', trend: 'down' as const }
    : { text: `${pendingTotal} รายการ`, trend: 'up' as const }

  return (
    <div className="space-y-8">
      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="สิ่งของทั้งหมด"
          value={totalItems}
          change={itemsChange.text}
          trend={itemsChange.trend}
          icon={Package}
          color="blue"
          description={`${newItemsCount} รายการใหม่ (7 วัน)`}
        />
        
        <StatsCard
          title="ผู้ใช้งานทั้งหมด"
          value={totalUsers}
          change={usersChange.text}
          trend={usersChange.trend}
          icon={Users}
          color="green"
          description={`${activeUsers} ใช้งานอยู่`}
        />
        
        <StatsCard
          title="รอดำเนินการ"
          value={pendingTotal}
          change={pendingChange.text}
          trend={pendingChange.trend}
          icon={AlertCircle}
          color="amber"
          urgent={pendingTotal > 0}
          description={`${pendingItems} สิ่งของ, ${flaggedUsersCount} ผู้ใช้`}
        />
        
        <StatsCard
          title="Support Tickets"
          value={tickets.length}
          change={ticketsChange.text}
          trend={ticketsChange.trend}
          icon={MessageSquare}
          color="red"
          description={`${newTicketsCount} ใหม่ (7 วัน)`}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ItemsActivityChart items={items} />
        <CategoryDistributionChart items={items} />
      </div>

      {/* Recent Activity - 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>กิจกรรมล่าสุด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {items.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.category} • {item.status}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date((item.postedAt as any)?.toDate?.() || new Date()).toLocaleDateString('th-TH')}
                  </span>
                </div>
              ))}
              {items.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">ไม่มีกิจกรรม</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>กิจกรรมก่อนหน้า</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {items.slice(5, 10).map((item) => (
                <div key={item.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/50 mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.category} • {item.status}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date((item.postedAt as any)?.toDate?.() || new Date()).toLocaleDateString('th-TH')}
                  </span>
                </div>
              ))}
              {items.length <= 5 && (
                <p className="text-sm text-muted-foreground text-center py-4">ไม่มีกิจกรรมเพิ่มเติม</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
