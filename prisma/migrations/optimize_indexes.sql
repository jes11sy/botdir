-- Оптимизация индексов для улучшения производительности

-- Индексы для таблицы calls
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calls_operator_date ON calls(operator_id, date_create);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calls_status_date ON calls(status, date_create);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calls_city_date ON calls(city, date_create);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calls_rk_date ON calls(rk, date_create);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calls_avito_name ON calls(avito_name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calls_phone_client ON calls(phone_client);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calls_phone_ats ON calls(phone_ats);

-- Индексы для таблицы orders
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_operator_date ON orders(operator_name_id, create_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_date ON orders(status_order, create_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_city_date ON orders(city, create_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_rk_date ON orders(rk, create_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_phone ON orders(phone);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_avito_name ON orders(avito_name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_master_id ON orders(master_id);

-- Индексы для таблицы callcentre_operator
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_operator_status ON callcentre_operator(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_operator_status_work ON callcentre_operator(status_work);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_operator_city ON callcentre_operator(city);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_operator_login ON callcentre_operator(login);

-- Индексы для таблицы phones
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phones_city ON phones(city);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phones_rk ON phones(rk);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phones_avito_name ON phones(avito_name);

-- Индексы для таблицы avito
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_avito_user_id ON avito(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_avito_connection_status ON avito(connection_status);

-- Составные индексы для сложных запросов
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calls_operator_status_date ON calls(operator_id, status, date_create);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_operator_status_date ON orders(operator_name_id, status_order, create_date);

-- Индексы для поиска по тексту
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calls_city_text ON calls USING gin(to_tsvector('russian', city));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_address_text ON orders USING gin(to_tsvector('russian', address));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_problem_text ON orders USING gin(to_tsvector('russian', problem));

-- Статистика для оптимизатора запросов
ANALYZE calls;
ANALYZE orders;
ANALYZE callcentre_operator;
ANALYZE phones;
ANALYZE avito;
