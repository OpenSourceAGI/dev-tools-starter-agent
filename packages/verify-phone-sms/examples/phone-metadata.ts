import { parsePhoneNumber, getNumberType } from 'libphonenumber-js';

// Test the metadata functionality
console.log('=== Testing libphonenumber-js Metadata Functionality ===\n');

// Test 1: US toll-free number
console.log('Test 1: US Toll-free number (+1-800-555-0123)');
try {
    const phone1 = parsePhoneNumber('+1-800-555-0123');
    console.log('  Parsed:', phone1 ? 'Success' : 'Failed');
    console.log('  Valid:', phone1?.isValid());
    console.log('  Country:', phone1?.country);
    console.log('  National Number:', phone1?.nationalNumber);
    console.log('  Non-geographic:', phone1?.isNonGeographic());
    
    // Test getNumberType (requires full metadata)
    try {
        const type1 = getNumberType('+1-800-555-0123');
        console.log('  Number Type:', type1);
    } catch (error) {
        console.log('  Number Type: Error -', error.message);
    }
} catch (error) {
    console.log('  Parse Error:', error.message);
}

console.log('\n---\n');

// Test 2: US mobile number
console.log('Test 2: US Mobile number (+1-555-123-4567)');
try {
    const phone2 = parsePhoneNumber('+1-555-123-4567');
    console.log('  Parsed:', phone2 ? 'Success' : 'Failed');
    console.log('  Valid:', phone2?.isValid());
    console.log('  Country:', phone2?.country);
    console.log('  National Number:', phone2?.nationalNumber);
    console.log('  Non-geographic:', phone2?.isNonGeographic());
    
    try {
        const type2 = getNumberType('+1-555-123-4567');
        console.log('  Number Type:', type2);
    } catch (error) {
        console.log('  Number Type: Error -', error.message);
    }
} catch (error) {
    console.log('  Parse Error:', error.message);
}

console.log('\n---\n');

// Test 3: UK number
console.log('Test 3: UK number (+44 20 7946 0958)');
try {
    const phone3 = parsePhoneNumber('+44 20 7946 0958');
    console.log('  Parsed:', phone3 ? 'Success' : 'Failed');
    console.log('  Valid:', phone3?.isValid());
    console.log('  Country:', phone3?.country);
    console.log('  National Number:', phone3?.nationalNumber);
    console.log('  Non-geographic:', phone3?.isNonGeographic());
    
    try {
        const type3 = getNumberType('+44 20 7946 0958');
        console.log('  Number Type:', type3);
    } catch (error) {
        console.log('  Number Type: Error -', error.message);
    }
} catch (error) {
    console.log('  Parse Error:', error.message);
}

console.log('\n=== Metadata Test Complete ===');
console.log('\nNote: Number type detection may return undefined with minimal metadata.');
console.log('Use metadataType: "full" for better phone number type detection.');
