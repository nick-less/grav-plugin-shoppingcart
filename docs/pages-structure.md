# Pages structure

Create a page of type shoppingcart_categories.md. This page will contain a list of categories, provided by its subpages. The categories are pages of type shoppingcart_products.md.

In turn, those pages have subpages of type shoppingcart_product.md, which are the product pages.

Here's an example of a possible page structure:

```
01.shop
    shoppingcart_categories.md
    01.t-shirts
        shoppingcart_products.md
        01.first-t-shirt
            product_image.jpg
            shoppingcart_product.md
        02.second-t-shirt
            product_image.jpg
            shoppingcart_product.md
    02.mugs
        shoppingcart_products.md
        01.first-mug
            product_image.jpg
            shoppingcart_product.md
        02.second-mug
            product_image.jpg
            shoppingcart_product.md
```
Categories List Page

The main "Shop" page, with the list of the available categories, will use this structure:

shoppingcart_categories.md

```
---
title: Shop
body_classes: fullwidth
content:
    items: @self.children
    order:
        by: title
        dir: asc
---

# Shop

Products list Page

The products listing page (or, single category view page) will follow this structure:
```
shoppingcart_products.md

```
---
title: Geek Toys
category: Geek Toys
content:
    items: @self.children
    order:
        by: title
        dir: asc
---

# Geek Toys
## Anime, Gaming, Movies, Comics, we have **all your toys**

Single Product Page

Product Pages using shoppingcart_product.md will follow this structure:
```
shoppingcart_product.md

```
---
title: Product title
price: 19.99
---

#### Product title to be shown in the page

Product description
```