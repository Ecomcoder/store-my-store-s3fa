'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCheckout, CheckoutStep, ShippingAddress } from '@/hooks/use-checkout'
import { ShoppingBag, ChevronRight, Loader2, Check, ArrowLeft, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

const steps: { key: CheckoutStep; label: string }[] = [
  { key: 'info', label: 'Information' },
  { key: 'shipping', label: 'Shipping' },
  { key: 'payment', label: 'Payment & Review' },
]

function formatPrice(amount: number, currency = 'usd') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

export default function CheckoutPage() {
  const router = useRouter()
  const {
    step, setStep, cart, shippingOptions, loadingShipping,
    setContactAndAddress, setShippingMethod, completeCheckout,
    isUpdating, error, clearError,
  } = useCheckout()

  const [email, setEmail] = useState('')
  const [address, setAddress] = useState<ShippingAddress>({
    first_name: '', last_name: '', address_1: '',
    city: '', postal_code: '', country_code: 'us', phone: '',
  })
  const [selectedShipping, setSelectedShipping] = useState('')

  const hasItems = cart?.items && cart.items.length > 0
  const currency = cart?.currency_code || 'usd'

  // Step 1: Submit info
  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    await setContactAndAddress(email, address)
  }

  // Step 2: Submit shipping
  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedShipping) {
      toast.error('Please select a shipping method')
      return
    }
    clearError()
    await setShippingMethod(selectedShipping)
  }

  // Step 3: Place order
  const handlePlaceOrder = async () => {
    clearError()
    const order = await completeCheckout()
    if (order) {
      toast.success('Order placed successfully!')
      router.push(`/checkout/success?order=${order.id}`)
    }
  }

  const updateAddress = (field: keyof ShippingAddress, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <>
      {/* Breadcrumbs */}
      <div className="border-b">
        <div className="container-custom py-3">
          <nav className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">Checkout</span>
          </nav>
        </div>
      </div>

      <div className="container-custom py-8 lg:py-12">
        {/* Step Indicators */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => {
            const stepIndex = steps.findIndex((st) => st.key === step)
            const isActive = s.key === step
            const isCompleted = i < stepIndex

            return (
              <div key={s.key} className="flex items-center gap-2">
                {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                <button
                  onClick={() => isCompleted && setStep(s.key)}
                  disabled={!isCompleted}
                  className={`text-sm transition-colors ${
                    isActive ? 'font-semibold text-foreground' :
                    isCompleted ? 'text-foreground cursor-pointer underline underline-offset-4' :
                    'text-muted-foreground cursor-default'
                  }`}
                >
                  {isCompleted && <Check className="h-3.5 w-3.5 inline mr-1" />}
                  {s.label}
                </button>
              </div>
            )
          })}
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-10 lg:gap-16">
          {/* Main Content */}
          <div>
            {/* Error Banner */}
            {error && (
              <div className="flex items-start gap-3 p-4 mb-6 border border-destructive/30 rounded-sm bg-destructive/5">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Step 1: Contact + Address */}
            {step === 'info' && (
              <form onSubmit={handleInfoSubmit} className="space-y-8">
                <section>
                  <h2 className="text-xs uppercase tracking-widest font-semibold mb-4">Contact</h2>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Email address"
                    className="w-full border-b border-foreground/20 bg-transparent px-0 py-3 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none transition-colors"
                  />
                </section>

                <section>
                  <h2 className="text-xs uppercase tracking-widest font-semibold mb-4">Shipping Address</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" value={address.first_name} onChange={(e) => updateAddress('first_name', e.target.value)} required placeholder="First name" className="border-b border-foreground/20 bg-transparent px-0 py-3 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none transition-colors" />
                    <input type="text" value={address.last_name} onChange={(e) => updateAddress('last_name', e.target.value)} required placeholder="Last name" className="border-b border-foreground/20 bg-transparent px-0 py-3 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none transition-colors" />
                    <input type="text" value={address.address_1} onChange={(e) => updateAddress('address_1', e.target.value)} required placeholder="Address" className="col-span-2 border-b border-foreground/20 bg-transparent px-0 py-3 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none transition-colors" />
                    <input type="text" value={address.city} onChange={(e) => updateAddress('city', e.target.value)} required placeholder="City" className="border-b border-foreground/20 bg-transparent px-0 py-3 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none transition-colors" />
                    <input type="text" value={address.postal_code} onChange={(e) => updateAddress('postal_code', e.target.value)} required placeholder="Postal code" className="border-b border-foreground/20 bg-transparent px-0 py-3 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none transition-colors" />
                    <input type="text" value={address.phone} onChange={(e) => updateAddress('phone', e.target.value)} placeholder="Phone (optional)" className="col-span-2 border-b border-foreground/20 bg-transparent px-0 py-3 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none transition-colors" />
                  </div>
                </section>

                <button
                  type="submit"
                  disabled={isUpdating || !hasItems}
                  className="w-full bg-foreground text-background py-3.5 text-sm font-semibold uppercase tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Continue to Shipping
                </button>
              </form>
            )}

            {/* Step 2: Shipping Method */}
            {step === 'shipping' && (
              <form onSubmit={handleShippingSubmit} className="space-y-6">
                <div className="p-4 border rounded-sm bg-muted/30 text-sm">
                  <p className="text-muted-foreground">Shipping to</p>
                  <p className="font-medium mt-1">{address.first_name} {address.last_name}</p>
                  <p className="text-muted-foreground">{address.address_1}, {address.city} {address.postal_code}</p>
                  <button
                    type="button"
                    onClick={() => setStep('info')}
                    className="text-xs font-semibold underline underline-offset-4 mt-2"
                  >
                    Edit
                  </button>
                </div>

                <section>
                  <h2 className="text-xs uppercase tracking-widest font-semibold mb-4">Shipping Method</h2>
                  {loadingShipping ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : shippingOptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">No shipping options available for this address.</p>
                  ) : (
                    <div className="space-y-2">
                      {shippingOptions.map((option: any) => {
                        const price = option.amount != null ? option.amount : option.prices?.[0]?.amount
                        const priceLabel = price === 0 ? 'Free' : price != null ? formatPrice(price, currency) : '—'

                        return (
                          <label
                            key={option.id}
                            className={`flex items-center justify-between p-4 border rounded-sm cursor-pointer transition-colors ${
                              selectedShipping === option.id ? 'border-foreground' : 'hover:border-foreground/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="shipping"
                                value={option.id}
                                checked={selectedShipping === option.id}
                                onChange={() => setSelectedShipping(option.id)}
                                className="accent-foreground"
                              />
                              <div>
                                <p className="text-sm font-medium">{option.name}</p>
                                {option.type?.description && (
                                  <p className="text-xs text-muted-foreground">{option.type.description}</p>
                                )}
                              </div>
                            </div>
                            <span className="text-sm font-medium">{priceLabel}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </section>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('info')}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating || !selectedShipping}
                    className="flex-1 bg-foreground text-background py-3.5 text-sm font-semibold uppercase tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Continue to Payment
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Payment & Review */}
            {step === 'payment' && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="p-4 border rounded-sm bg-muted/30 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contact</span>
                    <span>{email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ship to</span>
                    <span>{address.address_1}, {address.city}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Method</span>
                    <span>{shippingOptions.find((o: any) => o.id === selectedShipping)?.name || 'Selected'}</span>
                  </div>
                </div>

                <section>
                  <h2 className="text-xs uppercase tracking-widest font-semibold mb-4">Payment</h2>
                  <div className="border rounded-sm p-6">
                    <p className="text-sm text-muted-foreground">
                      This is a demo store. Orders are placed using the system payment provider — no real payment is processed.
                    </p>
                  </div>
                </section>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('shipping')}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={isUpdating}
                    className="flex-1 bg-foreground text-background py-3.5 text-sm font-semibold uppercase tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Place Order
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div>
            <div className="sticky top-24 border rounded-sm p-6">
              <h2 className="text-xs uppercase tracking-widest font-semibold mb-6">Order Summary</h2>

              {!hasItems ? (
                <div className="text-center py-8">
                  <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
                  <p className="mt-3 text-sm text-muted-foreground">Your bag is empty</p>
                  <Link href="/products" className="mt-3 inline-block text-sm font-semibold underline underline-offset-4">
                    Continue Shopping
                  </Link>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {cart?.items?.map((item: any) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="relative h-16 w-14 flex-shrink-0 overflow-hidden bg-muted rounded-sm">
                          {item.thumbnail ? (
                            <Image src={item.thumbnail} alt={item.title} fill className="object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground/30">
                              <ShoppingBag className="h-4 w-4" />
                            </div>
                          )}
                          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[9px] font-bold text-background">
                            {item.quantity}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          {item.variant?.title && item.variant.title !== 'Default' && (
                            <p className="text-xs text-muted-foreground">{item.variant.title}</p>
                          )}
                        </div>
                        <p className="text-sm font-medium">{formatPrice(item.unit_price, currency)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 text-sm border-t pt-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(cart?.subtotal || 0, currency)}</span>
                    </div>
                    {cart?.shipping_total != null && cart.shipping_total > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shipping</span>
                        <span>{formatPrice(cart.shipping_total, currency)}</span>
                      </div>
                    )}
                    {cart?.tax_total != null && cart.tax_total > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax</span>
                        <span>{formatPrice(cart.tax_total, currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-2 mt-2">
                      <span className="font-semibold">Total</span>
                      <span className="font-heading text-lg font-semibold">{formatPrice(cart?.total || 0, currency)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
