require('dotenv').config();
const axios = require('axios');

async function testAnthropic() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    console.log('🔑 API Key loaded:', apiKey ? apiKey.substring(0, 20) + '...' : 'NOT FOUND');
    
    if (!apiKey || apiKey.includes('YOUR_')) {
        console.error('❌ Error: API key not properly set in .env file');
        console.error('   Please edit .env and add your actual Anthropic API key');
        process.exit(1);
    }
    
    try {
        console.log('📡 Testing Anthropic API...');
        
        const response = await axios.post(
            'https://api.anthropic.com/v1/messages',
            {
                model: 'claude-sonnet-4-5',
                max_tokens: 20,
                messages: [{ role: 'user', content: 'Say hello in one word' }]
            },
            {
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json'
                }
            }
        );
        
        console.log('✅ SUCCESS! API is working!');
        console.log('📝 Response:', response.data.content[0].text);
        console.log('📊 Tokens used:', response.data.usage);
        
    } catch (error) {
        console.error('❌ API Test Failed!');
        console.error('   Status:', error.response?.status);
        console.error('   Error:', error.response?.data?.error?.message || error.message);
        console.error('');
        console.error('   Common fixes:');
        console.error('   1. Check API key is correct in .env file');
        console.error('   2. Check you have credits in Anthropic account');
        console.error('   3. Check API key hasn\'t expired');
        console.error('   4. Restart gateway after changing .env');
        process.exit(1);
    }
}

testAnthropic();
