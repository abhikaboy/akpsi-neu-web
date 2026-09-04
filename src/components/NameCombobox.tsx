import { Search } from 'lucide-react'
import { Input } from './ui/input'

export interface ComboboxPerson {
  _id: string
  name: string
}

interface NameComboboxProps {
  people: ComboboxPerson[]
  query: string
  onQueryChange: (value: string) => void
  selectedId: string
  onSelect: (person: ComboboxPerson) => void
  placeholder?: string
  emptyMessage?: string
  inputId?: string
}

export default function NameCombobox({
  people,
  query,
  onQueryChange,
  selectedId,
  onSelect,
  placeholder = 'Search your name...',
  emptyMessage = "No matches. Just type your name if you're not listed yet.",
  inputId,
}: NameComboboxProps) {
  const filtered = query.trim()
    ? people.filter(p => p.name.toLowerCase().includes(query.trim().toLowerCase()))
    : people

  return (
    <div>
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          id={inputId}
          className="h-11 pl-9"
          placeholder={placeholder}
          value={query}
          onChange={e => onQueryChange(e.target.value)}
        />
      </div>
      <div className="border rounded-md max-h-52 overflow-auto divide-y">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground p-3">{emptyMessage}</p>
        ) : (
          filtered.map(p => (
            <button
              key={p._id}
              type="button"
              onClick={() => onSelect(p)}
              className={`w-full text-left px-3 py-2.5 text-sm cursor-pointer hover:bg-accent ${
                selectedId === p._id ? 'bg-accent font-medium' : ''
              }`}
            >
              {p.name}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
