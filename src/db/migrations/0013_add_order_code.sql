-- Replaces the per-store sequential order_number with a random,
-- unguessable order_code. The sequential number doubled as the /track
-- lookup key next to the customer's phone, which made orders enumerable
-- (walk 1,2,3… against a known phone) and leaked the merchant's order
-- volume to anyone who placed two orders. The accounting series that
-- genuinely needs to be sequential is the invoice number, which is
-- untouched. See src/lib/orders/number.ts.
--
-- Added nullable and backfilled here; 0014 locks it to NOT NULL + unique
-- and drops the old column.
ALTER TABLE "orders" ADD COLUMN "order_code" text;--> statement-breakpoint
DO $$
DECLARE
	row_rec RECORD;
	candidate text;
	alphabet text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
	i int;
BEGIN
	FOR row_rec IN SELECT id, store_id FROM orders WHERE order_code IS NULL LOOP
		LOOP
			candidate := '';
			FOR i IN 1..8 LOOP
				candidate := candidate || substr(alphabet, 1 + floor(random() * 32)::int, 1);
			END LOOP;
			EXIT WHEN NOT EXISTS (
				SELECT 1 FROM orders
				WHERE store_id = row_rec.store_id AND order_code = candidate
			);
		END LOOP;
		UPDATE orders SET order_code = candidate WHERE id = row_rec.id;
	END LOOP;
END $$;
