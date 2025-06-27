#!/usr/bin/env node
/* Copyright (C) 2024 NooBaa */
'use strict';

const fs = require('fs');
const path = require('path');
const nb_native = require('../../util/nb_native');
const { get_process_fs_context } = require('../../util/native_fs_utils');

// Enhanced diagnostic script for stat issues
async function diagnose_stat_issue(target_path) {
    console.log('='.repeat(60));
    console.log('🔍 DIAGNOSTIC SCRIPT FOR STAT ISSUES');
    console.log('='.repeat(60));
    console.log(`Target path: ${target_path}`);
    console.log(`Process UID: ${process.getuid()}, GID: ${process.getgid()}`);
    console.log(`Working directory: ${process.cwd()}`);
    console.log('');

    // Step 1: Check if path exists using Node.js fs
    console.log('📁 Step 1: Check path existence with Node.js fs');
    try {
        const exists = await fs.promises.access(target_path, fs.constants.F_OK).then(() => true).catch(() => false);
        console.log(`   Path exists (Node.js fs.access): ${exists}`);
        
        if (exists) {
            try {
                const node_stat = await fs.promises.stat(target_path);
                console.log(`   Node.js fs.stat SUCCESS:`);
                console.log(`     - Size: ${node_stat.size}`);
                console.log(`     - Mode: ${node_stat.mode.toString(8)} (${node_stat.isDirectory() ? 'directory' : 'file'})`);
                console.log(`     - UID: ${node_stat.uid}, GID: ${node_stat.gid}`);
                console.log(`     - Inode: ${node_stat.ino}`);
                console.log(`     - Device: ${node_stat.dev}`);
                console.log(`     - Links: ${node_stat.nlink}`);
            } catch (err) {
                console.log(`   Node.js fs.stat FAILED: ${err.code} - ${err.message}`);
            }
        }
    } catch (err) {
        console.log(`   Error checking existence: ${err.message}`);
    }
    console.log('');

    // Step 2: Check filesystem type and mount info
    console.log('🗂️  Step 2: Check filesystem information');
    try {
        const { execSync } = require('child_process');
        
        // Get mount information
        try {
            const mount_info = execSync(`df -T "${target_path}" 2>/dev/null || true`, { encoding: 'utf8' });
            console.log(`   Mount info:\n${mount_info}`);
        } catch (err) {
            console.log(`   Could not get mount info: ${err.message}`);
        }

        // Get detailed file info
        try {
            const file_info = execSync(`ls -la "${target_path}" 2>/dev/null || true`, { encoding: 'utf8' });
            console.log(`   File details:\n${file_info}`);
        } catch (err) {
            console.log(`   Could not get file details: ${err.message}`);
        }

        // Check if it's a mountpoint
        try {
            const mountpoint_check = execSync(`mountpoint "${target_path}" 2>/dev/null || echo "Not a mountpoint"`, { encoding: 'utf8' });
            console.log(`   Mountpoint check: ${mountpoint_check.trim()}`);
        } catch (err) {
            console.log(`   Could not check mountpoint: ${err.message}`);
        }

    } catch (err) {
        console.log(`   Error getting filesystem info: ${err.message}`);
    }
    console.log('');

    // Step 3: Test permissions
    console.log('🔒 Step 3: Check permissions');
    try {
        const parent_dir = path.dirname(target_path);
        console.log(`   Parent directory: ${parent_dir}`);
        
        // Check parent directory permissions
        try {
            await fs.promises.access(parent_dir, fs.constants.R_OK);
            console.log(`   Parent directory readable: YES`);
        } catch (err) {
            console.log(`   Parent directory readable: NO (${err.code})`);
        }

        try {
            await fs.promises.access(target_path, fs.constants.R_OK);
            console.log(`   Target path readable: YES`);
        } catch (err) {
            console.log(`   Target path readable: NO (${err.code})`);
        }

    } catch (err) {
        console.log(`   Error checking permissions: ${err.message}`);
    }
    console.log('');

    // Step 4: Test NooBaa native fs operations
    console.log('🔧 Step 4: Test NooBaa native fs operations');
    const fs_context = get_process_fs_context();
    console.log(`   FS Context: ${JSON.stringify(fs_context)}`);
    
    // Test on parent directory first
    const parent_dir = path.dirname(target_path);
    console.log(`   Testing parent directory: ${parent_dir}`);
    try {
        const parent_stat = await nb_native().fs.stat(fs_context, parent_dir);
        console.log(`   Parent stat SUCCESS: size=${parent_stat.size}, mode=${parent_stat.mode.toString(8)}`);
    } catch (err) {
        console.log(`   Parent stat FAILED: ${err.code} - ${err.message}`);
        if (err.stack) {
            console.log(`   Stack trace: ${err.stack}`);
        }
    }

    // Test the target path
    console.log(`   Testing target path: ${target_path}`);
    try {
        const target_stat = await nb_native().fs.stat(fs_context, target_path);
        console.log(`   ✅ Target stat SUCCESS:`);
        console.log(`     - Size: ${target_stat.size}`);
        console.log(`     - Mode: ${target_stat.mode.toString(8)}`);
        console.log(`     - UID: ${target_stat.uid}, GID: ${target_stat.gid}`);
        console.log(`     - Inode: ${target_stat.ino}`);
        console.log(`     - Device: ${target_stat.dev}`);
        console.log(`     - atime: ${target_stat.atime}`);
        console.log(`     - mtime: ${target_stat.mtime}`);
        console.log(`     - ctime: ${target_stat.ctime}`);
        
        if (target_stat.xattr) {
            console.log(`     - Extended attributes: ${JSON.stringify(target_stat.xattr)}`);
        }
        
    } catch (err) {
        console.log(`   ❌ Target stat FAILED: ${err.code} - ${err.message}`);
        console.log(`   Error details:`);
        console.log(`     - errno: ${err.errno}`);
        console.log(`     - syscall: ${err.syscall}`);
        console.log(`     - path: ${err.path}`);
        
        if (err.stack) {
            console.log(`   Stack trace:`);
            console.log(err.stack);
        }
        
        // Try different stat options
        console.log(`   Trying with different options...`);
        
        try {
            const lstat_result = await nb_native().fs.stat(fs_context, target_path, { use_lstat: true });
            console.log(`   lstat SUCCESS: ${JSON.stringify(lstat_result, null, 2)}`);
        } catch (lstat_err) {
            console.log(`   lstat FAILED: ${lstat_err.code} - ${lstat_err.message}`);
        }
        
        try {
            const no_xattr_result = await nb_native().fs.stat(fs_context, target_path, { skip_user_xattr: true });
            console.log(`   stat without xattr SUCCESS: ${JSON.stringify(no_xattr_result, null, 2)}`);
        } catch (no_xattr_err) {
            console.log(`   stat without xattr FAILED: ${no_xattr_err.code} - ${no_xattr_err.message}`);
        }
    }
    console.log('');

    // Step 5: Test other native fs operations
    console.log('🧪 Step 5: Test other native fs operations');
    
    // Test readdir on parent
    try {
        const parent_dir = path.dirname(target_path);
        const entries = await nb_native().fs.readdir(fs_context, parent_dir);
        const target_name = path.basename(target_path);
        const found_entry = entries.find(entry => entry.name === target_name);
        
        console.log(`   Parent directory listing: ${entries.length} entries`);
        if (found_entry) {
            console.log(`   Target found in parent listing: ${JSON.stringify(found_entry)}`);
        } else {
            console.log(`   Target NOT found in parent listing`);
            console.log(`   Looking for: "${target_name}"`);
            console.log(`   Available entries: ${entries.map(e => `"${e.name}"`).join(', ')}`);
        }
    } catch (err) {
        console.log(`   Parent readdir FAILED: ${err.code} - ${err.message}`);
    }
    
    console.log('');
    console.log('='.repeat(60));
    console.log('🏁 DIAGNOSTIC COMPLETE');
    console.log('='.repeat(60));
}

// Main execution
async function main() {
    const target_path = process.argv[2];
    
    if (!target_path) {
        console.error('Usage: node diagnose_stat_issue.js <path>');
        console.error('Example: node diagnose_stat_issue.js /nsfs/dingofs-nsfs/tsinghua-bucket');
        process.exit(1);
    }
    
    try {
        await diagnose_stat_issue(target_path);
    } catch (err) {
        console.error('Diagnostic script failed:', err);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { diagnose_stat_issue };
