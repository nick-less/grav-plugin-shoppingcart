# Events you can use in addons

onShoppingCartPreparePayment

Triggered by Core.
Used by Gateway Addons.
Prepare a payment for an order

onShoppingCartPay

Triggered by Gateway Addons.
Used by Core.
Actually pay an payment for an order

onShoppingCartSaveOrder

Triggered by Gateway Addons.
Used by Core.
Saves the order, once made sure it's paid

onShoppingCartRedirectToOrderPageUrl

Triggered by Gateway Addons.
Used by Core
Redirect to the order successful page

onShoppingCartGotBackFromGateway

Triggered by Gateway Addons.
Used by Gateway Addons.
Internal event to process something when I got back from the Gateway. Find example usage in the PayPal addon

onShoppingCartReturnOrderPageUrlForAjax

Triggered by Gateway Addons
Used by Core
Allows the Gateway addon to get the order page via Ajax

onShoppingCartAfterSaveOrder:

Triggerred by Core
Used by Addons.
Called after an order is saved. Used by the Email addon for example, to send the email confirmation