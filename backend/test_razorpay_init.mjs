(async () => {
  try {
    await import('./env.js');
    const mod = await import('./config/razorpay.js');
    const r = mod.default;
    console.log('--- RAZORPAY INIT CHECK ---');
    console.log('RAZORPAY_KEY_ID present:', !!(mod.razorpayKeyId && String(mod.razorpayKeyId).trim()));
    console.log('razorpay default export is null:', r === null);
    console.log('razorpay type:', typeof r);
    console.log('razorpay has orders method:', !!(r && r.orders && typeof r.orders.create === 'function'));
    console.log('razorpayKeyId value (masked):', mod.razorpayKeyId ? String(mod.razorpayKeyId).slice(0,6) + '...' : 'missing');
  } catch (err) {
    console.error('TEST ERROR:', err && err.message);
    process.exit(2);
  }
  process.exit(0);
})();
