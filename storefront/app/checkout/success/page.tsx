'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Package, ArrowRight } from 'lucide-react'
import { Suspense } from 'react'

function OrderSuccessContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order')

  return (
    <div className="container-custom py-section">
      <div className="max-w-lg mx-auto text-center">
        <CheckCircle className="h-16 w-16 mx-auto text-green-600" strokeWidth={1.5} />

        <h1 className="mt-6 text-h1 font-heading font-semibold">Thank You!</h1>
        <p className="mt-3 text-muted-foreground">
          Your order has been placed successfully.
        </p>

        {orderId && (
          <div className="mt-6 p-4 border rounded-sm bg-muted/30">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Order ID</p>
            <p className="mt-1 text-sm font-mono font-medium">{orderId}</p>
          </div>
        )}

        <div className="mt-8 p-6 border rounded-sm text-left space-y-3">
          <div className="flex items-start gap-3">
            <Package className="h-5 w-5 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-medium">What happens next?</p>
              <p className="text-sm text-muted-foreground mt-1">
                You&apos;ll receive a confirmation email shortly. Once your order ships,
                we&apos;ll send you tracking information.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 bg-foreground text-background px-8 py-3.5 text-sm font-semibold uppercase tracking-wide hover:opacity-90 transition-opacity"
          >
            Continue Shopping
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/account/orders"
            className="inline-flex items-center justify-center gap-2 border border-foreground px-8 py-3.5 text-sm font-semibold uppercase tracking-wide hover:bg-foreground hover:text-background transition-colors"
          >
            View Orders
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="container-custom py-section text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  )
}
