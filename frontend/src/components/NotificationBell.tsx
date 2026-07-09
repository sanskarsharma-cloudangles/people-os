import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function NotificationBell() {
  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
      >
        <Bell className="h-5 w-5" />
        <Badge
          variant="destructive"
          className="absolute top-0 right-0 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          0
        </Badge>
      </Button>
    </div>
  )
}
