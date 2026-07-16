import { COMMON_EMOJIS } from '@/components/tasks/common-emojis'

interface EmojiPickerPanelProps {
  onEmojiSelect: (emoji: string) => void
}

export const EmojiPickerPanel = ({ onEmojiSelect }: EmojiPickerPanelProps) => {
  return (
    <div
      className="w-[280px] rounded-md border border-black/10 bg-white p-2 shadow-lg"
      role="listbox"
      aria-label="Выбор смайлика"
    >
      <div className="grid grid-cols-8 gap-1">
        {COMMON_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded text-lg hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onEmojiSelect(emoji)}
            aria-label={`Добавить смайлик ${emoji}`}
            tabIndex={0}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
