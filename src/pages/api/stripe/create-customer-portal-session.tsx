import { NextApiRequest } from "@/types/next";
import { NextApiResponse } from "next";
import { BigApi } from "@/backend/services/bigcommerce";
import BigCommerce from "node-bigcommerce";
import { RequestType } from "@/backend/controllers/api-route-controller";
import { BaseStripeController } from "@/backend/controllers/base-stripe-controller";
import { appContainer } from "@/shared/di-container/app";
import { injectable } from "tsyringe";
import Stripe from "stripe";
import {
  BC_APP_CLIENT_ID,
  BC_APP_SECRET,
  BC_APP_CALLBACK_URL
} from "@/shared/constants/bigcommerce";
import { CUSTOMER_PORTAL_HEADLINE } from "@/constants/stripe";

@injectable()
export class StripeCustomerPortalController extends BaseStripeController {
  public requiresAuth = false;
  public requiresStore = true;
  public body: any = this.body;
  public response: Stripe.Response<Stripe.BillingPortal.Session>;

  public async run(
    _req?: NextApiRequest,
    res?: NextApiResponse
  ): Promise<NextApiResponse | void> {
    const config: {
      features: {
        subscription_cancel: { mode: string; proration_behavior: string; enabled: boolean };
        invoice_history: { enabled: boolean };
        payment_method_update: { enabled: boolean };
        customer_update: { enabled: boolean; allowed_updates: string[] };
        subscription_update: {
          default_allowed_updates: any[];
          proration_behavior: string;
          enabled: boolean;
          products: { product: string; prices: string[] }[]
        }
      };
      business_profile: { privacy_policy_url: string; headline: string; terms_of_service_url: string }
    } = {
      business_profile: {
        headline: CUSTOMER_PORTAL_HEADLINE,
        privacy_policy_url: this.store.url + "/privacy",
        terms_of_service_url: this.store.url + "/terms-of-service"
      },
      features: {
        customer_update: {
          allowed_updates: ["tax_id"],
          enabled: true
        },
        invoice_history: {
          enabled: true
        },
        payment_method_update: {
          enabled: true
        },
        subscription_cancel: {
          enabled: true,
          mode: "at_period_end",
          proration_behavior: "none"
        },
        subscription_update: {
          enabled:true,
          default_allowed_updates: ["quantity"],
          proration_behavior: "create_prorations",
          products: [
              {
            product: 'prod_PWY2FAlrpCoqaj',
            prices: ['price_1OhUwoFkeWfrK4QgWLHG1GUl']
            }
          ]
        }
      }
    };

    const { bigcommerce_id, bigcommerce_email, stripe_id } = this.body;

    const BigCommerceClient = new BigCommerce({
      accessToken: this.store.accessToken,
      storeHash: this.store.hash,
      clientId: BC_APP_CLIENT_ID,
      secret: BC_APP_SECRET,
      callback: BC_APP_CALLBACK_URL,
      apiVersion: "v3"
    });
    const bigApi = new BigApi(BigCommerceClient);

    // Validate the request by making sure the passed Stripe customer id matches what exists on the BigCommerce customer record
    const validCustomerAndEmail =
      await bigApi.customers.validateCustomerIdAndEmail(
        bigcommerce_id,
        bigcommerce_email
      );
    const validSubscriptionCustomer =
      await bigApi.customers.validateCustomerIdAttribute(
        this.store.customerAttributeFieldId,
        bigcommerce_id,
        stripe_id
      );

    if (validCustomerAndEmail && validSubscriptionCustomer) {
      // Set BigCommerce store id
      this.stripeService.setStoreId(this.store.id);

      // Init Stripe with merchant token
      await this.stripeService.initStripe(true);

      // Configure Stripe customer portal before creating session
      const configuration =
        await this.stripeService.stripe.billingPortal.configurations.create(
          config
        );

      // Create Stripe portal session
      this.response =
        await this.stripeService.stripe.billingPortal.sessions.create({
          customer: stripe_id,
          return_url: this.store.url + "/account.php",
          configuration: configuration.id
        });

      res.redirect(302, this.response.url);
    } else {
      // The request parameters could not be validated
      res.status(404).end("Not Found");
    }
  }
}

export default appContainer
  .resolve(StripeCustomerPortalController)
  .addRequestType(RequestType.POST)
  .getRouteHandler();
