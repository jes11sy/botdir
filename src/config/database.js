const { Pool } = require('pg');

class Database {
  constructor() {
    this.pool = null;
  }

  async connect() {
    try {
      console.log('🔍 DATABASE_URL:', process.env.DATABASE_URL);
      this.pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'callcentre_crm',
        user: 'postgres',
        password: '1740',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      
      // Тестируем подключение
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      console.log('✅ База данных подключена');
    } catch (error) {
      console.error('❌ Ошибка подключения к БД:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
    }
  }

  getClient() {
    return this.pool;
  }

  // Методы для работы с заявками
  async getOrders(limit = 10) {
    const query = `
      SELECT o.*, op.name as operator_name, m.name as master_name
      FROM orders o
      LEFT JOIN callcentre_operator op ON o.operator_name_id = op.id
      LEFT JOIN master m ON o.master_id = m.id
      ORDER BY o.created_at DESC
      LIMIT $1
    `;
    const result = await this.pool.query(query, [limit]);
    return result.rows;
  }

  // Получение заявок по статусу
  async getOrdersByStatus(status, limit = 10) {
    const query = `
      SELECT o.*, op.name as operator_name, m.name as master_name
      FROM orders o
      LEFT JOIN callcentre_operator op ON o.operator_name_id = op.id
      LEFT JOIN master m ON o.master_id = m.id
      WHERE o.status_order = $1
      ORDER BY o.created_at DESC
      LIMIT $2
    `;
    const result = await this.pool.query(query, [status, limit]);
    return result.rows;
  }

  // Получение заявок по нескольким статусам
  async getOrdersByMultipleStatuses(statuses, limit = 10) {
    const placeholders = statuses.map((_, index) => `$${index + 1}`).join(',');
    const query = `
      SELECT o.*, op.name as operator_name, m.name as master_name
      FROM orders o
      LEFT JOIN callcentre_operator op ON o.operator_name_id = op.id
      LEFT JOIN master m ON o.master_id = m.id
      WHERE o.status_order = ANY($1)
      ORDER BY o.created_at DESC
      LIMIT $2
    `;
    const result = await this.pool.query(query, [statuses, limit]);
    return result.rows;
  }

  async searchOrder(searchText) {
    let query, params;
    
    if (searchText.match(/^\d+$/)) {
      query = `
        SELECT o.*, op.name as operator_name, m.name as master_name
        FROM orders o
        LEFT JOIN callcentre_operator op ON o.operator_name_id = op.id
        LEFT JOIN master m ON o.master_id = m.id
        WHERE o.id = $1
      `;
      params = [parseInt(searchText)];
    } else {
      query = `
        SELECT o.*, op.name as operator_name, m.name as master_name
        FROM orders o
        LEFT JOIN callcentre_operator op ON o.operator_name_id = op.id
        LEFT JOIN master m ON o.master_id = m.id
        WHERE o.phone ILIKE $1
        LIMIT 5
      `;
      params = [`%${searchText}%`];
    }
    
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  // Методы для работы с кассой
  async getCashBalance() {
    const incomeQuery = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM cash 
      WHERE name = 'приход'
    `;
    const expenseQuery = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM cash 
      WHERE name = 'расход'
    `;
    
    const [incomeResult, expenseResult] = await Promise.all([
      this.pool.query(incomeQuery),
      this.pool.query(expenseQuery)
    ]);
    
    return {
      income: parseFloat(incomeResult.rows[0].total),
      expense: parseFloat(expenseResult.rows[0].total)
    };
  }

  // Методы для работы с сотрудниками
  async getOperators(limit = 10) {
    const query = `
      SELECT * FROM callcentre_operator 
      ORDER BY created_at DESC 
      LIMIT $1
    `;
    const result = await this.pool.query(query, [limit]);
    return result.rows;
  }

  async getMasters(limit = 10) {
    const query = `
      SELECT * FROM master 
      ORDER BY created_at DESC 
      LIMIT $1
    `;
    const result = await this.pool.query(query, [limit]);
    return result.rows;
  }

  async getAdmins(limit = 10) {
    const query = `
      SELECT * FROM callcentre_admin 
      ORDER BY created_at DESC 
      LIMIT $1
    `;
    const result = await this.pool.query(query, [limit]);
    return result.rows;
  }

  // Методы для работы с кассой
  async getCashHistory(limit = 20) {
    const query = `
      SELECT * FROM cash 
      ORDER BY date_create DESC 
      LIMIT $1
    `;
    const result = await this.pool.query(query, [limit]);
    return result.rows;
  }

  async addCashOperation(name, amount, city, note, nameCreate) {
    const query = `
      INSERT INTO cash (name, amount, city, note, name_create, date_create, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())
      RETURNING *
    `;
    const result = await this.pool.query(query, [name, amount, city, note, nameCreate]);
    return result.rows[0];
  }

  // Получение городов директора по tg_id
  async getDirectorCities(tgId) {
    const query = `
      SELECT cities FROM director 
      WHERE tg_id = $1
    `;
    const result = await this.pool.query(query, [tgId]);
    return result.rows.length > 0 ? result.rows[0].cities : null;
  }

  // Получение имени директора по tg_id
  async getDirectorName(tgId) {
    const query = `
      SELECT name FROM director 
      WHERE tg_id = $1
    `;
    const result = await this.pool.query(query, [tgId]);
    return result.rows.length > 0 ? result.rows[0].name : null;
  }

  // Получение полной информации директора по tg_id
  async getDirectorInfo(tgId) {
    const query = `
      SELECT name, cities FROM director 
      WHERE tg_id = $1
    `;
    const result = await this.pool.query(query, [tgId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // Получение полной информации мастера по tg_id
  async getMasterInfo(tgId) {
    const query = `
      SELECT id, name, cities, status_work FROM master 
      WHERE tg_id = $1
    `;
    const result = await this.pool.query(query, [tgId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // Получение баланса кассы по городу
  async getCashBalanceByCity(city) {
    const query = `
      SELECT 
        COALESCE(SUM(CASE WHEN name = 'приход' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN name = 'расход' THEN amount ELSE 0 END), 0) as expense
      FROM cash 
      WHERE city = $1
    `;
    const result = await this.pool.query(query, [city]);
    return result.rows[0];
  }
}

module.exports = new Database();
