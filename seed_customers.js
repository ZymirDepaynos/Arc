const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const firstNames = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

async function seed() {
  console.log('🚀 Starting to seed 500 customers...');
  
  const customers = [];
  
  for (let i = 0; i < 500; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${firstName} ${lastName} #${i + 1}`;
    
    const balance = Math.floor(Math.random() * 50000) + 1000;
    const advance = Math.random() > 0.5 ? Math.floor(Math.random() * 500) : 0;
    
    // Status logic
    let status = 'active';
    if (advance > 0) status = 'partial';
    if (Math.random() > 0.8) status = 'paid'; // 20% already paid
    
    const finalBalance = status === 'paid' ? 0 : balance;
    const finalAdvance = status === 'paid' ? balance : advance;
    
    const dateBorrowed = new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString().split('T')[0];
    
    customers.push({
      name,
      balance: finalBalance,
      advance_payment: finalAdvance,
      date_borrowed: dateBorrowed,
      status,
      notes: `Test user ${i + 1} for system stress test.`,
      receipt_numbers: [`REC-${1000 + i}`],
      payment_history: status !== 'active' ? [
        { date: dateBorrowed, amount: finalAdvance, balance_after: finalBalance }
      ] : []
    });
  }

  // Insert in batches of 100 to avoid timeouts
  for (let i = 0; i < customers.length; i += 100) {
    const batch = customers.slice(i, i + 100);
    const { error } = await supabase.from('debtors').insert(batch);
    if (error) {
      console.error(`❌ Error inserting batch ${i / 100 + 1}:`, error.message);
    } else {
      console.log(`✅ Inserted batch ${i / 100 + 1} (100 customers)`);
    }
  }

  console.log('🏁 Seeding completed!');
}

seed();
