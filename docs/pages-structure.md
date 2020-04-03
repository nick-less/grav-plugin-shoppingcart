# Events you can use in addons

#### onShoppingCartPreparePayment

<pre><code>Triggered by Core.
Used by Gateway Addons.
Prepare a payment for an order</code></pre>

#### onShoppingCartPay

<pre><code>Triggered by Gateway Addons.
Used by Core.
Actually pay an payment for an order</code></pre>

#### onShoppingCartSaveOrder

<pre><code>Triggered by Gateway Addons.
Used by Core.
Saves the order, once made sure it's paid</code></pre>

#### onShoppingCartRedirectToOrderPageUrl

<pre><code>Triggered by Gateway Addons.
Used by Core
Redirect to the order successful page</code></pre>

#### onShoppingCartGotBackFromGateway

<pre><code>Triggered by Gateway Addons.
Used by Gateway Addons.
Internal event to process something when I got back from the Gateway. Find example usage in the PayPal addon</code></pre>

#### onShoppingCartReturnOrderPageUrlForAjax

<pre><code>Triggered by Gateway Addons
Used by Core
Allows the Gateway addon to get the order page via Ajax</code></pre>

#### onShoppingCartAfterSaveOrder:

<pre><code>Triggerred by Core
Used by Addons.
Called after an order is saved. Used by the Email addon for example, to send the email confirmation</code></pre>