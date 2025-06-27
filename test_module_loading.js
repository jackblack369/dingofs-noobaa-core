#!/usr/bin/env node
/**
 * Simple module loading test
 */

console.log('Current working directory:', process.cwd());
console.log('Testing module loading...');

try {
    console.log('1. Testing nb_native module...');
    const nb_native = require('./src/util/nb_native');
    console.log('✅ nb_native loaded successfully');
    
    console.log('2. Testing native_fs_utils module...');
    const native_fs_utils = require('./src/util/native_fs_utils');
    console.log('✅ native_fs_utils loaded successfully');
    
    console.log('3. Testing fs context creation...');
    const fs_context = native_fs_utils.get_process_fs_context();
    console.log('✅ FS context created:', {
        uid: fs_context.uid,
        gid: fs_context.gid,
        backend: fs_context.backend
    });
    
    console.log('4. Testing basic fs operations...');
    const nb = nb_native();
    if (nb.fs) {
        console.log('✅ Native FS module accessible');
        
        console.log('5. Testing stat function on current directory...');
        nb.fs.stat(fs_context, '.')
            .then(result => {
                console.log('✅ Stat operation successful!');
                console.log('Directory info:', {
                    size: result.size,
                    mode: '0' + result.mode.toString(8),
                    uid: result.uid,
                    gid: result.gid
                });
                
                console.log('\n🎯 All tests passed! Now try your directory:');
                console.log('node test_module_loading.js stat /nsfs/dingofs-nsfs/tsinghua-bucket');
            })
            .catch(error => {
                console.log('❌ Stat operation failed:', error.message);
                process.exit(1);
            });
    } else {
        console.log('❌ Native FS module not available');
        process.exit(1);
    }
    
} catch (error) {
    console.log('❌ Module loading failed:', error.message);
    console.log('Full error:', error);
    
    console.log('\n🔍 Debugging info:');
    console.log('Node.js version:', process.version);
    console.log('Platform:', process.platform);
    console.log('Architecture:', process.arch);
    
    console.log('\n🛠️ Possible solutions:');
    console.log('1. Make sure you run this from the noobaa-core directory');
    console.log('2. Try: cd /mnt/disk4/dongwei/code/noobaa-core');
    console.log('3. Try: npm install');
    console.log('4. Try: make native');
    
    process.exit(1);
}

// If command line argument provided, test stat on that path
if (process.argv[2] === 'stat' && process.argv[3]) {
    console.log('\n6. Testing stat on provided path...');
    const test_path = process.argv[3];
    
    setTimeout(() => {
        const nb_native = require('./src/util/nb_native');
        const native_fs_utils = require('./src/util/native_fs_utils');
        const fs_context = native_fs_utils.get_process_fs_context();
        
        console.log(`Testing stat on: ${test_path}`);
        
        nb_native().fs.stat(fs_context, test_path)
            .then(result => {
                console.log('✅ Stat successful!');
                console.log('Result:', {
                    size: result.size,
                    mode: '0' + result.mode.toString(8),
                    uid: result.uid,
                    gid: result.gid,
                    type: (result.mode & 0o170000) === 0o040000 ? 'directory' : 'file'
                });
            })
            .catch(error => {
                console.log('❌ Stat failed:', error.code, error.message);
                
                if (error.code === 'EIO') {
                    console.log('🔬 EIO Error detected - filesystem issue');
                    console.log('Try these commands to debug:');
                    console.log(`stat "${test_path}"`);
                    console.log(`ls -la "${test_path}"`);
                    console.log('dmesg | tail -20');
                }
            });
    }, 100);
}
