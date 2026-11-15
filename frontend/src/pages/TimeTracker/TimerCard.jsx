import { Play, Pause } from 'lucide-react'
import { Card, Button, Select } from '../../components/ui'

function TimerCard({ time, isTracking, onStart, onStop, clients, client, onClientChange, description, onDescriptionChange }) {
  return (
    <Card>
      <Card.Content className="py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="text-4xl font-mono font-bold text-gray-900 dark:text-white">
              {time}
            </div>
            <div className="flex gap-3">
              {!isTracking ? (
                <Button onClick={onStart} aria-label="Start timer" className="rounded-full w-12 h-12 p-0">
                  <Play className="w-5 h-5" />
                </Button>
              ) : (
                <Button onClick={onStop} variant="danger" aria-label="Stop timer" className="rounded-full w-12 h-12 p-0">
                  <Pause className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex-1 max-w-md space-y-3">
            <Select
              options={clients}
              placeholder="Select client"
              value={client}
              onChange={(e) => onClientChange(e.target.value)}
              disabled={isTracking}
            />
            <input
              type="text"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="What are you working on?"
              className="input"
              disabled={isTracking}
            />
          </div>
        </div>
      </Card.Content>
    </Card>
  )
}

export default TimerCard
