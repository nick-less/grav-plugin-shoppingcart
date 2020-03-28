 Adding the cart to external pages (not managed by the shopping cart)

Simply include the partials/shoppingcart_core_cart_external.html.twig Twig in page twigs you want.

{% include 'partials/shoppingcart_core_cart_external.html.twig' %}

and then enable the "Load Cart JavaScript globally" option in Admin (if you prefer, general.load_js_globally in shoppingcart.yaml.

You can add the above Twig snippet even in base.html.twig, the plugin will make sure the cart is not inserted 2 times in pages that already include it.