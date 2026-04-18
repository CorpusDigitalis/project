// ============================================================
// EDGE FUNCTION : create-checkout-session
// Crée une session Stripe Checkout et retourne l'URL de paiement
// Déploiement : supabase functions deploy create-checkout-session
// PHASE 2 — Automatisation complète (Early Bird = activation manuelle)
// ============================================================

import Stripe from 'https://esm.sh/stripe@14.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

Deno.serve(async (req: Request) => {
  // Gestion CORS (Cross-Origin Resource Sharing)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    const { prof_id, email, slug } = await req.json()

    if (!prof_id || !email) {
      return new Response(JSON.stringify({ error: 'prof_id et email sont requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const siteUrl = Deno.env.get('SITE_URL') || 'https://corpusdigitalis.com'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: Deno.env.get('STRIPE_PRICE_ID')!, // ID du prix Stripe (144€/an)
          quantity: 1,
        },
      ],
      customer_email: email,
      client_reference_id: prof_id,
      metadata: {
        prof_id,
        slug: slug || '',
      },
      subscription_data: {
        metadata: {
          prof_id,
          slug: slug || '',
        },
      },
      // Redirection après paiement réussi
      success_url: `${siteUrl}/signup.html?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      // Redirection si l'utilisateur annule
      cancel_url: `${siteUrl}/signup.html?payment=cancel`,
      // Paramètres de localisation
      locale: 'fr',
    })

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Erreur création session Stripe:', error)
    return new Response(JSON.stringify({ error: 'Erreur lors de la création du paiement' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
