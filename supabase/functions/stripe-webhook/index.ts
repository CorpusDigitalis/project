// ============================================================
// EDGE FUNCTION : stripe-webhook
// Reçoit les événements Stripe et active les comptes après paiement
// Déploiement : supabase functions deploy stripe-webhook
// URL à configurer dans Stripe Dashboard > Webhooks
// PHASE 2 — Automatisation complète (Early Bird = activation manuelle)
// ============================================================

import Stripe from 'https://esm.sh/stripe@14.0.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

// Client Supabase avec SERVICE ROLE KEY pour les opérations admin (bypass RLS)
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req: Request) => {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!signature || !webhookSecret) {
    console.error('Signature ou secret webhook manquant')
    return new Response('Webhook non autorisé', { status: 401 })
  }

  const body = await req.text()

  let event: Stripe.Event
  try {
    // Vérification cryptographique que l'event vient vraiment de Stripe
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
  } catch (err) {
    console.error('Signature Stripe invalide:', err)
    return new Response(`Webhook error: ${err}`, { status: 400 })
  }

  console.log(`Événement Stripe reçu : ${event.type}`)

  // ==========================================================
  // PAIEMENT INITIAL RÉUSSI (abonnement annuel créé)
  // ==========================================================
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const prof_id = session.client_reference_id
    const stripe_customer_id = session.customer as string
    const stripe_subscription_id = session.subscription as string
    const customer_email = session.customer_email

    if (!prof_id) {
      console.error('prof_id manquant dans la session Stripe')
      return new Response('prof_id manquant', { status: 400 })
    }

    // 1. Activer le compte du professeur
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        is_active: true,
        stripe_customer_id,
        stripe_subscription_id,
        activated_at: new Date().toISOString(),
      })
      .eq('id', prof_id)

    if (profileError) {
      console.error('Erreur activation profil:', profileError)
      return new Response('Erreur activation compte', { status: 500 })
    }

    // 2. Enregistrer le paiement dans la table stripe_payments
    const { error: paymentError } = await supabaseAdmin
      .from('stripe_payments')
      .insert({
        prof_id,
        stripe_session_id: session.id,
        stripe_customer_id,
        stripe_subscription_id,
        amount_cents: session.amount_total,
        currency: session.currency?.toUpperCase() || 'EUR',
        status: 'completed',
        email: customer_email,
        payment_type: 'initial',
      })

    if (paymentError) {
      console.error('Erreur enregistrement paiement:', paymentError)
      // On ne bloque pas : le compte est activé même si le log échoue
    }

    console.log(`Compte activé avec succès pour prof_id: ${prof_id} (${customer_email})`)
  }

  // ==========================================================
  // RENOUVELLEMENT ANNUEL (abonnement renouvelé automatiquement)
  // ==========================================================
  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as Stripe.Invoice

    // Uniquement pour les renouvellements (pas le premier paiement géré au-dessus)
    if (invoice.billing_reason === 'subscription_cycle') {
      const stripe_subscription_id = invoice.subscription as string
      const stripe_customer_id = invoice.customer as string

      // Trouver le prof par son ID Stripe
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', stripe_customer_id)
        .single()

      if (profile) {
        await supabaseAdmin.from('stripe_payments').insert({
          prof_id: profile.id,
          stripe_invoice_id: invoice.id,
          stripe_customer_id,
          stripe_subscription_id,
          amount_cents: invoice.amount_paid,
          currency: invoice.currency?.toUpperCase() || 'EUR',
          status: 'completed',
          email: invoice.customer_email,
          payment_type: 'renewal',
        })

        console.log(`Renouvellement enregistré pour prof_id: ${profile.id}`)
      }
    }
  }

  // ==========================================================
  // PAIEMENT ÉCHOUÉ (abonnement inactif)
  // ==========================================================
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    const stripe_customer_id = invoice.customer as string

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', stripe_customer_id)
      .single()

    if (profile) {
      await supabaseAdmin
        .from('profiles')
        .update({ is_active: false })
        .eq('id', profile.id)

      console.log(`Compte désactivé (paiement échoué) pour prof_id: ${profile.id}`)
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
