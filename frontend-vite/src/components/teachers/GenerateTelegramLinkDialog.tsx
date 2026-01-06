import { Copy, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface GenerateTelegramLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  link: string | null
  onCopy: () => void
  copied: boolean
}

export const GenerateTelegramLinkDialog = ({
  open,
  onOpenChange,
  link,
  onCopy,
  copied,
}: GenerateTelegramLinkDialogProps) => {
  const handleCopy = () => {
    if (link) {
      navigator.clipboard.writeText(link)
      onCopy()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ссылка Telegram</DialogTitle>
          <DialogDescription>Скопируйте ссылку для отправки преподавателю.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="telegram-link">Ссылка</Label>
            <div className="flex gap-2">
              <Input
                id="telegram-link"
                value={link || ''}
                readOnly
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

