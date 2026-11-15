import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, Button, Input } from '../../components/ui'
import { clients as clientApi } from '../../api/endpoints'

function ClientCreate() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const isEditing = !!id

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      company_name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      country: '',
      notes: ''
    }
  })

  useEffect(() => {
    if (!isEditing) return
    const fetchClient = async () => {
      setLoading(true)
      try {
        const response = await clientApi.get(id)
        reset({
          ...response.data,
          company_name: response.data.company || '',
        })
      } catch (error) {
        toast.error('Failed to load client')
        navigate('/clients')
      } finally {
        setLoading(false)
      }
    }
    fetchClient()
  }, [id, isEditing, reset, navigate])

  const onSubmit = async (data) => {
    setSaving(true)
    try {
      const payload = {
        ...data,
        company: data.company_name || '',
      }
      delete payload.company_name
      if (isEditing) {
        await clientApi.update(id, payload)
        toast.success('Client updated')
      } else {
        await clientApi.create(payload)
        toast.success('Client created')
      }
      navigate('/clients')
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to save client'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/clients')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Client' : 'Add Client'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {isEditing ? 'Update client information' : 'Enter client details below'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="max-w-2xl space-y-6">
          {/* Basic Info */}
          <Card>
            <Card.Header>
              <Card.Title>Basic Information</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Contact Name"
                  placeholder="John Doe"
                  error={errors.name?.message}
                  {...register('name', { required: 'Name is required' })}
                />
                <Input
                  label="Company Name"
                  placeholder="Acme Inc."
                  {...register('company_name')}
                />
                <Input
                  label="Email"
                  type="email"
                  placeholder="john@example.com"
                  error={errors.email?.message}
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                />
                <Input
                  label="Phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  {...register('phone')}
                />
              </div>
            </Card.Content>
          </Card>

          {/* Address */}
          <Card>
            <Card.Header>
              <Card.Title>Address</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="space-y-6">
                <Input
                  label="Street Address"
                  placeholder="123 Main St"
                  {...register('address')}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Input
                    label="City"
                    placeholder="New York"
                    {...register('city')}
                  />
                  <Input
                    label="State / Province"
                    placeholder="NY"
                    {...register('state')}
                  />
                  <Input
                    label="ZIP / Postal Code"
                    placeholder="10001"
                    {...register('zip_code')}
                  />
                </div>
                <Input
                  label="Country"
                  placeholder="United States"
                  {...register('country')}
                />
              </div>
            </Card.Content>
          </Card>

          {/* Notes */}
          <Card>
            <Card.Header>
              <Card.Title>Additional Notes</Card.Title>
            </Card.Header>
            <Card.Content>
              <textarea
                {...register('notes')}
                rows={4}
                placeholder="Any additional notes about this client..."
                className="input"
              />
            </Card.Content>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button 
              type="button" 
              variant="secondary"
              onClick={() => navigate('/clients')}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              <Save className="w-4 h-4 mr-2" />
              {isEditing ? 'Update Client' : 'Create Client'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default ClientCreate
