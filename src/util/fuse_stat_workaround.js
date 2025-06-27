/* Copyright (C) 2024 NooBaa */
'use strict';

/**
 * Workaround for FUSE filesystem stat issues
 * 
 * DingoFS and other FUSE filesystems sometimes fail with EIO on regular stat operations
 * but work fine with lstat. This module provides a wrapper that automatically
 * falls back to lstat when regular stat fails on FUSE filesystems.
 */

const nb_native = require('./nb_native');
const dbg = require('./debug_module')(__filename);

// Cache of filesystem types to avoid repeated checks
const fs_type_cache = new Map();

/**
 * Check if a path is on a FUSE filesystem
 * @param {string} path 
 * @returns {Promise<boolean>}
 */
async function isFuseFilesystem(path) {
    if (fs_type_cache.has(path)) {
        return fs_type_cache.get(path);
    }
    
    try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        // Check if path is on a FUSE filesystem
        const { stdout } = await execAsync(`df -T "${path}" | tail -1`);
        const is_fuse = stdout.includes('fuse') || stdout.includes('FUSE');
        
        fs_type_cache.set(path, is_fuse);
        return is_fuse;
    } catch (err) {
        dbg.warn('Failed to check filesystem type for', path, err);
        return false;
    }
}

/**
 * Enhanced stat function that automatically handles FUSE filesystem issues
 * @param {nb.NativeFSContext} fs_context 
 * @param {string} path 
 * @param {Object} options 
 * @returns {Promise<nb.NativeFSStats>}
 */
async function stat(fs_context, path, options = {}) {
    try {
        // First try regular stat
        console.log('Attempting regular stat for path:', path, 'with options:', options);
        return await nb_native().fs.stat(fs_context, path, options);
    } catch (err) {
        console.log('Stat failed with error:', err.code, 'for path:', path);
        if (err.code === 'EIO' && !options.use_lstat) {
            dbg.log1('Regular stat failed with EIO, checking if FUSE filesystem:', path);
            
            const is_fuse = await isFuseFilesystem(path);
            if (is_fuse) {
                dbg.log1('FUSE filesystem detected, retrying with lstat:', path);
                
                // Retry with lstat for FUSE filesystems
                const lstat_options = { ...options, use_lstat: true };
                return await nb_native().fs.stat(fs_context, path, lstat_options);
            }
        }
        throw err;
    }
}

/**
 * Enhanced readdir function that handles FUSE filesystem issues
 * @param {nb.NativeFSContext} fs_context 
 * @param {string} path 
 * @returns {Promise<Array>}
 */
async function readdir(fs_context, path) {
    try {
        return await nb_native().fs.readdir(fs_context, path);
    } catch (err) {
        if (err.code === 'EIO') {
            dbg.log1('Readdir failed with EIO, might be FUSE filesystem issue:', path);
        }
        throw err;
    }
}

module.exports = {
    stat,
    readdir,
    isFuseFilesystem,
    
    // Export all other nb_native functions as-is
    fs: {
        ...nb_native().fs,
        stat,
        readdir
    }
};
