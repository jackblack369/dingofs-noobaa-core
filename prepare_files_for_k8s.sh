#!/bin/bash

# Script to prepare files for copying to K8s pod
# Usage: ./prepare_files_for_k8s.sh [target_directory]

TARGET_DIR=${1:-./k8s_stat_debug}

echo "Preparing NooBaa stat debugging files for K8s deployment..."
echo "Target directory: $TARGET_DIR"

# Create target directory
mkdir -p "$TARGET_DIR"
mkdir -p "$TARGET_DIR/src/util"
mkdir -p "$TARGET_DIR/src/test/tools"

# Copy native module
echo "Copying native module..."
cp build/Release/nb_native.node "$TARGET_DIR/"

# Copy core utility files
echo "Copying core utility files..."
cp src/util/nb_native.js "$TARGET_DIR/src/util/"
cp src/util/native_fs_utils.js "$TARGET_DIR/src/util/"
cp src/util/debug_module.js "$TARGET_DIR/src/util/"
cp src/util/fuse_stat_workaround.js "$TARGET_DIR/src/util/"
cp config.js "$TARGET_DIR/"

# Copy diagnostic scripts
echo "Copying diagnostic scripts..."
cp src/test/tools/enhanced_stat_test.js "$TARGET_DIR/src/test/tools/"
cp src/test/tools/diagnose_stat_issue.js "$TARGET_DIR/src/test/tools/"
cp src/test/tools/detailed_fs_diagnosis.js "$TARGET_DIR/src/test/tools/"
cp src/test/tools/test_fuse_stat_workaround.js "$TARGET_DIR/src/test/tools/"

# Copy documentation
echo "Copying documentation..."
cp STAT_TROUBLESHOOTING_GUIDE.md "$TARGET_DIR/"

# Create a simple test runner script
cat > "$TARGET_DIR/test_stat.sh" << 'EOF'
#!/bin/bash

# Simple test runner for K8s pod
TARGET_PATH=${1:-/nsfs/dingofs-nsfs/tsinghua-bucket}

echo "========================================"
echo "NooBaa Stat Function Diagnostic Test"
echo "========================================"
echo "Target path: $TARGET_PATH"
echo "Timestamp: $(date)"
echo "User: $(id)"
echo ""

echo "Step 1: Basic file system checks..."
echo "----------------------------------------"
ls -la "$TARGET_PATH" 2>/dev/null || echo "ls failed"
stat "$TARGET_PATH" 2>/dev/null || echo "stat command failed"
echo ""

echo "Step 2: Enhanced stat test..."
echo "----------------------------------------"
node src/test/tools/enhanced_stat_test.js "$TARGET_PATH"
echo ""

echo "Step 3: FUSE filesystem workaround test..."
echo "----------------------------------------"
node src/test/tools/test_fuse_stat_workaround.js "$TARGET_PATH"
echo ""

echo "Step 4: Comparison with working directory..."
echo "----------------------------------------"
echo "Testing /tmp for comparison:"
node src/test/tools/test_fuse_stat_workaround.js /tmp
echo ""

echo "Test completed!"
EOF

chmod +x "$TARGET_DIR/test_stat.sh"

# Create a README for the K8s deployment
cat > "$TARGET_DIR/README.md" << 'EOF'
# NooBaa Stat Function K8s Debugging Kit

## Files Included

- `nb_native.node` - The compiled native module
- `src/util/` - Core utility modules
- `src/test/tools/` - Diagnostic scripts  
- `config.js` - Configuration file
- `test_stat.sh` - Simple test runner
- `STAT_TROUBLESHOOTING_GUIDE.md` - Detailed troubleshooting guide

## Quick Start

1. Copy all files to your K8s pod
2. Run the test script:
   ```bash
   ./test_stat.sh /nsfs/dingofs-nsfs/tsinghua-bucket
   ```

## Individual Tests

### FUSE Filesystem Workaround Test
```bash  
node src/test/tools/test_fuse_stat_workaround.js /nsfs/dingofs-nsfs/tsinghua-bucket
```

### Enhanced Stat Test
```bash
node src/test/tools/enhanced_stat_test.js /nsfs/dingofs-nsfs/tsinghua-bucket
```

### Detailed Diagnosis  
```bash
node src/test/tools/diagnose_stat_issue.js /nsfs/dingofs-nsfs/tsinghua-bucket
```

### Filesystem Analysis
```bash
node src/test/tools/detailed_fs_diagnosis.js /nsfs/dingofs-nsfs/tsinghua-bucket
```

## Expected Behavior

- **Working case**: Should show "✅ SUCCESS" messages
- **Failing case**: Should show "❌ FAILED" with detailed error information

## Key Things to Check

1. **Filesystem type**: Use `df -T` to check what type of filesystem is mounted
2. **Mount options**: Use `findmnt` to see mount options
3. **Permissions**: Check if the pod has appropriate permissions
4. **Extended attributes**: Many issues relate to xattr support
5. **Symlinks**: Check if path involves symlinks

See STAT_TROUBLESHOOTING_GUIDE.md for detailed troubleshooting steps.
EOF

echo ""
echo "✅ Files prepared successfully!"
echo ""
echo "Directory structure:"
find "$TARGET_DIR" -type f | sort

echo ""
echo "To copy to K8s pod:"
echo "kubectl cp $TARGET_DIR <pod-name>:/tmp/stat_debug"
echo ""
echo "Then in the pod:"
echo "cd /tmp/stat_debug"
echo "./test_stat.sh /nsfs/dingofs-nsfs/tsinghua-bucket"
