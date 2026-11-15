import { Card } from '../../components/ui'
import { useTheme } from '../../context/ThemeContext'

function AppearanceTab() {
  const { choice: themeChoice, setTheme } = useTheme()
  return (
      <Card>
        <Card.Header>
          <Card.Title>Appearance</Card.Title>
          <Card.Description>Applies straight away and is remembered on this device.</Card.Description>
        </Card.Header>
        <Card.Content>
          <fieldset>
            <legend className="label">Theme</legend>
            <div className="grid grid-cols-3 gap-4 mt-2">
              {[
                { id: 'light', label: 'Light', bg: 'bg-white' },
                { id: 'dark', label: 'Dark', bg: 'bg-gray-900' },
                { id: 'system', label: 'System', bg: 'bg-gradient-to-r from-white to-gray-900' },
              ].map((theme) => (
                <label key={theme.id} className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    value={theme.id}
                    className="sr-only peer"
                    checked={themeChoice === theme.id}
                    onChange={() => setTheme(theme.id)}
                  />
                  <div className={`${theme.bg} h-20 rounded-lg border-2 border-gray-200 dark:border-gray-700 peer-checked:border-primary-500 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 transition-colors`} />
                  <p className="text-center mt-2 text-sm font-medium">{theme.label}</p>
                </label>
              ))}
            </div>
          </fieldset>
        </Card.Content>
      </Card>
  )
}

export default AppearanceTab
