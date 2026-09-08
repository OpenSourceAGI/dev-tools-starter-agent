import verifyPhone from '../src/verify-phone';

// Basic usage with custom code
const result = await verifyPhone({
    phoneNumber: '+1234567890',
    code: 'ABC123',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    awsRegion: 'us-east-1',
    blockVoip: true,
    senderId: 'MyApp',
    messageTemplate: 'MyApp: Your code is {code}. Valid for 10 minutes.'
});

if (result.success) {
    console.log('SMS sent successfully:', result.messageId);
    console.log('Code sent:', result.code);
} else {
    console.error('Failed to send SMS:', result.error);
}
