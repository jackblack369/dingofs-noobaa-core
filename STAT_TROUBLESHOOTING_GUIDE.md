# NooBaa Stat Function Troubleshooting Guide

## Issue Summary
The NooBaa native stat function fails on mounted filesystems (like `/nsfs/dingofs-nsfs/tsinghua-bucket`) but works on regular directories. This suggests filesystem-specific compatibility issues.

## Files to Copy to K8s Pod

Copy these files to your Kubernetes pod for diagnosis:

1. **Native module**: `build/Release/nb_native.node`
2. **Diagnostic scripts**:
   - `src/test/tools/enhanced_stat_test.js`
   - `src/test/tools/diagnose_stat_issue.js` 
   - `src/test/tools/detailed_fs_diagnosis.js`
3. **Required modules**:
   - `src/util/nb_native.js`
   - `src/util/native_fs_utils.js`
   - `src/util/debug_module.js`
   - `config.js`

## Diagnostic Steps in K8s Pod

### Step 1: Basic Environment Check
```bash
# Check current user and permissions
id
pwd
ls -la /nsfs/dingofs-nsfs/

# Check if target directory exists and is accessible
ls -la /nsfs/dingofs-nsfs/tsinghua-bucket
stat /nsfs/dingofs-nsfs/tsinghua-bucket
```

### Step 2: Enhanced Stat Test
```bash
node src/test/tools/enhanced_stat_test.js /nsfs/dingofs-nsfs/tsinghua-bucket
```

This will test:
- Node.js fs operations vs NooBaa native operations
- Different stat options (use_lstat, skip_user_xattr)
- Parent directory accessibility
- Directory listing to confirm target exists

### Step 3: Detailed Filesystem Diagnosis
```bash
node src/test/tools/detailed_fs_diagnosis.js /nsfs/dingofs-nsfs/tsinghua-bucket
```

This will provide:
- Low-level file descriptor tests
- strace analysis of system calls
- Extended attributes information
- Filesystem type and mount options

### Step 4: Compare Working vs Non-Working
```bash
# Test on a known working directory
node src/test/tools/enhanced_stat_test.js /tmp

# Test on the problematic directory
node src/test/tools/enhanced_stat_test.js /nsfs/dingofs-nsfs/tsinghua-bucket
```

## Common Issues and Solutions

### Issue 1: Extended Attributes (xattr) Problems
**Symptoms**: Stat fails with permission or I/O errors
**Solution**: Test with `skip_user_xattr: true` option
```javascript
await nb_native().fs.stat(fs_context, path, { skip_user_xattr: true });
```

### Issue 2: Symlink Resolution Issues  
**Symptoms**: Stat works on some paths but not others
**Solution**: Test with `use_lstat: true` to avoid symlink following
```javascript
await nb_native().fs.stat(fs_context, path, { use_lstat: true });
```

### Issue 3: Filesystem Compatibility
**Symptoms**: Works on local filesystem but fails on mounted/network filesystems
**Investigation**:
- Check filesystem type: `df -T /nsfs/dingofs-nsfs/tsinghua-bucket`
- Check mount options: `findmnt -T /nsfs/dingofs-nsfs/tsinghua-bucket`
- Look for filesystem-specific restrictions

### Issue 4: Permission Issues
**Symptoms**: EACCES or EPERM errors
**Solution**:
- Verify pod has appropriate user/group permissions
- Check if filesystem requires specific capabilities
- Test with different fs_context (different uid/gid)

### Issue 5: C++ Native Module Issues
**Symptoms**: Module loads but stat function fails silently or with generic errors
**Investigation**:
- Check if all required libraries are available in pod
- Verify native module was built for correct architecture
- Look for missing system dependencies

## Architecture-Specific Considerations

### For Container Environments:
1. **Security Context**: Ensure pod runs with appropriate security context
2. **Mount Options**: Check if volume mounts have compatibility flags
3. **User Namespace**: Verify user mapping between container and host
4. **Capabilities**: Some filesystem operations may require additional capabilities

### For Network Filesystems (like DingoFS):
1. **Network Latency**: High latency can cause timeouts
2. **Protocol Compatibility**: Some FUSE/network filesystems may not support all POSIX operations
3. **Extended Attributes**: Network filesystems often have limited xattr support
4. **File Locking**: Check if filesystem supports file locking operations

## Expected Error Patterns

### Working Case Output:
```
✅ SUCCESS: Stat operation completed
size: 4096, mode: 040755, ino: 12345
```

### Failing Case Output:
```
❌ ERROR: Stat operation failed
Error: EIO - Input/output error
```

## Debugging C++ Level Issues

If JavaScript-level diagnostics don't reveal the issue, the problem might be in the C++ implementation. Key areas to investigate:

1. **File Descriptor Opening**: The C++ code uses `open()` with specific flags
2. **fstat() System Call**: The actual stat operation in C++
3. **Extended Attributes**: Calls to `getxattr()` family functions
4. **Error Code Translation**: How C++ errno maps to JavaScript errors

## Next Steps Based on Findings

### If Extended Attributes are the Issue:
- Modify the stat call to skip xattr by default for this filesystem
- Add filesystem-specific detection logic

### If File Descriptor Opening Fails:
- Check if filesystem supports the specific open() flags used
- May need filesystem-specific open() logic

### If Fundamental Incompatibility:
- Consider using alternative stat methods for this filesystem type
- Implement fallback to Node.js fs.stat() for problematic filesystems

## Contact Information

When reporting issues, please include:
1. Complete output from enhanced_stat_test.js
2. Filesystem type and mount options
3. Container/pod security context
4. Any relevant pod/container logs
5. Comparison with working directory output
