'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { useCheckout, CheckoutStep, ShippingAddress } from '@/hooks/use-checkout'
import { useCheckoutSettings } from '@/hooks/use-checkout-settings'
import { useAuth } from '@/hooks/use-auth'
import { useCart } from '@/hooks/use-cart'
import { ShoppingBag, ChevronRight, Loader2, Check, ArrowLeft, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { StripePaymentForm } from '@/components/checkout/stripe-payment-form'
import { PromoCodeInput } from '@/components/checkout/promo-code-input'
import { getProductImage } from '@/lib/utils/placeholder-images'
import { trackBeginCheckout } from '@/lib/analytics'
import { formatPrice } from '@/lib/utils/format-price'

const steps: { key: CheckoutStep; label: string }[] = [
  { key: 'info', label: 'Information' },
  { key: 'shipping', label: 'Shipping' },
  { key: 'payment', label: 'Payment & Review' },
]

type InfoFormValues = {
  email: string
  first_name: string
  last_name: string
  company: string
  address_1: string
  address_2: string
  city: string
  postal_code: string
  phone: string
  country_code: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const {
    step, setStep, cart, shippingOptions, loadingShipping,
    setContactAndAddress, setShippingMethod, completeCheckout,
    isUpdating, error, clearError, paymentSession, stripeConfig,
  } = useCheckout()

  const { data: checkoutSettings } = useCheckoutSettings()
  const { customer, isLoggedIn, isLoading: authLoading } = useAuth()
  const {
    appliedPromoCodes, discountTotal, applyPromoCode, removePromoCode,
    isApplyingPromo, isRemovingPromo,
  } = useCart()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<InfoFormValues>({
    mode: 'onTouched',
    defaultValues: {
      email: '', first_name: '', last_name: '', company: '',
      address_1: '', address_2: '', city: '', postal_code: '',
      phone: '', country_code: '',
    },
  })

  const watchedEmail = watch('email')
  const watchedAddress = watch()

  const [marketingOptIn, setMarketingOptIn] = useState(false)
  const [selectedShipping, setSelectedShipping] = useState('')

  const hasItems = cart?.items && cart.items.length > 0
  const currency = cart?.currency_code || 'usd'

  const trackedCheckout = useRef(false)
  useEffect(() => {
    if (cart?.id && hasItems && !trackedCheckout.current) {
      trackedCheckout.current = true
      trackBeginCheckout(cart.id, cart.total, currency)
    }
  }, [cart?.id, hasItems, cart?.total, currency])

  // Require account: redirect to login if not logged in
  useEffect(() => {
    if (!authLoading && checkoutSettings?.require_account && !isLoggedIn) {
      toast.error('Please sign in to continue to checkout')
      router.push('/auth/login?redirect=/checkout')
    }
  }, [authLoading, checkoutSettings?.require_account, isLoggedIn, router])

  // Pre-fill email from customer if logged in
  useEffect(() => {
    if (customer?.email) {
      setValue('email', customer.email, { shouldValidate: false })
    }
  }, [customer?.email, setValue])

  // Set country code from cart region (only once, on first load)
  const countryCodeSet = useRef(false)
  useEffect(() => {
    if (countryCodeSet.current) return
    const countryCode = cart?.shipping_address?.country_code || cart?.region?.countries?.[0]?.iso_2
    if (countryCode) {
      countryCodeSet.current = true
      setValue('country_code', countryCode, { shouldValidate: false })
    }
  }, [cart?.shipping_address?.country_code, cart?.region?.countries, setValue])

  // Set marketing opt-in default based on settings
  useEffect(() => {
    if (checkoutSettings?.marketing_opt_in?.enabled && checkoutSettings.marketing_opt_in.pre_checked) {
      setMarketingOptIn(true)
    }
  }, [checkoutSettings?.marketing_opt_in])

  // Step 1: Submit info
  const handleInfoSubmit = handleSubmit(async (data) => {
    clearError()
    const shippingAddress: ShippingAddress = {
      first_name: data.first_name || '',
      last_name: data.last_name,
      address_1: data.address_1,
      address_2: data.address_2 || '',
      company: data.company || '',
      city: data.city,
      postal_code: data.postal_code,
      country_code: data.country_code || '',
      phone: data.phone || '',
    }
    await setContactAndAddress(data.email, shippingAddress)

    // TODO: Store marketing opt-in preference in cart metadata or customer metadata
    // For now, it's captured but not persisted
    if (marketingOptIn) {
      console.log('Customer opted in to marketing emails')
    }
  })

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

  const buildSuccessUrl = (order: { id: string }) => {
    return `/checkout/success?order=${encodeURIComponent(order.id)}`
  }

  // Step 3: Place order
  const handlePlaceOrder = async () => {
    clearError()
    const order = await completeCheckout()
    if (order) {
      toast.success('Order placed successfully!')
      router.push(buildSuccessUrl(order))
    }
  }

  const inputCls = (hasError: boolean) =>
    `w-full border-b bg-transparent px-0 py-3 text-sm placeholder:text-muted-foreground focus:outline-none transition-colors ${
      hasError
        ? 'border-destructive focus:border-destructive'
        : 'border-foreground/20 focus:border-foreground'
    }`

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
              <form onSubmit={handleInfoSubmit} className="space-y-8" noValidate>
                <section>
                  <h2 className="text-xs uppercase tracking-widest font-semibold mb-4">Contact</h2>

                  <div>
                    <input
                      type="email"
                      {...register('email', {
                        required: 'Email is required',
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: 'Please enter a valid email address',
                        },
                      })}
                      placeholder="Email address"
                      autoComplete="email"
                      className={inputCls(!!errors.email)}
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
                    )}
                  </div>

                  {/* Marketing opt-in checkbox */}
                  {checkoutSettings?.marketing_opt_in?.enabled && checkoutSettings.marketing_opt_in.where !== 'signin' && (
                    <label className="flex items-start gap-2 mt-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={marketingOptIn}
                        onChange={(e) => setMarketingOptIn(e.target.checked)}
                        className="w-4 h-4 mt-0.5 text-foreground focus:ring-2 focus:ring-foreground rounded"
                      />
                      <span className="text-sm text-muted-foreground">
                        Email me with news and offers
                      </span>
                    </label>
                  )}
                </section>

                <section>
                  <h2 className="text-xs uppercase tracking-widest font-semibold mb-4">Shipping Address</h2>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                    {/* First Name - conditionally required */}
                    {checkoutSettings?.full_name === 'full' && (
                      <div>
                        <input
                          type="text"
                          {...register('first_name', {
                            validate: (val) =>
                              checkoutSettings?.full_name === 'full' && !val?.trim()
                                ? 'First name is required'
                                : true,
                          })}
                          placeholder="First name"
                          autoComplete="given-name"
                          className={inputCls(!!errors.first_name)}
                        />
                        {errors.first_name && (
                          <p className="mt-1 text-xs text-destructive">{errors.first_name.message}</p>
                        )}
                      </div>
                    )}

                    {/* Last Name - always required */}
                    <div className={checkoutSettings?.full_name === 'last_only' ? 'col-span-2' : ''}>
                      <input
                        type="text"
                        {...register('last_name', { required: 'Last name is required' })}
                        placeholder="Last name"
                        autoComplete="family-name"
                        className={inputCls(!!errors.last_name)}
                      />
                      {errors.last_name && (
                        <p className="mt-1 text-xs text-destructive">{errors.last_name.message}</p>
                      )}
                    </div>

                    {/* Company Name - conditional visibility */}
                    {checkoutSettings?.company_name === 'optional' && (
                      <div className="col-span-2">
                        <input
                          type="text"
                          {...register('company')}
                          placeholder="Company (optional)"
                          autoComplete="organization"
                          className={inputCls(false)}
                        />
                      </div>
                    )}

                    {/* Address Line 1 - always required */}
                    <div className="col-span-2">
                      <input
                        type="text"
                        {...register('address_1', { required: 'Address is required' })}
                        placeholder="Address"
                        autoComplete="address-line1"
                        className={inputCls(!!errors.address_1)}
                      />
                      {errors.address_1 && (
                        <p className="mt-1 text-xs text-destructive">{errors.address_1.message}</p>
                      )}
                    </div>

                    {/* Address Line 2 - conditional visibility and requirement */}
                    {checkoutSettings?.address_line_2 !== 'hidden' && (
                      <div className="col-span-2">
                        <input
                          type="text"
                          {...register('address_2', {
                            validate: (val) =>
                              checkoutSettings?.address_line_2 === 'required' && !val?.trim()
                                ? 'Apartment/suite is required'
                                : true,
                          })}
                          placeholder={checkoutSettings?.address_line_2 === 'required' ? 'Apartment, suite, etc.' : 'Apartment, suite, etc. (optional)'}
                          autoComplete="address-line2"
                          className={inputCls(!!errors.address_2)}
                        />
                        {errors.address_2 && (
                          <p className="mt-1 text-xs text-destructive">{errors.address_2.message}</p>
                        )}
                      </div>
                    )}

                    {/* City - always required */}
                    <div>
                      <input
                        type="text"
                        {...register('city', { required: 'City is required' })}
                        placeholder="City"
                        autoComplete="address-level2"
                        className={inputCls(!!errors.city)}
                      />
                      {errors.city && (
                        <p className="mt-1 text-xs text-destructive">{errors.city.message}</p>
                      )}
                    </div>

                    {/* Postal Code - always required */}
                    <div>
                      <input
                        type="text"
                        {...register('postal_code', {
                          required: 'Postal code is required',
                          pattern: {
                            value: /^[A-Za-z0-9\s-]{2,10}$/,
                            message: 'Please enter a valid postal code',
                          },
                        })}
                        placeholder="Postal code"
                        autoComplete="postal-code"
                        className={inputCls(!!errors.postal_code)}
                      />
                      {errors.postal_code && (
                        <p className="mt-1 text-xs text-destructive">{errors.postal_code.message}</p>
                      )}
                    </div>

                    {/* Phone - conditional requirement */}
                    <div className="col-span-2">
                      <input
                        type="tel"
                        {...register('phone', {
                          validate: (val) => {
                            if (checkoutSettings?.phone === 'required' && !val?.trim()) {
                              return 'Phone is required'
                            }
                            if (val?.trim() && !/^[\d\s+\-()]{6,20}$/.test(val)) {
                              return 'Please enter a valid phone number'
                            }
                            return true
                          },
                        })}
                        placeholder={checkoutSettings?.phone === 'required' ? 'Phone' : 'Phone (optional)'}
                        autoComplete="tel"
                        className={inputCls(!!errors.phone)}
                      />
                      {errors.phone && (
                        <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>
                      )}
                    </div>

                    {/* Hidden country code field */}
                    <input type="hidden" {...register('country_code')} />
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
                  <p className="font-medium mt-1">{watchedAddress.first_name} {watchedAddress.last_name}</p>
                  <p className="text-muted-foreground">{watchedAddress.address_1}, {watchedAddress.city} {watchedAddress.postal_code}</p>
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
                    <span>{watchedEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ship to</span>
                    <span>{watchedAddress.address_1}, {watchedAddress.city}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Method</span>
                    <span>{shippingOptions.find((o: any) => o.id === selectedShipping)?.name || 'Selected'}</span>
                  </div>
                </div>

                <section>
                  <h2 className="text-xs uppercase tracking-widest font-semibold mb-4">Payment</h2>
                  {stripeConfig.paymentReady && paymentSession?.client_secret && stripeConfig.publishableKey ? (
                    <StripePaymentForm
                      clientSecret={paymentSession.client_secret}
                      stripeAccountId={paymentSession.stripe_account_id}
                      publishableKey={stripeConfig.publishableKey}
                      isCompletingOrder={isUpdating}
                      onPaymentSuccess={async () => {
                        const order = await completeCheckout()
                        if (order) {
                          toast.success('Order placed successfully!')
                          router.push(buildSuccessUrl(order))
                        }
                      }}
                      onError={(msg) => { clearError(); toast.error(msg) }}
                    />
                  ) : isUpdating && stripeConfig.paymentReady ? (
                    <div className="border rounded-sm p-6 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Initializing payment...</span>
                    </div>
                  ) : (
                    <div className="border rounded-sm p-6">
                      <p className="text-sm text-muted-foreground">
                        This is a demo store. Orders are placed using the system payment provider — no real payment is processed.
                      </p>
                    </div>
                  )}
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
                  {/* Only show Place Order button for system provider (non-Stripe) */}
                  {!stripeConfig.paymentReady && (
                    <button
                      onClick={handlePlaceOrder}
                      disabled={isUpdating}
                      className="flex-1 bg-foreground text-background py-3.5 text-sm font-semibold uppercase tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Place Order
                    </button>
                  )}
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
                          <Image
                            src={getProductImage(item.thumbnail, item.product_id || item.id)}
                            alt={item.title}
                            fill
                            className="object-cover"
                          />
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

                  <div className="border-t pt-4">
                    <PromoCodeInput
                      appliedPromoCodes={appliedPromoCodes}
                      discountTotal={discountTotal}
                      currencyCode={currency}
                      isApplyingPromo={isApplyingPromo}
                      isRemovingPromo={isRemovingPromo}
                      onApply={applyPromoCode}
                      onRemove={removePromoCode}
                    />
                  </div>

                  <div className="space-y-2 text-sm border-t pt-4">
                    {(() => {
                      const isTaxInclusive = cart?.items?.some((item: any) => item.is_tax_inclusive)
                      const subtotal = isTaxInclusive
                        ? ((cart as any)?.original_item_total ?? 0)
                        : ((cart as any)?.original_item_subtotal ?? cart?.subtotal ?? 0)
                      return (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>{formatPrice(subtotal, currency)}</span>
                          </div>
                          {discountTotal > 0 && (
                            <div className="flex justify-between text-green-700 dark:text-green-500">
                              <span className="text-muted-foreground">Discount</span>
                              <span>-{formatPrice(discountTotal, currency)}</span>
                            </div>
                          )}
                          {cart?.shipping_total != null && cart.shipping_total > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Shipping</span>
                              <span>{formatPrice(cart.shipping_total, currency)}</span>
                            </div>
                          )}
                          {cart?.tax_total != null && cart.tax_total > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                {isTaxInclusive ? 'Includes tax' : 'Tax'}
                              </span>
                              <span>{isTaxInclusive ? '' : '+'}{formatPrice(cart.tax_total, currency)}</span>
                            </div>
                          )}
                        </>
                      )
                    })()}
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

        {/* Compliance Footer */}
        <div className="mt-12 pt-8 border-t text-center">
          <p className="text-xs text-muted-foreground">
            By completing your order, you agree to our{' '}
            <Link href="/terms" className="underline underline-offset-2 hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            {' '}and{' '}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}
