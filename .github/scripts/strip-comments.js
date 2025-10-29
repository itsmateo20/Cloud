#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.css', '.scss'];

const EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
  '**/*.min.js',
  '**/*.min.css',
  '**/bun.lockb',
  '**/.git/**',
  '**/next.config.js',
];

function stripComments(content, filePath) {
  const ext = path.extname(filePath);

  let headerComment = '';
  let remainingContent = content;

  if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext)) {
    const blockHeaderMatch = content.match(/^\/\*\s*([^\*].*?)\s*\*\//);
    if (blockHeaderMatch) {
      headerComment = blockHeaderMatch[0];
      remainingContent = content.substring(blockHeaderMatch[0].length);
    } else {
      const lineHeaderMatch = content.match(/^\/\/\s*(.+?)(?:\r?\n|$)/);
      if (lineHeaderMatch) {
        headerComment = lineHeaderMatch[0];
        remainingContent = content.substring(lineHeaderMatch[0].length);
      }
    }

    remainingContent = remainingContent
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map(line => {
        let inString = false;
        let inRegex = false;
        let stringChar = null;
        let result = '';
        let i = 0;

        while (i < line.length) {
          const char = line[i];
          const nextChar = line[i + 1];
          const prevChar = line[i - 1];

          if (!inString && !inRegex && char === '/' && prevChar !== '\\') {
            let beforeSlash = line.substring(0, i).trimEnd();
            const regexContext = /[=([,;:!&|?+\-*/%<>^~]\s*$|\breturn\s+$|\bconst\s+\w+\s*=\s*$|\blet\s+\w+\s*=\s*$|\bvar\s+\w+\s*=\s*$/.test(beforeSlash);

            if (regexContext && nextChar !== '/') {
              inRegex = true;
              result += char;
              i++;
              continue;
            }
          }

          if (inRegex && char === '/' && prevChar !== '\\') {
            inRegex = false;
            result += char;
            i++;
            while (i < line.length && /[gimsuvyd]/.test(line[i])) {
              result += line[i];
              i++;
            }
            continue;
          }

          if (!inString && !inRegex && (char === '"' || char === "'" || char === '`')) {
            inString = true;
            stringChar = char;
            result += char;
            i++;
          } else if (inString && char === stringChar && prevChar !== '\\') {
            inString = false;
            stringChar = null;
            result += char;
            i++;
          } else if (!inString && !inRegex && char === '/' && nextChar === '/') {
            break;
          } else {
            result += char;
            i++;
          }
        }

        return result.trimEnd();
      })
      .join('\n');

  } else if (['.css', '.scss'].includes(ext)) {
    const headerMatch = content.match(/^\/\*\s*([^\*].*?)\s*\*\//);
    if (headerMatch) {
      headerComment = headerMatch[0];
      remainingContent = content.substring(headerMatch[0].length);
    }

    remainingContent = remainingContent.replace(/\/\*[\s\S]*?\*\//g, '');
  }

  let cleaned = headerComment + remainingContent;

  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  cleaned = cleaned.replace(/^([\s\S]*?)\n{3,}$/, '$1\n\n');

  return cleaned;
}

async function processFiles() {
  console.log('🔍 Finding files to process...');

  const files = await glob('**/*', {
    ignore: EXCLUDE_PATTERNS,
    nodir: true,
    absolute: false,
  });

  const targetFiles = files.filter(file =>
    EXTENSIONS.includes(path.extname(file))
  );

  console.log(`📝 Processing ${targetFiles.length} files...`);

  let modifiedCount = 0;

  for (const file of targetFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const cleaned = stripComments(content, file);

      if (content !== cleaned) {
        fs.writeFileSync(file, cleaned, 'utf8');
        modifiedCount++;
        console.log(`  ✓ ${file}`);
      }
    } catch (error) {
      console.error(`  ✗ ${file}: ${error.message}`);
    }
  }

  console.log(`\n✨ Done! Modified ${modifiedCount} file(s).`);
}

processFiles().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
