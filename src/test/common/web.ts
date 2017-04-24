import { WebServer } from "../../lib/network/host/web-server";

export let webServer = (name: string) => {
  return new WebServer(name, 10, 200)
    .addFile('index.html')
    .addFile('login.html')
    .addFile('accounts.html')
    .addFile('purchase.html')
    .addFile('orders.html')
    .addFile('shipping.html');
}