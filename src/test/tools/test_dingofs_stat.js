#!/usr/bin/env node
'use strict';

/**
 * Quick test script to diagnose the EIO error with dingofs-nsfs
 * Usage: node test_dingofs_stat.js
 */

const nb_native = require('../../util/nb_native');
const { get_process_fs_context } = require('../../util/native_fs_utils');

async function test_dingofs_bucket() {
    const bucket_path = '/nsfs/dingofs-nsfs/tsinghua-bucket';
    const fs_context = get_process_fs_context();
    
    console.log('🔍 Testing dingofs bucket stat operation');
    console.log(`Target path: ${bucket_path}`);
    console.log('FS Context:', fs_context);
    
    // Test 1: Check if path exists using basic Node.js
    console.log('\n📋 Test 1: Basic Node.js stat');
    try {
        const fs = require('fs');
        const node_stat = await fs.promises.stat(bucket_path);
        console.log('✅ Node.js stat succeeded');
        console.log(`  - Size: ${node_stat.size}`);
        console.log(`  - Mode: 0${node_stat.mode.toString(8)}`);
        console.log(`  - UID: ${node_stat.uid}, GID: ${node_stat.gid}`);
    } catch (error) {
        console.log('❌ Node.js stat failed');
        console.log(`  - Error: ${error.code} - ${error.message}`);
    }
    
    // Test 2: Test NooBaa native stat
    console.log('\n📋 Test 2: NooBaa native stat');
    try {
        const start_time = process.hrtime.bigint();
        const stat_result = await nb_native().fs.stat(fs_context, bucket_path);
        const end_time = process.hrtime.bigint();
        const duration_ms = Number(end_time - start_time) / 1000000;
        
        console.log('✅ NooBaa native stat succeeded');
        console.log(`  - Duration: ${duration_ms.toFixed(2)}ms`);
        console.log(`  - Size: ${stat_result.size}`);
        console.log(`  - Mode: 0${stat_result.mode.toString(8)}`);
        console.log(`  - UID: ${stat_result.uid}, GID: ${stat_result.gid}`);
        console.log(`  - Inode: ${stat_result.ino}`);
        console.log(`  - Device: ${stat_result.dev}`);
        
        if (stat_result.xattr && Object.keys(stat_result.xattr).length > 0) {
            console.log('  - Extended attributes found:');
            Object.entries(stat_result.xattr).forEach(([key, value]) => {
                console.log(`    ${key}: ${value}`);
            });
        }
        
    } catch (error) {
        console.log('❌ NooBaa native stat failed');
        console.log(`  - Error code: ${error.code}`);
        console.log(`  - Error message: ${error.message}`);
        console.log(`  - Full error:`, error);
        
        // Provide specific diagnostics for EIO
        if (error.code === 'EIO') {
            console.log('\n🔬 EIO Error Diagnostics:');
            console.log('This indicates a low-level I/O error. Possible causes:');
            console.log('1. Distributed filesystem (dingofs) connectivity issues');
            console.log('2. Storage backend problems');
            console.log('3. Network storage timeout');
            console.log('4. Filesystem metadata corruption');
            console.log('5. Hardware/driver issues');
            
            console.log('\n🛠️  Suggested debugging steps:');
            console.log('1. Check dingofs service status');
            console.log('2. Check system logs: dmesg | grep -i "i/o error"');
            console.log('3. Check mount status: findmnt /nsfs/dingofs-nsfs');
            console.log('4. Test basic file operations in the parent directory');
            console.log('5. Check filesystem health with fsck (if applicable)');
        }
    }
    
    // Test 3: Test parent directory
    console.log('\n📋 Test 3: Parent directory stat');
    const parent_path = '/nsfs/dingofs-nsfs';
    try {
        const parent_stat = await nb_native().fs.stat(fs_context, parent_path);
        console.log('✅ Parent directory stat succeeded');
        console.log(`  - Size: ${parent_stat.size}`);
        console.log(`  - Mode: 0${parent_stat.mode.toString(8)}`);
    } catch (error) {
        console.log('❌ Parent directory stat failed');
        console.log(`  - Error: ${error.code} - ${error.message}`);
    }
    
    // Test 4: Test with different options
    console.log('\n📋 Test 4: Stat with different options');
    try {
        const stat_no_xattr = await nb_native().fs.stat(fs_context, bucket_path, {
            skip_user_xattr: true
        });
        console.log('✅ Stat with skip_user_xattr succeeded');
    } catch (error) {
        console.log('❌ Stat with skip_user_xattr failed');
        console.log(`  - Error: ${error.code} - ${error.message}`);
    }
    
    // Test 5: Test lstat
    console.log('\n📋 Test 5: lstat (symlink-aware stat)');
    try {
        const lstat_result = await nb_native().fs.stat(fs_context, bucket_path, {
            use_lstat: true
        });
        console.log('✅ lstat succeeded');
        
        // Check if it's a symlink
        const S_IFMT = 0o170000;
        const S_IFLNK = 0o120000;
        const is_symlink = (lstat_result.mode & S_IFMT) === S_IFLNK;
        console.log(`  - Is symlink: ${is_symlink}`);
        
    } catch (error) {
        console.log('❌ lstat failed');
        console.log(`  - Error: ${error.code} - ${error.message}`);
    }
}

// Run the test
async function main() {
    try {
        await test_dingofs_bucket();
        console.log('\n🎯 Test completed');
    } catch (error) {
        console.log('\n💥 Test script failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { test_dingofs_bucket };
