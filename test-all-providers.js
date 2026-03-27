require('dotenv').config();
const { callAnthropic, callGoogle, callXAI, callDeepSeek } = require('./src/llm/providers');

async function testAllProviders() {
    const testMessage = 'Say hello in one word';
    const context = { systemPrompt: 'You are a helpful AI assistant.' };
    
    console.log('🧪 Testing All LLM Providers\n');
    console.log('=' .repeat(50));
    
    const results = {};
    
    // Test Anthropic
    try {
        console.log('\n🔵 Testing Anthropic (Claude)...');
        const anthropic = await callAnthropic('claude-3-haiku-20240307', testMessage, context);
        results.anthropic = { status: '✅ OK', response: anthropic.content.substring(0, 30) };
        console.log(`   Response: ${anthropic.content}`);
    } catch (error) {
        results.anthropic = { status: '❌ FAIL', error: error.message };
        console.log(`   Error: ${error.message}`);
    }
    
    // Test Google
    try {
        console.log('\n🟢 Testing Google (Gemini)...');
        const google = await callGoogle('gemini-2.5-pro', testMessage, context);
        results.google = { status: '✅ OK', response: google.content.substring(0, 30) };
        console.log(`   Response: ${google.content}`);
    } catch (error) {
        results.google = { status: '❌ FAIL', error: error.message };
        console.log(`   Error: ${error.message}`);
    }
    
    // Test XAI
    try {
        console.log('\n⚫ Testing XAI (Grok)...');
        const xai = await callXAI('grok-2', testMessage, context);
        results.xai = { status: '✅ OK', response: xai.content.substring(0, 30) };
        console.log(`   Response: ${xai.content}`);
    } catch (error) {
        results.xai = { status: '❌ FAIL', error: error.message };
        console.log(`   Error: ${error.message}`);
    }
    
    // Test DeepSeek
    try {
        console.log('\n🟡 Testing DeepSeek...');
        const deepseek = await callDeepSeek('deepseek-chat', testMessage, context);
        results.deepseek = { status: '✅ OK', response: deepseek.content.substring(0, 30) };
        console.log(`   Response: ${deepseek.content}`);
    } catch (error) {
        results.deepseek = { status: '❌ FAIL', error: error.message };
        console.log(`   Error: ${error.message}`);
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY');
    console.log('='.repeat(50));
    
    const providers = [
        { name: 'Anthropic (Claude)', key: 'anthropic', priority: 1 },
        { name: 'Google (Gemini)', key: 'google', priority: 2 },
        { name: 'XAI (Grok)', key: 'xai', priority: 3 },
        { name: 'DeepSeek', key: 'deepseek', priority: 4 }
    ];
    
    let workingCount = 0;
    
    for (const provider of providers) {
        const result = results[provider.key];
        const icon = result.status === '✅ OK' ? '✅' : '❌';
        console.log(`${icon} ${provider.priority}. ${provider.name}: ${result.status}`);
        if (result.status === '✅ OK') workingCount++;
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`📈 Working: ${workingCount}/${providers.length} providers`);
    console.log('='.repeat(50));
    
    if (workingCount === 0) {
        console.log('\n❌ CRITICAL: No providers working! Check API keys in .env');
        process.exit(1);
    } else if (workingCount === 1) {
        console.log('\n⚠️  WARNING: Only 1 provider working. Add more API keys for reliability.');
    } else {
        console.log('\n✅ GREAT: Multiple providers ready for failover!');
    }
}

testAllProviders().catch(console.error);
