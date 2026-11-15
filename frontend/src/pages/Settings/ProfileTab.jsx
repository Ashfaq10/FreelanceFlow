import { Save } from 'lucide-react'
import { Card, Button, Input } from '../../components/ui'

function ProfileTab({ register, loading }) {
  return (
      <Card>
        <Card.Header>
          <Card.Title>Profile Settings</Card.Title>
          <Card.Description>Update your personal information</Card.Description>
        </Card.Header>
        <Card.Content className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Full Name"
              placeholder="John Doe"
              {...register('full_name')}
            />
            <Input
              label="Email"
              type="email"
              disabled
              {...register('email')}
            />
            <Input
              label="Phone"
              placeholder="+1 (555) 123-4567"
              {...register('phone')}
            />
          </div>
        </Card.Content>
        <Card.Footer>
          <Button type="submit" loading={loading}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </Card.Footer>
      </Card>
  )
}

export default ProfileTab
