const crypto = require('crypto');

console.log('\n🔐 Secure Credential Generator\n');
console.log('='.repeat(60));

// Generate JWT Secret
const jwtSecret = crypto.randomBytes(64).toString('hex');
console.log('\n1. JWT_SECRET (64 bytes):');
console.log(jwtSecret);

// Generate JWT Refresh Secret
const jwtRefreshSecret = crypto.randomBytes(64).toString('hex');
console.log('\n2. JWT_REFRESH_SECRET (64 bytes):');
console.log(jwtRefreshSecret);

// Generate Session Secret
const sessionSecret = crypto.randomBytes(32).toString('hex');
console.log('\n3. SESSION_SECRET (32 bytes):');
console.log(sessionSecret);

// Generate Webhook Secret
const webhookSecret = crypto.randomBytes(32).toString('hex');
console.log('\n4. WEBHOOK_SECRET (32 bytes):');
console.log(webhookSecret);

// Generate strong password
const password = crypto.randomBytes(24).toString('base64');
console.log('\n5. STRONG_PASSWORD (24 bytes, base64):');
console.log(password);

console.log('\n' + '='.repeat(60));
console.log('\n✅ Copy these values to your .env file');
console.log('⚠️  NEVER commit these to version control');
console.log('🔒 Store securely in a password manager\n');
