# NooBaa Stat Function Testing Guide

## Prerequisites

Before running the stat tests, ensure the NooBaa native modules are properly built:

### 1. Install Dependencies
```bash
cd /mnt/disk4/dongwei/code/noobaa-core
npm install
```

### 2. Build Native Modules
```bash
# Build the native C++ modules
npm run build

# Or specifically build the native modules
make native
```

### 3. Verify Installation
```bash
# Check if the native module exists
ls -la src/build/Release/nb_native.node

# Test basic module loading
node -e "console.log('Testing module load...'); const nb = require('./src/util/nb_native'); console.log('✅ Success!');"
```

## Running the Tests

### Method 1: Simple Test Script (Recommended)
```bash
# From the project root directory
cd /mnt/disk4/dongwei/code/noobaa-core

# Make the script executable
chmod +x test_stat_simple.js

# Test your problematic directory
node test_stat_simple.js /nsfs/dingofs-nsfs/tsinghua-bucket

# Test a working directory for comparison
node test_stat_simple.js /tmp

# Test current directory
node test_stat_simple.js .
```

### Method 2: Using Node.js REPL
```bash
cd /mnt/disk4/dongwei/code/noobaa-core
node
```

Then in the REPL:
```javascript
// Load modules
const nb_native = require('./src/util/nb_native');
const { get_process_fs_context } = require('./src/util/native_fs_utils');

// Setup context
const fs_context = get_process_fs_context();
console.log('FS Context:', fs_context);

// Test stat function
const test_path = '/nsfs/dingofs-nsfs/tsinghua-bucket';
nb_native().fs.stat(fs_context, test_path)
  .then(result => {
    console.log('✅ SUCCESS:', result);
  })
  .catch(error => {
    console.log('❌ ERROR:', error.code, error.message);
  });
```

### Method 3: Using Existing Test Framework
```bash
# Run the existing native fs tests
npm test src/test/unit_tests/test_nb_native_fs.js

# Run specific test
npx mocha src/test/unit_tests/test_nb_native_fs.js --grep "stat"
```

## Troubleshooting Module Issues

### Error: "Cannot find module"
```bash
# Solution 1: Check you're in the right directory
pwd
# Should show: /mnt/disk4/dongwei/code/noobaa-core

# Solution 2: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Solution 3: Rebuild native modules
npm run clean
npm run build
```

### Error: "nb_native.node not found"
```bash
# Check if native module was compiled
ls -la src/build/Release/

# If missing, rebuild
make clean
make native

# Or try
npm run rebuild
```

### Error: "gyp ERR!" or compilation errors
```bash
# Install build tools
sudo apt-get install build-essential python3-dev

# For CentOS/RHEL
sudo yum groupinstall "Development Tools"
sudo yum install python3-devel

# Rebuild with verbose output
npm run build -- --verbose
```

### Error: Permission issues
```bash
# Check file permissions
ls -la test_stat_simple.js

# Make executable
chmod +x test_stat_simple.js

# If running as different user
sudo -u noobaa node test_stat_simple.js /nsfs/dingofs-nsfs/tsinghua-bucket
```

## Expected Output

### Successful run:
```
Loading NooBaa native modules...
✅ Modules loaded successfully

🔍 Testing stat on: /nsfs/dingofs-nsfs/tsinghua-bucket
FS Context: { uid: 1000, gid: 1000, backend: 'default' }

⏱️  Starting stat operation...
✅ SUCCESS! (15ms)

📊 Results:
  Size: 4096 bytes
  Mode: 0755
  UID: 1000
  GID: 1000
  Inode: 123456
  Device: 2049
  Links: 2
  Type: Directory
```

### Failed run (EIO error):
```
❌ FAILED: Input/output error
Error Code: EIO

🔬 EIO Error Analysis:
- Input/Output error detected
- This typically indicates filesystem or storage issues
- For dingofs: check if the distributed filesystem is healthy
- Try: stat command directly in shell
- Command: stat "/nsfs/dingofs-nsfs/tsinghua-bucket"
```
