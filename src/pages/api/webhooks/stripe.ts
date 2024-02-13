// pages/api/stripe-webhook.js

import { buffer } from 'micro';
import Stripe from 'stripe';
import axios from "axios";
import bigcommerceService from "@/backend/services/bigcommerce.service";
import BigcommerceService from "@/backend/services/bigcommerce.service";

const stripeClient = new Stripe("sk_test_51OZy8jFkeWfrK4QgLl1oeRGQ5O5gPdMsG3yc6e7IPOEoyfwElnZ1zCU3ccN5jBhsdlMtVthymgWdXicn2V2LvAGD00x5QjajKs", null);

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const buf = await buffer(req);
        const sig = req.headers['stripe-signature'];

        let event;

        try {
            event = stripeClient.webhooks.constructEvent(buf, sig, "whsec_da34a3d06e1816724e1801764cd79c8ee30c33dc2c669c464e379b95bfc1e2e8");
        } catch (err) {
            console.log(`Webhook Error: ${err.message}`);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;

                const url = `https://api.bigcommerce.com/stores/mijzf5snps/v2/orders`;
                const payload = {
                    "status_id": 0,
                    "customer_id": 138,
                    "billing_address": {
                        "first_name": "Jane",
                        "last_name": "Doe",
                        "street_1": "123 Main Street",
                        "city": "Austin",
                        "state": "Texas",
                        "zip": "78751",
                        "country": "United States",
                        "country_iso2": "US",
                        "email": "janedoe@example.com"
                    },
                    "products": [
                        {
                            "product_id": 111,
                            "quantity": 1
                        }
                    ]
                }

                try {
                    const response = await axios.post(url, payload, {
                        headers: {
                            'X-Auth-Token': "9edg76rtbjv86g64f71rxpnu07on3ms",
                            'Content-Type': 'application/json',
                        },
                    });

                    console.log('Commande créée avec succès dans BigCommerce', response.data);
                    return response.data;
                } catch (error) {
                    console.error('Erreur lors de la création de la commande dans BigCommerce', error);
                    throw error;
                }




            console.log('Session completed');
        }

        res.json({received: true});
    } else {
        res.setHeader('Allow', 'POST');
        res.status(405).end('Method Not Allowed');
    }
}
