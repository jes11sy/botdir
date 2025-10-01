import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Начинаем заполнение базы данных...')

  // Создаем директоров
  const director1 = await prisma.director.upsert({
    where: { login: 'admin' },
    update: {},
    create: {
      city: 'Москва',
      name: 'Администратор',
      login: 'admin',
      password: await bcrypt.hash('admin123', 10),
      note: 'Главный администратор системы'
    }
  })

  const director2 = await prisma.director.upsert({
    where: { login: 'director_spb' },
    update: {},
    create: {
      city: 'Санкт-Петербург',
      name: 'Директор СПб',
      login: 'director_spb',
      password: await bcrypt.hash('spb123', 10),
      note: 'Директор по Санкт-Петербургу'
    }
  })

  console.log('✅ Директоры созданы')

  // Создаем мастеров
  const master1 = await prisma.master.upsert({
    where: { id: 1 },
    update: {},
    create: {
      cities: ['Москва'],
      name: 'Иван Петров',
      statusWork: 'работает',
      note: 'Опытный мастер по ремонту техники'
    }
  })

  const master2 = await prisma.master.upsert({
    where: { id: 2 },
    update: {},
    create: {
      cities: ['Москва', 'Казань'], // Мастер работает в двух городах
      name: 'Мария Сидорова',
      statusWork: 'работает',
      note: 'Специалист по бытовой технике'
    }
  })

  const master3 = await prisma.master.upsert({
    where: { id: 3 },
    update: {},
    create: {
      cities: ['Санкт-Петербург'],
      name: 'Алексей Козлов',
      statusWork: 'работает',
      note: 'Мастер по компьютерам'
    }
  })

  const master4 = await prisma.master.upsert({
    where: { id: 4 },
    update: {},
    create: {
      cities: ['Санкт-Петербург'],
      name: 'Елена Волкова',
      statusWork: 'уволен',
      note: 'Бывший мастер (уволен)'
    }
  })

  console.log('✅ Мастера созданы')

  // Создаем кассовые операции
  const cash1 = await prisma.cash.create({
    data: {
      name: 'приход',
      amount: 5000,
      note: 'Оплата за ремонт холодильника',
      nameCreate: 'Иван Петров',
      dateCreate: new Date('2024-01-15')
    }
  })

  const cash2 = await prisma.cash.create({
    data: {
      name: 'приход',
      amount: 3000,
      note: 'Оплата за ремонт стиральной машины',
      nameCreate: 'Мария Сидорова',
      dateCreate: new Date('2024-01-16')
    }
  })

  const cash3 = await prisma.cash.create({
    data: {
      name: 'расход',
      amount: 500,
      note: 'Покупка запчастей',
      nameCreate: 'Иван Петров',
      dateCreate: new Date('2024-01-17')
    }
  })

  const cash4 = await prisma.cash.create({
    data: {
      name: 'расход',
      amount: 200,
      note: 'Транспортные расходы',
      nameCreate: 'Мария Сидорова',
      dateCreate: new Date('2024-01-18')
    }
  })

  console.log('✅ Кассовые операции созданы')

  // Создаем тестовые заказы (если таблица orders существует)
  try {
    // Проверяем, есть ли операторы для связи с заказами
    const operators = await prisma.callcentreOperator.findMany({ take: 1 })
    
    if (operators.length > 0) {
      const testOrder1 = await prisma.order.create({
        data: {
          rk: 'РК-2024-001',
          city: 'Москва',
          avito_name: 'Тестовый аккаунт',
          phone: '+7-900-123-45-67',
          type_order: 'Ремонт холодильника',
          client_name: 'Петр Иванов',
          address: 'ул. Ленина, д. 1, кв. 10',
          date_meeting: new Date('2024-01-20T10:00:00Z'),
          type_equipment: 'Холодильник Samsung',
          problem: 'Не морозит',
          status_order: 'новый',
          master_id: master1.id,
          result: 5000,
          operator_name_id: operators[0].id,
          create_date: new Date('2024-01-19')
        }
      })

      const testOrder2 = await prisma.order.create({
        data: {
          rk: 'РК-2024-002',
          city: 'Москва',
          avito_name: 'Тестовый аккаунт',
          phone: '+7-900-234-56-78',
          type_order: 'Ремонт стиральной машины',
          client_name: 'Анна Смирнова',
          address: 'ул. Пушкина, д. 5, кв. 20',
          date_meeting: new Date('2024-01-21T14:00:00Z'),
          type_equipment: 'Стиральная машина LG',
          problem: 'Не крутится барабан',
          status_order: 'в работе',
          master_id: master2.id,
          result: 3000,
          operator_name_id: operators[0].id,
          create_date: new Date('2024-01-20')
        }
      })

      const testOrder3 = await prisma.order.create({
        data: {
          rk: 'РК-2024-003',
          city: 'Санкт-Петербург',
          avito_name: 'Тестовый аккаунт',
          phone: '+7-900-345-67-89',
          type_order: 'Ремонт компьютера',
          client_name: 'Сергей Козлов',
          address: 'пр. Невский, д. 10, кв. 5',
          date_meeting: new Date('2024-01-22T16:00:00Z'),
          type_equipment: 'Компьютер Dell',
          problem: 'Не включается',
          status_order: 'завершен',
          master_id: master3.id,
          result: 4000,
          expenditure: 500,
          clean: 3500,
          master_change: 500,
          operator_name_id: operators[0].id,
          create_date: new Date('2024-01-21'),
          closing_data: new Date('2024-01-22T18:00:00Z')
        }
      })

      console.log('✅ Тестовые заказы созданы')
    }
  } catch (error) {
    console.log('⚠️ Не удалось создать тестовые заказы (возможно, нет операторов)')
  }

  console.log('🎉 База данных успешно заполнена!')
  console.log('👤 Директоры:')
  console.log(`   - ${director1.name} (${director1.login}) - ${director1.city}`)
  console.log(`   - ${director2.name} (${director2.login}) - ${director2.city}`)
  console.log('👥 Мастера:')
  console.log(`   - ${master1.name} - ${master1.city} (${master1.statusWork})`)
  console.log(`   - ${master2.name} - ${master2.city} (${master2.statusWork})`)
  console.log(`   - ${master3.name} - ${master3.city} (${master3.statusWork})`)
  console.log(`   - ${master4.name} - ${master4.city} (${master4.statusWork})`)
  console.log('💰 Кассовые операции:')
  console.log(`   - Приход: ${cash1.amount}₽ и ${cash2.amount}₽`)
  console.log(`   - Расход: ${cash3.amount}₽ и ${cash4.amount}₽`)
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при заполнении базы данных:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
