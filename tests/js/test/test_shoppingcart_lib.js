var assert = require('assert');

import ShoppingCart from '../../../src/js/lib/shoppingcart.js'


describe('ShoppingCart Lib', function() {
    describe('ShoppingCart.getCodeOfCountry()', function () {
        it('should return IT when the value is Italy', function () {
            assert.equal('IT', ShoppingCart.getCodeOfCountry('Italy'));
        });
        it('should return US when the value is United States', function () {
            assert.equal('US', ShoppingCart.getCodeOfCountry('United States'));
        });
    });

    describe('ShoppingCart.getContinentOfCountry()', function () {
        it('should return Europe when the value is Italy', function () {
            assert.equal('Europe', ShoppingCart.getContinentOfCountry('Italy'));
        });
        it('should return North America when the value is United States', function () {
            assert.equal('North America', ShoppingCart.getContinentOfCountry('United States'));
        });
    });
});
