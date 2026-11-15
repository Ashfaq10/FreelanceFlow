import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Save, Upload, User, Building, CreditCard, Bell, Palette } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, Button, Input, Select } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { settings as settingsApi, auth as authApi } from '../../api/endpoints'

function Settings() {
  const { user, updateUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [logoPreview, setLogoPreview] = useState(null)

  const { register, handleSubmit, reset } = useForm()

  useEffect(() => {
    if (user) {
      reset({
        email: user.email || '',
        full_name: user.full_name || '',
        business_name: user.business_name || '',
        business_tagline: user.business_tagline || '',
        business_email: user.business_email || '',
        business_phone: user.business_phone || '',
        phone: user.phone || '',
        address: user.address || '',
        website: user.website || '',
        tax_number: user.tax_number || '',
        bank_details: user.bank_details || '',
        invoice_terms: user.invoice_terms || '',
        default_currency: user.default_currency || 'USD',
      })
      if (user.logo) setLogoPreview(user.logo)
    }
  }, [user, reset])

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await authApi.updateProfile(data)
      updateUser(data)
      toast.success('Settings saved successfully')
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    const reader = new FileReader()
    reader.onload = () => setLogoPreview(reader.result)
    reader.readAsDataURL(file)

    try {
      const { data } = await settingsApi.uploadLogo(file)
      updateUser(data)
      if (data.logo) setLogoPreview(data.logo)
      toast.success('Logo uploaded successfully')
    } catch (error) {
      toast.error('Failed to upload logo')
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'business', label: 'Business', icon: Building },
    { id: 'invoicing', label: 'Invoicing', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ]

  const currencies = [
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'GBP', label: 'GBP - British Pound' },
    { value: 'CAD', label: 'CAD - Canadian Dollar' },
    { value: 'AUD', label: 'AUD - Australian Dollar' },
    { value: 'INR', label: 'INR - Indian Rupee' },
    { value: 'BDT', label: 'BDT - Bangladeshi Taka' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Manage your account and business preferences
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64">
          <Card>
            <nav className="p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </Card>
        </div>

        {/* Content */}
        <div className="flex-1">
          <form onSubmit={handleSubmit(onSubmit)}>
            {activeTab === 'profile' && (
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
            )}

            {activeTab === 'business' && (
              <Card>
                <Card.Header>
                  <Card.Title>Business Information</Card.Title>
                  <Card.Description>Details that appear on your invoices</Card.Description>
                </Card.Header>
                <Card.Content className="space-y-6">
                  {/* Logo Upload */}
                  <div>
                    <label className="label">Business Logo</label>
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                        {logoPreview || user?.logo ? (
                          <img 
                            src={logoPreview || user?.logo} 
                            alt="Logo" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Building className="w-10 h-10 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <label className="btn btn-secondary cursor-pointer">
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Logo
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </label>
                        <p className="text-sm text-gray-500 mt-2">
                          PNG, JPG up to 2MB
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Business Name"
                      placeholder="Acme Inc."
                      {...register('business_name')}
                    />
                    <Input
                      label="Tagline"
                      placeholder="The future of your industry"
                      {...register('business_tagline')}
                    />
                    <Input
                      label="Business Email"
                      type="email"
                      placeholder="billing@acme.com"
                      {...register('business_email')}
                    />
                    <Input
                      label="Business Phone"
                      placeholder="+1 (555) 123-4567"
                      {...register('business_phone')}
                    />
                    <Input
                      label="Website"
                      placeholder="https://example.com"
                      {...register('website')}
                    />
                    <Input
                      label="Business Address"
                      placeholder="Street, city, country (shown on invoices)"
                      {...register('address')}
                    />
                    <Input
                      label="VAT / Tax Number"
                      placeholder="VAT-123456"
                      {...register('tax_number')}
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
            )}

            {activeTab === 'invoicing' && (
              <Card>
                <Card.Header>
                  <Card.Title>Invoice Settings</Card.Title>
                  <Card.Description>Default settings for new invoices</Card.Description>
                </Card.Header>
                <Card.Content className="space-y-6">
                  <Select
                    label="Default Currency"
                    options={currencies}
                    {...register('default_currency')}
                  />
                  <div>
                    <label className="label">Bank Details (one per line)</label>
                    <textarea
                      className="input min-h-[120px] font-mono text-sm"
                      placeholder={'Account Name: Your Company\nAccount Number: 0000-0000000000\nBank Name: Example Bank'}
                      {...register('bank_details')}
                    />
                    <p className="text-sm text-gray-500 mt-1">Shown in the bank details box on PDF invoices.</p>
                  </div>
                  <div>
                    <label className="label">Terms &amp; Conditions (one per line)</label>
                    <textarea
                      className="input min-h-[100px] text-sm"
                      placeholder="All amounts are in the currency shown on this invoice."
                      {...register('invoice_terms')}
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
            )}

            {activeTab === 'notifications' && (
              <Card>
                <Card.Header>
                  <Card.Title>Notification Preferences</Card.Title>
                  <Card.Description>Manage how you receive notifications</Card.Description>
                </Card.Header>
                <Card.Content className="space-y-6">
                  <div className="space-y-4">
                    {[
                      { id: 'invoice_paid', label: 'Invoice paid', desc: 'Get notified when a client pays an invoice' },
                      { id: 'invoice_overdue', label: 'Invoice overdue', desc: 'Get notified when an invoice becomes overdue' },
                      { id: 'payment_reminder', label: 'Payment reminders', desc: 'Receive reminders about upcoming due dates' },
                      { id: 'weekly_summary', label: 'Weekly summary', desc: 'Receive a weekly summary of your activity' },
                    ].map((item) => (
                      <label key={item.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                        </div>
                        <input
                          type="checkbox"
                          defaultChecked
                          className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                      </label>
                    ))}
                  </div>
                </Card.Content>
                <Card.Footer>
                  <Button type="submit" loading={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </Card.Footer>
              </Card>
            )}

            {activeTab === 'appearance' && (
              <Card>
                <Card.Header>
                  <Card.Title>Appearance</Card.Title>
                  <Card.Description>Customize the look and feel</Card.Description>
                </Card.Header>
                <Card.Content className="space-y-6">
                  <div>
                    <label className="label">Theme</label>
                    <div className="grid grid-cols-3 gap-4 mt-2">
                      {[
                        { id: 'light', label: 'Light', bg: 'bg-white' },
                        { id: 'dark', label: 'Dark', bg: 'bg-gray-900' },
                        { id: 'system', label: 'System', bg: 'bg-gradient-to-r from-white to-gray-900' },
                      ].map((theme) => (
                        <label
                          key={theme.id}
                          className="relative cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="theme"
                            value={theme.id}
                            className="sr-only peer"
                            defaultChecked={theme.id === 'light'}
                          />
                          <div className={`${theme.bg} h-20 rounded-lg border-2 border-gray-200 dark:border-gray-700 peer-checked:border-primary-500 transition-colors`} />
                          <p className="text-center mt-2 text-sm font-medium">{theme.label}</p>
                        </label>
                      ))}
                    </div>
                  </div>
                </Card.Content>
                <Card.Footer>
                  <Button type="submit" loading={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </Card.Footer>
              </Card>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

export default Settings
