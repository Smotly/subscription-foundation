import BigBaseApi from "../big-base-api";
import OrderPayload from "@/shared/payloads/order/OrderPayload";

export default class OrdersApi extends BigBaseApi {
  public baseUri = "/orders";
  
  /**
   * Get Order
   * @param order_id  string  Required.
   * @returns 
   */
  public async get_order(order_id:string) {
    return await this.client.get(`${this.baseUri}/${order_id}`);
  }


  /**
   * Get Ordered Products
   * @param order_id  string  Required.
   * @returns 
   */
   public async get_order_products(order_id:string) {
    return await this.client.get(`${this.baseUri}/${order_id}/products`);
  }

    /**
     * Post order
     */
    public async create(payload:OrderPayload
    ):Promise<OrderPayload>  {
      const { data } =  await this.client.post(`${this.baseUri}`, payload);
      return data;
    }

}
