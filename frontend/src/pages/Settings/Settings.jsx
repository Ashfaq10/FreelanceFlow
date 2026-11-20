import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { User, Building, CreditCard, Palette } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { settings as settingsApi, auth as authApi } from '../../api/endpoints'
import ProfileTab from './ProfileTab'
import BusinessTab from './BusinessTab'
import InvoicingTab from './InvoicingTab'
import AppearanceTab from './AppearanceTab'

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
        invoice_prefix: user.invoice_prefix || 'INV',
      })
      if (user.logo) setLogoPreview(user.logo)
    }
  }, [user, reset])

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const { data: saved } = await authApi.updateProfile(data)
      updateUser(saved) // the server normalises some values (e.g. the invoice prefix is upper-cased)
      toast.success('Settings saved successfully')
    } catch {
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
    } catch {
      toast.error('Failed to upload logo')
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'business', label: 'Business', icon: Building },
    { id: 'invoicing', label: 'Invoicing', icon: CreditCard },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage your account and business preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64">
          <Card>
            <nav aria-label="Settings sections" className="p-2">
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
            {activeTab === 'profile' && <ProfileTab register={register} loading={loading} />}

            {activeTab === 'business' && (
              <BusinessTab
                register={register}
                loading={loading}
                user={user}
                logoPreview={logoPreview}
                onLogoUpload={handleLogoUpload}
              />
            )}

            {activeTab === 'invoicing' && <InvoicingTab register={register} loading={loading} />}

            {activeTab === 'appearance' && <AppearanceTab />}
          </form>
        </div>
      </div>
    </div>
  )
}

export default Settings
