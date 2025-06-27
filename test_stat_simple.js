#!/usr/bin/env node
/**
 * Simple stat test that works from noobaa-core project root
 * Usage: node test_stat_simple.js [directory_path]
 */

// Get the directory to test from command line args
const test_directory = process.argv[2] || '/tmp';

console.log('Loading NooBaa native modules...');

try {
    // Load required modules with proper paths
    const nb_native = require('./src/util/nb_native');
    const native_fs_utils = require('./src/util/native_fs_utils');
    
    console.log('✅ Modules loaded successfully');
    
    async function test_stat() {
        console.log(`\n🔍 Testing stat on: ${test_directory}`);
        
        // Get filesystem context
        const fs_context = native_fs_utils.get_process_fs_context();
        console.log('FS Context:', {
            uid: fs_context.uid,
            gid: fs_context.gid,
            backend: fs_context.backend || 'default'
        });
        
        try {
            console.log('\n⏱️  Starting stat operation...');
            const start_time = Date.now();
            
            const stat_result = await nb_native().fs.stat(fs_context, test_directory);
            
            const end_time = Date.now();
            const duration = end_time - start_time;
            
            console.log(`✅ SUCCESS! (${duration}ms)`);
            console.log('\n📊 Results:');
            console.log(`  Size: ${stat_result.size} bytes`);
            console.log(`  Mode: 0${stat_result.mode.toString(8)}`);
            console.log(`  UID: ${stat_result.uid}`);
            console.log(`  GID: ${stat_result.gid}`);
            console.log(`  Inode: ${stat_result.ino}`);
            console.log(`  Device: ${stat_result.dev}`);
            console.log(`  Links: ${stat_result.nlink}`);
            
            // Check if it's a directory
            const S_IFMT = 0o170000;
            const S_IFDIR = 0o040000;
            const is_directory = (stat_result.mode & S_IFMT) === S_IFDIR;
            console.log(`  Type: ${is_directory ? 'Directory' : 'File'}`);
            
            console.log('\n🕐 Timestamps:');
            console.log(`  Access: ${stat_result.atime}`);
            console.log(`  Modify: ${stat_result.mtime}`);
            console.log(`  Change: ${stat_result.ctime}`);
            
            if (stat_result.xattr && Object.keys(stat_result.xattr).length > 0) {
                console.log('\n🏷️  Extended Attributes:');
                for (const [key, value] of Object.entries(stat_result.xattr)) {
                    console.log(`  ${key}: ${value}`);
                }
            } else {
                console.log('\n🏷️  No extended attributes');
            }
            
            return stat_result;
            
        } catch (error) {
            console.log(`\n❌ FAILED: ${error.message}`);
            console.log(`Error Code: ${error.code}`);
            
            // Specific diagnostics
            if (error.code === 'EIO') {
                console.log('\n🔬 EIO Error Analysis:');
                console.log('- Input/Output error detected');
                console.log('- This typically indicates filesystem or storage issues');
                console.log('- For dingofs: check if the distributed filesystem is healthy');
                console.log('- Try: stat command directly in shell');
                console.log(`- Command: stat "${test_directory}"`);
            } else if (error.code === 'ENOENT') {
                console.log('\n📁 Path does not exist');
            } else if (error.code === 'EACCES') {
                console.log('\n🔒 Permission denied');
                console.log(`- Current UID: ${fs_context.uid}`);
                console.log(`- Current GID: ${fs_context.gid}`);
            }
            
            throw error;
        }
    }
    
    // Run the test
    test_stat()
        .then(() => {
            console.log('\n🎯 Test completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.log('\n💥 Test failed');
            console.error('Full error details:', error);
            process.exit(1);
        });
        
} catch (module_error) {
    console.log('❌ Failed to load modules:', module_error.message);
    console.log('\n🛠️  Troubleshooting:');
    console.log('1. Make sure you are in the noobaa-core project root directory');
    console.log('2. Run: npm install');
    console.log('3. Try: npm run build');
    console.log('4. Check if native modules are compiled properly');
    process.exit(1);
}
