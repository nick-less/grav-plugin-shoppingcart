import storejs from 'store/dist/store.everything.js';


var ShoppingCart = {};

ShoppingCart.items = [];
ShoppingCart.checkout_form_data = {};
ShoppingCart.currentPageIsProduct = false;
ShoppingCart.currentPageIsProducts = false;

/** ******************************************************** */
/*******************************************************************************
 * Load the shopping cart settings /
 ******************************************************************************/
ShoppingCart.loadSettings = function loadSettings() {
    ShoppingCart.settings = PLUGIN_SHOPPINGCART.settings;

    if (!ShoppingCart.settings) {
        ShoppingCart.settings = {};
    }
    if (!ShoppingCart.settings.countries) {
        ShoppingCart.settings.countries = {};
    }
    if (!ShoppingCart.settings.shipping) {
        ShoppingCart.settings.shipping = {};
    }
    if (!ShoppingCart.settings.shipping.methods) {
        ShoppingCart.settings.shipping.methods = [];
    }
    if (!ShoppingCart.settings.payment) {
        ShoppingCart.settings.payment = {};
    }
    if (!ShoppingCart.settings.payment.methods) {
        ShoppingCart.settings.payment.methods = [];
    }

    for (var index in ShoppingCart.settings.shipping.methods) {
        var item = ShoppingCart.settings.shipping.methods[index];
        if (typeof item !== 'undefined') {
            if (!item.allowed_countries) item.allowed_countries = [];
            ShoppingCart.settings.shipping.methods[index] = item;
        }
    }

    for (var index in ShoppingCart.settings.countries) {
        var item = ShoppingCart.settings.countries[index];
        if (typeof item !== 'undefined') {
            if (item.allow === 'false' || item.allow === false) {
                item.isAllowed = false;
            } else {
                item.isAllowed = true;
            }
            ShoppingCart.settings.countries[index] = item;
        }

    }

    for (var index in ShoppingCart.settings.payment.methods) {
        var item = ShoppingCart.settings.payment.methods[index];
        if (typeof item !== 'undefined') {
            ShoppingCart.settings.payment.methods[index] = item;
        }
    }
};

/** ******************************************************** */
/*******************************************************************************
 * Check product quantity value and proceed to checkout /
 ******************************************************************************/
ShoppingCart.proceedToCheckout = function proceedToCheckout() {
    var isInt = function isInt(n) {
        return n % 1 == 0;
    };

    for (var i = 0; i < ShoppingCart.items.length; i++) {
        if (!isInt((ShoppingCart.items[i].quantity))) {
            alert(window.PLUGIN_SHOPPINGCART.translations.VALUE_NOT_ACCEPTABLE);
            return;
        }

        if (typeof ShoppingCart.settings.cart.maximum_total_quantity_value !== undefined && ShoppingCart.settings.cart.maximum_total_quantity_value > 0 && parseInt(ShoppingCart.items[i].quantity) > ShoppingCart.settings.cart.maximum_total_quantity_value) {
            alert(window.PLUGIN_SHOPPINGCART.translations.QUANTITY_EXCEEDS_MAX_ALLOWED_VALUE + ': ' + ShoppingCart.settings.cart.maximum_total_quantity_value);
            return;
        }
    }

    window.location.href = PLUGIN_SHOPPINGCART.settings.baseURL + PLUGIN_SHOPPINGCART.settings.urls.checkout_url;
};

/** ******************************************************** */
/*******************************************************************************
 * Calculate the cart total price /
 ******************************************************************************/
ShoppingCart.cartTotalPrice = function cartTotalPrice(item) {
    var orderPrice = 0;
    var i = 0;

    while (i < ShoppingCart.items.length) {
        orderPrice += ShoppingCart.items[i].product.price * ShoppingCart.items[i].quantity;
        i++;
    }

    orderPrice = parseFloat(orderPrice).toFixed(2);
    return orderPrice;
};

/** ******************************************************** */
/*******************************************************************************
 * Add a product to the cart /
 ******************************************************************************/
ShoppingCart.addProduct = function addProduct(product, quantity) {
    var onBeforeAddProductToCart;
    $(document).trigger(onBeforeAddProductToCart = $.Event('onBeforeAddProductToCart', { product: product }));
    if (onBeforeAddProductToCart.result === false) {
        return;
    }

    var existingProducts = jQuery(ShoppingCart.items).filter(function(index, item) { if (product.title == item.product.title) return true; }).toArray();

    var existingProduct = existingProducts[0];

    if (!existingProduct) {
        ShoppingCart.items.push({product: product, quantity: quantity});
    } else {
        existingProduct.quantity = parseInt(existingProduct.quantity) + parseInt(quantity);
    }

    $(ShoppingCart).trigger('onAfterAddProductToCart', product);

    ShoppingCart._saveCartToLocalstorage();
    ShoppingCart.renderCart();
};

/** ******************************************************** */
/*******************************************************************************
 * Save the shopping cart to the local storage /
 ******************************************************************************/
ShoppingCart._saveCartToLocalstorage = function _saveCartToLocalstorage() {
    storejs.set('grav-shoppingcart-basket-data', ShoppingCart.items);
    storejs.set('grav-shoppingcart-basket-data-updatetime', new Date().getTime());
};

/** ******************************************************** */
/*******************************************************************************
 * Clear the shopping cart /
 ******************************************************************************/
ShoppingCart.clearCart = function clearCart() {
    ShoppingCart.items = [];
    storejs.remove('grav-shoppingcart-basket-data');

    var interval = setInterval(function() {
        if (ShoppingCart.settings != null) {
            clearInterval(interval);
            if (!ShoppingCart.settings.general.storeClientInformation) {
                storejs.remove('grav-shoppingcart-checkout-form-data');
            }
        }
    }, 50);

    ShoppingCart._saveCartToLocalstorage();
};

/** ******************************************************** */
/*******************************************************************************
 * Calculate the shopping cart subtotal for an item /
 ******************************************************************************/
ShoppingCart.cartSubtotalPrice = function cartSubtotalPrice(item) {
    return parseFloat(item.product.price * item.quantity).toFixed(2);
};

/** ******************************************************** */
/*******************************************************************************
 * Calculate the total price of a cart including taxes and shipping /
 ******************************************************************************/
ShoppingCart.calculateTotalPriceIncludingTaxesAndShipping = function calculateTotalPriceIncludingTaxesAndShipping() {
    ShoppingCart.calculateTotalPriceIncludingTaxes();

    var total = parseFloat(ShoppingCart.totalOrderPriceIncludingTaxes).toFixed(2);
    if (!ShoppingCart.shippingPrice) {
        return total;
    }

    total = parseFloat(total) + parseFloat(ShoppingCart.shippingPrice);

    ShoppingCart.totalOrderPriceIncludingTaxesAndShipping = parseFloat(total).toFixed(2);

    return ShoppingCart.totalOrderPriceIncludingTaxesAndShipping;
};

/** ******************************************************** */
/*******************************************************************************
 * Calculate the total price of a cart including taxes /
 ******************************************************************************/
ShoppingCart.calculateTotalPriceIncludingTaxes = function calculateTotalPriceIncludingTaxes() {
    var orderPrice = 0;
    var i = 0;
    var totalPrice;
    var country = null;
    var tax_percentage = 0;
    var tax_included = 0;

    while (i < ShoppingCart.items.length) {
        orderPrice += ShoppingCart.items[i].product.price * ShoppingCart.items[i].quantity;
        i++;
    }

    // calculate country taxes
    var country;
    for (var index in ShoppingCart.settings.countries) {
        if (ShoppingCart.checkout_form_data.country == ShoppingCart.settings.countries[index].name) {
            country = ShoppingCart.settings.countries[index];
        }
    }

    if (!country) {
        for (var index in ShoppingCart.settings.countries) {
            if ('*' == ShoppingCart.settings.countries[index].name) {
                country = ShoppingCart.settings.countries[index];
            }
        }
    }

    if (country) {
        if (country.isAllowed) {
            tax_percentage = parseInt(country.tax_percentage) || 0;
            if (country.name === 'US') {
                if (ShoppingCart.settings.us_states) {
                    var state = jQuery(ShoppingCart.settings.us_states).filter(function(index, item) { if (ShoppingCart.checkout_form_data.state == item.name) return true; }).toArray()[0];
                    if (state) {
                        tax_percentage = state.tax_percentage || 0;
                    }
                }
            }
        }
    }

    if (ShoppingCart.productPriceDoesNotIncludeTaxes()) {
        if (tax_percentage !== 0) {
            totalPrice = orderPrice + orderPrice * (tax_percentage / 100);
        } else {
            totalPrice = orderPrice;
        }

        totalPrice = parseFloat(totalPrice.toFixed(2)).toFixed(2);
        ShoppingCart.taxesApplied = parseFloat(totalPrice - orderPrice).toFixed(2);
        ShoppingCart.totalOrderPriceIncludingTaxes = totalPrice;
    } else {
        totalPrice = orderPrice;
        tax_included = totalPrice * (tax_percentage / 100);
        totalPrice = parseFloat(totalPrice.toFixed(2)).toFixed(2);
        ShoppingCart.taxesApplied = parseFloat(tax_included).toFixed(2);
        ShoppingCart.totalOrderPriceIncludingTaxes = totalPrice;
    }

    return totalPrice;
};

/** ******************************************************** */
/*******************************************************************************
 * Return the current currency symbol /
 ******************************************************************************/
ShoppingCart.currentCurrencySymbol = function currentCurrencySymbol() {
    return jQuery(ShoppingCart.currencies).filter(function(index, item) { if (ShoppingCart.settings.general.currency == item.code) return true; }).toArray()[0].symbol;
};

/** ******************************************************** */
/*******************************************************************************
 * Determine if the cart should be shown in the current page /
 ******************************************************************************/
ShoppingCart.shouldShowCart = function shouldShowCart() {
    if (ShoppingCart.currentPageIsCart || ShoppingCart.currentPageIsCheckout) {
            return true;
    }
    if (ShoppingCart.currentPageIsOrder) {
            return false;
    }

    if (ShoppingCart.items.length > 0) {
        return true;
    } else {
        return false;
    }
};

/** ******************************************************** */
/*******************************************************************************
 * Determine if the current page is a product / products / cart page /
 ******************************************************************************/
ShoppingCart.currentPageIsProductOrProductsOrCartOrExternal = function currentPageIsProductOrProductsOrCartOrExternal() {
    return (ShoppingCart.currentPageIsProduct === true ||
                    ShoppingCart.currentPageIsProducts === true ||
                    ShoppingCart.currentPageIsExternal === true ||
                    ShoppingCart.currentPageIsCart === true);
};

/** ******************************************************** */
/*******************************************************************************
 * Calculate if the cart content amount is greater than the minimum allowed /
 ******************************************************************************/
ShoppingCart.orderAmountIsGreaterThenMinimum = function orderAmountIsGreaterThenMinimum() {
    if (!ShoppingCart.settings.cart.minimumSumToPlaceOrder) {
        return true;
    }

    var cart = ShoppingCart.items;
    var orderPrice = 0;
    var i = 0;

    while (i < cart.length) {
        orderPrice += cart[i].product.price * cart[i].quantity;
        i++;
    }

    return (parseInt(orderPrice) >= parseInt(ShoppingCart.settings.cart.minimumSumToPlaceOrder));
};

/** ******************************************************** */
/*******************************************************************************
 * Calculate the shipping price /
 ******************************************************************************/
ShoppingCart.generateShippingPrice = function generateShippingPrice() {
    var countMethods = 0;
    for (var index in ShoppingCart.settings.shipping.methods) {
        countMethods++;
    }

    if (!ShoppingCart.shippingPrice) {
        ShoppingCart.shippingPrice = 0.00;
    }

    if (countMethods === 0) {
        ShoppingCart.renderCart();
    } else if (countMethods === 1) {
        var method;
        for (var index in ShoppingCart.settings.shipping.methods) {
            method = ShoppingCart.settings.shipping.methods[index];
        }

        ShoppingCart.shippingPrice = parseFloat(method.price).toFixed(2);
        ShoppingCart.renderCart();
    } else {
        var interval = setInterval(function() {
            var shippingMethodName = jQuery('.js__shipping__method').val();
            if (shippingMethodName) {
                clearInterval(interval);

                var method;
                for (var index in ShoppingCart.settings.shipping.methods) {
                    if (shippingMethodName == ShoppingCart.settings.shipping.methods[index].name) {
                        method = ShoppingCart.settings.shipping.methods[index];
                    }
                }

                var price = method.price;
                if (isNaN(price)) {
                    price = 0;
                }

                price = parseFloat(price).toFixed(2);

                ShoppingCart.shippingPrice = price;
                ShoppingCart.renderCart();
            }

        }, 50);
    }
};

/** ******************************************************** */
/*******************************************************************************
 * Check if the setting to include taxes in product prices is disabled /
 ******************************************************************************/
ShoppingCart.productPriceDoesNotIncludeTaxes = function productPriceDoesNotIncludeTaxes() {
    return ShoppingCart.settings.general.product_taxes !== 'included';
};

/** ******************************************************** */
/*******************************************************************************
 * Get the "show currency before price" setting /* #todo #stub /
 ******************************************************************************/
ShoppingCart.showCurrencyBeforePrice = function showCurrencyBeforePrice() {
    return ShoppingCart.settings.ui.currency_symbol_position === 'before';
};

/** ******************************************************** */
/*******************************************************************************
 * Return true if the passed country can buy from the shop /* #todo #stub /
 ******************************************************************************/
ShoppingCart.countryCanBuy = function countryCanBuy(countryCode) {
    return true;
};

/** ******************************************************** */
/*******************************************************************************
 * Compare the values of 2 objects /
 ******************************************************************************/
ShoppingCart.isEquivalent = function isEquivalent(a, b) {
    // Create arrays of property names
    var aProps = Object.getOwnPropertyNames(a);
    var bProps = Object.getOwnPropertyNames(b);

    // If number of properties is different,
    // objects are not equivalent
    if (aProps.length != bProps.length) {
            return false;
    }

    for (var i = 0; i < aProps.length; i++) {
            var propName = aProps[i];

            // If values of same property are not equal,
            // objects are not equivalent
            if (a[propName] !== b[propName]) {
                    return false;
            }
    }

    // If we made it this far, objects
    // are considered equivalent
    return true;
};

/** ******************************************************** */
/*******************************************************************************
 * Render the cart /
 ******************************************************************************/
ShoppingCart.renderCart = function renderCart() {
    var $cart = jQuery('.js__shoppingcart-cart');
    var $cartTitle = jQuery('.js__shoppingcart-cart__title');

    var thead = $cart.find('thead');
    var tbody = $cart.find('tbody');

    thead.html('');
    tbody.html('');

    if (ShoppingCart.items.length === 0) {
        $cart.removeClass('has-products');
        $cartTitle.hide();
        return;
    } else {
        $cart.addClass('has-products');
        if (ShoppingCart.currentPageIsProduct) $cartTitle.text(window.PLUGIN_SHOPPINGCART.translations.SHOPPING_CART);
        if (ShoppingCart.currentPageIsProducts) $cartTitle.text(window.PLUGIN_SHOPPINGCART.translations.SHOPPING_CART);
        if (ShoppingCart.currentPageIsCheckout) $cartTitle.text(window.PLUGIN_SHOPPINGCART.translations.YOU_ARE_PURCHASING_THESE_ITEMS);
        if (ShoppingCart.currentPageIsOrder) $cartTitle.text(window.PLUGIN_SHOPPINGCART.translations.ITEMS_PURCHASED);
        if (ShoppingCart.currentPageIsOrderCancelled) $cartTitle.text(window.PLUGIN_SHOPPINGCART.translations.SHOPPING_CART);
        if (ShoppingCart.currentPageIsCart) $cartTitle.text(window.PLUGIN_SHOPPINGCART.translations.SHOPPING_CART);
        $cartTitle.show();
    }

    var row = '<tr>';
    row += '<th class="cart-product">' + window.PLUGIN_SHOPPINGCART.translations.ITEM + '</th>';
    if (!ShoppingCart.isMobile()) {
        row += '<th class="cart-product-price">' + window.PLUGIN_SHOPPINGCART.translations.PRICE + '</th>';
    }

    if (!ShoppingCart.isMobile()) {
        row += '<th class="cart-product-quantity">' + window.PLUGIN_SHOPPINGCART.translations.QUANTITY + '</th>';
    } else {
        row += '<th class="cart-product-quantity">' + window.PLUGIN_SHOPPINGCART.translations.QUANTITY_SHORT + '</th>';
    }

    row += '<th class="cart-product-total">' + window.PLUGIN_SHOPPINGCART.translations.TOTAL + '</th>';

    if (ShoppingCart.currentPageIsProductOrProductsOrCartOrExternal()) {
        row += '<th class="cart-product-remove-button">';
        row += window.PLUGIN_SHOPPINGCART.translations.REMOVE;
        row += '</th>';
    }

    row += '</tr>';
    thead.html(row);
    var rows_html = '';
    console.log(ShoppingCart.items);
    for (var i = 0; i < ShoppingCart.items.length; i++) {
        var item = ShoppingCart.items[i];
        console.log(item);
        var row = '<tr><td class="cart-product">';

        if (ShoppingCart.settings.cart.add_product_thumbnail) {
            if (item.product.image) {
                row += '<img src="' + item.product.image + '" class="cart-product-image"> ';
            }
        }

        if (item.product.url) {
            row += '<a href="' + item.product.url + '" class="cart-product-name">' + item.product.title + '</a>';
        } else {
            row += item.product.title;
        }

        row += '</td>';

        if (!ShoppingCart.isMobile()) {
            /** ******************************************************** */
            /*******************************************************************
			 * Price /
			 ******************************************************************/
            row += '<td class="cart-product-price">';
            row += ShoppingCart.renderPriceWithCurrency(item.product.price);
            row += '</td>';
        }

        /** ******************************************************** */
        /***********************************************************************
		 * Quantity /
		 **********************************************************************/
        row += '<td class="cart-product-quantity">';
        if (ShoppingCart.settings.cart.allow_editing_quantity_from_cart && !ShoppingCart.isMobile()) {
            if (ShoppingCart.currentPageIsProductOrProductsOrCartOrExternal()) {
                row += '<input value="' + item.quantity + '" class="input-mini js__shoppingcart__quantity-box-cart" data-id="' + i + '" />';
            } else {
                row += item.quantity;
            }
        } else {
            row += item.quantity;
        }
        row += '</td>';

        /** ******************************************************** */
        /***********************************************************************
		 * Total /
		 **********************************************************************/
        row += '<td class="cart-product-total">';
        row += ShoppingCart.renderPriceWithCurrency(ShoppingCart.cartSubtotalPrice(item));
        row += '</td>';

        if (ShoppingCart.currentPageIsProductOrProductsOrCartOrExternal()) {
            row += '<td class="cart-product-remove-button">';
            row += '<a class="btn btn-small js__shoppingcart__remove-from-cart" data-id="' + i + '">' + window.PLUGIN_SHOPPINGCART.translations.REMOVE + '</a>';
            row += '</td>';
        }

        row += '</tr>';

        rows_html += row;
    }

    /** ******************************************************** */
    /***************************************************************************
	 * Additional lines after products /
	 **************************************************************************/

    row = '<tr>';

    if (ShoppingCart.currentPageIsProduct) {
        row += '<td class="goback"><a href="#" class="btn btn-success js__shoppingcart__continue-shopping">' + window.PLUGIN_SHOPPINGCART.translations.CONTINUE_SHOPPING + '</a></td>';
    } else {
        row += '<td class="empty"><strong>' + window.PLUGIN_SHOPPINGCART.translations.SUBTOTAL + '</strong></td>';
    }

    row += '<td class="empty"></td>';

    if (!ShoppingCart.isMobile()) {
        row += '<td class="empty"></td>';
    }

    row += '<td class="cart-product-total">';
    row += ShoppingCart.renderPriceWithCurrency(ShoppingCart.cartTotalPrice());
    row += '</td>';

    /** ******************************************************** */
    /***************************************************************************
	 * Checkout / or not yet reached minimum order level /
	 **************************************************************************/
    var atLeastAProductIsAdded = false;

    ShoppingCart.items.forEach(function(item) {
        if (item.quantity != "0" && item.quantity != "") {
            atLeastAProductIsAdded = true;
        }
    });

    if (atLeastAProductIsAdded) {
        if (ShoppingCart.orderAmountIsGreaterThenMinimum()) {
            if (ShoppingCart.currentPageIsProductOrProductsOrCartOrExternal() || ShoppingCart.currentPageIsOrderCancelled) {
                row += '<td><button class="btn btn-success js__shoppingcart__proceed-to-checkout">' + window.PLUGIN_SHOPPINGCART.translations.CHECKOUT + '</button></td>';
            }
        } else {
            row += '<td>';
            row += window.PLUGIN_SHOPPINGCART.translations.MINIMUM_TO_PLACE_AN_ORDER;
            row += ShoppingCart.renderPriceWithCurrency(ShoppingCart.settings.cart.minimumSumToPlaceOrder);
            row += '</td>';
        }
    }

    if (ShoppingCart.currentPageIsCheckout) {

        /** ******************************************************** */
        /***********************************************************************
		 * Product price do not include taxes, show them here /
		 **********************************************************************/
        if (ShoppingCart.productPriceDoesNotIncludeTaxes()) {

            row += '<tr class="cart-taxes-calculated">';

            if (ShoppingCart.checkout_form_data.country) {
                // row += '<td><strong>' +
				// window.PLUGIN_SHOPPINGCART.translations.INCLUDING_TAXES +
				// '</strong></td>';

                row += '<td><strong>';
                if (ShoppingCart.settings.cart.add_shipping_and_taxes_cost_to_total) {
                    row += window.PLUGIN_SHOPPINGCART.translations.INCLUDING_TAXES;
                } else {
                    row += window.PLUGIN_SHOPPINGCART.translations.TAXES;
                }
                row += '</strong></td>';

                row += '<td></td>';
                row += '<td></td>';
                row += '<td>';
                var amount = ShoppingCart.taxesApplied;
                if (ShoppingCart.settings.cart.add_shipping_and_taxes_cost_to_total) {
                    amount = ShoppingCart.calculateTotalPriceIncludingTaxes();
                }
                row += ShoppingCart.renderPriceWithCurrency(amount)
                row += '</td>';

            } else {
                row += '<td>' + window.PLUGIN_SHOPPINGCART.translations.PRICE_DO_NOT_INCLUDE_TAXES + '</td>';
                row += '<td></td>';
                row += '<td></td>';
                row += '<td></td>';
            }

            row += '</tr>';
        } else {
    var amount = ShoppingCart.taxesApplied;
    row += '<tr class="cart-taxes-calculated">';
    row += '<td><strong>';
    row += window.PLUGIN_SHOPPINGCART.translations.TAXES;
    row += '</strong></td>';
    row += '<td></td>';
            row += '<td></td>';
            row += '<td>';
    row += ShoppingCart.renderPriceWithCurrency(amount);
            row += '</td>';
    row += '</tr>';
    }

        /** ******************************************************** */
        /***********************************************************************
		 * Shipping price /
		 **********************************************************************/
        if (ShoppingCart.shippingPrice) {
            row += '<tr class="cart-shipping-calculated">';
            row += '<td><strong>';

            if (ShoppingCart.settings.cart.add_shipping_and_taxes_cost_to_total) {
                row += window.PLUGIN_SHOPPINGCART.translations.INCLUDING_SHIPPING;
            } else {
                row += window.PLUGIN_SHOPPINGCART.translations.SHIPPING;
            }

            row += '</strong></td>';
            row += '<td></td>';
            row += '<td></td>';
            row += '<td>';
            var amount = ShoppingCart.shippingPrice;
            if (ShoppingCart.settings.cart.add_shipping_and_taxes_cost_to_total) {
                amount = ShoppingCart.calculateTotalPriceIncludingTaxesAndShipping();
            }
            row += ShoppingCart.renderPriceWithCurrency(amount);
            row += '</td>';
            row += '</tr>';
        }

        /** ******************************************************** */
        /***********************************************************************
		 * Calculate total including taxes and shipping /
		 **********************************************************************/
        var totalPriceIncludingTaxesAndShipping = ShoppingCart.calculateTotalPriceIncludingTaxesAndShipping();

        if (totalPriceIncludingTaxesAndShipping) {
            row += '<tr class="total-line">';
            row += '<td><strong>' + window.PLUGIN_SHOPPINGCART.translations.TOTAL + '</strong></td>';
            row += '<td></td>';
            row += '<td></td>';
            row += '<td>';
            row += ShoppingCart.renderPriceWithCurrency(totalPriceIncludingTaxesAndShipping);
            row += '</td>';
            row += '</tr>';
        }
    }

    rows_html += row;

    tbody.html(tbody.html() + rows_html);
}

  ShoppingCart.processCheckoutFormSubmission = function processCheckoutFormSubmission() {
      var that = this;
      var data = {};

      if (ShoppingCart.settings.payment.methods.length === 0) {
          alert('Ouch! I didn\'t find a checkout plugin installed. Please install one, or the shop cannot send the order.');
      }

      /** ***************************************************** */
      /***********************************************************************
		 * Fill the data object with values from the checkout form /
		 **********************************************************************/
      var fillDataObjectWithValuesFromCheckoutForm = function fillDataObjectWithValuesFromCheckoutForm() {
          $.each(ShoppingCart.checkout_form_fields, function(index, checkout_form_field) {
              if (typeof checkout_form_field.name !== 'undefined' && (!('input@' in checkout_form_field) || checkout_form_field['input@'] == true)) {
                  data[checkout_form_field.name] = jQuery('form[name=checkout] [name="data[' + checkout_form_field.name + ']"]').val() || jQuery('form[name=checkout] [name="' + checkout_form_field.name + '"]').val();;
              }
          });
      };

      fillDataObjectWithValuesFromCheckoutForm();

      /** ***************************************************** */
      /***********************************************************************
		 * Do some processing / validation on the checkout form values /* Return
		 * false if I cannot go on, so the outer function can be stopped /
		 **********************************************************************/
      var customProcessingOfCheckoutForm = function customProcessingOfCheckoutForm() {
          if (data.country === 'US') {
              if (data.hasOwnProperty("province")) {
                  delete data.province;
              }
          } else {
              if (data.hasOwnProperty("state")) {
                  delete data.state;
              }
              if (!data.province && ShoppingCart.provinceIsRequired()) {
                  alert(window.PLUGIN_SHOPPINGCART.translations.PLEASE_FILL_ALL_THE_REQUIRED_FIELDS);
                  return false;
              }
          }

          return true;
      };

      var return_value = customProcessingOfCheckoutForm();
      if (return_value === false) {
          return;
      }

      /** ***************************************************** */
      /***********************************************************************
		 * Fill `ShoppingCart.checkout_form_data` with the checkout form data /*
		 * Fill storejs.get('grav-shoppingcart-checkout-form-data') with the
		 * checkout form data /* Fill `ShoppingCart.gateway` with the gateway
		 * name /
		 **********************************************************************/
      ShoppingCart.checkout_form_data = data;
      storejs.set('grav-shoppingcart-checkout-form-data', data); // Store
																	// data info
																	// in cookie
      ShoppingCart.gateway = jQuery('.js__payment__method').val();

      if (!ShoppingCart.gateway) {
          ShoppingCart.gateway = Object.keys($(Array(ShoppingCart.settings.payment.methods))[0])[0];
      }

      /** ***************************************************** */
      /***********************************************************************
		 * - Generates the order random token /* - Processes the shipping method /* -
		 * Calculates the total order price including shipment /* - Calls the
		 * jQuery event `proceedToPayment` /
		 **********************************************************************/
      var _goOnWithCheckout = function _goOnWithCheckout() {

          /** ******************************************************** */
          /*******************************************************************
			 * Create a random token and store it in /*
			 * storejs.get('grav-shoppingcart-order-token') /
			 ******************************************************************/
          var generateRandomToken = function generateRandomToken () {
              var randomToken = function randomToken(length) {
                  var upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                  var lower = 'abcdefghijklmnopqrstuvwxyz';
                  var number = '0123456789';
                  var token = '', i;
                  var seed = upper + lower + number;
                  length = length || 13;

                  for (i = 0; i < length; i++) {
                      token += seed[Math.floor(Math.random() * (seed.length - 1))];
                  }

                  return token;
              };

              storejs.set('grav-shoppingcart-order-token', { token: randomToken(10) });
          };

          /** ******************************************************** */
          /*******************************************************************
			 * Check the shipping method and add it to /*
			 * storejs.get('grav-shoppingcart-shipping-method') /
			 ******************************************************************/
          var processShippingMethod = function processShippingMethod() {
              var shippingMethod = {
                  method: '',
                  cost: 0
              };

              if (ShoppingCart.settings.shipping.methods.length === 1) {
                  shippingMethod = {
                      method: ShoppingCart.settings.shipping.methods[0].name,
                      cost: ShoppingCart.settings.shipping.methods[0].price
                  };
              } else {
                  shippingMethod = {
                      method: jQuery('.js__shipping__method').val(),
                      cost: ShoppingCart.shippingPrice
                  };
              }

              // Store in localstorage
              storejs.set('grav-shoppingcart-shipping-method', shippingMethod);
          };

          /** ******************************************************** */
          /*******************************************************************
			 * Calculate the total order price and store it in
			 * ShoppingCart.totalOrderPrice /
			 ******************************************************************/
          var calculateTotalOrderPrice = function calculateTotalOrderPrice () {
              // Calculate the order price
              var orderPrice = ShoppingCart.totalOrderPriceIncludingTaxes;
              if (!orderPrice) {
                  orderPrice = 0;
                  var i = 0;
                  var cart = ShoppingCart.items;

                  while (i < cart.length) {
                      orderPrice += cart[i].product.price * cart[i].quantity;
                      i++;
                  }
              }

              /** ******************************************************** */
              /***************************************************************
				 * Add shipping costs to the order price /
				 **************************************************************/
              ShoppingCart.generateShippingPrice();
              orderPrice = parseFloat(parseFloat(orderPrice) + parseFloat(ShoppingCart.shippingPrice)).toFixed(2);
              ShoppingCart.totalOrderPrice = orderPrice;
          };

          generateRandomToken ();
          processShippingMethod();
          calculateTotalOrderPrice();

          jQuery(that).attr('disabled', 'disabled');
          jQuery(document).trigger('proceedToPayment', ShoppingCart);
      };

      _goOnWithCheckout();
  };

  /** ******************************************************** */
  /***************************************************************************
	 * Get the allowed shipping options based on the settings /
	 **************************************************************************/
  ShoppingCart.populateShippingOptions = function populateShippingOptions() {
      var shippingMethods = [];
      var currency_symbol = ShoppingCart.currentCurrencySymbol();

      for (var index in ShoppingCart.settings.shipping.methods) {
          shippingMethods[index] = ShoppingCart.settings.shipping.methods[index];
      }

      var methodIsAllowedInCountry = function methodIsAllowedInCountry(method, country) {
          for (var index in method.allowed_countries) {
              if (method.allowed_countries[index] == country) return true;
              if (method.allowed_countries[index] == '*') return true;
          }
          return false;
      };

      var ifIsGenericThereIsNoCountrySpecificMethod = function ifIsGenericThereIsNoCountrySpecificMethod(method, country) {
          if (method.allowed_countries[0] !== '*') return true; // is not
																// generic,
																// ignore

          for (var i = 0; i < shippingMethods.length; i++) {
              var aMethod = shippingMethods[i];

              for (var index in aMethod.allowed_countries) {
                  if (aMethod.allowed_countries[index] == country) return false;
              }
          }

          return true;
      };

      if (jQuery('.js__billing__country').val() === 'US') {
          jQuery('.js__billing__state__control').show();
          jQuery('.js__billing__province__control').hide();
      } else {
          jQuery('.js__billing__state__control').hide();
          jQuery('.js__billing__province__control').show();
      }

      if (shippingMethods.length === 0) {
          var select = document.getElementById('js__shipping__method');
          if (select) {
              (select.options[0] = new Option('-', '-')).setAttribute('selected', 'selected');
              jQuery('.js__checkout-choose-shipping-block').hide();
              jQuery('.js__checkout-choose-shipping-block-title').hide();
          }
      } else if (shippingMethods.length === 1) {
          var shipping_method_name = shippingMethods[0].name;

          var select = document.getElementById('js__shipping__method');
          if (select) {
	            (select.options[0] = new Option(shipping_method_name, shipping_method_name)).setAttribute('selected', 'selected');
	            jQuery('.js__checkout-choose-shipping-block select').hide();
	            jQuery('.js__checkout-choose-shipping-block .form-label').hide();
          }
          var priceBlock = shippingMethods[0].price + ' ' + currency_symbol;
          if (ShoppingCart.settings.ui.currency_symbol_position === 'before') {
              priceBlock = currency_symbol + ' ' + shippingMethods[0].price;
          }

          jQuery('.js__single-shipping-method-information').remove();
          jQuery('.js__checkout-choose-shipping-block .form-select-wrapper').append('<div class="js__single-shipping-method-information">' + shippingMethods[0].name + ' - ' + priceBlock + '</div>');
          jQuery('.js__checkout-choose-shipping-block').show();
      } else {
          var select = document.getElementById('js__shipping__method');

          if (select) {
              // Calculate shipping methods for the shipping country
              select.options.length = 0;

              ShoppingCart.generateShippingPrice();

              for (var index in shippingMethods) {
                  if (shippingMethods.hasOwnProperty(index)) {
                      var method = shippingMethods[index];
                      if (methodIsAllowedInCountry(method, ShoppingCart.checkout_form_data.country) &&
                          ifIsGenericThereIsNoCountrySpecificMethod(method, ShoppingCart.checkout_form_data.country)) {

                          var priceBlock = method.price + ' ' + currency_symbol;
                          if (ShoppingCart.settings.ui.currency_symbol_position === 'before') {
                              priceBlock = currency_symbol + ' ' + method.price;
                          }

                          select.options[select.options.length] = new Option(method.name + ' - ' + priceBlock, method.name);
                      }
                  }
              }
          }

          jQuery('.js__checkout-choose-shipping-block').show();
      }
  };

  /** ******************************************************** */
  /***************************************************************************
	 * Get the payment options based on the settings /
	 **************************************************************************/
  ShoppingCart.populatePaymentOptions = function populatePaymentOptions() {
      jQuery('.js__checkout-choose-payment-block').hide();
      jQuery('.js__checkout-choose-payment-block-title').hide();

      var paymentMethods = [];
      for (var index in ShoppingCart.settings.payment.methods) {
          paymentMethods[index] = ShoppingCart.settings.payment.methods[index];
      }

      var paymentMethodsCount = 0;
      for (var index in paymentMethods) {
          if (paymentMethods.hasOwnProperty(index)) {
              paymentMethodsCount++;
          }
      }

      var select = document.getElementById('js__payment__method');

      if (select) {
          select.options.length = 0;

          for (var index in paymentMethods) {
              if (paymentMethods.hasOwnProperty(index)) {
                  method = paymentMethods[index];

                  select.options[select.options.length] = new Option(method.name, index);
              }
          }
      }

      if (paymentMethodsCount > 1) {
          jQuery('.js__checkout-choose-payment-block').show();
          jQuery('.js__checkout-choose-payment-block-title').show();
      }
  };

  /** ******************************************************** */
  /***************************************************************************
	 * Called when the state checkout option changes /
	 **************************************************************************/
  ShoppingCart.stateChanged = function stateChanged() {
      // Calculate immediately the shipping address, so it's used for taxes
      if (!ShoppingCart.checkout_form_data) {
          ShoppingCart.checkout_form_data = {
              state: jQuery('.js__billing__state').val(),
          };
      } else {
          ShoppingCart.checkout_form_data.state = jQuery('.js__billing__state').val();
      }
      ShoppingCart.calculateTotalPriceIncludingTaxes();
      ShoppingCart.calculateTotalPriceIncludingTaxesAndShipping();
      ShoppingCart.renderCart();
  };

  /** ******************************************************** */
  /***************************************************************************
	 * Called when first populating the country field with the default /*
	 * country, and when the user changes the country. /* Used to calculate the
	 * default shipping price too. /
	 **************************************************************************/
  ShoppingCart.countryChanged = function countryChanged() {
      // Calculate immediately the shipping price, so it's shown in the cart
      if (!ShoppingCart.checkout_form_data) {
          ShoppingCart.checkout_form_data = {
              country: jQuery('.js__billing__country').val(),
          };
      } else {
          ShoppingCart.checkout_form_data.country = jQuery('.js__billing__country').val();
      }

      ShoppingCart.populateShippingOptions();

      ShoppingCart.generateShippingPrice();

      if (jQuery('.js__billing__country').val() === 'US') {
          jQuery('.js__billing__state__control').show();
          jQuery('.js__billing__province__control').hide();
      } else {
          jQuery('.js__billing__state__control').hide();
          jQuery('.js__billing__province__control').show();
      }
      ShoppingCart.calculateTotalPriceIncludingTaxes();
      ShoppingCart.calculateTotalPriceIncludingTaxesAndShipping();
      ShoppingCart.renderCart();
  };

  /** ******************************************************** */
  /***************************************************************************
	 * Setup the checkout page /
	 **************************************************************************/
  ShoppingCart.setupCheckout = function setupCheckout() {
      if (!storejs.get('grav-shoppingcart-basket-data') || storejs.get('grav-shoppingcart-basket-data').length == 0) {
          jQuery('.js__checkout__block').html(window.PLUGIN_SHOPPINGCART.translations.NO_ITEMS_IN_CART);
          jQuery('.js__checkout__block').show();
          return;
      }
      // I have items in the cart, I can go on

      jQuery('.js__checkout__block').show();

      var countries = ShoppingCart.getCountries();
      var select = document.getElementById('js__billing__country');
      if (select) {
          for (var index in countries) {
              if (ShoppingCart.countryCanBuy(countries[index].code)) {
                  select.options[select.options.length] = new Option(countries[index].name, countries[index].code);
              }
          }
      }

      var states = ShoppingCart.getUSAStates();
      select = document.getElementById('js__billing__state');
      if (select) {
          for (var i = 0; i < states.length; i++) {
              select.options[select.options.length] = new Option(states[i].name, states[i].code);
          }
      }

      jQuery("#js__billing__country").val(ShoppingCart.settings.general.default_country || 'US');
      ShoppingCart.countryChanged();

      ShoppingCart.populatePaymentOptions();

      if ((ShoppingCart.settings.general.default_country || 'US') === 'US') {
          jQuery('.js__billing__state__control').show();
          ShoppingCart.stateChanged();
      } else {
          jQuery('.js__billing__province__control').show();
      }
  };

  
    /** ******************************************************** */
    /***************************************************************************
	 * Checks if the province field is required /
	 **************************************************************************/
    ShoppingCart.provinceIsRequired = function provinceIsRequired() {
        if (!ShoppingCart.checkout_form_fields) {
            return false;
        }
        
        var field = ShoppingCart.checkout_form_fields.filter(function(item) { if (item.name === 'province') return true; }).shift();

        if (!field) {
            return false;
        }

        if (!field.validate || !field.validate.required) {
            return false;
        }

        if (field.validate.required === 'true') {
            return true;
        }
    };

    /** ******************************************************** */
    /***************************************************************************
	 * Render a correctly parsed price with the currency at the right position /
	 **************************************************************************/
    ShoppingCart.renderPriceWithCurrency = function renderPriceWithCurrency(price) {
        var currency_symbol = ShoppingCart.currentCurrencySymbol();

        price = parseFloat(price).toFixed(2);

        if (ShoppingCart.settings.ui.remove_cents_if_zero) {
            if (price  % 1 == 0) {
                price  = parseInt(price , 10);
            }
        }

        if (ShoppingCart.showCurrencyBeforePrice()) {
            return '<span class="currency">' + currency_symbol + '</span> ' + price;
        } else {
            return price + ' <span class="currency">' + currency_symbol + '</span>';
        }
    };

    ShoppingCart.isMobile = function isMobile() {
        var isAndroid = function() {
            return navigator.userAgent.match(/Android/i);
        };

        var isBlackBerry = function() {
            return navigator.userAgent.match(/BlackBerry/i);
        };

        var isiOS = function() {
            return navigator.userAgent.match(/iPhone|iPad|iPod/i);
        };

        var isOpera = function() {
            return navigator.userAgent.match(/Opera Mini/i);
        };

        var isWindows = function() {
            return navigator.userAgent.match(/IEMobile/i);
        };

        var isAny = function() {
            if (isAndroid() || isBlackBerry() || isiOS() || isOpera() || isWindows()) {
                return true;
            }
            return false;
        };

        return isAny();
    };

    /** ******************************************************** */
    /***************************************************************************
	 * Gets a country code /
	 **************************************************************************/
    ShoppingCart.getCodeOfCountry = function getCodeOfCountry(countryName) {
        var countries = ShoppingCart.getCountries();
        for (var i = 0; i < countries.length; i++) {
            if (countries[i].name === countryName) {
                return countries[i].code;
            }
        }
    };

    /** ******************************************************** */
    /***************************************************************************
	 * Gets a country continent /
	 **************************************************************************/
    ShoppingCart.getContinentOfCountry = function getContinentOfCountry(countryName) {
        var countries = ShoppingCart.getCountries();
        for (var i = 0; i < countries.length; i++) {
            if (countries[i].name === countryName) {
                return countries[i].continent;
            }
        }
    };

    /** ******************************************************** */
    /***************************************************************************
	 * Get the US States list /
	 **************************************************************************/
    ShoppingCart.getUSAStates = function getUSAStates() {
        return [
            {code: "AK", name: "Alaska"},
            {code: "AL", name: "Alabama"},
            {code: "AR", name: "Arkansas"},
            {code: "AZ", name: "Arizona"},
            {code: "CA", name: "California"},
            {code: "CO", name: "Colorado"},
            {code: "CT", name: "Connecticut"},
            {code: "DE", name: "Delaware"},
            {code: "DC", name: "District of Columbia"},
            {code: "FL", name: "Florida"},
            {code: "GA", name: "Georgia"},
            {code: "HI", name: "Hawaii"},
            {code: "IA", name: "Iowa"},
            {code: "ID", name: "Idaho"},
            {code: "IL", name: "Illinois"},
            {code: "IN", name: "Indiana"},
            {code: "KS", name: "Kansas"},
            {code: "KY", name: "Kentucky"},
            {code: "LA", name: "Louisiana"},
            {code: "MA", name: "Massachusetts"},
            {code: "MD", name: "Maryland"},
            {code: "ME", name: "Maine"},
            {code: "MI", name: "Michigan"},
            {code: "MN", name: "Minnesota"},
            {code: "MS", name: "Mississippi"},
            {code: "MO", name: "Missouri"},
            {code: "MT", name: "Montana"},
            {code: "NC", name: "North Carolina"},
            {code: "ND", name: "North Dakota"},
            {code: "NE", name: "Nebraska"},
            {code: "NH", name: "New Hampshire"},
            {code: "NJ", name: "New Jersey"},
            {code: "NM", name: "New Mexico"},
            {code: "NV", name: "Nevada"},
            {code: "NY", name: "New York"},
            {code: "OH", name: "Ohio"},
            {code: "OK", name: "Oklahoma"},
            {code: "OR", name: "Oregon"},
            {code: "PA", name: "Pennsylvania"},
            {code: "RI", name: "Rhode Island"},
            {code: "SC", name: "South Carolina"},
            {code: "SD", name: "South Dakota"},
            {code: "TN", name: "Tennessee"},
            {code: "TX", name: "Texas"},
            {code: "UT", name: "Utah"},
            {code: "VA", name: "Virginia"},
            {code: "VT", name: "Vermont"},
            {code: "WA", name: "Washington"},
            {code: "WI", name: "Wisconsin"},
            {code: "WV", name: "West Virginia"},
            {code: "WY", name: "Wyoming"}];
    };

    /** ******************************************************** */
    /***************************************************************************
	 * Get the World Countries list /
	 **************************************************************************/
    ShoppingCart.getCountries = function getCountries() {
        return [
            {"code":"AF","name":"Afghanistan","continent":"Asia"},
            {"code":"AL","name":"Albania","continent":"Europe"},
            {"code":"DZ","name":"Algeria","continent":"Africa"},
            {"code":"AS","name":"American Samoa","continent":"Oceania"},
            {"code":"AD","name":"Andorra","continent":"Europe"},
            {"code":"AO","name":"Angola","continent":"Africa"},
            {"code":"AI","name":"Anguilla","continent":"North America"},
            {"code":"AG","name":"Antigua and Barbuda","continent":"North America"},
            {"code":"AR","name":"Argentina","continent":"South America"},
            {"code":"AM","name":"Armenia","continent":"Europe"},
            {"code":"AW","name":"Aruba","continent":"North America"},
            {"code":"AU","name":"Australia","continent":"Oceania"},
            {"code":"AT","name":"Austria","continent":"Europe"},
            {"code":"AZ","name":"Azerbaijan","continent":"Europe"},
            {"code":"BS","name":"Bahamas","continent":"North America"},
            {"code":"BH","name":"Bahrain","continent":"Asia"},
            {"code":"BD","name":"Bangladesh","continent":"Asia"},
            {"code":"BB","name":"Barbados","continent":"North America"},
            {"code":"BY","name":"Belarus","continent":"Europe"},
            {"code":"BE","name":"Belgium","continent":"Europe"},
            {"code":"BZ","name":"Belize","continent":"North America"},
            {"code":"BJ","name":"Benin","continent":"Africa"},
            {"code":"BM","name":"Bermuda","continent":"North America"},
            {"code":"BT","name":"Bhutan","continent":"Asia"},
            {"code":"BO","name":"Bolivia","continent":"South America"},
            {"code":"BA","name":"Bosnia and Herzegovina","continent":"Europe"},
            {"code":"BW","name":"Botswana","continent":"Africa"},
            {"code":"BR","name":"Brazil","continent":"South America"},
            {"code":"IO","name":"British Indian Ocean Territory","continent":"Asia"},
            {"code":"BN","name":"Brunei Darussalam","continent":"Asia"},
            {"code":"BG","name":"Bulgaria","continent":"Europe"},
            {"code":"BF","name":"Burkina Faso","continent":"Africa"},
            {"code":"BI","name":"Burundi","continent":"Africa"},
            {"code":"KH","name":"Cambodia","continent":"Asia"},
            {"code":"CM","name":"Cameroon","continent":"Africa"},
            {"code":"CA","name":"Canada","continent":"North America"},
            {"code":"CV","name":"Cape Verde","continent":"Africa"},
            {"code":"KY","name":"Cayman Islands","continent":"North America"},
            {"code":"CF","name":"Central African Republic","continent":"Africa"},
            {"code":"TD","name":"Chad","continent":"Africa"},
            {"code":"CL","name":"Chile","continent":"South America"},
            {"code":"CN","name":"China","continent":"Asia"},
            {"code":"CX","name":"Christmas Island","continent":"Asia"},
            {"code":"CC","name":"Cocos (Keeling) Islands","continent":"Asia"},
            {"code":"CO","name":"Colombia","continent":"South America"},
            {"code":"KM","name":"Comoros","continent":"Africa"},
            {"code":"CG","name":"Congo","continent":"Africa"},
            {"code":"CD","name":"Congo, the Democratic Republic of the","continent":"Africa"},
            {"code":"CK","name":"Cook Islands","continent":"Oceania"},
            {"code":"CR","name":"Costa Rica","continent":"North America"},
            {"code":"CI","name":"Cote D'Ivoire","continent":"Africa"},
            {"code":"HR","name":"Croatia","continent":"Europe"},
            {"code":"CU","name":"Cuba","continent":"North America"},
            {"code":"CY","name":"Cyprus","continent":"Europe"},
            {"code":"CZ","name":"Czech Republic","continent":"Europe"},
            {"code":"DK","name":"Denmark","continent":"Europe"},
            {"code":"DJ","name":"Djibouti","continent":"Africa"},
            {"code":"DM","name":"Dominica","continent":"North America"},
            {"code":"DO","name":"Dominican Republic","continent":"North America"},
            {"code":"EC","name":"Ecuador","continent":"South America"},
            {"code":"EG","name":"Egypt","continent":"Africa"},
            {"code":"SV","name":"El Salvador","continent":"North America"},
            {"code":"GQ","name":"Equatorial Guinea","continent":"Africa"},
            {"code":"ER","name":"Eritrea","continent":"Africa"},
            {"code":"EE","name":"Estonia","continent":"Europe"},
            {"code":"ET","name":"Ethiopia","continent":"Africa"},
            {"code":"FK","name":"Falkland Islands (Malvinas)","continent":"South America"},
            {"code":"FO","name":"Faroe Islands","continent":"Europe"},
            {"code":"FJ","name":"Fiji","continent":"Oceania"},
            {"code":"FI","name":"Finland","continent":"Europe"},
            {"code":"FR","name":"France","continent":"Europe"},
            {"code":"GF","name":"French Guiana","continent":"South America"},
            {"code":"PF","name":"French Polynesia","continent":"Oceania"},
            {"code":"GA","name":"Gabon","continent":"Africa"},
            {"code":"GM","name":"Gambia","continent":"Africa"},
            {"code":"GE","name":"Georgia","continent":"Europe"},
            {"code":"DE","name":"Germany","continent":"Europe"},
            {"code":"GH","name":"Ghana","continent":"Africa"},
            {"code":"GI","name":"Gibraltar","continent":"Europe"},
            {"code":"GR","name":"Greece","continent":"Europe"},
            {"code":"GL","name":"Greenland","continent":"North America"},
            {"code":"GD","name":"Grenada","continent":"North America"},
            {"code":"GP","name":"Guadeloupe","continent":"North America"},
            {"code":"GU","name":"Guam","continent":"Oceania"},
            {"code":"GT","name":"Guatemala","continent":"North America"},
            {"code":"GN","name":"Guinea","continent":"Africa"},
            {"code":"GW","name":"Guinea-Bissau","continent":"Africa"},
            {"code":"GY","name":"Guyana","continent":"South America"},
            {"code":"HT","name":"Haiti","continent":"North America"},
            {"code":"VA","name":"Vatican City State","continent":"Europe"},
            {"code":"HN","name":"Honduras","continent":"North America"},
            {"code":"HK","name":"Hong Kong","continent":"Asia"},
            {"code":"HU","name":"Hungary","continent":"Europe"},
            {"code":"IS","name":"Iceland","continent":"Europe"},
            {"code":"IN","name":"India","continent":"Asia"},
            {"code":"ID","name":"Indonesia","continent":"Asia"},
            {"code":"IR","name":"Iran, Islamic Republic of","continent":"Asia"},
            {"code":"IQ","name":"Iraq","continent":"Asia"},
            {"code":"IE","name":"Ireland","continent":"Europe"},
            {"code":"IL","name":"Israel","continent":"Asia"},
            {"code":"IT","name":"Italy","continent":"Europe"},
            {"code":"JM","name":"Jamaica","continent":"North America"},
            {"code":"JP","name":"Japan","continent":"Asia"},
            {"code":"JO","name":"Jordan","continent":"Asia"},
            {"code":"KZ","name":"Kazakhstan","continent":"Asia"},
            {"code":"KE","name":"Kenya","continent":"Africa"},
            {"code":"KI","name":"Kiribati","continent":"Oceania"},
            {"code":"KP","name":"Korea, Democratic People's Republic of","continent":"Asia"},
            {"code":"KR","name":"Korea, Republic of","continent":"Asia"},
            {"code":"KW","name":"Kuwait","continent":"Asia"},
            {"code":"KG","name":"Kyrgyzstan","continent":"Asia"},
            {"code":"LA","name":"Lao People's Democratic Republic","continent":"Asia"},
            {"code":"LV","name":"Latvia","continent":"Europe"},
            {"code":"LB","name":"Lebanon","continent":"Asia"},
            {"code":"LS","name":"Lesotho","continent":"Africa"},
            {"code":"LR","name":"Liberia","continent":"Africa"},
            {"code":"LY","name":"Libyan Arab Jamahiriya","continent":"Africa"},
            {"code":"LI","name":"Liechtenstein","continent":"Europe"},
            {"code":"LT","name":"Lithuania","continent":"Europe"},
            {"code":"LU","name":"Luxembourg","continent":"Europe"},
            {"code":"MO","name":"Macao","continent":"Asia"},
            {"code":"MK","name":"Macedonia, the Former Yugoslav Republic of","continent":"Europe"},
            {"code":"MG","name":"Madagascar","continent":"Africa"},
            {"code":"MW","name":"Malawi","continent":"Africa"},
            {"code":"MY","name":"Malaysia","continent":"Asia"},
            {"code":"MV","name":"Maldives","continent":"Asia"},
            {"code":"ML","name":"Mali","continent":"Africa"},
            {"code":"MT","name":"Malta","continent":"Europe"},
            {"code":"MH","name":"Marshall Islands","continent":"Oceania"},
            {"code":"MQ","name":"Martinique","continent":"North America"},
            {"code":"MR","name":"Mauritania","continent":"Africa"},
            {"code":"MU","name":"Mauritius","continent":"Africa"},
            {"code":"YT","name":"Mayotte","continent":"Africa"},
            {"code":"MX","name":"Mexico","continent":"North America"},
            {"code":"FM","name":"Micronesia, Federated States of","continent":"Oceania"},
            {"code":"MD","name":"Moldova, Republic of","continent":"Europe"},
            {"code":"MC","name":"Monaco","continent":"Europe"},
            {"code":"MN","name":"Mongolia","continent":"Asia"},
            {"code":"MS","name":"Montserrat","continent":"North America"},
            {"code":"MA","name":"Morocco","continent":"Africa"},
            {"code":"MZ","name":"Mozambique","continent":"Africa"},
            {"code":"MM","name":"Myanmar","continent":"Asia"},
            {"code":"NA","name":"Namibia","continent":"Africa"},
            {"code":"NR","name":"Nauru","continent":"Oceania"},
            {"code":"NP","name":"Nepal","continent":"Asia"},
            {"code":"NL","name":"Netherlands","continent":"Europe"},
            {"code":"AN","name":"Netherlands Antilles","continent":"North America"},
            {"code":"NC","name":"New Caledonia","continent":"Oceania"},
            {"code":"NZ","name":"New Zealand","continent":"Oceania"},
            {"code":"NI","name":"Nicaragua","continent":"North America"},
            {"code":"NE","name":"Niger","continent":"Africa"},
            {"code":"NG","name":"Nigeria","continent":"Africa"},
            {"code":"NU","name":"Niue","continent":"Oceania"},
            {"code":"NF","name":"Norfolk Island","continent":"Oceania"},
            {"code":"MP","name":"Northern Mariana Islands","continent":"Oceania"},
            {"code":"NO","name":"Norway","continent":"Europe"},
            {"code":"OM","name":"Oman","continent":"Asia"},
            {"code":"PK","name":"Pakistan","continent":"Asia"},
            {"code":"PW","name":"Palau","continent":"Oceania"},
            {"code":"PS","name":"Palestinian Territory, Occupied","continent":"Asia"},
            {"code":"PA","name":"Panama","continent":"North America"},
            {"code":"PG","name":"Papua New Guinea","continent":"Oceania"},
            {"code":"PY","name":"Paraguay","continent":"South America"},
            {"code":"PE","name":"Peru","continent":"South America"},
            {"code":"PH","name":"Philippines","continent":"Asia"},
            {"code":"PN","name":"Pitcairn","continent":"Oceania"},
            {"code":"PL","name":"Poland","continent":"Europe"},
            {"code":"PT","name":"Portugal","continent":"Europe"},
            {"code":"PR","name":"Puerto Rico","continent":"North America"},
            {"code":"QA","name":"Qatar","continent":"Asia"},
            {"code":"RE","name":"Reunion","continent":"Africa"},
            {"code":"RO","name":"Romania","continent":"Europe"},
            {"code":"RU","name":"Russian Federation","continent":"Asia"},
            {"code":"RW","name":"Rwanda","continent":"Africa"},
            {"code":"SH","name":"Saint Helena","continent":"Africa"},
            {"code":"KN","name":"Saint Kitts and Nevis","continent":"North America"},
            {"code":"LC","name":"Saint Lucia","continent":"North America"},
            {"code":"PM","name":"Saint Pierre and Miquelon","continent":"North America"},
            {"code":"VC","name":"Saint Vincent and the Grenadines","continent":"North America"},
            {"code":"WS","name":"Samoa","continent":"Oceania"},
            {"code":"SM","name":"San Marino","continent":"Europe"},
            {"code":"ST","name":"Sao Tome and Principe","continent":"Africa"},
            {"code":"SA","name":"Saudi Arabia","continent":"Asia"},
            {"code":"SN","name":"Senegal","continent":"Africa"},
            {"code":"CS","name":"Serbia and Montenegro","continent":"Europe"},
            {"code":"SC","name":"Seychelles","continent":"Africa"},
            {"code":"SL","name":"Sierra Leone","continent":"Africa"},
            {"code":"SG","name":"Singapore","continent":"Asia"},
            {"code":"SK","name":"Slovakia","continent":"Europe"},
            {"code":"SI","name":"Slovenia","continent":"Europe"},
            {"code":"SB","name":"Solomon Islands","continent":"Oceania"},
            {"code":"SO","name":"Somalia","continent":"Africa"},
            {"code":"ZA","name":"South Africa","continent":"Africa"},
            {"code":"ES","name":"Spain","continent":"Europe"},
            {"code":"LK","name":"Sri Lanka","continent":"Asia"},
            {"code":"SD","name":"Sudan","continent":"Africa"},
            {"code":"SR","name":"Suriname","continent":"South America"},
            {"code":"SJ","name":"Svalbard and Jan Mayen","continent":"Europe"},
            {"code":"SZ","name":"Swaziland","continent":"Africa"},
            {"code":"SE","name":"Sweden","continent":"Europe"},
            {"code":"CH","name":"Switzerland","continent":"Europe"},
            {"code":"SY","name":"Syrian Arab Republic","continent":"Asia"},
            {"code":"TW","name":"Taiwan, Province of China","continent":"Asia"},
            {"code":"TJ","name":"Tajikistan","continent":"Asia"},
            {"code":"TZ","name":"Tanzania, United Republic of","continent":"Africa"},
            {"code":"TH","name":"Thailand","continent":"Asia"},
            {"code":"TL","name":"Timor-Leste","continent":"Asia"},
            {"code":"TG","name":"Togo","continent":"Africa"},
            {"code":"TK","name":"Tokelau","continent":"Oceania"},
            {"code":"TO","name":"Tonga","continent":"Oceania"},
            {"code":"TT","name":"Trinidad and Tobago","continent":"North America"},
            {"code":"TN","name":"Tunisia","continent":"Africa"},
            {"code":"TR","name":"Turkey","continent":"Asia"},
            {"code":"TM","name":"Turkmenistan","continent":"Asia"},
            {"code":"TC","name":"Turks and Caicos Islands","continent":"North America"},
            {"code":"TV","name":"Tuvalu","continent":"Oceania"},
            {"code":"UG","name":"Uganda","continent":"Africa"},
            {"code":"UA","name":"Ukraine","continent":"Europe"},
            {"code":"AE","name":"United Arab Emirates","continent":"Asia"},
            {"code":"GB","name":"United Kingdom","continent":"Europe"},
            {"code":"US","name":"United States","continent":"North America"},
            {"code":"UM","name":"United States Minor Outlying Islands","continent":"Oceania"},
            {"code":"UY","name":"Uruguay","continent":"South America"},
            {"code":"UZ","name":"Uzbekistan","continent":"Asia"},
            {"code":"VU","name":"Vanuatu","continent":"Oceania"},
            {"code":"VE","name":"Venezuela","continent":"South America"},
            {"code":"VN","name":"Viet Nam","continent":"Asia"},
            {"code":"VG","name":"Virgin Islands, British","continent":"North America"},
            {"code":"VI","name":"Virgin Islands, U.s.","continent":"North America"},
            {"code":"WF","name":"Wallis and Futuna","continent":"Oceania"},
            {"code":"EH","name":"Western Sahara","continent":"Africa"},
            {"code":"YE","name":"Yemen","continent":"Asia"},
            {"code":"ZM","name":"Zambia","continent":"Africa"},
            {"code":"ZW","name":"Zimbabwe","continent":"Africa"}
        ];
    };

    /** ******************************************************** */
    /***************************************************************************
	 * Get the World Continents list /
	 **************************************************************************/
    ShoppingCart.getContinents = function getContinents() {
        return [
            {"code":"AF","name":"Africa"},
            {"code":"AN","name":"Antarctica"},
            {"code":"AS","name":"Asia"},
            {"code":"EU","name":"Europe"},
            {"code":"NA","name":"North America"},
            {"code":"OC","name":"Oceania"},
            {"code":"SA","name":"South America"},
        ];
    };

    /** ******************************************************** */
    /***************************************************************************
	 * Get the World Currencies list /
	 **************************************************************************/
    ShoppingCart.currencies = [
        {"code":"AED","symbol":"\u062f.\u0625;","name":"UAE dirham"},
        {"code":"AFN","symbol":"Afs","name":"Afghan afghani"},
        {"code":"ALL","symbol":"L","name":"Albanian lek"},
        {"code":"AMD","symbol":"AMD","name":"Armenian dram"},
        {"code":"ANG","symbol":"NA\u0192","name":"Netherlands Antillean gulden"},
        {"code":"AOA","symbol":"Kz","name":"Angolan kwanza"},
        {"code":"ARS","symbol":"$","name":"Argentine peso"},
        {"code":"AUD","symbol":"$","name":"Australian dollar"},
        {"code":"AWG","symbol":"\u0192","name":"Aruban florin"},
        {"code":"AZN","symbol":"AZN","name":"Azerbaijani manat"},
        {"code":"BAM","symbol":"KM","name":"Bosnia and Herzegovina konvertibilna marka"},
        {"code":"BBD","symbol":"Bds$","name":"Barbadian dollar"},
        {"code":"BDT","symbol":"\u09f3","name":"Bangladeshi taka"},
        {"code":"BGN","symbol":"BGN","name":"Bulgarian lev"},
        {"code":"BHD","symbol":".\u062f.\u0628","name":"Bahraini dinar"},
        {"code":"BIF","symbol":"FBu","name":"Burundi franc"},
        {"code":"BMD","symbol":"BD$","name":"Bermudian dollar"},
        {"code":"BND","symbol":"B$","name":"Brunei dollar"},
        {"code":"BOB","symbol":"Bs.","name":"Bolivian boliviano"},
        {"code":"BRL","symbol":"R$","name":"Brazilian real"},
        {"code":"BSD","symbol":"B$","name":"Bahamian dollar"},
        {"code":"BTN","symbol":"Nu.","name":"Bhutanese ngultrum"},
        {"code":"BWP","symbol":"P","name":"Botswana pula"},
        {"code":"BYR","symbol":"Br","name":"Belarusian ruble"},
        {"code":"BZD","symbol":"BZ$","name":"Belize dollar"},
        {"code":"CAD","symbol":"$","name":"Canadian dollar"},
        {"code":"CDF","symbol":"F","name":"Congolese franc"},
        {"code":"CHF","symbol":"Fr.","name":"Swiss franc"},
        {"code":"CLP","symbol":"$","name":"Chilean peso"},
        {"code":"CNY","symbol":"\u00a5","name":"Chinese/Yuan renminbi"},
        {"code":"COP","symbol":"Col$","name":"Colombian peso"},
        {"code":"CRC","symbol":"\u20a1","name":"Costa Rican colon"},
        {"code":"CUC","symbol":"$","name":"Cuban peso"},
        {"code":"CVE","symbol":"Esc","name":"Cape Verdean escudo"},
        {"code":"CZK","symbol":"K\u010d","name":"Czech koruna"},
        {"code":"DJF","symbol":"Fdj","name":"Djiboutian franc"},
        {"code":"DKK","symbol":"DKK","name":"Danish krone"},
        {"code":"DOP","symbol":"RD$","name":"Dominican peso"},
        {"code":"DZD","symbol":"\u062f.\u062c","name":"Algerian dinar"},
        {"code":"EEK","symbol":"EEK","name":"Estonian kroon"},
        {"code":"EGP","symbol":"\u00a3","name":"Egyptian pound"},
        {"code":"ERN","symbol":"Nfa","name":"Eritrean nakfa"},
        {"code":"ETB","symbol":"Br","name":"Ethiopian birr"},
        {"code":"EUR","symbol":"\u20ac","name":"European Euro"},
        {"code":"FJD","symbol":"FJ$","name":"Fijian dollar"},
        {"code":"FKP","symbol":"\u00a3","name":"Falkland Islands pound"},
        {"code":"GBP","symbol":"\u00a3","name":"British pound"},
        {"code":"GEL","symbol":"GEL","name":"Georgian lari"},
        {"code":"GHS","symbol":"GH\u20b5","name":"Ghanaian cedi"},
        {"code":"GIP","symbol":"\u00a3","name":"Gibraltar pound"},
        {"code":"GMD","symbol":"D","name":"Gambian dalasi"},
        {"code":"GNF","symbol":"FG","name":"Guinean franc"},
        {"code":"GQE","symbol":"CFA","name":"Central African CFA franc"},
        {"code":"GTQ","symbol":"Q","name":"Guatemalan quetzal"},
        {"code":"GYD","symbol":"GY$","name":"Guyanese dollar"},
        {"code":"HKD","symbol":"HK$","name":"Hong Kong dollar"},
        {"code":"HNL","symbol":"L","name":"Honduran lempira"},
        {"code":"HRK","symbol":"kn","name":"Croatian kuna"},
        {"code":"HTG","symbol":"G","name":"Haitian gourde"},
        {"code":"HUF","symbol":"Ft","name":"Hungarian forint"},
        {"code":"IDR","symbol":"Rp","name":"Indonesian rupiah"},
        {"code":"ILS","symbol":"\u20aa","name":"Israeli new sheqel"},
        {"code":"INR","symbol":"\u2089","name":"Indian rupee"},
        {"code":"IQD","symbol":"\u062f.\u0639","name":"Iraqi dinar"},
        {"code":"IRR","symbol":"IRR","name":"Iranian rial"},
        {"code":"ISK","symbol":"ISK","name":"Icelandic kr\u00f3na"},
        {"code":"JMD","symbol":"J$","name":"Jamaican dollar"},
        {"code":"JOD","symbol":"JOD","name":"Jordanian dinar"},
        {"code":"JPY","symbol":"\u00a5","name":"Japanese yen"},
        {"code":"KES","symbol":"KSh","name":"Kenyan shilling"},
        {"code":"KGS","symbol":"\u0441\u043e\u043c","name":"Kyrgyzstani som"},
        {"code":"KHR","symbol":"\u17db","name":"Cambodian riel"},
        {"code":"KMF","symbol":"KMF","name":"Comorian franc"},
        {"code":"KPW","symbol":"W","name":"North Korean won"},
        {"code":"KRW","symbol":"W","name":"South Korean won"},
        {"code":"KWD","symbol":"KWD","name":"Kuwaiti dinar"},
        {"code":"KYD","symbol":"KY$","name":"Cayman Islands dollar"},
        {"code":"KZT","symbol":"T","name":"Kazakhstani tenge"},
        {"code":"LAK","symbol":"KN","name":"Lao kip"},
        {"code":"LBP","symbol":"\u00a3","name":"Lebanese lira"},
        {"code":"LKR","symbol":"Rs","name":"Sri Lankan rupee"},
        {"code":"LRD","symbol":"L$","name":"Liberian dollar"},
        {"code":"LSL","symbol":"M","name":"Lesotho loti"},
        {"code":"LTL","symbol":"Lt","name":"Lithuanian litas"},
        {"code":"LVL","symbol":"Ls","name":"Latvian lats"},
        {"code":"LYD","symbol":"LD","name":"Libyan dinar"},
        {"code":"MAD","symbol":"MAD","name":"Moroccan dirham"},
        {"code":"MDL","symbol":"MDL","name":"Moldovan leu"},
        {"code":"MGA","symbol":"FMG","name":"Malagasy ariary"},
        {"code":"MKD","symbol":"MKD","name":"Macedonian denar"},
        {"code":"MMK","symbol":"K","name":"Myanma kyat"},
        {"code":"MNT","symbol":"\u20ae","name":"Mongolian tugrik"},
        {"code":"MOP","symbol":"P","name":"Macanese pataca"},
        {"code":"MRO","symbol":"UM","name":"Mauritanian ouguiya"},
        {"code":"MUR","symbol":"Rs","name":"Mauritian rupee"},
        {"code":"MVR","symbol":"Rf","name":"Maldivian rufiyaa"},
        {"code":"MWK","symbol":"MK","name":"Malawian kwacha"},
        {"code":"MXN","symbol":"$","name":"Mexican peso"},
        {"code":"MYR","symbol":"RM","name":"Malaysian ringgit"},
        {"code":"MZM","symbol":"MTn","name":"Mozambican metical"},
        {"code":"NAD","symbol":"N$","name":"Namibian dollar"},
        {"code":"NGN","symbol":"\u20a6","name":"Nigerian naira"},
        {"code":"NIO","symbol":"C$","name":"Nicaraguan c\u00f3rdoba"},
        {"code":"NOK","symbol":"NOK","name":"Norwegian krone"},
        {"code":"NPR","symbol":"NRs","name":"Nepalese rupee"},
        {"code":"NZD","symbol":"NZ$","name":"New Zealand dollar"},
        {"code":"OMR","symbol":"OMR","name":"Omani rial"},
        {"code":"PAB","symbol":"B./","name":"Panamanian balboa"},
        {"code":"PEN","symbol":"S/.","name":"Peruvian nuevo sol"},
        {"code":"PGK","symbol":"K","name":"Papua New Guinean kina"},
        {"code":"PHP","symbol":"\u20b1","name":"Philippine peso"},
        {"code":"PKR","symbol":"Rs.","name":"Pakistani rupee"},
        {"code":"PLN","symbol":"z\u0142","name":"Polish zloty"},
        {"code":"PYG","symbol":"\u20b2","name":"Paraguayan guarani"},
        {"code":"QAR","symbol":"QR","name":"Qatari riyal"},
        {"code":"RON","symbol":"L","name":"Romanian leu"},
        {"code":"RSD","symbol":"din.","name":"Serbian dinar"},
        {"code":"RUB","symbol":"P","name":"Russian ruble"},
        {"code":"SAR","symbol":"SR","name":"Saudi riyal"},
        {"code":"SBD","symbol":"SI$","name":"Solomon Islands dollar"},
        {"code":"SCR","symbol":"SR","name":"Seychellois rupee"},
        {"code":"SDG","symbol":"SDG","name":"Sudanese pound"},
        {"code":"SEK","symbol":"SEK","name":"Swedish krona"},
        {"code":"SGD","symbol":"S$","name":"Singapore dollar"},
        {"code":"SHP","symbol":"\u00a3","name":"Saint Helena pound"},
        {"code":"SLL","symbol":"Le","name":"Sierra Leonean leone"},
        {"code":"SOS","symbol":"Sh.","name":"Somali shilling"},
        {"code":"SRD","symbol":"$","name":"Surinamese dollar"},
        {"code":"SYP","symbol":"LS","name":"Syrian pound"},
        {"code":"SZL","symbol":"E","name":"Swazi lilangeni"},
        {"code":"THB","symbol":"\u0e3f","name":"Thai baht"},
        {"code":"TJS","symbol":"TJS","name":"Tajikistani somoni"},
        {"code":"TMT","symbol":"m","name":"Turkmen manat"},
        {"code":"TND","symbol":"DT","name":"Tunisian dinar"},
        {"code":"TRY","symbol":"TL","name":"Turkish new lira"},
        {"code":"TTD","symbol":"TT$","name":"Trinidad and Tobago dollar"},
        {"code":"TWD","symbol":"NT$","name":"New Taiwan dollar"},
        {"code":"TZS","symbol":"TZS","name":"Tanzanian shilling"},
        {"code":"UAH","symbol":"грн.","name":"Ukrainian hryvnia"},
        {"code":"UGX","symbol":"USh","name":"Ugandan shilling"},
        {"code":"USD","symbol":"$","name":"United States dollar"},
        {"code":"UYU","symbol":"$U","name":"Uruguayan peso"},
        {"code":"UZS","symbol":"UZS","name":"Uzbekistani som"},
        {"code":"VEB","symbol":"Bs","name":"Venezuelan bolivar"},
        {"code":"VND","symbol":"\u20ab","name":"Vietnamese dong"},
        {"code":"VUV","symbol":"VT","name":"Vanuatu vatu"},
        {"code":"WST","symbol":"WS$","name":"Samoan tala"},
        {"code":"XAF","symbol":"CFA","name":"Central African CFA franc"},
        {"code":"XCD","symbol":"EC$","name":"East Caribbean dollar"},
        {"code":"XDR","symbol":"SDR","name":"Special Drawing Rights"},
        {"code":"XOF","symbol":"CFA","name":"West African CFA franc"},
        {"code":"XPF","symbol":"F","name":"CFP franc"},
        {"code":"YER","symbol":"YER","name":"Yemeni rial"},
        {"code":"ZAR","symbol":"R","name":"South African rand"},
        {"code":"ZMK","symbol":"ZK","name":"Zambian kwacha"},
        {"code":"ZWR","symbol":"Z$","name":"Zimbabwean dollar"}
    ];

export default ShoppingCart
    