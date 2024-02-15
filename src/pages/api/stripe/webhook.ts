// pages/api/stripe-webhook.js
import { buffer } from 'micro';
import Stripe from 'stripe';
import axios from "axios";
import * as process from "process";
import {headers} from "next/headers";
import * as console from "console";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_DIRECT);

export const config = {
    api: {
        bodyParser: false,
    },
};

const webhookHandler = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const buf = await buffer(req);
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const myOrder = {
        status_id: 0,
        customer_id: 138,
        billing_address: {
            first_name: "Jane",
            last_name: "Doe",
            street_1: "123 Main Street",
            city: "Austin",
            state: "Texas",
            zip: "78751",
            country: "United States",
            country_iso2: "US",
            email: "janedoe@example.com"
        },
        products: [
            {
                product_id: 111,
                quantity: 1
            }
        ]
    }

    let event;

    try {
        event = stripe.webhooks.constructEvent(buf, sig, secret);
    } catch (err) {
        // On error, return response to Stripe
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        console.log("La session Stripe est completed : ", session);
        const subscription_id = session.subscription
        const customer_id = session.customer
        const email = session.customer_details.email
        /*const sessionBillingAddress = {
            first_name: session.customer_details.name.split(" ")[0],
            last_name: session.customer_details.name.split(" ")[1],
            street_1: session.customer_details.address.line1,
            city: session.customer_details.address.city,
            state: session.customer_details.address.state,
            zip: session.customer_details.address.postal_code,
            country_iso2: session.customer_details.address.country,
            email: session.customer_details.email
        }
        console.log("objet customer : ", sessionBillingAddress)
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 5 });
        lineItems.data.map( item => {
            console.log("id : ",item.id)
            console.log("qty : ", item.quantity)
        })
        console.log("products brut : ", lineItems.data);
        console.log("products : ", await fetchLineItemsWithQuantities(session.id));*/
        //Creation de la commande BigCommerce
        /*try {
            const bigCommerceOrder = await createBigCommerceOrder(myOrder);
            console.log('Order created successfully in BigCommerce', bigCommerceOrder);
        } catch (error) {
            console.error('Failed to create order in BigCommerce', error);
            // Gérer l'échec de création de commande
        }*/
        try {
            const bigCommerceCustomerId = await getCustomerId(email);
            console.log('Customer info successfully from BigCommerce', await bigCommerceCustomerId);
            const bigCommerceCustomerAttributes = await updateCustomerWithStripeInfos(bigCommerceCustomerId, subscription_id, customer_id);
            console.log('Customer attribute successfully from BigCommerce', await bigCommerceCustomerAttributes);
        } catch (error) {
            console.error('Failed to update customer in BigCommerce', error);
            // Gérer l'échec de création de commande
        }
    }

    res.json({received: true});
};
const createBigCommerceOrder = async (orderData) => {
    const url = `${process.env.BIGCOMMERCE_API_URL}/orders`;
    const headers = {
        'X-Auth-Token': process.env.BIGCOMMERCE_ACCESS_TOKEN,
        'Content-Type': 'application/json',
    };

    try {
        const response = await axios.post(url, orderData, { headers });
        return response.data;
    } catch (error) {
        console.error('Error creating BigCommerce order:', error);
        throw new Error('Failed to create BigCommerce order');
    }
};

async function fetchLineItemsWithQuantities(sessionId) {
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 100 });
    return lineItems.data.map(item => ({
        bcId: item.metadata && item.metadata.BC_ID ? item.metadata.BC_ID : null,
        quantity: item.quantity ? item.quantity : 0
    })).filter(item => item.bcId !== null); // Filtrer pour éliminer les items sans BC_ID
}

//get BigCommerce customer id from bigcommerce api
const getCustomerId = async (email) => {
    const url = `${process.env.BIGCOMMERCE_API_URL_V3}/customers?email:in=${email}&include=attributes`;
    const headers = {
        'X-Auth-Token': process.env.BIGCOMMERCE_ACCESS_TOKEN,
        'Content-Type': 'application/json',
    };

    try {
        const response = await axios.get(url, { headers });
        return response.data.data[0].id;
    } catch (error) {
        console.error('Error getting customer:', error);
        throw new Error('Failed to get BigCommerce customer');
    }
};

const updateCustomerWithStripeInfos = async (customerId, subscriptionId, stripeCustomerId) => {
    const url = `${process.env.BIGCOMMERCE_API_URL_V3}/customers/attribute-values?customer_id:in=${customerId}`;
    const headers = {
        'X-Auth-Token': process.env.BIGCOMMERCE_ACCESS_TOKEN,
        'Content-Type': 'application/json',
    };

    try {
        const response = await axios.get(url,{ headers });

        //MAJ de l'ID de subscription
        const actualSubscription =  response.data.data.filter(el => el.attribute_id == 4)[0]?.attribute_value;
        if(actualSubscription) {
            await axios.put(`${process.env.BIGCOMMERCE_API_URL_V3}/customers/attribute-values`,
                 [
                    {
                        customer_id: customerId,
                        attribute_id: 4,
                        value: JSON.stringify([...JSON.parse(actualSubscription), subscriptionId])
                    }
                ]
            , { headers });
        }else {
            await axios.put(`${process.env.BIGCOMMERCE_API_URL_V3}/customers/attribute-values`,
                [
                    {
                        customer_id: customerId,
                        attribute_id: 4,
                        value: JSON.stringify([subscriptionId])
                    }
                ]
            , { headers });
        }
    } catch (error) {
        console.error('Error getting customer:', error);
        throw new Error('Failed to get BigCommerce customer');
    }

    //Update BigCommerce customer attribute with customer id
    try {
       await axios.put(`${process.env.BIGCOMMERCE_API_URL_V3}/customers/attribute-values`,
            [
                {
                    customer_id: customerId,
                    attribute_id: 3,
                    value: stripeCustomerId
                }
            ]
            , {headers});
    } catch (error) {
        console.error('Failed to update customer in BigCommerce', error);
        throw new Error('Failed to update customer in BigCommerce');
    }
    return 'Ok update Stripe info to BC'
};
export default webhookHandler;
