import { Modal, Button, Input, Select } from '../../components/ui'

/** Add / edit form for one time log. The page owns the form state and passes it in. */
function TimeLogModal({ isOpen, onClose, isEditing, clients, saving, form, onSubmit }) {
  const { register, errors } = form
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Time Log' : 'Log Time'}>
      <form onSubmit={onSubmit} className="space-y-6">
        <Select
          label="Client"
          options={clients}
          placeholder="Select a client"
          error={errors.client?.message}
          {...register('client', { required: 'Client is required' })}
        />

        <Input
          label="Description"
          placeholder="What did you work on?"
          error={errors.description?.message}
          {...register('description', { required: 'Description is required' })}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Hours"
            type="number"
            step="0.25"
            min="0.25"
            placeholder="1.5"
            error={errors.hours?.message}
            {...register('hours', {
              required: 'Hours is required',
              min: { value: 0.25, message: 'Minimum 0.25 hours' },
            })}
          />
          <Input
            label="Date"
            type="date"
            error={errors.date?.message}
            {...register('date', { required: 'Date is required' })}
          />
        </div>

        <Input
          label="Hourly Rate (optional)"
          type="number"
          step="0.01"
          placeholder="75.00"
          {...register('hourly_rate')}
        />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {isEditing ? 'Update' : 'Save'} Time Log
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default TimeLogModal
