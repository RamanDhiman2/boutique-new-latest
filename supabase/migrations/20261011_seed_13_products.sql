-- ============================================================================
-- SEED 13 NEW STOREFRONT PRODUCTS (Non-destructive UPSERT)
-- ============================================================================

INSERT INTO public.products (id, name, price, category)
VALUES
  ('elegant-maroon-suit', 'Elegant Maroon Suit', 65, 'shop-by-occasion'),
  ('elegant-purple-georgette-suit', 'Elegant Purple Viscose Georgette Suit', 63, 'aari-work'),
  ('elegant-yellow-cream-suit', 'Elegant Yellow & Cream Suit', 65, 'thread-work'),
  ('elegant-firozi-heavy-suit', 'Elegant Firozi Heavy Suit', 150, 'hand-work'),
  ('crepe-mix-match-printed-suit', 'Crepe Mix & Match Printed Suit', 80, 'daily-wear'),
  ('royal-navy-blue-green-suit', 'Royal Navy Blue & Green Suit', 120, 'shop-by-occasion'),
  ('baby-pink-mehroon-touch-suit', 'Baby Pink Suit with Mehroon Touch', 170, 'hand-work'),
  ('dark-purple-heavy-handwork-suit', 'Dark Purple Suit with Heavy Handwork', 120, 'shop-by-occasion'),
  ('bottle-green-heavy-handwork-suit', 'Bottle Green Suit with Heavy Handwork', 140, 'hand-work'),
  ('coffee-brown-cream-salwar-suit', 'Coffee Brown Suit with Cream Salwar', 60, 'daily-wear'),
  ('all-over-black-heavy-handwork-suit', 'All-Over Black Suit with Heavy Handwork', 199, 'shop-by-occasion'),
  ('dark-green-bridal-heavy-handwork-suit', 'Dark Green Bridal Suit with Heavy Handwork', 230, 'bridal'),
  ('firozi-banarsi-heavy-golden-suit', 'Firozi Banarsi Suit with Heavy Golden Work', 199, 'bridal')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  category = EXCLUDED.category;
