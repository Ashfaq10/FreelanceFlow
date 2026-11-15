import { Save, Upload, Building } from 'lucide-react'
import { Card, Button, Input } from '../../components/ui'

function BusinessTab({ register, loading, user, logoPreview, onLogoUpload }) {
  return (
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
                    onChange={onLogoUpload}
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
  )
}

export default BusinessTab
