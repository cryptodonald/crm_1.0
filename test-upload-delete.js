const { put, del } = require('@vercel/blob');

async function testUploadAndDelete() {
  console.log('🧪 Testing upload + immediate delete...');
  
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  
  if (!token) {
    throw new Error('❌ BLOB_READ_WRITE_TOKEN environment variable is required!');
  }
  
  try {
    // Step 1: Upload a file
    console.log('📤 Uploading test file...');
    const testContent = Buffer.from('test content for delete');
    const testFile = new File([testContent], 'test-immediate-delete.txt', { type: 'text/plain' });
    
    const blob = await put('test-orders/test-immediate-delete.txt', testFile, {
      access: 'public',
      token: token,
    });
    
    console.log(`✅ File uploaded: ${blob.url}`);
    
    // Step 2: Immediately try to delete it
    console.log('🗑️ Attempting immediate delete...');
    
    await del(blob.url, { token: token });
    
    console.log('✅ File deleted successfully!');
    
    return {
      success: true,
      url: blob.url,
      message: 'Upload and delete worked perfectly'
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.message,
      details: error
    };
  }
}

testUploadAndDelete().then(result => {
  console.log('🏁 Test result:', result);
  process.exit(result.success ? 0 : 1);
});