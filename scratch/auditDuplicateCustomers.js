import { createRepository } from '../backend/src/dataAccess/repository.js';
import { closePool } from '../backend/src/dataAccess/mysqlConnection.js';

async function runDuplicateAudit() {
  console.log('=== READ-ONLY CUSTOMER DUPLICATE AUDIT REPORT ===\n');

  const customerRepo = createRepository('customers');
  const orderRepo = createRepository('orders');

  const customers = await customerRepo.list();
  const orders = await orderRepo.list();

  console.log(`Total Customer Records in DB: ${customers.length}`);
  console.log(`Total Order Records in DB: ${orders.length}\n`);

  // Group by normalized 10-digit mobile
  const mobileMap = new Map();
  // Group by normalized non-empty email
  const emailMap = new Map();

  function getMobile10(val) {
    if (!val) return '';
    return String(val).replace(/\D/g, '').slice(-10);
  }

  for (const c of customers) {
    const mob10 = getMobile10(c.phone || c.mobile);
    if (mob10) {
      if (!mobileMap.has(mob10)) mobileMap.set(mob10, []);
      mobileMap.get(mob10).push(c);
    }

    const email = String(c.email || '').trim().toLowerCase();
    if (email) {
      if (!emailMap.has(email)) emailMap.set(email, []);
      emailMap.get(email).push(c);
    }
  }

  console.log('--- DUPLICATE PHONE GROUPS ---');
  let dupPhoneGroupCount = 0;
  for (const [phone, group] of mobileMap.entries()) {
    if (group.length > 1) {
      dupPhoneGroupCount++;
      console.log(`\nPhone: +91${phone} (${group.length} records):`);
      for (const c of group) {
        const custOrders = orders.filter((o) => o.customerId === c.id || o.customer_id === c.id);
        console.log(`  - ID: ${c.id} | Name: "${c.fullName || c.name}" | Email: "${c.email}" | Created: ${c.createdAt} | Orders: ${custOrders.length}`);
      }
    }
  }

  if (dupPhoneGroupCount === 0) {
    console.log('  No duplicate phone groups found.');
  }

  console.log('\n--- DUPLICATE EMAIL GROUPS ---');
  let dupEmailGroupCount = 0;
  for (const [email, group] of emailMap.entries()) {
    if (group.length > 1) {
      dupEmailGroupCount++;
      console.log(`\nEmail: ${email} (${group.length} records):`);
      for (const c of group) {
        const custOrders = orders.filter((o) => o.customerId === c.id || o.customer_id === c.id);
        console.log(`  - ID: ${c.id} | Name: "${c.fullName || c.name}" | Phone: "${c.phone || c.mobile}" | Created: ${c.createdAt} | Orders: ${custOrders.length}`);
      }
    }
  }

  if (dupEmailGroupCount === 0) {
    console.log('  No duplicate email groups found.');
  }

  console.log('\n=== END OF AUDIT REPORT ===');
}

runDuplicateAudit()
  .then(async () => {
    await closePool();
  })
  .catch(async (err) => {
    console.error('Audit Error:', err);
    await closePool();
  });
