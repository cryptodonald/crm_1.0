#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Find all .ts and .tsx files in src/
function findFiles(dir, ext = ['.ts', '.tsx']) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      // Skip backup files
      if (!file.includes('.bak') && !file.includes('.disabled')) {
        results = results.concat(findFiles(filePath, ext));
      }
    } else {
      if (ext.some(e => file.endsWith(e)) && !file.includes('.bak') && !file.includes('.disabled')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

// Remove console.log statements, handling multi-line cases
function removeConsoleLogs(content) {
  // Pattern to match console.log statements including multi-line
  // This handles: console.log(...) with nested parentheses
  
  let result = content;
  let changed = true;
  
  while (changed) {
    changed = false;
    
    // Find console.log( and track parentheses to find the end
    const match = result.match(/^([ \t]*)console\.log\s*\(/m);
    
    if (match) {
      const startIndex = result.indexOf(match[0]);
      const indent = match[1];
      
      // Find matching closing paren
      let parenCount = 0;
      let i = startIndex + match[0].length - 1; // Position at the opening (
      let foundStart = false;
      
      for (; i < result.length; i++) {
        if (result[i] === '(') {
          if (!foundStart) foundStart = true;
          parenCount++;
        } else if (result[i] === ')') {
          parenCount--;
          if (parenCount === 0) {
            break;
          }
        }
      }
      
      if (parenCount === 0 && i < result.length) {
        // Find end of statement (semicolon or newline)
        let endIndex = i + 1;
        while (endIndex < result.length && result[endIndex] !== ';' && result[endIndex] !== '\n') {
          endIndex++;
        }
        if (result[endIndex] === ';') {
          endIndex++;
        }
        
        // Include trailing newline if present
        if (result[endIndex] === '\n') {
          endIndex++;
        }
        
        // Check for blank line after
        if (result.substring(endIndex, endIndex + 1) === '\n') {
          endIndex++;
        }
        
        // Remove the statement
        result = result.substring(0, startIndex) + result.substring(endIndex);
        changed = true;
      }
    }
  }
  
  // Clean up excessive blank lines (more than 2 consecutive)
  result = result.replace(/\n{3,}/g, '\n\n');
  
  return result;
}

// Main
const srcDir = path.join(__dirname, 'src');
const files = findFiles(srcDir);

let totalRemoved = 0;
let filesModified = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const before = (content.match(/console\.log\s*\(/g) || []).length;
  
  if (before > 0) {
    const newContent = removeConsoleLogs(content);
    const after = (newContent.match(/console\.log\s*\(/g) || []).length;
    
    if (before !== after) {
      fs.writeFileSync(file, newContent, 'utf8');
      const removed = before - after;
      totalRemoved += removed;
      filesModified++;
      console.log(`${file}: removed ${removed} console.log statements`);
    }
  }
});

console.log(`\nTotal: removed ${totalRemoved} console.log statements from ${filesModified} files`);
