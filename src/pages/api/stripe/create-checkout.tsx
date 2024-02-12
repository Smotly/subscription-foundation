// pages/api/create-checkout-session.js
import Stripe from 'stripe';

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            console.log("creation de la session checkout");
            const stripe = new Stripe("sk_test_51OZy8jFkeWfrK4QgLl1oeRGQ5O5gPdMsG3yc6e7IPOEoyfwElnZ1zCU3ccN5jBhsdlMtVthymgWdXicn2V2LvAGD00x5QjajKs");
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card', 'sepa_debit'],
                line_items: [{
                    price: 'price_1Oiw0UFkeWfrK4QgXtZmHnx5', // Remplacez par l'ID de votre plan
                    quantity: 1,
                }],
                mode: 'subscription',
                success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${req.headers.origin}/cancel`,
            });

            //res.status(200).json({ url: session.url });
            res.redirect(302, session.url);
        } catch (error) {
            res.status(500).json({ statusCode: 500, message: error.message });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
