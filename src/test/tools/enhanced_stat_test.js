#!/usr/bin/env node
/* Copyright (C) 2024 NooBaa */
'use strict';

const fs = require('fs');
const path = require('path');

// Enhanced stat test with detailed error reporting
async function enhanced_stat_test(target_path) {
    console.log('🎯 ENHANCED STAT TEST');
    console.log('='.repeat(50));
    console.log(`Target: ${target_path}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`PID: ${process.pid}, UID: ${process.getuid()}, GID: ${process.getgid()}`);
    console.log('');

    // Step 1: Basic Node.js fs checks
    console.log('📁 Node.js fs checks:');
    try {
        // Check existence
        await fs.promises.access(target_path, fs.constants.F_OK);
        console.log('  ✅ Path exists');
        
        // Standard stat
        const stat_result = await fs.promises.stat(target_path);
        console.log(`  ✅ Node.js stat: size=${stat_result.size}, mode=${stat_result.mode.toString(8)}`);
        console.log(`     isDirectory: ${stat_result.isDirectory()}, isFile: ${stat_result.isFile()}`);
        console.log(`     UID: ${stat_result.uid}, GID: ${stat_result.gid}, inode: ${stat_result.ino}`);
        
        // lstat (for symlinks)
        const lstat_result = await fs.promises.lstat(target_path);
        console.log(`  ✅ Node.js lstat: ${lstat_result.isSymbolicLink() ? 'symlink' : 'not symlink'}`);
        
    } catch (err) {
        console.log(`  ❌ Node.js checks failed: ${err.code} - ${err.message}`);
        return; // No point continuing if basic fs fails
    }
    console.log('');

    // Step 2: NooBaa native module test
    console.log('🔧 NooBaa native module test:');
    let nb_native, get_process_fs_context;
    try {
        nb_native = require('../../util/nb_native');
        const native_utils = require('../../util/native_fs_utils');
        get_process_fs_context = native_utils.get_process_fs_context;
        
        const fs_context = get_process_fs_context();
        console.log(`  FS Context: ${JSON.stringify(fs_context)}`);
        
        // Simple stat without options
        try {
            console.log('  Testing basic stat...');
            const native_stat = await nb_native().fs.stat(fs_context, target_path);
            console.log(`  ✅ NooBaa stat SUCCESS:`);
            console.log(`     size: ${native_stat.size}`);
            console.log(`     mode: ${native_stat.mode.toString(8)}`);
            console.log(`     UID: ${native_stat.uid}, GID: ${native_stat.gid}`);
            console.log(`     inode: ${native_stat.ino}`);
            console.log(`     device: ${native_stat.dev}`);
            console.log(`     atime: ${native_stat.atime}`);
            console.log(`     mtime: ${native_stat.mtime}`);
            console.log(`     ctime: ${native_stat.ctime}`);
            
            if (native_stat.xattr && Object.keys(native_stat.xattr).length > 0) {
                console.log(`     xattr keys: ${Object.keys(native_stat.xattr).join(', ')}`);
            } else {
                console.log(`     xattr: none or empty`);
            }
            
        } catch (err) {
            console.log(`  ❌ NooBaa stat FAILED: ${err.code} - ${err.message}`);
            console.log(`     errno: ${err.errno || 'undefined'}`);
            console.log(`     syscall: ${err.syscall || 'undefined'}`);
            console.log(`     path: ${err.path || 'undefined'}`);
            
            // Additional error details
            if (err.stack) {
                console.log(`     Stack trace:`);
                const stack_lines = err.stack.split('\n').slice(0, 5); // First 5 lines
                stack_lines.forEach(line => console.log(`       ${line}`));
            }

            // Try with different options to narrow down the issue
            console.log('  Trying with different options...');
            
            // Test 1: With lstat option
            try {
                console.log('    Testing with use_lstat=true...');
                const lstat_result = await nb_native().fs.stat(fs_context, target_path, { use_lstat: true });
                console.log(`    ✅ lstat option SUCCESS: mode=${lstat_result.mode.toString(8)}`);
            } catch (lstat_err) {
                console.log(`    ❌ lstat option FAILED: ${lstat_err.code} - ${lstat_err.message}`);
            }
            
            // Test 2: Without extended attributes
            try {
                console.log('    Testing with skip_user_xattr=true...');
                const no_xattr_result = await nb_native().fs.stat(fs_context, target_path, { skip_user_xattr: true });
                console.log(`    ✅ skip_user_xattr SUCCESS: mode=${no_xattr_result.mode.toString(8)}`);
            } catch (no_xattr_err) {
                console.log(`    ❌ skip_user_xattr FAILED: ${no_xattr_err.code} - ${no_xattr_err.message}`);
            }
            
            // Test 3: Both options
            try {
                console.log('    Testing with both use_lstat=true and skip_user_xattr=true...');
                const both_result = await nb_native().fs.stat(fs_context, target_path, { 
                    use_lstat: true, 
                    skip_user_xattr: true 
                });
                console.log(`    ✅ Both options SUCCESS: mode=${both_result.mode.toString(8)}`);
            } catch (both_err) {
                console.log(`    ❌ Both options FAILED: ${both_err.code} - ${both_err.message}`);
            }
        }
        
    } catch (module_err) {
        console.log(`  ❌ Module loading failed: ${module_err.message}`);
    }
    console.log('');

    // Step 3: Test parent directory
    console.log('📂 Parent directory test:');
    const parent_path = path.dirname(target_path);
    console.log(`  Parent: ${parent_path}`);
    
    try {
        
        const fs_context = get_process_fs_context();
        const lstat_options = { use_lstat: true }; 
        const parent_stat = await nb_native().fs.stat(fs_context, parent_path, lstat_options);
        console.log(`  ✅ Parent stat SUCCESS: mode=${parent_stat.mode.toString(8)}`);
        
        // List contents of parent to see if target exists
        try {
            const entries = await nb_native().fs.readdir(fs_context, parent_path);
            const target_name = path.basename(target_path);
            const found = entries.find(entry => entry.name === target_name);
            
            if (found) {
                console.log(`  ✅ Target found in parent listing: name=${found.name}`);
            } else {
                console.log(`  ❌ Target NOT found in parent listing`);
                console.log(`      Looking for: "${target_name}"`);
                console.log(`      Found ${entries.length} entries: ${entries.slice(0, 5).map(e => `"${e.name}"`).join(', ')}${entries.length > 5 ? '...' : ''}`);
            }
        } catch (readdir_err) {
            console.log(`  ❌ Parent readdir failed: ${readdir_err.code} - ${readdir_err.message}`);
        }
        
    } catch (err) {
        console.log(`  ❌ Parent stat failed: ${err.code} - ${err.message}`);
    }
    
    console.log('');
    console.log('🏁 TEST COMPLETE');
    console.log('='.repeat(50));
}

// Main execution
async function main() {
    const target_path = process.argv[2];
    
    if (!target_path) {
        console.error('Usage: node enhanced_stat_test.js <path>');
        console.error('Example: node enhanced_stat_test.js /nsfs/dingofs-nsfs/tsinghua-bucket');
        process.exit(1);
    }
    
    try {
        await enhanced_stat_test(target_path);
    } catch (err) {
        console.error('Test failed:', err);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { enhanced_stat_test };
