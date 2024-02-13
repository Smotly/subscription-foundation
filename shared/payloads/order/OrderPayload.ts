interface BillingAddress {
    first_name: string,
    last_name: string,
    street_1: string,
    city:string,
    state:string,
    zip:string,
    country:string,
    country_iso2:string,
    email:string
}

interface Product {
    name: string,
    quantity: number,
    price_inc_tax: number
}

export default class OrderPayload implements BodyRequest {
    customer_id: number;
    billing_address: BillingAddress;
    products: Product[];
    status_id: number;
}
