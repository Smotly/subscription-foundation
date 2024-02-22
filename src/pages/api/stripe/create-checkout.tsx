// pages/api/create-checkout-session.js
import Stripe from 'stripe';

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            console.log("creation de la session checkout");
            const stripe = new Stripe("sk_test_51OZy8jFkeWfrK4QgLl1oeRGQ5O5gPdMsG3yc6e7IPOEoyfwElnZ1zCU3ccN5jBhsdlMtVthymgWdXicn2V2LvAGD00x5QjajKs",null);
            const bigcommerce_email = req.body.bigcommerce_email ? req.body.bigcommerce_email : null;
            const products = req.body.products ? JSON.parse(req.body.products) : null;
            const customer_stripe = req.body.customer_stripe ? req.body.customer_stripe :
                await stripe.customers.create( {
                    email:bigcommerce_email
                }).then(response => {
                    return response.id
                })
            console.log("DATA pour creation checkout : ", bigcommerce_email, products, customer_stripe)
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card', 'sepa_debit'],
                customer: customer_stripe,
                //line_items: products,
                line_items:[
                    {price:"price_1OlXqBFkeWfrK4Qg2vNBVrj1",
                    quantity:10}
                ],
                mode: 'subscription',
                success_url: `${req.headers.origin}/confirmation-abonnement?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${req.headers.origin}/cart.php`,
                billing_address_collection: 'required'
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
