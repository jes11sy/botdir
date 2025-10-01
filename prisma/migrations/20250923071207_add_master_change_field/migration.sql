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
    "sip_address" TEXT,

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
    "user_id" TEXT,

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
    "avito_name" TEXT,

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
    "avito_chatid" TEXT,
    "call_id" TEXT,

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
    "recording_email_sent" BOOLEAN NOT NULL DEFAULT false,
    "recording_path" TEXT,
    "recording_processed_at" TIMESTAMP(3),

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_settings" (
    "id" SERIAL NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "secure" BOOLEAN NOT NULL DEFAULT true,
    "user" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "mango_email" TEXT NOT NULL,
    "check_interval" INTEGER NOT NULL DEFAULT 5,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "director" (
    "id" SERIAL NOT NULL,
    "city" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "contract_doc" TEXT,
    "passport_doc" TEXT,
    "date_create" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "director_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master" (
    "id" SERIAL NOT NULL,
    "city" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passport_doc" TEXT,
    "contract_doc" TEXT,
    "status_work" TEXT NOT NULL,
    "date_create" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "note" TEXT,
    "receipt_doc" TEXT,
    "date_create" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name_create" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "director_login_key" ON "director"("login");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_avito_name_fkey" FOREIGN KEY ("avito_name") REFERENCES "avito"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_operator_name_id_fkey" FOREIGN KEY ("operator_name_id") REFERENCES "callcentre_operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_master_id_fkey" FOREIGN KEY ("master_id") REFERENCES "master"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_avito_name_fkey" FOREIGN KEY ("avito_name") REFERENCES "avito"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_mango_call_id_fkey" FOREIGN KEY ("mango_call_id") REFERENCES "mango"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "callcentre_operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_phone_ats_fkey" FOREIGN KEY ("phone_ats") REFERENCES "phones"("number") ON DELETE RESTRICT ON UPDATE CASCADE;
