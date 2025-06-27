#!/usr/bin/env node
/* Copyright (C) 2024 NooBaa */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Low-level filesystem diagnostic script
async function detailed_fs_diagnosis(target_path) {
    console.log('🔍 DETAILED FILESYSTEM DIAGNOSIS');
    console.log('='.repeat(80));
    console.log(`Target path: ${target_path}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Process: PID=${process.pid}, UID=${process.getuid()}, GID=${process.getgid()}`);
    console.log('');

    // Check if it's a symbolic link
    console.log('📎 SYMLINK CHECK');
    try {
        const lstat = await fs.promises.lstat(target_path);
        console.log(`Is symlink: ${lstat.isSymbolicLink()}`);
        if (lstat.isSymbolicLink()) {
            const target = await fs.promises.readlink(target_path);
            console.log(`Symlink target: ${target}`);
            
            // Check if target exists
            try {
                await fs.promises.access(target, fs.constants.F_OK);
                console.log(`Symlink target exists: YES`);
            } catch (err) {
                console.log(`Symlink target exists: NO (${err.code})`);
            }
        }
    } catch (err) {
        console.log(`Symlink check failed: ${err.code} - ${err.message}`);
    }
    console.log('');

    // Low-level file descriptor test
    console.log('🔧 FILE DESCRIPTOR TEST');
    const test_flags = [
        { name: 'O_RDONLY', value: 0 },
        { name: 'O_RDONLY | O_NOFOLLOW', value: 0x20000 },
        { name: 'O_PATH', value: 0x200000 },
        { name: 'O_PATH | O_NOFOLLOW', value: 0x200000 | 0x20000 },
    ];

    for (const flag of test_flags) {
        try {
            const fd = await new Promise((resolve, reject) => {
                const child = spawn('node', ['-e', `
                    const fs = require('fs');
                    try {
                        const fd = fs.openSync('${target_path}', ${flag.value});
                        console.log('fd:' + fd);
                        fs.closeSync(fd);
                    } catch (err) {
                        console.log('error:' + err.code + ':' + err.message);
                    }
                `], { stdio: 'pipe' });
                
                let output = '';
                child.stdout.on('data', (data) => {
                    output += data.toString();
                });
                
                child.on('close', (code) => {
                    resolve(output.trim());
                });
                
                child.on('error', reject);
            });
            
            console.log(`  ${flag.name}: ${fd}`);
        } catch (err) {
            console.log(`  ${flag.name}: ERROR - ${err.message}`);
        }
    }
    console.log('');

    // strace test
    console.log('📊 STRACE ANALYSIS');
    try {
        const strace_output = await new Promise((resolve, reject) => {
            const child = spawn('strace', ['-e', 'trace=openat,fstat,stat,lstat,getxattr,listxattr', 'stat', target_path], {
                stdio: 'pipe'
            });
            
            let stderr_output = '';
            let stdout_output = '';
            
            child.stdout.on('data', (data) => {
                stdout_output += data.toString();
            });
            
            child.stderr.on('data', (data) => {
                stderr_output += data.toString();
            });
            
            child.on('close', (code) => {
                resolve({ stdout: stdout_output, stderr: stderr_output, code });
            });
            
            child.on('error', reject);
        });
        
        console.log(`Strace exit code: ${strace_output.code}`);
        console.log('Strace stderr (system calls):');
        console.log(strace_output.stderr);
        console.log('Strace stdout (stat output):');
        console.log(strace_output.stdout);
    } catch (err) {
        console.log(`Strace failed: ${err.message}`);
    }
    console.log('');

    // Extended attributes check
    console.log('🏷️ EXTENDED ATTRIBUTES CHECK');
    try {
        const listxattr_output = await new Promise((resolve, reject) => {
            const child = spawn('getfattr', ['-d', target_path], {
                stdio: 'pipe'
            });
            
            let output = '';
            let error_output = '';
            
            child.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            child.stderr.on('data', (data) => {
                error_output += data.toString();
            });
            
            child.on('close', (code) => {
                resolve({ stdout: output, stderr: error_output, code });
            });
            
            child.on('error', reject);
        });
        
        console.log(`Extended attributes (getfattr):`);
        console.log(`Exit code: ${listxattr_output.code}`);
        if (listxattr_output.stdout) {
            console.log('Stdout:', listxattr_output.stdout);
        }
        if (listxattr_output.stderr) {
            console.log('Stderr:', listxattr_output.stderr);
        }
    } catch (err) {
        console.log(`Extended attributes check failed: ${err.message}`);
    }
    console.log('');

    // Check filesystem type and capabilities
    console.log('💾 FILESYSTEM INFORMATION');
    try {
        const mountinfo = await new Promise((resolve, reject) => {
            const child = spawn('findmnt', ['-T', target_path, '-o', 'SOURCE,TARGET,FSTYPE,OPTIONS'], {
                stdio: 'pipe'
            });
            
            let output = '';
            child.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            child.on('close', (code) => {
                resolve({ output, code });
            });
            
            child.on('error', reject);
        });
        
        console.log('Mount information:');
        console.log(mountinfo.output);
    } catch (err) {
        console.log(`Mount info failed: ${err.message}`);
    }
    
    // Check if the path is on a special filesystem
    try {
        const dfinfo = await new Promise((resolve, reject) => {
            const child = spawn('df', ['-T', target_path], {
                stdio: 'pipe'
            });
            
            let output = '';
            child.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            child.on('close', (code) => {
                resolve({ output, code });
            });
            
            child.on('error', reject);
        });
        
        console.log('Disk usage information:');
        console.log(dfinfo.output);
    } catch (err) {
        console.log(`df info failed: ${err.message}`);
    }
    console.log('');

    // Test native module with more details
    console.log('🔬 NATIVE MODULE DETAILED TEST');
    try {
        const nb_native = require('../../util/nb_native');
        const { get_process_fs_context } = require('../../util/native_fs_utils');
        
        const fs_context = get_process_fs_context();
        console.log(`FS Context: ${JSON.stringify(fs_context)}`);
        
        // Test with different options
        const test_cases = [
            { name: 'Default stat', options: {} },
            { name: 'Stat with lstat', options: { use_lstat: true } },
            { name: 'Stat without xattr', options: { skip_user_xattr: true } },
            { name: 'Stat with both flags', options: { use_lstat: true, skip_user_xattr: true } },
        ];
        
        for (const test_case of test_cases) {
            try {
                console.log(`Testing: ${test_case.name}`);
                const result = await nb_native().fs.stat(fs_context, target_path, test_case.options);
                console.log(`  ✅ SUCCESS: size=${result.size}, mode=${result.mode.toString(8)}, ino=${result.ino}`);
                
                if (result.xattr) {
                    console.log(`  Extended attributes: ${Object.keys(result.xattr).length} keys`);
                }
            } catch (err) {
                console.log(`  ❌ FAILED: ${err.code} - ${err.message}`);
                console.log(`  Error details: errno=${err.errno}, syscall=${err.syscall}`);
            }
        }
    } catch (err) {
        console.log(`Native module test failed: ${err.message}`);
    }
    console.log('');

    console.log('🏁 DIAGNOSIS COMPLETE');
    console.log('='.repeat(80));
}

// Main execution
async function main() {
    const target_path = process.argv[2];
    
    if (!target_path) {
        console.error('Usage: node detailed_fs_diagnosis.js <path>');
        console.error('Example: node detailed_fs_diagnosis.js /nsfs/dingofs-nsfs/tsinghua-bucket');
        process.exit(1);
    }
    
    try {
        await detailed_fs_diagnosis(target_path);
    } catch (err) {
        console.error('Diagnosis failed:', err);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { detailed_fs_diagnosis };
