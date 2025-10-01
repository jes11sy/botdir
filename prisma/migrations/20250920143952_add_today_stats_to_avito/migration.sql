-- CreateTable
CREATE TABLE "callcentre_admin" (
    "id" SERIAL NOT NULL,
    "login" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "callcentre_admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "callcentre_operator" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "status_work" TEXT NOT NULL,
    "passport" TEXT,
    "contract" TEXT,
    "date_create" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "callcentre_operator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avito" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "client_secret" TEXT NOT NULL,
    "proxy_type" TEXT,
    "proxy_host" TEXT,
    "proxy_port" INTEGER,
    "proxy_login" TEXT,
    "proxy_password" TEXT,
    "connection_status" TEXT DEFAULT 'not_checked',
    "proxy_status" TEXT DEFAULT 'not_checked',
    "account_balance" DOUBLE PRECISION DEFAULT 0,
    "ads_count" INTEGER DEFAULT 0,
    "views_count" INTEGER DEFAULT 0,
    "contacts_count" INTEGER DEFAULT 0,
    "views_today" INTEGER DEFAULT 0,
    "contacts_today" INTEGER DEFAULT 0,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phones" (
    "id" SERIAL NOT NULL,
    "number" TEXT NOT NULL,
    "rk" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "phones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mango" (
    "id" SERIAL NOT NULL,
    "call_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "duration" INTEGER,
    "record_url" TEXT,
    "status" TEXT NOT NULL,
    "mango_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mango_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "rk" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "avito_name" TEXT,
    "phone" TEXT NOT NULL,
    "type_order" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "date_meeting" TIMESTAMP(3) NOT NULL,
    "type_equipment" TEXT NOT NULL,
    "problem" TEXT NOT NULL,
    "call_record" TEXT,
    "status_order" TEXT NOT NULL,
    "master_id" INTEGER,
    "result" DECIMAL(10,2),
    "expenditure" DECIMAL(10,2),
    "clean" DECIMAL(10,2),
    "bso_doc" TEXT,
    "expenditure_doc" TEXT,
    "operator_name_id" INTEGER NOT NULL,
    "create_date" TIMESTAMP(3) NOT NULL,
    "closing_data" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calls" (
    "id" SERIAL NOT NULL,
    "rk" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "avito_name" TEXT,
    "phone_client" TEXT NOT NULL,
    "phone_ats" TEXT NOT NULL,
    "date_create" TIMESTAMP(3) NOT NULL,
    "operator_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "mango_call_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "callcentre_admin_login_key" ON "callcentre_admin"("login");

-- CreateIndex
CREATE UNIQUE INDEX "callcentre_operator_login_key" ON "callcentre_operator"("login");

-- CreateIndex
CREATE UNIQUE INDEX "avito_name_key" ON "avito"("name");

-- CreateIndex
CREATE UNIQUE INDEX "phones_number_key" ON "phones"("number");

-- CreateIndex
CREATE UNIQUE INDEX "mango_call_id_key" ON "mango"("call_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_operator_name_id_fkey" FOREIGN KEY ("operator_name_id") REFERENCES "callcentre_operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_avito_name_fkey" FOREIGN KEY ("avito_name") REFERENCES "avito"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "callcentre_operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_avito_name_fkey" FOREIGN KEY ("avito_name") REFERENCES "avito"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_phone_ats_fkey" FOREIGN KEY ("phone_ats") REFERENCES "phones"("number") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_mango_call_id_fkey" FOREIGN KEY ("mango_call_id") REFERENCES "mango"("id") ON DELETE SET NULL ON UPDATE CASCADE;
