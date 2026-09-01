CREATE TABLE "bd_divisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_bn" text NOT NULL,
	"display_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bd_districts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"division_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_bn" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bd_districts" ADD CONSTRAINT "bd_districts_division_id_bd_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."bd_divisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bd_divisions_name_idx" ON "bd_divisions" USING btree ("name");--> statement-breakpoint
CREATE INDEX "bd_districts_division_id_idx" ON "bd_districts" USING btree ("division_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bd_districts_name_idx" ON "bd_districts" USING btree ("name");--> statement-breakpoint
-- No RLS: genuinely platform-wide reference data, not tenant-scoped (no
-- store_id column at all). amarshop_app gets read-only access — these
-- rows are seeded once, right here, and never written to by the app.
GRANT SELECT ON TABLE "bd_divisions" TO amarshop_app;--> statement-breakpoint
GRANT SELECT ON TABLE "bd_districts" TO amarshop_app;--> statement-breakpoint
-- Seed: Bangladesh's 8 divisions and their 64 districts (stable
-- administrative structure since Mymensingh became the 8th division in
-- 2015). Upazila-level data is deliberately not included — see the
-- schema comment in bd-districts.ts.
WITH d AS (
	INSERT INTO "bd_divisions" ("name", "name_bn", "display_order") VALUES ('Dhaka', 'ঢাকা', 1) RETURNING id
)
INSERT INTO "bd_districts" ("division_id", "name", "name_bn")
SELECT d.id, x.name, x.name_bn FROM d, (VALUES
	('Dhaka', 'ঢাকা'), ('Faridpur', 'ফরিদপুর'), ('Gazipur', 'গাজীপুর'), ('Gopalganj', 'গোপালগঞ্জ'),
	('Kishoreganj', 'কিশোরগঞ্জ'), ('Madaripur', 'মাদারীপুর'), ('Manikganj', 'মানিকগঞ্জ'),
	('Munshiganj', 'মুন্সিগঞ্জ'), ('Narayanganj', 'নারায়ণগঞ্জ'), ('Narsingdi', 'নরসিংদী'),
	('Rajbari', 'রাজবাড়ী'), ('Shariatpur', 'শরীয়তপুর'), ('Tangail', 'টাঙ্গাইল')
) AS x(name, name_bn);
--> statement-breakpoint
WITH d AS (
	INSERT INTO "bd_divisions" ("name", "name_bn", "display_order") VALUES ('Chattogram', 'চট্টগ্রাম', 2) RETURNING id
)
INSERT INTO "bd_districts" ("division_id", "name", "name_bn")
SELECT d.id, x.name, x.name_bn FROM d, (VALUES
	('Bandarban', 'বান্দরবান'), ('Brahmanbaria', 'ব্রাহ্মণবাড়িয়া'), ('Chandpur', 'চাঁদপুর'),
	('Chattogram', 'চট্টগ্রাম'), ('Cumilla', 'কুমিল্লা'), ('Cox''s Bazar', 'কক্সবাজার'),
	('Feni', 'ফেনী'), ('Khagrachhari', 'খাগড়াছড়ি'), ('Lakshmipur', 'লক্ষ্মীপুর'),
	('Noakhali', 'নোয়াখালী'), ('Rangamati', 'রাঙ্গামাটি')
) AS x(name, name_bn);
--> statement-breakpoint
WITH d AS (
	INSERT INTO "bd_divisions" ("name", "name_bn", "display_order") VALUES ('Rajshahi', 'রাজশাহী', 3) RETURNING id
)
INSERT INTO "bd_districts" ("division_id", "name", "name_bn")
SELECT d.id, x.name, x.name_bn FROM d, (VALUES
	('Bogura', 'বগুড়া'), ('Joypurhat', 'জয়পুরহাট'), ('Naogaon', 'নওগাঁ'), ('Natore', 'নাটোর'),
	('Chapai Nawabganj', 'চাঁপাইনবাবগঞ্জ'), ('Pabna', 'পাবনা'), ('Rajshahi', 'রাজশাহী'),
	('Sirajganj', 'সিরাজগঞ্জ')
) AS x(name, name_bn);
--> statement-breakpoint
WITH d AS (
	INSERT INTO "bd_divisions" ("name", "name_bn", "display_order") VALUES ('Khulna', 'খুলনা', 4) RETURNING id
)
INSERT INTO "bd_districts" ("division_id", "name", "name_bn")
SELECT d.id, x.name, x.name_bn FROM d, (VALUES
	('Bagerhat', 'বাগেরহাট'), ('Chuadanga', 'চুয়াডাঙ্গা'), ('Jashore', 'যশোর'),
	('Jhenaidah', 'ঝিনাইদহ'), ('Khulna', 'খুলনা'), ('Kushtia', 'কুষ্টিয়া'), ('Magura', 'মাগুরা'),
	('Meherpur', 'মেহেরপুর'), ('Narail', 'নড়াইল'), ('Satkhira', 'সাতক্ষীরা')
) AS x(name, name_bn);
--> statement-breakpoint
WITH d AS (
	INSERT INTO "bd_divisions" ("name", "name_bn", "display_order") VALUES ('Barishal', 'বরিশাল', 5) RETURNING id
)
INSERT INTO "bd_districts" ("division_id", "name", "name_bn")
SELECT d.id, x.name, x.name_bn FROM d, (VALUES
	('Barguna', 'বরগুনা'), ('Barishal', 'বরিশাল'), ('Bhola', 'ভোলা'), ('Jhalokati', 'ঝালকাঠি'),
	('Patuakhali', 'পটুয়াখালী'), ('Pirojpur', 'পিরোজপুর')
) AS x(name, name_bn);
--> statement-breakpoint
WITH d AS (
	INSERT INTO "bd_divisions" ("name", "name_bn", "display_order") VALUES ('Sylhet', 'সিলেট', 6) RETURNING id
)
INSERT INTO "bd_districts" ("division_id", "name", "name_bn")
SELECT d.id, x.name, x.name_bn FROM d, (VALUES
	('Habiganj', 'হবিগঞ্জ'), ('Moulvibazar', 'মৌলভীবাজার'), ('Sunamganj', 'সুনামগঞ্জ'), ('Sylhet', 'সিলেট')
) AS x(name, name_bn);
--> statement-breakpoint
WITH d AS (
	INSERT INTO "bd_divisions" ("name", "name_bn", "display_order") VALUES ('Rangpur', 'রংপুর', 7) RETURNING id
)
INSERT INTO "bd_districts" ("division_id", "name", "name_bn")
SELECT d.id, x.name, x.name_bn FROM d, (VALUES
	('Dinajpur', 'দিনাজপুর'), ('Gaibandha', 'গাইবান্ধা'), ('Kurigram', 'কুড়িগ্রাম'),
	('Lalmonirhat', 'লালমনিরহাট'), ('Nilphamari', 'নীলফামারী'), ('Panchagarh', 'পঞ্চগড়'),
	('Rangpur', 'রংপুর'), ('Thakurgaon', 'ঠাকুরগাঁও')
) AS x(name, name_bn);
--> statement-breakpoint
WITH d AS (
	INSERT INTO "bd_divisions" ("name", "name_bn", "display_order") VALUES ('Mymensingh', 'ময়মনসিংহ', 8) RETURNING id
)
INSERT INTO "bd_districts" ("division_id", "name", "name_bn")
SELECT d.id, x.name, x.name_bn FROM d, (VALUES
	('Jamalpur', 'জামালপুর'), ('Mymensingh', 'ময়মনসিংহ'), ('Netrokona', 'নেত্রকোণা'), ('Sherpur', 'শেরপুর')
) AS x(name, name_bn);