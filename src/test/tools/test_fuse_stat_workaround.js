#!/usr/bin/env node
'use strict';

/**
 * Test script with FUSE filesystem workaround
 * Usage: node test_fuse_stat_workaround.js [directory_path]
 */

const path = require('path');
const project_root = path.resolve(__dirname, '../../..');
const fuse_workaround = require(path.join(project_root, 'src/util/fuse_stat_workaround'));
const { get_process_fs_context } = require(path.join(project_root, 'src/util/native_fs_utils'));

async function test_fuse_stat_workaround(directory_path) {
    const fs_context = get_process_fs_context();
    
    console.log(`Testing FUSE stat workaround on: ${directory_path}`);
    console.log('FS Context:', {
        uid: fs_context.uid,
        gid: fs_context.gid,
        backend: fs_context.backend
    });
    
    try {
        console.log('\n🔍 Step 1: Check if FUSE filesystem');
        const is_fuse = await fuse_workaround.isFuseFilesystem(directory_path);
        console.log(`   FUSE filesystem: ${is_fuse}`);
        
        console.log('\n⚡ Step 2: Test enhanced stat function (with auto-fallback)');
        const start_time = Date.now();
        const stat_result = await fuse_workaround.stat(fs_context, directory_path);
        const end_time = Date.now();
        
        console.log('\n✅ SUCCESS: Enhanced stat operation completed');
        console.log(`⏱️  Time taken: ${end_time - start_time}ms`);
        
        console.log('\n📊 Stat Results:');
        console.log('Basic Info:');
        console.log(`  - Size: ${stat_result.size} bytes`);
        // eslint-disable-next-line no-bitwise
        const is_directory = (stat_result.mode & 0o170000) === 0o040000;
        console.log(`  - Mode: ${stat_result.mode.toString(8)} (${is_directory ? 'directory' : 'file'})`);
        console.log(`  - UID: ${stat_result.uid}`);
        console.log(`  - GID: ${stat_result.gid}`);
        console.log(`  - Inode: ${stat_result.ino}`);
        console.log(`  - Device: ${stat_result.dev}`);
        console.log(`  - Links: ${stat_result.nlink}`);
        
        console.log('\nTimestamps:');
        console.log(`  - Access time: ${stat_result.atime}`);
        console.log(`  - Modify time: ${stat_result.mtime}`);
        console.log(`  - Change time: ${stat_result.ctime}`);
        console.log(`  - Birth time: ${stat_result.birthtime}`);
        
        if (stat_result.atimeNsBigint) {
            console.log('\nHigh-resolution timestamps:');
            console.log(`  - Access time (ns): ${stat_result.atimeNsBigint}`);
            console.log(`  - Modify time (ns): ${stat_result.mtimeNsBigint}`);
            console.log(`  - Change time (ns): ${stat_result.ctimeNsBigint}`);
        }
        
        console.log('\nExtended Attributes:');
        if (stat_result.xattr && Object.keys(stat_result.xattr).length > 0) {
            for (const [key, value] of Object.entries(stat_result.xattr)) {
                console.log(`  - ${key}: ${value}`);
            }
        } else {
            console.log('  - No extended attributes found');
        }
        
        console.log('\n🎯 Test completed successfully!');
        console.log('✨ The FUSE workaround is working correctly.');
        
    } catch (error) {
        console.log('\n❌ ERROR: Enhanced stat operation failed');
        console.log(`Error: ${error.message}`);
        console.log(`Code: ${error.code}`);
        console.log(`Errno: ${error.errno}`);
        console.log(`Syscall: ${error.syscall}`);
        console.log(`Path: ${error.path}`);
        console.log('\nStack trace:');
        console.log(error.stack);
        
        process.exit(1);
    }
}

// Main execution
const directory_path = process.argv[2] || '.';
test_fuse_stat_workaround(directory_path)
    .catch(err => {
        console.error('Unexpected error:', err);
        process.exit(1);
    });
