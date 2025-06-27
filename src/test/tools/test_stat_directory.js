#!/usr/bin/env node
'use strict';

/**
 * Simple test script to test the Stat function on a specific directory
 * Usage: node test_stat_directory.js [directory_path]
 */

// Fix module paths for execution from project root
const path = require('path');
const project_root = path.resolve(__dirname, '../../..');
const nb_native = require(path.join(project_root, 'src/util/nb_native'));
const { get_process_fs_context } = require(path.join(project_root, 'src/util/native_fs_utils'));

async function test_stat_directory(directory_path) {
    const fs_context = get_process_fs_context();
    
    console.log(`Testing stat on directory: ${directory_path}`);
    console.log('FS Context:', {
        uid: fs_context.uid,
        gid: fs_context.gid,
        backend: fs_context.backend
    });
    
    try {
        const start_time = Date.now();
        const stat_result = await nb_native().fs.stat(fs_context, directory_path, {
            use_lstat: true, // Uncomment if you want to use lstat
            skip_user_xattr: true // Skip user extended attributes for simplicity
        });
        const end_time = Date.now();
        
        console.log('\n✅ SUCCESS: Stat operation completed');
        console.log(`⏱️  Time taken: ${end_time - start_time}ms`);
        console.log('\n📊 Stat Results:');
        console.log('Basic Info:');
        console.log(`  - Size: ${stat_result.size} bytes`);
        console.log(`  - Mode: 0${stat_result.mode.toString(8)} (${is_directory(stat_result) ? 'directory' : 'file'})`);
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
        
        console.log('\nHigh-resolution timestamps:');
        console.log(`  - Access time (ns): ${stat_result.atimeNsBigint}`);
        console.log(`  - Modify time (ns): ${stat_result.mtimeNsBigint}`);
        console.log(`  - Change time (ns): ${stat_result.ctimeNsBigint}`);
        
        console.log('\nExtended Attributes:');
        if (stat_result.xattr && Object.keys(stat_result.xattr).length > 0) {
            Object.entries(stat_result.xattr).forEach(([key, value]) => {
                console.log(`  - ${key}: ${value}`);
            });
        } else {
            console.log('  - No extended attributes found');
        }
        
        return stat_result;
        
    } catch (error) {
        console.log('\n❌ ERROR: Stat operation failed');
        console.log(`Error code: ${error.code}`);
        console.log(`Error message: ${error.message}`);
        console.log('Error details:', error);
        
        // Provide diagnostics
        console.log('\n🔍 Diagnostics:');
        if (error.code === 'EIO') {
            console.log('- EIO (Input/output error): Likely filesystem or storage issue');
            console.log('- Check if the filesystem is mounted properly');
            console.log('- Check for disk errors or network storage connectivity');
        } else if (error.code === 'ENOENT') {
            console.log('- ENOENT: Directory does not exist');
        } else if (error.code === 'EACCES') {
            console.log('- EACCES: Permission denied');
            console.log(`- Current UID: ${fs_context.uid}, GID: ${fs_context.gid}`);
        } else if (error.code === 'ENOTDIR') {
            console.log('- ENOTDIR: Path is not a directory');
        }
        
        throw error;
    }
}

function is_directory(stat) {
    const S_IFMT = 0o170000;
    const S_IFDIR = 0o040000;
    return (stat.mode & S_IFMT) === S_IFDIR;
}

// Main execution
async function main() {
    const directory_path = process.argv[2] || '/tmp';
    
    try {
        await test_stat_directory(directory_path);
        process.exit(0);
    } catch (error) {
        console.log('\n💥 Test failed with error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { test_stat_directory };
